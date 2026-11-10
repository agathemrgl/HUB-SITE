import { urlPhoto } from '@/lib/donnees';
import { COULEUR } from '@/lib/constantes';
import { cn } from '@/lib/utils';

// Photo d'un vêtement, contenue (jamais rognée)
export function Photo({ vetement, className, imgClassName }) {
  const src = urlPhoto(vetement?.photo);
  return (
    <div className={cn('grid place-items-center overflow-hidden', className)}>
      {src ? (
        <img src={src} alt={vetement.nom} loading="lazy" draggable={false} className={cn('max-h-full max-w-full object-contain', imgClassName)} />
      ) : (
        <span className="etiquette px-2 text-center text-encre/50">{vetement?.nom || 'Sans photo'}</span>
      )}
    </div>
  );
}

// Pastille cliquable (catégories, saisons, tags…) : contour vert, pleine quand active
export function Puce({ actif, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      className={cn(
        'etiquette inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
        actif ? 'border-vert bg-primary text-primary-foreground' : 'border-vert/60 text-encre hover:border-vert hover:text-vert-texte',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PastilleCouleur({ id, className }) {
  const c = COULEUR[id];
  if (!c) return null;
  return <span title={c.label} className={cn('rond inline-block size-4 shrink-0 ring-1 ring-encre/20', className)} style={{ background: c.hex }} />;
}

export function EtatVide({ texte, children }) {
  return (
    <div className="grille-filets mt-2">
      <div className="grid place-items-center gap-4 px-6 py-16 text-center">
        <p className="max-w-md font-sans text-[17px] leading-snug font-medium">{texte}</p>
        {children}
      </div>
    </div>
  );
}

// Bloc vide : un très grand « + » qui occupe tout le bloc et lance l'ajout
export function BlocVide({ label, onClick, children }) {
  return (
    <div className="mt-2 grid gap-4">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className="group grid min-h-[50vh] w-full place-items-center border border-vert bg-carte text-vert-texte transition-colors hover:bg-accent"
      >
        <svg viewBox="0 0 100 100" className="size-40 transition-transform duration-300 group-hover:rotate-90 md:size-64" aria-hidden>
          <path d="M50 4v92M4 50h92" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {children}
    </div>
  );
}

// Case « + » qui termine une grille (ajouter un vêtement, une tenue…). Elle reprend la structure
// invisible des cases voisines (`forme`) pour avoir exactement les mêmes proportions.
export function CaseAjout({ label, forme = 'vetement', className, ...props }) {
  const croix = (
    <span className="grid h-full place-items-center content-center gap-4">
      <span className="croix transition-transform duration-300 group-hover:rotate-90" aria-hidden />
      <span className="etiquette">{label}</span>
    </span>
  );
  return (
    <button type="button" aria-label={label} className={cn('group block w-full text-left text-vert-texte transition-colors hover:bg-accent', className)} {...props}>
      {forme === 'tenue' ? (
        <>
          <span className="block aspect-[3/4]">{croix}</span>
          <span aria-hidden className="invisible grid gap-1.5 p-3 md:p-4">
            <span className="text-[15px] md:text-[17px]">.</span>
            <span className="etiquette">.</span>
            <span className="etiquette">.</span>
          </span>
        </>
      ) : (
        <span className="flex flex-col p-3 md:p-4">
          <span aria-hidden className="invisible etiquette">.</span>
          <span aria-hidden className="invisible etiquette">.</span>
          <span className="mt-3 block aspect-square w-full">{croix}</span>
          <span aria-hidden className="invisible numero mt-2 self-end">00</span>
        </span>
      )}
    </button>
  );
}

export const numero = (n) => String(n).padStart(2, '0');

export function fois(n) {
  if (!n) return 'Jamais porté';
  return `Porté ${n}×`;
}
