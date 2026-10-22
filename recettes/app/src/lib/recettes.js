import { TAGS } from '@/data/tags';

// ---------- Texte ----------

export const slug = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const sansAccents = (s) => slug(s).replace(/-/g, ' ');

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'always' });
export function ilYA(dateIso) {
  const jours = Math.max(0, Math.floor((Date.now() - new Date(dateIso + 'T00:00:00')) / 86400000));
  if (jours === 0) return "aujourd'hui";
  if (jours < 7) return rtf.format(-jours, 'day');
  if (jours < 30) return rtf.format(-Math.floor(jours / 7), 'week');
  if (jours < 365) return rtf.format(-Math.floor(jours / 30), 'month');
  return rtf.format(-Math.floor(jours / 365), 'year');
}

export const parDate = (a, b) => b.date.localeCompare(a.date);
export const parTitre = (a, b) => a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' });

// Tous les tags, indexés par slug : { label, famille }
export const TAG_INDEX = new Map();
TAGS.forEach((f) => f.tags.forEach((t) => TAG_INDEX.set(slug(t), { label: t, famille: f.famille })));

// Recherche plein texte, sans accents ; filtre « au moins un des tags sélectionnés »
export function filtrer(recettes, { tags, q }) {
  const motif = sansAccents((q || '').trim());
  return recettes.filter((r) => {
    if (tags.size && !(r.tags || []).some((t) => tags.has(slug(t)))) return false;
    if (motif && !sansAccents([r.titre, r.sousTitre, ...(r.tags || [])].join(' ')).includes(motif)) return false;
    return true;
  });
}

// ---------- Quantités ----------

// Multiplicateur des quantités : ÷3, ÷2, ×1, ×2, ×3
export const FACTEURS = [
  { label: '÷3', valeur: 1 / 3 },
  { label: '÷2', valeur: 1 / 2 },
  { label: '×1', valeur: 1 },
  { label: '×2', valeur: 2 },
  { label: '×3', valeur: 3 },
];
// Fractions lisibles, écrites avec une barre : Amiamie n'a pas les symboles ½, ⅓, ¼…
const FRACTIONS = [
  ['1/6', 1 / 6],
  ['1/4', 1 / 4],
  ['1/3', 1 / 3],
  ['1/2', 1 / 2],
  ['2/3', 2 / 3],
  ['3/4', 3 / 4],
];
const SYMBOLES = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4 };
// Quantité en début de ligne : « 60 », « 1,5 », « 1/2 », « 1 1/2 », « ½ », « 1 ½ »
export const QUANTITE = /^(\d+\/\d+|\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\s*[½⅓⅔¼¾])?|[½⅓⅔¼¾])(\s*)/;
const UNITE_METRIQUE = /^(k?g|mg|[mcd]?l)\b/i;

function lireNombre(txt) {
  return txt
    .split(/\s+|(?=[½⅓⅔¼¾])/)
    .filter(Boolean)
    .reduce((total, morceau) => {
      if (SYMBOLES[morceau]) return total + SYMBOLES[morceau];
      if (morceau.includes('/')) {
        const [a, b] = morceau.split('/').map(Number);
        return total + a / b;
      }
      return total + parseFloat(morceau.replace(',', '.'));
    }, 0);
}

// Grammes, litres… en décimal ; cuillères, pièces… en fractions lisibles (1/2, 1/3, 1/4…)
function ecrireNombre(n, metrique) {
  const decimal = (x, chiffres) => String(Number(x.toFixed(chiffres))).replace('.', ',');
  if (metrique) return n >= 10 ? String(Math.round(n)) : decimal(n, n >= 1 ? 1 : 2);
  const entier = Math.floor(n + 0.02);
  const reste = n - entier;
  if (reste < 0.05) return String(entier);
  const proche = FRACTIONS.find(([, v]) => Math.abs(v - reste) < 0.04);
  if (proche) return entier ? `${entier} ${proche[0]}` : proche[0];
  return decimal(n, 1);
}

export function multiplier(ligne, facteur, arrondirEntier = false) {
  if (facteur === 1) return ligne;
  const m = ligne.match(QUANTITE);
  if (!m) return ligne; // pas de quantité (ex. « Gros sel ») : inchangé
  const reste = ligne.slice(m[0].length);
  const n = lireNombre(m[1]) * facteur;
  const nombre = arrondirEntier ? String(Math.max(1, Math.round(n))) : ecrireNombre(n, UNITE_METRIQUE.test(reste));
  return nombre + m[2] + reste;
}
