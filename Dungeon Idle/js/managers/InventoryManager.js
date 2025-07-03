// js/managers/InventoryManager.js

const MAX_INVENTORY_SIZE = 24;
const MAX_DROPPED_ITEMS = 6;

function isInventoryFull(state) {
    return state.inventory.length >= MAX_INVENTORY_SIZE;
}

function addItem(state, item, eventBus) {
    if (isInventoryFull(state)) {
        if (eventBus) {
            eventBus.emit('notification_sent', { message: "Inventaire plein !", type: 'error' });
        }
        return false;
    }
    state.inventory.push(item);
    state.ui.inventoryNeedsUpdate = true;
    return true;
}

function equipItemFromDrag(state, inventoryIndex, heroId, eventBus) {
    const itemToEquip = state.inventory[inventoryIndex];
    const hero = state.heroes.find(h => h.id === heroId);

    if (!itemToEquip || !hero) {
        console.error("Erreur lors de l'équipement par drag-and-drop : objet ou héros non trouvé.");
        return;
    }

    const classRestriction = itemToEquip.baseDefinition.classRestriction;
    if (classRestriction && !classRestriction.includes(hero.id)) {
        eventBus.emit('notification_sent', { message: `Cet objet est réservé à la classe ${classRestriction.join(', ')}.`, type: 'error' });
        return;
    }
    
    const itemSubType = itemToEquip.baseDefinition.subType;
    if (itemSubType) {
        const allowedSubTypes = hero.definition.allowedSubTypes?.[itemToEquip.baseDefinition.slot];
        if (allowedSubTypes && !allowedSubTypes.includes(itemSubType)) {
            eventBus.emit('notification_sent', { message: `Ce type d'objet ne peut pas être équipé par un(e) ${hero.name}.`, type: 'error' });
            return;
        }
    }

    const currentlyEquipped = hero.equipment[itemToEquip.baseDefinition.slot];
    state.inventory.splice(inventoryIndex, 1);
    hero.equipItem(itemToEquip);

    if (currentlyEquipped) {
        addItem(state, currentlyEquipped, eventBus);
    }
    
    state.ui.heroesNeedUpdate = true;
    state.ui.inventoryNeedsUpdate = true;
}


function equipItemOnHero(state, hero, eventBus) {
    if (!state.itemToEquip || !hero) return;

    const itemToEquip = state.inventory[state.itemToEquip.inventoryIndex];
    if (!itemToEquip) return;

    const classRestriction = itemToEquip.baseDefinition.classRestriction;
    if (classRestriction && !classRestriction.includes(hero.id)) {
        eventBus.emit('notification_sent', { message: `Cet objet est réservé à la classe ${classRestriction.join(', ')}.`, type: 'error' });
        cancelEquip(state);
        return;
    }
    
    const itemSubType = itemToEquip.baseDefinition.subType;
    if (itemSubType) {
        const allowedSubTypes = hero.definition.allowedSubTypes?.[itemToEquip.baseDefinition.slot];
        if (allowedSubTypes && !allowedSubTypes.includes(itemSubType)) {
            eventBus.emit('notification_sent', { message: `Ce type d'objet ne peut pas être équipé par un(e) ${hero.name}.`, type: 'error' });
            cancelEquip(state);
            return;
        }
    }

    const currentlyEquipped = hero.equipment[itemToEquip.baseDefinition.slot];
    state.inventory.splice(state.itemToEquip.inventoryIndex, 1);
    hero.equipItem(itemToEquip);

    if (currentlyEquipped) {
        addItem(state, currentlyEquipped, eventBus);
    }
    
    state.ui.heroesNeedUpdate = true;
    cancelEquip(state);
}

function unequipItemFromHero(state, hero, slot, eventBus) {
    if (isInventoryFull(state)) {
        eventBus.emit('notification_sent', { message: "Inventaire plein pour déséquiper !", type: 'error' });
        return;
    }

    const itemToUnequip = hero.unequipItem(slot);

    if (itemToUnequip) {
        addItem(state, itemToUnequip, eventBus);
        state.ui.heroesNeedUpdate = true;
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

function pickupItem(state, itemIndex, eventBus) {
    const item = state.droppedItems.splice(itemIndex, 1)[0];
    if (!item) return;
    state.ui.lootNeedsUpdate = true;
    addItem(state, item, eventBus);
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

// CORRECTION : C'est ce bloc qui doit être présent et correct.
// Il rassemble toutes les fonctions du fichier dans un seul objet
// et l'exporte sous le nom "InventoryManager".
export const InventoryManager = {
    addItem,
    equipItemOnHero,
    equipItemFromDrag,
    unequipItemFromHero,
    selectItemToEquip,
    cancelEquip,
    pickupItem,
    addDroppedItem,
    discardLootItem,
    discardInventoryItem,
};
