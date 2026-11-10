// Dates au format « AAAA-MM-JJ » en heure locale (pas toISOString, qui passe en UTC).
export function versIso(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const j = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${j}`;
}

export function depuisIso(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j);
}

export const aujourdhui = () => versIso(new Date());

export function formatJour(iso, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return depuisIso(iso).toLocaleDateString('fr-FR', options);
}

// Les 6 semaines (42 jours, lundi en premier) qui couvrent le mois de `annee`/`mois`
export function grilleMois(annee, mois) {
  const premier = new Date(annee, mois, 1);
  const decalage = (premier.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(annee, mois, 1 - decalage + i));
}
