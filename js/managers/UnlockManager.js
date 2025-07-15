// js/managers/UnlockManager.js

import { TavernUpgradesManager } from './TavernUpgradesManager.js';
import { SPECIALIST_DEFINITIONS } from '../data/specialistData.js';

const UNLOCK_CONDITIONS = {
    WARRIOR: (state) => state.gold >= state.heroDefinitions.WARRIOR.cost,
    MAGE: (state) => state.dungeonFloor >= 2,
    PRIEST: (state) => state.dungeonFloor >= 11,
    DUELIST: (state) => state.dungeonFloor >= 15,
    PROTECTOR: (state) => state.dungeonFloor >= 25 && state.gold >= state.heroDefinitions.PROTECTOR.cost,
};

const FEATURE_UNLOCKS = {
    PRESTIGE: (state) => state.highestFloorThisRun >= 15,
    ARTISAN: (state) => state.highestFloorAchieved >= 20,
    TAVERN: (state) => state.highestFloorAchieved >= 30 
};

const SPECIALIST_UNLOCK_CONDITIONS = {
    BLACKSMITH: (state) => state.tavernUnlocked,
    BATISSEUR: (state) => state.highestFloorAchieved >= 40,
    BLACKSMITH_RENOVATION: (state) => {
        return state.tavern.specialists['BLACKSMITH']?.status === 'recruited';
    },
};


function checkUnlocks(state, eventBus) {
    let needsUIUpdate = false;

    // Déblocage des héros
    // CORRECTION : La boucle itère maintenant sur toutes les définitions de héros pour trouver les conditions de déblocage.
    for (const heroId in state.heroDefinitions) {
        const heroDef = state.heroDefinitions[heroId];
        if (heroDef && heroDef.status === 'locked') {
            let isUnlocked = false;
            
            // Cas 1: Condition de déblocage standard (or, étage, etc.)
            if (UNLOCK_CONDITIONS[heroId] && UNLOCK_CONDITIONS[heroId](state)) {
                isUnlocked = true;
            }
            // Cas 2: Condition de déblocage personnalisée dans la définition du héros (ex: renommée pour le Flibustier)
            else if (heroDef.unlockCondition) {
                const { reputation } = heroDef.unlockCondition;
                if (reputation && state.tavern.reputation >= reputation) {
                    isUnlocked = true;
                }
                // On pourrait ajouter d'autres conditions ici (ex: étage, objet spécifique, etc.)
            }

            if (isUnlocked) {
                heroDef.status = 'available';
                needsUIUpdate = true;
                eventBus.emit('notification_requested', { 
                    message: `${heroDef.name} est maintenant disponible au recrutement !`, 
                    type: 'success' 
                });
            }
        }
    }

    // Déblocage des fonctionnalités
    if (!state.prestigeUnlockConditionMet && FEATURE_UNLOCKS.PRESTIGE(state)) {
        state.prestigeUnlockConditionMet = true;
        needsUIUpdate = true;
        eventBus.emit('notification_requested', {
            message: "La Renaissance est maintenant possible !",
            type: 'success'
        });
    }

    if (!state.artisanUnlocked && FEATURE_UNLOCKS.ARTISAN(state)) {
        state.artisanUnlocked = true;
        needsUIUpdate = true;
        eventBus.emit('notification_requested', {
            message: "La Forge est maintenant disponible !",
            type: 'success'
        });
    }

    if (!state.tavernUnlocked && FEATURE_UNLOCKS.TAVERN(state)) {
        state.tavernUnlocked = true;
        needsUIUpdate = true;
        eventBus.emit('notification_requested', {
            message: "La Taverne a ouvert ses portes !",
            type: 'success'
        });
    }

    // Vérification des déblocages des améliorations de la Taverne
    if (state.tavernUnlocked) {
        TavernUpgradesManager.checkUnlockConditions();
    }

    // Déblocage des spécialistes
    for (const specialistIdKey in SPECIALIST_DEFINITIONS) {
        if (!SPECIALIST_UNLOCK_CONDITIONS[specialistIdKey]) continue;

        const specialistDefStatic = SPECIALIST_DEFINITIONS[specialistIdKey];
        const specialistState = state.tavern.specialists[specialistIdKey];

        if (specialistState && specialistState.status === 'locked' && SPECIALIST_UNLOCK_CONDITIONS[specialistIdKey](state)) {
            specialistState.status = 'available';
            needsUIUpdate = true;
            eventBus.emit('notification_requested', {
                message: `${specialistDefStatic.name} est maintenant disponible !`, 
                type: 'success' 
            });
        }
    }

    if (needsUIUpdate) {
        state.ui.recruitmentNeedsUpdate = true; 
        state.ui.progressionNeedsUpdate = true;
        state.ui.tavernNeedsUpdate = true;
    }
}

export const UnlockManager = {
    checkUnlocks
};
