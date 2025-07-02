// js/managers/InventoryManager.js

const MAX_INVENTORY_SIZE = 24;
const MAX_DROPPED_ITEMS = 6;

// --- Fonctions internes ---

function isInventoryFull(state) {
    return state.inventory.length >= MAX_INVENTORY_SIZE;
}

// --- Fonctions publiques ---

/**
 * Ajoute un objet à l'inventaire s'il y a de la place.
 * @param {object} state - L'objet state complet du jeu.
 * @param {Item} item - L'instance de l'objet à ajouter.
 * @returns {boolean} - True si l'objet a été ajouté, false sinon.
 */
function addItem(state, item) {
    if (isInventoryFull(state)) {
        console.log("Inventaire plein ! L'objet est jeté.");
        return false;
    }
    state.inventory.push(item);
    return true;
}

/**
 * Équipe un objet depuis l'inventaire sur un héros.
 * @param {object} state - L'objet state du jeu.
 * @param {Hero} hero - Le héros qui va s'équiper.
 */
function equipItemOnHero(state, hero) {
    if (!state.itemToEquip || !hero) return;

    const itemToEquip = state.inventory[state.itemToEquip.inventoryIndex];
    if (!itemToEquip) return;

    const slot = itemToEquip.baseDefinition.slot;
    const currentlyEquipped = hero.equipment[slot];

    state.inventory.splice(state.itemToEquip.inventoryIndex, 1);
    hero.equipItem(itemToEquip);

    if (currentlyEquipped) {
        addItem(state, currentlyEquipped);
    }
    
    cancelEquip(state);
}

/**
 * Déséquipe un objet d'un héros et le renvoie à l'inventaire.
 * @param {object} state - L'objet state du jeu.
 * @param {Hero} hero - Le héros concerné.
 * @param {string} slot - L'emplacement de l'objet ('arme', 'torse', etc.).
 */
function unequipItemFromHero(state, hero, slot) {
    const itemToUnequip = hero.equipment[slot];
    if (!itemToUnequip) return;

    if (isInventoryFull(state)) {
        console.log("Impossible de déséquiper, l'inventaire est plein !");
        return;
    }

    addItem(state, itemToUnequip);
    hero.equipment[slot] = null;

    if (hero.hp > hero.maxHp) {
        hero.hp = hero.maxHp;
    }
}

/**
 * Sélectionne un objet dans l'inventaire pour préparer son équipement.
 * @param {object} state - L'objet state du jeu.
 * @param {number} itemIndex - L'index de l'objet dans l'inventaire.
 */
function selectItemToEquip(state, itemIndex) {
    if(state.inventory[itemIndex]) {
        if (state.itemToEquip && state.itemToEquip.inventoryIndex === itemIndex) {
            cancelEquip(state);
        } else {
            state.itemToEquip = { ...state.inventory[itemIndex], inventoryIndex: itemIndex };
        }
    }
}

/**
 * Annule le mode "équipement".
 * @param {object} state - L'objet state du jeu.
 */
function cancelEquip(state) {
    state.itemToEquip = null;
}

/**
 * Ramasse un objet au sol et l'ajoute à l'inventaire.
 * @param {object} state - L'objet state du jeu.
 * @param {number} itemIndex - L'index de l'objet dans le tableau droppedItems.
 */
function pickupItem(state, itemIndex) {
    const item = state.droppedItems.splice(itemIndex, 1)[0];
    if (!item) return;
    addItem(state, item);
}

/**
 * Ajoute un objet à la liste du butin au sol.
 * @param {object} state - L'objet state du jeu.
 * @param {Item} item - L'objet à ajouter.
 */
function addDroppedItem(state, item) {
    if (state.droppedItems.length >= MAX_DROPPED_ITEMS) {
        state.droppedItems.shift();
    }
    state.droppedItems.push(item);
}

/**
 * Jette définitivement un objet du butin au sol.
 * @param {object} state - L'objet state du jeu.
 * @param {number} itemIndex - L'index de l'objet à jeter.
 */
function discardLootItem(state, itemIndex) {
    state.droppedItems.splice(itemIndex, 1);
}

/**
 * Jette définitivement un objet de l'inventaire.
 * @param {object} state - L'objet state du jeu.
 * @param {number} itemIndex - L'index de l'objet à jeter.
 */
function discardInventoryItem(state, itemIndex) {
    if (state.itemToEquip && state.itemToEquip.inventoryIndex === itemIndex) {
        cancelEquip(state);
    }
    state.inventory.splice(itemIndex, 1);
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
