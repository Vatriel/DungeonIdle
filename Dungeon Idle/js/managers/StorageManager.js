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
        // CORRIGÉ : On ne sauvegarde plus l'objet state entier directement.
        // On crée une version "plate" des données pour éviter de stocker des définitions de jeu.
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

            // On ne sauvegarde que les données variables des héros
            heroes: state.heroes.map(hero => ({
                id: hero.id,
                level: hero.level,
                xp: hero.xp,
                status: hero.status, // 'fighting', 'recovering', etc.
                equipment: hero.equipment, // L'équipement est déjà "plat"
                activeBuffs: hero.activeBuffs,
            })),

            // On sauvegarde le statut de tous les héros, même ceux non recrutés
            heroDefinitionsStatus: Object.fromEntries(
                Object.entries(state.heroDefinitions).map(([key, def]) => [key, def.status])
            ),

            // Autres données dynamiques
            inventory: state.inventory,
            activeMonster: state.activeMonster,
            shopItems: state.shopItems,
        };

        // Les éléments suivants sont transitoires et ne doivent pas être sauvegardés
        // delete plainState.droppedItems;
        // delete plainState.itemToEquip;

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
        
        // --- CORRIGÉ : On commence par la version la plus récente des définitions ---
        // On fait une copie profonde pour pouvoir modifier les statuts sans altérer le fichier source.
        const freshHeroDefinitions = JSON.parse(JSON.stringify(HERO_DEFINITIONS));

        // On met à jour le statut ('locked', 'available', 'recruited') de chaque héros
        // avec celui qui a été sauvegardé.
        if (loadedData.heroDefinitionsStatus) {
            for (const key in loadedData.heroDefinitionsStatus) {
                if (freshHeroDefinitions[key]) {
                    freshHeroDefinitions[key].status = loadedData.heroDefinitionsStatus[key];
                }
            }
        }

        // On assigne les définitions mises à jour à notre objet de données chargées.
        loadedData.heroDefinitions = freshHeroDefinitions;

        // --- Réhydratation ---
        
        // Réhydrate les objets de l'inventaire
        loadedData.inventory = (loadedData.inventory || []).map(itemData => {
            if (!itemData || !itemData.baseDefinition) return null;
            const item = new Item(itemData.baseDefinition, itemData.level);
            Object.assign(item, itemData);
            return item;
        }).filter(i => i !== null);

        // Réhydrate les objets de la boutique
        loadedData.shopItems = (loadedData.shopItems || []).map(itemData => {
            if (!itemData || !itemData.baseDefinition) return null;
            const item = new Item(itemData.baseDefinition, itemData.level);
            Object.assign(item, itemData);
            return item;
        }).filter(i => i !== null);

        // Initialise les états transitoires
        loadedData.droppedItems = [];
        loadedData.itemToEquip = null;

        // On recrée les instances de Héros avec leurs méthodes.
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

            // Copie les propriétés sauvegardées (level, xp, etc.) sur la nouvelle instance
            Object.assign(hero, heroData);

            // On recrée aussi les instances des objets équipés.
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
            // On recalcule les stats pour être sûr que tout est à jour après chargement
            hero._recalculateStats(); 
            if (hero.hp > hero.maxHp) hero.hp = hero.maxHp;

            return hero;
        }).filter(h => h !== null);
        
        // On recrée l'instance du monstre actif.
        if(loadedData.activeMonster) {
            if(loadedData.activeMonster.initialCount !== undefined) { // C'est un MonsterGroup
                const monster = new MonsterGroup(loadedData.activeMonster.baseDefinition, loadedData.activeMonster.initialCount);
                Object.assign(monster, loadedData.activeMonster);
                loadedData.activeMonster = monster;
            } else { // C'est un Boss
                const boss = new Boss(loadedData.activeMonster.name, loadedData.activeMonster.maxHp, loadedData.activeMonster.dps, loadedData.activeMonster.level);
                Object.assign(boss, loadedData.activeMonster);
                loadedData.activeMonster = boss;
            }
        }

        console.log("Partie chargée avec succès !");
        return loadedData;

    } catch (e) {
        console.error("Erreur lors du chargement de la sauvegarde (il est possible qu'elle soit corrompue et doive être réinitialisée) :", e);
        // On ne supprime pas automatiquement pour ne pas faire perdre la partie à l'utilisateur sans son accord
        // localStorage.removeItem(SAVE_KEY); 
        return null;
    }
}

/**
 * Efface la sauvegarde et recharge la page pour réinitialiser le jeu.
 */
function reset() {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser votre partie ? Toute votre progression sera perdue.")) {
        console.log("Réinitialisation du jeu...");
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

export const StorageManager = {
    save,
    load,
    reset,
};
