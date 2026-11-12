# Import des notes existantes dans l'app Notes de Kermimi

## Contexte

J'ai une app de notes perso (clone d'Apple Notes) qui tourne aujourd'hui en dehors de Kermimi : front React + TipTap, données dans **Supabase** (Postgres hébergé), authentification Supabase par email/mot de passe, isolation des utilisateurs par RLS (`auth.uid() = user_id`).

Je veux migrer **toutes mes notes et tous mes dossiers, à l'identique**, dans l'app Notes de Kermimi. J'ai une sauvegarde complète au format JSON (décrite plus bas). Ta mission dans cette session : **inspecter l'existant côté Kermimi, me proposer un plan d'import, puis écrire le script d'import**. La reconstruction de l'interface fait l'objet d'un autre prompt. Ici, seulement les données et ce qu'il faut côté base et serveur pour les recevoir.

**Ne lance aucun import et ne modifie aucune base existante avant que j'aie validé ton plan.**

## Étape 1 : ce que tu dois vérifier dans le dépôt avant tout

Ce que je sais de Kermimi vient d'échanges passés et a pu évoluer. Vérifie et dis-moi ce qui diffère :

1. **`packages/auth`** : le type `User` et la lecture des en-têtes `Remote-*` posés par VoidAuth via Caddy (`Remote-User`, `Remote-Email`, `Remote-Name`, `Remote-Groups`). Je veux savoir :
   - comment une app maison récupère l'utilisateur courant (helper, middleware ?) ;
   - ce qui se passe si l'en-tête est absent (401 ? exception ?) ;
   - si `Remote-User` est bien la clé stable à utiliser comme propriétaire des données. D'après moi, oui : c'est le nom d'utilisateur, non modifiable dans VoidAuth.
2. **Le `docker-compose.yml` de core** (et ceux des autres apps) :
   - existe-t-il déjà un service Postgres pour les notes, une app `notes`, une maquette ? La dernière fois, Notes n'était qu'une maquette et le plan était d'ajouter un Postgres dédié à côté de `core-db` et de la base du Drive ;
   - sur quel réseau Docker privé chaque app et sa base sont branchées ;
   - **le conteneur de l'app n'est joignable que par Caddy** : c'est indispensable, sinon n'importe qui peut forger `Remote-User`.
3. **L'app Drive**, qui sert de référence : même modèle (filtre sur `Remote-User` dans chaque requête SQL). Regarde sa stack (runtime, framework HTTP, client Postgres, outil de migrations, structure des dossiers) pour que Notes suive exactement les mêmes conventions.
4. **Ce qui existe déjà pour Notes** : code, schéma, migrations, données de test. Si une maquette a déjà un schéma, dis-moi en quoi il diffère de ce qui suit.

Fais-moi un compte rendu court de ces 4 points avant de passer à la suite.

## Étape 2 : le format de la sauvegarde

