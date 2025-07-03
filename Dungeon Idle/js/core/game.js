// js/core/game.js

import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { StorageManager } from '../managers/StorageManager.js';
import { ShopManager } from '../managers/ShopManager.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { DungeonManager } from '../managers/DungeonManager.js';
import { UnlockManager } from '../managers/UnlockManager.js';
import { updateUI } from '../ui/UIUpdater.js';
import { showSavingIndicator, showSaveSuccess, hideSaveIndicator } from '../ui/EffectsUI.js';
import { EventBus } from './EventBus.js';

const PLAYER_CLICK_DAMAGE = 2;
const AUTOSAVE_INTERVAL = 10;

let state = {};
let lastTime = 0;
const eventBus = new EventBus();

function gameLoop(currentTime) {
  if (lastTime === 0) lastTime = currentTime;
  const deltaTime = (currentTime - lastTime) / 1000;
  
  // On garde une copie de l'état précédent pour les comparaisons dans l'UI
  const oldState = { gold: state.gold };

  updateGameLogic(deltaTime);
  updateUI(state, deltaTime, oldState);
  lastTime = currentTime;
  requestAnimationFrame(gameLoop);
}

function updateGameLogic(dt) {
  ShopManager.update(state, dt, eventBus);
  DungeonManager.update(state, dt, eventBus);

  state.autosaveTimer += dt;
  if (state.autosaveTimer >= AUTOSAVE_INTERVAL) {
    state.autosaveTimer = 0;
    triggerSave();
  }
}

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
    if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, timer: 0.3 };
    state.damageBuckets.monster.damage += PLAYER_CLICK_DAMAGE;
  }
}

function recruitHero(heroId) {
  const heroDef = state.heroDefinitions[heroId.toUpperCase()];
  if (heroDef && heroDef.status === 'available' && state.gold >= heroDef.cost) {
    state.gold -= heroDef.cost;
    heroDef.status = 'recruited';
    
    let newHero;
    switch(heroId) {
        case 'priest':
            newHero = new Priest(heroDef);
            break;
        default:
            newHero = new Hero(heroDef);
            break;
    }

    state.heroes.push(newHero);

    if (!state.ui.heroCardState) state.ui.heroCardState = {};
    state.ui.heroCardState[newHero.id] = { isCollapsed: false };

    state.ui.heroesNeedUpdate = true;
    state.ui.recruitmentNeedsUpdate = true;
  }
}

function moveHero(heroId, direction) {
  const index = state.heroes.findIndex(h => h.id === heroId);
  if (index === -1) return;
  if (direction === 'up' && index > 0) {
    [state.heroes[index], state.heroes[index - 1]] = [state.heroes[index - 1], state.heroes[index]];
    state.ui.heroesNeedUpdate = true;
  } else if (direction === 'down' && index < state.heroes.length - 1) {
    [state.heroes[index], state.heroes[index + 1]] = [state.heroes[index + 1], state.heroes[index]];
    state.ui.heroesNeedUpdate = true;
  }
}

function toggleHeroCardView(heroId) {
    if (state.ui.heroCardState && state.ui.heroCardState[heroId]) {
        state.ui.heroCardState[heroId].isCollapsed = !state.ui.heroCardState[heroId].isCollapsed;
        state.ui.heroesNeedUpdate = true;
    }
}

