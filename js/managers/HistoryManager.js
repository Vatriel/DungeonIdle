// js/managers/HistoryManager.js

const HISTORY_TICK_INTERVAL = 1.0; // Collecte les données toutes les secondes
let historyTickTimer = 0;
let localState = null;

/**
 * Initialise le HistoryManager.
 * @param {object} state - L'état global du jeu.
 */
export function initHistoryManager(state) {
    localState = state;
}

/**
 * Met à jour le HistoryManager à chaque tick.
 * @param {number} dt - Le delta time.
 */
export function updateHistoryManager(dt) {
    historyTickTimer += dt;
    if (historyTickTimer >= HISTORY_TICK_INTERVAL) {
        historyTickTimer -= HISTORY_TICK_INTERVAL;
        
        // La logique de collecte est maintenant dans la classe HeroCombatHistory
        localState.heroes.forEach(hero => {
            hero.history.collect();
        });
    }
}
