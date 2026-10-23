import { Link } from 'react-router-dom';
import { TAG_INDEX, slug } from '@/lib/recettes';
import { TEINTES, TEINTE_FAMILLE } from '@/lib/teintes';
import { cn } from '@/lib/utils';

// Tags d'une recette, teintés selon leur famille : chacun mène à l'accueil filtré sur ce seul tag.
export default function TagsRecette({ tags, className }) {
  if (!tags?.length) return null;
  return (
    <ul className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {tags.map((t) => {
        const teinte = TEINTES[TEINTE_FAMILLE[TAG_INDEX.get(slug(t))?.famille] || 'neutre'];
        return (
          <li key={t}>
            <Link
              to={`/?tags=${slug(t)}`}
              className={cn('inline-flex rounded-full px-2.5 py-1 text-[13px] leading-tight transition-opacity hover:opacity-75 md:text-[14px]', teinte.puce)}
            >
              {t}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
