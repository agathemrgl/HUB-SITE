# Reconstruire l'app Notes dans Kermimi

## Contexte

J'ai une app de notes perso, un clone d'Apple Notes, qui tourne aujourd'hui hors de Kermimi : React 19 + Vite + TipTap v3 + Zustand + Tailwind v4 + lucide-react, données dans Supabase, servie en statique sur GitHub Pages. Je veux la **reconstruire dans Kermimi avec exactement les mêmes fonctionnalités et le même comportement**, mais :

- **avec le design system de Kermimi** (composants, tokens, typo, couleurs, icônes, espacements). Ne reprends **pas** le style visuel de l'ancienne app : ni sa palette bleue, ni la typo Amiamie, ni ses tailles de police. Ce document décrit la **structure et le comportement**, à habiller avec ce qui existe déjà dans Kermimi ;
- **avec l'architecture Kermimi** : un back maison qui parle à sa propre base Postgres sur le réseau Docker privé, l'utilisateur identifié par l'en-tête `Remote-User` posé par VoidAuth via Caddy, comme le Drive ;
- **en restant compatible avec les données importées** (voir le prompt d'import, déjà traité ou en cours dans une autre session). Le schéma de la base et le HTML des notes sont imposés par cet import.

Avant de coder, lis le design system, l'app Drive (pour la stack, les conventions et l'intégration dans le bureau Kermimi) et `packages/auth`, puis propose-moi un plan : arborescence, endpoints API, composants, ce que tu réutilises du design system. **Attends ma validation avant d'implémenter.**

## À ne pas reprendre de l'ancienne app

- Toute l'authentification Supabase : écran de login email/mot de passe, session, `onAuthStateChange`. Dans Kermimi, l'utilisateur est déjà authentifié quand la requête arrive.
- Les accès directs du navigateur à la base. Tout passe désormais par l'API de l'app, qui filtre **chaque** requête sur `Remote-User`, y compris les update et delete par id.
- Les migrations historiques (localStorage → IndexedDB → Supabase), Dexie, et l'astuce de build GitHub Pages.
- La palette et la typo.

## Modèle de données (imposé par l'import)

- **Note** : `id` (texte, généré côté client ou serveur, préfixe `n` + horodatage + hasard dans l'ancienne app ; un UUID convient pour les nouvelles notes tant que la colonne reste en `text`), `content` (HTML TipTap), `preview` (texte brut, 500 caractères max, recalculé à **chaque** sauvegarde), `created_at`, `updated_at`, `pinned`, `locked`, `folder_id` (nullable), `deleted`, `deleted_at`, `apple_id` (nullable).
- **Folder** : `id`, `name`, `parent_id` (inutilisé), `position`, `expanded` (inutilisé).
- **Préférences par utilisateur** : `sort_key` (`updated` | `created` | `title`), `passcode`, `last_folder_id` (un id de dossier, ou `'all'` ou `'trash'`).
- Pas de `user_id` côté client : le serveur le déduit de `Remote-User`.

## Disposition

### Desktop (≥ 768 px) : 3 colonnes côte à côte, plein écran

1. **Barre des dossiers** (~220 px, masquable) :
   - en-tête « Dossiers » avec un bouton **+** (nouveau dossier) ;
   - « **Toutes les notes** » (icône note) avec le nombre de notes non supprimées ;
   - la liste des dossiers dans l'ordre `position`, chacun avec son nombre de notes (le compteur est masqué s'il vaut 0) ;
   - un séparateur, puis « **Récemment supprimées** » (icône corbeille, teinte « danger ») avec son nombre ;
   - un séparateur, puis un bouton « Importer depuis Apple Notes » (voir plus bas) ;
   - l'élément actif est surligné.
