// js/ui/UIUpdater.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { renderInventory } from './InventoryUI.js';
import { renderHeroesUI, updateHeroVitals } from './HeroUI.js';
import { renderShopUI, updateShopTimerDisplay } from './ShopUI.js';
import { renderLootUI } from './LootUI.js';
import { renderPrestigeUI } from './PrestigeUI.js';
import { renderArtisanUI } from './ArtisanUI.js';
import { showNotification, showConfirmationModal, showSavingIndicator, showSaveSuccess, hideSaveIndicator, flushDamageBuckets, createFlavorFloatingText, createProtectorBeamText, createFloatingText } from './EffectsUI.js'; 
import { showOptionsModal } from './OptionsUI.js';
import { showStatsModal } from './StatsModalUI.js';
import { showProgressionMap } from './ProgressionMapUI.js';
// MODIFICATION : Les imports pointent maintenant vers le coordinateur TavernUI
import { showTavernModal, renderTavernUI, hideTavernModal } from './TavernUI.js'; 
import { renderTrophyUI } from './TrophyUI.js';
import { createElement } from '../utils/domHelper.js';

// DOM Elements
const monsterNameEl = document.getElementById('monster-name');
const monsterHpBarEl = document.getElementById('monster-hp-bar');
const monsterHpTextEl = document.getElementById('monster-hp-text');
const playerGoldEl = document.getElementById('player-gold');
const recruitmentAreaEl = document.getElementById('recruitment-area');
const recruitmentSectionEl = document.getElementById('recruitment-section');
const gameStatusMessageEl = document.getElementById('game-status-message');
const floorDisplayEl = document.getElementById('floor-display');
const encounterDisplayEl = document.getElementById('encounter-display');
const progressionControlsEl = document.getElementById('progression-controls');
const soulEchosContainerEl = document.getElementById('soul-echos-container');
const soulEchosDisplayEl = document.getElementById('soul-echos-display');
const prestigeBtnEl = document.getElementById('prestige-btn');
const prestigeTabBtnEl = document.getElementById('prestige-tab-btn');
const boostHealBtnEl = document.getElementById('boost-heal-btn');
const artisanTabBtnEl = document.getElementById('artisan-tab-btn');
const floatingTextContainerEl = document.getElementById('floating-text-container');
const tavernBtnEl = document.getElementById('tavern-btn');

let lastRenderedMonsterInstanceId = null;

// --- Fonctions de rendu (inchangées) ---
function updateMonsterUI(monster) {
  if (!monster) {
    monsterNameEl.textContent = '---';
    monsterHpTextEl.textContent = 'HP: 0 / 0';
    monsterHpBarEl.style.width = '0%';
    lastRenderedMonsterInstanceId = null;
    return;
  }
  
  const isNewMonster = monster.instanceId !== lastRenderedMonsterInstanceId;
  const maxHp = monster.totalMaxHp || monster.maxHp;
  const currentHp = monster.currentHp || 0;
  const hpPercent = (currentHp / maxHp) * 100;

  if (isNewMonster) {
      monsterHpBarEl.classList.add('no-transition');
      monsterHpBarEl.style.width = '100%';

      requestAnimationFrame(() => {
          monsterHpBarEl.classList.remove('no-transition');
          monsterHpBarEl.style.width = `${hpPercent}%`; 
      });
      lastRenderedMonsterInstanceId = monster.instanceId;
  } else {
      monsterHpBarEl.style.width = `${hpPercent}%`;
  }

  if (monster instanceof MonsterGroup) {
    const plural = monster.initialCount > 1 ? 's' : '';
    monsterNameEl.textContent = `Un groupe de ${monster.initialCount} ${monster.name}${plural} (dont ${monster.currentCount} en vie)`;
  } else {
    monsterNameEl.textContent = monster.name;
  }

  monsterHpTextEl.textContent = `HP: ${Math.ceil(currentHp)} / ${Math.ceil(maxHp)}`;
}

