// js/ui/UIUpdater.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { renderInventory } from './InventoryUI.js';
import { renderHeroesUI, updateHeroVitals } from './HeroUI.js';
import { renderShopUI } from './ShopUI.js';
import { renderLootUI } from './LootUI.js';
import { renderPrestigeUI } from './PrestigeUI.js';
import { flushDamageBuckets, showNotification } from './EffectsUI.js';
import { createElement } from '../utils/domHelper.js';

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


let lastRenderedMonsterInstanceId = null;

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

function updateCurrencyUI(state, oldState) {
    let totalGoldFind = 0;
    state.heroes.forEach(hero => totalGoldFind += hero.goldFind);
    const goldFindPercent = (totalGoldFind * 100).toFixed(0);

    const currentGold = Math.floor(state.gold);
    let goldText = currentGold;
    if (goldFindPercent > 0) {
        goldText += ` (+${goldFindPercent}%)`;
    }
    playerGoldEl.textContent = goldText;

    if (currentGold > (oldState.gold || 0)) {
        playerGoldEl.classList.add('gold-pop');
        playerGoldEl.addEventListener('animationend', () => {
            playerGoldEl.classList.remove('gold-pop');
        }, { once: true });
    }

    if (state.soulEchos > 0 || state.prestigeUnlockConditionMet) {
        soulEchosContainerEl.classList.remove('hidden');
        soulEchosDisplayEl.textContent = state.soulEchos;
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
  const { dungeonFloor, encounterIndex, gameStatus, bossIsDefeated, bossUnlockReached } = state;
  floorDisplayEl.textContent = `Étage ${dungeonFloor}`;
  
  if (gameStatus === 'boss_fight') {
    encounterDisplayEl.textContent = "COMBAT DE BOSS";
  } else if (bossIsDefeated) {
    encounterDisplayEl.textContent = `Exploration (Boss vaincu)`;
  } else if (bossUnlockReached) {
    encounterDisplayEl.textContent = `Rencontre ${encounterIndex} (Boss disponible)`;
  } else {
    encounterDisplayEl.textContent = `Rencontre ${encounterIndex}`;
  }
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

function updateProgressionUI(state) {
  progressionControlsEl.innerHTML = '';

  if (state.bossUnlockReached && !state.bossIsDefeated && !state.pendingBossFight && state.gameStatus !== 'boss_fight') {
    progressionControlsEl.appendChild(createElement('button', { textContent: 'Affronter le Boss', id: 'fight-boss-btn' }));
  } else if (state.bossIsDefeated) {
    progressionControlsEl.appendChild(createElement('button', { textContent: 'Étage Suivant', id: 'next-floor-btn' }));
  }
  
  // CORRIGÉ : La condition de visibilité est maintenant basée sur l'étage actuel
  if (state.prestigeUnlockConditionMet && state.dungeonFloor >= 15) {
      prestigeBtnEl.classList.remove('hidden');
  } else {
      prestigeBtnEl.classList.add('hidden');
  }
  
  if (state.prestigeUnlockConditionMet) {
    prestigeTabBtnEl.classList.remove('hidden');
  } else {
    prestigeTabBtnEl.classList.add('hidden');
  }
}

export function updateUI(state, dt, oldState) {
  flushDamageBuckets(state, dt);
  
  if (state.notifications && state.notifications.length > 0) {
      const notification = state.notifications.shift();
      showNotification(notification.message, notification.type);
  }

  updateMonsterUI(state.activeMonster);
  updateHeroVitals(state.heroes);
  updateCurrencyUI(state, oldState);
  updateGameStatusMessage(state);
  updateDungeonUI(state);

  if (state.ui.heroesNeedUpdate) {
      renderHeroesUI(state.heroes, state.itemToEquip, state.ui.heroCardState, state.eventBus, state);
      state.ui.heroesNeedUpdate = false;
  }

  if (state.ui.shopNeedsUpdate) {
      renderShopUI(state.shopItems);
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
}
