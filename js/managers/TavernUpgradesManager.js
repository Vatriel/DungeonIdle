// js/managers/TavernUpgradesManager.js
// Gère la logique des améliorations de la Taverne.

import { TAVERN_UPGRADES } from '../data/tavernUpgradesData.js';
import { TROPHY_DEFINITIONS } from '../data/trophyData.js';
import { TavernSpecialistsManager } from './TavernSpecialistsManager.js';
import { SPECIALIST_DEFINITIONS } from '../data/specialistData.js';

let localState = null;
let localEventBus = null;
// CORRECTION : Ajout d'un Set pour suivre les notifications d'améliorations payantes déjà envoyées pendant la session.
let notifiedPaidUpgrades = new Set();

export const TavernUpgradesManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;
        console.log("TavernUpgradesManager: Initialisation...");

        if (!localState.tavern.upgrades) {
            localState.tavern.upgrades = {};
        }

        // Initialise les niveaux d'amélioration si non définis
        for (const upgradeId in TAVERN_UPGRADES) {
            if (localState.tavern.upgrades[upgradeId] === undefined) {
                localState.tavern.upgrades[upgradeId] = 0;
            }
        }

        // CORRECTION : Réinitialise et pré-remplit l'ensemble des notifications à chaque initialisation.
        // Cela empêche les notifications pour les améliorations déjà achetées lors du chargement d'une sauvegarde.
        notifiedPaidUpgrades.clear();
        for (const upgradeId in localState.tavern.upgrades) {
            if ((localState.tavern.upgrades[upgradeId] || 0) > 0) {
                notifiedPaidUpgrades.add(upgradeId);
            }
        }

        eventBus.on('ui_tavern_buy_upgrade_clicked', (data) => TavernUpgradesManager.buyUpgrade(data.upgradeId));
        eventBus.on('contract_claimed', TavernUpgradesManager.handleContractClaimed);
    },

    update: (dt) => {
        // Pas de logique de mise à jour par tick pour ce manager.
    },

    checkUnlockConditions: () => {
        let needsUIUpdate = false;
        for (const upgradeId in TAVERN_UPGRADES) {
            const upgradeDef = TAVERN_UPGRADES[upgradeId];
            const currentLevel = localState.tavern.upgrades[upgradeId] || 0;

            if (currentLevel < (upgradeDef.maxLevel || 1)) { 
                let isUnlockConditionMet = true;

                if (upgradeDef.unlockCondition) {
                    if (upgradeDef.unlockCondition.reputation && localState.tavern.reputation < upgradeDef.unlockCondition.reputation) {
                        isUnlockConditionMet = false;
                    }
                    if (upgradeDef.unlockCondition.floor && localState.highestFloorAchieved < upgradeDef.unlockCondition.floor) {
                        isUnlockConditionMet = false;
                    }
                    if (upgradeDef.unlockCondition.specialistRecruited && !TavernSpecialistsManager.isSpecialistRecruited(upgradeDef.unlockCondition.specialistRecruited)) {
                        isUnlockConditionMet = false;
                    }
                }

                if (isUnlockConditionMet && currentLevel === 0) {
                    if (upgradeDef.type === 'free') {
                        TavernUpgradesManager.buyUpgrade(upgradeId); 
                        localEventBus.emit('notification_requested', { message: `Nouvelle amélioration de Taverne débloquée : ${upgradeDef.name} !`, type: 'success' });
                        needsUIUpdate = true;
                    } else {
                        // CORRECTION : On vérifie si une notification a déjà été envoyée pour cette amélioration.
                        if (!notifiedPaidUpgrades.has(upgradeId)) {
                            localEventBus.emit('notification_requested', { message: `Nouvelle amélioration de Taverne disponible à l'achat : ${upgradeDef.name} !`, type: 'info' });
                            // On marque l'amélioration comme notifiée pour cette session.
                            notifiedPaidUpgrades.add(upgradeId);
                        }
                        needsUIUpdate = true;
                    }
                }
            }
        }
        if (needsUIUpdate) {
            localState.ui.tavernNeedsUpdate = true;
        }
    },

    getUpgradeCost: (upgradeDef, currentLevel) => {
        let cost = { gold: 0, trophy: null, quantity: 0 };
        if (upgradeDef.baseCost) {
            if (upgradeDef.baseCost.gold) {
                cost.gold = Math.floor(upgradeDef.baseCost.gold * Math.pow(upgradeDef.costScale || 1, currentLevel));
            }
            if (upgradeDef.baseCost.trophy) {
                cost.trophy = upgradeDef.baseCost.trophy;
                cost.quantity = Math.floor((upgradeDef.baseCost.quantity || 1) * Math.pow(upgradeDef.costScale || 1, currentLevel));
            }
        }
        return cost;
    },

    buyUpgrade: (upgradeId) => {
        const upgradeDef = TAVERN_UPGRADES[upgradeId];
        if (!upgradeDef) {
            console.error(`Amélioration de taverne inconnue : ${upgradeId}`);
            localEventBus.emit('notification_requested', { message: "Erreur: Amélioration inconnue.", type: 'error' });
            return;
        }

        const currentLevel = localState.tavern.upgrades[upgradeId] || 0;
        if (currentLevel >= (upgradeDef.maxLevel || 1)) {
            localEventBus.emit('notification_requested', { message: "Niveau maximum atteint pour cette amélioration.", type: 'error' });
            return;
        }

        let isUnlockConditionMet = true;
        if (upgradeDef.unlockCondition) {
            if (upgradeDef.unlockCondition.reputation && localState.tavern.reputation < upgradeDef.unlockCondition.reputation) {
                isUnlockConditionMet = false;
            }
            if (upgradeDef.unlockCondition.floor && localState.highestFloorAchieved < upgradeDef.unlockCondition.floor) {
                isUnlockConditionMet = false;
            }
            if (upgradeDef.unlockCondition.specialistRecruited && !TavernSpecialistsManager.isSpecialistRecruited(upgradeDef.unlockCondition.specialistRecruited)) {
                isUnlockConditionMet = false;
            }
        }

        if (!isUnlockConditionMet) {
            let conditionMessage = [];
            if (upgradeDef.unlockCondition.reputation) conditionMessage.push(`Renommée ${upgradeDef.unlockCondition.reputation}`);
            if (upgradeDef.unlockCondition.floor) conditionMessage.push(`Étage ${upgradeDef.unlockCondition.floor}`);
            if (upgradeDef.unlockCondition.specialistRecruited) {
                const specialistName = SPECIALIST_DEFINITIONS[upgradeDef.unlockCondition.specialistRecruited]?.name || "spécialiste requis";
                conditionMessage.push(`Recruter ${specialistName}`);
            }
            localEventBus.emit('notification_requested', { message: `Conditions de déblocage non remplies : ${conditionMessage.join(' / ')}.`, type: 'error' });
            return;
        }

        const cost = TavernUpgradesManager.getUpgradeCost(upgradeDef, currentLevel);
        let canAfford = true;
        let missingResources = [];

        if (cost.gold > 0 && localState.gold < cost.gold) {
            canAfford = false;
            missingResources.push(`${cost.gold - localState.gold} Or`);
        }
        if (cost.trophy && (localState.trophies[cost.trophy] || 0) < cost.quantity) {
            canAfford = false;
            const trophyName = TROPHY_DEFINITIONS[cost.trophy]?.name || "Trophée inconnu";
            missingResources.push(`${cost.quantity - (localState.trophies[cost.trophy] || 0)} ${trophyName}`);
        }

        if (!canAfford) {
            localEventBus.emit('notification_requested', { message: `Ressources insuffisantes pour acheter : ${missingResources.join(', ')}.`, type: 'error' });
            return;
        }

        if (cost.gold > 0) {
            localState.gold -= cost.gold;
        }
        if (cost.trophy) {
            localState.trophies[cost.trophy] -= cost.quantity;
            localState.ui.trophyNeedsUpdate = true;
        }

        localState.tavern.upgrades[upgradeId] = currentLevel + 1;
        // CORRECTION : On s'assure que l'ID est ajouté à l'ensemble des notifiés lors de l'achat.
        notifiedPaidUpgrades.add(upgradeId);
        TavernUpgradesManager.applyPermanentEffect(upgradeId, localState.tavern.upgrades[upgradeId]);

        localEventBus.emit('notification_requested', { message: `Amélioration de Taverne achetée : ${upgradeDef.name} !`, type: 'success' });
        localState.ui.tavernNeedsUpdate = true;
        localState.ui.shopNeedsUpdate = true;
        localState.ui.heroesNeedUpdate = true;
    },

    applyPermanentEffect: (upgradeId, level) => {
        const upgradeDef = TAVERN_UPGRADES[upgradeId];
        if (!upgradeDef || level === 0) return;

        switch (upgradeId) {
            case 'CONTRACT_SLOT_EXPANSION':
                const bonus = upgradeDef.effect(level);
                localState.tavern.maxAvailableContracts += bonus;
                localState.tavern.maxActiveContracts += bonus;
                break;
            case 'INFLUENTIAL_REPUTATION':
                localState.tavern.reputationGainBonus = (localState.tavern.reputationGainBonus || 0) + upgradeDef.effect(level);
                break;
            case 'LOYAL_CLIENTELE':
                localState.tavern.timedConsumableDurationBonus = (localState.tavern.timedConsumableDurationBonus || 0) + upgradeDef.effect(level);
                break;
            case 'DEDICATED_MESSENGER':
                localState.tavern.contractCooldownReduction = (localState.tavern.contractCooldownReduction || 0) + upgradeDef.effect(level);
                break;
            case 'LOYALTY_CARD':
                localState.options.autoBuyConsumablesUnlocked = true;
                localState.tavern.consumableCostReduction = upgradeDef.effect(level);
                break;
            case 'SAMPLE_SHOP':
                localState.tavern.elixirOfFuryUnlocked = true;
                break;
            case 'MASTER_ARTISAN':
                localState.tavern.masterArtisanChance = upgradeDef.effect(level);
                break;
            default:
                console.warn(`TavernUpgradesManager: Effet non géré pour l'amélioration : ${upgradeId}`);
        }
        localState.ui.heroesNeedUpdate = true;
    },

    applyAllPermanentEffects: () => {
        if (!localState || !localState.tavern || !localState.tavern.upgrades) {
            console.warn("TavernUpgradesManager: État de la taverne non initialisé pour appliquer les effets.");
            return;
        }
        
        localState.tavern.reputationGainBonus = 0;
        localState.tavern.timedConsumableDurationBonus = 0;
        localState.tavern.contractCooldownReduction = 0;
        localState.tavern.masterArtisanChance = 0;
        localState.tavern.elixirOfFuryUnlocked = false; 
        localState.options.autoBuyConsumablesUnlocked = false; 
        localState.tavern.consumableCostReduction = 0; 
        localState.tavern.maxAvailableContracts = 3;
        localState.tavern.maxActiveContracts = 1;

        for (const upgradeId in localState.tavern.upgrades) {
            const level = localState.tavern.upgrades[upgradeId];
            if (level > 0) {
                TavernUpgradesManager.applyPermanentEffect(upgradeId, level);
            }
        }
    },

    handleContractClaimed: (data) => {
        const masterArtisanChance = localState.tavern.masterArtisanChance || 0;
        if (masterArtisanChance > 0 && data.rewards && (data.rewards.baseEssence || data.rewards.rareEssence)) {
            if (Math.random() * 100 < masterArtisanChance) {
                localState.resources.essences.rare += 1;
                localEventBus.emit('notification_requested', { message: `Maître Artisan : +1 Essence Rare supplémentaire !`, type: 'success' });
                localState.ui.artisanNeedsUpdate = true;
            }
        }
    },

    getUpgradeStatus: (upgradeId) => {
        const upgradeDef = TAVERN_UPGRADES[upgradeId];
        if (!upgradeDef) return null;

        const currentLevel = localState.tavern.upgrades[upgradeId] || 0;
        const maxLevel = upgradeDef.maxLevel || 1;
        const isMaxLevel = currentLevel >= maxLevel;

        let isUnlockConditionMet = true;
        if (upgradeDef.unlockCondition) {
            if (upgradeDef.unlockCondition.reputation && localState.tavern.reputation < upgradeDef.unlockCondition.reputation) {
                isUnlockConditionMet = false;
            }
            if (upgradeDef.unlockCondition.floor && localState.highestFloorAchieved < upgradeDef.unlockCondition.floor) {
                isUnlockConditionMet = false;
            }
            if (upgradeDef.unlockCondition.specialistRecruited && !TavernSpecialistsManager.isSpecialistRecruited(upgradeDef.unlockCondition.specialistRecruited)) {
                isUnlockConditionMet = false;
            }
        }

        let canAfford = true;
        let cost = null;
        if (upgradeDef.type === 'paid' && !isMaxLevel) {
            cost = TavernUpgradesManager.getUpgradeCost(upgradeDef, currentLevel);
            if (cost.gold > 0 && localState.gold < cost.gold) canAfford = false;
            if (cost.trophy) {
                const trophyCount = localState.trophies[cost.trophy] || 0;
                if (trophyCount < cost.quantity) canAfford = false;
            }
        }

        let effectValue = null;
        let nextEffectValue = null;
        if (upgradeDef.effect) {
            const levelForEffectCalculation = currentLevel > 0 ? currentLevel : 1;
            effectValue = upgradeDef.effect(levelForEffectCalculation);
            
            if (currentLevel < maxLevel) {
                nextEffectValue = upgradeDef.effect(levelForEffectCalculation + 1);
                if (upgradeDef.formatValue && String(upgradeDef.formatValue(1)).includes('%')) { 
                     nextEffectValue = nextEffectValue - effectValue;
                } else if (!upgradeDef.formatValue) {
                    nextEffectValue = null;
                }
            }
        }

        return {
            id: upgradeId,
            name: upgradeDef.name,
            description: upgradeDef.description,
            type: upgradeDef.type,
            currentLevel,
            maxLevel,
            isMaxLevel,
            isUnlocked: isUnlockConditionMet, 
            isOwned: currentLevel > 0,
            cost,
            canAfford,
            effectValue,
            nextEffectValue,
            formatValue: upgradeDef.formatValue,
            unlockCondition: upgradeDef.unlockCondition 
        };
    },
};
