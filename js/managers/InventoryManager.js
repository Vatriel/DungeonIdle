// js/managers/InventoryManager.js

import { initInventoryUI } from '../ui/InventoryUI.js';

let localState = null;
let localEventBus = null;

function init(eventBus, state) {
    localState = state;
    localEventBus = eventBus;
    
    initInventoryUI();

    eventBus.on('inventory_add_item', addItem);
    
    eventBus.on('ui_pick_item_clicked', (data) => pickItem(data.itemIndex));
    eventBus.on('ui_pick_all_loot_clicked', pickAllLoot);
    eventBus.on('ui_sell_item_clicked', (data) => discardItem(data.itemId)); 
    eventBus.on('ui_discard_loot_item_clicked', (data) => discardLootItem(data.itemInstanceId));

    eventBus.on('ui_equip_mode_toggled', (data) => {
        localState.itemToEquip = localState.inventory.find(item => item.instanceId === data.itemId);
        localState.ui.heroesNeedUpdate = true; 
        localEventBus.emit('notification_requested', { message: 'Sélectionnez un héros pour équiper l\'objet.', type: 'info' });
    });

    eventBus.on('ui_hero_card_clicked', (data) => {
        if (localState.itemToEquip) {
            const hero = localState.heroes.find(h => h.id === data.heroId);
            if (hero) {
                equipItem(hero, localState.itemToEquip.instanceId);
                localState.itemToEquip = null;
            }
        }
    });

    eventBus.on('ui_equip_canceled', () => {
        if (localState.itemToEquip) {
            localState.itemToEquip = null;
            localState.ui.heroesNeedUpdate = true;
            localEventBus.emit('notification_requested', { message: 'Mode équipement annulé.', type: 'info' });
        }
    });

    eventBus.on('ui_unequip_button_clicked', (data) => {
        unequipItem(data.heroId, data.slot);
    });
}

function addItem(item) {
    if (localState.inventory.length >= localState.inventorySize) {
        localEventBus.emit('notification_requested', { message: "L'inventaire est plein !", type: 'error' });
        return false;
    }

    localState.inventory.push(item);
    localState.ui.inventoryNeedsUpdate = true;
    localEventBus.emit('notification_requested', { message: `${item.name} ajouté à l'inventaire.`, type: 'info' });
    localEventBus.emit('item_added_to_inventory_by_type', { item: item });
    return true;
}

function removeItem(itemInstanceId) {
    const itemIndex = localState.inventory.findIndex(item => item.instanceId === itemInstanceId);
    if (itemIndex !== -1) {
        localState.inventory.splice(itemIndex, 1);
        localState.ui.inventoryNeedsUpdate = true;
        return true;
    }
    return false;
}

function equipItem(hero, itemInstanceId) { 
    const itemIndexInInventory = localState.inventory.findIndex(item => item.instanceId === itemInstanceId);
    const itemToEquip = localState.inventory[itemIndexInInventory];

    if (!hero || !itemToEquip) {
        localEventBus.emit('notification_requested', { message: "Erreur: Héros ou objet introuvable.", type: 'error' });
        localState.itemToEquip = null; 
        localState.ui.heroesNeedUpdate = true; 
        return;
    }

    if (itemToEquip.baseDefinition.classRestriction && !itemToEquip.baseDefinition.classRestriction.includes(hero.id)) {
        localEventBus.emit('notification_requested', { message: `${hero.name} ne peut pas équiper ${itemToEquip.name}.`, type: 'error' });
        return;
    }

    // Correction: Utiliser itemToEquip.baseDefinition.type si 'slot' n'est pas défini.
    let targetSlot = itemToEquip.baseDefinition.slot || itemToEquip.baseDefinition.type;

    // --- CORRECTION POUR LES ANNEAUX ET LES SLOTS RÉELS ---
    if (targetSlot === 'ring') {
        // Si anneau1 est vide, ou si l'objet actuel dans anneau1 est moins bon (logique à définir si besoin),
        // ou si anneau2 est déjà occupé par le même objet (pour éviter de le rééquiper sur lui-même)
        if (!hero.equipment['anneau1']) {
            targetSlot = 'anneau1';
        } else if (!hero.equipment['anneau2']) {
            targetSlot = 'anneau2';
        } else {
            // Si les deux slots d'anneau sont occupés, on remplace le premier par défaut pour l'équipement manuel.
            // Une logique plus avancée (remplacer le moins bon, demander à l'utilisateur) pourrait être ajoutée.
            targetSlot = 'anneau1'; 
        }
    }
    // --- FIN DE LA CORRECTION POUR LES ANNEAUX ET LES SLOTS RÉELS ---

    // Récupérer l'objet actuellement équipé dans le SLOT CIBLE RÉEL
    const currentlyEquippedItem = hero.equipment[targetSlot];

    // NOUVEAU: Vérification de l'espace dans l'inventaire avant de déséquiper un objet existant
    if (currentlyEquippedItem && localState.inventory.length >= localState.inventorySize) {
        localEventBus.emit('notification_requested', { message: "L'inventaire est plein ! Impossible de déséquiper l'objet actuel.", type: 'error' });
        localState.itemToEquip = null; // Annuler le mode équipement
        localState.ui.heroesNeedUpdate = true;
        localState.ui.inventoryNeedsUpdate = true;
        return;
    }

    // Retirer le NOUVEL objet de l'inventaire
    // S'assurer que l'objet est bien dans l'inventaire avant de le retirer
    if (itemIndexInInventory !== -1) {
        localState.inventory.splice(itemIndexInInventory, 1);
    } else {
        console.warn("L'objet à équiper n'a pas été trouvé dans l'inventaire (instanceId:", itemInstanceId, "). Il a peut-être déjà été retiré ou n'a jamais été là.");
        localEventBus.emit('notification_requested', { message: "Erreur: Objet à équiper introuvable dans l'inventaire.", type: 'error' });
        localState.itemToEquip = null; // Clear equip mode
        localState.ui.heroesNeedUpdate = true;
        localState.ui.inventoryNeedsUpdate = true;
        return;
    }

    // Si un ancien objet était équipé dans le slot cible, le remettre dans l'inventaire
    if (currentlyEquippedItem) {
        localState.inventory.push(currentlyEquippedItem);
    }

    // Équiper le nouvel objet sur le héros dans le slot cible réel
    hero.equipItem(localState, itemToEquip, targetSlot);

    localState.ui.heroesNeedUpdate = true;
    localState.ui.inventoryNeedsUpdate = true;
    localEventBus.emit('notification_requested', { message: `${itemToEquip.name} équipé sur ${hero.name}.`, type: 'success' });
}