function setupEventListeners() {
  eventBus.on('monster_defeated', (data) => {
    state.gold += data.goldGained;
    UnlockManager.checkUnlocks(state, eventBus);

    let needsFullUpdate = false;
    state.heroes.forEach(hero => {
      if (hero.isFighting()) {
        const previousLevel = hero.level;
        // CORRIGÉ : On passe l'eventBus pour la notification de level up
        hero.addXp(data.xpGained, eventBus);
        if (hero.level > previousLevel) {
          needsFullUpdate = true;
        }
      }
    });
    if (needsFullUpdate) state.ui.heroesNeedUpdate = true;
    else state.ui.heroBarsNeedUpdate = true;
  });

  eventBus.on('item_dropped', (data) => InventoryManager.addDroppedItem(state, data.item));
  
  eventBus.on('encounter_changed', (data) => {
      state.gameStatus = data.newStatus;
      state.encounterIndex = data.encounterIndex;
      state.activeMonster = data.newMonster;
      state.ui.progressionNeedsUpdate = true;
  });
  
  eventBus.on('dungeon_state_changed', (data) => {
      state.gameStatus = data.newStatus;
      state.ui.progressionNeedsUpdate = true;
      if (data.fullHeal) {
          state.heroes.forEach(hero => {
              hero.hp = hero.maxHp;
              hero.status = 'fighting';
          });
          state.ui.heroesNeedUpdate = true;
      }
  });

  eventBus.on('floor_advanced', (data) => {
      state.dungeonFloor = data.newFloor;
      state.encounterIndex = 1;
      state.gameStatus = 'fighting';
      UnlockManager.checkUnlocks(state, eventBus);
      state.ui.progressionNeedsUpdate = true;
      DungeonManager.generateNextEncounter(state, eventBus);
  });

  // NOUVEAU : Écouteurs pour les effets visuels et le drag-and-drop
  eventBus.on('hero_leveled_up', (data) => {
      const heroCard = document.querySelector(`.hero-card[data-hero-id="${data.heroId}"]`);
      if (heroCard) {
          const levelEl = heroCard.querySelector('.hero-level');
          if(levelEl) {
              levelEl.classList.add('level-up-flash');
              levelEl.addEventListener('animationend', () => {
                  levelEl.classList.remove('level-up-flash');
              }, { once: true });
          }
      }
  });

  eventBus.on('item_dropped_on_hero', (data) => {
      InventoryManager.equipItemFromDrag(state, data.inventoryIndex, data.heroId, eventBus);
  });


  eventBus.on('notification_sent', (data) => state.notifications.push(data));
  eventBus.on('ui_heroes_need_update', () => { state.ui.heroesNeedUpdate = true; });
  eventBus.on('hero_healed', (data) => {
    state.floatingTexts.push({ text: data.amount, type: 'heal', targetId: data.targetId });
  });
}

function getNewGameState() {
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
        heroDefinitions: JSON.parse(JSON.stringify(HERO_DEFINITIONS)),
        droppedItems: [],
        inventory: [],
        itemToEquip: null,
        ui: {
            shopNeedsUpdate: true,
            heroesNeedUpdate: true,
            heroBarsNeedUpdate: true,
            inventoryNeedsUpdate: true,
            lootNeedsUpdate: true,
            recruitmentNeedsUpdate: true,
            progressionNeedsUpdate: true,
            heroCardState: {},
            shopLockModeActive: false,
            autoProgressToBoss: false,
            autoProgressToNextFloor: false,
        },
        notifications: [],
        floatingTexts: [],
        damageBuckets: {},
        eventBus: eventBus, // On passe l'instance de l'eventBus à l'état
    };

    for (const key in initialState.heroDefinitions) {
        const heroDef = initialState.heroDefinitions[key];
        if (heroDef.status === 'recruited') {
            let newHero;
            switch(heroDef.id) {
                case 'priest':
                    newHero = new Priest(heroDef);
                    break;
                default:
                    newHero = new Hero(heroDef);
                    break;
            }
            initialState.heroes.push(newHero);
            if (!initialState.ui.heroCardState) initialState.ui.heroCardState = {};
            initialState.ui.heroCardState[newHero.id] = { isCollapsed: false };
        }
    }
    return initialState;
}


