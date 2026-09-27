/*
 * Données du carnet de recettes.
 *
 * Tout le site (accueil, index A–Z, pages recettes) est généré à partir de ce fichier.
 * Pour ajouter une recette : copier le modèle en bas de fichier dans RECETTES.
 *
 * Les dates sont au format AAAA-MM-JJ ; le site affiche « il y a 2 jours » tout seul.
 * Les tags d'une recette doivent exister dans TAGS (sinon ils ne sont pas filtrables).
 */

const TAGS = [
  { famille: "Type de plat", tags: ["Petit-déj", "Apéro", "Plat", "Dessert", "Brunch", "Boulangerie", "Boisson"] },
  { famille: "Régime", tags: ["Végan", "Végétarien", "Sans gluten", "Sans lactose"] },
  { famille: "Occasion", tags: ["Fêtes", "Pique-nique", "Halloween", "Batch", "Presque rien"] },
  { famille: "Saison", tags: ["Printemps", "Été", "Automne", "Hiver"] },
  { famille: "Durée", tags: ["10 min", "30 min", "1 h", "2 h"] },
];

const RECETTES = [
  {
    id: "cookies-pepites-chocolat",
    titre: "Cookies aux pépites de chocolat",
    sousTitre:
      "C'est le classique indémodable qui nous met l'eau à la bouche. Ils ont le pouvoir de réconforter et de ravir nos papilles à chaque bouchée.",
    date: "2026-09-27",
    tags: ["Dessert", "Végan", "30 min", "Sans lactose"],
    infos: [
      ["Préparation", "15 minutes"],
      ["Cuisson", "11 minutes"],
      ["Méthode de cuisson", "Four"],
      ["Portions", "8 cookies"],
    ],
    ingredients: [
      "60 g de sucre",
      "100 g de sucre brun",
      "100 g d’huile de coco fondue",
      "80 ml d’aquafaba (le liquide de cuisson des pois chiches)",
      "250 g de farine de blé",
      "1 c. de levure chimique",
      "100 g de chocolat en tablette",
      "Gros sel",
    ],
    etapes: [
      "Préchauffer le four à 180 °C et hacher grossièrement la tablette de chocolat en gros morceaux.",
      "Dans un grand saladier, fouetter l’aquafaba, le sucre, le sucre roux et l’huile de coco fondue.",
      "Ajouter la farine et la levure chimique. Bien mélanger jusqu’à former une pâte, puis ajouter les morceaux de chocolat. Réserver 15 à 30 minutes au frigo pour laisser la pâte se raffermir.",
      "Former des petites boules bien hautes et les déposer sur la plaque du four recouverte d’un tapis de cuisson ou de papier sulfurisé. Enfourner 11 minutes.",
      "À la sortie du four, saupoudrer de gros sel et laisser complètement refroidir avant de déguster.",
    ],
    faq: [
      {
        question: "Comment réussir cette recette sans gluten ?",
        reponse:
          "Utilisez la même quantité de farine, et privilégiez un mélange de farine sans gluten à base de farines de riz, maïs et pomme de terre comme ce produit, avec lequel ce sera un succès.",
      },
      {
        question: "Comment préparer soi-même un mix de farine sans gluten ?",
        reponse:
          "Il existe plusieurs façons de préparer soi-même un mix de farines sans gluten, voici ma recette préférée en cliquant ici. Avec ce mélange, je réussis à tous les coups mes recettes sans gluten, et il remplace très bien une farine classique !",
      },
      {
        question: "Comment conserver ces cookies ?",
        reponse:
          "Ces cookies se conservent jusqu’à cinq jours à température ambiante dans une boîte hermétique. Assurez-vous de les conserver dans un endroit frais et sec pour préserver leur fraîcheur et leur texture.",
      },
    ],
  },
  {
    id: "solace-general-store",
    titre: "Solace General Store",
    sousTitre:
      "Une petite collection en perpétuel renouvellement d'objets de saison et d'art de vivre. Fabriqués à la main au Nouveau-Mexique.",
    date: "2026-09-25",
    tags: ["Soins & bien-être"],
    image: [
      ["recettes_files/images/solacegeneralstore.com_.png_003.webp", 335],
      ["recettes_files/images/solacegeneralstore.com_.png_002.webp", 352],
      ["recettes_files/images/solacegeneralstore.com_.png_007.webp", 528],
      ["recettes_files/images/solacegeneralstore.com_.png_009.webp", 539],
      ["recettes_files/images/solacegeneralstore.com_.png_004.webp", 670],
      ["recettes_files/images/solacegeneralstore.com_.png.webp", 704],
      ["recettes_files/images/solacegeneralstore.com_.png_005.webp", 809],
      ["recettes_files/images/solacegeneralstore.com_.png_006.webp", 1005],
      ["recettes_files/images/solacegeneralstore.com_.png_008.webp", 1078],
    ],
    alt: "Solace General Store",
    lien: "https://solacegeneralstore.com/",
  },
  {
    id: "kawa",
    titre: "Kawa",
    sousTitre: "Sacs et équipements de vélo en petites séries, conçus et fabriqués par une seule paire de mains.",
    date: "2026-09-22",
    tags: ["Sacs", "Sport"],
    image: [
      ["recettes_files/images/kawadesign.us_.png_003.webp", 335],
      ["recettes_files/images/kawadesign.us_.png_007.webp", 352],
      ["recettes_files/images/kawadesign.us_.png_004.webp", 528],
      ["recettes_files/images/kawadesign.us_.png_009.webp", 539],
      ["recettes_files/images/kawadesign.us_.png_002.webp", 670],
      ["recettes_files/images/kawadesign.us_.png_006.webp", 704],
      ["recettes_files/images/kawadesign.us_.png.webp", 809],
      ["recettes_files/images/kawadesign.us_.png_005.webp", 1005],
      ["recettes_files/images/kawadesign.us_.png_008.webp", 1078],
    ],
    alt: "Kawa Designs",
    lien: "https://kawadesign.us/",
  },
  {
    id: "mission-workshop",
    titre: "Mission Workshop",
    sousTitre:
      "Sacs à dos techniques fabriqués à San Francisco, ainsi que quelques autres pièces choisies fabriquées sur place.",
    date: "2026-09-20",
    tags: ["Hauts", "Bas", "Vêtements d'extérieur", "Sacs"],
    image: [
      ["recettes_files/images/missionworkshop.com_.png_002.webp", 335],
      ["recettes_files/images/missionworkshop.com_.png_005.webp", 352],
      ["recettes_files/images/missionworkshop.com_.png_004.webp", 528],
      ["recettes_files/images/missionworkshop.com_.png_007.webp", 539],
      ["recettes_files/images/missionworkshop.com_.png_006.webp", 670],
      ["recettes_files/images/missionworkshop.com_.png_003.webp", 704],
      ["recettes_files/images/missionworkshop.com_.png.webp", 809],
      ["recettes_files/images/missionworkshop.com_.png_009.webp", 1005],
      ["recettes_files/images/missionworkshop.com_.png_008.webp", 1078],
    ],
    alt: "Mission Workshop",
    lien: "https://missionworkshop.com/",
  },
  {
    id: "ballard-new-york",
    titre: "Ballard New York",
    sousTitre: "Utilité + raffinement. Ballard propose une petite sélection de vêtements et accessoires pour homme.",
    date: "2026-09-19",
    tags: ["Hauts", "Bas", "Portefeuilles", "Chapeaux"],
    image: [
      ["recettes_files/images/ballardnewyork.com_.png_008.webp", 335],
      ["recettes_files/images/ballardnewyork.com_.png_007.webp", 352],
      ["recettes_files/images/ballardnewyork.com_.png_006.webp", 528],
      ["recettes_files/images/ballardnewyork.com_.png_002.webp", 539],
      ["recettes_files/images/ballardnewyork.com_.png_003.webp", 670],
      ["recettes_files/images/ballardnewyork.com_.png_005.webp", 704],
      ["recettes_files/images/ballardnewyork.com_.png_004.webp", 809],
      ["recettes_files/images/ballardnewyork.com_.png.webp", 1005],
      ["recettes_files/images/ballardnewyork.com_.png_009.webp", 1078],
    ],
    alt: "Ballard New York",
    lien: "https://ballardnewyork.com/",
  },
  {
    id: "tin-duck",
    titre: "Tin Duck",
    sousTitre:
      "Un petit atelier de couture qui fabrique des vêtements d'extérieur et des articles textiles durables et de grande qualité. Conçus, coupés et cousus à Olympia, dans l'État de Washington.",
    date: "2026-09-19",
    tags: ["Vêtements d'extérieur", "Denim", "Sacs"],
    image: [
      ["recettes_files/images/tinduckdenim.com_.png_009.webp", 335],
      ["recettes_files/images/tinduckdenim.com_.png_002.webp", 352],
      ["recettes_files/images/tinduckdenim.com_.png_007.webp", 528],
      ["recettes_files/images/tinduckdenim.com_.png_004.webp", 539],
      ["recettes_files/images/tinduckdenim.com_.png_003.webp", 670],
      ["recettes_files/images/tinduckdenim.com_.png_005.webp", 704],
      ["recettes_files/images/tinduckdenim.com_.png_008.webp", 809],
      ["recettes_files/images/tinduckdenim.com_.png_006.webp", 1005],
      ["recettes_files/images/tinduckdenim.com_.png.webp", 1078],
    ],
    alt: "Tin Duck",
    lien: "https://tinduckdenim.com/",
  },
  {
    id: "pagani-clothes",
    titre: "Pagani Clothes",
    sousTitre: "Du vieux cousu dans du plus vieux encore. Fabriqué à Brooklyn, New York.",
    date: "2026-09-12",
    tags: ["Hauts", "Bas", "Vêtements d'extérieur", "Sacs"],
    image: [
      ["recettes_files/images/paganiclothes.com_.png_005.webp", 335],
      ["recettes_files/images/paganiclothes.com_.png_004.webp", 352],
      ["recettes_files/images/paganiclothes.com_.png_008.webp", 528],
      ["recettes_files/images/paganiclothes.com_.png_002.webp", 539],
      ["recettes_files/images/paganiclothes.com_.png_006.webp", 670],
      ["recettes_files/images/paganiclothes.com_.png_003.webp", 704],
      ["recettes_files/images/paganiclothes.com_.png.webp", 809],
      ["recettes_files/images/paganiclothes.com_.png_007.webp", 1005],
      ["recettes_files/images/paganiclothes.com_.png_009.webp", 1078],
    ],
    alt: "Pagani Clothes",
    lien: "https://paganiclothes.com/",
  },
];

