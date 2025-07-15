// js/ui/InventoryUI.js

// IMPORTS CORRIGÉS : Nous importons maintenant depuis les nouveaux modules.
import { state } from '../core/StateManager.js';
import { eventBus } from '../core/EventBus.js';

import { createElement } from '../utils/domHelper.js';
import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { UNIQUE_EFFECT_DESCRIPTIONS } from '../data/uniqueEffectData.js';

let inventoryList, inventoryFilter, inventorySort, inventorySearch;

function createItemCard(item) {
    const card = createElement('div', { className: `item-card rarity-${item.rarity.toLowerCase()}` });
    card.dataset.itemId = item.instanceId;

    if (state.itemToEquip && state.itemToEquip.instanceId === item.instanceId) {
        card.classList.add('equip-mode-selected');
    }

    const header = createElement('div', { className: 'item-card-header' });
    header.appendChild(createElement('span', { className: 'item-name', textContent: item.name }));
    header.appendChild(createElement('span', { className: 'item-level', textContent: `Niv. ${item.level}` }));
    card.appendChild(header);

    const statsDiv = createElement('div', { className: 'item-stats' });
    for (const statKey in item.stats) {
        const value = item.stats[statKey];
        const affixDef = AFFIX_DEFINITIONS[statKey];
        if (!affixDef) continue;

        const prefix = value > 0 ? '+' : '';
        const suffix = affixDef.isPercent ? '%' : '';
        const statName = affixDef.text.replace('X', '').trim();
        
        const statP = createElement('p', { className: 'item-stat-line', textContent: `${prefix}${value.toFixed(affixDef.isPercent ? 1 : 0)}${suffix} ${statName}` });
        
        if (item.implicitStatKeys && item.implicitStatKeys.includes(statKey)) {
            statP.classList.add('implicit-stat');
        }
        
        statsDiv.appendChild(statP);
    }
    
    if (item.baseDefinition.uniqueEffect) {
        const effectDescription = UNIQUE_EFFECT_DESCRIPTIONS[item.baseDefinition.uniqueEffect];
        if (effectDescription) {
            statsDiv.appendChild(createElement('p', { className: 'item-unique-effect', textContent: effectDescription }));
        }
    }
    
    card.appendChild(statsDiv);

    const footer = createElement('div', { className: 'item-card-footer' });
    const equipButton = createElement('button', { 
        textContent: 'Équiper', 
        className: 'btn', 
        onclick: () => {
            eventBus.emit('ui_equip_mode_toggled', { itemId: item.instanceId });
        }
    });
    footer.appendChild(equipButton);
    const discardButton = createElement('button', { 
        textContent: 'Jeter', 
        className: 'btn discard-btn', 
        onclick: () => {
            eventBus.emit('ui_sell_item_clicked', { itemId: item.instanceId });
        }
    });
    footer.appendChild(discardButton);
    card.appendChild(footer);

    return card;
}

function getSortedAndFilteredItems() {
    if (!inventoryFilter || !inventorySort || !inventorySearch) return state.inventory;

    const filter = inventoryFilter.value;
    const sort = inventorySort.value;
    const search = inventorySearch.value.toLowerCase();

    let items = [...state.inventory];

    if (filter !== 'all') {
        items = items.filter(item => {
            const type = item.baseDefinition.type;
            if (filter === 'weapon') return type === 'arme';
            if (filter === 'armor') return ['tete', 'torse', 'jambes', 'mains', 'pieds'].includes(type);
            if (filter === 'jewelry') return ['amulette', 'anneau1', 'anneau2'].includes(type) || item.baseDefinition.slot === 'ring';
            return type === filter;
        });
    }
    if (search) {
        items = items.filter(item => item.name.toLowerCase().includes(search));
    }

    items.sort((a, b) => {
        if (sort === 'rarity') {
            const rarityOrder = { 'defective': 0, 'common': 1, 'magic': 2, 'rare': 3, 'epic': 4, 'legendary': 5, 'mythic': 6, 'artifact': 7 };
            return (rarityOrder[b.rarity.toLowerCase()] || 0) - (rarityOrder[a.rarity.toLowerCase()] || 0);
        }
        if (sort === 'level') {
            return (b.level || 0) - (a.level || 0);
        }
        if (sort === 'name') {
            return a.name.localeCompare(b.name);
        }
        return 0;
    });

    return items;
}

export function renderInventory() {
    if (!inventoryList) return;
    inventoryList.innerHTML = '';
    const items = getSortedAndFilteredItems();
    items.forEach(item => {
        const itemCard = createItemCard(item);
        inventoryList.appendChild(itemCard);
    });
}

export function initInventoryUI() {
    inventoryList = document.getElementById('inventory-grid');
    inventoryFilter = document.getElementById('inventory-filter');
    inventorySort = document.getElementById('inventory-sort');
    inventorySearch = document.getElementById('inventory-search');

    if(inventoryFilter) inventoryFilter.addEventListener('change', renderInventory);
    if(inventorySort) inventorySort.addEventListener('change', renderInventory);
    if(inventorySearch) inventorySearch.addEventListener('input', renderInventory);
}
