// js/managers/TavernConsumablesManager.js

import { TAVERN_GOODS } from '../data/tavernGoodsData.js';

// CORRECTION : La constante est maintenant exportée pour être accessible par d'autres modules.
export const ELIXIR_OF_FURY_DEF = {
    id: 'ELIXIR_OF_FURY',
    name: "Élixir de Fureur",
    description: "Un puissant breuvage qui décuple votre puissance offensive.",
    icon: '🔥',
    bonus: { stat: 'damagePercent', value: 25 },
    duration: { type: 'timed', value: 300 },
    baseCost: 1000,
};

let localState = null;
let localEventBus = null;
// NOUVEAU : Variable pour suivre le monstre actuel et détecter les changements de rencontre.
let lastMonsterInstanceId = null;

export const TavernConsumablesManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;

        eventBus.on('ui_tavern_buy_good_clicked', (data) => TavernConsumablesManager.buyGood(data.goodId, true));
        // CORRECTION : La logique de décrémentation par rencontre est maintenant gérée dans la boucle `update`.
        // L'écouteur d'événement 'encounter_changed' est donc supprimé pour éviter les doublons ou les oublis.
        eventBus.on('ui_tavern_buy_all_goods_clicked', () => TavernConsumablesManager.buyAllGoods(true));
        
        eventBus.on('ui_toggle_auto_buy_consumables', (data) => {
            localState.options.autoBuyTavernConsumables = data.active;
            localEventBus.emit('notification_requested', { message: `Achat auto. de consommables ${data.active ? 'activé' : 'désactivé'}.`, type: 'info' });
        });
    },

    update: (dt) => {
        // --- DÉBUT DE LA CORRECTION MAJEURE ---
        // Détecte un changement de monstre, ce qui équivaut à une nouvelle rencontre.
        // C'est une méthode plus robuste que d'attendre un événement.
        if (localState.activeMonster && localState.activeMonster.instanceId !== lastMonsterInstanceId) {
            TavernConsumablesManager.handleEncounterChange();
            lastMonsterInstanceId = localState.activeMonster.instanceId;
        } else if (!localState.activeMonster && lastMonsterInstanceId !== null) {
            // Réinitialise si plus aucun monstre n'est actif (entre les combats).
            lastMonsterInstanceId = null;
        }
        // --- FIN DE LA CORRECTION MAJEURE ---

        if (localState.activeConsumables && localState.activeConsumables.length > 0) {
            let needsRecalc = false;
            // Boucle pour les consommables basés sur le temps.
            for (let i = localState.activeConsumables.length - 1; i >= 0; i--) {
                const consumable = localState.activeConsumables[i];
                if (consumable.duration.type === 'timed') { 
                    consumable.duration.value -= dt;
                    if (consumable.duration.value <= 0) {
                        const good = TAVERN_GOODS[consumable.id] || ELIXIR_OF_FURY_DEF;
                        localEventBus.emit('notification_requested', { message: `L'effet de "${good.name}" s'est dissipé.`, type: 'info' });
                        localState.activeConsumables.splice(i, 1);
                        needsRecalc = true;
                    }
                }
            }
            if (needsRecalc) {
                localState.ui.heroesNeedUpdate = true; 
                localState.ui.tavernNeedsUpdate = true; 
            }
        }

        if (localState.options.autoBuyConsumablesUnlocked && localState.options.autoBuyTavernConsumables) {
            TavernConsumablesManager.buyAllGoods(false);
        }
    },

    handleEncounterChange: () => {
        if (localState.activeConsumables && localState.activeConsumables.length > 0) {
            let needsRecalc = false;
            // Boucle pour les consommables basés sur le nombre de rencontres.
            for (let i = localState.activeConsumables.length - 1; i >= 0; i--) {
                const consumable = localState.activeConsumables[i];
                if (consumable.duration.type === 'encounter') {
                    consumable.duration.value -= 1;
                    if (consumable.duration.value <= 0) {
                        const good = TAVERN_GOODS[consumable.id] || ELIXIR_OF_FURY_DEF;
                        localEventBus.emit('notification_requested', { message: `L'effet de "${good.name}" s'est dissipé.`, type: 'info' });
                        localState.activeConsumables.splice(i, 1);
                        needsRecalc = true;
                    }
                }
            }
            if (needsRecalc) {
                localState.ui.heroesNeedUpdate = true;
                localState.ui.tavernNeedsUpdate = true;
            }
        }
    },

    buyGood: (goodId, isManualAction = false) => {
        const allGoods = { ...TAVERN_GOODS };
        if (localState.tavern.elixirOfFuryUnlocked) {
            Object.assign(allGoods, { ELIXIR_OF_FURY: ELIXIR_OF_FURY_DEF });
        }
        const good = allGoods[goodId];

        if (!good) {
            console.error(`TavernConsumablesManager: Marchandise inconnue : ${goodId}`);
            return false;
        }

        const existingBuff = localState.activeConsumables.find(c => c.id === good.id); 
        if (existingBuff) {
            if (isManualAction) {
                localEventBus.emit('notification_requested', { message: "Vous profitez déjà de cet effet.", type: 'error' });
            }
            return false;
        }

        let cost = good.baseCost * localState.dungeonFloor;
        const costReductionPercent = (localState.tavern.consumableCostReduction || 0);
        if (costReductionPercent > 0) {
            cost = Math.ceil(cost * (1 - costReductionPercent / 100));
        }

        if (localState.gold < cost) {
            if (isManualAction) {
                localEventBus.emit('notification_requested', { message: "Pas assez d'or.", type: 'error' });
            }
            return false;
        }

        localState.gold -= cost;
        
        let finalDurationValue = good.duration.value;
        if (good.duration.type === 'timed') {
            const durationBonusPercent = (localState.tavern.timedConsumableDurationBonus || 0);
            if (durationBonusPercent > 0) {
                finalDurationValue = finalDurationValue * (1 + durationBonusPercent / 100);
            }
        }

        const newConsumable = {
            id: good.id,
            duration: { type: good.duration.type, value: finalDurationValue }
        };
        localState.activeConsumables.push(newConsumable);

        if (isManualAction) {
            localEventBus.emit('notification_requested', { message: `Vous avez acheté : ${good.name} !`, type: 'success' });
        }

        localState.ui.heroesNeedUpdate = true; 
        localState.ui.tavernNeedsUpdate = true; 
        return true; 
    },

    buyAllGoods: (isManualAction = false) => {
        const allGoods = { ...TAVERN_GOODS };
        if (localState.tavern.elixirOfFuryUnlocked) {
            Object.assign(allGoods, { ELIXIR_OF_FURY: ELIXIR_OF_FURY_DEF });
        }

        let itemsBoughtCount = 0;
        for (const goodId in allGoods) {
            if (TavernConsumablesManager.buyGood(goodId, false)) {
                itemsBoughtCount++;
            }
        }

        if (isManualAction) {
            if (itemsBoughtCount > 0) {
                localEventBus.emit('notification_requested', { message: `${itemsBoughtCount} consommable(s) acheté(s) !`, type: 'success' });
            } else {
                localEventBus.emit('notification_requested', { message: "Impossible d'acheter plus de consommables (pas assez d'or ou déjà actifs).", type: 'info' });
            }
        }
    }
};
