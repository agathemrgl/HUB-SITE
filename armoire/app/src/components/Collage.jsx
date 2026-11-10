import { useRef } from 'react';
import { urlPhoto } from '@/lib/donnees';
import { cn } from '@/lib/utils';

/*
 * Collage d'une tenue : chaque élément de `composition` est { v: id vêtement, x, y, l, z }.
 * x, y (coin haut gauche) et l (largeur) sont des fractions du canvas, pour que la tenue garde
 * la même forme en miniature, dans le calendrier et dans l'éditeur.
 *
 * En mode `editable`, on glisse un élément pour le déplacer, on tire la poignée pour le redimensionner.
 */
export const LARGEUR_MIN = 0.08;
export const LARGEUR_MAX = 1.2;

export default function Collage({ composition, vetementsParId, editable = false, selection, onSelection, onChange, className }) {
  const cadre = useRef(null);
  const geste = useRef(null);

  const elements = composition.filter((e) => vetementsParId.has(e.v));

  function commencer(event, index, mode) {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    onSelection?.(index);
    const rect = cadre.current.getBoundingClientRect();
    geste.current = { index, mode, depart: { x: event.clientX, y: event.clientY }, rect, initial: { ...composition[index] } };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function bouger(event) {
    const g = geste.current;
    if (!g) return;
    const dx = (event.clientX - g.depart.x) / g.rect.width;
    const dy = (event.clientY - g.depart.y) / g.rect.height;
    const suivant = [...composition];
    if (g.mode === 'deplacer') {
      suivant[g.index] = {
        ...g.initial,
        x: Math.min(0.95, Math.max(-g.initial.l + 0.05, g.initial.x + dx)),
        y: Math.min(0.95, Math.max(-0.2, g.initial.y + dy)),
      };
    } else {
      suivant[g.index] = { ...g.initial, l: Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, g.initial.l + dx)) };
    }
    onChange(suivant);
  }

  function finir() {
    geste.current = null;
  }

  return (
    <div
      ref={cadre}
      className={cn('relative aspect-[3/4] w-full touch-none overflow-hidden select-none', className)}
      onPointerDown={() => editable && onSelection?.(null)}
    >
      {composition.map((e, index) => {
        const vetement = vetementsParId.get(e.v);
        if (!vetement) return null;
        const choisi = editable && selection === index;
        return (
          <div
            key={`${e.v}-${index}`}
            className={cn('absolute', editable && 'cursor-grab active:cursor-grabbing')}
            style={{ left: `${e.x * 100}%`, top: `${e.y * 100}%`, width: `${e.l * 100}%`, zIndex: e.z ?? index }}
            onPointerDown={(ev) => commencer(ev, index, 'deplacer')}
            onPointerMove={bouger}
            onPointerUp={finir}
            onPointerCancel={finir}
          >
            {vetement.photo ? (
              <img src={urlPhoto(vetement.photo)} alt={vetement.nom} draggable={false} className="pointer-events-none block w-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.12)]" />
            ) : (
              <div className="grid aspect-square w-full place-items-center rounded-lg bg-muted text-center text-[11px]">{vetement.nom}</div>
            )}
            {choisi && (
              <>
                <div className="pointer-events-none absolute -inset-1 rounded-md border-2 border-dashed border-vert" />
                <div
                  role="slider"
                  aria-label="Redimensionner"
                  aria-valuenow={Math.round(e.l * 100)}
                  className="absolute -right-3 -bottom-3 rond size-6 cursor-nwse-resize border-2 border-white bg-primary shadow"
                  onPointerDown={(ev) => commencer(ev, index, 'taille')}
                  onPointerMove={bouger}
                  onPointerUp={finir}
                  onPointerCancel={finir}
                />
              </>
            )}
          </div>
        );
      })}
      {!editable && elements.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-[13px] text-muted-foreground">Tenue vide</div>
      )}
    </div>
  );
}

// Position d'arrivée d'un vêtement ajouté : centré, en léger décalage à chaque ajout, par-dessus les autres
export function nouvelElement(vetement, composition) {
  const larges = { hauts: 0.5, bas: 0.45, robes: 0.5, vestes: 0.55, chaussures: 0.3, sacs: 0.3, accessoires: 0.22 };
  const l = larges[vetement.categorie] ?? 0.4;
  const hauteurs = { hauts: 0.08, vestes: 0.06, robes: 0.08, bas: 0.42, chaussures: 0.74, sacs: 0.45, accessoires: 0.1 };
  const decalage = (composition.length % 5) * 0.03;
  const z = composition.reduce((m, e) => Math.max(m, e.z ?? 0), 0) + 1;
  return { v: vetement.id, x: (1 - l) / 2 + decalage, y: (hauteurs[vetement.categorie] ?? 0.3) + decalage, l, z };
}
