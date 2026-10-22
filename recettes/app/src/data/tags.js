/*
 * Tags du carnet, par famille. Les recettes elles-mêmes sont dans Supabase (table recettes).
 * Ajouter un tag ici le rend disponible dans les filtres et dans le formulaire.
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
