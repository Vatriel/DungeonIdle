// js/managers/UnlockManager.js

/**
 * Définit les conditions de déblocage pour chaque héros.
 */
const UNLOCK_CONDITIONS = {
    WARRIOR: (state) => state.gold >= state.heroDefinitions.WARRIOR.cost,
    MAGE: (state) => state.dungeonFloor >= 2,
    PRIEST: (state) => state.dungeonFloor >= 11,
    // NOUVEAU : Condition de déblocage pour le Duelliste
    DUELIST: (state) => state.duelistUnlockedByPrestige && state.dungeonFloor >= 15,
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

        if (heroDef && heroDef.status === 'locked') {
            const isConditionMet = UNLOCK_CONDITIONS[heroId](state);
            
            if (isConditionMet) {
                heroDef.status = 'available';
                needsUIUpdate = true;
                eventBus.emit('notification_sent', { 
                    message: `${heroDef.name} est maintenant disponible au recrutement !`, 
                    type: 'success' 
                });
            }
        }
    }

    if (needsUIUpdate) {
        state.ui.recruitmentNeedsUpdate = true;
    }
}

export const UnlockManager = {
    checkUnlocks
};
