/*
 * Service worker du carnet : le site s'ouvre même hors connexion (web-app sur l'écran d'accueil).
 * - Pages : réseau d'abord (toujours la dernière version), la copie en cache sinon.
 * - Fichiers du build (/recettes/assets/, noms avec empreinte) et images : cache d'abord.
 * - Supabase et autres domaines : non interceptés (les recettes sont déjà gardées dans le navigateur, voir store/Carnet.jsx).
 * Changer VERSION vide les anciens caches.
 */
const VERSION = 'recettes-v4';
const PAGE = '/recettes/';

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
  if (request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('/recettes/')) return;

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
