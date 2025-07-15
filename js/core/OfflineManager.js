// js/core/OfflineManager.js
// Gère la simulation de la progression hors ligne lorsque le joueur revient sur l'onglet.

let overlayEl = null;
let messageEl = null;

export const OfflineManager = {
    /**
     * Initialise le manager en récupérant les éléments du DOM.
     */
    init() {
        overlayEl = document.getElementById('offline-progress-overlay');
        messageEl = document.getElementById('offline-progress-message');
    },

    /**
     * Affiche l'écran de chargement avec un message.
     * @param {string} message - Le message à afficher.
     */
    show(message) {
        if (overlayEl && messageEl) {
            messageEl.textContent = message;
            overlayEl.classList.remove('hidden');
        }
    },

    /**
     * Cache l'écran de chargement.
     */
    hide() {
        if (overlayEl) {
            overlayEl.classList.add('hidden');
        }
    },

    /**
     * Gère la boucle de rattrapage pour simuler le temps d'inactivité.
     * @param {number} totalOfflineTime - Le temps total d'inactivité en secondes.
     * @param {function} updateGameLogic - La fonction qui met à jour la logique du jeu.
     */
    handleCatchUp(totalOfflineTime, updateGameLogic) {
        // Limite le temps de rattrapage pour éviter un gel trop long du navigateur
        const CATCHUP_TIME_LIMIT = 300; // 5 minutes maximum de rattrapage
        const effectiveTime = Math.min(totalOfflineTime, CATCHUP_TIME_LIMIT);
        
        console.log(`Rattrapage en cours pour ${effectiveTime.toFixed(1)} secondes...`);
        this.show(`Calcul de la progression hors ligne (${Math.floor(effectiveTime)}s)...`);

        const fixedTick = 1 / 60; // Simule à 60 ticks par seconde pour la précision
        let accumulatedTime = effectiveTime;

        // Boucle de simulation. C'est ce qui peut causer un court gel, masqué par l'écran de chargement.
        while (accumulatedTime > 0) {
            updateGameLogic(fixedTick);
            accumulatedTime -= fixedTick;
        }

        console.log("Rattrapage terminé.");
        this.hide();
    }
};
