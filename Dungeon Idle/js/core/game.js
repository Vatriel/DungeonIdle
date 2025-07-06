// js/core/game.js

import { HERO_DEFINITIONS } from '../data/heroData.js';
import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';
import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { Duelist } from '../entities/Duelist.js';
import { StorageManager } from '../managers/StorageManager.js';
import { ShopManager } from '../managers/ShopManager.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { DungeonManager } from '../managers/DungeonManager.js';
import { UnlockManager } from '../managers/UnlockManager.js';
import { PrestigeManager } from '../managers/PrestigeManager.js';
import { updateUI } from '../ui/UIUpdater.js';
import { showSavingIndicator, showSaveSuccess, hideSaveIndicator, showNotification, showConfirmationModal, createFlavorFloatingText } from '../ui/EffectsUI.js'; // MODIFIÉ
import { showOptionsModal } from '../ui/OptionsUI.js';
import { EventBus } from './EventBus.js';

const PLAYER_CLICK_DAMAGE = 2;
const AUTOSAVE_INTERVAL = 10;
const PRESTIGE_UNLOCK_FLOOR = 15;

let state = {};
let lastTime = 0;
const eventBus = new EventBus();

let isSaving = false;

function gameLoop(currentTime) {
  if (lastTime === 0) lastTime = currentTime;
  const deltaTime = (currentTime - lastTime) / 1000;
  
  const oldState = { gold: state.gold };

  updateGameLogic(deltaTime);
  updateUI(state, deltaTime, oldState);
  lastTime = currentTime;
  requestAnimationFrame(gameLoop);
}

function updateGameLogic(dt) {
  ShopManager.update(state, dt, eventBus);
  DungeonManager.update(state, dt, eventBus);

  if (state.options.autoFightBoss && state.bossUnlockReached && !state.pendingBossFight && !state.bossIsDefeated && state.gameStatus !== 'boss_fight') {
      state.pendingBossFight = true;
      showNotification('Boss enclenché automatiquement !', 'success');
      state.ui.progressionNeedsUpdate = true;
  }
  if (state.options.autoNextFloor && state.bossIsDefeated) {
      DungeonManager.advanceToNextFloor(state, eventBus);
  }

  state.autosaveTimer += dt;
  if (state.autosaveTimer >= AUTOSAVE_INTERVAL) {
    state.autosaveTimer = 0;
    if (!isSaving) {
        triggerSave();
    }
  }
}

async function triggerSave() {
    isSaving = true;
    showSavingIndicator();
    StorageManager.save(state);
    await new Promise(resolve => setTimeout(resolve, 500));
    showSaveSuccess();
    setTimeout(() => {
        hideSaveIndicator();
        isSaving = false;
    }, 2000);
}

