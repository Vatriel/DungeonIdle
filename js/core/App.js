// js/core/App.js

import { state, createInitialState } from './StateManager.js';
import { eventBus } from './EventBus.js';
import { StorageManager } from '../managers/StorageManager.js';
import { UnlockManager } from '../managers/UnlockManager.js';
import { forceFullUIRender, initUIUpdater } from '../ui/UIUpdater.js';
import { TavernUpgradesManager } from '../managers/TavernUpgradesManager.js';
import { InputManager } from '../managers/InputManager.js';
import { ShopManager } from '../managers/ShopManager.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { PrestigeManager } from '../managers/PrestigeManager.js';
import { ArtisanManager } from '../managers/ArtisanManager.js';
import { AutoEquipManager } from '../managers/AutoEquipManager.js';
import { EffectManager } from '../managers/EffectManager.js';
import { PartyManager } from '../managers/PartyManager.js';
import { CombatManager } from '../managers/CombatManager.js';
import { initHistoryManager } from '../managers/HistoryManager.js';
import { DungeonManager } from '../managers/DungeonManager.js';
import { LootManager } from '../managers/LootManager.js';
import { TavernManager } from '../managers/TavernManager.js';
import { TrophyManager } from '../managers/TrophyManager.js';
import { TavernSpecialistsManager } from '../managers/TavernSpecialistsManager.js';
import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';
import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { Duelist } from '../entities/Duelist.js';
import { Protector } from '../entities/Protector.js';
import { Flibustier } from '../entities/Flibustier.js';
import { runGameLoop } from './GameLoop.js';

function initManagers() {
    initUIUpdater(eventBus, state);
    InputManager.init(eventBus);
    ShopManager.init(eventBus, state);
    InventoryManager.init(eventBus, state);
    PrestigeManager.init(eventBus, state);
    ArtisanManager.init(eventBus, state);
    AutoEquipManager.init(eventBus, state);
    EffectManager.init(eventBus, state);
    PartyManager.init(eventBus, state);
    CombatManager.init(eventBus, state);
    initHistoryManager(state);
    DungeonManager.init(eventBus, state);
    LootManager.init(eventBus, state);
    TavernManager.init(eventBus, state);
    TrophyManager.init(eventBus, state);
    TavernSpecialistsManager.init(eventBus, state);
    TavernUpgradesManager.init(eventBus, state);
    StorageManager.init();
}

function setupGlobalEventListeners() {
    eventBus.on('game_pause_status_changed', () => {
        // Événement écouté par main.js pour mettre à jour le bouton.
    });

    eventBus.on('option_changed', (data) => {
        if (state.options[data.key] !== undefined) state.options[data.key] = data.value;
    });

    eventBus.on('ui_toggle_loot_filter_clicked', (data) => {
        state.options.lootFilterActive = data.active;
        state.ui.artisanNeedsUpdate = true;
        eventBus.emit('notification_requested', { message: `Filtre de butin ${data.active ? 'activé' : 'désactivé'}.`, type: 'info' }); 
    });

    eventBus.on('ui_loot_filter_rarity_changed', (data) => {
        state.options.lootFilterRarityThreshold = data.rarity;
        state.ui.artisanNeedsUpdate = true;
        eventBus.emit('notification_requested', { message: `Seuil du filtre de butin : ${data.rarity}.`, type: 'info' }); 
    });

    eventBus.on('ui_toggle_auto_buy_consumables', (data) => {
        state.options.autoBuyTavernConsumables = data.active;
        eventBus.emit('notification_requested', { message: `Achat auto. de consommables ${data.active ? 'activé' : 'désactivé'}.`, type: 'info' }); 
    });

    eventBus.on('ui_toggle_game_pause', () => {
        state.isGamePaused = !state.isGamePaused;
        state.isPausedAtNextEncounter = false;
        eventBus.emit('game_pause_status_changed');
        const message = state.isGamePaused ? "Jeu mis en pause." : "Jeu repris.";
        eventBus.emit('notification_requested', { message: message, type: 'info' });
    });
}

