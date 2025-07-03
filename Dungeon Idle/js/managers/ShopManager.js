// js/managers/ShopManager.js

import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { Item } from '../entities/Item.js';
import { InventoryManager } from './InventoryManager.js';

const SHOP_RESTOCK_INTERVAL = 10;
const MAX_SHOP_ITEMS = 8;

function update(state, dt, eventBus) {
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
    newItem.isLocked = false;
    state.shopItems.push(newItem);
    state.ui.shopNeedsUpdate = true;
}

function buyItem(state, itemIndex, eventBus) {
    const item = state.shopItems[itemIndex];
    if (!item) return;

    if (state.gold < item.cost) {
        eventBus.emit('notification_sent', { message: "Pas assez d'or !", type: 'error' });
        return;
    }
    
    // InventoryManager.addItem gère déjà la notification si l'inventaire est plein
    if (!InventoryManager.addItem(state, item, eventBus)) {
        return;
    }
  
    state.gold -= item.cost;
    state.shopItems.splice(itemIndex, 1);
    state.ui.shopNeedsUpdate = true;
    
    eventBus.emit('notification_sent', { message: "Achat réussi !", type: 'success' });
}

function clearShop(state) {
    state.shopItems = state.shopItems.filter(item => item.isLocked);
    state.ui.shopNeedsUpdate = true;
}

export const ShopManager = {
    update,
    buyItem,
    clearShop,
};
