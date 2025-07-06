// js/managers/InventoryManager.js

const MAX_INVENTORY_SIZE = 24; // Taille maximale de l'inventaire
const MAX_DROPPED_ITEMS = 6; // Nombre maximal d'items affichés au sol

/**
 * Vérifie si l'inventaire est plein.
 * @param {object} state - L'état global du jeu.
 * @returns {boolean} True si l'inventaire est plein, false sinon.
 */
function isInventoryFull(state) {
    return state.inventory.length >= MAX_INVENTORY_SIZE;
}

/**
 * Ajoute un item à l'inventaire.
 * @param {object} state - L'état global du jeu.
 * @param {Item} item - L'item à ajouter.
 * @param {EventBus} eventBus - Le bus d'événements pour les notifications.
 * @returns {boolean} True si l'item a été ajouté, false si l'inventaire est plein.
 */
function addItem(state, item, eventBus) {
    if (isInventoryFull(state)) {
        if (eventBus) {
            eventBus.emit('notification_sent', { message: "Inventaire plein !", type: 'error' });
        }
        return false;
    }
    state.inventory.push(item);
    state.ui.inventoryNeedsUpdate = true; // Signale une mise à jour de l'UI de l'inventaire
    return true;
}

/**
 * Détermine le slot d'équipement cible pour un item donné sur un héros.
 * Spécialement pour les anneaux.
 * @param {Hero} hero - Le héros sur lequel l'item sera équipé.
 * @param {Item} item - L'item à équiper.
 * @returns {string} Le nom du slot cible.
 */
function determineTargetSlot(hero, item) {
    // Si l'objet est un anneau, on trouve un emplacement libre ou on prend le premier par défaut.
    // Priorise anneau1, puis anneau2. Si les deux sont occupés, remplace anneau1.
    if (item.baseDefinition.slot === 'ring') {
        if (!hero.equipment.anneau1) return 'anneau1';
        if (!hero.equipment.anneau2) return 'anneau2';
        return 'anneau1'; // Remplace le premier anneau par défaut si les deux sont pleins
    }
    // Sinon, on retourne l'emplacement défini de l'objet (arme, torse, etc.)
    return item.baseDefinition.slot;
}

/**
 * Équipe un item sur un héros.
 * Gère le déséquipement de l'ancien item et son retour à l'inventaire.
 * @param {object} state - L'état global du jeu.
 * @param {Hero} hero - Le héros cible.
 * @param {Item} item - L'item à équiper.
 * @param {number|null} inventoryIndex - L'index de l'item dans l'inventaire (null si déjà déséquipé).
 * @param {EventBus} eventBus - Le bus d'événements.
 */
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

    const targetSlot = determineTargetSlot(hero, item); // Détermine le slot où équiper l'item
    const currentlyEquipped = hero.equipment[targetSlot]; // Récupère l'item actuellement équipé dans ce slot

    // On retire l'objet de l'inventaire si son index est fourni
    if (inventoryIndex !== null) {
        state.inventory.splice(inventoryIndex, 1);
    }
    
    hero.equipItem(item, targetSlot); // Équipe le nouvel item sur le héros

    // Si un objet était déjà équipé, on le remet dans l'inventaire
    if (currentlyEquipped) {
        addItem(state, currentlyEquipped, eventBus);
    }
    
    // Signale les mises à jour nécessaires de l'UI
    state.ui.heroesNeedUpdate = true;
    state.ui.inventoryNeedsUpdate = true;
}

