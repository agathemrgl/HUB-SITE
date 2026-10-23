import { Toggle } from '@/components/ui/toggle';
import { tagVariants } from '@/components/tag';
import { TAGS } from '@/data/tags';
import { slug } from '@/lib/recettes';
import { TEINTES, TEINTE_FAMILLE } from '@/lib/teintes';
import { cn } from '@/lib/utils';

/*
 * Filtres par famille de tags : la famille dans un bouton à bords droits, ses tags en pastilles.
 * Cliquer la famille sélectionne tous ses tags (ou les retire s'ils y sont déjà tous).
 * `enLigne` (accueil) : la famille puis ses tags à la suite, qui passent à la ligne quand la place manque.
 */
export default function Filtres({ selection, onChange, className, enLigne = false }) {
  function basculer(slugs, actif) {
    const suivant = new Set(selection);
    slugs.forEach((s) => (actif ? suivant.delete(s) : suivant.add(s)));
    onChange(suivant);
  }

  return (
    <div className={cn('grid', enLigne ? 'gap-3 md:gap-2' : 'gap-5', className)}>
      {TAGS.map((f) => {
        const enfants = f.tags.map(slug);
        const complete = enfants.every((s) => selection.has(s));
        // Sélectionné : la couleur de la famille (la même que les tags sur les recettes)
        const choisi = TEINTES[TEINTE_FAMILLE[f.famille] || 'neutre'].selection;
        return (
          <div key={f.famille} className={cn('gap-1.5', enLigne ? 'flex flex-wrap items-center' : 'grid')}>
            {/* La famille est un bouton comme les tags, mais à bords droits : il (dé)sélectionne toute la famille */}
            <Toggle
              pressed={complete}
              onPressedChange={() => basculer(enfants, complete)}
              aria-label={`${complete ? 'Retirer' : 'Choisir'} tous les tags « ${f.famille} »`}
              className={cn(tagVariants({ taille: 'md' }), 'w-fit justify-self-start rounded-none', complete && choisi)}
            >
              {f.famille}
            </Toggle>
            <div className={cn('flex gap-1.5', enLigne ? 'contents' : 'flex-wrap')}>
              {f.tags.map((t) => {
                const actif = selection.has(slug(t));
                return (
                  <Toggle key={t} pressed={actif} onPressedChange={() => basculer([slug(t)], actif)} className={cn(tagVariants({ taille: 'md' }), 'shrink-0', actif && choisi)}>
                    {t}
                  </Toggle>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
