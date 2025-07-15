// js/managers/ArtisanManager.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';

const RECYCLE_VALUES = {
    defective: { base: 1, rare: 0 },
    common: { base: 1, rare: 0 },
    magic: { base: 3, rare: 0.1 },
    rare: { base: 5, rare: 0.5 },
    epic: { base: 8, rare: 1 },
    legendary: { base: 10, rare: 2 },
    mythic: { base: 15, rare: 4 },
    artifact: { base: 25, rare: 8 }
};

const UPGRADE_COST = {
    base: 50,
    scale: 1.8,
    essenceBase: 5,
    essenceScale: 1.5
};

const REFORGE_COST = {
    base: 250,
    essenceBase: 10,
    essenceRare: 2
};

let localState = null;
let localEventBus = null;

function recycleItem(itemIndex) {
    const item = localState.inventory[itemIndex];
    if (!item) {
        localEventBus.emit('notification_requested', { message: "Erreur: Objet à recycler introuvable.", type: 'error' });
        return;
    }

    const values = RECYCLE_VALUES[item.rarity];
    const levelMultiplier = 1 + (item.level / 10);

    const baseEssencesGained = Math.ceil(values.base * levelMultiplier);
    const rareEssencesGained = Math.random() < values.rare ? 1 : 0;

    localState.resources.essences.base += baseEssencesGained;
    if (rareEssencesGained > 0) {
        localState.resources.essences.rare += rareEssencesGained;
    }

    localState.inventory.splice(itemIndex, 1);
    
    localEventBus.emit('notification_requested', { message: `+${baseEssencesGained} essences de base.`, type: 'success' });
    if (rareEssencesGained > 0) {
        localEventBus.emit('notification_requested', { message: `+${rareEssencesGained} essence rare !`, type: 'success' });
    }

    localState.ui.inventoryNeedsUpdate = true;
    localState.ui.artisanNeedsUpdate = true;
}

export function recycleBasicItemsConfirmed() {
    let totalBaseEssences = 0;
    let totalRareEssences = 0;
    const itemsToKeep = [];
    const itemsToRecycle = [];

    const raritiesToRecycle = ['defective', 'common', 'magic', 'rare'];

    localState.inventory.forEach(item => {
        if (!item.locked && raritiesToRecycle.includes(item.rarity)) {
            itemsToRecycle.push(item);
        } else {
            itemsToKeep.push(item);
        }
    });

    if (itemsToRecycle.length === 0) {
        localEventBus.emit('notification_requested', { message: "Aucun objet (jusqu'à Rare) non verrouillé à recycler.", type: 'info' });
        return;
    }

    itemsToRecycle.forEach(item => {
        const values = RECYCLE_VALUES[item.rarity];
        const levelMultiplier = 1 + (item.level / 10);
        const baseEssencesGained = Math.ceil(values.base * levelMultiplier);
        const rareEssencesGained = Math.random() < values.rare ? 1 : 0;

        totalBaseEssences += baseEssencesGained;
        totalRareEssences += rareEssencesGained;
    });

    localState.resources.essences.base += totalBaseEssences;
    localState.resources.essences.rare += totalRareEssences;
    localState.inventory = itemsToKeep;

    let notificationMessage = `Recyclage basique terminé ! +${totalBaseEssences} essences de base.`;
    if (totalRareEssences > 0) {
        notificationMessage += ` +${totalRareEssences} essences rares.`;
    }
    localEventBus.emit('notification_requested', { message: notificationMessage, type: 'success' });

    localState.ui.inventoryNeedsUpdate = true;
    localState.ui.artisanNeedsUpdate = true;
    localEventBus.emit('artisan_item_selected', { itemIndex: null });
}

export function recycleAllItemsConfirmed() {
    let totalBaseEssences = 0;
    let totalRareEssences = 0;
    const itemsToKeep = [];
    const itemsToRecycle = [];

    localState.inventory.forEach(item => {
        if (!item.locked) {
            itemsToRecycle.push(item);
        } else {
            itemsToKeep.push(item);
        }
    });

    if (itemsToRecycle.length === 0) {
        localEventBus.emit('notification_requested', { message: "Aucun objet non verrouillé à recycler.", type: 'info' });
        return;
    }

    itemsToRecycle.forEach(item => {
        const values = RECYCLE_VALUES[item.rarity];
        const levelMultiplier = 1 + (item.level / 10);
        const baseEssencesGained = Math.ceil(values.base * levelMultiplier);
        const rareEssencesGained = Math.random() < values.rare ? 1 : 0;

        totalBaseEssences += baseEssencesGained;
        totalRareEssences += rareEssencesGained;
    });

    localState.resources.essences.base += totalBaseEssences;
    localState.resources.essences.rare += totalRareEssences;
    localState.inventory = itemsToKeep;

    let notificationMessage = `Recyclage avancé terminé ! +${totalBaseEssences} essences de base.`;
    if (totalRareEssences > 0) {
        notificationMessage += ` +${totalRareEssences} essences rares.`;
    }
    localEventBus.emit('notification_requested', { message: notificationMessage, type: 'success' });

    localState.ui.inventoryNeedsUpdate = true;
    localState.ui.artisanNeedsUpdate = true;
    localEventBus.emit('artisan_item_selected', { itemIndex: null });
}


