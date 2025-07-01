// js/managers/StorageManager.js

// Ce manager a besoin de connaître les classes et les définitions pour "réhydrater" la sauvegarde.
import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';

const SAVE_KEY = 'dungeonIdleSave'; // On utilise une clé de sauvegarde claire

/**
 * Sauvegarde l'état actuel du jeu dans le localStorage.
 * @param {object} state - L'objet state complet du jeu.
 */
function save(state) {
    try {
        // On ne sauvegarde pas les objets de la boutique pour qu'elle soit fraîche à chaque chargement
        const stateToSave = { ...state, shopItems: [] };
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
        console.log("Aucune sauvegarde trouvée. Lancement d'une nouvelle partie.");
        return null;
    }

    try {
        const loadedData = JSON.parse(savedStateJSON);

        // Si la sauvegarde contient des heroDefinitions, on les utilise pour la réhydratation.
        const definitionsToUse = loadedData.heroDefinitions || HERO_DEFINITIONS;

        // Réhydratation des héros
        loadedData.heroes = loadedData.heroes.map(heroData => {
            const heroDef = definitionsToUse[heroData.definition.id.toUpperCase()];
            if (!heroDef) return null;
            const hero = new Hero(heroDef);
            Object.assign(hero, heroData);
            return hero;
        }).filter(Boolean);

        // Réhydratation du monstre
        if (loadedData.activeMonster) {
            const monsterData = loadedData.activeMonster;
            if (monsterData.initialCount !== undefined) { // C'est un MonsterGroup
                const monster = new MonsterGroup(monsterData.baseDefinition, monsterData.initialCount);
                Object.assign(monster, monsterData);
                loadedData.activeMonster = monster;
            } else { // C'est un Boss
                const boss = new Boss(monsterData.name, monsterData.maxHp, monsterData.dps, monsterData.level);
                Object.assign(boss, monsterData);
                loadedData.activeMonster = boss;
            }
        }
        
        console.log("Partie chargée avec succès !");
        return loadedData;

    } catch (e) {
        console.error("Erreur lors du chargement de la sauvegarde corrompue :", e);
        localStorage.removeItem(SAVE_KEY); // On supprime la sauvegarde invalide
        return null;
    }
}

// On exporte un objet avec le nom que tu as choisi
export const StorageManager = {
    save,
    load,
};
