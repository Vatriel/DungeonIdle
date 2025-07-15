// js/ui/tavern/TavernGoodsUI.js

import { createElement } from '../../utils/domHelper.js';
import { TAVERN_GOODS } from '../../data/tavernGoodsData.js';
import { ELIXIR_OF_FURY_DEF } from '../../managers/TavernConsumablesManager.js'; // Import definition for elixir

/**
 * Creates a card element for a single consumable good.
 * @param {object} good - The definition of the good.
 * @param {object} state - The current game state.
 * @returns {HTMLElement} The good card element.
 */
function createGoodCard(good, state) {
    const card = createElement('div', { className: 'good-card' });
    
    // Calculate dynamic cost with reduction
    let cost = good.baseCost * state.dungeonFloor;
    const costReductionPercent = state.tavern.consumableCostReduction || 0;
    if (costReductionPercent > 0) {
        cost = Math.ceil(cost * (1 - costReductionPercent / 100));
    }

    const isActive = state.activeConsumables.some(c => c.id === good.id);
    const canAfford = state.gold >= cost;

    // Calculate dynamic duration with bonus
    let durationText = '';
    let durationValue = good.duration.value;
    if (good.duration.type === 'timed') {
        const durationBonusPercent = state.tavern.timedConsumableDurationBonus || 0;
        if (durationBonusPercent > 0) {
            durationValue *= (1 + durationBonusPercent / 100);
        }
        durationText = `${Math.ceil(durationValue / 60)} minutes`;
    } else {
        durationText = `${Math.ceil(durationValue)} rencontres`;
    }

    const bonusStatName = good.bonus.stat.replace('Percent', '').replace(/([A-Z])/g, ' $1').trim();
    const bonusText = `+${good.bonus.value}% ${bonusStatName}`;

    card.innerHTML = `
        <div class="good-icon">${good.icon}</div>
        <div class="good-name">${good.name}</div>
        <p class="good-description">${good.description}</p>
        <div class="good-effect">Effet : ${bonusText}</div>
        <div class="good-duration">Durée : ${durationText}</div>
    `;

    const footer = createElement('div', { className: 'good-footer' });
    const buyButton = createElement('button', { 
        className: 'btn good-buy-btn', 
        textContent: `${cost} Or`,
        dataset: { goodId: good.id }
    });

    if (isActive) {
        const activeConsumable = state.activeConsumables.find(c => c.id === good.id);
        buyButton.disabled = true;
        let remainingText = 'Actif';
        if (activeConsumable.duration.type === 'timed') {
            const currentRemaining = activeConsumable.duration.value;
            const minutes = Math.floor(currentRemaining / 60);
            const seconds = Math.floor(currentRemaining % 60);
            remainingText = `Actif (${minutes}m ${seconds}s)`;
        } else {
            remainingText = `Actif (${activeConsumable.duration.value} rencontres)`;
        }
        buyButton.textContent = remainingText;
    } else if (!canAfford) {
        buyButton.disabled = true;
    }

    footer.appendChild(buyButton);
    card.appendChild(footer);

    return card;
}

/**
 * Renders the entire goods tab UI.
 * @param {HTMLElement} container - The main container for the goods tab.
 * @param {object} state - The current game state.
 * @param {EventBus} eventBus - The global event bus.
 */
export function renderGoodsUI(container, state, eventBus) {
    // Auto-buy checkbox
    const autoBuyCheckboxContainer = createElement('div', { className: 'auto-buy-consumables-option option-wrapper' });
    autoBuyCheckboxContainer.innerHTML = `
        <label class="checkbox-container">
            <input type="checkbox" id="auto-buy-consumables-toggle">
            <span class="checkmark"></span> Achat automatique des marchandises
        </label>
        <p class="option-help">Achète automatiquement toutes les marchandises disponibles dès que vous avez assez d'or.</p>
    `;
    const autoBuyToggle = autoBuyCheckboxContainer.querySelector('#auto-buy-consumables-toggle');
    autoBuyToggle.checked = state.options.autoBuyTavernConsumables;
    autoBuyToggle.addEventListener('change', (e) => {
        eventBus.emit('ui_toggle_auto_buy_consumables', { active: e.target.checked });
    });
    autoBuyCheckboxContainer.classList.toggle('hidden', !state.options.autoBuyConsumablesUnlocked);
    
    // Header controls
    const headerControls = createElement('div', { className: 'goods-header-controls' });
    const buyAllButton = createElement('button', {
        id: 'buy-all-goods-btn',
        className: 'btn buy-btn',
        textContent: 'Acheter tout',
        title: 'Achète tous les consommables disponibles que vous pouvez vous permettre.'
    });
    buyAllButton.addEventListener('click', () => eventBus.emit('ui_tavern_buy_all_goods_clicked'));
    headerControls.appendChild(buyAllButton);

    // Grid for goods
    const grid = createElement('div', { className: 'goods-grid' });
    const allGoods = { ...TAVERN_GOODS };
    if (state.tavern.elixirOfFuryUnlocked) {
        allGoods.ELIXIR_OF_FURY = ELIXIR_OF_FURY_DEF;
    }

    for (const goodId in allGoods) {
        const good = allGoods[goodId];
        const card = createGoodCard(good, state);
        grid.appendChild(card);
    }
    
    // Assemble and append to the main container
    container.append(autoBuyCheckboxContainer, headerControls, grid);

    // Add a single event listener for buy buttons
    container.addEventListener('click', (e) => {
        const buyButton = e.target.closest('.good-buy-btn');
        if (buyButton && !buyButton.disabled) {
            eventBus.emit('ui_tavern_buy_good_clicked', { goodId: buyButton.dataset.goodId });
        }
    });
}
