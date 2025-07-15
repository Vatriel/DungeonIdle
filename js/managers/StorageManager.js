// js/managers/StorageManager.js

import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { Duelist } from '../entities/Duelist.js';
import { Protector } from '../entities/Protector.js';
import { Flibustier } from '../entities/Flibustier.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { eventBus } from '../core/EventBus.js';

const SAVE_KEY = 'dungeonIdleSave';
const PRESTIGE_SAVE_KEY = 'dungeonIdlePrestigeSave';

function save(state) {
    try {
        const plainState = {
            gold: state.gold,
            gameStatus: state.gameStatus,
            dungeonFloor: state.dungeonFloor,
            encounterIndex: state.encounterIndex,
            encountersPerFloor: state.encountersPerFloor,
            ui: {
                heroCardState: state.ui.heroCardState,
                shopLockModeActive: state.ui.shopLockModeActive,
                activeTab: state.ui.activeTab,
            },
            autosaveTimer: state.autosaveTimer,
            shopRestockTimer: state.shopRestockTimer,
            encounterCooldown: state.encounterCooldown,
            bossUnlockReached: state.bossUnlockReached,
            bossIsDefeated: state.bossIsDefeated,
            pendingBossFight: state.pendingBossFight,
            soulEchos: state.soulEchos,
            prestigeUpgrades: state.prestigeUpgrades,
            highestFloorAchieved: state.highestFloorAchieved,
            duelistUnlockedByPrestige: state.duelistUnlockedByPrestige,
            highestFloorThisRun: state.highestFloorThisRun,
            options: state.options,
            prestigeUnlockConditionMet: state.prestigeUnlockConditionMet,
            artisanUnlocked: state.artisanUnlocked,
            tavernUnlocked: state.tavernUnlocked,
            blacksmithUnlocked: state.blacksmithUnlocked,
            resources: state.resources,
            prestigeCount: state.prestigeCount,
            trophies: state.trophies,
            activeConsumables: state.activeConsumables,
            heroes: state.heroes.map(hero => {
                const heroSaveData = {
                    id: hero.id,
                    level: hero.level,
                    xp: hero.xp,
                    xpToNextLevel: hero.xpToNextLevel,
                    status: hero.status,
                    equipment: hero.equipment,
                    hp: hero.hp, 
                    buffs: hero.buffs.getSaveData(),
                };
                if (hero instanceof Flibustier) {
                    heroSaveData.doubloons = hero.doubloons;
                }
                return heroSaveData;
            }),
            heroDefinitionsStatus: Object.fromEntries(
                Object.entries(state.heroDefinitions).map(([key, def]) => [key, def.status])
            ),
            inventory: state.inventory,
            shopItems: state.shopItems,
            activeMonster: state.activeMonster,
            // CORRECTION : Ajout des améliorations (upgrades) à la sauvegarde normale.
            tavern: {
                reputation: state.tavern.reputation,
                availableContracts: state.tavern.availableContracts,
                activeContracts: state.tavern.activeContracts,
                completedContracts: state.tavern.completedContracts,
                contractCooldowns: state.tavern.contractCooldowns,
                upgrades: state.tavern.upgrades, // Ajout de cette ligne
                specialists: Object.fromEntries(
                    Object.entries(state.tavern.specialists).map(([key, def]) => [key, { status: def.status }])
                ),
            }
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(plainState));
        console.log("StorageManager: Sauvegarde normale effectuée.");
    } catch (e) {
        console.error("Erreur lors de la sauvegarde :", e);
    }
}

function savePrestige(permanentState) {
    try {
        const prestigeDataToSave = {
            soulEchos: permanentState.soulEchos,
            prestigeUpgrades: permanentState.prestigeUpgrades,
            highestFloorAchieved: permanentState.highestFloorAchieved,
            heroDefinitionsStatus: permanentState.heroDefinitionsStatus,
            duelistUnlockedByPrestige: permanentState.duelistUnlockedByPrestige,
            options: permanentState.options,
            prestigeCount: permanentState.prestigeCount,
            artisanUnlocked: permanentState.artisanUnlocked,
            resources: permanentState.resources,
            prestigeUnlockConditionMet: permanentState.prestigeUnlockConditionMet,
            tavernUnlocked: permanentState.tavernUnlocked,
            blacksmithUnlocked: permanentState.blacksmithUnlocked,
            trophies: permanentState.trophies,
            tavern: permanentState.tavern
        };
        localStorage.setItem(PRESTIGE_SAVE_KEY, JSON.stringify(prestigeDataToSave));
        console.log("StorageManager: Données de prestige sauvegardées.");
        localStorage.removeItem(SAVE_KEY);
        console.log("StorageManager: Sauvegarde normale supprimée.");
    } catch (e) {
        console.error("Erreur lors de la sauvegarde de prestige :", e);
    }
}

function loadPrestige() {
    const prestigeDataJSON = localStorage.getItem(PRESTIGE_SAVE_KEY);
    if (!prestigeDataJSON) {
        console.log("StorageManager: Aucune sauvegarde de prestige trouvée.");
        return null;
    }
    try {
        const loadedData = JSON.parse(prestigeDataJSON);
        console.log("StorageManager: Données de prestige chargées.");
        if (loadedData.tavern) {
            loadedData.tavern.reputation = loadedData.tavern.reputation || 0;
            loadedData.tavern.availableContracts = loadedData.tavern.availableContracts || [];
            loadedData.tavern.activeContracts = loadedData.tavern.activeContracts || [];
            loadedData.tavern.completedContracts = loadedData.tavern.completedContracts || [];
            loadedData.tavern.contractCooldowns = loadedData.tavern.contractCooldowns || {};
            loadedData.tavern.specialists = loadedData.tavern.specialists || {};
        }
        loadedData.options = loadedData.options || {};
        return loadedData;
    } catch (e) {
        console.error("Erreur lors du chargement des données de prestige :", e);
        return null;
    }
}

