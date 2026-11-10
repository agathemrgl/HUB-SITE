import { supabase } from '@/lib/supabase';
import { preparerPhoto } from '@/lib/images';

const BUCKET = 'armoire';

function verifier({ data, error }) {
  if (error) throw error;
  return data;
}

export function urlPhoto(chemin) {
  if (!chemin) return null;
  // Photos servies par le site lui-même (données de test : /armoire/test/…)
  if (chemin.startsWith('/')) return chemin;
  return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
}

// `fichier` : photo d'origine (préparée ici selon options.mode) ou blob déjà préparé (options.pret)
export async function envoyerPhoto(userId, fichier, options = {}) {
  const blob = options.pret ? fichier : (await preparerPhoto(fichier, options)).blob;
  const chemin = `${userId}/${crypto.randomUUID()}.webp`;
  verifier(await supabase.storage.from(BUCKET).upload(chemin, blob, { contentType: 'image/webp', cacheControl: '31536000' }));
  return chemin;
}

export async function supprimerPhoto(chemin) {
  if (chemin && !chemin.startsWith('/')) await supabase.storage.from(BUCKET).remove([chemin]);
}

export async function toutCharger() {
  const [vetements, tenues, jours] = await Promise.all([
    supabase.from('armoire_vetements').select('*').order('created_at', { ascending: false }),
    supabase.from('armoire_tenues').select('*').order('updated_at', { ascending: false }),
    supabase.from('armoire_jours').select('*').order('jour'),
  ]);
  return { vetements: verifier(vetements), tenues: verifier(tenues), jours: verifier(jours) };
}

// Champs modifiables (on n'envoie jamais user_id / created_at, gérés par Supabase)
const CHAMPS_VETEMENT = ['nom', 'categorie', 'couleurs', 'saisons', 'marque', 'tags', 'notes', 'favori', 'photo'];
const CHAMPS_TENUE = ['nom', 'tags', 'composition'];
const garder = (objet, champs) => Object.fromEntries(champs.filter((c) => c in objet).map((c) => [c, objet[c]]));

export async function ecrireVetement(vetement) {
  const valeurs = garder(vetement, CHAMPS_VETEMENT);
  const requete = vetement.id
    ? supabase.from('armoire_vetements').update(valeurs).eq('id', vetement.id)
    : supabase.from('armoire_vetements').insert(valeurs);
  return verifier(await requete.select().single());
}

export async function effacerVetement(id) {
  verifier(await supabase.from('armoire_vetements').delete().eq('id', id));
}

export async function ecrireTenue(tenue) {
  const valeurs = { ...garder(tenue, CHAMPS_TENUE), updated_at: new Date().toISOString() };
  const requete = tenue.id
    ? supabase.from('armoire_tenues').update(valeurs).eq('id', tenue.id)
    : supabase.from('armoire_tenues').insert(valeurs);
  return verifier(await requete.select().single());
}

export async function effacerTenue(id) {
  verifier(await supabase.from('armoire_tenues').delete().eq('id', id));
}

export async function ecrireJour(jour) {
  const valeurs = { jour: jour.jour, tenue_id: jour.tenue_id ?? null, note: jour.note || null };
  return verifier(await supabase.from('armoire_jours').upsert(valeurs, { onConflict: 'user_id,jour' }).select().single());
}

export async function effacerJour(jour) {
  verifier(await supabase.from('armoire_jours').delete().eq('jour', jour));
}
