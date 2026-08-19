# agathe.space

Le hub personnel d'Agathe Margely — designer. Faire des choses fonctionnelles.

**→ [agathe.space](https://agathe.space)**

Une page centrale qui regroupe mes sites, mes CV et mes prototypes. Chacun a son univers, sa palette, sa police — mais tous partagent la même idée : du fonctionnel, bien fait, avec un peu de caractère.

## Ce qu'il y a dedans

- **[Portfolio](https://portfolio.agathe.space)** — mon travail de direction artistique et de design graphique : identités de marque, événementiel, projets digitaux.
- **[Bibliopée](https://biblio.agathe.space)** — un carnet de lecture et de correspondance, entre art, design et philosophie.
- **[Armoire](/armoire/)** — un prototype de garde-robe interactive : composer une tenue en glissant-déposant ses vêtements sur un plateau.
- **[Notes](/notes/)** — un clone d'Apple Notes fait maison : dossiers, formatage riche, checklists, verrouillage, import direct depuis Notes.app.

## Stack

L'essentiel du site est en HTML/CSS/JS pur, sans étape de build — on édite un fichier, on pousse, c'est en ligne.

Seule l'app **Notes** fait exception : c'est une vraie application React (Vite + TipTap + Dexie/IndexedDB), dont le build est régénéré dans `/notes` à chaque changement. Voir [`notes-app/README.md`](notes-app/README.md) pour le détail du workflow.

## Déploiement

Hébergé sur GitHub Pages, déploiement direct depuis la branche `main` — aucun build ne tourne côté hébergeur, ce qui compile est ce qui est servi.
