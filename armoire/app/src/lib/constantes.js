export const CATEGORIES = [
  { id: 'hauts', label: 'Hauts' },
  { id: 'bas', label: 'Bas' },
  { id: 'robes', label: 'Robes' },
  { id: 'vestes', label: 'Vestes' },
  { id: 'chaussures', label: 'Chaussures' },
  { id: 'sacs', label: 'Sacs' },
  { id: 'accessoires', label: 'Accessoires' },
];
export const LABEL_CATEGORIE = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

export const COULEURS = [
  { id: 'noir', label: 'Noir', hex: '#1c1a1b' },
  { id: 'blanc', label: 'Blanc', hex: '#ffffff' },
  { id: 'gris', label: 'Gris', hex: '#9a9a9a' },
  { id: 'beige', label: 'Beige', hex: '#d9c6a5' },
  { id: 'marron', label: 'Marron', hex: '#7a5134' },
  { id: 'rouge', label: 'Rouge', hex: '#c62828' },
  { id: 'rose', label: 'Rose', hex: '#f08cbf' },
  { id: 'orange', label: 'Orange', hex: '#f08a24' },
  { id: 'jaune', label: 'Jaune', hex: '#f2d43d' },
  { id: 'vert', label: 'Vert', hex: '#4f8a4b' },
  { id: 'bleu', label: 'Bleu', hex: '#3b6fd1' },
  { id: 'marine', label: 'Marine', hex: '#1f2f5a' },
  { id: 'violet', label: 'Violet', hex: '#7e57c2' },
  { id: 'multi', label: 'Multicolore', hex: 'conic-gradient(#f2d43d, #f08cbf, #3b6fd1, #4f8a4b, #f2d43d)' },
];
export const COULEUR = Object.fromEntries(COULEURS.map((c) => [c.id, c]));

export const SAISONS = [
  { id: 'printemps', label: 'Printemps' },
  { id: 'ete', label: 'Été' },
  { id: 'automne', label: 'Automne' },
  { id: 'hiver', label: 'Hiver' },
];
export const LABEL_SAISON = Object.fromEntries(SAISONS.map((s) => [s.id, s.label]));

export const TAGS_TENUE = ['Journée', 'Soirée', 'Travail', 'Week-end', 'Sport', 'Plage', 'Ski', 'Voyage'];
