import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useCarnet } from '@/store/Carnet';
import Logo from '@/components/Logo';
import RechercheRapide from '@/components/RechercheRapide';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const DEMANDE = 'mailto:contact@agathe.space?subject=Demande%20de%20recette';

const lienNav = ({ isActive }) =>
  cn('whitespace-nowrap underline-offset-4 hover:underline focus-visible:underline', isActive && 'underline');

export default function Header() {
  const [recherche, setRecherche] = useState(false);
  const [menu, setMenu] = useState(false);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const { editeur, ouvrirFormulaire, session, setConnexion } = useCarnet();

  return (
    <header className="sticky top-0 z-30 bg-vert-clair print:hidden">
      <div className="mx-auto flex h-[72px] max-w-[1152px] items-center justify-between px-5 md:h-auto md:py-4 xl:px-0">
        <Logo />

        {/* Ordinateur : liens + recherche */}
        <nav aria-label="Navigation principale" className="hidden items-center gap-6 text-[18px] leading-5 font-medium md:flex">
          <button
            type="button"
            onClick={() => setRecherche(true)}
            className="flex items-center gap-2 rounded-full border border-black px-3 py-1 font-normal transition-colors duration-300 ease-out-quart hover:bg-black hover:text-vert-clair"
          >
            <Search className="size-4" aria-hidden="true" />
            Rechercher
            <kbd className="text-[13px] opacity-60">{mac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <NavLink to="/liste" className={lienNav}>
            Liste
          </NavLink>
          <a href={DEMANDE} className="whitespace-nowrap text-vert underline-offset-4 hover:underline focus-visible:underline">
            Demander une recette
          </a>
          {editeur && (
            <button
              type="button"
              onClick={() => ouvrirFormulaire()}
              className="flex items-center gap-1.5 rounded-full bg-black px-3.5 py-1 font-normal text-vert-clair transition-colors duration-300 ease-out-quart hover:bg-vert hover:text-black"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nouvelle recette
            </button>
          )}
        </nav>

        {/* Mobile : loupe + menu « + » */}
        <div className="-mr-3 flex items-center md:hidden">
          <button type="button" onClick={() => setRecherche(true)} className="p-3" aria-label="Rechercher">
            <Search className="size-5" />
          </button>
          <Sheet open={menu} onOpenChange={setMenu}>
            <SheetTrigger asChild>
              <button type="button" className="p-3" aria-label="Afficher la navigation">
                <Plus className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="top" className="border-0 bg-vert-clair px-5 pt-[88px] pb-6">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <ul className="text-[36px] leading-[38px] font-medium">
                <li className="mb-4">
                  <Link to="/" onClick={() => setMenu(false)}>
                    Accueil
                  </Link>
                </li>
                <li className="mb-4">
                  <Link to="/liste" onClick={() => setMenu(false)}>
                    Liste
                  </Link>
                </li>
                <li className="mb-4">
                  <a href={DEMANDE} className="text-vert">
                    Demander une recette
                  </a>
                </li>
                {editeur && (
                  <li className="mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false);
                        ouvrirFormulaire();
                      }}
                    >
                      Nouvelle recette
                    </button>
                  </li>
                )}
                {!session && (
                  <li className="text-[20px] leading-6 font-normal">
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false);
                        setConnexion(true);
                      }}
                      className="underline underline-offset-4"
                    >
                      Connexion
                    </button>
                  </li>
                )}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <RechercheRapide ouvert={recherche} setOuvert={setRecherche} />
    </header>
  );
}
