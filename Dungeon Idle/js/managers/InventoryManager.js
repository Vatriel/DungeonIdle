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

function equipItemOnHero(state, hero, eventBus) {
    if (!state.itemToEquip || !hero) return;

    const itemToEquip = state.inventory[state.itemToEquip.inventoryIndex];
    if (!itemToEquip) return;

        // --- NOUVELLE LOGIQUE DE VÉRIFICATION ---
    // 1. Restriction de classe
    const classRestriction = itemToEquip.baseDefinition.classRestriction;
    if (classRestriction && !classRestriction.includes(hero.id)) {
        eventBus.emit('notification_sent', { message: `Cet objet est réservé à la classe ${classRestriction.join(', ')}.`, type: 'error' });
        cancelEquip(state);
        return;
    }
    
    // 2. Restriction de sous-type d'objet
    const itemSubType = itemToEquip.baseDefinition.subType;
    if (itemSubType) {
        const allowedSubTypes = hero.definition.allowedSubTypes?.[itemToEquip.baseDefinition.slot];
        if (allowedSubTypes && !allowedSubTypes.includes(itemSubType)) {
            eventBus.emit('notification_sent', { message: `Ce type d'objet ne peut pas être équipé par un(e) ${hero.name}.`, type: 'error' });
            cancelEquip(state);
            return;
        }
    }

    const restriction = itemToEquip.baseDefinition.classRestriction;
    if (restriction && !restriction.includes(hero.id)) {
        eventBus.emit('notification_sent', {
            message: `Cet objet ne peut pas être équipé par un(e) ${hero.name}.`,
            type: 'error'
        });
        cancelEquip(state);
        return;
    }

    // On récupère l'objet actuellement équipé AVANT d'équiper le nouveau
    const currentlyEquipped = hero.equipment[itemToEquip.baseDefinition.slot];

    // On retire le nouvel objet de l'inventaire
    state.inventory.splice(state.itemToEquip.inventoryIndex, 1);
    
    // La méthode equipItem du héros s'occupe de la logique interne
    hero.equipItem(itemToEquip);

    // Si un objet était déjà équipé, on l'ajoute à l'inventaire
    if (currentlyEquipped) {
        addItem(state, currentlyEquipped, eventBus);
    }
    
    state.ui.heroesNeedUpdate = true;
    cancelEquip(state);
}

// --- MODIFICATION MAJEURE ICI ---
function unequipItemFromHero(state, hero, slot, eventBus) {
    if (isInventoryFull(state)) {
        eventBus.emit('notification_sent', { message: "Inventaire plein pour déséquiper !", type: 'error' });
        return;
    }

    // On appelle la méthode du héros, qui s'occupe de la logique
    // et nous retourne l'objet qui a été déséquipé.
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
