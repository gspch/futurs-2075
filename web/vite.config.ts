import { defineConfig } from 'vite';

// Chemins relatifs : le site fonctionne tel quel sous https://<compte>.github.io/<dépôt>/
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2020' },
  worker: { format: 'es' },
});
