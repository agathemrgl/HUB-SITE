import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/*
 * Barre d'outils sous l'en-tête, la même sur chaque page : contour et texte turquoise, fond transparent.
 * Boutons en capitales mono à gauche (filtres, tri, navigation…), action principale à droite, séparée par un filet.
 */
export function Barre({ className, children }) {
  return <div className={cn('sticky top-0 z-20 mt-3 flex h-11 items-stretch border border-vert bg-fond/95 text-vert-texte md:mt-8', className)}>{children}</div>;
}

export const styleBoutonBarre = 'etiquette flex shrink-0 items-center gap-1.5 px-3 transition-colors hover:bg-accent disabled:opacity-40 md:px-4';

export const BoutonBarre = forwardRef(function BoutonBarre({ className, ...props }, ref) {
  return <button ref={ref} type="button" className={cn(styleBoutonBarre, className)} {...props} />;
});

// Action principale (Ajouter, Nouvelle tenue, Enregistrer…) : au bout de la barre, après un filet
const styleAction = 'etiquette flex shrink-0 items-center gap-1.5 border-l border-vert px-4 transition-colors hover:bg-accent disabled:opacity-50';

export function ActionBarre({ to, className, icone: Icone, children, ...props }) {
  const contenu = (
    <>
      {Icone && <Icone className="size-4" />}
      <span className={cn(Icone && 'max-sm:hidden')}>{children}</span>
    </>
  );
  return to ? (
    <Link to={to} className={cn(styleAction, className)} {...props}>
      {contenu}
    </Link>
  ) : (
    <button type="button" className={cn(styleAction, className)} {...props}>
      {contenu}
    </button>
  );
}

export const Espace = () => <span className="flex-1" />;
