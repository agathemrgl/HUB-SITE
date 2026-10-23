import { graineTexte } from '@/lib/art';

/*
 * Teintes du carnet (palette Seedling / Leaf / Solar / Wind) : un aplat vif (fond) et la couleur
 * des traits et du texte posés dessus (Pine, ou Pine assombri sur Leaf pour rester lisible).
 * Chaque recette en reçoit une, stable, calculée depuis son id ; chaque famille de tags a la sienne.
 * `puce` : tag sur une recette ; `selection` : tag sélectionné dans les filtres (même couleur + contour).
 * Les classes sont écrites en entier pour que Tailwind les trouve.
 */
export const TEINTES = {
  pousse: {
    fond: 'var(--pousse)',
    trait: 'var(--pin)',
    puce: 'bg-pousse text-pin',
    selection: 'bg-pousse text-pin ring-[1.5px] ring-inset ring-pin hover:bg-pousse/75 hover:text-pin',
  },
  feuille: {
    fond: 'var(--feuille)',
    trait: 'var(--pin-fonce)',
    puce: 'bg-feuille text-pin-fonce',
    selection: 'bg-feuille text-pin-fonce ring-[1.5px] ring-inset ring-pin-fonce hover:bg-feuille/75 hover:text-pin-fonce',
  },
  soleil: {
    fond: 'var(--soleil)',
    trait: 'var(--pin)',
    puce: 'bg-soleil text-pin',
    selection: 'bg-soleil text-pin ring-[1.5px] ring-inset ring-pin hover:bg-soleil/75 hover:text-pin',
  },
  vent: {
    fond: 'var(--vent)',
    trait: 'var(--pin)',
    puce: 'bg-vent text-pin',
    selection: 'bg-vent text-pin ring-[1.5px] ring-inset ring-pin hover:bg-vent/75 hover:text-pin',
  },
  neutre: {
    fond: 'var(--muted)',
    trait: 'var(--cendre)',
    puce: 'bg-muted text-cendre',
    selection: 'bg-muted text-cendre ring-[1.5px] ring-inset ring-cendre hover:bg-muted/75 hover:text-cendre',
  },
};

const ORDRE = ['pousse', 'feuille', 'soleil', 'vent'];

export const teintePour = (id) => TEINTES[ORDRE[graineTexte(id || '') % ORDRE.length]];

export const TEINTE_FAMILLE = {
  'Type de plat': 'pousse',
  Régime: 'feuille',
  Occasion: 'soleil',
  Saison: 'vent',
  Durée: 'neutre',
};
