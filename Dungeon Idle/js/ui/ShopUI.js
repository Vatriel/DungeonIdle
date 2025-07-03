// js/ui/ShopUI.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';

const shopAreaEl = document.getElementById('shop-area');

function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.textContent) el.textContent = options.textContent;
    if (options.title) el.title = options.title;
    if (options.value !== undefined) el.value = options.value;
    if (options.max !== undefined) el.max = options.max;
    if (options.dataset) {
        for (const key in options.dataset) {
            el.dataset[key] = options.dataset[key];
        }
    }
    return el;
}

function createShopItemCard(item, index) {
    const itemCard = createElement('div', { className: `shop-item-card rarity-${item.rarity}` });
    if (item.isLocked) itemCard.classList.add('locked');

    const itemInfo = createElement('div', { className: 'item-info' });
    itemInfo.appendChild(createElement('p', { className: 'item-name', textContent: item.name }));
    const primaryStatValue = item.stats[item.baseDefinition.stat];
    const primaryStatName = item.baseDefinition.stat;
    itemInfo.appendChild(createElement('p', { className: 'item-stats', textContent: `+${primaryStatValue} ${primaryStatName}` }));

    Object.entries(item.stats).forEach(([stat, value]) => {
        if (stat === item.baseDefinition.stat) return;
        const affixInfo = AFFIX_DEFINITIONS[stat];
        if (!affixInfo) return;
        const text = affixInfo.text.replace('X', value > 0 ? value : -value);
        const sign = value > 0 ? '+' : '-';
        // CORRIGÉ : On ajoute une classe pour les malus
        const affixClass = value > 0 ? 'item-affix' : 'item-affix stat-malus';
        itemInfo.appendChild(createElement('p', { className: affixClass, textContent: `${sign}${text.substring(1)}` }));
    });

    const itemActions = createElement('div', { className: 'item-actions' });
    itemActions.appendChild(createElement('button', { className: 'item-action-btn buy-btn', textContent: `${item.cost} Or`, dataset: { itemIndex: index } }));
    
    itemCard.appendChild(itemInfo);
    itemCard.appendChild(itemActions);
    return itemCard;
}

export function renderShopUI(shopItems) {
    shopAreaEl.innerHTML = '';
    if (!shopItems) return;
    shopItems.forEach((item, index) => {
        const itemCard = createShopItemCard(item, index);
        shopAreaEl.appendChild(itemCard);
    });
}
