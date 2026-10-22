import { Link } from 'react-router-dom';
import ArtCanvas from '@/components/ArtCanvas';
import TagsRecette from '@/components/TagsRecette';
import { ilYA } from '@/lib/recettes';

export default function CarteRecette({ recette: r }) {
  return (
    <article className="text-[14px] leading-5">
      <Link to={`/recette/${r.id}`} className="group relative block">
        <figure className="mb-[15px] bg-vert p-5 transition-colors duration-300 ease-out-quart group-hover:bg-[color-mix(in_srgb,var(--vert)_55%,var(--vert-clair))] group-focus-visible:bg-[color-mix(in_srgb,var(--vert)_55%,var(--vert-clair))] xl:p-8">
          <span className="block aspect-[335/210] w-full bg-vert-clair">
            <ArtCanvas id={r.id} famille={r.art} />
          </span>
        </figure>
        <div className="px-5 sm:px-0">
          <h2 className="mr-2.5 inline text-[14px] leading-[18px] font-medium transition-colors duration-300 ease-out-quart group-hover:text-vert md:text-[18px] md:leading-[25px]">
            {r.titre}
          </h2>
          <p className="inline text-bleu-gris md:text-[18px]">{ilYA(r.date)}</p>
        </div>
      </Link>
      <div className="px-5 sm:px-0">
        {r.sousTitre && <p className="text-[14px] leading-[18px] md:mr-8 md:text-[18px] md:leading-[25px]">{r.sousTitre}</p>}
        <TagsRecette tags={r.tags} className="mt-2.5" />
      </div>
    </article>
  );
}
