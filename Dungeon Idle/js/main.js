import { initGame } from './core/Game.js';

// Attend que le HTML soit entièrement chargé avant de lancer le jeu
document.addEventListener('DOMContentLoaded', () => {
  console.log("Le DOM est chargé, lancement du jeu.");
  initGame();
});