function onPlayerClick() {
  if (state.activeMonster && state.activeMonster.isAlive()) {
    state.activeMonster.takeDamage(PLAYER_CLICK_DAMAGE);
    if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
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
        case 'duelist':
            newHero = new Duelist(heroDef);
            break;
        default:
            newHero = new Hero(heroDef);
            break;
    }
    
    const startingLevel = state.prestigeUpgrades.STARTING_LEVEL ? PRESTIGE_UPGRADES.STARTING_LEVEL.effect(state.prestigeUpgrades.STARTING_LEVEL) : 1;
    if (startingLevel > 1) {
        for (let i = 1; i < startingLevel; i++) {
            newHero.levelUp(state, eventBus, false);
        }
    }
    
    newHero._recalculateStats(state);
    newHero.hp = newHero.maxHp;

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

function triggerPrestigeReset() {
    const echosToGain = Math.floor(Math.pow(state.highestFloorThisRun, 1.5) / 2);

    if (echosToGain <= 0) {
        showNotification("Vous devez progresser plus loin pour gagner plus d'Échos !", "error");
        return;
    }

    const message = `Voulez-vous vraiment effectuer une Renaissance ?\n\nVotre progression (or, objets, étage, niveaux des héros) sera réinitialisée.\n\nEn récompense de vos efforts, vous gagnerez ${echosToGain} Échos de l'Âme.\n\nLes Échos et les améliorations de prestige sont permanents.`;
    
    showConfirmationModal(message, () => {
        prestigeReset(echosToGain);
    });
}

function prestigeReset(echosGained) {
    const isFirstPrestige = !state.duelistUnlockedByPrestige;
    
    const permanentState = {
        soulEchos: state.soulEchos + echosGained,
        prestigeUpgrades: state.prestigeUpgrades,
        highestFloorAchieved: Math.max(state.highestFloorAchieved, state.highestFloorThisRun),
        heroDefinitionsStatus: Object.fromEntries(
            Object.entries(state.heroDefinitions).map(([key, def]) => [key, def.status])
        ),
        duelistUnlockedByPrestige: true,
        options: state.options,
    };

    StorageManager.savePrestige(permanentState);
    
    if (isFirstPrestige) {
        showNotification("Un nouveau pouvoir s'éveille... Le Duelliste sera disponible lors de votre prochaine ascension !", 'success');
        setTimeout(() => window.location.reload(), 3000);
    } else {
        window.location.reload();
    }
}


function setupEventListeners() {
  eventBus.on('monster_defeated', (data) => {
    const goldBonus = state.prestigeUpgrades.GOLDEN_ECHO ? PRESTIGE_UPGRADES.GOLDEN_ECHO.effect(state.prestigeUpgrades.GOLDEN_ECHO) / 100 : 0;
    state.gold += data.goldGained * (1 + goldBonus);

    UnlockManager.checkUnlocks(state, eventBus);

    let needsFullUpdate = false;
    const xpBonus = state.prestigeUpgrades.LEARNED_SOUL ? PRESTIGE_UPGRADES.LEARNED_SOUL.effect(state.prestigeUpgrades.LEARNED_SOUL) / 100 : 0;
    const finalXpGained = data.xpGained * (1 + xpBonus);

    state.heroes.forEach(hero => {
      if (hero.isFighting()) {
        const previousLevel = hero.level;
        hero.addXp(finalXpGained, eventBus, state);
        if (hero.level > previousLevel) {
          needsFullUpdate = true;
        }
      }
    });
    
    if (needsFullUpdate) {
        state.ui.heroesNeedUpdate = true;
    }
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
      state.highestFloorAchieved = Math.max(state.highestFloorAchieved, state.dungeonFloor);
      state.highestFloorThisRun = Math.max(state.highestFloorThisRun, state.dungeonFloor);
      
      if (!state.prestigeUnlockConditionMet && state.highestFloorAchieved >= PRESTIGE_UNLOCK_FLOOR) {
          state.prestigeUnlockConditionMet = true;
      }

      state.encounterIndex = 1;
      state.bossUnlockReached = false;
      state.bossIsDefeated = false;
      state.pendingBossFight = false;
      state.gameStatus = 'encounter_cooldown';
      state.encounterCooldown = 0.5;
      state.activeMonster = null;
      UnlockManager.checkUnlocks(state, eventBus);
      state.ui.progressionNeedsUpdate = true;
  });

  eventBus.on('hero_leveled_up', (data) => {
      state.ui.heroesNeedUpdate = true;
  });

  eventBus.on('item_dropped_on_hero', (data) => {
      InventoryManager.equipItemFromDrag(state, data.inventoryIndex, data.heroId, eventBus);
  });
  
  eventBus.on('riposte_triggered', (data) => {
      const heroCard = document.querySelector(`.hero-card[data-hero-id="${data.heroId}"]`);
      if (heroCard) {
          showNotification(data.type, 'riposte', heroCard);
      }
  });

  // NOUVEAU : Écouteur pour les textes de combat spéciaux
  eventBus.on('flavor_text_triggered', (data) => {
      const targetElement = data.targetId === 'monster'
          ? document.getElementById('monster-area')
          : document.querySelector(`.hero-card[data-hero-id="${data.targetId}"]`);
      
      if (targetElement) {
          createFlavorFloatingText(data.text, data.type, targetElement);
      }
  });

  eventBus.on('option_changed', (data) => {
      if (state.options[data.key] !== undefined) {
          state.options[data.key] = data.value;
      }
  });

  eventBus.on('notification_sent', (data) => state.notifications.push(data));
  eventBus.on('ui_heroes_need_update', () => { state.ui.heroesNeedUpdate = true; });


  // --- Setup des écouteurs d'événements du DOM ---

  document.getElementById('refresh-shop-btn').addEventListener('click', () => {
      ShopManager.clearShop(state);
  });

  document.getElementById('toggle-lock-mode-btn').addEventListener('click', (event) => {
    state.ui.shopLockModeActive = !state.ui.shopLockModeActive;
    event.currentTarget.classList.toggle('active', state.ui.shopLockModeActive);
    document.querySelector('.tab-content.active').classList.toggle('lock-mode-active', state.ui.shopLockModeActive);
  });

  document.getElementById('right-panels-container').addEventListener('click', (event) => {
    if (state.ui.activeTab === 'shop-panel') {
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
    }
    if (state.ui.activeTab === 'prestige-panel') {
        const buyButton = event.target.closest('.buy-btn');
        if (buyButton && buyButton.dataset.upgradeId) {
            PrestigeManager.buyUpgrade(state, buyButton.dataset.upgradeId, eventBus);
        }
    }
    if (state.ui.activeTab === 'inventory-panel') {
        const target = event.target;
        if (target.matches('.inventory-discard-btn')) {
            InventoryManager.discardInventoryItem(state, parseInt(target.dataset.inventoryIndex, 10));
        } else {
            const itemCard = target.closest('.inventory-item');
            if (itemCard) {
                InventoryManager.selectItemToEquip(state, parseInt(itemCard.dataset.inventoryIndex, 10));
            }
        }
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
    if (event.target.id === 'fight-boss-btn') {
        state.pendingBossFight = true;
        showNotification('Le boss arrive ! Préparez-vous !', 'success');
        state.ui.progressionNeedsUpdate = true;
    } else if (event.target.id === 'next-floor-btn') {
        DungeonManager.advanceToNextFloor(state, eventBus);
    }
  });

  document.getElementById('heroes-area').addEventListener('click', (event) => {
    const target = event.target;
    
    const toggleButton = target.closest('.toggle-view-btn');
    if (toggleButton) {
        event.preventDefault();
        toggleHeroCardView(toggleButton.dataset.heroId);
        return;
    }

    const unequipButton = target.closest('.unequip-btn');
    if (unequipButton) {
        event.preventDefault();
        const { heroId, slot } = unequipButton.dataset;
        const hero = state.heroes.find(h => h.id === heroId);
        if (hero) InventoryManager.unequipItemFromHero(state, hero, slot, eventBus);
        return;
    }
    
    const moveButton = target.closest('.move-hero-btn');
    if (moveButton) {
        event.preventDefault();
        const { heroId, direction } = moveButton.dataset;
        moveHero(heroId, direction);
        return;
    }

    if (state.itemToEquip) {
        event.preventDefault();
        const heroCard = target.closest('.hero-card');
        if (heroCard) {
            const hero = state.heroes.find(h => h.id === heroCard.dataset.heroId);
            if (hero) InventoryManager.equipItemOnHero(state, hero, eventBus);
        } else {
            InventoryManager.cancelEquip(state);
        }
    }
  });
  
  document.getElementById('soft-reset-btn').addEventListener('click', () => {
    StorageManager.softReset();
  });

  document.getElementById('prestige-btn').addEventListener('click', () => {
    triggerPrestigeReset();
  });
  
  document.getElementById('options-btn').addEventListener('click', () => {
    showOptionsModal(state, eventBus);
  });

  document.querySelector('.tab-buttons').addEventListener('click', (event) => {
    if (event.target.matches('.tab-btn')) {
        const tabId = event.target.dataset.tab;
        
        document.querySelectorAll('.tab-content').forEach(panel => panel.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        event.target.classList.add('active');
        state.ui.activeTab = tabId;
    }
  });

  updateUI(state, 0, { gold: state.gold });

  requestAnimationFrame(gameLoop);
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
        encounterCooldown: 0,
        bossUnlockReached: false,
        bossIsDefeated: false,
        pendingBossFight: false,
        shopItems: [],
        shopRestockTimer: 0,
        autosaveTimer: 0,
        heroDefinitions: JSON.parse(JSON.stringify(HERO_DEFINITIONS)),
        droppedItems: [],
        inventory: [],
        itemToEquip: null,
        soulEchos: 0,
        prestigeUpgrades: {},
        highestFloorAchieved: 1,
        duelistUnlockedByPrestige: false,
        highestFloorThisRun: 1,
        options: {
            autoFightBoss: false,
            autoNextFloor: false,
        },
        ui: {
            shopNeedsUpdate: true,
            heroesNeedUpdate: true,
            inventoryNeedsUpdate: true,
            lootNeedsUpdate: true,
            recruitmentNeedsUpdate: true,
            progressionNeedsUpdate: true,
            prestigeNeedsUpdate: true,
            heroCardState: {},
            shopLockModeActive: false,
            activeTab: 'shop-panel',
        },
        notifications: [],
        floatingTexts: [],
        damageBuckets: {},
        eventBus: eventBus,
    };

    const prestigeData = StorageManager.loadPrestige();
    if (prestigeData) {
        initialState.soulEchos = prestigeData.soulEchos || 0;
        initialState.prestigeUpgrades = prestigeData.prestigeUpgrades || {};
        initialState.highestFloorAchieved = prestigeData.highestFloorAchieved || 1;
        initialState.duelistUnlockedByPrestige = prestigeData.duelistUnlockedByPrestige || false;
        initialState.options = prestigeData.options || initialState.options;

        if (prestigeData.heroDefinitionsStatus) {
            for (const key in prestigeData.heroDefinitionsStatus) {
                if (initialState.heroDefinitions[key]) {
                    initialState.heroDefinitions[key].status = prestigeData.heroDefinitionsStatus[key];
                }
            }
        }
    }
    
    if (initialState.prestigeUpgrades.SOUL_RICHES) {
        const soulRichesLevel = initialState.prestigeUpgrades.SOUL_RICHES;
        initialState.gold += PRESTIGE_UPGRADES.SOUL_RICHES.effect(soulRichesLevel);
    }


    for (const key in initialState.heroDefinitions) {
        const heroDef = initialState.heroDefinitions[key];
        if (heroDef.status === 'recruited') {
            let newHero;
            switch(heroDef.id) {
                case 'priest':
                    newHero = new Priest(heroDef);
                    break;
                case 'duelist':
                    newHero = new Duelist(heroDef);
                    break;
                default:
                    newHero = new Hero(heroDef);
                    break;
            }
            
            const startingLevel = initialState.prestigeUpgrades.STARTING_LEVEL ? PRESTIGE_UPGRADES.STARTING_LEVEL.effect(initialState.prestigeUpgrades.STARTING_LEVEL) : 1;
            if (startingLevel > 1) {
                for (let i = 1; i < startingLevel; i++) {
                    newHero.levelUp(initialState, eventBus, false);
                }
            }
            
            newHero._recalculateStats(initialState);
            newHero.hp = newHero.maxHp;

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
    state.eventBus = eventBus;

    const heroCardState = state.ui?.heroCardState || {};
    const shopLockModeActive = state.ui?.shopLockModeActive || false;
    
    state.encountersPerFloor = state.encountersPerFloor || 10;
    state.encounterCooldown = state.encounterCooldown || 0;
    state.bossUnlockReached = state.bossUnlockReached || false;
    state.bossIsDefeated = state.bossIsDefeated || false;
    state.pendingBossFight = state.pendingBossFight || false;
    
    state.soulEchos = state.soulEchos || 0;
    state.prestigeUpgrades = state.prestigeUpgrades || {};
    state.highestFloorAchieved = state.highestFloorAchieved || state.dungeonFloor;
    state.duelistUnlockedByPrestige = state.duelistUnlockedByPrestige || false;
    state.highestFloorThisRun = loadedState.highestFloorThisRun || state.dungeonFloor;
    state.options = loadedState.options || { autoFightBoss: false, autoNextFloor: false };

    state.ui = {
        shopNeedsUpdate: true,
        heroesNeedUpdate: true,
        inventoryNeedsUpdate: true,
        lootNeedsUpdate: true,
        recruitmentNeedsUpdate: true,
        progressionNeedsUpdate: true,
        prestigeNeedsUpdate: true,
        heroCardState: heroCardState,
        shopLockModeActive: shopLockModeActive,
        activeTab: 'shop-panel',
    };
    state.notifications = state.notifications || [];
    state.floatingTexts = [];
    state.damageBuckets = {};
  } else {
    state = getNewGameState();
    isNewGame = true;
  }
  
  state.prestigeUnlockConditionMet = state.highestFloorAchieved >= PRESTIGE_UNLOCK_FLOOR;
  
  setupEventListeners();
  
  UnlockManager.checkUnlocks(state, eventBus);

  if (isNewGame) {
      state.gameStatus = 'encounter_cooldown';
      state.encounterCooldown = 0.5;
  }
}
