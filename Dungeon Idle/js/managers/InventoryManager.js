// js/managers/InventoryManager.js

const MAX_INVENTORY_SIZE = 24;

/**
 * Ajoute un objet à l'inventaire s'il y a de la place.
 * @param {object} state - L'objet state complet du jeu.
 * @param {Item} item - L'instance de l'objet à ajouter.
 * @returns {boolean} - True si l'objet a été ajouté, false sinon.
 */
function addItem(state, item) {
    if (state.inventory.length >= MAX_INVENTORY_SIZE) {
        console.log("Inventaire plein ! L'objet est jeté.");
        return false;
    }
    state.inventory.push(item);
    return true;
}

/**
 * Retire un objet de l'inventaire à un index donné.
 * @param {object} state - L'objet state du jeu.
 * @param {number} itemIndex - L'index de l'objet à retirer.
 */
function removeItem(state, itemIndex) {
    if (state.inventory[itemIndex]) {
        state.inventory.splice(itemIndex, 1);
    }
}

/**
 * Équipe un objet depuis l'inventaire sur un héros.
 * @param {object} state - L'objet state du jeu.
 * @param {Hero} hero - Le héros qui va s'équiper.
 * @param {number} itemIndex - L'index de l'objet dans l'inventaire.
 */
function equipItem(state, hero, itemIndex) {
    const itemToEquip = state.inventory[itemIndex];
    if (!hero || !itemToEquip) return;

    const slot = itemToEquip.baseDefinition.slot;
    const currentlyEquipped = hero.equipment[slot];

    // On retire l'objet de l'inventaire
    removeItem(state, itemIndex);
    
    // On équipe le nouvel objet
    hero.equipItem(itemToEquip);

    // Si un objet était déjà équipé, on le remet dans l'inventaire
    if (currentlyEquipped) {
        addItem(state, currentlyEquipped);
    }
}


export const InventoryManager = {
    addItem,
    removeItem,
    equipItem,
};
