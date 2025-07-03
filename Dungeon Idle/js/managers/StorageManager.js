// js/managers/StorageManager.js

import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';

const SAVE_KEY = 'dungeonIdleSave';

/**
 * Sauvegarde l'état actuel du jeu dans le localStorage.
 * @param {object} state - L'objet state complet du jeu.
 */
function save(state) {
    try {
        const plainState = {
            // Données générales
            gold: state.gold,
            gameStatus: state.gameStatus,
            dungeonFloor: state.dungeonFloor,
            encounterIndex: state.encounterIndex,
            
            // Données de l'interface utilisateur et timers
            ui: {
                heroCardState: state.ui.heroCardState,
                shopLockModeActive: state.ui.shopLockModeActive,
                autoProgressToBoss: state.ui.autoProgressToBoss,
                autoProgressToNextFloor: state.ui.autoProgressToNextFloor,
            },
            autosaveTimer: state.autosaveTimer,
            shopRestockTimer: state.shopRestockTimer,
            encounterCooldown: state.encounterCooldown,
            bossUnlockReached: state.bossUnlockReached,
            bossIsDefeated: state.bossIsDefeated,
            pendingBossFight: state.pendingBossFight,

            heroes: state.heroes.map(hero => ({
                id: hero.id,
                level: hero.level,
                xp: hero.xp,
                // CORRECTION : Ajout de la sauvegarde de l'XP nécessaire pour le prochain niveau.
                xpToNextLevel: hero.xpToNextLevel,
                status: hero.status,
                equipment: hero.equipment,
                activeBuffs: hero.activeBuffs,
            })),

            heroDefinitionsStatus: Object.fromEntries(
                Object.entries(state.heroDefinitions).map(([key, def]) => [key, def.status])
            ),

            inventory: state.inventory,
            activeMonster: state.activeMonster,
            shopItems: state.shopItems,
        };

        localStorage.setItem(SAVE_KEY, JSON.stringify(plainState));
    } catch (e) {
        console.error("Erreur lors de la sauvegarde :", e);
    }
}

/**
 * Charge l'état du jeu depuis le localStorage et le "réhydrate".
 * @returns {object|null} L'objet state reconstruit, ou null si aucune sauvegarde n'existe.
 */
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

        loadedData.inventory = (loadedData.inventory || []).map(itemData => {
            if (!itemData || !itemData.baseDefinition) return null;
            const item = new Item(itemData.baseDefinition, itemData.level);
            Object.assign(item, itemData);
            return item;
        }).filter(i => i !== null);

        loadedData.shopItems = (loadedData.shopItems || []).map(itemData => {
            if (!itemData || !itemData.baseDefinition) return null;
            const item = new Item(itemData.baseDefinition, itemData.level);
            Object.assign(item, itemData);
            return item;
        }).filter(i => i !== null);

        loadedData.droppedItems = [];
        loadedData.itemToEquip = null;

        loadedData.heroes = (loadedData.heroes || []).map(heroData => {
            const heroDef = loadedData.heroDefinitions[heroData.id.toUpperCase()];
            if (!heroDef) {
                console.warn(`Définition de héros non trouvée pour l'ID: ${heroData.id}. Ce héros sera ignoré.`);
                return null;
            }
            
            let hero;
            switch(heroData.id) {
                case 'priest':
                    hero = new Priest(heroDef);
                    break;
                default:
                    hero = new Hero(heroDef);
                    break;
            }

            // Object.assign va maintenant correctement restaurer xpToNextLevel depuis la sauvegarde.
            Object.assign(hero, heroData);

            for (const slot in hero.equipment) {
                const itemData = hero.equipment[slot];
                if (itemData && itemData.baseDefinition) {
                    const item = new Item(itemData.baseDefinition, itemData.level);
                    Object.assign(item, itemData);
                    hero.equipment[slot] = item;
                } else {
                    hero.equipment[slot] = null;
                }
            }
            
            hero.activeBuffs = hero.activeBuffs || [];
            hero._recalculateStats(); 
            if (hero.hp > hero.maxHp) hero.hp = hero.maxHp;

            return hero;
        }).filter(h => h !== null);
        
        if(loadedData.activeMonster) {
            if(loadedData.activeMonster.initialCount !== undefined) {
                const monster = new MonsterGroup(loadedData.activeMonster.baseDefinition, loadedData.activeMonster.initialCount);
                Object.assign(monster, loadedData.activeMonster);
                loadedData.activeMonster = monster;
            } else {
                const boss = new Boss(loadedData.activeMonster.name, loadedData.activeMonster.maxHp, loadedData.activeMonster.dps, loadedData.activeMonster.level);
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

/**
 * Efface la sauvegarde et recharge la page pour réinitialiser le jeu.
 */
function reset() {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser votre partie ? Toute votre progression sera perdue.")) {
        console.log("Réinitialisation du jeu...");
        localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    }
}

export const StorageManager = {
    save,
    load,
    reset,
};
