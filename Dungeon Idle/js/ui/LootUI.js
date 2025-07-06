// js/ui/LootUI.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { createElement } from '../utils/domHelper.js'; // Importe la fonction createElement

const lootAreaEl = document.getElementById('loot-area');

/**
 * Crée une carte d'item pour la zone de butin.
 * @param {Item} item - L'item à afficher.
 * @param {number} index - L'index de l'item dans le tableau des items lâchés.
 * @returns {HTMLElement} La carte de l'item.
 */
function createLootItemCard(item, index) {
    const itemCard = createElement('div', { className: `loot-item-card rarity-${item.rarity}` });

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
    // Boutons pour ramasser ou jeter l'item
    itemActions.appendChild(createElement('button', { className: 'item-action-btn pickup-btn', textContent: 'Ramasser', dataset: { lootIndex: index } }));
    itemActions.appendChild(createElement('button', { className: 'item-action-btn discard-btn', textContent: 'Jeter', title: 'Jeter', dataset: { lootIndex: index } }));

    itemCard.appendChild(itemInfo);
    itemCard.appendChild(itemActions);
    return itemCard;
}

/**
 * Rend l'interface utilisateur de la zone de butin.
 * @param {Item[]} droppedItems - Le tableau des items actuellement lâchés au sol.
 */
export function renderLootUI(droppedItems) {
    lootAreaEl.innerHTML = ''; // Vide la zone de butin
    if (!droppedItems) return;
    droppedItems.forEach((item, index) => {
        const itemCard = createLootItemCard(item, index);
        lootAreaEl.appendChild(itemCard); // Ajoute la carte de l'item au DOM
    });
}

