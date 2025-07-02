// js/core/Game.js

// --- IMPORTS ---
import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
import { StorageManager } from '../managers/StorageManager.js';
import { ShopManager } from '../managers/ShopManager.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { DungeonManager } from '../managers/DungeonManager.js';
import { updateUI, renderRecruitmentArea, renderProgressionControls, showSavingIndicator, showSaveSuccess, hideSaveIndicator } from '../ui/UIUpdater.js';

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
  updateUI(state);
  lastTime = currentTime;
  requestAnimationFrame(gameLoop);
}

function updateGameLogic(dt) {
  ShopManager.update(state, dt);
  DungeonManager.update(state, dt);

  state.autosaveTimer += dt;
  if (state.autosaveTimer >= AUTOSAVE_INTERVAL) {
    state.autosaveTimer = 0;
    triggerSave();
  }
  
  const warriorDef = state.heroDefinitions.WARRIOR;
  if (warriorDef && state.gold >= warriorDef.cost && warriorDef.status === 'locked') {
    warriorDef.status = 'available';
    renderRecruitmentArea(state.heroDefinitions);
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
    renderRecruitmentArea(state.heroDefinitions);
  }
}

function moveHero(heroId, direction) {
  const index = state.heroes.findIndex(h => h.id === heroId);
  if (index === -1) return;
  if (direction === 'up' && index > 0) {
    [state.heroes[index], state.heroes[index - 1]] = [state.heroes[index - 1], state.heroes[index]];
  } else if (direction === 'down' && index < state.heroes.length - 1) {
    [state.heroes[index], state.heroes[index + 1]] = [state.heroes[index + 1], state.heroes[index]];
  }
}

// --- INITIALISATION ---
export function initGame() {
  const loadedState = StorageManager.load();
  if (loadedState) {
    state = loadedState;
  } else {
    state = {
      heroes: [], activeMonster: null, gold: 0, gameStatus: 'fighting',
      dungeonFloor: 1, encounterIndex: 1, encountersPerFloor: 10,
      shopItems: [], shopRestockTimer: 0, autosaveTimer: 0,
      heroDefinitions: JSON.parse(JSON.stringify(HERO_DEFINITIONS)),
      droppedItems: [], inventory: [], itemToEquip: null
    };
    for (const key in state.heroDefinitions) {
      if (state.heroDefinitions[key].status === 'recruited') {
        state.heroes.push(new Hero(state.heroDefinitions[key]));
      }
    }
    DungeonManager.generateNextEncounter(state);
  }
  
  // --- SETUP DES ÉCOUTEURS D'ÉVÉNEMENTS ---
  
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
  renderRecruitmentArea(state.heroDefinitions);
  renderProgressionControls(state.gameStatus);
  requestAnimationFrame(gameLoop);
}
