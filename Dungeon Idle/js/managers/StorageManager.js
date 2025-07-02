// js/managers/StorageManager.js

// On importe les classes nécessaires pour "réhydrater" (recréer) les objets à partir des données sauvegardées.
import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
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
        // On crée une copie de l'état pour ne pas modifier l'original.
        // On exclut les propriétés "transitoires" qui ne doivent pas être sauvegardées
        // (comme les objets en boutique ou l'objet en cours d'équipement).
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
        // On s'assure que les propriétés de base existent pour éviter les erreurs.
        loadedData.heroDefinitions = loadedData.heroDefinitions || JSON.parse(JSON.stringify(HERO_DEFINITIONS));
        loadedData.droppedItems = []; // Toujours vide au chargement
        loadedData.inventory = loadedData.inventory || [];
        loadedData.shopItems = []; // Toujours vide au chargement
        loadedData.itemToEquip = null; // Jamais sauvegardé

        // On recrée les instances de Héros avec leurs méthodes.
        loadedData.heroes = loadedData.heroes.map(heroData => {
            const heroDef = loadedData.heroDefinitions[heroData.id.toUpperCase()];
            const hero = new Hero(heroDef);
            Object.assign(hero, heroData);
            // On recrée aussi les instances des objets équipés.
            for (const slot in hero.equipment) {
                const itemData = hero.equipment[slot];
                if (itemData) {
                    const item = new Item(itemData.baseDefinition, itemData.level);
                    Object.assign(item, itemData);
                    hero.equipment[slot] = item;
                }
            }
            return hero;
        });
        
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
        console.error("Erreur lors du chargement de la sauvegarde (peut-être corrompue) :", e);
        localStorage.removeItem(SAVE_KEY); // On supprime la sauvegarde invalide
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

// On exporte un objet contenant nos méthodes publiques.
export const StorageManager = {
    save,
    load,
    reset,
};