function updateCurrencyUI(state) {
    const oldGold = parseInt(playerGoldEl.dataset.gold || '0', 10);
    const currentGold = Math.floor(state.gold);

    let totalGoldFind = 0;
    state.heroes.forEach(hero => totalGoldFind += hero.goldFind);
    const goldFindPercent = (totalGoldFind * 100).toFixed(0);

    let goldText = currentGold.toLocaleString('fr-FR');
    if (goldFindPercent > 0) {
        goldText += ` (+${goldFindPercent}%)`;
    }
    playerGoldEl.textContent = goldText;
    playerGoldEl.dataset.gold = currentGold;

    if (currentGold > oldGold) {
        playerGoldEl.classList.add('gold-pop');
        playerGoldEl.addEventListener('animationend', () => {
            playerGoldEl.classList.remove('gold-pop');
        }, { once: true });
    }

    if (state.soulEchos > 0 || state.prestigeUnlockConditionMet) {
        soulEchosContainerEl.classList.remove('hidden');
        soulEchosDisplayEl.textContent = state.soulEchos.toLocaleString('fr-FR');
    }
}

function updateGameStatusMessage(state) {
  const { gameStatus, bossUnlockReached, bossIsDefeated, pendingBossFight } = state;
  let message = '';
  if (gameStatus === 'party_wipe') {
    message = 'Groupe anéanti ! Récupération en cours...';
  } else if (gameStatus === 'encounter_cooldown') {
    message = 'Combat terminé !';
  } else if (pendingBossFight) {
    message = 'Le boss arrive !';
  } else if (gameStatus === 'boss_fight') {
    message = 'COMBAT CONTRE LE BOSS !';
  } else if (bossIsDefeated) {
    message = 'Le gardien de l\'étage est vaincu !';
  } else if (bossUnlockReached) {
    message = 'Le gardien de l\'étage peut être affronté.';
  }
  gameStatusMessageEl.textContent = message;
}

function updateDungeonUI(state) {
  const { dungeonFloor, encounterIndex, gameStatus, bossIsDefeated, prestigeCount } = state;
  const prestigeText = (prestigeCount || 0) > 0 ? `Prestige ${prestigeCount} | ` : '';
  floorDisplayEl.textContent = `${prestigeText}Étage ${dungeonFloor}`;
  
  if (gameStatus === 'boss_fight') {
    encounterDisplayEl.textContent = "COMBAT DE BOSS";
  } else if (bossIsDefeated) {
    encounterDisplayEl.textContent = `Exploration (Boss vaincu)`;
  } else {
    encounterDisplayEl.textContent = `Rencontre ${encounterIndex}`;
  }
}

function updatePartyPanel(state) {
    const shouldShowButton = state.gameStatus === 'party_wipe' && !state.partyWipeHealBoostActive;
    boostHealBtnEl.classList.toggle('hidden', !shouldShowButton);
}

function renderRecruitmentArea(heroDefinitions) {
  recruitmentAreaEl.innerHTML = '';
  const availableHeroes = Object.values(heroDefinitions).filter(def => def.status === 'available');

  if (availableHeroes.length > 0) {
    recruitmentSectionEl.classList.remove('hidden');
    availableHeroes.forEach(heroDef => {
        const button = createElement('button', {
            textContent: `Recruter ${heroDef.name} (${heroDef.cost > 0 ? `${heroDef.cost} Or` : 'Gratuit'})`,
            dataset: { heroId: heroDef.id }
        });
        recruitmentAreaEl.appendChild(button);
    });
  } else {
    recruitmentSectionEl.classList.add('hidden');
  }
}

function updateMainTabsUI(state) {
    document.querySelectorAll('#right-panels-container .tab-content').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('#right-panels-container .tab-btn').forEach(btn => btn.classList.remove('active'));
  
    const activeTab = document.getElementById(state.ui.activeTab);
    const activeButton = document.querySelector(`.tab-btn[data-tab="${state.ui.activeTab}"]`);
    if (activeTab) activeTab.classList.add('active');
    if (activeButton) activeButton.classList.add('active');

    const shopPanel = document.getElementById('shop-panel');
    if (shopPanel) {
        shopPanel.classList.toggle('lock-mode-active', state.ui.shopLockModeActive);
        document.getElementById('toggle-lock-mode-btn').classList.toggle('active', state.ui.shopLockModeActive);
    }
}

