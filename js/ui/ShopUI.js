// js/ui/ShopUI.js

import { createElement } from '../utils/domHelper.js'; // Assurez-vous que createElement est bien importé
import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { UNIQUE_EFFECT_DESCRIPTIONS } from '../data/uniqueEffectData.js';

let shopItemsContainer, shopRestockTimerDisplay, rerollBtn, toggleLockModeBtn, buyAllShopButton;

function createShopItemCard(item, state, eventBus) {
    // Remplacé DomHelper.createDivWithClasses
    const card = createElement('div', { className: `item-card shop-item-card rarity-${item.rarity.toLowerCase()}` });
    card.dataset.itemIndex = state.shopItems.indexOf(item);

    card.addEventListener('click', (e) => {
        const itemIndex = state.shopItems.indexOf(item);
        if (e.target.closest('.buy-item-btn')) {
            eventBus.emit('ui_shop_buy_item_clicked', { itemIndex });
        } else {
            eventBus.emit('ui_shop_lock_item_toggled', { itemIndex });
        }
    });

    // Remplacé DomHelper.createDivWithClasses
    const header = createElement('div', { className: 'item-card-header' });
    // Remplacé DomHelper.createSpan
    header.appendChild(createElement('span', { textContent: item.name, className: 'item-name' }));
    card.appendChild(header);

    // Remplacé DomHelper.createDivWithClasses
    const statsDiv = createElement('div', { className: 'item-stats' });
    for (const statKey in item.stats) {
        const value = item.stats[statKey];
        const affixDef = AFFIX_DEFINITIONS[statKey];
        if (!affixDef) continue;

        const prefix = value > 0 ? '+' : '';
        const suffix = affixDef.isPercent ? '%' : '';
        const statName = affixDef.text.replace('X', '').trim();
        
        // Remplacé DomHelper.createParagraph
        const statLine = createElement('p', { className: 'item-stat-line', textContent: `${prefix}${value.toFixed(affixDef.isPercent ? 1 : 0)}${suffix} ${statName}` });
        
        if (item.implicitStatKeys && item.implicitStatKeys.includes(statKey)) {
            statLine.classList.add('implicit-stat');
        }
        
        statsDiv.appendChild(statLine);
    }
    
    if (item.baseDefinition.uniqueEffect) {
        const effectDescription = UNIQUE_EFFECT_DESCRIPTIONS[item.baseDefinition.uniqueEffect];
        if (effectDescription) {
            // Remplacé DomHelper.createParagraph
            statsDiv.appendChild(createElement('p', { className: 'item-unique-effect', textContent: effectDescription }));
        }
    }
    
    card.appendChild(statsDiv);

    // Remplacé DomHelper.createButton
    const buyButton = createElement('button', { textContent: `${item.cost} Or`, className: 'buy-item-btn' });
    if (state.gold < item.cost || item.locked) {
        buyButton.disabled = true;
    }
    card.appendChild(buyButton);

    if (item.locked) {
        card.classList.add('locked');
        // Remplacé DomHelper.createSpan
        const lockIcon = createElement('span', { textContent: '🔒', className: 'lock-icon' });
        lockIcon.title = 'Cet objet est verrouillé. Cliquez en mode verrouillage pour le déverrouiller.';
        card.appendChild(lockIcon);
    }

    return card;
}

export function renderShopUI(state) {
    if (!shopItemsContainer) return;

    shopItemsContainer.innerHTML = '';
    const shopPanel = document.getElementById('shop-panel');
    if (shopPanel) {
        shopPanel.classList.toggle('lock-mode-active', state.ui.shopLockModeActive);
    }
    if (toggleLockModeBtn) {
        toggleLockModeBtn.classList.toggle('active', state.ui.shopLockModeActive);
    }

    state.shopItems.forEach(item => {
        if (item) {
            const itemCard = createShopItemCard(item, state, state.eventBus);
            shopItemsContainer.appendChild(itemCard);
        }
    });

    // Mettre à jour le texte du bouton de rafraîchissement ici aussi
    if (rerollBtn) {
        const refreshCost = 100 * state.dungeonFloor;
        rerollBtn.title = `Rafraîchir la boutique (${refreshCost} Or)`;
    }
}

// NOUVEAU : Fonction pour mettre à jour l'affichage du timer de la boutique
export function updateShopTimerDisplay(state) {
    if (shopRestockTimerDisplay) {
        const totalRestockTime = 60; // Le temps total de restockage en secondes (défini dans ShopManager)
        const timeLeft = state.shopRestockTimer;
        const percentageFilled = (timeLeft / totalRestockTime) * 100;
        
        // Mettre à jour la variable CSS pour le conic-gradient
        shopRestockTimerDisplay.style.setProperty('--timer-progress', `${percentageFilled}%`);
        
        // Afficher le temps restant au centre du cercle
        // Assurez-vous que le texte reste visible en tout temps
        shopRestockTimerDisplay.textContent = `${Math.ceil(totalRestockTime - timeLeft)}s`;
    }
}


export function initShopUI(eventBus, state) {
    shopItemsContainer = document.getElementById('shop-area');
    rerollBtn = document.getElementById('refresh-shop-btn');
    toggleLockModeBtn = document.getElementById('toggle-lock-mode-btn');
    buyAllShopButton = document.getElementById('buy-all-shop-button');
    shopRestockTimerDisplay = document.getElementById('shop-restock-timer-display'); // Récupération du nouvel élément

    if (rerollBtn) {
        rerollBtn.addEventListener('click', () => {
            eventBus.emit('ui_reroll_shop_clicked');
        });
        // Initialiser le titre du bouton avec le coût dynamique
        const refreshCost = 100 * state.dungeonFloor;
        rerollBtn.title = `Rafraîchir la boutique (${refreshCost} Or)`;
    }

    if (buyAllShopButton) {
        buyAllShopButton.addEventListener('click', () => {
            eventBus.emit('ui_buy_all_shop_clicked');
        });
    }
}
