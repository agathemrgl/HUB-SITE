/*
 * Rendu du carnet de recettes à partir de data/recettes.js (TAGS, RECETTES).
 * Chaque page déclare son rôle via <body data-page="accueil|liste|recette">.
 */
(() => {
  const PAR_PAGE = 30;
  const ACCUEIL = "index.html";

  // ---------- Utilitaires ----------

  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );

  const slug = (s) =>
    String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const sansAccents = (s) => slug(s).replace(/-/g, " ");

  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "always" });
  function ilYA(dateIso) {
    const jours = Math.max(0, Math.floor((Date.now() - new Date(dateIso + "T00:00:00")) / 86400000));
    if (jours === 0) return "aujourd'hui";
    if (jours < 7) return rtf.format(-jours, "day");
    if (jours < 30) return rtf.format(-Math.floor(jours / 7), "week");
    if (jours < 365) return rtf.format(-Math.floor(jours / 30), "month");
    return rtf.format(-Math.floor(jours / 365), "year");
  }

  const lienRecette = (r) => `recette.html?id=${encodeURIComponent(r.id)}`;
  const lienTags = (slugs) => `${ACCUEIL}?tags=${slugs.map(encodeURIComponent).join(",")}`;
  const parDate = (a, b) => b.date.localeCompare(a.date);

  // Tous les tags détaillés, indexés par slug : { label, famille }
  const TAG_INDEX = new Map();
  TAGS.forEach((f) => f.tags.forEach((t) => TAG_INDEX.set(slug(t), { label: t, famille: f.famille })));

  function tagsHtml(tags) {
    return (tags || [])
      .map(
        (t) =>
          `<li class="mb-6"><a href="${lienTags([slug(t)])}" class="tag tag--teaser rounded-full" data-tag="${slug(t)}">${esc(t)}</a></li>`,
      )
      .join("");
  }

  // ---------- Accueil ----------

  function carteHtml(r, i) {
    return `<li class="-grid2x:mb-34">
  <article class="group/teaser relative text-14 leading-20">
    <a href="${lienRecette(r)}" class="relative block group z-0">
      <figure class="block bg-grey p-20 xlg:p-32 mb-15 transition-colors duration-300 ease-out-quart group-hover:bg-grey-light group-focus:bg-grey-light">
        <span class="block relative w-full bg-white aspect-screenshot"><canvas class="art" data-art="${esc(r.id)}"${r.art ? ` data-art-famille="${esc(r.art)}"` : ""} aria-hidden="true"></canvas></span>
      </figure>
      <div class="-grid2x:px-20">
        <h2 class="inline-block mr-10 text-14 md:text-18 leading-18 md:leading-25 font-medium transition-colors duration-300 ease-out-quart group-hover:text-blue group-focus:text-blue"><span>${esc(r.titre)}</span></h2>
        <p class="inline-block text-blue-grey">${ilYA(r.date)}</p>
      </div>
    </a>
    <div class="relative -grid2x:px-20 z-0">
      <div class="text-14 md:text-18 leading-18 md:leading-25 grid2x:mr-32"><p>${esc(r.sousTitre)}</p></div>
      <ul class="flex flex-wrap items-center gap-x-3 mt-10">${tagsHtml(r.tags)}</ul>
    </div>
  </article>
</li>`;
  }

  function lireEtat() {
    const p = new URLSearchParams(location.search);
    return {
      tags: new Set((p.get("tags") || "").split(",").filter(Boolean)),
      q: p.get("q") || "",
      page: Math.max(1, parseInt(p.get("page"), 10) || 1),
    };
  }

  function ecrireEtat(etat, remplacer = false) {
    const p = new URLSearchParams();
    if (etat.tags.size) p.set("tags", [...etat.tags].join(","));
    if (etat.q) p.set("q", etat.q);
    if (etat.page > 1) p.set("page", etat.page);
    const url = location.pathname + (p.toString() ? `?${p.toString().replace(/%2C/g, ",")}` : "");
    history[remplacer ? "replaceState" : "pushState"](null, "", url);
  }

  function initAccueil() {
    const filtres = document.getElementById("filtres");
    const grille = document.getElementById("grille");
    const pagination = document.getElementById("pagination");
    const recherche = document.getElementById("edit-keys");
    let etat = lireEtat();

    function renderFiltres() {
      filtres.innerHTML = TAGS.map((f) => {
        const enfants = f.tags.map(slug);
        const toutActif = enfants.length > 0 && enfants.every((s) => etat.tags.has(s));
        const cls = (actif) => (actif ? "tag--filter-active" : "tag--filter-inactive");
        return `<li class="inline xsm:block">
  <a href="${lienTags(enfants)}" class="tag tag--filter px-10 mr-4 ${cls(toutActif)}" data-famille="${esc(f.famille)}" aria-pressed="${toutActif}">${esc(f.famille)}</a>
  <ul class="inline">${f.tags
    .map(
      (t) =>
        `<li class="inline-block mr-4 mb-6"><a href="${lienTags([slug(t)])}" class="tag tag--filter px-12 rounded-full ${cls(etat.tags.has(slug(t)))}" data-tag="${slug(t)}" aria-pressed="${etat.tags.has(slug(t))}">${esc(t)}</a></li>`,
    )
    .join("")}</ul>
</li>`;
      }).join("");
    }

    function resultats() {
      const q = sansAccents(etat.q.trim());
      return RECETTES.filter((r) => {
        // Filtre « au moins un des tags sélectionnés »
        if (etat.tags.size && !(r.tags || []).some((t) => etat.tags.has(slug(t)))) return false;
        if (q && !sansAccents([r.titre, r.sousTitre, ...(r.tags || [])].join(" ")).includes(q)) return false;
        return true;
      }).sort(parDate);
    }

    function renderPagination(total) {
      const pages = Math.ceil(total / PAR_PAGE);
      if (pages <= 1) {
        pagination.innerHTML = "";
        return;
      }
      const base =
        "block pt-3 pb-4 border w-pager-item h-pager-item text-18 leading-24 text-center whitespace-nowrap transition-colors duration-300 ease-out-quart hover:border-black focus:border-black no-tap-highlight";
      let html = "";
      for (let n = 1; n <= pages; n++) {
        const courant = n === etat.page;
        html += `<li class="inline-block mr-8"><a href="?page=${n}" data-page="${n}" title="${courant ? "Page actuelle" : `Aller à la page ${n}`}"${courant ? ' aria-current="page"' : ""} class="${base} ${courant ? "border-black text-black" : "border-grey-light text-blue-grey"}"><span class="sr-only">${courant ? "Page actuelle" : "Page"} </span>${n}</a></li>`;
      }
      if (etat.page < pages) {
        html += `<li class="inline-block ml-11"><a href="?page=${etat.page + 1}" data-page="${etat.page + 1}" rel="next" title="Aller à la page suivante" class="inline-block pt-4 pb-5 text-18 leading-24 text-blue-grey whitespace-nowrap transition-colors duration-300 ease-out-quart hover:text-black focus:text-black no-tap-highlight"><span class="-md:sr-only">Page suivante</span><span aria-hidden="true" class="md:hidden">Suivant</span></a></li>`;
      }
      pagination.innerHTML = html;
    }

    function render() {
      renderFiltres();
      const liste = resultats();
      const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
      etat.page = Math.min(etat.page, pages);
      const debut = (etat.page - 1) * PAR_PAGE;
      grille.innerHTML = liste.length
        ? liste
            .slice(debut, debut + PAR_PAGE)
            .map(carteHtml)
            .join("")
        : `<li class="recettes-vide text-18 leading-25 text-blue-grey">Aucune recette ne correspond à cette sélection.</li>`;
      renderPagination(liste.length);
      Art.monter(grille);
    }

    function changer(modif, { remonter = false } = {}) {
      modif();
      ecrireEtat(etat);
      render();
      if (remonter) grille.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    filtres.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      e.preventDefault();
      changer(() => {
        etat.page = 1;
        if (a.dataset.tag) {
          etat.tags.has(a.dataset.tag) ? etat.tags.delete(a.dataset.tag) : etat.tags.add(a.dataset.tag);
        } else {
          // Famille : tout sélectionner, ou tout désélectionner si déjà complète
          const enfants = TAGS.find((f) => f.famille === a.dataset.famille).tags.map(slug);
          const toutActif = enfants.every((s) => etat.tags.has(s));
          enfants.forEach((s) => (toutActif ? etat.tags.delete(s) : etat.tags.add(s)));
        }
      });
    });

    // Un tag sur une carte : n'afficher que ce tag
    grille.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-tag]");
      if (!a) return;
      e.preventDefault();
      changer(
        () => {
          etat.tags = new Set([a.dataset.tag]);
          etat.page = 1;
        },
        { remonter: true },
      );
    });

    pagination.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-page]");
      if (!a) return;
      e.preventDefault();
      changer(() => (etat.page = parseInt(a.dataset.page, 10)), { remonter: true });
    });

    if (recherche) {
      recherche.value = etat.q;
      recherche.form.addEventListener("submit", (e) => e.preventDefault());
      const surSaisie = () => {
        etat.q = recherche.value;
        etat.page = 1;
        ecrireEtat(etat, true);
        render();
      };
      recherche.addEventListener("input", surSaisie);
      // Le bouton « Effacer » du thème vide le champ sans déclencher « input »
      recherche.form.querySelector(".search-wrap button")?.addEventListener("click", () => setTimeout(surSaisie));
    }

    window.addEventListener("popstate", () => {
      etat = lireEtat();
      if (recherche) recherche.value = etat.q;
      render();
    });

    render();
  }

  // ---------- Liste A–Z (design de l'ancienne page « Marques ») ----------

  function initListe() {
    const liste = [...RECETTES].sort((a, b) => a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" }));
    document.getElementById("liste").innerHTML = liste
      .map(
        (r, i) => `<li class="block${i < liste.length - 1 ? " mb-20 md:mb-40" : ""}">
  <article class="md:flex md:items-end">
    <h2 class="-md:mb-4 md:mr-16 text-0 leading-0 tracking-normal md:whitespace-nowrap">
      <a href="${lienRecette(r)}" class="text-40m md:text-70 leading-50 md:leading-60 transition-colors duration-300 ease-out-quart liste__titre"><span>${esc(r.titre)}</span></a>
    </h2>
    <ul class="flex flex-wrap gap-4">${(r.tags || [])
      .map(
        (t) =>
          `<li><a href="${lienTags([slug(t)])}" class="tag tag--teaser tag--directory rounded-full">${esc(t)}</a></li>`,
      )
      .join("")}</ul>
  </article>
</li>`,
      )
      .join("");
  }

  // ---------- Page recette ----------
  // Construction inspirée du blog Stripe : colonne « Infos / Ingrédients » fixe au défilement,
  // à côté de l'article « Préparation ».

  // Multiplicateur des quantités : ÷3, ÷2, ×1, ×2, ×3
  const FACTEURS = [
    { label: "÷3", valeur: 1 / 3 },
    { label: "÷2", valeur: 1 / 2 },
    { label: "×1", valeur: 1 },
    { label: "×2", valeur: 2 },
    { label: "×3", valeur: 3 },
  ];
  // Fractions lisibles, écrites avec une barre : Amiamie n'a pas les symboles ½, ⅓, ¼…
  const FRACTIONS = [
    ["1/6", 1 / 6],
    ["1/4", 1 / 4],
    ["1/3", 1 / 3],
    ["1/2", 1 / 2],
    ["2/3", 2 / 3],
    ["3/4", 3 / 4],
  ];
  const SYMBOLES = { "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4 };
  // Quantité en début de ligne : « 60 », « 1,5 », « 1/2 », « 1 1/2 », « ½ », « 1 ½ »
  const QUANTITE = /^(\d+\/\d+|\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\s*[½⅓⅔¼¾])?|[½⅓⅔¼¾])(\s*)/;
  const UNITE_METRIQUE = /^(k?g|mg|[mcd]?l)\b/i;

  function lireNombre(txt) {
    return txt
      .split(/\s+|(?=[½⅓⅔¼¾])/)
      .filter(Boolean)
      .reduce((total, morceau) => {
        if (SYMBOLES[morceau]) return total + SYMBOLES[morceau];
        if (morceau.includes("/")) {
          const [a, b] = morceau.split("/").map(Number);
          return total + a / b;
        }
        return total + parseFloat(morceau.replace(",", "."));
      }, 0);
  }

  // Grammes, litres… en décimal ; cuillères, pièces… en fractions lisibles (1/2, 1/3, 1/4…)
  function ecrireNombre(n, metrique) {
    const decimal = (x, chiffres) => String(Number(x.toFixed(chiffres))).replace(".", ",");
    if (metrique) return n >= 10 ? String(Math.round(n)) : decimal(n, n >= 1 ? 1 : 2);
    const entier = Math.floor(n + 0.02);
    const reste = n - entier;
    if (reste < 0.05) return String(entier);
    const proche = FRACTIONS.find(([, v]) => Math.abs(v - reste) < 0.04);
    if (proche) return entier ? `${entier} ${proche[0]}` : proche[0];
    return decimal(n, 1);
  }

  function multiplier(ligne, facteur, arrondirEntier = false) {
    if (facteur === 1) return ligne;
    const m = ligne.match(QUANTITE);
    if (!m) return ligne; // pas de quantité (ex. « Gros sel ») : inchangé
    const reste = ligne.slice(m[0].length);
    const n = lireNombre(m[1]) * facteur;
    const nombre = arrondirEntier ? String(Math.max(1, Math.round(n))) : ecrireNombre(n, UNITE_METRIQUE.test(reste));
    return nombre + m[2] + reste;
  }

  function initRecette() {
    const conteneur = document.getElementById("recette");
    const id = new URLSearchParams(location.search).get("id");
    const r = RECETTES.find((x) => x.id === id);
    if (!r) {
      conteneur.innerHTML = `<p class="recette__introuvable">Cette recette n'existe pas (ou plus). <a href="${ACCUEIL}">Retour au carnet</a></p>`;
      return;
    }
    document.title = `${r.titre} — Recettes de vie`;

    const entete = (label) => `<div class="recette__table-entete">${label}</div>`;
    // Lignes libres (`infos`), sinon les 4 lignes par défaut
    const lignesInfos = r.infos || [
      ["Durée", r.duree || r.temps],
      ["Difficulté", r.difficulte],
      ["Cuisson", r.cuisson],
      ["Portions", r.portions],
    ];
    const infosHtml = (facteur) =>
      lignesInfos
        .map(([label, valeur]) => {
          if (valeur && /^portions?$/i.test(label)) valeur = multiplier(valeur, facteur, true);
          return `<div class="recette__info"><dt>${label}</dt><dd>${valeur ? esc(valeur) : "—"}</dd></div>`;
        })
        .join("");
    const ingredientsHtml = (facteur) =>
      r.ingredients?.length
        ? r.ingredients.map((x) => `<li>${esc(multiplier(x, facteur))}</li>`).join("")
        : `<li class="recette__vide">—</li>`;
    const quantites = r.ingredients?.length
      ? `<div class="recette__quantites" role="group" aria-label="Adapter les quantités">${FACTEURS.map(
          (f) =>
            `<button type="button" class="tag tag--filter px-12 rounded-full ${f.valeur === 1 ? "tag--filter-active" : "tag--filter-inactive"}" data-facteur="${f.valeur}" aria-pressed="${f.valeur === 1}">${f.label}</button>`,
        ).join("")}</div>`
      : "";

    const histoire = []
      .concat(r.histoire || [])
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");
    const etapes = r.etapes?.length
      ? `<ol class="recette__etapes">${r.etapes
          .map(
            (x, i) =>
              `<li><span class="recette__etape-num">Étape ${String(i + 1).padStart(2, "0")}</span><p>${esc(x)}</p></li>`,
          )
          .join("")}</ol>`
      : "";
    const faq = r.faq?.length
      ? `<div class="recette__table-entete recette__table-entete--faq">Questions fréquentes</div><dl class="recette__faq">${r.faq
          .map((x) => `<div><dt>${esc(x.question)}</dt><dd>${esc(x.reponse)}</dd></div>`)
          .join("")}</dl>`
      : "";
    const preparation =
      histoire || etapes || faq
        ? histoire + etapes + faq
        : `<p class="recette__vide">La préparation arrive bientôt.</p>`;

    conteneur.innerHTML = `
<header class="recette__entete">
  <p class="recette__date">${ilYA(r.date)}</p>
  <h1 class="recette__titre">${esc(r.titre)}</h1>
  ${r.sousTitre ? `<p class="recette__sous-titre">${esc(r.sousTitre)}</p>` : ""}
  <ul class="flex flex-wrap items-center gap-x-3 mt-10">${tagsHtml(r.tags)}</ul>
</header>
<div class="recette__grille">
  <aside class="recette__colonne">
    ${entete("Infos")}
    <dl class="recette__infos">${infosHtml(1)}</dl>
    ${entete("Ingrédients")}
    ${quantites}
    <ul class="recette__ingredients">${ingredientsHtml(1)}</ul>
  </aside>
  <div class="recette__article">
    ${entete("Préparation")}
    <div class="recette__corps">
      ${preparation}
    </div>
  </div>
</div>
<p class="recette__retour"><a href="${ACCUEIL}">← Toutes les recettes</a></p>`;

    conteneur.querySelector(".recette__quantites")?.addEventListener("click", (e) => {
      const bouton = e.target.closest("button[data-facteur]");
      if (!bouton) return;
      const facteur = Number(bouton.dataset.facteur);
      conteneur.querySelectorAll("[data-facteur]").forEach((b) => {
        const actif = b === bouton;
        b.classList.toggle("tag--filter-active", actif);
        b.classList.toggle("tag--filter-inactive", !actif);
        b.setAttribute("aria-pressed", actif);
      });
      conteneur.querySelector(".recette__infos").innerHTML = infosHtml(facteur);
      conteneur.querySelector(".recette__ingredients").innerHTML = ingredientsHtml(facteur);
    });
  }

  const page = document.body.dataset.page;
  if (page === "accueil") initAccueil();
  else if (page === "liste") initListe();
  else if (page === "recette") initRecette();
})();
