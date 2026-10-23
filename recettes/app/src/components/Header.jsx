import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import RechercheRapide from '@/components/RechercheRapide';
import { useCarnet } from '@/store/Carnet';

// Header réduit à l'essentiel : au centre la recherche (⌘K) et, une fois connectée, « Nouvelle recette »
// (sur mobile, l'ajout passe par le bouton flottant). Crédits et connexion sont fixés en haut à droite (App.jsx) :
// sur mobile, la recherche part de la marge gauche et s'arrête 12px avant eux.
export default function Header() {
  const [recherche, setRecherche] = useState(false);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const { editeur, ouvrirFormulaire } = useCarnet();

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md print:hidden">
      <div className="conteneur flex h-14 items-center justify-center sm:h-[73px]">
        <div className="flex w-full max-w-[400px] items-center justify-center gap-2 max-sm:max-w-none max-sm:pr-[76px] md:max-w-[480px]">
          <button
            type="button"
            onClick={() => setRecherche(true)}
            className="flex h-9 w-full max-w-[320px] items-center max-sm:max-w-none gap-2 rounded-full bg-card px-3.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            Rechercher
            <kbd className="ml-auto hidden rounded-md bg-muted px-1.5 text-[11px] md:inline">{mac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          {editeur && (
            <button
              type="button"
              onClick={() => ouvrirFormulaire()}
              className="hidden h-9 shrink-0 items-center gap-1 rounded-full bg-pin px-3.5 text-[14px] text-primary-foreground transition-colors hover:bg-pin/90 md:flex"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nouvelle recette
            </button>
          )}
        </div>
      </div>
      <RechercheRapide ouvert={recherche} setOuvert={setRecherche} />
    </header>
  );
}