function upgradeItem(item) {
    if (!item) return;

    const costGold = Math.floor(UPGRADE_COST.base * Math.pow(UPGRADE_COST.scale, item.upgradeLevel));
    const costEssence = Math.floor(UPGRADE_COST.essenceBase * Math.pow(UPGRADE_COST.essenceScale, item.upgradeLevel));

    if (localState.gold < costGold || localState.resources.essences.base < costEssence) {
        localEventBus.emit('notification_requested', { message: "Ressources insuffisantes.", type: 'error' });
        return;
    }

    localState.gold -= costGold;
    localState.resources.essences.base -= costEssence;
    
    item.upgradeLevel++;
    const mainStat = item.baseDefinition.stat;
    const baseValue = item.stats[mainStat];
    item.stats[mainStat] = Math.ceil(baseValue * 1.10);
    
    localEventBus.emit('notification_requested', { message: `${item.name} amélioré au niveau +${item.upgradeLevel} !`, type: 'success' });
    localState.ui.artisanNeedsUpdate = true;
    localState.ui.heroesNeedUpdate = true;
}

function reforgeItem(item, affixKey) {
    if (!item || !affixKey) return;
    if (item.reforgedAffixKey && item.reforgedAffixKey !== affixKey) {
        localEventBus.emit('notification_requested', { message: "Un autre affixe est déjà verrouillé pour la reforge sur cet objet.", type: 'error' });
        return;
    }

    const costGold = REFORGE_COST.base * (item.level);
    const costEssence = REFORGE_COST.essenceBase;
    const costEssenceRare = REFORGE_COST.essenceRare;

    if (localState.gold < costGold || localState.resources.essences.base < costEssence || localState.resources.essences.rare < costEssenceRare) {
        localEventBus.emit('notification_requested', { message: "Ressources insuffisantes pour reforger.", type: 'error' });
        return;
    }

    const possibleAffixes = [...(item.baseDefinition.possibleAffixes || [])];
    const availablePool = possibleAffixes.filter(affix => {
        if (affix === affixKey) return true;
        const malusPool = item.baseDefinition.possibleMaluses || {};
        return !malusPool[affix];
    });

    if (availablePool.length <= 1) {
         localEventBus.emit('notification_requested', { message: "Aucun autre affixe positif possible à obtenir pour la reforge.", type: 'error' });
        return;
    }
    
    localState.gold -= costGold;
    localState.resources.essences.base -= costEssence;
    localState.resources.essences.rare -= reforgeCostEssenceRare;

    delete item.stats[affixKey];
    delete item.affixes[affixKey];

    const newAffixKey = availablePool[Math.floor(Math.random() * availablePool.length)];
    let value = (Math.random() * 0.5 + 0.5) * item.level;
    if (AFFIX_DEFINITIONS[newAffixKey].isPercent) {
        value = parseFloat((value * 0.5).toFixed(2));
    } else {
        value = Math.ceil(value * 2);
    }

    item.affixes[newAffixKey] = value;
    item.stats[newAffixKey] = value;
    item.reforgedAffixKey = newAffixKey;

    localEventBus.emit('notification_requested', { message: "Objet reforgé avec succès !", type: 'success' });
    localState.ui.artisanNeedsUpdate = true;
    localState.ui.heroesNeedUpdate = true;
}

function onArtisanAction(data) {
    const { action, affixKey } = data;
    const itemIndex = localState.ui.artisanSelectedItemIndex;

    if (itemIndex === null || itemIndex === undefined) {
        localEventBus.emit('notification_requested', { message: "Veuillez sélectionner un objet d'abord.", type: 'error' });
        return;
    }
    const item = localState.inventory[itemIndex];
    if (!item) {
        localEventBus.emit('notification_requested', { message: "Objet introuvable dans l'inventaire à l'index sélectionné.", type: 'error' });
        return;
    }

    switch(action) {
        case 'recycle':
            recycleItem(itemIndex);
            localEventBus.emit('artisan_item_selected', { itemIndex: null });
            break;
        case 'upgrade':
            upgradeItem(item);
            break;
        case 'reforge':
            reforgeItem(item, affixKey);
            break;
        default:
            console.warn(`ArtisanManager: Unknown action: ${action}`);
            break;
    }
}

export const ArtisanManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;
        
        eventBus.on('ui_artisan_action_clicked', onArtisanAction);
    
        eventBus.on('artisan_item_selected', (data) => {
            if (localState.ui.artisanSelectedItemIndex === data.itemIndex) {
                localState.ui.artisanSelectedItemIndex = null;
            } else {
                localState.ui.artisanSelectedItemIndex = data.itemIndex;
            }
            localState.ui.artisanNeedsUpdate = true;
        });

        // L'ArtisanManager écoute maintenant sa propre confirmation
        eventBus.on('confirmation_accepted', (action) => {
            if (action.type === 'recycle_basic_items') {
                recycleBasicItemsConfirmed();
            } else if (action.type === 'recycle_all_items_advanced') {
                recycleAllItemsConfirmed();
            }
        });
    },
    UPGRADE_COST,
    REFORGE_COST,
    recycleBasicItemsConfirmed,
    recycleAllItemsConfirmed,
    recycleItemImmediately: (item) => {
        const values = RECYCLE_VALUES[item.rarity];
        const levelMultiplier = 1 + (item.level / 10);

        const baseEssencesGained = Math.ceil(values.base * levelMultiplier);
        const rareEssencesGained = Math.random() < values.rare ? 1 : 0;

        localState.resources.essences.base += baseEssencesGained;
        if (rareEssencesGained > 0) {
            localState.resources.essences.rare += rareEssencesGained;
        }
        localEventBus.emit('notification_requested', { message: `Objet recyclé automatiquement : ${item.name} (+${baseEssencesGained} Ess. Base${rareEssencesGained > 0 ? `, +${rareEssencesGained} Ess. Rare` : ''}).`, type: 'info' });
        localState.ui.artisanNeedsUpdate = true;
    }
};
