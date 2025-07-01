// js/managers/ShopManager.js

import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { Item } from '../entities/Item.js';

const SHOP_RESTOCK_INTERVAL = 10; // Toutes les 10 secondes
const MAX_SHOP_ITEMS = 8;

/**
 * Gère la logique de réapprovisionnement de la boutique.
 * @param {object} state - L'objet state du jeu.
 * @param {number} dt - Le delta time de la frame actuelle.
 */
function update(state, dt) {
    state.shopRestockTimer += dt;
    if (state.shopRestockTimer >= SHOP_RESTOCK_INTERVAL) {
        state.shopRestockTimer = 0;
        restock(state);
    }
}

/**
 * Ajoute un nouvel objet à la boutique si elle n'est pas pleine.
 * @param {object} state - L'objet state du jeu.
 * @param {boolean} force - Si true, ignore la limite d'objets.
 */
function restock(state, force = false) {
    if (!force && state.shopItems.length >= MAX_SHOP_ITEMS) return;

    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const itemDef = ITEM_DEFINITIONS[randomKey];
    const itemLevel = state.dungeonFloor;
    const newItem = new Item(itemDef, itemLevel);

    state.shopItems.push(newItem);
}

/**
 * Gère l'achat d'un objet par le joueur.
 * @param {object} state - L'objet state du jeu.
 * @param {number} itemIndex - L'index de l'objet dans le tableau shopItems.
 */
function buyItem(state, itemIndex) {
    const item = state.shopItems[itemIndex];
    if (!item || state.gold < item.cost) {
        console.log("Action impossible ou pas assez d'or !");
        return;
    }

    state.gold -= item.cost;

    // Logique d'équipement simple
    let equipped = false;
    for (const hero of state.heroes) {
        if (hero.equipment[item.baseDefinition.slot] === null) {
            hero.equipItem(item);
            equipped = true;
            break;
        }
    }
    if (!equipped && state.heroes.length > 0) {
        state.heroes[0].equipItem(item);
    }

    state.shopItems.splice(itemIndex, 1);
}

/**
 * Vide et remplit complètement la boutique, contre de l'or.
 * @param {object} state - L'objet state du jeu.
 */
function refresh(state) {
    if (state.gold < state.shopRefreshCost) {
        console.log("Pas assez d'or pour rafraîchir la boutique !");
        return;
    }
    state.gold -= state.shopRefreshCost;
    console.log(`Boutique rafraîchie pour ${state.shopRefreshCost} Or.`);

    state.shopItems = [];
    for (let i = 0; i < MAX_SHOP_ITEMS; i++) {
        restock(state, true);
    }
}


// On exporte un objet contenant nos méthodes
export const ShopManager = {
    update,
    buyItem,
    refresh,
};