export const App = {
  start() {
    console.log("App.start: Démarrage de l'initialisation du jeu.");
    const loadedState = StorageManager.load();
    const defaultState = createInitialState();

    if (loadedState) {
        console.log("App.start: Sauvegarde normale trouvée. Fusion des états.");
        // Commence avec un état par défaut propre
        Object.assign(state, defaultState);
        // Écrase les propriétés de haut niveau avec les données sauvegardées
        Object.assign(state, loadedState);

        // CORRECTION : Fusionne les objets imbriqués de manière sécurisée pour éviter la perte de données.
        state.options = { ...defaultState.options, ...(loadedState.options || {}) };
        state.resources = { ...defaultState.resources, ...(loadedState.resources || {}) };
        state.ui = { ...defaultState.ui, ...(loadedState.ui || {}) };
        
        // Fusionne les données de la taverne avec attention
        if (loadedState.tavern) {
            state.tavern.reputation = loadedState.tavern.reputation || defaultState.tavern.reputation;
            state.tavern.contractCooldowns = loadedState.tavern.contractCooldowns || defaultState.tavern.contractCooldowns;
            // Fusionne les améliorations achetées
            state.tavern.upgrades = { ...defaultState.tavern.upgrades, ...(loadedState.tavern.upgrades || {}) };
            
            // Met à jour le statut des spécialistes sans écraser leurs définitions complètes
            if (loadedState.tavern.specialists) {
                for (const key in loadedState.tavern.specialists) {
                    if (state.tavern.specialists[key]) {
                        state.tavern.specialists[key].status = loadedState.tavern.specialists[key].status;
                    }
                }
            }
        }
        
        state.activeConsumables = loadedState.activeConsumables || [];
        state.isGamePaused = loadedState.isGamePaused || false;
        state.isPausedAtNextEncounter = loadedState.isPausedAtNextEncounter || false;

        if (loadedState.heroDefinitionsStatus) {
            for (const heroId in loadedState.heroDefinitionsStatus) {
                if (state.heroDefinitions[heroId]) {
                    state.heroDefinitions[heroId].status = loadedState.heroDefinitionsStatus[heroId];
                }
            }
        }
        
        state.heroes = (loadedState.heroes || []).map(heroData => StorageManager.hydrateHero(heroData, state.heroDefinitions, state)).filter(h => h !== null); 

        state.heroes.forEach(heroInParty => {
            if (state.heroDefinitions[heroInParty.id.toUpperCase()]) {
                state.heroDefinitions[heroInParty.id.toUpperCase()].status = 'recruited';
            }
        });

        state.activeMonster = loadedState.activeMonster ? StorageManager.hydrateMonster(loadedState.activeMonster) : null; 
        state.inventory = (loadedState.inventory || []).map(itemData => StorageManager.hydrateItem(itemData)); 
        state.shopItems = (loadedState.shopItems || []).map(itemData => StorageManager.hydrateItem(itemData)); 

    } else {
        console.log("App.start: Aucune sauvegarde normale trouvée. Initialisation avec l'état par défaut (incluant prestige).");
        Object.assign(state, defaultState);
        
        const startingLevel = state.prestigeUpgrades.STARTING_LEVEL ? PRESTIGE_UPGRADES.STARTING_LEVEL.effect(state.prestigeUpgrades.STARTING_LEVEL) : 1;

        Object.values(state.heroDefinitions).forEach(heroDef => {
            if (heroDef.status === 'recruited') {
                let newHero;
                switch(heroDef.id) {
                    case 'priest': newHero = new Priest(heroDef); break;
                    case 'duelist': newHero = new Duelist(heroDef); break;
                    case 'protector': newHero = new Protector(heroDef); break;
                    case 'flibustier': newHero = new Flibustier(heroDef); break;
                    default: newHero = new Hero(heroDef); break;
                }
                if (startingLevel > 1) {
                    for (let i = 1; i < startingLevel; i++) {
                        newHero.levelUp(state, eventBus, false);
                    }
                }
                newHero.initialize(state);
                state.heroes.push(newHero);
                if (!state.ui.heroCardState[newHero.id]) {
                    state.ui.heroCardState[newHero.id] = { isCollapsed: true };
                }
            }
        });
    }
    
    state.itemToEquip = null;
    state.damageBuckets = {};
    
    if ((!state.artisanUnlocked && state.ui.activeTab === 'artisan-panel') || 
        (!state.prestigeUnlockConditionMet && state.ui.activeTab === 'prestige-panel') ||
        (!state.tavernUnlocked && state.ui.activeTab === 'tavern-panel')) {
        state.ui.activeTab = 'shop-panel';
    }

    initManagers();
    setupGlobalEventListeners();
    UnlockManager.checkUnlocks(state, eventBus);
    forceFullUIRender(state);
    
    TavernUpgradesManager.applyAllPermanentEffects();

    console.log("App.start: Initialisation du jeu terminée.");
    
    eventBus.emit('game_pause_status_changed');
    
    runGameLoop();
  }
};
