// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // L'option 'base' est cruciale si vous hébergez sur GitHub Pages.
  // Remplacez 'Dungeon-Idle' par le nom exact de votre dépôt GitHub.
  base: '/Dungeon-Idle/', 
  build: {
    outDir: 'dist' // Le dossier où le jeu "buildé" sera placé.
  }
});