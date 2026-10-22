import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { chargerRecettes, estEditeur } from '@/lib/donnees';
import { supabase } from '@/lib/supabase';

/*
 * État partagé du carnet : recettes (Supabase), session, droit d'édition,
 * et ouverture du formulaire / de la connexion depuis n'importe quelle page.
 *
 * Les recettes sont gardées en cache dans le navigateur : la page s'affiche tout de suite
 * (et hors connexion), puis se met à jour dès que Supabase répond.
 */
const CLE_CACHE = 'recettes-cache-v1';
const CarnetContext = createContext(null);

function lireCache() {
  try {
    return JSON.parse(localStorage.getItem(CLE_CACHE)) || [];
  } catch {
    return [];
  }
}

function ecrireCache(recettes) {
  try {
    localStorage.setItem(CLE_CACHE, JSON.stringify(recettes));
  } catch {
    // stockage indisponible (navigation privée…) : tant pis pour le cache
  }
}

export function CarnetProvider({ children }) {
  const [recettes, setRecettes] = useState(lireCache);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [session, setSession] = useState(null);
  const [editeur, setEditeur] = useState(false);
  // null = fermé ; { recette: null } = nouvelle recette ; { recette } = modification
  const [formulaire, setFormulaire] = useState(null);
  const [connexion, setConnexion] = useState(false);

  const recharger = useCallback(async () => {
    try {
      const liste = await chargerRecettes();
      setRecettes(liste);
      ecrireCache(liste);
      setErreur(null);
    } catch (e) {
      setErreur(e);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setEditeur(false);
      return;
    }
    estEditeur(session.user.id).then(setEditeur);
  }, [session]);

  // Après un enregistrement : mise à jour immédiate, sans attendre un rechargement complet
  const remplacer = useCallback((recette, ancienId = recette.id) => {
    setRecettes((liste) => {
      const suivante = [...liste.filter((r) => r.id !== ancienId && r.id !== recette.id), recette];
      ecrireCache(suivante);
      return suivante;
    });
  }, []);

  const retirer = useCallback((id) => {
    setRecettes((liste) => {
      const suivante = liste.filter((r) => r.id !== id);
      ecrireCache(suivante);
      return suivante;
    });
  }, []);

  const valeur = {
    recettes,
    chargement,
    erreur,
    recharger,
    remplacer,
    retirer,
    session,
    editeur,
    // Peut modifier cette recette : éditeur et auteur (comme les règles RLS)
    peutModifier: (r) => editeur && session?.user.id === r.userId,
    formulaire,
    ouvrirFormulaire: (recette = null) => setFormulaire({ recette }),
    fermerFormulaire: () => setFormulaire(null),
    connexion,
    setConnexion,
    deconnexion: () => supabase.auth.signOut(),
  };

  return <CarnetContext.Provider value={valeur}>{children}</CarnetContext.Provider>;
}

export function useCarnet() {
  return useContext(CarnetContext);
}
