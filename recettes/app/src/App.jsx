import { useEffect } from 'react';
import { HashRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Accueil from '@/pages/Accueil';
import Liste from '@/pages/Liste';
import Recette from '@/pages/Recette';

// Remonte en haut de page à chaque changement de page (pas quand seuls les filtres changent)
function RemonterEnHaut() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Gabarit() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="sr-only bg-destructive text-center text-white focus:not-sr-only">
        Aller au contenu principal
      </a>
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

// HashRouter : GitHub Pages ne sait pas renvoyer index.html pour /recettes/recette/xxx,
// les adresses sont donc de la forme /recettes/#/recette/xxx.
export default function App() {
  return (
    <HashRouter>
      <RemonterEnHaut />
      <Routes>
        <Route element={<Gabarit />}>
          <Route index element={<Accueil />} />
          <Route path="liste" element={<Liste />} />
          <Route path="recette/:id" element={<Recette />} />
          <Route path="*" element={<Accueil />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
