import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Le site est déployé sur GitHub Pages en "Deploy from branch" : aucun build ne tourne
// côté hébergeur. `npm run build` doit donc régénérer directement le dossier parent
// `notes/` (servi tel quel), avec des chemins d'assets absolus sous /notes/.
// outDir pointe sur le parent de ce dossier (qui contient aussi ce code source), donc
// emptyOutDir doit rester à false pour ne pas effacer `app/` — voir scripts/clean-build.js.
export default defineConfig({
  base: '/notes/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '..',
    emptyOutDir: false,
  },
})
