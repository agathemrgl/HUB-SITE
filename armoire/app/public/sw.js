/*
 * Service worker d'Armoire : l'app s'ouvre vite et même hors connexion une fois installée
 * sur l'écran d'accueil.
 * - Page : réseau d'abord (toujours la dernière version), la copie en cache sinon.
 * - Fichiers du build (/armoire/assets/, noms avec empreinte) et icônes : cache d'abord.
 * - Supabase n'est pas intercepté (les données sont gardées dans le navigateur, voir store/Armoire.jsx,
 *   et les photos ont un cache HTTP d'un an).
 * Changer VERSION vide les anciens caches.
 */
const VERSION = 'armoire-v2';
const PAGE = '/armoire/';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.add(PAGE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('/armoire/')) return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(VERSION).then((c) => c.put(PAGE, copie));
          return reponse;
        })
        .catch(() => caches.match(PAGE)),
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(
      (enCache) =>
        enCache ||
        fetch(request).then((reponse) => {
          if (reponse.ok) {
            const copie = reponse.clone();
            caches.open(VERSION).then((c) => c.put(request, copie));
          }
          return reponse;
        }),
    ),
  );
});
