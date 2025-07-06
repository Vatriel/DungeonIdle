// js/managers/StorageManager.js

import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { Duelist } from '../entities/Duelist.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { showConfirmationModal } from '../ui/EffectsUI.js';

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
            
            // NOUVEAU : Sauvegarde des options
            options: state.options,

            heroes: state.heroes.map(hero => ({
                id: hero.id,
                level: hero.level,
                xp: hero.xp,
                xpToNextLevel: hero.xpToNextLevel,
                status: hero.status,
                equipment: hero.equipment,
                activeBuffs: hero.activeBuffs,
                hp: hero.hp, 
            })),

            heroDefinitionsStatus: Object.fromEntries(
                Object.entries(state.heroDefinitions).map(([key, def]) => [key, def.status])
            ),

            inventory: state.inventory,
            shopItems: state.shopItems,
            activeMonster: state.activeMonster,
        };

        localStorage.setItem(SAVE_KEY, JSON.stringify(plainState));
    } catch (e) {
        console.error("Erreur lors de la sauvegarde :", e);
    }
}

function savePrestige(permanentState) {
    try {
        localStorage.setItem(PRESTIGE_SAVE_KEY, JSON.stringify(permanentState));
        localStorage.removeItem(SAVE_KEY);
    } catch (e) {
        console.error("Erreur lors de la sauvegarde de prestige :", e);
    }
}

function loadPrestige() {
    const prestigeDataJSON = localStorage.getItem(PRESTIGE_SAVE_KEY);
    if (!prestigeDataJSON) return null;
    try {
        return JSON.parse(prestigeDataJSON);
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
        case 'priest':
            hero = new Priest(heroDef);
            break;
        case 'duelist':
            hero = new Duelist(heroDef);
            break;
        default:
            hero = new Hero(heroDef);
            break;
    }

    Object.assign(hero, heroData);

    for (const slot in hero.equipment) {
        const itemData = hero.equipment[slot];
        if (itemData && itemData.baseDefinition) {
            hero.equipment[slot] = hydrateItem(itemData);
        } else {
            hero.equipment[slot] = null;
        }
    }
    
    hero.activeBuffs = hero.activeBuffs || [];
    hero._recalculateStats(state);
    if (hero.hp > hero.maxHp) hero.hp = hero.maxHp;

    return hero;
}

function load() {
    const savedStateJSON = localStorage.getItem(SAVE_KEY);
    if (!savedStateJSON) {
        console.log("Aucune sauvegarde trouvée.");
        return null;
    }

    try {
        const loadedData = JSON.parse(savedStateJSON);
        
        const freshHeroDefinitions = JSON.parse(JSON.stringify(HERO_DEFINITIONS));
        if (loadedData.heroDefinitionsStatus) {
            for (const key in loadedData.heroDefinitionsStatus) {
                if (freshHeroDefinitions[key]) {
                    freshHeroDefinitions[key].status = loadedData.heroDefinitionsStatus[key];
                }
            }
        }
        loadedData.heroDefinitions = freshHeroDefinitions;

        loadedData.inventory = (loadedData.inventory || []).map(hydrateItem).filter(i => i !== null);
        loadedData.shopItems = (loadedData.shopItems || []).map(hydrateItem).filter(i => i !== null);

        loadedData.droppedItems = [];
        loadedData.itemToEquip = null;
        
        loadedData.heroes = (loadedData.heroes || []).map(heroData => hydrateHero(heroData, loadedData.heroDefinitions, loadedData)).filter(h => h !== null);
        
        if(loadedData.activeMonster) {
            if(loadedData.activeMonster.initialCount !== undefined) {
                const monster = new MonsterGroup(loadedData.activeMonster.baseDefinition, loadedData.activeMonster.initialCount);
                Object.assign(monster, loadedData.activeMonster);
                loadedData.activeMonster = monster;
            } else { 
                const boss = new Boss(
                    loadedData.activeMonster.name, 
                    loadedData.activeMonster.maxHp, 
                    loadedData.activeMonster.damage,
                    loadedData.activeMonster.attackSpeed, 
                    loadedData.activeMonster.level
                );
                Object.assign(boss, loadedData.activeMonster);
                loadedData.activeMonster = boss;
            }
        }

        console.log("Partie chargée avec succès !");
        return loadedData;

    } catch (e) {
        console.error("Erreur lors du chargement de la sauvegarde :", e);
        return null;
    }
}

function softReset() {
    showConfirmationModal("Êtes-vous sûr de vouloir recommencer votre partie ? Votre progression actuelle (étage, or, objets) sera perdue, mais pas votre prestige.", () => {
        console.log("Réinitialisation de la partie en cours...");
        localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    });
}

export const StorageManager = {
    save,
    load,
    softReset,
    savePrestige,
    loadPrestige
};
