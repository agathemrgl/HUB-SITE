import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Même principe que notes/app : GitHub Pages sert le dépôt tel quel (aucun build côté hébergeur),
// donc `npm run build` régénère directement le dossier parent `recettes/`, avec des chemins sous /recettes/.
// outDir contient aussi ce code source (app/) : emptyOutDir reste à false, voir scripts/clean-build.js.
export default defineConfig({
  base: '/recettes/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    outDir: '..',
    emptyOutDir: false,
  },
});
