# Notes — source React

Source du clone Apple Notes du hub, en React + Vite + TipTap + Dexie (IndexedDB) + Tailwind + Zustand.

## Important : ce dossier n'est jamais servi directement

Le hub est déployé sur GitHub Pages en mode "Deploy from branch" : aucun build ne tourne côté hébergeur.
`npm run build` régénère directement le dossier `../notes` (à la racine du repo), qui est l'artefact réellement déployé — ce n'est pas un `dist/` classique à ignorer, il doit rester committé.

## Workflow

```bash
npm install        # une fois
npm run dev         # développement local (http://localhost:5173)
npm run build        # régénère ../notes à partir de src/
```

Après un `npm run build`, committer à la fois `notes-app/src/**` (la source) et `notes/**` (la sortie régénérée).

## Données

Les notes et dossiers vivent dans IndexedDB (base `hub-notes-db`, voir `src/db/db.js`). Au premier lancement, `src/db/migrateFromLocalStorage.js` importe automatiquement les données de l'ancienne version vanilla (clés `localStorage` `hub-notes-v1` / `hub-notes-folders-v1`), sans jamais les supprimer.
