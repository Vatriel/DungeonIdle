// js/managers/InventoryManager.js

const MAX_INVENTORY_SIZE = 24;
const MAX_DROPPED_ITEMS = 6;

function isInventoryFull(state) {
    return state.inventory.length >= MAX_INVENTORY_SIZE;
}

function addItem(state, item) {
    if (isInventoryFull(state)) {
        console.log("Inventaire plein ! L'objet est jeté.");
        state.notifications.push({ message: "Inventaire plein !", type: 'error' });
        return false;
    }
    state.inventory.push(item);
    state.ui.inventoryNeedsUpdate = true; // NOUVEAU
    return true;
}

function equipItemOnHero(state, hero) {
    if (!state.itemToEquip || !hero) return;

    const itemToEquip = state.inventory[state.itemToEquip.inventoryIndex];
    if (!itemToEquip) return;

    const slot = itemToEquip.baseDefinition.slot;
    const currentlyEquipped = hero.equipment[slot];

    state.inventory.splice(state.itemToEquip.inventoryIndex, 1);
    hero.equipItem(itemToEquip);

    if (currentlyEquipped) {
        addItem(state, currentlyEquipped); // addItem lèvera le drapeau pour l'inventaire
    } else {
        state.ui.inventoryNeedsUpdate = true; // NOUVEAU : Si rien n'est ré-ajouté, il faut quand même rafraîchir
    }
    
    state.ui.heroesNeedUpdate = true; // NOUVEAU
    cancelEquip(state);
}

function unequipItemFromHero(state, hero, slot) {
    const itemToUnequip = hero.equipment[slot];
    if (!itemToUnequip) return;

    if (isInventoryFull(state)) {
        console.log("Impossible de déséquiper, l'inventaire est plein !");
        state.notifications.push({ message: "Inventaire plein pour déséquiper !", type: 'error' });
        return;
    }

    addItem(state, itemToUnequip); // addItem lèvera le drapeau
    hero.equipment[slot] = null;
    state.ui.heroesNeedUpdate = true; // NOUVEAU

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
        // NOUVEAU : Rafraîchir l'inventaire (pour le style 'selected') et les héros (pour la comparaison)
        state.ui.inventoryNeedsUpdate = true;
        state.ui.heroesNeedUpdate = true;
    }
}

function cancelEquip(state) {
    state.itemToEquip = null;
    // NOUVEAU : On annule la comparaison sur les héros et la sélection dans l'inventaire
    state.ui.inventoryNeedsUpdate = true;
    state.ui.heroesNeedUpdate = true;
}

function pickupItem(state, itemIndex) {
    const item = state.droppedItems.splice(itemIndex, 1)[0];
    if (!item) return;
    state.ui.lootNeedsUpdate = true; // NOUVEAU
    addItem(state, item); // addItem lèvera le drapeau pour l'inventaire
}

function addDroppedItem(state, item) {
    if (state.droppedItems.length >= MAX_DROPPED_ITEMS) {
        state.droppedItems.shift();
    }
    state.droppedItems.push(item);
    state.ui.lootNeedsUpdate = true; // NOUVEAU
}

function discardLootItem(state, itemIndex) {
    state.droppedItems.splice(itemIndex, 1);
    state.ui.lootNeedsUpdate = true; // NOUVEAU
}

function discardInventoryItem(state, itemIndex) {
    if (state.itemToEquip && state.itemToEquip.inventoryIndex === itemIndex) {
        cancelEquip(state);
    }
    state.inventory.splice(itemIndex, 1);
    state.ui.inventoryNeedsUpdate = true; // NOUVEAU
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
