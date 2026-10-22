import { useState } from 'react';
import { Link } from 'react-router-dom';
import TagsRecette from '@/components/TagsRecette';
import { RECETTES } from '@/data/recettes';
import { filtrer, parTitre } from '@/lib/recettes';

// Index A–Z : grands titres (rose au survol) et leurs tags, avec un champ pour filtrer la liste.
export default function Liste() {
  const [q, setQ] = useState('');
  const liste = filtrer(RECETTES, { tags: new Set(), q }).sort(parTitre);

  return (
    <main id="contenu" className="mx-auto max-w-[1152px] px-5 pt-8 pb-20 md:pt-20 xl:px-0">
      <h1 className="sr-only">Toutes les recettes</h1>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrer la liste…"
        aria-label="Filtrer la liste"
        className="mb-10 w-full border-b border-dotted border-black/30 bg-transparent pb-2 text-[18px] outline-none placeholder:text-bleu-gris focus:border-black md:mb-16 md:max-w-[480px]"
      />
      {liste.length ? (
        <ul className="flex flex-col gap-5 md:gap-10">
          {liste.map((r) => (
            <li key={r.id}>
              <article className="md:flex md:items-end md:gap-4">
                <h2 className="mb-1 md:mb-0">
                  <Link
                    to={`/recette/${r.id}`}
                    className="text-[40px] leading-[50px] transition-colors duration-300 ease-out-quart hover:text-rose focus-visible:text-rose md:text-[70px] md:leading-[60px]"
                  >
                    {r.titre}
                  </Link>
                </h2>
                <TagsRecette tags={r.tags} />
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[18px] text-bleu-gris">Aucune recette ne correspond.</p>
      )}
    </main>
  );
}
