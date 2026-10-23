import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import CarteRecette from '@/components/CarteRecette';
import Filtres from '@/components/Filtres';
import { tagVariants } from '@/components/tag';
import { filtrer, parDate } from '@/lib/recettes';
import { useCarnet } from '@/store/Carnet';
import { cn } from '@/lib/utils';

const PAR_PAGE = 30;

// L'état (tags, recherche, page) vit dans l'adresse : #/?tags=dessert,vegan&q=cookie&page=2
function lireEtat(params) {
  return {
    tags: new Set((params.get('tags') || '').split(',').filter(Boolean)),
    q: params.get('q') || '',
    page: Math.max(1, parseInt(params.get('page'), 10) || 1),
  };
}

export default function Accueil() {
  const [params, setParams] = useSearchParams();
  const etat = lireEtat(params);
  const { recettes, chargement, erreur } = useCarnet();

  function changer(modif, { remplacer = false } = {}) {
    const e = { ...etat, page: 1, ...modif };
    const p = new URLSearchParams();
    if (e.tags.size) p.set('tags', [...e.tags].join(','));
    if (e.q) p.set('q', e.q);
    if (e.page > 1) p.set('page', e.page);
    setParams(p, { replace: remplacer });
  }

  const liste = useMemo(() => filtrer(recettes, etat).sort(parDate), [params, recettes]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const page = Math.min(etat.page, pages);
  const visibles = liste.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);
  const nbResultats = `${liste.length} recette${liste.length > 1 ? 's' : ''}`;

  return (
    <>
      <section className="conteneur pt-4 md:pt-10">
        <h1 className="text-[clamp(44px,24px+5.6vw,96px)] leading-[0.95] tracking-[-0.06em] text-pin">Vie de recettes</h1>
        <p className="mt-3 max-w-[560px] text-[17px] leading-snug text-muted-foreground md:text-[19px]">
          Mon carnet de recettes, entre héritage familial, origines et découvertes d’ailleurs.
        </p>

        {/* Tous les filtres, une famille par ligne */}
        <Filtres enLigne selection={etat.tags} onChange={(tags) => changer({ tags }, { remplacer: true })} className="mt-8 md:mt-10" />
        {etat.tags.size > 0 && (
          <button type="button" onClick={() => changer({ tags: new Set() })} className={cn(tagVariants({ taille: 'sm' }), 'mt-4 bg-muted')}>
            Tout effacer
          </button>
        )}
      </section>

      <main id="contenu" className="conteneur pt-6 pb-16">
        <h2 className="surtitre mb-3">{etat.q || etat.tags.size ? nbResultats : 'Dernières recettes'}</h2>
        {visibles.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1920px]:grid-cols-5">
            {visibles.map((r) => (
              <li key={r.id}>
                <CarteRecette recette={r} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl bg-card px-6 py-10 text-center text-[17px] text-muted-foreground">
            {chargement
              ? 'Chargement des recettes…'
              : erreur && !recettes.length
                ? 'Impossible de charger les recettes pour le moment.'
                : 'Aucune recette ne correspond à cette sélection.'}
          </p>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex justify-center gap-1.5">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-current={n === page ? 'page' : undefined}
                onClick={() => {
                  changer({ tags: etat.tags, q: etat.q, page: n });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(tagVariants({ taille: 'md', actif: n === page }), 'size-11 px-0')}
              >
                {n}
              </button>
            ))}
          </nav>
        )}
      </main>
    </>
  );
}
