import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { aujourdhui } from '@/lib/dates';
import {
  effacerJour,
  effacerTenue,
  effacerVetement,
  ecrireJour,
  ecrireTenue,
  ecrireVetement,
  envoyerPhoto,
  supprimerPhoto,
  toutCharger,
} from '@/lib/donnees';

/*
 * État partagé d'Armoire : session (même compte que le hub), vêtements, tenues, jours du calendrier,
 * et les statistiques de port qu'on en déduit. Toutes les écritures passent par ici pour que
 * chaque onglet se mette à jour tout de suite, sans recharger.
 */
const ArmoireContext = createContext(null);

// Copie locale des données : l'app (installée sur l'écran d'accueil) s'affiche tout de suite,
// et même hors connexion, puis se met à jour dès que Supabase répond.
const cleCache = (userId) => `armoire-cache-v1-${userId}`;

function lireCache(userId) {
  try {
    return JSON.parse(localStorage.getItem(cleCache(userId)));
  } catch {
    return null;
  }
}

function ecrireCache(userId, donnees) {
  try {
    localStorage.setItem(cleCache(userId), JSON.stringify(donnees));
  } catch {
    // stockage plein ou indisponible : l'app marche quand même, sans copie locale
  }
}

const parDate = (a, b) => (a.jour < b.jour ? -1 : 1);

export function ArmoireProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = on ne sait pas encore
  const [vetements, setVetements] = useState([]);
  const [tenues, setTenues] = useState([]);
  const [jours, setJours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const recharger = useCallback(async () => {
    try {
      const donnees = await toutCharger();
      setVetements(donnees.vetements);
      setTenues(donnees.tenues);
      setJours(donnees.jours);
      setErreur(null);
    } catch (e) {
      // Hors connexion avec une copie locale : on garde la copie, sans afficher d'erreur
      if (!navigator.onLine) setErreur(null);
      else setErreur(e);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setVetements([]);
      setTenues([]);
      setJours([]);
      setChargement(session === undefined);
      return;
    }
    const cache = lireCache(userId);
    if (cache) {
      setVetements(cache.vetements);
      setTenues(cache.tenues);
      setJours(cache.jours);
    }
    setChargement(!cache);
    recharger();
  }, [userId, session, recharger]);

  // Chaque modification met aussi à jour la copie locale
  useEffect(() => {
    if (userId && !chargement) ecrireCache(userId, { vetements, tenues, jours });
  }, [userId, chargement, vetements, tenues, jours]);

  // ── Vêtements ─────────────────────────────────────────────
  const enregistrerVetement = useCallback(
    async (vetement, { fichier, mode, pret } = {}) => {
      let photo = vetement.photo;
      if (fichier) photo = await envoyerPhoto(userId, fichier, { mode, pret });
      const ancien = vetement.id && vetements.find((v) => v.id === vetement.id);
      const enregistre = await ecrireVetement({ ...vetement, photo });
      if (fichier && ancien?.photo && ancien.photo !== photo) supprimerPhoto(ancien.photo);
      setVetements((liste) => (vetement.id ? liste.map((v) => (v.id === enregistre.id ? enregistre : v)) : [enregistre, ...liste]));
      return enregistre;
    },
    [userId, vetements],
  );

  const basculerFavori = useCallback(async (vetement) => {
    const suivant = { ...vetement, favori: !vetement.favori };
    setVetements((liste) => liste.map((v) => (v.id === vetement.id ? suivant : v)));
    await ecrireVetement({ id: vetement.id, favori: suivant.favori });
  }, []);

  const supprimerVetement = useCallback(async (vetement) => {
    await effacerVetement(vetement.id);
    supprimerPhoto(vetement.photo);
    setVetements((liste) => liste.filter((v) => v.id !== vetement.id));
  }, []);

  // ── Tenues ────────────────────────────────────────────────
  const enregistrerTenue = useCallback(async (tenue) => {
    const enregistree = await ecrireTenue(tenue);
    setTenues((liste) => [enregistree, ...liste.filter((t) => t.id !== enregistree.id)]);
    return enregistree;
  }, []);

  const supprimerTenue = useCallback(async (tenue) => {
    await effacerTenue(tenue.id);
    setTenues((liste) => liste.filter((t) => t.id !== tenue.id));
    // La base remet tenue_id à null (on delete set null) : on fait pareil ici
    setJours((liste) => liste.map((j) => (j.tenue_id === tenue.id ? { ...j, tenue_id: null } : j)));
  }, []);

  // ── Calendrier ────────────────────────────────────────────
  const definirJour = useCallback(async (jour) => {
    const enregistre = await ecrireJour(jour);
    setJours((liste) => [...liste.filter((j) => j.jour !== enregistre.jour), enregistre].sort(parDate));
    return enregistre;
  }, []);

  const retirerJour = useCallback(async (jour) => {
    await effacerJour(jour);
    setJours((liste) => liste.filter((j) => j.jour !== jour));
  }, []);

  // ── Index et statistiques de port ─────────────────────────
  const vetementsParId = useMemo(() => new Map(vetements.map((v) => [v.id, v])), [vetements]);
  const tenuesParId = useMemo(() => new Map(tenues.map((t) => [t.id, t])), [tenues]);
  const joursParDate = useMemo(() => new Map(jours.map((j) => [j.jour, j])), [jours]);

  // Un vêtement est « porté » une fois par jour passé (ou aujourd'hui) dont la tenue le contient
  const usage = useMemo(() => {
    const ajd = aujourdhui();
    const vetementsTenue = new Map(tenues.map((t) => [t.id, new Set(t.composition.map((e) => e.v))]));
    const parVetement = new Map();
    const parTenue = new Map();
    for (const j of jours) {
      if (j.jour > ajd || !j.tenue_id || !vetementsTenue.has(j.tenue_id)) continue;
      const t = parTenue.get(j.tenue_id) ?? { fois: 0, dernier: null };
      parTenue.set(j.tenue_id, { fois: t.fois + 1, dernier: j.jour });
      for (const id of vetementsTenue.get(j.tenue_id)) {
        const v = parVetement.get(id) ?? { fois: 0, dernier: null };
        parVetement.set(id, { fois: v.fois + 1, dernier: j.jour });
      }
    }
    return { parVetement, parTenue };
  }, [jours, tenues]);

  const valeur = {
    session,
    userId,
    chargement,
    erreur,
    recharger,
    vetements,
    tenues,
    jours,
    vetementsParId,
    tenuesParId,
    joursParDate,
    usage,
    enregistrerVetement,
    basculerFavori,
    supprimerVetement,
    enregistrerTenue,
    supprimerTenue,
    definirJour,
    retirerJour,
    deconnexion: () => supabase.auth.signOut(),
  };

  return <ArmoireContext.Provider value={valeur}>{children}</ArmoireContext.Provider>;
}

export function useArmoire() {
  return useContext(ArmoireContext);
}
