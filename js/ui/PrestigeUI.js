// js/ui/PrestigeUI.js

import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';
import { PrestigeManager } from '../managers/PrestigeManager.js';
import { createElement } from '../utils/domHelper.js';

// FIX: Cible le nouveau conteneur de cartes au lieu du panneau entier
const prestigeContainerEl = document.getElementById('prestige-cards-container');

function createPrestigeUpgradeCard(upgradeId) {
    const card = createElement('div', { 
        className: 'prestige-card',
        dataset: { upgradeId: upgradeId }
    });
    card.appendChild(createElement('h4'));
    card.appendChild(createElement('p'));
    return card;
}

function updatePrestigeUpgradeCard(card, upgrade, currentLevel, soulEchos) {
    const nameEl = card.querySelector('h4');
    nameEl.textContent = `${upgrade.name} (${currentLevel} / ${upgrade.maxLevel})`;

    const descriptionEl = card.querySelector('p');
    const currentValue = upgrade.effect(currentLevel);
    const nextValue = upgrade.effect(currentLevel + 1) - currentValue;
    let descriptionText = upgrade.description
        .replace('{value}', upgrade.formatValue(currentValue))
        .replace('{nextValue}', upgrade.formatValue(nextValue));

    if (currentLevel >= upgrade.maxLevel) {
        descriptionText = descriptionText.split(" Prochain niveau")[0];
    }
    descriptionEl.textContent = descriptionText;

    let buyButton = card.querySelector('.buy-btn');
    if (currentLevel < upgrade.maxLevel) {
        const cost = PrestigeManager.getUpgradeCost(upgrade, currentLevel);
        if (!buyButton) {
            buyButton = createElement('button', { className: 'buy-btn', dataset: { upgradeId: upgrade.id } });
            card.appendChild(buyButton);
        }
        buyButton.textContent = `Améliorer (${cost} Échos)`;
        buyButton.disabled = soulEchos < cost;
    } else if (buyButton) {
        buyButton.remove();
    }
}

export function renderPrestigeUI(state) {
    // FIX: Vérifie le nouveau conteneur et supprime la gestion du titre
    if (!prestigeContainerEl) return;
    
    prestigeContainerEl.innerHTML = ''; // Vide uniquement le conteneur des cartes

    const existingCards = new Map();
    prestigeContainerEl.querySelectorAll('.prestige-card').forEach(card => {
        existingCards.set(card.dataset.upgradeId, card);
    });

    for (const upgradeId in PRESTIGE_UPGRADES) {
        const upgrade = PRESTIGE_UPGRADES[upgradeId];
        const currentLevel = state.prestigeUpgrades[upgradeId] || 0;
        
        // La logique de rendu des cartes reste la même, mais elle est ajoutée au bon conteneur
        let card = existingCards.get(upgradeId);
        if (card) {
            updatePrestigeUpgradeCard(card, upgrade, currentLevel, state.soulEchos);
            existingCards.delete(upgradeId);
        } else {
            card = createPrestigeUpgradeCard(upgradeId);
            updatePrestigeUpgradeCard(card, upgrade, currentLevel, state.soulEchos);
            prestigeContainerEl.appendChild(card);
        }
    }

    existingCards.forEach(card => card.remove());
}
