import { supabase } from '@/lib/supabase';

// Lignes Supabase (snake_case) ↔ recettes du site (même forme que l'ancien recettes.js)
export function versRecette(l) {
  return {
    id: l.id,
    userId: l.user_id,
    titre: l.titre,
    sousTitre: l.sous_titre || '',
    date: l.date,
    tags: l.tags || [],
    art: l.art || undefined,
    infos: l.infos || [],
    histoire: l.histoire || [],
    ingredients: l.ingredients || [],
    etapes: l.etapes || [],
    faq: l.faq || [],
    lien: l.lien || '',
  };
}

function versLigne(r) {
  return {
    id: r.id,
    titre: r.titre,
    sous_titre: r.sousTitre || null,
    date: r.date,
    tags: r.tags,
    art: r.art || null,
    infos: r.infos,
    histoire: r.histoire,
    ingredients: r.ingredients,
    etapes: r.etapes,
    faq: r.faq,
    lien: r.lien || null,
    updated_at: new Date().toISOString(),
  };
}

export async function chargerRecettes() {
  const { data, error } = await supabase.from('recettes').select('*');
  if (error) throw error;
  return data.map(versRecette);
}

export async function estEditeur(userId) {
  const { data } = await supabase.from('editeurs').select('user_id').eq('user_id', userId).maybeSingle();
  return Boolean(data);
}

// `nouvelle` : insert (échoue si l'id existe déjà) ; sinon update de la recette existante
export async function enregistrerRecette(recette, { nouvelle }) {
  const ligne = versLigne(recette);
  const requete = nouvelle
    ? supabase.from('recettes').insert(ligne)
    : supabase.from('recettes').update(ligne).eq('id', recette.id);
  const { data, error } = await requete.select().single();
  if (error) throw error;
  return versRecette(data);
}

export async function supprimerRecette(id) {
  const { error } = await supabase.from('recettes').delete().eq('id', id);
  if (error) throw error;
}
