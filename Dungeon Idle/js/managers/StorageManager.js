// js/managers/StorageManager.js

import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { showConfirmationModal } from '../ui/EffectsUI.js'; // Importe la modal de confirmation

const SAVE_KEY = 'dungeonIdleSave'; // Clé pour le stockage local

/**
 * Sauvegarde l'état actuel du jeu dans le localStorage.
 * Ne sauvegarde que les données essentielles et sérialisables.
 * @param {object} state - L'objet state complet du jeu.
 */
function save(state) {
    try {
        const plainState = {
            // Données générales du jeu
            gold: state.gold,
            gameStatus: state.gameStatus,
            dungeonFloor: state.dungeonFloor,
            encounterIndex: state.encounterIndex,
            encountersPerFloor: state.encountersPerFloor, // Ajouté à la sauvegarde

            // Données de l'interface utilisateur et timers
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

            // Sauvegarde les propriétés sérialisables des héros
            heroes: state.heroes.map(hero => ({
                id: hero.id,
                level: hero.level,
                xp: hero.xp,
                xpToNextLevel: hero.xpToNextLevel,
                status: hero.status,
                // L'équipement est déjà un objet simple d'items (qui sont sérialisables)
                equipment: hero.equipment,
                // Les buffs actifs sont des objets simples
                activeBuffs: hero.activeBuffs,
                // Sauvegarde les HP actuels pour la persistance de l'état de santé
                hp: hero.hp, 
            })),

            // Sauvegarde uniquement le statut de déblocage des définitions de héros
            heroDefinitionsStatus: Object.fromEntries(
                Object.entries(state.heroDefinitions).map(([key, def]) => [key, def.status])
            ),

            // L'inventaire et les items de la boutique sont des tableaux d'objets Item
            inventory: state.inventory,
            shopItems: state.shopItems,
            
            // Les items lâchés et l'itemToEquip ne sont pas persistés car ils sont transitoires
            // droppedItems: [], // Non persisté
            // itemToEquip: null, // Non persisté
            
            // Le monstre actif est également persisté
            activeMonster: state.activeMonster,
        };

        localStorage.setItem(SAVE_KEY, JSON.stringify(plainState));
    } catch (e) {
        console.error("Erreur lors de la sauvegarde :", e);
    }
}

/**
 * Hydrate un objet Item à partir de ses données sérialisées.
 * @param {object} itemData - Les données de l'item.
 * @returns {Item|null} L'objet Item reconstruit.
 */
function hydrateItem(itemData) {
    if (!itemData || !itemData.baseDefinition) return null;
    // Crée une nouvelle instance d'Item en utilisant sa définition de base et son niveau
    const item = new Item(itemData.baseDefinition, itemData.level);
    // Copie toutes les autres propriétés sérialisées (rarity, stats, cost, isLocked, etc.)
    Object.assign(item, itemData);
    return item;
}

/**
 * Hydrate un objet Hero (ou Priest) à partir de ses données sérialisées.
 * @param {object} heroData - Les données du héros.
 * @param {object} heroDefinitions - Les définitions de tous les héros.
 * @returns {Hero|Priest|null} L'objet Hero/Priest reconstruit.
 */
function hydrateHero(heroData, heroDefinitions) {
    const heroDef = heroDefinitions[heroData.id.toUpperCase()];
    if (!heroDef) {
        console.warn(`Définition de héros non trouvée pour l'ID: ${heroData.id}. Ce héros sera ignoré.`);
        return null;
    }
    
    let hero;
    // Instancie la classe correcte (Hero ou Priest)
    switch(heroData.id) {
        case 'priest':
            hero = new Priest(heroDef);
            break;
        default:
            hero = new Hero(heroDef);
            break;
    }

    // Copie les propriétés sérialisées
    Object.assign(hero, heroData);

    // Ré-hydrate l'équipement du héros
    for (const slot in hero.equipment) {
        const itemData = hero.equipment[slot];
        if (itemData && itemData.baseDefinition) {
            hero.equipment[slot] = hydrateItem(itemData);
        } else {
            hero.equipment[slot] = null;
        }
    }
    
    // S'assure que activeBuffs est un tableau (pour les anciennes sauvegardes)
    hero.activeBuffs = hero.activeBuffs || [];
    // Recalcule les statistiques après l'hydratation complète (important pour les getters)
    hero._recalculateStats(); 
    // S'assure que les HP ne dépassent pas les HP max après le chargement
    if (hero.hp > hero.maxHp) hero.hp = hero.maxHp;

    return hero;
}

/**
 * Charge l'état du jeu depuis le localStorage et le "réhydrate" en objets JavaScript.
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
        
        // Réinitialise les définitions de héros avec les valeurs par défaut, puis applique les statuts sauvegardés
        const freshHeroDefinitions = JSON.parse(JSON.stringify(HERO_DEFINITIONS));
        if (loadedData.heroDefinitionsStatus) {
            for (const key in loadedData.heroDefinitionsStatus) {
                if (freshHeroDefinitions[key]) {
                    freshHeroDefinitions[key].status = loadedData.heroDefinitionsStatus[key];
                }
            }
        }
        loadedData.heroDefinitions = freshHeroDefinitions;

        // Ré-hydrate les items de l'inventaire et de la boutique
        loadedData.inventory = (loadedData.inventory || []).map(hydrateItem).filter(i => i !== null);
        loadedData.shopItems = (loadedData.shopItems || []).map(hydrateItem).filter(i => i !== null);

        // Réinitialise les items transitoires qui ne sont pas persistés
        loadedData.droppedItems = [];
        loadedData.itemToEquip = null;

        // Ré-hydrate les héros
        loadedData.heroes = (loadedData.heroes || []).map(heroData => hydrateHero(heroData, loadedData.heroDefinitions)).filter(h => h !== null);
        
        // Ré-hydrate le monstre actif (Boss ou MonsterGroup)
        if(loadedData.activeMonster) {
            if(loadedData.activeMonster.initialCount !== undefined) { // C'est un MonsterGroup
                const monster = new MonsterGroup(loadedData.activeMonster.baseDefinition, loadedData.activeMonster.initialCount);
                Object.assign(monster, loadedData.activeMonster);
                loadedData.activeMonster = monster;
            } else { // C'est un Boss
                // Note: Le constructeur de Boss attend (name, hp, damage, attackSpeed, level)
                // Assurez-vous que ces propriétés sont présentes dans loadedData.activeMonster
                const boss = new Boss(
                    loadedData.activeMonster.name, 
                    loadedData.activeMonster.maxHp, 
                    loadedData.activeMonster.damage, // Utilise 'damage' au lieu de 'dps' pour la cohérence
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

/**
 * Efface la sauvegarde et recharge la page pour réinitialiser le jeu.
 * Utilise une modal de confirmation personnalisée au lieu de window.confirm.
 */
function reset() {
    showConfirmationModal("Êtes-vous sûr de vouloir réinitialiser votre partie ? Toute votre progression sera perdue.", () => {
        console.log("Réinitialisation du jeu...");
        localStorage.removeItem(SAVE_KEY);
        window.location.reload();
    });
}

export const StorageManager = {
    save,
    load,
    reset,
};

