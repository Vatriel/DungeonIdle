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
        const stateToSave = { ...state };
        delete stateToSave.shopItems;
        delete stateToSave.droppedItems;
        delete stateToSave.itemToEquip;

        localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
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

        // --- Réhydratation ---
        loadedData.heroDefinitions = loadedData.heroDefinitions || JSON.parse(JSON.stringify(HERO_DEFINITIONS));
        loadedData.droppedItems = [];
        // Réhydrate les objets de l'inventaire
        if (loadedData.inventory) {
            loadedData.inventory = loadedData.inventory.map(itemData => {
                if (!itemData || !itemData.baseDefinition) return null;
                const item = new Item(itemData.baseDefinition, itemData.level);
                Object.assign(item, itemData);
                return item;
            }).filter(i => i !== null);
        } else {
            loadedData.inventory = [];
        }
        
        loadedData.shopItems = [];
        loadedData.itemToEquip = null;

        // On recrée les instances de Héros avec leurs méthodes.
        loadedData.heroes = loadedData.heroes.map(heroData => {
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

            return hero;
        }).filter(h => h !== null);
        
        // On recrée l'instance du monstre actif.
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
    console.log("Réinitialisation du jeu...");
    localStorage.removeItem(SAVE_KEY);
    location.reload();
}

export const StorageManager = {
    save,
    load,
    reset,
};
