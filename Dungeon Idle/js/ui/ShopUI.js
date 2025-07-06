// js/ui/ShopUI.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { createElement } from '../utils/domHelper.js'; // Importe la fonction createElement

const shopAreaEl = document.getElementById('shop-area');

/**
 * Crée une carte d'item pour la boutique.
 * @param {Item} item - L'item à afficher.
 * @param {number} index - L'index de l'item dans le tableau des items de la boutique.
 * @returns {HTMLElement} La carte de l'item.
 */
function createShopItemCard(item, index) {
    const itemCard = createElement('div', { className: `shop-item-card rarity-${item.rarity}` });
    if (item.isLocked) itemCard.classList.add('locked'); // Ajoute une classe si l'item est verrouillé

    const itemInfo = createElement('div', { className: 'item-info' });
    itemInfo.appendChild(createElement('p', { className: 'item-name', textContent: item.name }));
    
    // Affiche la statistique principale de l'item
    const primaryStatValue = item.stats[item.baseDefinition.stat];
    const primaryStatName = item.baseDefinition.stat;
    itemInfo.appendChild(createElement('p', { className: 'item-stats', textContent: `+${primaryStatValue} ${primaryStatName}` }));

    // Affiche les affixes (bonus/malus) de l'item
    Object.entries(item.stats).forEach(([stat, value]) => {
        if (stat === item.baseDefinition.stat) return; // Ignore la stat principale déjà affichée
        const affixInfo = AFFIX_DEFINITIONS[stat];
        if (!affixInfo) return; // Ignore les stats non définies comme affixes

        // Formate le texte de l'affixe
        const text = affixInfo.text.replace('X', value > 0 ? value : -value);
        const sign = value > 0 ? '+' : '-';
        const affixClass = value > 0 ? 'item-affix' : 'item-affix stat-malus'; // Ajoute une classe pour les malus
        itemInfo.appendChild(createElement('p', { className: affixClass, textContent: `${sign}${text.substring(1)}` }));
    });

    const itemActions = createElement('div', { className: 'item-actions' });
    // Bouton d'achat
    itemActions.appendChild(createElement('button', { className: 'item-action-btn buy-btn', textContent: `${item.cost} Or`, dataset: { itemIndex: index } }));
    
    itemCard.appendChild(itemInfo);
    itemCard.appendChild(itemActions);
    return itemCard;
}

/**
 * Rend l'interface utilisateur de la boutique.
 * @param {Item[]} shopItems - Le tableau des items disponibles dans la boutique.
 */
export function renderShopUI(shopItems) {
    shopAreaEl.innerHTML = ''; // Vide la zone de la boutique
    if (!shopItems) return;
    shopItems.forEach((item, index) => {
        const itemCard = createShopItemCard(item, index);
        shopAreaEl.appendChild(itemCard); // Ajoute la carte de l'item au DOM
    });
}