/**
 * Équipe un item depuis l'inventaire sur un héros via un drag-and-drop.
 * @param {object} state - L'état global du jeu.
 * @param {number} inventoryIndex - L'index de l'item dans l'inventaire.
 * @param {string} heroId - L'ID du héros cible.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function equipItemFromDrag(state, inventoryIndex, heroId, eventBus) {
    const itemToEquip = state.inventory[inventoryIndex];
    const hero = state.heroes.find(h => h.id === heroId);
    equipItem(state, hero, itemToEquip, inventoryIndex, eventBus);
    cancelEquip(state); // Quitte le mode d'équipement après un drag-and-drop réussi
}

/**
 * Équipe l'item actuellement sélectionné (itemToEquip) sur un héros.
 * Utilisé pour le mode d'équipement par clic.
 * @param {object} state - L'état global du jeu.
 * @param {Hero} hero - Le héros cible.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function equipItemOnHero(state, hero, eventBus) {
    if (!state.itemToEquip) return;
    const itemToEquip = state.inventory[state.itemToEquip.inventoryIndex];
    equipItem(state, hero, itemToEquip, state.itemToEquip.inventoryIndex, eventBus);
    cancelEquip(state); // Annule le mode d'équipement après l'opération
}

/**
 * Déséquipe un item d'un héros et le place dans l'inventaire.
 * @param {object} state - L'état global du jeu.
 * @param {Hero} hero - Le héros source.
 * @param {string} slot - Le slot d'où déséquiper l'item.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function unequipItemFromHero(state, hero, slot, eventBus) {
    if (isInventoryFull(state)) {
        eventBus.emit('notification_sent', { message: "Inventaire plein pour déséquiper !", type: 'error' });
        return;
    }

    const itemToUnequip = hero.unequipItem(slot); // Déséquipe l'item du héros

    if (itemToUnequip) {
        addItem(state, itemToUnequip, eventBus); // Ajoute l'item déséquipé à l'inventaire
        state.ui.heroesNeedUpdate = true; // Signale une mise à jour de l'UI des héros
    }
}

/**
 * Sélectionne un item dans l'inventaire pour l'équiper (active le mode d'équipement).
 * @param {object} state - L'état global du jeu.
 * @param {number} itemIndex - L'index de l'item dans l'inventaire.
 */
function selectItemToEquip(state, itemIndex) {
    if(state.inventory[itemIndex]) {
        // Si l'item est déjà sélectionné, le désélectionne
        if (state.itemToEquip && state.itemToEquip.inventoryIndex === itemIndex) {
            cancelEquip(state);
        } else {
            // Sélectionne le nouvel item
            state.itemToEquip = { ...state.inventory[itemIndex], inventoryIndex: itemIndex };
        }
        // Signale les mises à jour nécessaires de l'UI
        state.ui.inventoryNeedsUpdate = true;
        state.ui.heroesNeedUpdate = true;
    }
}

/**
 * Annule le mode d'équipement (désélectionne l'item).
 * @param {object} state - L'état global du jeu.
 */
function cancelEquip(state) {
    state.itemToEquip = null;
    // Signale les mises à jour nécessaires de l'UI
    state.ui.inventoryNeedsUpdate = true;
    state.ui.heroesNeedUpdate = true;
}

/**
 * Ramasse un item du butin et le place dans l'inventaire.
 * @param {object} state - L'état global du jeu.
 * @param {number} itemIndex - L'index de l'item dans le tableau des items lâchés.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function pickupItem(state, itemIndex, eventBus) {
    const item = state.droppedItems.splice(itemIndex, 1)[0]; // Retire l'item des items lâchés
    if (!item) return;
    state.ui.lootNeedsUpdate = true; // Signale une mise à jour de l'UI du butin
    addItem(state, item, eventBus); // Ajoute l'item à l'inventaire
}

/**
 * Ajoute un item à la liste des items lâchés (butin).
 * Gère la limite maximale d'items lâchés.
 * @param {object} state - L'état global du jeu.
 * @param {Item} item - L'item à ajouter.
 */
function addDroppedItem(state, item) {
    if (state.droppedItems.length >= MAX_DROPPED_ITEMS) {
        state.droppedItems.shift(); // Retire le plus ancien item si la limite est atteinte
    }
    state.droppedItems.push(item); // Ajoute le nouvel item
    state.ui.lootNeedsUpdate = true; // Signale une mise à jour de l'UI du butin
}

/**
 * Jette un item du butin (le retire définitivement).
 * @param {object} state - L'état global du jeu.
 * @param {number} itemIndex - L'index de l'item dans le tableau des items lâchés.
 */
function discardLootItem(state, itemIndex) {
    state.droppedItems.splice(itemIndex, 1); // Retire l'item
    state.ui.lootNeedsUpdate = true; // Signale une mise à jour de l'UI du butin
}

/**
 * Jette un item de l'inventaire (le retire définitivement).
 * @param {object} state - L'état global du jeu.
 * @param {number} itemIndex - L'index de l'item dans l'inventaire.
 */
function discardInventoryItem(state, itemIndex) {
    // Si l'item jeté est celui actuellement sélectionné pour équiper, annule le mode d'équipement
    if (state.itemToEquip && state.itemToEquip.inventoryIndex === itemIndex) {
        cancelEquip(state);
    }
    state.inventory.splice(itemIndex, 1); // Retire l'item
    state.ui.inventoryNeedsUpdate = true; // Signale une mise à jour de l'UI de l'inventaire
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

