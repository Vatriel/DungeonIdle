// js/main.js

const style = document.createElement('style');
style.textContent = `
    .pause-button {
        position: absolute;
        top: 5px;
        left: 5px;
        z-index: 10;
        padding: 4px 8px;
        font-size: 0.6em;
        background-color: var(--color-accent);
        color: var(--color-text-light);
        border: 2px solid var(--border-color-dark);
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
    }
    .pause-button:hover {
        background-color: var(--color-accent-dark);
        transform: translateY(-1px);
    }
    .pause-button:active {
        transform: translateY(1px);
        box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
    }
    .pause-button.active-pause {
        background-color: var(--color-error);
    }
    .pause-button.disabled-during-combat {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: var(--color-surface);
        box-shadow: none;
        transform: none;
    }
    .pause-button.disabled-during-combat:hover {
        background-color: var(--color-surface);
        transform: none;
    }
`;
if (!document.head.querySelector('style[data-pause-button-styles]')) {
    style.setAttribute('data-pause-button-styles', '');
    document.head.appendChild(style);
}

import { App } from './core/App.js';
import { eventBus } from './core/EventBus.js';
import { state } from './core/StateManager.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Le DOM est chargé, lancement du jeu.");
    App.start();

    const pauseGameBtn = document.getElementById('pause-game-btn');
    if (pauseGameBtn) {
        pauseGameBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            // CORRECTION : Le bouton bascule maintenant directement l'état de pause.
            eventBus.emit('ui_toggle_game_pause');
        });
    }

    eventBus.on('game_pause_status_changed', updatePauseButtonUI);
    // La mise à jour de l'état du bouton n'est plus nécessaire sur ces événements.
    // eventBus.on('encounter_changed', updatePauseButtonUI);
    // eventBus.on('dungeon_state_changed', updatePauseButtonUI);

    updatePauseButtonUI();

    document.getElementById('enemy-panel').addEventListener('click', (event) => {
        if (event.target.id !== 'pause-game-btn') {
            eventBus.emit('ui_monster_clicked');
        }
    });
});

function updatePauseButtonUI() {
    const pauseGameBtn = document.getElementById('pause-game-btn');
    if (!pauseGameBtn) return;

    // Logique d'affichage simplifiée
    if (state.isGamePaused) {
        pauseGameBtn.textContent = '▶'; // Symbole "Play"
        pauseGameBtn.classList.add('active-pause');
    } else {
        pauseGameBtn.textContent = '||'; // Symbole "Pause"
        pauseGameBtn.classList.remove('active-pause');
    }
}
