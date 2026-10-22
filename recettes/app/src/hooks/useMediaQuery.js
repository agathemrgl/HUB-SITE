import { useSyncExternalStore } from 'react';

// Vrai tant que la media query correspond (ex. '(min-width: 960px)'), mis à jour au redimensionnement.
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
