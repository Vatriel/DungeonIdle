// js/core/Game.js

// --- IMPORTS ---
import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
import { StorageManager } from '../managers/StorageManager.js';
import { ShopManager } from '../managers/ShopManager.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { DungeonManager } from '../managers/DungeonManager.js';
// MODIFIÉ : On importe uniquement la fonction principale de mise à jour de l'UI
import { updateUI, showSavingIndicator, showSaveSuccess, hideSaveIndicator } from '../ui/UIUpdater.js';

// --- CONSTANTES DE GAMEPLAY ---
const PLAYER_CLICK_DAMAGE = 2;
const AUTOSAVE_INTERVAL = 5;

// --- ÉTAT CENTRAL DU JEU ---
let state = {};
let lastTime = 0;

// --- BOUCLE DE JEU ---
function gameLoop(currentTime) {
  if (lastTime === 0) lastTime = currentTime;
  const deltaTime = (currentTime - lastTime) / 1000;
  
  updateGameLogic(deltaTime);
  
  // MODIFIÉ : La boucle de jeu appelle la fonction de mise à jour principale.
  // C'est updateUI qui gérera les rafraîchissements conditionnels.
  updateUI(state);
  
  lastTime = currentTime;
  requestAnimationFrame(gameLoop);
}

function updateGameLogic(dt) {
  // Les managers mettent à jour la logique et lèvent les drapeaux si nécessaire.
  ShopManager.update(state, dt);
  DungeonManager.update(state, dt);

  // Logique d'autosave
  state.autosaveTimer += dt;
  if (state.autosaveTimer >= AUTOSAVE_INTERVAL) {
    state.autosaveTimer = 0;
    triggerSave();
  }
  
  // Déblocage du guerrier
  const warriorDef = state.heroDefinitions.WARRIOR;
  if (warriorDef && state.gold >= warriorDef.cost && warriorDef.status === 'locked') {
    warriorDef.status = 'available';
    // NOUVEAU : On lève un drapeau au lieu d'appeler directement une fonction d'UI
    state.ui.recruitmentNeedsUpdate = true;
  }
}

// --- GESTION DES ACTIONS DU JOUEUR ---
async function triggerSave() {
    showSavingIndicator();
    StorageManager.save(state);
    await new Promise(resolve => setTimeout(resolve, 1000));
    showSaveSuccess();
    setTimeout(hideSaveIndicator, 2000);
}

function onPlayerClick() {
  if (state.activeMonster && state.activeMonster.isAlive()) {
    state.activeMonster.takeDamage(PLAYER_CLICK_DAMAGE);
  }
}

function recruitHero(heroId) {
  const heroDef = state.heroDefinitions[heroId.toUpperCase()];
  if (heroDef && heroDef.status === 'available' && state.gold >= heroDef.cost) {
    state.gold -= heroDef.cost;
    heroDef.status = 'recruited';
    state.heroes.push(new Hero(heroDef));
    // NOUVEAU : On lève les drapeaux pour les parties de l'UI qui ont changé
    state.ui.heroesNeedUpdate = true;
    state.ui.recruitmentNeedsUpdate = true;
  }
}

function moveHero(heroId, direction) {
  const index = state.heroes.findIndex(h => h.id === heroId);
  if (index === -1) return;
  if (direction === 'up' && index > 0) {
    [state.heroes[index], state.heroes[index - 1]] = [state.heroes[index - 1], state.heroes[index]];
    state.ui.heroesNeedUpdate = true; // NOUVEAU
  } else if (direction === 'down' && index < state.heroes.length - 1) {
    [state.heroes[index], state.heroes[index + 1]] = [state.heroes[index + 1], state.heroes[index]];
    state.ui.heroesNeedUpdate = true; // NOUVEAU
  }
}

