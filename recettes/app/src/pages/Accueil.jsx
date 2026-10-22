import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import CarteRecette from '@/components/CarteRecette';
import Filtres from '@/components/Filtres';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useCarnet } from '@/store/Carnet';
import { filtrer, parDate } from '@/lib/recettes';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
  const ordinateur = useMediaQuery('(min-width: 768px)');
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

  const recherche = (
    <label className="group flex w-full items-center gap-2 rounded-full border border-black px-3 py-1 text-[18px] leading-6 transition-colors duration-300 ease-out-quart focus-within:bg-black focus-within:text-vert-clair hover:bg-black hover:text-vert-clair md:w-[320px]">
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Rechercher</span>
      <input
        type="search"
        value={etat.q}
        onChange={(e) => changer({ q: e.target.value }, { remplacer: true })}
        placeholder="Rechercher"
        className="w-full min-w-0 bg-transparent outline-none placeholder:text-current [&::-webkit-search-cancel-button]:hidden"
      />
      {etat.q && (
        <button type="button" onClick={() => changer({ q: '' }, { remplacer: true })} aria-label="Effacer">
          <X className="size-4" />
        </button>
      )}
    </label>
  );

  return (
    <>
      <section className="mx-auto max-w-[1152px] px-5 xl:px-0">
        <h1 className="pt-4 pb-6 text-[clamp(44px,24px+5.6vw,104px)] leading-[0.95] tracking-[-0.1em] md:pt-6 md:pb-8">
          Vie de recettes
        </h1>

        {ordinateur ? (
          <div className="flex items-start justify-between gap-8">
            <Filtres selection={etat.tags} onChange={(tags) => changer({ tags })} />
            <div className="shrink-0">{recherche}</div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {recherche}
            <Drawer>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-full border border-black px-3 py-1 text-[18px] leading-6 data-[actif=true]:bg-black data-[actif=true]:text-vert-clair"
                  data-actif={etat.tags.size > 0}
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filtres{etat.tags.size ? ` · ${etat.tags.size}` : ''}
                </button>
              </DrawerTrigger>
              <DrawerContent className="border-black bg-vert-clair">
                <DrawerHeader>
                  <DrawerTitle className="text-[24px] font-normal">Filtres</DrawerTitle>
                  <DrawerDescription className="sr-only">Choisir des tags pour filtrer les recettes</DrawerDescription>
                </DrawerHeader>
                <div className="overflow-y-auto px-4">
                  <Filtres selection={etat.tags} onChange={(tags) => changer({ tags }, { remplacer: true })} />
                </div>
                <DrawerFooter className="flex-row">
                  <Button variant="outline" className="flex-1 rounded-full bg-transparent text-[16px]" disabled={!etat.tags.size} onClick={() => changer({ tags: new Set() }, { remplacer: true })}>
                    Tout effacer
                  </Button>
                  <DrawerClose asChild>
                    <Button className="flex-1 rounded-full text-[16px]">
                      Voir {liste.length} recette{liste.length > 1 ? 's' : ''}
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        )}
      </section>

      <main id="contenu" className="mx-auto max-w-[1152px] pt-10 pb-20 md:px-5 md:pt-16 xl:px-0">
        <h2 className="sr-only">Recettes</h2>
        {visibles.length ? (
          <ul className="grid gap-y-9 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-14 lg:grid-cols-3">
            {visibles.map((r) => (
              <li key={r.id}>
                <CarteRecette recette={r} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-[18px] text-bleu-gris md:px-0">
            {chargement
              ? 'Chargement des recettes…'
              : erreur && !recettes.length
                ? 'Impossible de charger les recettes pour le moment.'
                : 'Aucune recette ne correspond à cette sélection.'}
          </p>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-20 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-current={n === page ? 'page' : undefined}
                onClick={() => {
                  changer({ tags: etat.tags, q: etat.q, page: n });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="size-10 border border-bleu-gris text-[18px] text-bleu-gris hover:border-black aria-[current=page]:border-black aria-[current=page]:text-black"
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
