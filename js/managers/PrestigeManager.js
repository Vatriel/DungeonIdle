// js/managers/PrestigeManager.js

import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';
import { StorageManager } from './StorageManager.js';

let localState = null;
let localEventBus = null;

/**
 * Calcule le coût d'une amélioration de prestige pour un niveau donné.
 * @param {object} upgrade - La définition de l'amélioration.
 * @param {number} level - Le niveau actuel de l'amélioration.
 * @returns {number} Le coût en Échos de l'Âme.
 */
function getUpgradeCost(upgrade, level) {
    if (level === 0) return upgrade.baseCost;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, level));
}

/**
 * Achète un niveau pour une amélioration de prestige.
 * @param {string} upgradeId - L'ID de l'amélioration à acheter.
 */
function buyUpgrade(upgradeId) {
    const upgrade = PRESTIGE_UPGRADES[upgradeId];
    if (!upgrade) {
        console.error(`Amélioration de prestige inconnue : ${upgradeId}`);
        return;
    }

    const currentLevel = localState.prestigeUpgrades[upgradeId] || 0;

    if (currentLevel >= upgrade.maxLevel) {
        localEventBus.emit('notification_requested', { message: "Niveau maximum atteint !", type: 'error' });
        return;
    }

    const cost = getUpgradeCost(upgrade, currentLevel);

    if (localState.soulEchos < cost) {
        localEventBus.emit('notification_requested', { message: "Pas assez d'Échos de l'Âme !", type: 'error' });
        return;
    }

    localState.soulEchos -= cost;
    localState.prestigeUpgrades[upgradeId] = currentLevel + 1;

    localState.ui.prestigeNeedsUpdate = true;
    localState.ui.heroesNeedUpdate = true; // Pour recalculer les stats si un bonus a été acheté
    localEventBus.emit('notification_requested', { message: `${upgrade.name} amélioré !`, type: 'success' });
}

/**
 * Déclenche le processus de prestige, en commençant par une demande de confirmation.
 */
function triggerPrestigeReset() {
    const echosToGain = Math.floor(Math.pow(localState.highestFloorThisRun, 1.5) / 2);

    if (echosToGain <= 0) {
        localEventBus.emit('notification_requested', { message: "Vous devez progresser plus loin pour gagner plus d'Échos !", type: 'error' });
        return;
    }

    const message = `Voulez-vous vraiment effectuer une Renaissance ?\n\nVotre progression (or, objets, étage, niveaux des héros) sera réinitialisée.\n\nEn récompense de vos efforts, vous gagnerez ${echosToGain} Échos de l'Âme.\n\nLes Échos et les améliorations de prestige sont permanents.`;
    
    localEventBus.emit('confirmation_requested', { 
        message, 
        action: { type: 'prestige_reset' }
    });
}

/**
 * Exécute la réinitialisation de prestige après confirmation.
 */
function executePrestigeReset() {
    console.log("PrestigeManager: Exécution de la réinitialisation de prestige...");
    const echosGained = Math.floor(Math.pow(localState.highestFloorThisRun, 1.5) / 2);
    if (echosGained <= 0) {
        console.log("PrestigeManager: Pas d'échos à gagner, annulation de la réinitialisation.");
        return;
    }

    const permanentState = {
        soulEchos: localState.soulEchos + echosGained,
        prestigeUpgrades: localState.prestigeUpgrades,
        highestFloorAchieved: Math.max(localState.highestFloorAchieved, localState.highestFloorThisRun),
        heroDefinitionsStatus: Object.fromEntries(
            Object.entries(localState.heroDefinitions).map(([key, def]) => [key, def.status])
        ),
        duelistUnlockedByPrestige: true,
        options: localState.options,
        prestigeCount: (localState.prestigeCount || 0) + 1,
        artisanUnlocked: localState.artisanUnlocked,
        resources: localState.resources,
        prestigeUnlockConditionMet: localState.prestigeUnlockConditionMet,
        trophies: localState.trophies,
        tavernUnlocked: localState.tavernUnlocked,
        // CORRECTION : Sauvegarde de l'objet taverne complet pour inclure les améliorations et les spécialistes.
        tavern: {
            reputation: localState.tavern.reputation,
            contractCooldowns: localState.tavern.contractCooldowns,
            upgrades: localState.tavern.upgrades, // Sauvegarde les améliorations achetées
            specialists: localState.tavern.specialists, // Sauvegarde le statut des spécialistes
        }
    };

    StorageManager.savePrestige(permanentState);
    console.log("PrestigeManager: Sauvegarde de prestige effectuée. Tentative de rechargement de la page...");
    window.location.reload();
}

/**
 * Gère les actions confirmées par l'utilisateur.
 * @param {object} action - L'action à exécuter.
 */
function handleConfirmation(action) {
    if (action.type === 'prestige_reset') {
        executePrestigeReset();
    }
}

export const PrestigeManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;

        eventBus.on('ui_prestige_buy_upgrade_clicked', (data) => buyUpgrade(data.upgradeId));
        eventBus.on('ui_prestige_button_clicked', triggerPrestigeReset);
        eventBus.on('confirmation_accepted', handleConfirmation);
    },
    getUpgradeCost
};
