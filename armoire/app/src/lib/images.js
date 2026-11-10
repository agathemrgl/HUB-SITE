/*
 * Préparation des photos avant envoi, entièrement dans le navigateur :
 * détourage, recadrage sur le vêtement, réduction à 1000 px max et conversion en WebP.
 *
 * Modes de détourage :
 * - « uni »   : fond uni (photo produit sur fond blanc / gris). On retire seulement le fond relié aux
 *               bords de la photo : les blancs à l'intérieur du vêtement (rayures, col…) sont gardés.
 * - « ia »    : modèle de détourage (@imgly/background-removal). Son masque est ensuite nettoyé :
 *               tout ce qui est à l'intérieur de la silhouette redevient opaque, et on garde les
 *               couleurs d'origine de la photo (le modèle rend les blancs à moitié transparents).
 * - « auto »  : « uni » si les bords de la photo sont d'une couleur unie, « ia » sinon.
 * - « aucun » : photo telle quelle, simplement recadrée et réduite.
 */
const DETOURAGE_CDN = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
const TRAVAIL_MAX = 1600; // résolution de travail
const FINAL_MAX = 1000; // taille finale enregistrée

export const MODES_DETOURAGE = [
  { id: 'auto', label: 'Auto' },
  { id: 'uni', label: 'Fond uni' },
  { id: 'ia', label: 'IA' },
  { id: 'aucun', label: 'Sans' },
];

let moduleDetourage = null;
function chargerModele() {
  moduleDetourage ??= import(/* @vite-ignore */ DETOURAGE_CDN);
  return moduleDetourage;
}

function canvas(l, h) {
  const c = document.createElement('canvas');
  c.width = l;
  c.height = h;
  return c;
}

async function dessiner(source, max) {
  const bmp = await createImageBitmap(source);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = canvas(Math.round(bmp.width * r), Math.round(bmp.height * r));
  c.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

const distance = (d, i, c) => Math.max(Math.abs(d[i] - c[0]), Math.abs(d[i + 1] - c[1]), Math.abs(d[i + 2] - c[2]));

// Couleur du fond si les bords de la photo sont unis (≥ 88 % des pixels proches de la médiane), sinon null
function fondUni(img) {
  const { data: d, width: l, height: h } = img;
  const bords = [];
  const pas = Math.max(1, Math.floor((l + h) / 800));
  for (let x = 0; x < l; x += pas) bords.push((0 * l + x) * 4, ((h - 1) * l + x) * 4);
  for (let y = 0; y < h; y += pas) bords.push((y * l) * 4, (y * l + l - 1) * 4);
  const mediane = [0, 1, 2].map((k) => {
    const v = bords.map((i) => d[i + k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  });
  const proches = bords.filter((i) => distance(d, i, mediane) <= 26).length;
  return proches / bords.length >= 0.88 ? mediane : null;
}

// Masque (0 = fond, 255 = vêtement) : remplissage depuis les bords sur la couleur du fond
function masqueFondUni(img, fond) {
  const { data: d, width: l, height: h } = img;
  const n = l * h;
  const masque = new Uint8ClampedArray(n).fill(255);
  const tolerance = 30;
  const pile = new Int32Array(n);
  let haut = 0;
  const pousser = (p) => {
    if (masque[p] && distance(d, p * 4, fond) <= tolerance) {
      masque[p] = 0;
      pile[haut++] = p;
    }
  };
  for (let x = 0; x < l; x++) {
    pousser(x);
    pousser((h - 1) * l + x);
  }
  for (let y = 0; y < h; y++) {
    pousser(y * l);
    pousser(y * l + l - 1);
  }
  while (haut) {
    const p = pile[--haut];
    const x = p % l;
    if (x > 0) pousser(p - 1);
    if (x < l - 1) pousser(p + 1);
    if (p >= l) pousser(p - l);
    if (p < n - l) pousser(p + l);
  }
  return masque;
}

// Max (dilater) ou min (éroder) sur un carré de rayon r, en deux passes séparables
function morpho(src, l, h, r, dilater) {
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  const pire = dilater ? 0 : 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      let v = pire;
      for (let k = Math.max(0, x - r); k <= Math.min(l - 1, x + r); k++) {
        const s = src[y * l + k];
        if (dilater ? s : !s) {
          v = dilater ? 1 : 0;
          break;
        }
      }
      tmp[y * l + x] = v;
    }
  }
  for (let x = 0; x < l; x++) {
    for (let y = 0; y < h; y++) {
      let v = pire;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) {
        const s = tmp[k * l + x];
        if (dilater ? s : !s) {
          v = dilater ? 1 : 0;
          break;
        }
      }
      out[y * l + x] = v;
    }
  }
  return out;
}

