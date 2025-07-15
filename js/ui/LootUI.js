// js/ui/LootUI.js

import { createElement } from '../utils/domHelper.js';
import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { UNIQUE_EFFECT_DESCRIPTIONS } from '../data/uniqueEffectData.js';
import { state } from '../core/StateManager.js';
import { eventBus } from '../core/EventBus.js';

const lootItemsGrid = document.getElementById('loot-area');
const pickAllLootButton = document.getElementById('pick-all-loot-button');

function createLootItemCard(item, index) {
    const card = createElement('div', { className: `item-card loot-item-card rarity-${item.rarity.toLowerCase()}` });
    card.dataset.itemIndex = index;

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
        
        const statLine = createElement('p', { className: 'item-stat-line', textContent: `${prefix}${value.toFixed(affixDef.isPercent ? 1 : 0)}${suffix} ${statName}` });
        
        if (item.implicitStatKeys && item.implicitStatKeys.includes(statKey)) {
            statLine.classList.add('implicit-stat');
        }

        statsDiv.appendChild(statLine);
    }
    
    if (item.baseDefinition.uniqueEffect) {
        const effectDescription = UNIQUE_EFFECT_DESCRIPTIONS[item.baseDefinition.uniqueEffect];
        if (effectDescription) {
            statsDiv.appendChild(createElement('p', { className: 'item-unique-effect', textContent: effectDescription }));
        }
    }
    
    card.appendChild(statsDiv);

    const footer = createElement('div', { className: 'item-card-footer' });
    const discardButton = createElement('button', {
        className: 'btn discard-btn',
        textContent: 'Jeter',
        dataset: { itemIndex: index },
        onclick: () => {
            eventBus.emit('ui_discard_loot_item_clicked', { itemInstanceId: state.droppedItems[index]?.instanceId });
        }
    });
    footer.appendChild(discardButton);
    const pickButton = createElement('button', {
        className: 'btn pick-item-btn',
        textContent: 'Ramasser',
        dataset: { itemIndex: index },
        onclick: () => {
            eventBus.emit('ui_pick_item_clicked', { itemIndex });
        }
    });
    footer.appendChild(pickButton);
    card.appendChild(footer);

    return card;
}

export function initLootUI() {
    if (pickAllLootButton) {
        pickAllLootButton.addEventListener('click', () => {
            eventBus.emit('ui_pick_all_loot_clicked');
        });
    }

    if (lootItemsGrid) {
        lootItemsGrid.addEventListener('click', (e) => {
            const pickButton = e.target.closest('.pick-item-btn');
            const discardButton = e.target.closest('.discard-btn'); 
            
            if (pickButton) {
                const itemIndex = parseInt(pickButton.dataset.itemIndex, 10);
                eventBus.emit('ui_pick_item_clicked', { itemIndex });
            } else if (discardButton) { 
                const itemIndex = parseInt(discardButton.dataset.itemIndex, 10);
                eventBus.emit('ui_discard_loot_item_clicked', { itemInstanceId: state.droppedItems[itemIndex]?.instanceId });
            }
        });
    }
}

export function renderLootUI(droppedItems) {
    if (!lootItemsGrid) return;

    lootItemsGrid.innerHTML = '';

    if (!droppedItems || droppedItems.length === 0) {
        lootItemsGrid.innerHTML = '<p>Aucun butin à ramasser.</p>';
        if (pickAllLootButton) pickAllLootButton.style.display = 'none';
        return;
    } else {
        if (pickAllLootButton) pickAllLootButton.style.display = 'block';
    }

    droppedItems.forEach((item, index) => {
        // CORRECTION : Appel de la bonne fonction
        const itemCard = createLootItemCard(item, index);
        lootItemsGrid.appendChild(itemCard);
    });
}
