import { Link } from 'react-router-dom';
import ArtCanvas from '@/components/ArtCanvas';
import TagsRecette from '@/components/TagsRecette';
import { ilYA } from '@/lib/recettes';
import { teintePour } from '@/lib/teintes';

// Carte blanche arrondie : vignette pastel avec le dessin de la recette, titre, accroche, tags.
export default function CarteRecette({ recette: r }) {
  const teinte = teintePour(r.id);
  return (
    <article className="group/carte relative flex h-full flex-col rounded-3xl bg-card p-2.5 transition-[transform,box-shadow] duration-300 ease-out-quart hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.25)]">
      <Link to={`/recette/${r.id}`} className="block rounded-2xl outline-none after:absolute after:inset-0 after:rounded-3xl focus-visible:ring-[3px] focus-visible:ring-ring">
        <figure className="aspect-[335/210] overflow-hidden rounded-2xl" style={{ backgroundColor: teinte.fond }}>
          <ArtCanvas id={r.id} teinte={teinte} />
        </figure>
        <div className="px-2 pt-3.5">
          <p className="mb-1 text-[13px] text-muted-foreground">{ilYA(r.date)}</p>
          <h2 className="text-[20px] leading-[1.15] tracking-[-0.02em] md:text-[22px]">{r.titre}</h2>
        </div>
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-1.5">
        {r.sousTitre && <p className="mt-1.5 line-clamp-2 text-[15px] leading-snug text-muted-foreground">{r.sousTitre}</p>}
        {/* Au-dessus du lien étiré de la carte, pour rester cliquables */}
        <TagsRecette tags={r.tags} className="relative z-10 mt-auto pt-3" />
      </div>
    </article>
  );
}
