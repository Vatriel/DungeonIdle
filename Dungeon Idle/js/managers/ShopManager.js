// js/managers/ShopManager.js

import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { Item } from '../entities/Item.js';
import { InventoryManager } from './InventoryManager.js';

const SHOP_RESTOCK_INTERVAL = 10;
const MAX_SHOP_ITEMS = 8;

function update(state, dt) {
    state.shopRestockTimer += dt;
    if (state.shopRestockTimer >= SHOP_RESTOCK_INTERVAL) {
        state.shopRestockTimer = 0;
        restock(state);
    }
}

function restock(state) {
    if (state.shopItems.length >= MAX_SHOP_ITEMS) return;
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const itemDef = ITEM_DEFINITIONS[randomKey];
    const itemLevel = state.dungeonFloor;
    const newItem = new Item(itemDef, itemLevel);
    newItem.isLocked = false; // NOUVEAU : Initialise la propriété
    state.shopItems.push(newItem);
    state.ui.shopNeedsUpdate = true;
}

function buyItem(state, itemIndex) {
    const item = state.shopItems[itemIndex];
    if (!item) return;

    if (state.gold < item.cost) {
        state.notifications.push({ message: "Pas assez d'or !", type: 'error' });
        return;
    }
    
    if (!InventoryManager.addItem(state, item)) {
        state.notifications.push({ message: "Inventaire plein !", type: 'error' });
        return;
    }
  
    state.gold -= item.cost;
    state.shopItems.splice(itemIndex, 1);
    state.ui.shopNeedsUpdate = true;
    
    state.notifications.push({ message: "Achat réussi !", type: 'success' });
}

// MODIFIÉ : Ne supprime que les objets non verrouillés
function clearShop(state) {
    state.shopItems = state.shopItems.filter(item => item.isLocked);
    state.ui.shopNeedsUpdate = true;
}

export const ShopManager = {
    update,
    buyItem,
    clearShop,
};