function hydrateItem(itemData) {
    if (!itemData || !itemData.baseDefinition) return null;
    const item = new Item(itemData.baseDefinition, itemData.level);
    Object.assign(item, itemData);
    return item;
}

function hydrateHero(heroData, heroDefinitions, state) {
    const heroDef = heroDefinitions[heroData.id.toUpperCase()];
    if (!heroDef) {
        console.warn(`Définition de héros non trouvée pour l'ID: ${heroData.id}. Ce héros sera ignoré.`);
        return null;
    }
    
    let hero;
    switch(heroData.id) {
        case 'priest': hero = new Priest(heroDef); break;
        case 'duelist': hero = new Duelist(heroDef); break;
        case 'protector': hero = new Protector(heroDef); break;
        case 'flibustier': hero = new Flibustier(heroDef); break;
        default: hero = new Hero(heroDef); break;
    }

    hero.level = heroData.level;
    hero.xp = heroData.xp;
    hero.xpToNextLevel = heroData.xpToNextLevel;
    hero.status = heroData.status;
    hero.equipment = heroData.equipment || hero.equipment;
    
    if (hero instanceof Flibustier && heroData.doubloons !== undefined) {
        hero.doubloons = heroData.doubloons;
    }

    hero.buffs.loadSaveData(heroData.buffs);

    for (const slot in hero.equipment) {
        const itemData = hero.equipment[slot];
        if (itemData && itemData.baseDefinition) {
            hero.equipment[slot] = hydrateItem(itemData);
        } else {
            hero.equipment[slot] = null;
        }
    }
    
    hero.initialize(state);
    hero.hp = heroData.hp;
    if (hero.hp > hero.maxHp) hero.hp = hero.maxHp;

    return hero;
}

function hydrateMonster(monsterData) {
    if (!monsterData) return null;
    let monster;

    if (monsterData.initialCount !== undefined) {
        monster = new MonsterGroup(monsterData.baseDefinition, monsterData.initialCount);
        monster.currentHp = monsterData.currentHp;
        monster.currentCount = monsterData.currentCount;
    } else {
        monster = new Boss(
            monsterData.name, 
            monsterData.maxHp, 
            monsterData.damage,
            monsterData.attackSpeed, 
            monsterData.level
        );
        monster.currentHp = monsterData.currentHp;
    }
    
    monster.instanceId = monsterData.instanceId || crypto.randomUUID();
    
    return monster;
}

function load() {
    const savedStateJSON = localStorage.getItem(SAVE_KEY);
    if (!savedStateJSON) {
        console.log("StorageManager: Aucune sauvegarde normale trouvée.");
        return null;
    }

    try {
        const loadedData = JSON.parse(savedStateJSON);
        console.log("StorageManager: Sauvegarde normale chargée avec succès !");
        if (loadedData.tavern) {
            loadedData.tavern.reputation = loadedData.tavern.reputation || 0;
            loadedData.tavern.availableContracts = loadedData.tavern.availableContracts || [];
            loadedData.tavern.activeContracts = loadedData.tavern.activeContracts || [];
            loadedData.tavern.completedContracts = loadedData.tavern.completedContracts || [];
            loadedData.tavern.contractCooldowns = loadedData.tavern.contractCooldowns || {};
            loadedData.tavern.specialists = loadedData.tavern.specialists || {};
        }
        loadedData.options = loadedData.options || {};
        return loadedData;
    } catch (e) {
        console.error("Erreur lors du chargement de la sauvegarde :", e);
        return null;
    }
}

function softReset() {
    const message = "Êtes-vous sûr de vouloir recommencer votre partie ? Votre progression actuelle (étage, or, objets) sera perdue, mais pas votre prestige.";
    eventBus.emit('confirmation_requested', {
        message,
        action: { type: 'perform_soft_reset' }
    });
}

function hardReset() {
    const message = "ATTENTION !\n\nÊtes-vous absolument certain de vouloir effacer toutes vos données ?\n\nCette action supprimera votre sauvegarde actuelle ET toute votre progression de prestige (Échos, améliorations). Cette action est irréversible.";
    eventBus.emit('confirmation_requested', {
        message,
        action: { type: 'perform_hard_reset' }
    });
}

function performSoftReset() {
    console.log("StorageManager: Réinitialisation de la partie en cours...");
    localStorage.removeItem(SAVE_KEY);
    console.log("StorageManager: Sauvegarde normale supprimée pour soft reset.");
    window.location.reload();
}

function performHardReset() {
    console.log("StorageManager: Réinitialisation complète de la sauvegarde...");
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(PRESTIGE_SAVE_KEY);
    console.log("StorageManager: Toutes les sauvegardes supprimées pour hard reset.");
    window.location.reload();
}

export const StorageManager = {
    save,
    load,
    savePrestige,
    loadPrestige,
    hydrateHero,
    hydrateMonster,
    hydrateItem,
    softReset,
    hardReset,
    performSoftReset,
    performHardReset,

    init: () => {
        eventBus.on('ui_soft_reset_clicked', () => {
            softReset();
        });

        eventBus.on('ui_hard_reset_clicked', () => {
            hardReset();
        });

        eventBus.on('confirmation_accepted', (action) => {
            if (action.type === 'perform_soft_reset') {
                performSoftReset();
            } else if (action.type === 'perform_hard_reset') {
                performHardReset();
            }
        });
    }
};
