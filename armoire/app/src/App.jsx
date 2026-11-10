import { useEffect } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import Connexion from '@/components/Connexion';
import Header, { BarreOnglets } from '@/components/Header';
import Calendrier from '@/pages/Calendrier';
import EditeurTenue from '@/pages/EditeurTenue';
import Tenues from '@/pages/Tenues';
import Vetements from '@/pages/Vetements';
import { ArmoireProvider, useArmoire } from '@/store/Armoire';
import { DonneesTest } from '@/lib/test'; // TEST : à retirer, voir lib/test.js

function RemonterEnHaut() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Gabarit() {
  const { session } = useArmoire();
  const [params] = useSearchParams();
  if (session === undefined) return null;
  // Aperçu de la page de connexion même connectée : …/armoire/#/?apercu=connexion
  if (!session || params.get('apercu') === 'connexion') return <Connexion />;
  return (
    <div className="avec-barre flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <BarreOnglets />
      <DonneesTest /> {/* TEST : à retirer, voir lib/test.js */}
    </div>
  );
}

// HashRouter : GitHub Pages ne renvoie pas index.html pour /armoire/tenues, les adresses sont donc /armoire/#/tenues
export default function App() {
  return (
    <ArmoireProvider>
      <HashRouter>
        <RemonterEnHaut />
        <Routes>
          <Route element={<Gabarit />}>
            <Route index element={<Vetements />} />
            <Route path="tenues" element={<Tenues />} />
            <Route path="tenues/:id" element={<EditeurTenue />} />
            <Route path="calendrier" element={<Calendrier />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster
        position="bottom-center"
        mobileOffset={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
        toastOptions={{ className: '!rounded-full !border-0 !bg-primary !text-primary-foreground !font-sans !text-[14px]' }}
      />
    </ArmoireProvider>
  );
}