function unequipItem(heroId, slot) {
    const hero = localState.heroes.find(h => h.id === heroId);
    if (!hero) {
        localEventBus.emit('notification_requested', { message: "Erreur: Héros introuvable.", type: 'error' });
        return;
    }

    // NOUVEAU: Vérification de l'espace dans l'inventaire avant de déséquiper
    if (localState.inventory.length >= localState.inventorySize) {
        localEventBus.emit('notification_requested', { message: "L'inventaire est plein ! Impossible de déséquiper cet objet.", type: 'error' });
        return;
    }

    const unequippedItem = hero.unequipItem(localState, slot);

    if (unequippedItem) {
        addItem(unequippedItem);
        localState.ui.heroesNeedUpdate = true;
        localEventBus.emit('notification_requested', { message: `${unequippedItem.name} déséquipé de ${hero.name}.`, type: 'info' });
    }
}

function discardItem(itemInstanceId) {
    const itemIndex = localState.inventory.findIndex(item => item.instanceId === itemInstanceId);
    if (itemIndex === -1) {
        localEventBus.emit('notification_requested', { message: "Erreur: Objet à jeter introuvable dans l'inventaire.", type: 'error' });
        return;
    }

    const item = localState.inventory[itemIndex];
    localState.inventory.splice(itemIndex, 1); 

    localState.ui.inventoryNeedsUpdate = true;
    localEventBus.emit('notification_requested', { message: `${item.name} jeté de l'inventaire.`, type: 'info' });
}

function discardLootItem(itemInstanceId) {
    const itemIndex = localState.droppedItems.findIndex(item => item.instanceId === itemInstanceId);
    if (itemIndex === -1) {
        localEventBus.emit('notification_requested', { message: "Erreur: Objet à jeter introuvable dans le butin.", type: 'error' });
        return;
    }

    const item = localState.droppedItems[itemIndex];
    localState.droppedItems.splice(itemIndex, 1); 

    localState.ui.lootNeedsUpdate = true; 
    localEventBus.emit('notification_requested', { message: `${item.name} jeté du butin.`, type: 'info' });
}

function pickItem(itemIndex) {
    if (itemIndex === null || itemIndex === undefined || itemIndex < 0 || itemIndex >= localState.droppedItems.length) {
        localEventBus.emit('notification_requested', { message: "Erreur: Objet de butin introuvable.", type: 'error' });
        return;
    }
    
    if (localState.inventory.length >= localState.inventorySize) {
        localEventBus.emit('notification_requested', { message: "L'inventaire est plein !", type: 'error' });
        return;
    }

    const item = localState.droppedItems.splice(itemIndex, 1)[0]; 
    addItem(item); 

    localState.ui.lootNeedsUpdate = true; 
}

function pickAllLoot() {
    if (localState.droppedItems.length === 0) {
        localEventBus.emit('notification_requested', { message: "Aucun butin à ramasser.", type: 'info' });
        return;
    }

    const itemsToPick = [...localState.droppedItems]; 
    let pickedCount = 0;
    for (const item of itemsToPick) {
        const success = addItem(item);
        if (success) {
            const indexInDropped = localState.droppedItems.findIndex(droppedItem => droppedItem.instanceId === item.instanceId);
            if (indexInDropped !== -1) {
                localState.droppedItems.splice(indexInDropped, 1);
            }
            pickedCount++;
        } else {
            break; 
        }
    }

    if (pickedCount > 0) {
        localEventBus.emit('notification_requested', { message: `${pickedCount} objet(s) ramassé(s).`, type: 'success' });
    }
    if (localState.droppedItems.length > 0) {
         localEventBus.emit('notification_requested', { message: "Inventaire plein, une partie du butin reste au sol.", type: 'error' });
    }

    localState.ui.lootNeedsUpdate = true; 
}

export const InventoryManager = {
    init,
    addItem,
    removeItem,
    equipItem,
    unequipItem,
    discardItem, 
    discardLootItem, 
    pickAllLoot
};