// --- INITIALISATION ---
function getNewGameState() {
    const heroDefinitions = JSON.parse(JSON.stringify(HERO_DEFINITIONS));
    const initialState = {
        heroes: [],
        activeMonster: null,
        gold: 0,
        gameStatus: 'fighting',
        dungeonFloor: 1,
        encounterIndex: 1,
        encountersPerFloor: 10,
        shopItems: [],
        shopRestockTimer: 0,
        autosaveTimer: 0,
        heroDefinitions: heroDefinitions,
        droppedItems: [],
        inventory: [],
        itemToEquip: null,
        // NOUVEAU : Un objet pour les drapeaux de l'UI et une file pour les notifications
        ui: {
            shopNeedsUpdate: true,
            heroesNeedUpdate: true,
            inventoryNeedsUpdate: true,
            lootNeedsUpdate: true,
            recruitmentNeedsUpdate: true,
            progressionNeedsUpdate: true,
        },
        notifications: [],
    };

    for (const key in initialState.heroDefinitions) {
        if (initialState.heroDefinitions[key].status === 'recruited') {
            initialState.heroes.push(new Hero(initialState.heroDefinitions[key]));
        }
    }
    DungeonManager.generateNextEncounter(initialState);
    return initialState;
}


export function initGame() {
  const loadedState = StorageManager.load();
  if (loadedState) {
    state = loadedState;
    // NOUVEAU : On s'assure que les nouvelles propriétés existent sur les anciennes sauvegardes
    state.ui = state.ui || { shopNeedsUpdate: true, heroesNeedUpdate: true, inventoryNeedsUpdate: true, lootNeedsUpdate: true, recruitmentNeedsUpdate: true, progressionNeedsUpdate: true };
    state.notifications = state.notifications || [];
  } else {
    state = getNewGameState();
  }
  
  // --- SETUP DES ÉCOUTEURS D'ÉVÉNEMENTS ---
  // (Le code des écouteurs d'événements reste identique)
  document.getElementById('refresh-shop-btn').addEventListener('click', () => {
      ShopManager.clearShop(state);
  });
  document.getElementById('shop-area').addEventListener('click', (event) => {
    const buyButton = event.target.closest('.buy-btn');
    if (buyButton) {
      event.preventDefault();
      ShopManager.buyItem(state, parseInt(buyButton.dataset.itemIndex, 10));
    }
  });
  document.getElementById('enemy-panel').addEventListener('mousedown', (event) => {
    event.preventDefault();
    const target = event.target;
    if (target.matches('.pickup-btn')) {
        InventoryManager.pickupItem(state, parseInt(target.dataset.lootIndex, 10));
    } else if (target.matches('.discard-btn')) {
        InventoryManager.discardLootItem(state, parseInt(target.dataset.lootIndex, 10));
    } else if (!target.closest('.item-card')) {
        onPlayerClick();
    }
  });
  document.getElementById('recruitment-area').addEventListener('click', (event) => {
    const button = event.target.closest('[data-hero-id]');
    if (button) recruitHero(button.dataset.heroId);
  });
  document.getElementById('progression-controls').addEventListener('click', (event) => {
    if (event.target.id === 'fight-boss-btn') DungeonManager.startBossFight(state);
    else if (event.target.id === 'next-floor-btn') DungeonManager.advanceToNextFloor(state);
  });
  document.getElementById('heroes-area').addEventListener('mousedown', (event) => {
    event.preventDefault();
    const target = event.target;
    if (target.matches('.unequip-btn')) {
        const { heroId, slot } = target.dataset;
        const hero = state.heroes.find(h => h.id === heroId);
        if (hero) InventoryManager.unequipItemFromHero(state, hero, slot);
        return;
    }
    if (state.itemToEquip) {
        const heroCard = target.closest('.hero-card');
        if (heroCard) {
            const hero = state.heroes.find(h => h.id === heroCard.dataset.heroId);
            if (hero) InventoryManager.equipItemOnHero(state, hero);
        } else {
            InventoryManager.cancelEquip(state);
        }
    } else {
        const button = target.closest('.move-hero-btn');
        if (button) {
          const { heroId, direction } = button.dataset;
          moveHero(heroId, direction);
        }
    }
  });
  document.getElementById('inventory-grid').addEventListener('mousedown', (event) => {
      event.preventDefault();
      const target = event.target;
      if (target.matches('.inventory-discard-btn')) {
          InventoryManager.discardInventoryItem(state, parseInt(target.dataset.inventoryIndex, 10));
      } else {
          const itemCard = target.closest('.inventory-item');
          if (itemCard) {
              InventoryManager.selectItemToEquip(state, parseInt(itemCard.dataset.inventoryIndex, 10));
          }
      }
  });
  document.getElementById('reset-game-btn').addEventListener('click', StorageManager.reset);

  // --- DÉMARRAGE DU JEU ---
  requestAnimationFrame(gameLoop);
}
