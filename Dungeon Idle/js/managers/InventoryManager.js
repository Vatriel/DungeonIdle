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

function determineTargetSlot(hero, item) {
    // Si l'objet est un anneau, on trouve un emplacement libre ou on prend le premier par défaut
    if (item.baseDefinition.slot === 'ring') {
        if (!hero.equipment.anneau1) return 'anneau1';
        if (!hero.equipment.anneau2) return 'anneau2';
        return 'anneau1'; // Remplacer le premier anneau par défaut
    }
    // Sinon, on retourne l'emplacement défini de l'objet
    return item.baseDefinition.slot;
}

function equipItem(state, hero, item, inventoryIndex, eventBus) {
    if (!item || !hero) return;

    // Vérification des restrictions de classe
    const classRestriction = item.baseDefinition.classRestriction;
    if (classRestriction && !classRestriction.includes(hero.id)) {
        eventBus.emit('notification_sent', { message: `Cet objet est réservé à la classe ${classRestriction.join(', ')}.`, type: 'error' });
        return;
    }
    
    // Vérification des restrictions de sous-type (ex: arme sacrée pour prêtre)
    const itemSubType = item.baseDefinition.subType;
    if (itemSubType) {
        const allowedSubTypes = hero.definition.allowedSubTypes?.[item.baseDefinition.slot];
        if (allowedSubTypes && !allowedSubTypes.includes(itemSubType)) {
            eventBus.emit('notification_sent', { message: `Ce type d'objet ne peut pas être équipé par un(e) ${hero.name}.`, type: 'error' });
            return;
        }
    }

    const targetSlot = determineTargetSlot(hero, item);
    const currentlyEquipped = hero.equipment[targetSlot];

    // On retire l'objet de l'inventaire
    if (inventoryIndex !== null) {
        state.inventory.splice(inventoryIndex, 1);
    }
    
    // On équipe le nouvel objet
    hero.equipItem(item, targetSlot);

    // Si un objet était déjà équipé, on le remet dans l'inventaire
    if (currentlyEquipped) {
        addItem(state, currentlyEquipped, eventBus);
    }
    
    state.ui.heroesNeedUpdate = true;
    state.ui.inventoryNeedsUpdate = true;
}


function equipItemFromDrag(state, inventoryIndex, heroId, eventBus) {
    const itemToEquip = state.inventory[inventoryIndex];
    const hero = state.heroes.find(h => h.id === heroId);
    equipItem(state, hero, itemToEquip, inventoryIndex, eventBus);
    cancelEquip(state); // On quitte le mode d'équipement après un drag-and-drop réussi
}


function equipItemOnHero(state, hero, eventBus) {
    if (!state.itemToEquip) return;
    const itemToEquip = state.inventory[state.itemToEquip.inventoryIndex];
    equipItem(state, hero, itemToEquip, state.itemToEquip.inventoryIndex, eventBus);
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