function updateProgressionUI(state) {
  progressionControlsEl.innerHTML = '';

  if (state.bossUnlockReached && !state.bossIsDefeated && !state.pendingBossFight && state.gameStatus !== 'boss_fight') {
    progressionControlsEl.appendChild(createElement('button', { textContent: 'Affronter le Boss', id: 'fight-boss-btn' }));
  } else if (state.bossIsDefeated) {
    progressionControlsEl.appendChild(createElement('button', { textContent: 'Étage Suivant', id: 'next-floor-btn' }));
  }
  
  if (state.prestigeUnlockConditionMet) {
      prestigeBtnEl.classList.remove('hidden');
      prestigeTabBtnEl.classList.remove('hidden');
  } else {
      prestigeBtnEl.classList.add('hidden');
      prestigeTabBtnEl.classList.add('hidden');
  }
  
  if (state.artisanUnlocked) {
      artisanTabBtnEl.classList.remove('hidden', 'locked-tab');
      artisanTabBtnEl.textContent = 'Forge';
  } else {
      artisanTabBtnEl.classList.remove('hidden');
      artisanTabBtnEl.classList.add('locked-tab');
      artisanTabBtnEl.textContent = 'Forge (Verrouillée)';
  }

  if (state.tavernUnlocked) {
    tavernBtnEl.classList.remove('hidden');
  } else {
    tavernBtnEl.classList.add('hidden');
  }
}

function updateCountersUI(state) {
    const lootCounter = document.getElementById('loot-counter');
    if (lootCounter) {
        lootCounter.textContent = `(${state.droppedItems.length}/${state.droppedItemsSize})`;
    }

    const inventoryCounter = document.getElementById('inventory-counter');
    if (inventoryCounter) {
        inventoryCounter.textContent = `(${state.inventory.length}/${state.inventorySize})`;
    }
}

// --- Boucle de mise à jour principale de l'UI ---
export function updateUI(state, dt) {
  flushDamageBuckets(state, dt);

  updateMonsterUI(state.activeMonster);
  updateHeroVitals(state.heroes, state);
  updateCurrencyUI(state);
  updateGameStatusMessage(state);
  updateDungeonUI(state);
  updateShopTimerDisplay(state);
  updateCountersUI(state);

  if (state.ui.partyPanelNeedsUpdate) {
      updatePartyPanel(state);
      state.ui.partyPanelNeedsUpdate = false;
  }
  if (state.ui.heroesNeedUpdate) {
      renderHeroesUI(state.heroes, state.itemToEquip, state.ui.heroCardState, state.eventBus, state);
      state.ui.heroesNeedUpdate = false;
  }
  if (state.ui.shopNeedsUpdate) {
      renderShopUI(state);
      state.ui.shopNeedsUpdate = false;
  }
  if (state.ui.inventoryNeedsUpdate) {
      renderInventory(state.inventory, state.itemToEquip);
      state.ui.inventoryNeedsUpdate = false;
  }
  if (state.ui.lootNeedsUpdate) {
      renderLootUI(state.droppedItems);
      state.ui.lootNeedsUpdate = false;
  }
  if (state.ui.recruitmentNeedsUpdate) {
      renderRecruitmentArea(state.heroDefinitions);
      state.ui.recruitmentNeedsUpdate = false;
  }
  if (state.ui.progressionNeedsUpdate) {
      updateProgressionUI(state);
      state.ui.progressionNeedsUpdate = false;
  }
  if (state.ui.prestigeNeedsUpdate) {
      renderPrestigeUI(state);
      state.ui.prestigeNeedsUpdate = false;
  }
  if (state.ui.artisanNeedsUpdate) {
      renderArtisanUI(state, state.eventBus);
      state.ui.artisanNeedsUpdate = false;
  }
  // MODIFICATION : On passe maintenant l'eventBus à renderTavernUI
  if (state.ui.tavernNeedsUpdate && !document.getElementById('tavern-modal-overlay')?.classList.contains('hidden')) {
      renderTavernUI(state, state.eventBus);
      state.ui.tavernNeedsUpdate = false; 
  } else if (state.ui.tavernNeedsUpdate) {
      state.ui.tavernNeedsUpdate = false; 
  }

  if (state.ui.mainTabsNeedUpdate) {
      updateMainTabsUI(state);
      state.ui.mainTabsNeedUpdate = false;
  }
}