export function initGame() {
  const loadedState = StorageManager.load();
  let isNewGame = false;
  
  if (loadedState) {
    state = loadedState;
    state.eventBus = eventBus; // On s'assure que l'eventBus est présent
    const heroCardState = state.ui?.heroCardState || {};
    const shopLockModeActive = state.ui?.shopLockModeActive || false;
    const autoProgressToBoss = state.ui?.autoProgressToBoss || false;
    const autoProgressToNextFloor = state.ui?.autoProgressToNextFloor || false;
    state.ui = {
        shopNeedsUpdate: true,
        heroesNeedUpdate: true,
        heroBarsNeedUpdate: false,
        inventoryNeedsUpdate: true,
        lootNeedsUpdate: true,
        recruitmentNeedsUpdate: true,
        progressionNeedsUpdate: true,
        heroCardState: heroCardState,
        shopLockModeActive: shopLockModeActive,
        autoProgressToBoss: autoProgressToBoss,
        autoProgressToNextFloor: autoProgressToNextFloor,
    };
    state.notifications = state.notifications || [];
    state.floatingTexts = [];
    state.damageBuckets = {};
  } else {
    state = getNewGameState();
    isNewGame = true;
  }
  
  setupEventListeners();
  
  UnlockManager.checkUnlocks(state, eventBus);
  
  if (isNewGame) {
      DungeonManager.generateNextEncounter(state, eventBus);
  }

  // --- Setup des écouteurs d'événements du DOM ---
  document.getElementById('refresh-shop-btn').addEventListener('click', () => {
      ShopManager.clearShop(state);
  });

  document.getElementById('toggle-lock-mode-btn').addEventListener('click', (event) => {
    state.ui.shopLockModeActive = !state.ui.shopLockModeActive;
    event.currentTarget.classList.toggle('active', state.ui.shopLockModeActive);
    document.getElementById('shop-panel').classList.toggle('lock-mode-active', state.ui.shopLockModeActive);
  });

  document.getElementById('shop-area').addEventListener('click', (event) => {
    if (state.ui.shopLockModeActive) {
        const itemCard = event.target.closest('.shop-item-card');
        if (itemCard) {
            const itemIndex = parseInt(itemCard.querySelector('.buy-btn').dataset.itemIndex, 10);
            const item = state.shopItems[itemIndex];
            if (item) {
                item.isLocked = !item.isLocked;
                state.ui.shopNeedsUpdate = true;
            }
        }
        return;
    }

    const buyButton = event.target.closest('.buy-btn');
    if (buyButton) {
      ShopManager.buyItem(state, parseInt(buyButton.dataset.itemIndex, 10), eventBus);
    }
  });

  document.getElementById('enemy-panel').addEventListener('click', (event) => {
    const target = event.target;
    if (target.matches('.pickup-btn')) {
        InventoryManager.pickupItem(state, parseInt(target.dataset.lootIndex, 10), eventBus);
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
    if (event.target.id === 'fight-boss-btn') DungeonManager.startBossFight(state, eventBus);
    else if (event.target.id === 'next-floor-btn') DungeonManager.advanceToNextFloor(state, eventBus);
  });

  document.getElementById('auto-progression-controls').addEventListener('change', (event) => {
    if (event.target.id === 'auto-boss-checkbox') {
        state.ui.autoProgressToBoss = event.target.checked;
    } else if (event.target.id === 'auto-floor-checkbox') {
        state.ui.autoProgressToNextFloor = event.target.checked;
    }
  });

  document.getElementById('heroes-area').addEventListener('click', (event) => {
    event.preventDefault();
    const target = event.target;

    const toggleButton = target.closest('.toggle-view-btn');
    if (toggleButton) {
        toggleHeroCardView(toggleButton.dataset.heroId);
        return;
    }

    if (target.matches('.unequip-btn')) {
        const { heroId, slot } = target.dataset;
        const hero = state.heroes.find(h => h.id === heroId);
        if (hero) InventoryManager.unequipItemFromHero(state, hero, slot, eventBus);
        return;
    }

    if (state.itemToEquip) {
        const heroCard = target.closest('.hero-card');
        if (heroCard) {
            const hero = state.heroes.find(h => h.id === heroCard.dataset.heroId);
            if (hero) InventoryManager.equipItemOnHero(state, hero, eventBus);
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
  
  document.getElementById('inventory-grid').addEventListener('click', (event) => {
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

  document.getElementById('reset-game-btn').addEventListener('click', () => StorageManager.reset());

  updateUI(state, 0, { gold: state.gold });

  requestAnimationFrame(gameLoop);
}
