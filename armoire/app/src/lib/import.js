/*
 * Reprise de l'ancienne Armoire (prototype en JS pur) : ses vêtements étaient rangés dans
 * localStorage (« armoire-proto-state »), avec des photos en data: URL ou des chemins sources/….
 * Même origine que la nouvelle app, on peut donc les relire et les envoyer dans Supabase.
 */
const CLE = 'armoire-proto-state';
const CLE_FAIT = 'armoire-import-fait';
const CORRESPONDANCE = { tops: 'hauts', bottoms: 'bas', shoes: 'chaussures', accessories: 'accessoires' };

export function ancienneArmoire() {
  try {
    if (localStorage.getItem(CLE_FAIT)) return [];
    const etat = JSON.parse(localStorage.getItem(CLE));
    if (!etat?.categories) return [];
    return Object.entries(etat.categories).flatMap(([cat, liste]) =>
      (Array.isArray(liste) ? liste : []).filter((i) => i?.image).map((i) => ({ nom: i.label || 'Sans nom', categorie: CORRESPONDANCE[cat] ?? 'accessoires', image: i.image })),
    );
  } catch {
    return [];
  }
}

export function marquerImportFait() {
  try {
    localStorage.setItem(CLE_FAIT, '1');
  } catch {
    // stockage indisponible : on proposera l'import à nouveau, sans gravité
  }
}

export async function versFichier(image) {
  const reponse = await fetch(new URL(image, `${location.origin}/armoire/`));
  const blob = await reponse.blob();
  return new File([blob], 'import', { type: blob.type || 'image/png' });
}
