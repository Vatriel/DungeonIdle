// js/ui/InventoryUI.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { createElement } from '../utils/domHelper.js';

const inventoryGridEl = document.getElementById('inventory-grid');

/**
 * CORRIGÉ : La fonction crée maintenant des cartes détaillées, similaires à celles du marchand.
 * @param {Item} item - L'item à afficher.
 * @param {number} index - L'index de l'item dans l'inventaire.
 * @returns {HTMLElement} La carte de l'item pour l'inventaire.
 */
function createInventoryItemCard(item, index) {
    // Le conteneur principal de la carte
    const itemCard = createElement('div', { 
        className: `inventory-item rarity-${item.rarity}`,
        dataset: { inventoryIndex: index } 
    });
    itemCard.draggable = true; // Rend la carte entière draggable

    // Conteneur pour les informations textuelles
    const itemInfo = createElement('div', { className: 'item-info' });
    itemInfo.appendChild(createElement('p', { className: 'item-name', textContent: item.name }));
    
    // Statistique principale
    const primaryStatValue = item.stats[item.baseDefinition.stat];
    const primaryStatName = item.baseDefinition.stat;
    itemInfo.appendChild(createElement('p', { className: 'item-stats', textContent: `+${primaryStatValue} ${primaryStatName}` }));

    // Affixes (bonus/malus)
    Object.entries(item.stats).forEach(([stat, value]) => {
        if (stat === item.baseDefinition.stat) return;
        const affixInfo = AFFIX_DEFINITIONS[stat];
        if (!affixInfo) return;

        const text = affixInfo.text.replace('X', value > 0 ? value : -value);
        const sign = value > 0 ? '+' : '-';
        const affixClass = value > 0 ? 'item-affix' : 'item-affix stat-malus';
        itemInfo.appendChild(createElement('p', { className: affixClass, textContent: `${sign}${text.substring(1)}` }));
    });
    
    // Conteneur pour les actions (bouton "Jeter")
    const itemActions = createElement('div', { className: 'item-actions' });
    const discardBtn = createElement('button', { 
        className: 'item-action-btn discard-btn inventory-discard-btn', 
        textContent: 'Jeter',
        title: 'Jeter l\'objet',
        dataset: { inventoryIndex: index }
    });
    itemActions.appendChild(discardBtn);

    itemCard.appendChild(itemInfo);
    itemCard.appendChild(itemActions);
    
    return itemCard;
}

/**
 * CORRIGÉ : Rend l'interface de l'inventaire en utilisant les nouvelles cartes.
 * @param {Item[]} inventory - Le tableau des items dans l'inventaire.
 * @param {Item|null} itemToEquip - L'item actuellement sélectionné pour être équipé.
 */
export function renderInventory(inventory, itemToEquip) {
    if (!inventoryGridEl) return;

    const items = inventory || [];
    inventoryGridEl.innerHTML = '';

    items.forEach((item, index) => {
        const itemCard = createInventoryItemCard(item, index);

        // Ajoute une classe 'selected' si l'item est en cours d'équipement
        if (itemToEquip && itemToEquip.inventoryIndex === index) {
            itemCard.classList.add('selected');
        }

        // Ajout des écouteurs pour le drag-and-drop
        itemCard.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', index);
            event.dataTransfer.effectAllowed = 'move';
            setTimeout(() => itemCard.classList.add('dragging'), 0);
        });

        itemCard.addEventListener('dragend', () => {
            itemCard.classList.remove('dragging');
        });

        inventoryGridEl.appendChild(itemCard);
    });
}