// Nettoie le masque du modèle : referme les petites coupures, bouche l'intérieur de la silhouette
function nettoyerMasqueIA(alpha, l, h) {
  const n = l * h;
  let binaire = new Uint8Array(n);
  for (let p = 0; p < n; p++) binaire[p] = alpha[p] > 110 ? 1 : 0;

  const r = Math.max(2, Math.round(Math.max(l, h) * 0.008));
  binaire = morpho(morpho(binaire, l, h, r, true), l, h, r, false);

  // Tout ce qui n'est pas relié aux bords par du fond est à l'intérieur du vêtement
  const exterieur = new Uint8Array(n);
  const pile = new Int32Array(n);
  let haut = 0;
  const pousser = (p) => {
    if (!binaire[p] && !exterieur[p]) {
      exterieur[p] = 1;
      pile[haut++] = p;
    }
  };
  for (let x = 0; x < l; x++) {
    pousser(x);
    pousser((h - 1) * l + x);
  }
  for (let y = 0; y < h; y++) {
    pousser(y * l);
    pousser(y * l + l - 1);
  }
  while (haut) {
    const p = pile[--haut];
    const x = p % l;
    if (x > 0) pousser(p - 1);
    if (x < l - 1) pousser(p + 1);
    if (p >= l) pousser(p - l);
    if (p < n - l) pousser(p + l);
  }

  const masque = new Uint8ClampedArray(n);
  // Intérieur plein ; au bord extérieur, on garde la transparence douce du modèle
  for (let p = 0; p < n; p++) masque[p] = exterieur[p] ? (alpha[p] > 110 ? alpha[p] : 0) : 255;
  return masque;
}

// Adoucit le contour d'un pixel (anti-crénelage léger sur les masques nets)
function adoucir(masque, l, h) {
  const out = masque.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < l - 1; x++) {
      const p = y * l + x;
      if (!masque[p]) continue;
      const voisins = masque[p - 1] + masque[p + 1] + masque[p - l] + masque[p + l];
      if (voisins < 4 * 255) out[p] = Math.round((masque[p] * 4 + voisins) / 8);
    }
  }
  return out;
}

async function masqueIA(fichier, l, h) {
  const { removeBackground } = await chargerModele();
  const detoure = await dessiner(await removeBackground(fichier), Math.max(l, h));
  // Le modèle rend une image de même proportion : on l'aligne sur la taille de travail
  const c = canvas(l, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(detoure, 0, 0, l, h);
  const { data } = ctx.getImageData(0, 0, l, h);
  const alpha = new Uint8ClampedArray(l * h);
  for (let p = 0; p < l * h; p++) alpha[p] = data[p * 4 + 3];
  return nettoyerMasqueIA(alpha, l, h);
}

// Boîte englobante des pixels visibles
function boite(masque, l, h) {
  let x0 = l, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < l; x++) {
      if (masque[y * l + x] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? { x: 0, y: 0, l, h } : { x: x0, y: y0, l: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Prépare une photo : renvoie { blob (WebP), mode réellement utilisé }.
 * `mode` : 'auto' | 'uni' | 'ia' | 'aucun'.
 */
export async function preparerPhoto(fichier, { mode = 'aucun' } = {}) {
  const travail = await dessiner(fichier, TRAVAIL_MAX);
  const { width: l, height: h } = travail;
  const ctx = travail.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, l, h);

  let utilise = mode;
  let masque = null;
  if (mode === 'auto' || mode === 'uni') {
    const fond = fondUni(img);
    if (fond) {
      masque = adoucir(masqueFondUni(img, fond), l, h);
      utilise = 'uni';
    } else if (mode === 'auto') {
      utilise = 'ia';
    } else {
      // Fond non uni demandé en « fond uni » : on prend la couleur des coins quand même
      const d = img.data;
      masque = adoucir(masqueFondUni(img, [d[0], d[1], d[2]]), l, h);
    }
  }
  if (utilise === 'ia') masque = await masqueIA(fichier, l, h);

  if (masque) {
    for (let p = 0; p < l * h; p++) img.data[p * 4 + 3] = masque[p];
    ctx.putImageData(img, 0, 0);
  }

  // Recadrage sur le vêtement + réduction finale
  const b = masque ? boite(masque, l, h) : { x: 0, y: 0, l, h };
  const r = Math.min(1, FINAL_MAX / Math.max(b.l, b.h));
  const final = canvas(Math.max(1, Math.round(b.l * r)), Math.max(1, Math.round(b.h * r)));
  final.getContext('2d').drawImage(travail, b.x, b.y, b.l, b.h, 0, 0, final.width, final.height);

  const blob = await new Promise((ok, ko) => final.toBlob((x) => (x ? ok(x) : ko(new Error('Conversion impossible'))), 'image/webp', 0.88));
  return { blob, mode: utilise };
}
