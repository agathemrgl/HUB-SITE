import { useEffect, useState } from 'react';

// Sous ce seuil, l'appli passe en navigation "un écran à la fois" façon Notes iOS
// (Dossiers -> Notes -> Éditeur) au lieu des 3 colonnes côte à côte.
const BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < BREAKPOINT
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
