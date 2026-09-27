/*
 * Art génératif des recettes.
 *
 * Reprend le principe du générateur d'illustrations du blog Stripe (voir Inspi/) :
 * `count` éléments répartis sur un axe, un cercle ou une grille, dont la taille est modulée
 * par `lump` / `noise`, tournés de `twist`, et dessinés en ellipses, rectangles ou traits.
 *
 * Chaque recette reçoit une famille de formes (FAMILLES) et une variation stable calculée depuis son id :
 * un dessin propre à chaque recette.
 */
const Art = (() => {
  // Familles de formes, réglées par Agathe dans le générateur d'origine.
  // Chaque recette en reçoit une (tirée depuis son id, ou choisie avec `art: "ronds"` dans les données).
  const FAMILLES = {
    // Traits fins en éventail qui dessinent une courbe (shape vide = traits)
    traits: {
      ampX: 1.0034237625822424,
      ampY: 0.7485246754325926,
      aspectRatio: 1.08591867865026,
      axis: "x",
      lump: -0.38921183867007497,
      count: 140,
      freq: 1.0687452907711268,
      isDial: true,
      isLineart: true,
      isRing: false,
      isSpiral: true,
      isBalls: false,
      isMatrix: false,
      left: 82,
      kaleids: 1,
      mouseX: 0.754982984929509,
      mouseY: 0.26559714795008915,
      noise: 0,
      scale: 12,
      top: -58,
      twirl: 0.050499773092567916,
      twist: -3.6,
      velocity: 0.3,
      shape: undefined,
    },
    // Ronds en spirale (le générateur d'origine affiche des ellipses : shape = "ellipse")
    ronds: {
      ampX: 1.0034237625822424,
      ampY: 0.7485246754325926,
      aspectRatio: 1.08591867865026,
      axis: "xy",
      lump: -0.38921183867007497,
      count: 140,
      freq: 1.0687452907711268,
      isDial: false,
      isLineart: true,
      isRing: false,
      isSpiral: true,
      isBalls: false,
      isMatrix: false,
      left: 82,
      kaleids: 1,
      mouseX: 0.5104521147301896,
      mouseY: 0.446524064171123,
      noise: 0,
      scale: 11.571437431186437,
      top: -58,
      twirl: 0.050499773092567916,
      twist: -3.6,
      velocity: 0.3,
      shape: "ellipse",
    },
    // Soleil de rayons fins partant d'un point (spirale sans forme : shape vide)
    rayons: {
      ampX: 1.0034237625822424,
      ampY: 0.7485246754325926,
      aspectRatio: 1.08591867865026,
      axis: "xy",
      lump: -0.38921183867007497,
      count: 140,
      freq: 1.0687452907711268,
      isDial: false,
      isLineart: true,
      isRing: false,
      isSpiral: true,
      isBalls: false,
      isMatrix: false,
      left: 82,
      kaleids: 1,
      mouseX: 0.717549829849295,
      mouseY: 0.13368983957219252,
      noise: 0,
      scale: 12,
      top: -58,
      twirl: 0.050499773092567916,
      twist: -3.6,
      velocity: 0.3,
      shape: undefined,
    },
    // Pétales remplis en guirlande de fleurs (config de la page d'inspiration : shape = "ellipse")
    petales: {
      ampX: 1.1802767815068365,
      ampY: 1.04543959941715,
      aspectRatio: 2.2132197364812716,
      axis: "x",
      lump: 0.4280701804384589,
      count: 52,
      freq: 1.5133290976583957,
      isDial: false,
      isLineart: false,
      isRing: false,
      isSpiral: false,
      isBalls: false,
      isMatrix: false,
      left: -20,
      kaleids: 1,
      mouseX: 0.6835196888672824,
      mouseY: 0.4919786096256685,
      noise: 0,
      scale: 1.7184825410693882,
      top: -13,
      twirl: 0.13161323622614146,
      twist: 11.091827599681913,
      velocity: 0.748455335373059,
      shape: "ellipse",
    },
    // Grands pétales sur une vague (réglage « pétales » avec mouseY plus bas : la guirlande ondule)
    feuillage: {
      ampX: 1.1802767815068365,
      ampY: 1.04543959941715,
      aspectRatio: 2.2132197364812716,
      axis: "x",
      lump: 0.4280701804384589,
      count: 52,
      freq: 1.5133290976583957,
      isDial: false,
      isLineart: false,
      isRing: false,
      isSpiral: false,
      isBalls: false,
      isMatrix: false,
      left: -20,
      kaleids: 1,
      mouseX: 0.7058823529411765,
      mouseY: 0.20409982174688057,
      noise: 0,
      scale: 1.7184825410693882,
      top: -13,
      twirl: 0.13161323622614146,
      twist: 11.091827599681913,
      velocity: 0.748455335373059,
      shape: "ellipse",
    },
    // Pétales sur une vague inversée (mouseY haut : la guirlande ondule dans l'autre sens que « feuillage »)
    vague: {
      ampX: 1.1802767815068365,
      ampY: 1.04543959941715,
      aspectRatio: 2.2132197364812716,
      axis: "x",
      lump: 0.4280701804384589,
      count: 52,
      freq: 1.5133290976583957,
      isDial: false,
      isLineart: false,
      isRing: false,
      isSpiral: false,
      isBalls: false,
      isMatrix: false,
      left: -20,
      kaleids: 1,
      mouseX: 0.6849781234807972,
      mouseY: 0.8190730837789661,
      noise: 0,
      scale: 1.7184825410693882,
      top: -13,
      twirl: 0.13161323622614146,
      twist: 11.091827599681913,
      velocity: 0.748455335373059,
      shape: "ellipse",
    },
  };
  const NOMS_FAMILLES = Object.keys(FAMILLES);
  const CONFIG_DE_BASE = FAMILLES.traits;

  // Réglages globaux du générateur d'origine (5 = neutre : (5 / 10 + 0.5) ** 5 = 1)
  const GLOBAL = { scale: 5, noise: 5, velocity: 5 };

  // Largeur de référence du dessin, comme le canvas d'origine (340px)
  const LARGEUR_REF = 340;

  // ---------- Variation stable par recette ----------

  function graine(texte) {
    let h = 2166136261;
    for (const c of String(texte)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }

  function aleatoire(seed) {
    // mulberry32
    return () => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Déclinaisons : transformations du calcul appliquées par-dessus la famille,
  // pour que chaque recette ait un visuel vraiment différent (gros plan, foule, torsion…).
  // `e(min, max)` tire une valeur stable propre à la recette ; `r()` un nombre entre 0 et 1.
  const nbElements = (c) => (c.isDial ? 0.2 : c.isMatrix ? 4 : 1); // le calcul d'origine multiplie count
  const enSpirale = (c) => c.isSpiral && c.shape === "ellipse";
  const enVague = (c) => c.axis === "x" && !c.isSpiral && !c.isDial;

  const DECLINAISONS = {
    // Gros plan : formes 2 à 3 fois plus grandes, moins nombreuses
    zoom: {
      si: () => true,
      exclut: ["dezoom", "solo"],
      faire: (c, e) => ({ scale: c.scale * e(2, 3), count: c.count * e(0.3, 0.6) }),
    },
    // Vue d'ensemble : formes plus petites et plus nombreuses
    dezoom: {
      si: () => true,
      exclut: ["zoom"],
      faire: (c, e) => ({ scale: c.scale * e(0.3, 0.5), count: c.count * e(1.5, 2.2) }),
    },
    // Un seul motif : 3 à 8 éléments seulement (12 à 25 en spirale, sinon il ne reste presque rien)
    solo: {
      si: () => true,
      exclut: ["foule", "zoom"],
      faire: (c, e) => ({ count: (enSpirale(c) ? e(12, 25) : e(3, 8)) / nbElements(c) }),
    },
    // Foule : 2 à 3 fois plus d'éléments
    foule: { si: () => true, exclut: ["solo"], faire: (c, e) => ({ count: c.count * e(2, 3) }) },
    // Torsion forte, dans un sens ou dans l'autre
    torsion: { si: () => true, faire: (c, e, r) => ({ twist: (r() < 0.5 ? -1 : 1) * e(6, 14) }) },
    // Étirement : formes très fines ou très rondes
    etirement: { si: () => true, faire: (c, e, r) => ({ aspectRatio: r() < 0.5 ? e(0.35, 0.6) : e(2.6, 4) }) },
    // Bruit : tailles irrégulières
    bruit: { si: () => true, faire: (c, e) => ({ noise: e(0.3, 1) }) },
    // Plein ↔ trait : inverse le remplissage des formes
    plein: { si: (c) => c.shape === "ellipse", faire: (c) => ({ isLineart: !c.isLineart }) },
    // Boules : arcs intérieurs dans les ellipses
    boules: {
      si: (c) => c.shape === "ellipse" && !c.isSpiral && !c.isDial,
      faire: () => ({ isBalls: true, isLineart: false }),
    },
    // Vague : ondulation plus ou moins forte de la guirlande
    vague: { si: enVague, faire: (c, e) => ({ mouseY: e(0.05, 0.95) }) },
    // Bosses : tailles qui gonflent et dégonflent le long du motif
    bosses: { si: () => true, faire: (c, e, r) => ({ lump: (r() < 0.5 ? -1 : 1) * e(0.6, 1), freq: e(0.6, 2.6) }) },
  };
  const NOMS_DECLINAISONS = Object.keys(DECLINAISONS);

  function configPour(id, famille) {
    const r = aleatoire(graine(id));
    const entre = (min, max) => min + r() * (max - min);
    const nom = FAMILLES[famille] ? famille : NOMS_FAMILLES[Math.floor(r() * NOMS_FAMILLES.length)];
    const base = FAMILLES[nom];

    // Petites variations communes à toutes les recettes, plus un recadrage
    let c = {
      ...base,
      mouseX: base.mouseX + entre(-0.12, 0.12),
      twist: base.twist * entre(0.6, 1.4),
      lump: base.lump * entre(0.5, 1.5),
      freq: base.freq * entre(0.85, 1.15),
      count: base.count * entre(0.8, 1.2),
      left: base.left + entre(-40, 40),
      top: base.top + entre(-30, 30),
      depart: entre(0, 2000), // position de départ de l'animation
    };

    // Une ou deux déclinaisons compatibles entre elles
    const choisies = [];
    const combien = r() < 0.4 ? 1 : 2;
    const possibles = NOMS_DECLINAISONS.filter((d) => DECLINAISONS[d].si(c));
    while (choisies.length < combien && possibles.length) {
      const d = possibles.splice(Math.floor(r() * possibles.length), 1)[0];
      if (
        choisies.some((x) => (DECLINAISONS[x].exclut || []).includes(d) || (DECLINAISONS[d].exclut || []).includes(x))
      )
        continue;
      choisies.push(d);
      c = { ...c, ...DECLINAISONS[d].faire(c, entre, r) };
    }

    // Garde-fous : nombre de formes réellement dessinées (6 ellipses par élément en spirale)
    // Rayons (spirale sans forme) : tous les traits partent du même point, au-delà de 120 ça fait une tache noire
    const max = enSpirale(c) ? 220 : c.isSpiral ? 120 : 400;
    c.count = Math.max(1, Math.round(Math.min(c.count, max / nbElements(c))));
    return { ...c, famille: nom, declinaisons: choisies };
  }

  // ---------- Dessin (portage du calcul d'origine) ----------

  // r = densité d'écran pour laquelle la configuration a été réglée (écran Retina = 2).
  // Le calcul d'origine se fait en pixels physiques, sauf left / top : on le reproduit tel quel.
  function dessiner(ctx, j, P, largeurRef, hauteurRef, couleurs, r = 2) {
    const h = (GLOBAL.scale / 10 + 0.5) ** 5;
    const f = (GLOBAL.noise / 10 + 0.5) ** 5;
    const T = (r / 2) * 30;
    const amp = 80 * r;
    const largeur = largeurRef * r;
    const hauteur = hauteurRef * r;
    const s = largeur / 2;
    const l = hauteur / 2;

    ctx.save();
    ctx.scale(1 / r, 1 / r);
    ctx.translate(-s, -l);
    ctx.scale(2, 2);
    ctx.strokeStyle = couleurs.trait;
    ctx.fillStyle = couleurs.fond;
    ctx.lineWidth = 0.25 * r;

    let n = j.count;
    if (j.isDial) n *= 0.2;
    else if (j.isMatrix) n *= 4;

    let p = amp * j.ampX * (j.mouseX - 0.5) * 2;
    let q = amp * j.ampY * (j.mouseY - 0.5) * 2;
    if (j.isDial || j.isSpiral || j.isMatrix) p = q = 0;

    const w = j.scale * T * h;
    const cx = s + j.left;
    const cy = l + j.top;

    for (let t = 0; t < n; t += 1) {
      const x = (t / n) * Math.PI * 2 + 0.003 * P;
      let i = cx + Math.cos(x * j.freq) * p;
      let y = cy + Math.sin(x * j.freq) * q;
      if (j.axis === "x") i = cx + (t / n - 0.5) * (largeur / 2) * 4 * (j.mouseX - 0.5);
      if (j.axis === "y") y = cy + (t / n - 0.5) * (hauteur / 2) * 4 * (j.mouseY - 0.5);

      const bosse = Math.sin(0.002 * P + t / (Math.PI * j.freq)) * j.lump * w * f;
      let a =
        Math.max(0, w + bosse) +
        (1 +
          j.noise *
            f *
            (13 * Math.sin(0.13 * t) + 6 * Math.sin(1.57 * t) + 0.31 * Math.sin(0.71 * t) + 1.7 * Math.sin(0.33 * t)));
      if (j.isDial) a = ((n - t) / n) * a * 2;
      const o = a / j.aspectRatio;

      if (j.isMatrix) {
        const cote = Math.floor(Math.sqrt(n));
        const c = t % cote;
        i = (c * a * 1.5 + 10 * Math.cos(0.6 * c + 0.002 * P) + j.left) * j.ampX;
        y = (Math.floor(t / cote) * o + 40 * Math.sin(0.6 * c + 0.002 * P) + j.top) * j.ampY;
      }

      ctx.beginPath();
      ctx.save();
      ctx.translate(i, y);
      ctx.rotate(t * j.twist * 0.03 + P * j.twirl * 0.03);

      if (j.shape === "rect") {
        ctx.rect(-a, -o, 2 * a, (2 * o) / j.aspectRatio);
        ctx.restore();
        if (!j.isLineart) ctx.fill();
        ctx.stroke();
      } else if (j.shape === "ellipse") {
        const ry = Math.abs(o) / Math.abs(j.aspectRatio);
        if (j.isDial) {
          ctx.ellipse(0, 0, Math.abs(a), Math.abs(o), 0, 0, 2 * Math.PI);
          if (!j.isLineart) ctx.fill();
          ctx.stroke();
          const rayons = 3 + Math.floor((Math.sin((n - t) * j.noise * f) + 2) * 12 + n - t);
          for (let k = 0; k < rayons; k += 1) {
            const ang = (k / rayons + (P + 15 * t) * 0.001) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * Math.abs(a), Math.sin(ang) * Math.abs(o));
            ctx.stroke();
          }
        } else if (j.isSpiral) {
          for (let k = 0; k < 6; k += 1) {
            const ang = (k / 6 + (P + 25 * t) * 0.001) * Math.PI * 2;
            const ex = Math.cos(ang) * Math.abs(a) * (t / n) * j.ampX;
            const ey = Math.sin(ang) * ry * (t / n) * j.ampY;
            const rx = (8 + 3 * Math.sin(t / 20 + 0.003 * P)) * r;
            ctx.beginPath();
            ctx.ellipse(ex, ey, rx, rx * j.aspectRatio, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
        } else {
          ctx.ellipse(0, 0, Math.abs(a), ry, 0, 0, 2 * Math.PI);
          if (!j.isLineart) ctx.fill();
          ctx.stroke();
          if (j.isBalls) {
            const arcs = [
              [-(ry * 0.1), 0.995, 0.5, Math.PI + 0.1, -0.1],
              [ry * 0.4, 0.92, 0.4, Math.PI, 0],
              [ry * 0.8, 0.6, 0.2, Math.PI, 0],
            ];
            for (const [dy, kx, ky, de, a2] of arcs) {
              ctx.beginPath();
              ctx.ellipse(0, dy, kx * Math.abs(a), ry * ky, 0, de, a2);
              if (!j.isLineart) ctx.fill();
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      } else {
        // Pas de forme : un trait fin (ellipse de 0.2 de large)
        ctx.ellipse(0, 0, 0.2, Math.max(0, o), 0, 0, 2 * Math.PI);
        ctx.restore();
        if (!j.isLineart) ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- Montage dans la page ----------

  const reduireAnimations =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function couleursDepuis(el) {
    const style = getComputedStyle(el);
    return {
      trait: style.getPropertyValue("--art-trait").trim() || "#000",
      fond: style.getPropertyValue("--art-fond").trim() || "#fff",
    };
  }

  /*
   * Remplace chaque <canvas data-art="id-de-recette" data-art-famille="ronds"> par son dessin
   * (data-art-famille est facultatif).
   * L'animation ne tourne que quand le canvas est visible ; survoler (ou appuyer) l'accélère.
   */
  function monter(racine = document) {
    racine.querySelectorAll("canvas[data-art]").forEach((canvas) => {
      if (canvas.dataset.artMonte) return;
      canvas.dataset.artMonte = "1";

      const config = configPour(canvas.dataset.art, canvas.dataset.artFamille);
      const ctx = canvas.getContext("2d");
      let P = config.depart;
      let visible = false;
      let rapide = false;
      let dernier = 0;
      let raf = null;

      function dimensionner() {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        // Le dessin est calculé sur 340px de large, puis mis à l'échelle du canvas
        const k = (width / LARGEUR_REF) * dpr;
        return { k, largeur: LARGEUR_REF, hauteur: (height / width) * LARGEUR_REF };
      }

      let taille = dimensionner();
      const couleurs = couleursDepuis(canvas);

      function peindre() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(taille.k, 0, 0, taille.k, 0, 0);
        dessiner(ctx, config, P, taille.largeur, taille.hauteur, couleurs);
      }

      function boucle(temps) {
        raf = null;
        if (!visible) return;
        const pas = 1000 / (rapide ? 60 : 25);
        if (temps - dernier >= pas) {
          dernier = temps;
          P += rapide ? 10 * config.velocity : config.velocity;
          peindre();
        }
        raf = requestAnimationFrame(boucle);
      }

      peindre();
      if (reduireAnimations) return;

      new IntersectionObserver(([entree]) => {
        visible = entree.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(boucle);
      }).observe(canvas);

      const cible = canvas.closest("a, figure") || canvas;
      cible.addEventListener("pointerenter", () => (rapide = true));
      cible.addEventListener("pointerleave", () => (rapide = false));

      new ResizeObserver(() => {
        taille = dimensionner();
        peindre();
      }).observe(canvas);
    });
  }

  return { FAMILLES, CONFIG_DE_BASE, configPour, dessiner, monter };
})();

if (typeof module !== "undefined") module.exports = Art;