export function forceFullUIRender(state) {
    updateMonsterUI(state.activeMonster);
    updateCurrencyUI(state);
    updateGameStatusMessage(state);
    updateDungeonUI(state);
    updatePartyPanel(state);
    updateProgressionUI(state);
    updateMainTabsUI(state);
    updateCountersUI(state);
    renderRecruitmentArea(state.heroDefinitions);
    renderHeroesUI(state.heroes, state.itemToEquip, state.ui.heroCardState, state.eventBus, state);
    renderShopUI(state);
    renderInventory(state.inventory, state.itemToEquip);
    renderLootUI(state.droppedItems);
    renderPrestigeUI(state);
    renderArtisanUI(state, state.eventBus);
    updateShopTimerDisplay(state);
    if (!document.getElementById('tavern-modal-overlay')?.classList.contains('hidden')) {
        // MODIFICATION : On passe maintenant l'eventBus à renderTavernUI
        renderTavernUI(state, state.eventBus);
    }
}

// --- NOUVELLE FONCTION D'INITIALISATION ---
/**
 * Initialise tous les écouteurs d'événements gérés par l'UIUpdater.
 * @param {EventBus} eventBus - L'instance de l'EventBus.
 * @param {object} state - L'état global du jeu.
 */
export function initUIUpdater(eventBus, state) {
    eventBus.on('notification_requested', (data) => showNotification(data.message, data.type));
    eventBus.on('confirmation_requested', (data) => showConfirmationModal(data.message, eventBus, data.action, data.onCancel));
    eventBus.on('save_started', showSavingIndicator);
    eventBus.on('save_finished', showSaveSuccess);
    eventBus.on('save_indicator_hide_requested', hideSaveIndicator);
    
    eventBus.on('options_modal_requested', (data) => showOptionsModal(data.state, eventBus));
    eventBus.on('stats_modal_requested', (data) => showStatsModal(data.hero, data.state, eventBus));
    
    eventBus.on('flavor_text_triggered', (data) => {
      const targetElement = data.targetId === 'monster'
          ? document.getElementById('monster-area')
          : document.querySelector(`.hero-card[data-hero-id="${data.targetId}"]`);
      if (targetElement) {
          createFlavorFloatingText(data.text, data.type, targetElement);
      }
    });

    eventBus.on('shop_ui_force_update', () => renderShopUI(state));
    eventBus.on('ui_progression_map_clicked', () => showProgressionMap(state));
    
    eventBus.on('shield_applied', (data) => {
        const targetElement = document.querySelector(`.hero-card[data-hero-id="${data.hero.id}"]`);
        if (targetElement) createFloatingText(data.amount, 'shield', targetElement);
    });

    eventBus.on('lifesteal_triggered', (data) => {
        const targetElement = document.querySelector(`.hero-card[data-hero-id="${data.hero.id}"]`);
        if (targetElement) createFloatingText(data.amount, 'lifesteal', targetElement);
    });

    eventBus.on('protector_beam_fired', (data) => {
        const monsterElement = document.getElementById('monster-area');
        if (monsterElement) {
            createProtectorBeamText(data.damage, data.chargeFactor, monsterElement);
        }
    });
    
    // MODIFICATION : Les appels à show/hide/render de la taverne sont maintenant corrects
    eventBus.on('ui_tavern_modal_requested', (data) => showTavernModal(data.state, eventBus));
    eventBus.on('ui_close_tavern_modal_clicked', hideTavernModal);
    
    eventBus.on('ui_tavern_tab_changed', (data) => {
        state.ui.tavernActiveTab = data.tabId;
        state.ui.tavernNeedsUpdate = true;
    });

    // Événements déplacés depuis App.js
    eventBus.on('ui_options_button_clicked', () => {
        eventBus.emit('options_modal_requested', { state });
    });

    eventBus.on('ui_stats_button_clicked', (data) => {
        const hero = state.heroes.find(h => h.id === data.heroId);
        if (hero) eventBus.emit('stats_modal_requested', { hero, state });
    });

    eventBus.on('ui_tab_changed', (data) => {
        state.ui.activeTab = data.tabId;
        state.ui.mainTabsNeedUpdate = true;
        if (data.tabId === 'artisan-panel') {
            state.ui.artisanNeedsUpdate = true;
        }
    });

    eventBus.on('ui_tavern_button_clicked', () => {
        if (state.tavernUnlocked) {
            eventBus.emit('ui_tavern_modal_requested', { state });
            state.ui.tavernNeedsUpdate = true; 
        } else {
            eventBus.emit('notification_requested', { message: "La Taverne n'est pas encore débloquée (Étage 30 requis).", type: 'error' });
        }
    });
}
