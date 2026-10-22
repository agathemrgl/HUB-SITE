import { Toggle } from '@/components/ui/toggle';
import { tagVariants } from '@/components/tag';
import { TAGS } from '@/data/recettes';
import { slug } from '@/lib/recettes';
import { cn } from '@/lib/utils';

/*
 * Filtres par famille de tags. Cliquer une famille sélectionne tous ses tags
 * (ou les retire tous si elle est déjà complète).
 */
export default function Filtres({ selection, onChange, className }) {
  function basculer(slugs, actif) {
    const suivant = new Set(selection);
    slugs.forEach((s) => (actif ? suivant.delete(s) : suivant.add(s)));
    onChange(suivant);
  }

  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {TAGS.map((f) => {
        const enfants = f.tags.map(slug);
        const complete = enfants.every((s) => selection.has(s));
        return (
          <li key={f.famille} className="flex flex-wrap items-center gap-1">
            <Toggle
              pressed={complete}
              onPressedChange={() => basculer(enfants, complete)}
              className={cn(tagVariants({ taille: 'md', forme: 'famille', actif: complete }), 'mr-1')}
            >
              {f.famille}
            </Toggle>
            {f.tags.map((t) => {
              const actif = selection.has(slug(t));
              return (
                <Toggle
                  key={t}
                  pressed={actif}
                  onPressedChange={() => basculer([slug(t)], actif)}
                  className={tagVariants({ taille: 'md', actif })}
                >
                  {t}
                </Toggle>
              );
            })}
          </li>
        );
      })}
    </ul>
  );
}
