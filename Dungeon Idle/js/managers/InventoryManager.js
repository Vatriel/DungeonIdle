// js/managers/InventoryManager.js

const MAX_INVENTORY_SIZE = 24;
const MAX_DROPPED_ITEMS = 6;

function isInventoryFull(state) {
    return state.inventory.length >= MAX_INVENTORY_SIZE;
}

function addItem(state, item) {
    if (isInventoryFull(state)) {
        state.notifications.push({ message: "Inventaire plein !", type: 'error' });
        return false;
    }
    state.inventory.push(item);
    state.ui.inventoryNeedsUpdate = true;
    return true;
}

function equipItemOnHero(state, hero) {
    if (!state.itemToEquip || !hero) return;

    const itemToEquip = state.inventory[state.itemToEquip.inventoryIndex];
    if (!itemToEquip) return;

    // NOUVEAU : Vérification de la restriction de classe
    const restriction = itemToEquip.baseDefinition.classRestriction;
    if (restriction && !restriction.includes(hero.id)) {
        state.notifications.push({
            message: `Cet objet ne peut pas être équipé par un(e) ${hero.name}.`,
            type: 'error'
        });
        cancelEquip(state);
        return;
    }

    const slot = itemToEquip.baseDefinition.slot;
    const currentlyEquipped = hero.equipment[slot];

    state.inventory.splice(state.itemToEquip.inventoryIndex, 1);
    hero.equipItem(itemToEquip);

    if (currentlyEquipped) {
        addItem(state, currentlyEquipped);
    } else {
        state.ui.inventoryNeedsUpdate = true;
    }
    
    state.ui.heroesNeedUpdate = true;
    cancelEquip(state);
}

function unequipItemFromHero(state, hero, slot) {
    const itemToUnequip = hero.equipment[slot];
    if (!itemToUnequip) return;

    if (isInventoryFull(state)) {
        state.notifications.push({ message: "Inventaire plein pour déséquiper !", type: 'error' });
        return;
    }

    addItem(state, itemToUnequip);
    hero.equipment[slot] = null;
    state.ui.heroesNeedUpdate = true;

    if (hero.hp > hero.maxHp) {
        hero.hp = hero.maxHp;
    }
}

function selectItemToEquip(state, itemIndex) {
    if(state.inventory[itemIndex]) {
        if (state.itemToEquip && state.itemToEquip.inventoryIndex === itemIndex) {
            cancelEquip(state);
        } else {
            state.itemToEquip = { ...state.inventory[itemIndex], inventoryIndex: itemIndex };
        }
        state.ui.inventoryNeedsUpdate = true;
        state.ui.heroesNeedUpdate = true;
    }
}

function cancelEquip(state) {
    state.itemToEquip = null;
    state.ui.inventoryNeedsUpdate = true;
    state.ui.heroesNeedUpdate = true;
}

function pickupItem(state, itemIndex) {
    const item = state.droppedItems.splice(itemIndex, 1)[0];
    if (!item) return;
    state.ui.lootNeedsUpdate = true;
    addItem(state, item);
}

function addDroppedItem(state, item) {
    if (state.droppedItems.length >= MAX_DROPPED_ITEMS) {
        state.droppedItems.shift();
    }
    state.droppedItems.push(item);
    state.ui.lootNeedsUpdate = true;
}

function discardLootItem(state, itemIndex) {
    state.droppedItems.splice(itemIndex, 1);
    state.ui.lootNeedsUpdate = true;
}

function discardInventoryItem(state, itemIndex) {
    if (state.itemToEquip && state.itemToEquip.inventoryIndex === itemIndex) {
        cancelEquip(state);
    }
    state.inventory.splice(itemIndex, 1);
    state.ui.inventoryNeedsUpdate = true;
}

export const InventoryManager = {
    addItem,
    equipItemOnHero,
    unequipItemFromHero,
    selectItemToEquip,
    cancelEquip,
    pickupItem,
    addDroppedItem,
    discardLootItem,
    discardInventoryItem,
};
