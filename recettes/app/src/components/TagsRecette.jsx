import { Link } from 'react-router-dom';
import { slug } from '@/lib/recettes';
import { tagVariants } from '@/components/tag';
import { cn } from '@/lib/utils';

// Tags d'une recette : chaque tag mène à l'accueil filtré sur ce seul tag.
export default function TagsRecette({ tags, taille = 'sm', className }) {
  if (!tags?.length) return null;
  return (
    <ul className={cn('flex flex-wrap items-center gap-1', className)}>
      {tags.map((t) => (
        <li key={t}>
          <Link to={`/?tags=${slug(t)}`} className={tagVariants({ taille })}>
            {t}
          </Link>
        </li>
      ))}
    </ul>
  );
}