2. **Liste des notes** (~300 px) :
   - barre d'en-tête collante : bouton pour masquer ou afficher la barre des dossiers, champ **Rechercher**, bouton **Trier** (menu : Date de modification / Date de création / Titre, avec une coche sur l'option active), bouton **Nouvelle note** ;
   - section « **Épinglées** » (titre de section dans une couleur d'accent dédiée) si au moins une note est épinglée, puis une section « Notes » pour le reste. Le titre « Notes » n'apparaît que si la section Épinglées existe. Il n'y a pas de section Épinglées dans la corbeille ;
   - chaque élément affiche le **titre** (première ligne non vide du texte, ou « Nouvelle note »), précédé d'un cadenas si la note est verrouillée. En dessous : la **date** (heure si c'est aujourd'hui, « Hier », sinon « 12 mars », avec l'année si elle diffère ; dans la corbeille, c'est la date de suppression) et l'**extrait** (lignes suivantes jointes, tronqué) ;
   - la note ouverte est surlignée ;
   - états vides : « Aucune note », « Corbeille vide », « Aucun résultat » (pendant une recherche).
3. **Éditeur** (reste de la largeur) :
   - barre d'outils collante :
     - à gauche : **Aa** (panneau de format), **liste à cocher**, **tableau** (insère un tableau 3×3 sans ligne d'en-tête), **photo** (sélecteur de fichiers image, multiple) ;
     - à droite : **cadenas** (verrouiller / déverrouiller), **Partager**, **⋯** (ouvre le menu contextuel de la note sous le bouton) ;
   - au-dessus du texte, centrée : la date complète de dernière modification (« 12 mars 2026 à 14:05 ») ;
   - zone de texte d'environ 700 px de large maximum, avec le placeholder « Nouvelle note » ;
   - sans note sélectionnée : « Sélectionne une note, ou crée-en une nouvelle. ».

### Mobile (< 768 px) : un écran à la fois, comme Notes sur iOS

- Navigation **Dossiers → Notes → Éditeur**. Au lancement, l'app s'ouvre directement sur l'écran **Notes** du dernier dossier ouvert.
- La liste a un bouton retour « ‹ Dossiers » à la place du bouton qui masque la barre latérale. L'éditeur a un bouton retour « ‹ <nom du dossier courant> ».
- **Glisser depuis le bord gauche** (24 px depuis le bord, au moins 80 px vers la droite, geste annulé si le doigt dérive verticalement) = retour à l'écran précédent.
- **Appui long** (500 ms, annulé si le doigt bouge de plus de 10 px) sur une note = menu contextuel, sans ouvrir la note.
- Tailles de texte et d'icônes un peu plus grandes qu'en desktop, à adapter au design system. Les champs font au moins 16 px pour éviter le zoom automatique d'iOS.
- Ouvrir une note, en créer une ou en dupliquer une bascule sur l'éditeur. Supprimer une note renvoie à la liste.

## Fonctionnalités et règles de comportement

### Chargement

- Au démarrage, ne charger que la **liste allégée** des notes (toutes les colonnes **sauf `content`**), les dossiers et les préférences. Le `content` d'une note n'est chargé **qu'à son ouverture**, avec l'état « Chargement… » dans l'éditeur. C'est indispensable : certaines notes pèsent plusieurs Mo à cause des images en base64.
- Rouvrir le **dernier dossier** consulté (`last_folder_id`, persisté à chaque changement), et sélectionner la note non supprimée la plus récemment modifiée.
- En cas d'échec du chargement : « Impossible de charger tes notes. » avec un bouton « Réessayer ». Au bout de 45 s, on bascule sur l'erreur plutôt que de laisser un chargement infini.
- Au lancement, **purger** les notes dans la corbeille depuis plus de **30 jours**.

### Édition

- Éditeur **TipTap v3**. Il faut le même jeu d'extensions pour relire le HTML importé sans perte :
  - `StarterKit` avec `link: { openOnClick: false, autolink: true }` (inclut déjà Underline et Link : ne pas les rajouter) ;
  - `TaskList` + `TaskItem` (`nested: false`) ;
  - `TableKit` (`table: { resizable: false }`) ;
  - `Image` ;
  - `Placeholder` (« Nouvelle note »).
- **Sauvegarde automatique** 300 ms après la dernière frappe (debounce) : `content` + `preview` recalculé + `updated_at = now`. Pas de bouton Enregistrer.
- **Ne jamais perdre les dernières frappes** : en changeant de note, en verrouillant ou en dupliquant, vider d'abord la sauvegarde en attente avec le contenu actuel de l'éditeur, avant de charger autre chose.
- Une note **vide** qu'on quitte (aucun texte) est supprimée silencieusement, comme dans Apple Notes.
- Si le HTML d'une note ne peut pas être affiché, afficher « ⚠️ Le contenu de cette note n'a pas pu être affiché (import corrompu). » sans planter l'app et **sans réécrire** la note en base.
- Calcul de `preview` : ajouter un saut de ligne après chaque `</p> </div> </hN> </li> </blockquote> </tr> </pre>` et `<br>`, retirer les balises, remplacer les espaces insécables, tronquer à 500 caractères. Le **titre** est la première ligne non vide, l'**extrait** les lignes suivantes jointes par des espaces.

### Mise en forme

- **Panneau « Aa »** (menu déroulant) :
  - une ligne de 4 boutons : **Gras**, *Italique*, Souligné, ~~Barré~~ ;
  - les styles de bloc : **Titre** (h1), **Sous-titre** (h2), **Titre secondaire** (h3), **Corps** (paragraphe), **Monostyle** (bloc de code), avec une coche sur le style actif, chaque libellé étant affiché dans son propre style ;
  - en bas : « Bloc de citation » (blockquote).
- **Barre flottante sur sélection** (BubbleMenu, visible seulement si la sélection n'est pas vide) : gras, italique, souligné, barré, liste à puces.
- **Liste à cocher** : une tâche cochée est barrée et grisée.
- **Images** : insérées en data URI base64 (comportement actuel). Si le Drive Kermimi permet de stocker des fichiers facilement, propose-moi plutôt d'y envoyer les nouvelles images et d'insérer une URL. Mais l'éditeur doit continuer à afficher les images base64 existantes.
- **Rendu** : liens soulignés en couleur de lien, tableaux à bordures fines avec cellules de 60 px minimum, images à 100 % de largeur maximum avec coins arrondis, citations avec une barre à gauche et du texte secondaire, blocs de code en police mono avec un fond léger et retour à la ligne.

### Liste, recherche, tri

- Vues : « Toutes les notes » (toutes les notes non supprimées, quel que soit le dossier), un dossier (notes non supprimées de ce dossier), « Récemment supprimées ».
- **Recherche** instantanée, insensible à la casse, sur le titre et l'extrait (pas sur tout le contenu). Les notes verrouillées non déverrouillées sont exclues des résultats, puisque leur titre est masqué.
- **Tri** persisté par utilisateur : modification (récent en premier), création (récent en premier), titre (ordre alphabétique selon la locale `fr`).
- Notes épinglées toujours en tête, dans leur propre section.

### Menu contextuel d'une note

Il s'ouvre par clic droit (desktop), appui long (mobile) ou le bouton ⋯ de l'éditeur. Il se repositionne pour rester dans l'écran et se ferme sur un clic extérieur ou sur Échap.

- **Note normale :**
  - Épingler / Détacher la note ;
  - Verrouiller / Déverrouiller la note ;
  - Nouvelle note ;
  - Dupliquer la note (charge le contenu si besoin ; la copie est non épinglée, non verrouillée et devient la note ouverte) ;
  - Partager la note (désactivé si la note est verrouillée et pas déverrouillée) ;
  - Déplacer vers ›, un sous-menu avec « Toutes les notes » (retire le dossier) et la liste des dossiers, le choix actuel en gras avec une coche ;
  - Supprimer (en couleur danger) : déplace la note dans « Récemment supprimées », la détache et enregistre `deleted_at`.
- **Note dans la corbeille :** Récupérer ; Supprimer définitivement (danger).
- L'ancien menu avait un item « Ouvrir la note dans une nouvelle fenêtre » qui ne faisait rien. Ne le reprends pas, sauf si une ouverture en fenêtre séparée a du sens dans le bureau Kermimi : dans ce cas, propose-le.

### Dossiers

- Créer : demande un nom (ignoré s'il est vide). Le nouveau dossier est ajouté en fin de liste et ouvert immédiatement. Une nouvelle note créée dans un dossier y est rangée. Créée depuis « Toutes les notes » ou la corbeille, elle n'a pas de dossier.
- Supprimer : ancien comportement, par clic droit sur le dossier avec la confirmation « Supprimer le dossier "X" ? Les notes qu'il contient retourneront dans "Toutes les notes". ». Les notes ne sont **pas** supprimées : leur `folder_id` repasse à `null`. Si c'était le dossier courant, on revient à « Toutes les notes ».
- Renommer : la logique existait mais n'avait pas d'interface. Ajoute-la (menu contextuel du dossier : Renommer / Supprimer), ce qui rend aussi la suppression accessible au tactile.
- Pas de sous-dossiers dans l'interface (`parent_id` est inutilisé) : ne les implémente pas, mais garde la colonne.

### Verrouillage

- Un **code unique** par utilisateur (4 caractères minimum, demandé deux fois pour confirmation) est créé au premier verrouillage. Il s'applique ensuite à toutes les notes verrouillées.
- Une note verrouillée et pas encore déverrouillée affiche un cadenas et le titre « Note verrouillée » dans la liste, sans extrait. Dans l'éditeur, elle affiche un grand cadenas, « Cette note est verrouillée » et un bouton « Déverrouiller la note ». Ses actions d'édition et le partage sont désactivés.
- Le déverrouillage vaut **pour la session** (en mémoire). Reverrouiller une note annule son déverrouillage.
- Amélioration attendue par rapport à l'ancienne app, où le code était en clair et comparé dans le navigateur : vérifier le code **côté serveur** contre un hash, et ne pas envoyer le `content` d'une note verrouillée tant qu'elle n'a pas été déverrouillée. Propose le mécanisme. Le chiffrement du contenu n'est pas demandé.
- Les `prompt()`/`alert()`/`confirm()` natifs de l'ancienne app sont à remplacer par les dialogues du design system.

### Partage

- Utiliser l'API **Web Share** (`navigator.share`) avec comme titre la première ligne et comme texte le contenu en texte brut. Si elle n'est pas disponible, copier le texte dans le presse-papiers et afficher une confirmation.

### Raccourcis clavier

- **⌘/Ctrl + N** : nouvelle note.
- **⌘/Ctrl + F** : focus sur le champ de recherche.
- Échap ferme les menus.
- Vérifie que ces raccourcis n'entrent pas en conflit avec ceux du bureau Kermimi.

### Import Apple Notes (à garder, en fonctionnalité secondaire)

Le bouton « Importer depuis Apple Notes » charge un fichier JSON produit par un script JXA (`osascript`), sous la forme `[{ appleId, name, body, folder, createdAt, updatedAt, attachmentCount }]`. Le traitement :

- ignorer les éléments sans `appleId` ou déjà importés, la déduplication se faisant sur `apple_id` (ré-import idempotent) ;
- créer les dossiers manquants à partir de leur nom ;
- convertir le `body` (HTML de Notes.app) en HTML TipTap :
  - extraire le contenu du `<body>` s'il s'agit d'un document complet ;
  - chaque `<div>` devient un `<p>` ; un `<div>` vide ou ne contenant qu'un `<br>` devient un `<p>` vide ;
  - un `<div>` qui ne contient qu'un `<h1>`–`<h6>` donne ce titre seul ;
  - `<ul>`, `<ol>` et `<table>` sont conservés tels quels ;
  - un nœud texte isolé est encapsulé dans un `<p>` ;
- conserver les dates d'origine ;
- en fin d'import, afficher le résumé : nombre de notes importées, de notes ignorées, et la liste des notes dont les pièces jointes n'ont pas pu être reprises.

C'est la moins prioritaire des fonctionnalités : propose-la en dernier.

## Intégration Kermimi

- Respecte la façon dont les autres apps s'intègrent au bureau Kermimi (fenêtre, icône, routes, manifest éventuel). L'ancienne app était une PWA installable (icône écran d'accueil, `display: standalone`) : dis-moi si Kermimi a un équivalent.
- Mode sombre : l'ancienne app suivait le thème système. Suis la convention du design system.
- Aucune donnée d'une autre personne ne doit jamais être visible ni modifiable : chaque endpoint filtre sur `Remote-User` et refuse la requête si l'en-tête est absent.

## Livrables attendus

1. Le plan (stack, arborescence, schéma d'API, mapping vers les composants du design system), **avant tout code**.
2. L'implémentation, par étapes que je peux tester. Je propose cet ordre : liste et lecture, puis édition et sauvegarde automatique, puis dossiers, corbeille, tri et recherche, puis épingler, verrouiller, partager et dupliquer, puis le mobile, puis l'import Apple.
3. Une checklist de recette qui reprend chaque règle de ce document, à cocher une fois les données réelles importées.
