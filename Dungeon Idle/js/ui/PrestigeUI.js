// js/ui/PrestigeUI.js
// NOUVEAU : Ce fichier gère l'affichage du panneau de prestige.

import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';
import { PrestigeManager } from '../managers/PrestigeManager.js';
import { createElement } from '../utils/domHelper.js';

const prestigePanelEl = document.getElementById('prestige-panel');

/**
 * Rend le panneau des améliorations de prestige.
 * @param {object} state - L'état global du jeu.
 */
export function renderPrestigeUI(state) {
    if (!prestigePanelEl) return;

    prestigePanelEl.innerHTML = '<h2>Autel de la Renaissance</h2>';

    for (const upgradeId in PRESTIGE_UPGRADES) {
        const upgrade = PRESTIGE_UPGRADES[upgradeId];
        const currentLevel = state.prestigeUpgrades[upgradeId] || 0;

        const card = createElement('div', { className: 'prestige-upgrade-card' });
        
        const name = createElement('h4', { textContent: `${upgrade.name} (${currentLevel} / ${upgrade.maxLevel})` });
        card.appendChild(name);

        // Calcule les valeurs actuelles et futures pour la description
        const currentValue = upgrade.effect(currentLevel);
        const nextValue = upgrade.effect(currentLevel + 1) - currentValue;
        
        let descriptionText = upgrade.description
            .replace('{value}', upgrade.formatValue(currentValue))
            .replace('{nextValue}', upgrade.formatValue(nextValue));

        // Cache la partie "Prochain niveau" si le niveau max est atteint
        if (currentLevel >= upgrade.maxLevel) {
            descriptionText = descriptionText.split(" Prochain niveau")[0];
        }

        const description = createElement('p', { textContent: descriptionText });
        card.appendChild(description);

        if (currentLevel < upgrade.maxLevel) {
            const cost = PrestigeManager.getUpgradeCost(upgrade, currentLevel);
            const buyButton = createElement('button', {
                textContent: `Améliorer (${cost} Échos)`,
                className: 'buy-btn',
                dataset: { upgradeId: upgrade.id }
            });

            if (state.soulEchos < cost) {
                buyButton.disabled = true; // Désactive le bouton si pas assez d'Échos
            }
            card.appendChild(buyButton);
        }

        prestigePanelEl.appendChild(card);
    }
}
