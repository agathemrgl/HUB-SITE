import { useEffect } from 'react';
import { HashRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Toaster } from 'sonner';
import FormulaireRecette from '@/components/formulaire/FormulaireRecette';
import Credits from '@/components/Credits';
import Header from '@/components/Header';
import PointConnexion from '@/components/PointConnexion';
import Accueil from '@/pages/Accueil';
import Recette from '@/pages/Recette';
import { CarnetProvider, useCarnet } from '@/store/Carnet';

// Remonte en haut de page à chaque changement de page (pas quand seuls les filtres changent)
function RemonterEnHaut() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Gabarit() {
  const { editeur, ouvrirFormulaire } = useCarnet();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="sr-only bg-destructive text-center text-primary-foreground focus:not-sr-only">
        Aller au contenu principal
      </a>
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Credits />
      <PointConnexion />

      {/* Mobile : bouton flottant pour ajouter une recette (sur ordinateur, il est dans le header) */}
      {editeur && (
        <button
          type="button"
          onClick={() => ouvrirFormulaire()}
          aria-label="Nouvelle recette"
          className="fixed right-5 bottom-[max(20px,env(safe-area-inset-bottom))] z-20 grid size-14 place-items-center rounded-full bg-pin text-primary-foreground active:scale-95 md:hidden print:hidden"
        >
          <Plus className="size-6" />
        </button>
      )}

      <FormulaireRecette />
      <Toaster
        position="bottom-center"
        toastOptions={{ className: '!rounded-full !border-0 !bg-card !text-foreground !font-sans !text-[15px] !shadow-[0_10px_30px_-12px_rgb(0_0_0/0.3)]' }}
      />
    </div>
  );
}

// HashRouter : GitHub Pages ne sait pas renvoyer index.html pour /recettes/recette/xxx,
// les adresses sont donc de la forme /recettes/#/recette/xxx.
export default function App() {
  return (
    <CarnetProvider>
      <HashRouter>
        <RemonterEnHaut />
        <Routes>
          <Route element={<Gabarit />}>
            <Route index element={<Accueil />} />
            <Route path="recette/:id" element={<Recette />} />
            <Route path="*" element={<Accueil />} />
          </Route>
        </Routes>
      </HashRouter>
    </CarnetProvider>
  );
}
