import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Même principe que recettes/app : GitHub Pages sert le dépôt tel quel, donc `npm run build`
// régénère directement le dossier parent `armoire/`, avec des chemins sous /armoire/.
// outDir contient aussi ce code source (app/) : emptyOutDir reste à false, voir scripts/clean-build.js.
export default defineConfig({
  base: '/armoire/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    outDir: '..',
    emptyOutDir: false,
  },
});
