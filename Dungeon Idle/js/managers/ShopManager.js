// js/managers/ShopManager.js

import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { Item } from '../entities/Item.js';
import { InventoryManager } from './InventoryManager.js';
import { showNotification } from '../ui/UIUpdater.js';

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
    state.shopItems.push(newItem);
}

function buyItem(state, itemIndex) {
    const item = state.shopItems[itemIndex];
    if (!item) return;

    if (state.gold < item.cost) {
        showNotification("Pas assez d'or !");
        return;
    }
    
    if (!InventoryManager.addItem(state, item)) {
        showNotification("Inventaire plein !");
        return;
    }
  
    state.gold -= item.cost;
    state.shopItems.splice(itemIndex, 1);
    showNotification("Achat réussi !", "success");
}

function clearShop(state) {
    state.shopItems = [];
}

export const ShopManager = {
    update,
    buyItem,
    clearShop,
};
