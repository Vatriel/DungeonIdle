// js/core/StateManager.js

import { StorageManager } from '../managers/StorageManager.js';
import { HERO_DEFINITIONS } from '../data/heroData.js';
import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';
import { SPECIALIST_DEFINITIONS } from '../data/specialistData.js';
import { eventBus } from './EventBus.js';

// L'état global est maintenant défini et exporté d'ici.
export let state = {};

/**
 * Crée l'état initial du jeu, en chargeant les données de prestige si elles existent.
 * Remplace l'ancienne fonction getNewGameState() de game.js.
 * @returns {object} L'état initial complet du jeu.
 */
export function createInitialState() {
    const initialState = {
        heroes: [],
        activeMonster: null,
        gold: 0,
        gameStatus: 'fighting',
        dungeonFloor: 1,
        encounterIndex: 1,
        encountersPerFloor: 10,
        encounterCooldown: 0,
        bossUnlockReached: false,
        bossIsDefeated: false,
        pendingBossFight: false,
        partyWipeHealBoostActive: false,
        shopItems: [],
        shopRestockTimer: 0,
        autosaveTimer: 0,
        heroDefinitions: JSON.parse(JSON.stringify(HERO_DEFINITIONS)),
        inventory: [],
        inventorySize: 50,
        droppedItems: [],
        droppedItemsSize: 20,
        itemToEquip: null,
        soulEchos: 0,
        prestigeUpgrades: {},
        highestFloorAchieved: 1,
        duelistUnlockedByPrestige: false,
        highestFloorThisRun: 1,
        options: {
            autoFightBoss: false,
            autoNextFloor: false,
            lootFilterActive: false,
            lootFilterRarityThreshold: 'common',
            autoBuyConsumablesUnlocked: false,
            autoBuyTavernConsumables: false,
        },
        artisanUnlocked: false,
        prestigeCount: 0,
        prestigeUnlockConditionMet: false,
        tavernUnlocked: false,
        blacksmithUnlocked: false,
        resources: {
            essences: {
                base: 0,
                rare: 0
            }
        },
        tavern: {
            reputation: 0,
            availableContracts: [],
            activeContracts: [],
            completedContracts: [],
            contractCooldowns: {},
            specialists: JSON.parse(JSON.stringify(SPECIALIST_DEFINITIONS)),
            upgrades: {},
        },
        trophies: {},
        activeTrophyBonuses: {},
        activeConsumables: [],
        isGamePaused: false,
        isPausedAtNextEncounter: false,
        ui: {
            shopNeedsUpdate: true,
            heroesNeedUpdate: true,
            inventoryNeedsUpdate: true,
            lootNeedsUpdate: true,
            recruitmentNeedsUpdate: true,
            progressionNeedsUpdate: true,
            prestigeNeedsUpdate: true,
            partyPanelNeedsUpdate: true,
            artisanNeedsUpdate: true,
            artisanSelectedItemIndex: null,
            heroCardState: {},
            shopLockModeActive: false,
            activeTab: 'shop-panel',
            tavernNeedsUpdate: true,
            mainTabsNeedUpdate: true,
            tavernActiveTab: 'tavern-contracts',
            trophyNeedsUpdate: true,
            pauseButtonNeedsUpdate: true,
        },
        damageBuckets: {},
        globalAuraBonuses: {},
        eventBus: eventBus,
    };

    const prestigeData = StorageManager.loadPrestige();
    if (prestigeData) {
        console.log("createInitialState: Données de prestige trouvées et chargées.");
        initialState.soulEchos = prestigeData.soulEchos || 0;
        initialState.prestigeUpgrades = prestigeData.prestigeUpgrades || {};
        initialState.highestFloorAchieved = prestigeData.highestFloorAchieved || 1;
        initialState.duelistUnlockedByPrestige = prestigeData.duelistUnlockedByPrestige || false;
        initialState.options = { ...initialState.options, ...prestigeData.options };
        initialState.prestigeCount = prestigeData.prestigeCount || 0;
        initialState.artisanUnlocked = prestigeData.artisanUnlocked || false;
        initialState.tavernUnlocked = prestigeData.tavernUnlocked || false;
        initialState.resources = prestigeData.resources || { essences: { base: 0, rare: 0 } };
        initialState.prestigeUnlockConditionMet = prestigeData.prestigeUnlockConditionMet || false;
        
        // CORRECTION : S'assure que les données de la taverne sont chargées correctement.
        if (prestigeData.tavern) {
            initialState.tavern.reputation = prestigeData.tavern.reputation || 0;
            initialState.tavern.contractCooldowns = prestigeData.tavern.contractCooldowns || {};
            initialState.tavern.upgrades = prestigeData.tavern.upgrades || {}; // Restaure les améliorations
            
            // Restaure le statut des spécialistes
            if (prestigeData.tavern.specialists) {
                for (const key in prestigeData.tavern.specialists) {
                    if (initialState.tavern.specialists[key]) {
                        initialState.tavern.specialists[key].status = prestigeData.tavern.specialists[key].status;
                    }
                }
            }
        }

        initialState.trophies = prestigeData.trophies || {};
        initialState.blacksmithUnlocked = prestigeData.blacksmithUnlocked || false;
        initialState.options.autoBuyConsumablesUnlocked = prestigeData.options?.autoBuyConsumablesUnlocked || false;
        initialState.options.autoBuyTavernConsumables = prestigeData.options?.autoBuyTavernConsumables || false;

        if (prestigeData.heroDefinitionsStatus) {
            for (const key in prestigeData.heroDefinitionsStatus) {
                if (initialState.heroDefinitions[key]) {
                    const previousStatus = prestigeData.heroDefinitionsStatus[key];
                    if (previousStatus !== 'locked') {
                        initialState.heroDefinitions[key].status = 'recruited';
                    } else {
                        initialState.heroDefinitions[key].status = 'locked';
                    }
                }
            }
        }
    } else {
        console.log("createInitialState: Aucune donnée de prestige trouvée. Initialisation par défaut.");
    }

    if (initialState.prestigeUpgrades.SOUL_RICHES) {
        const soulRichesLevel = initialState.prestigeUpgrades.SOUL_RICHES;
        initialState.gold += PRESTIGE_UPGRADES.SOUL_RICHES.effect(soulRichesLevel);
    }

    return initialState;
}
