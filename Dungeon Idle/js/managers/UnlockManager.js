// js/managers/UnlockManager.js

/**
 * Définit les conditions de déblocage pour chaque héros.
 * Chaque condition est une fonction qui retourne un booléen.
 * C'est une approche "data-driven" qui est facile à étendre.
 */
const UNLOCK_CONDITIONS = {
    WARRIOR: (state) => state.gold >= state.heroDefinitions.WARRIOR.cost,
    MAGE: (state) => state.dungeonFloor >= 2,
    PRIEST: (state) => state.dungeonFloor >= 11,
    // Ajoutez ici les futurs héros et leurs conditions
    // EXEMPLE: RANGER: (state) => state.dungeonFloor >= 5 && state.heroes.length >= 3,
};

/**
 * Vérifie toutes les conditions de déblocage et met à jour le statut des héros si nécessaire.
 * @param {object} state - L'état actuel du jeu.
 * @param {EventBus} eventBus - Le bus d'événements pour la communication.
 */
function checkUnlocks(state, eventBus) {
    let needsUIUpdate = false;

    for (const heroId in UNLOCK_CONDITIONS) {
        const heroDef = state.heroDefinitions[heroId];

        // On vérifie uniquement les héros qui sont encore 'locked'
        if (heroDef && heroDef.status === 'locked') {
            const isConditionMet = UNLOCK_CONDITIONS[heroId](state);
            
            if (isConditionMet) {
                heroDef.status = 'available';
                needsUIUpdate = true;
                // On envoie une notification au joueur pour l'informer
                eventBus.emit('notification_sent', { 
                    message: `${heroDef.name} est maintenant disponible au recrutement !`, 
                    type: 'success' 
                });
            }
        }
    }

    if (needsUIUpdate) {
        // Notifie l'UI que la zone de recrutement doit être redessinée.
        state.ui.recruitmentNeedsUpdate = true;
    }
}

export const UnlockManager = {
    checkUnlocks
};
