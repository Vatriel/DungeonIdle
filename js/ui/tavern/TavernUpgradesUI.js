// js/ui/tavern/TavernUpgradesUI.js

import { createElement } from '../../utils/domHelper.js';
import { TavernUpgradesManager } from '../../managers/TavernUpgradesManager.js';
import { TAVERN_UPGRADES } from '../../data/tavernUpgradesData.js';
import { TROPHY_DEFINITIONS } from '../../data/trophyData.js';
import { SPECIALIST_DEFINITIONS } from '../../data/specialistData.js';

/**
 * Creates a card element for a single tavern upgrade.
 * @param {object} upgradeStatus - The status object for the upgrade from TavernUpgradesManager.
 * @returns {HTMLElement} The upgrade card element.
 */
function createUpgradeCard(upgradeStatus) {
    const card = createElement('div', { className: `upgrade-card ${upgradeStatus.type}-upgrade` });
    card.dataset.upgradeId = upgradeStatus.id;

    // Add classes based on the upgrade's state
    if (upgradeStatus.isMaxLevel) card.classList.add('max-level');
    if (!upgradeStatus.isUnlocked) card.classList.add('locked-condition');
    if (upgradeStatus.isOwned && upgradeStatus.type === 'free') card.classList.add('owned');

    // Name and level
    const nameEl = createElement('h5', { textContent: `${upgradeStatus.name} (${upgradeStatus.currentLevel}/${upgradeStatus.maxLevel})` });
    card.appendChild(nameEl);

    // Description with dynamic values
    let descriptionText = upgradeStatus.description;
    if (upgradeStatus.formatValue) {
        const effectiveValue = upgradeStatus.effectValue !== null ? upgradeStatus.effectValue : 0;
        const effectiveNextValue = upgradeStatus.nextEffectValue !== null ? upgradeStatus.nextEffectValue : 0;

        descriptionText = descriptionText
            .replace('{value}', upgradeStatus.formatValue(effectiveValue))
            .replace('{nextValue}', upgradeStatus.formatValue(effectiveNextValue));
    }
    // Clean up description if max level is reached
    if (upgradeStatus.isMaxLevel && upgradeStatus.type === 'paid') {
        descriptionText = descriptionText.split(" Prochain niveau")[0];
    }
    const descriptionEl = createElement('p', { textContent: descriptionText, className: 'upgrade-description' });
    card.appendChild(descriptionEl);

    // Cost and Buy Button for 'paid' upgrades
    if (upgradeStatus.type === 'paid' && !upgradeStatus.isMaxLevel) {
        const costEl = createElement('div', { className: 'upgrade-cost' });
        let costText = 'Coût : ';
        if (upgradeStatus.cost.gold) {
            costText += `${upgradeStatus.cost.gold.toLocaleString()} Or`;
        }
        if (upgradeStatus.cost.trophy) {
            const trophyName = TROPHY_DEFINITIONS[upgradeStatus.cost.trophy]?.name || "Trophée";
            costText += (costText === 'Coût : ' ? '' : ', ') + `${upgradeStatus.cost.quantity} ${trophyName}`;
        }
        costEl.textContent = costText;
        card.appendChild(costEl);

        const buyButton = createElement('button', {
            className: 'btn upgrade-buy-btn',
            textContent: 'Acheter',
            dataset: { upgradeId: upgradeStatus.id }
        });
        if (!upgradeStatus.isUnlocked || !upgradeStatus.canAfford) {
            buyButton.disabled = true;
            if (!upgradeStatus.isUnlocked) {
                buyButton.textContent = 'Verrouillé';
            }
        }
        card.appendChild(buyButton);
    } else if (upgradeStatus.type === 'free' && upgradeStatus.isOwned) {
        card.appendChild(createElement('div', { className: 'upgrade-status', textContent: 'Débloqué' }));
    }

    // Display unlock conditions if not met
    if (!upgradeStatus.isUnlocked) {
        let conditionTextParts = [];
        if (upgradeStatus.unlockCondition.reputation) {
            conditionTextParts.push(`Renommée ${upgradeStatus.unlockCondition.reputation}`);
        }
        if (upgradeStatus.unlockCondition.floor) {
            conditionTextParts.push(`Étage ${upgradeStatus.unlockCondition.floor}`);
        }
        if (upgradeStatus.unlockCondition.specialistRecruited) {
            const specialistName = SPECIALIST_DEFINITIONS[upgradeStatus.unlockCondition.specialistRecruited.toUpperCase()]?.name || "Spécialiste";
            conditionTextParts.push(`Recruter ${specialistName}`);
        }
        card.appendChild(createElement('div', { className: 'upgrade-status locked-condition', textContent: `Requiert : ${conditionTextParts.join(' / ')}` }));
    } else if (upgradeStatus.isMaxLevel) {
        card.appendChild(createElement('div', { className: 'upgrade-status max-level', textContent: 'Niveau Max' }));
    }

    return card;
}

/**
 * Renders the entire upgrades tab UI.
 * @param {HTMLElement} container - The main container for the upgrades tab.
 * @param {object} state - The current game state.
 * @param {EventBus} eventBus - The global event bus.
 */
export function renderUpgradesUI(container, state, eventBus) {
    const upgradesGrid = createElement('div', { className: 'tavern-upgrades-grid' });
    
    // Section for free upgrades
    const freeUpgradesSection = createElement('div', { className: 'upgrades-section free-upgrades' });
    freeUpgradesSection.appendChild(createElement('h4', { textContent: 'Améliorations de Renommée' }));
    const freeUpgradesList = createElement('div', { className: 'upgrades-list' });
    freeUpgradesSection.appendChild(freeUpgradesList);

    // Section for paid upgrades
    const paidUpgradesSection = createElement('div', { className: 'upgrades-section paid-upgrades' });
    paidUpgradesSection.appendChild(createElement('h4', { textContent: 'Investissements' }));
    const paidUpgradesList = createElement('div', { className: 'upgrades-list' });
    paidUpgradesSection.appendChild(paidUpgradesList);

    // Populate the sections
    for (const upgradeId in TAVERN_UPGRADES) { 
        const upgradeStatus = TavernUpgradesManager.getUpgradeStatus(upgradeId);
        if (!upgradeStatus) continue;

        const card = createUpgradeCard(upgradeStatus);
        if (upgradeStatus.type === 'free') {
            freeUpgradesList.appendChild(card);
        } else {
            paidUpgradesList.appendChild(card);
        }
    }

    upgradesGrid.append(freeUpgradesSection, paidUpgradesSection);
    container.appendChild(upgradesGrid);

    // Add a single event listener for buy buttons
    container.addEventListener('click', (e) => {
        const buyUpgradeButton = e.target.closest('.upgrade-buy-btn');
        if (buyUpgradeButton && !buyUpgradeButton.disabled) {
            eventBus.emit('ui_tavern_buy_upgrade_clicked', { upgradeId: buyUpgradeButton.dataset.upgradeId });
        }
    });
}
