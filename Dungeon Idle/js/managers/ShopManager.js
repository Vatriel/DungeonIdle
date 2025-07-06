// js/managers/ShopManager.js

import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { Item } from '../entities/Item.js';
// Cette ligne est correcte, elle attend bien une exportation nommée "InventoryManager".
import { InventoryManager } from './InventoryManager.js';

const SHOP_RESTOCK_INTERVAL = 10; // Intervalle de réassort de la boutique en secondes
const MAX_SHOP_ITEMS = 8; // Nombre maximal d'items dans la boutique

/**
 * Met à jour la logique de la boutique, notamment le réassort.
 * @param {object} state - L'état global du jeu.
 * @param {number} dt - Le temps écoulé depuis la dernière mise à jour.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function update(state, dt, eventBus) {
    state.shopRestockTimer += dt;
    if (state.shopRestockTimer >= SHOP_RESTOCK_INTERVAL) {
        state.shopRestockTimer = 0;
        restock(state); // Réapprovisionne la boutique
    }
}

/**
 * Réapprovisionne la boutique avec un nouvel item aléatoire.
 * @param {object} state - L'état global du jeu.
 */
function restock(state) {
    // Ne réapprovisionne pas si la boutique est pleine
    if (state.shopItems.length >= MAX_SHOP_ITEMS) return;
    
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)]; // Choisit un item aléatoire
    const itemDef = ITEM_DEFINITIONS[randomKey];
    
    // Le niveau de l'item est basé sur l'étage actuel du donjon
    const itemLevel = state.dungeonFloor;
    
    // Crée un nouvel item, en passant l'étage actuel pour la logique de rareté
    const newItem = new Item(itemDef, itemLevel, state.dungeonFloor); 
    newItem.isLocked = false; // Les items réapprovisionnés ne sont pas verrouillés par défaut
    
    state.shopItems.push(newItem); // Ajoute le nouvel item à la boutique
    state.ui.shopNeedsUpdate = true; // Signale une mise à jour de l'UI de la boutique
}

/**
 * Permet au joueur d'acheter un item de la boutique.
 * @param {object} state - L'état global du jeu.
 * @param {number} itemIndex - L'index de l'item à acheter dans le tableau de la boutique.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function buyItem(state, itemIndex, eventBus) {
    const item = state.shopItems[itemIndex];
    if (!item) return; // Si l'item n'existe pas

    // Vérifie si le joueur a assez d'or
    if (state.gold < item.cost) {
        eventBus.emit('notification_sent', { message: "Pas assez d'or !", type: 'error' });
        return;
    }
    
    // Tente d'ajouter l'item à l'inventaire via InventoryManager (qui gère déjà les notifications si l'inventaire est plein)
    if (!InventoryManager.addItem(state, item, eventBus)) {
        return; // L'achat échoue si l'inventaire est plein
    }
  
    state.gold -= item.cost; // Déduit le coût de l'or du joueur
    state.shopItems.splice(itemIndex, 1); // Retire l'item de la boutique
    state.ui.shopNeedsUpdate = true; // Signale une mise à jour de l'UI de la boutique
    
    eventBus.emit('notification_sent', { message: "Achat réussi !", type: 'success' }); // Notification de succès
}

/**
 * Vide la boutique de tous les items non verrouillés.
 * @param {object} state - L'état global du jeu.
 */
function clearShop(state) {
    // Filtre les items pour ne garder que ceux qui sont "isLocked"
    state.shopItems = state.shopItems.filter(item => item.isLocked);
    state.ui.shopNeedsUpdate = true; // Signale une mise à jour de l'UI de la boutique
}

export const ShopManager = {
    update,
    buyItem,
    clearShop,
};