Fichier `notes-backup.json` (accompagné d'un `manifest.json` avec les compteurs attendus et le SHA-256 du JSON) :

```jsonc
{
  "format": "hub-notes-supabase-backup",
  "format_version": 1,
  "exported_at": "2026-…",
  "source": { "supabase_project": "…", "user_id": "<uuid Supabase>", "email": "<email du compte>" },
  "conventions": { … },
  "folders":    [ /* lignes brutes de la table folders */ ],
  "notes_meta": { /* la ligne notes_meta de l'utilisatrice, ou null */ },
  "notes":      [ /* lignes brutes de la table notes, content compris */ ]
}
```

Les lignes sont exportées **telles quelles** (noms de colonnes snake_case, valeurs brutes) :

**`notes`**

| colonne | type | sens |
|---|---|---|
| `id` | text | id maison, ex. `n17271234567890a3f9c…` (préfixe `n` + `Date.now()` + hex aléatoire). **Pas un UUID.** |
| `user_id` | uuid | propriétaire côté Supabase |
| `content` | text | **HTML produit par TipTap v3** (voir plus bas). Peut être vide `''`. |
| `preview` | text | 500 premiers caractères du texte brut. Donnée dérivée de `content`, recalculable. |
| `created_at`, `updated_at` | bigint | **millisecondes** depuis epoch |
| `deleted_at` | bigint, nullable | millisecondes ; renseigné seulement si `deleted = true` |
| `pinned`, `locked`, `deleted` | boolean | épinglée / verrouillée par code / dans « Récemment supprimées » |
| `folder_id` | text, nullable | id d'un `folders.id`. `null` = sans dossier (visible dans « Toutes les notes ») |
| `apple_id` | text, nullable | id d'origine Apple Notes (`x-coredata://…`) pour les notes importées de Notes.app ; sert à dédupliquer un futur ré-import Apple |

**`folders`**

| colonne | type | sens |
|---|---|---|
| `id` | text | id maison, ex. `f1727…` |
| `user_id` | uuid | propriétaire |
| `name` | text | nom affiché |
| `parent_id` | text, nullable | prévu pour des sous-dossiers, **pas utilisé par l'interface actuelle** (toujours `null` en pratique, à vérifier dans le fichier) |
| `position` | integer | ordre d'affichage dans la barre latérale |
| `expanded` | boolean | état replié/déplié (inutilisé tant qu'il n'y a pas de sous-dossiers) |

**`notes_meta`** (une ligne par utilisateur)

| colonne | type | sens |
|---|---|---|
| `user_id` | uuid | clé primaire |
| `sort_key` | text | `'updated'` \| `'created'` \| `'title'` : tri de la liste |
| `passcode` | text, nullable | code de verrouillage des notes `locked`, **stocké en clair** |
| `last_folder_id` | text, nullable | dernier dossier ouvert : un `folders.id`, ou les pseudo-dossiers `'all'` / `'trash'` |

Il n'y a **aucune clé étrangère** entre `notes.folder_id` / `folders.parent_id` / `notes_meta.last_folder_id` et `folders.id` : ce sont de simples chaînes. Un `folder_id` peut donc en théorie pointer vers un dossier qui n'existe plus. Détecte ces cas et rapporte-les. Ne les « répare » pas en silence (proposition : les rattacher à `null`, après mon accord).

## Étape 3 : points d'attention pour l'import

1. **Propriétaire : UUID Supabase → `Remote-User`.**
   - Correspondance par email : `source.email` du fichier ↔ `Remote-Email` du compte Kermimi. Il n'y a vraisemblablement qu'un seul compte (moi), mais vérifie-le en lisant les `user_id` distincts du fichier.
   - Le `user_id` cible est le **`Remote-User`** (texte), pas un UUID.
   - Garde l'ancien UUID dans une colonne `legacy_supabase_id` (nullable) sur `notes`, `folders` et `notes_meta`, pour la traçabilité pendant la transition.
   - L'import ne doit pas dépendre d'une requête HTTP authentifiée : le script prend le `Remote-User` cible en paramètre explicite.

2. **Plus de RLS, isolation dans le code.** Côté Supabase, l'isolation reposait sur RLS. L'ancien front faisait des `update … where id = ?` **sans** filtre utilisateur et comptait sur RLS. Dans Kermimi, **chaque** requête (select, update, delete, y compris par id) doit filtrer sur `user_id = <Remote-User>`. Le schéma doit le faciliter : clé primaire composite `(user_id, id)` ou `id` unique plus index sur `user_id`. Propose ce qui colle aux conventions du Drive.

3. **Garder les ids tels quels.** Les relations entre notes et dossiers et le dernier dossier ouvert reposent sur ces chaînes. Si les conventions Kermimi imposent d'autres ids, il faut une table de correspondance et réécrire `folder_id`, `parent_id` et `last_folder_id`. Je préfère garder les ids existants (`text`).

4. **Contenu HTML : copie à l'octet près.** `content` est du HTML TipTap v3 : `<p>`, `<h1>`–`<h3>`, `<strong>/<em>/<u>/<s>`, `<a>`, `<ul>/<ol>`, listes de tâches `<ul data-type="taskList"><li data-checked="true|false">…`, `<blockquote>`, `<pre><code>`, `<table>`, `<img src="data:image/…;base64,…">`. **Ne le transforme pas** : ni nettoyage, ni sanitisation destructive, ni conversion en Markdown. La nouvelle app utilisera le même éditeur et relira ce HTML tel quel. Si une sanitisation est requise côté Kermimi, elle se fait à l'affichage, pas au stockage.

5. **Images en base64 dans `content`.** C'est la cause des lenteurs actuelles : certaines notes pèsent plusieurs Mo, et le `manifest.json` donne `largest_note_bytes` et `notes_with_images`. À prévoir :
   - colonne `text` (pas de limite pratique en Postgres, mais attention aux limites de taille de corps HTTP si l'import passe par l'API) ;
   - import **par lots** dans une transaction, ou directement en SQL depuis un script sur le serveur ;
   - la colonne `preview` doit être conservée, car la liste ne charge jamais `content` ;
   - **option à me proposer, pas à faire d'office** : extraire les images vers le stockage de fichiers de Kermimi (le Drive ?) et les remplacer par des URLs. C'est un vrai gain, mais aussi un risque de perte. Si on le fait, ce sera dans un second temps, après un import fidèle.

6. **Dates.** Les timestamps sont en millisecondes (bigint). Soit tu gardes du `bigint` ms (le plus simple et fidèle, et le front actuel les manipule ainsi), soit tu convertis en `timestamptz` avec `to_timestamp(ms / 1000.0)` en gardant la précision à la milliseconde. Choisis selon les conventions du Drive et dis-moi lequel. Dans tous les cas, `updated_at` doit être conservé et **pas** écrasé par la date d'import, sinon le tri « date de modification » est perdu.

7. **Corbeille.** Importer aussi les notes `deleted = true` avec leur `deleted_at`. L'app purge automatiquement les notes supprimées depuis plus de 30 jours : si l'import a lieu longtemps après l'export, certaines seront purgées au premier lancement. Signale-moi combien sont concernées.

8. **Notes verrouillées.** `locked` est un simple masquage côté interface : le contenu n'est **pas chiffré**. `passcode` est en clair. Importe-le pour que je puisse déverrouiller ces notes. Propose de le stocker hashé (bcrypt/argon2) avec une vérification côté serveur, ce qui implique que le front ne compare plus le code lui-même.

9. **Idempotence.** Le script doit être rejouable sans créer de doublons : upsert sur `(user_id, id)`, ou refus explicite si des données existent déjà. Ajoute un mode `--dry-run` qui affiche ce qui serait importé, les anomalies et les compteurs, sans rien écrire.

10. **Vérification après import.** Comparer avec `manifest.json` : nombre de dossiers, de notes, de notes dans la corbeille, épinglées, verrouillées, sans dossier, avec images. Vérifier aussi, pour un échantillon d'une dizaine de notes (dont la plus lourde), que `content` est identique octet pour octet (comparer des hash). Et vérifier que `sha256(notes-backup.json)` correspond au manifest avant de commencer.

## Ce que j'attends de toi

1. Le compte rendu de l'étape 1.
2. Une proposition de schéma Postgres pour la base Notes de Kermimi (tables `notes`, `folders`, `notes_meta`, ou leur équivalent selon les conventions), compatible avec les points ci-dessus, et l'endroit où il vit (migration, service docker-compose, réseau).
3. Le script d'import (`--dry-run` par défaut), écrit dans la stack et avec les conventions du dépôt.
4. La procédure exacte pour le lancer sur le serveur et vérifier le résultat.

Attends ma validation entre 2 et 3, et avant toute exécution sur une vraie base.
