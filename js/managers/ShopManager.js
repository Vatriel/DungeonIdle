// js/managers/ShopManager.js

import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { Item } from '../entities/Item.js';
import { initShopUI } from '../ui/ShopUI.js';
import { PRESTIGE_UPGRADES } from '../data/prestigeData.js'; // Import nécessaire pour accéder aux définitions d'améliorations

let localState = null;
let localEventBus = null;

/**
 * Calcule la taille dynamique de la boutique en fonction des améliorations de prestige.
 * @returns {number} La taille actuelle de la boutique.
 */
function getDynamicShopSize() {
    const baseSize = 5; // Taille de base de la boutique
    // Récupère le niveau de l'amélioration SHOP_CAPACITY, ou 0 si non achetée
    const capacityUpgradeLevel = localState.prestigeUpgrades.SHOP_CAPACITY || 0;
    // Calcule le bonus de capacité en utilisant la fonction d'effet définie dans prestigeData.js
    const bonusCapacity = PRESTIGE_UPGRADES.SHOP_CAPACITY.effect(capacityUpgradeLevel);
    return baseSize + bonusCapacity;
}

function init(eventBus, state) {
    localState = state;
    localEventBus = eventBus;

    // initShopUI a besoin de l'état pour afficher le coût dynamique
    initShopUI(eventBus, state);

    eventBus.on('ui_reroll_shop_clicked', () => {
        restockShop(false);
        // NOUVEAU : Réinitialisation du timer lors d'un rafraîchissement manuel
        localState.shopRestockTimer = 0; 
    });
    eventBus.on('ui_buy_all_shop_clicked', buyAllShopItems);

    eventBus.on('ui_shop_lock_item_toggled', (data) => {
        if (localState.ui.shopLockModeActive) {
            toggleItemLock(data.itemIndex);
        }
    });

    eventBus.on('ui_shop_buy_item_clicked', (data) => {
        if (!localState.ui.shopLockModeActive) {
            buyItemLogic(data.itemIndex);
        }
    });
    
    eventBus.on('ui_shop_toggle_lock_mode_clicked', () => {
        localState.ui.shopLockModeActive = !localState.ui.shopLockModeActive;
        localState.ui.shopNeedsUpdate = true;

        const message = localState.ui.shopLockModeActive ? "Mode verrouillage activé !" : "Mode verrouillage désactivé !";
        localEventBus.emit('notification_requested', { message: message, type: 'info' });
        console.log("Mode verrouillage de la boutique basculé. Actif :", localState.ui.shopLockModeActive);
    });

    if (localState.shopItems.length === 0) {
        restockShop(true);
    }
}

function update(dt) {
    localState.shopRestockTimer += dt;
    if (localState.shopRestockTimer >= 60) {
        localState.shopRestockTimer = 0;
        restockShop(true); // MODIFIÉ : L'actualisation automatique est maintenant gratuite
        localEventBus.emit('notification_requested', { message: "La boutique a été réapprovisionnée !", type: 'info' });
    }
}

function generateShopItem(level) {
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const definition = ITEM_DEFINITIONS[randomKey];
    return new Item(definition, level, localState.dungeonFloor);
}

function restockShop(free = false) {
    // Calcul du coût de rafraîchissement dynamique
    const refreshCost = 100 * localState.dungeonFloor;

    // Si le rafraîchissement n'est pas "gratuit" (c'est-à-dire manuel), on vérifie le coût et on le déduit.
    // L'actualisation automatique est gérée par `update` et est maintenant toujours gratuite.
    if (!free) {
        if (localState.gold < refreshCost) {
            localEventBus.emit('notification_requested', { message: `Pas assez d'or pour réapprovisionner la boutique (${refreshCost} Or).`, type: 'error' });
            return;
        }
        localState.gold -= refreshCost;
    }
    
    const lockedItems = localState.shopItems.filter(item => item.locked === true);
    localState.shopItems = [...lockedItems];

    // Utilise la taille dynamique de la boutique
    const dynamicShopSize = getDynamicShopSize();
    const itemsToGenerate = dynamicShopSize - localState.shopItems.length;
    for (let i = 0; i < itemsToGenerate; i++) {
        const itemLevel = Math.max(1, localState.highestFloorThisRun); 
        localState.shopItems.push(generateShopItem(itemLevel));
    }
    localState.ui.shopNeedsUpdate = true;
    localEventBus.emit('shop_ui_force_update'); // Force la mise à jour de l'UI pour le coût du bouton
}

function buyItemLogic(itemIndex) {
    if (itemIndex === null || itemIndex === undefined || itemIndex < 0 || itemIndex >= localState.shopItems.length) {
        localEventBus.emit('notification_requested', { message: "Erreur: Objet de la boutique introuvable.", type: 'error' });
        return;
    }

    const item = localState.shopItems[itemIndex];
    if (item.locked) {
        localEventBus.emit('notification_requested', { message: `${item.name} est verrouillé. Déverrouillez-le d'abord.`, type: 'error' });
        return;
    }

    if (localState.gold >= item.cost) {
        localState.gold -= item.cost;
        localEventBus.emit('inventory_add_item', item);
        localState.shopItems.splice(itemIndex, 1);
        localEventBus.emit('notification_requested', { message: `${item.name} acheté !`, type: 'success' });
        localState.ui.shopNeedsUpdate = true;
    } else {
        localEventBus.emit('notification_requested', { message: "Pas assez d'or pour acheter cet objet.", type: 'error' });
    }
}

function toggleItemLock(itemIndex) {
    const item = localState.shopItems[itemIndex];
    if (!item) {
        localEventBus.emit('notification_requested', { message: "Erreur: Objet à verrouiller/déverrouiller introuvable.", type: 'error' });
        return;
    }
    item.locked = !item.locked;
    localEventBus.emit('notification_requested', { message: `${item.name} ${item.locked ? 'verrouillé' : 'déverrouillé'}.`, type: 'info' });
    localState.ui.shopNeedsUpdate = true;
}

function buyAllShopItems() {
    const itemsToBuy = localState.shopItems.filter(item => !item.locked);

    if (itemsToBuy.length === 0) {
        localEventBus.emit('notification_requested', { message: "Aucun objet non verrouillé à acheter dans la boutique.", type: 'info' });
        return;
    }

    let totalCost = itemsToBuy.reduce((sum, item) => sum + item.cost, 0);

    if (localState.gold >= totalCost) {
        localState.gold -= totalCost;
        for (let i = localState.shopItems.length - 1; i >= 0; i--) {
            const item = localState.shopItems[i];
            if (!item.locked) {
                localEventBus.emit('inventory_add_item', item);
                localState.shopItems.splice(i, 1);
            }
        }
        localEventBus.emit('notification_requested', { message: "Tous les objets non verrouillés de la boutique ont été achetés !", type: 'success' });
        localState.ui.shopNeedsUpdate = true;
    } else {
        localEventBus.emit('notification_requested', { message: `Pas assez d'or pour acheter tous les objets non verrouillés. Coût total: ${totalCost} Or.`, type: 'error' });
    }
}

export const ShopManager = {
    init,
    update,
    restockShop,
    buyAllShopItems,
};
