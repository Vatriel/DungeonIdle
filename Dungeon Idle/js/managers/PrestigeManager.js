// js/managers/PrestigeManager.js
// NOUVEAU : Ce manager gère la logique d'achat des améliorations de prestige.

import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';

/**
 * Calcule le coût d'un niveau spécifique d'une amélioration.
 * @param {object} upgrade - La définition de l'amélioration.
 * @param {number} level - Le niveau pour lequel calculer le coût (commence à 1).
 * @returns {number} Le coût en Échos de l'Âme.
 */
function getUpgradeCost(upgrade, level) {
    if (level === 0) return upgrade.baseCost;
    // Le coût augmente de manière exponentielle
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, level));
}

/**
 * Tente d'acheter ou d'améliorer une compétence de prestige.
 * @param {object} state - L'état global du jeu.
 * @param {string} upgradeId - L'ID de l'amélioration à acheter.
 * @param {EventBus} eventBus - Le bus d'événements pour les notifications.
 */
function buyUpgrade(state, upgradeId, eventBus) {
    const upgrade = PRESTIGE_UPGRADES[upgradeId];
    if (!upgrade) {
        console.error(`Amélioration de prestige inconnue : ${upgradeId}`);
        return;
    }

    const currentLevel = state.prestigeUpgrades[upgradeId] || 0;

    if (currentLevel >= upgrade.maxLevel) {
        eventBus.emit('notification_sent', { message: "Niveau maximum atteint !", type: 'error' });
        return;
    }

    const cost = getUpgradeCost(upgrade, currentLevel);

    if (state.soulEchos < cost) {
        eventBus.emit('notification_sent', { message: "Pas assez d'Échos de l'Âme !", type: 'error' });
        return;
    }

    state.soulEchos -= cost; // Déduit le coût
    state.prestigeUpgrades[upgradeId] = currentLevel + 1; // Augmente le niveau de l'amélioration

    // Signale que l'UI de prestige et les stats des héros doivent être mises à jour
    state.ui.prestigeNeedsUpdate = true;
    state.ui.heroesNeedUpdate = true; 
    eventBus.emit('notification_sent', { message: `${upgrade.name} amélioré !`, type: 'success' });
}

export const PrestigeManager = {
    buyUpgrade,
    getUpgradeCost
};
