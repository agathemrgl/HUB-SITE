/*
 * Données du carnet de recettes (provisoire : passera dans Supabase à l’étape 3).
 *
 * Les dates sont au format AAAA-MM-JJ ; le site affiche « il y a 2 jours » tout seul.
 * Les tags d’une recette doivent exister dans TAGS (sinon ils ne sont pas filtrables).
 * Champs : voir MODELE_RECETTE.md. `art` : traits, ronds, rayons, petales, feuillage ou vague.
 */

export const TAGS = [
  {
    "famille": "Type de plat",
    "tags": [
      "Petit-déj",
      "Apéro",
      "Plat",
      "Dessert",
      "Brunch",
      "Boulangerie",
      "Boisson"
    ]
  },
  {
    "famille": "Régime",
    "tags": [
      "Végan",
      "Végétarien",
      "Sans gluten",
      "Sans lactose"
    ]
  },
  {
    "famille": "Occasion",
    "tags": [
      "Fêtes",
      "Pique-nique",
      "Halloween",
      "Batch",
      "Presque rien"
    ]
  },
  {
    "famille": "Saison",
    "tags": [
      "Printemps",
      "Été",
      "Automne",
      "Hiver"
    ]
  },
  {
    "famille": "Durée",
    "tags": [
      "10 min",
      "30 min",
      "1 h",
      "2 h"
    ]
  }
];

export const RECETTES = [
  {
    "id": "cookies-pepites-chocolat",
    "titre": "Cookies aux pépites de chocolat",
    "sousTitre": "C'est le classique indémodable qui nous met l'eau à la bouche. Ils ont le pouvoir de réconforter et de ravir nos papilles à chaque bouchée.",
    "date": "2026-09-27",
    "tags": [
      "Dessert",
      "Végan",
      "30 min",
      "Sans lactose"
    ],
    "infos": [
      [
        "Préparation",
        "15 minutes"
      ],
      [
        "Cuisson",
        "11 minutes"
      ],
      [
        "Méthode de cuisson",
        "Four"
      ],
      [
        "Portions",
        "8 cookies"
      ]
    ],
    "ingredients": [
      "60 g de sucre",
      "100 g de sucre brun",
      "100 g d’huile de coco fondue",
      "80 ml d’aquafaba (le liquide de cuisson des pois chiches)",
      "250 g de farine de blé",
      "1 c. de levure chimique",
      "100 g de chocolat en tablette",
      "Gros sel"
    ],
    "etapes": [
      "Préchauffer le four à 180 °C et hacher grossièrement la tablette de chocolat en gros morceaux.",
      "Dans un grand saladier, fouetter l’aquafaba, le sucre, le sucre roux et l’huile de coco fondue.",
      "Ajouter la farine et la levure chimique. Bien mélanger jusqu’à former une pâte, puis ajouter les morceaux de chocolat. Réserver 15 à 30 minutes au frigo pour laisser la pâte se raffermir.",
      "Former des petites boules bien hautes et les déposer sur la plaque du four recouverte d’un tapis de cuisson ou de papier sulfurisé. Enfourner 11 minutes.",
      "À la sortie du four, saupoudrer de gros sel et laisser complètement refroidir avant de déguster."
    ],
    "faq": [
      {
        "question": "Comment réussir cette recette sans gluten ?",
        "reponse": "Utilisez la même quantité de farine, et privilégiez un mélange de farine sans gluten à base de farines de riz, maïs et pomme de terre comme ce produit, avec lequel ce sera un succès."
      },
      {
        "question": "Comment préparer soi-même un mix de farine sans gluten ?",
        "reponse": "Il existe plusieurs façons de préparer soi-même un mix de farines sans gluten, voici ma recette préférée en cliquant ici. Avec ce mélange, je réussis à tous les coups mes recettes sans gluten, et il remplace très bien une farine classique !"
      },
      {
        "question": "Comment conserver ces cookies ?",
        "reponse": "Ces cookies se conservent jusqu’à cinq jours à température ambiante dans une boîte hermétique. Assurez-vous de les conserver dans un endroit frais et sec pour préserver leur fraîcheur et leur texture."
      }
    ]
  },
  {
    "id": "club-sandwich-thon-mayo-vegetarien",
    "titre": "Club sandwich comme un thon mayo !",
    "sousTitre": "Avec une garniture alternative gourmande, fraîche et riche en saveurs.",
    "date": "2026-09-28",
    "tags": [
      "Plat",
      "Végétarien",
      "Presque rien",
      "Printemps",
      "Été",
      "10 min"
    ],
    "art": "feuillage",
    "infos": [
      [
        "Préparation",
        "5 min"
      ],
      [
        "Cuisson",
        "5 min"
      ],
      [
        "Portions",
        "2 sandwiches"
      ]
    ],
    "histoire": [
      "Inspirée d’une recette américaine de « Smashed Chickpea Salad Sandwich », cette version revisite le célèbre sandwich thon-mayo en version végétarienne.",
      "L’autrice a adapté la recette avec des haricots blancs à la place des pois chiches et a ajouté citron et câpres pour retrouver les saveurs caractéristiques du thon-mayo."
    ],
    "ingredients": [
      "250 g de haricots blancs ou pois chiches égouttés",
      "2 cuillères à soupe de mayonnaise",
      "1 cuillère à café de moutarde",
      "1 échalote hachée",
      "1 cuillère à soupe de jus de citron",
      "1 cuillère à café de câpres hachées",
      "1 cuillère à café d’aneth haché",
      "1 cuillère à café de cornichons à l’américaine coupés en petits morceaux",
      "1 pincée de sel",
      "1 pincée de poivre",
      "1 pincée de piment",
      "Des crudités au choix (salade, tomate, graines germées, carottes râpées, concombre...)",
      "4 tranches de pain complet"
    ],
    "etapes": [
      "Rincer et égoutter les haricots blancs ou les pois chiches.",
      "Les écraser grossièrement à la fourchette ou au presse-purée en conservant quelques morceaux.",
      "Ajouter la mayonnaise, la moutarde, l’échalote, le jus de citron, les câpres, l’aneth et les cornichons.",
      "Mélanger puis ajuster l’assaisonnement avec le sel, le poivre et le piment.",
      "Faire griller les tranches de pain complet.",
      "Garnir le pain avec le mélange et les crudités de votre choix.",
      "Refermer les sandwiches et servir immédiatement."
    ],
    "faq": [
      {
        "question": "Puis-je utiliser des pois chiches à la place des haricots blancs ?",
        "reponse": "Oui, la recette fonctionne parfaitement avec des pois chiches et se rapproche davantage de la version originale américaine."
      },
      {
        "question": "Peut-on préparer la garniture à l’avance ?",
        "reponse": "Oui, le mélange peut être préparé plusieurs heures à l’avance et gagne même en saveur après repos au réfrigérateur."
      }
    ]
  }
];