/*
 * Modèle de recette complète (tous les champs sauf id, titre et date sont facultatifs) :
 *
 * {
 *   id: "taboule-de-teta",                  // unique, sans espaces ni accents : sert d'adresse de la page
 *   titre: "Taboulé de Teta",
 *   sousTitre: "Le taboulé de ma grand-mère, beaucoup de persil, très peu de boulgour.",
 *   date: "2026-09-26",
 *   tags: ["Plat", "Végan", "Été", "30 min"],     // choisis parmi les tags de TAGS, en haut du fichier
 *   art: "ronds",                            // forme du dessin : "traits", "ronds", "rayons", "petales", "feuillage" ou "vague" (sinon tirée au hasard)
 *   infos: [                                // colonne « Infos » : autant de lignes que voulu, dans cet ordre
 *     ["Préparation", "30 minutes"],
 *     ["Cuisson", "Sans cuisson"],
 *     ["Portions", "4 personnes"],
 *   ],
 *   histoire: [                             // début de la « Préparation »
 *     "Premier paragraphe : d'où vient la recette, qui me l'a transmise…",
 *     "Deuxième paragraphe…",
 *   ],
 *   ingredients: ["3 bottes de persil plat", "1 botte de menthe", "2 tomates", "…"],
 *   etapes: ["Laver et sécher les herbes.", "Les ciseler finement.", "…"],
 *   faq: [                                  // « Questions fréquentes », en fin de préparation
 *     { question: "Peut-on le préparer la veille ?", reponse: "Oui, …" },
 *   ],
 *   lien: "https://…",                      // source ou inspiration, facultatif
 * },
 */
