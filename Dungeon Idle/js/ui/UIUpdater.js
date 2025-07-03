// js/ui/UIUpdater.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { renderInventory } from './InventoryUI.js';
import { renderHeroesUI, updateHeroVitals } from './HeroUI.js';
import { renderShopUI } from './ShopUI.js';
import { renderLootUI } from './LootUI.js';
import { flushDamageBuckets, handleSpamTexts, showNotification } from './EffectsUI.js';

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
const autoProgressionControlsEl = document.getElementById('auto-progression-controls');

function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.textContent) el.textContent = options.textContent;
    if (options.title) el.title = options.title;
    if (options.id) el.id = options.id;
    if (options.type) el.type = options.type;
    if (options.checked !== undefined) el.checked = options.checked;
    if (options.dataset) {
        for (const key in options.dataset) {
            el.dataset[key] = options.dataset[key];
        }
    }
    return el;
}

function updateMonsterUI(monster) {
  if (!monster) {
    monsterNameEl.textContent = '---';
    monsterHpTextEl.textContent = 'HP: 0 / 0';
    monsterHpBarEl.style.width = '0%';
    return;
  }
  
  const maxHp = monster.totalMaxHp || monster.maxHp;
  const currentHp = monster.currentHp || 0;
  const hpPercent = (currentHp / maxHp) * 100;

  if (monster instanceof MonsterGroup) {
    const plural = monster.initialCount > 1 ? 's' : '';
    monsterNameEl.textContent = `Un groupe de ${monster.initialCount} ${monster.name}${plural} (dont ${monster.currentCount} en vie)`;
  } else {
    monsterNameEl.textContent = monster.name;
  }

  monsterHpTextEl.textContent = `HP: ${Math.ceil(currentHp)} / ${Math.ceil(maxHp)}`;
  monsterHpBarEl.style.width = `${hpPercent}%`;
}

function updateGoldUI(state, oldGold) {
    let totalGoldFind = 0;
    state.heroes.forEach(hero => totalGoldFind += hero.goldFind);
    const goldFindPercent = (totalGoldFind * 100).toFixed(0);

    const currentGold = Math.floor(state.gold);
    let goldText = currentGold;
    if (goldFindPercent > 0) {
        goldText += ` (+${goldFindPercent}%)`;
    }
    playerGoldEl.textContent = goldText;

    if (currentGold > oldGold) {
        playerGoldEl.classList.add('gold-pop');
        playerGoldEl.addEventListener('animationend', () => {
            playerGoldEl.classList.remove('gold-pop');
        }, { once: true });
    }
}

function updateGameStatusMessage(gameStatus) {
  gameStatusMessageEl.textContent = gameStatus === 'party_wipe' ? 'Groupe anéanti ! Récupération en cours...' : '';
}

function updateDungeonUI(floor, encounter, gameStatus) {
  floorDisplayEl.textContent = `Étage ${floor}`;
  if (gameStatus === 'boss_fight') {
    encounterDisplayEl.textContent = "COMBAT DE BOSS";
  } else if (gameStatus === 'farming_boss_available' || gameStatus === 'floor_cleared') {
    encounterDisplayEl.textContent = `Étage ${floor} (Exploration)`;
  } else {
    encounterDisplayEl.textContent = `Rencontre ${encounter}`;
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
  if (state.gameStatus === 'farming_boss_available') {
    progressionControlsEl.appendChild(createElement('button', { textContent: 'Affronter le Boss', id: 'fight-boss-btn' }));
  } else if (state.gameStatus === 'floor_cleared') {
    progressionControlsEl.appendChild(createElement('button', { textContent: 'Étage Suivant', id: 'next-floor-btn' }));
  }

  autoProgressionControlsEl.innerHTML = '';
  
  const autoBossLabel = createElement('label', { className: 'auto-control-label' });
  autoBossLabel.appendChild(createElement('input', { type: 'checkbox', id: 'auto-boss-checkbox', checked: state.ui.autoProgressToBoss }));
  autoBossLabel.appendChild(document.createTextNode(' Passer au boss'));
  autoProgressionControlsEl.appendChild(autoBossLabel);

  const autoFloorLabel = createElement('label', { className: 'auto-control-label' });
  autoFloorLabel.appendChild(createElement('input', { type: 'checkbox', id: 'auto-floor-checkbox', checked: state.ui.autoProgressToNextFloor }));
  autoFloorLabel.appendChild(document.createTextNode(" Passer à l'étage suivant"));
  autoProgressionControlsEl.appendChild(autoFloorLabel);
}

export function updateUI(state, dt, oldState) {
  flushDamageBuckets(state, dt);
  handleSpamTexts(state);
  if (state.notifications && state.notifications.length > 0) {
      const notification = state.notifications.shift();
      showNotification(notification.message, notification.type);
  }

  updateMonsterUI(state.activeMonster);
  updateHeroVitals(state.heroes);
  updateGoldUI(state, oldState.gold);
  updateGameStatusMessage(state.gameStatus);
  updateDungeonUI(state.dungeonFloor, state.encounterIndex, state.gameStatus);

  if (state.ui.heroesNeedUpdate) {
      renderHeroesUI(state.heroes, state.itemToEquip, state.ui.heroCardState, state.eventBus);
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
}
