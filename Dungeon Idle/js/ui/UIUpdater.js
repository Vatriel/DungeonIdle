// js/ui/UIUpdater.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { renderInventory } from './InventoryUI.js';

// --- RÉCUPÉRATION DES ÉLÉMENTS DU DOM ---
const monsterNameEl = document.getElementById('monster-name');
const monsterHpBarEl = document.getElementById('monster-hp-bar');
const heroesAreaEl = document.getElementById('heroes-area');
const playerGoldEl = document.getElementById('player-gold');
const recruitmentAreaEl = document.getElementById('recruitment-area');
const gameStatusMessageEl = document.getElementById('game-status-message');
const floorDisplayEl = document.getElementById('floor-display');
const encounterDisplayEl = document.getElementById('encounter-display');
const progressionControlsEl = document.getElementById('progression-controls');
const shopAreaEl = document.getElementById('shop-area');
const saveIndicatorEl = document.getElementById('save-indicator');
const lootAreaEl = document.getElementById('loot-area');


// --- FONCTION DE NOTIFICATION (maintenant appelée par le coeur du jeu) ---
function showNotification(message, type = 'error') {
    let area = document.getElementById('notification-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'notification-area';
        document.body.appendChild(area);
    }

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    area.appendChild(notif);

    requestAnimationFrame(() => {
        notif.classList.add('show');
    });

    setTimeout(() => {
        notif.classList.remove('show');
        notif.addEventListener('transitionend', () => notif.remove());
    }, 3000);
}


// --- FONCTIONS DE RENDU SPÉCIFIQUES (inchangées) ---

function updateMonsterUI(monster) {
  if (!monster) {
    monsterNameEl.textContent = '---';
    monsterHpBarEl.value = 0;
    return;
  }
  if (monster instanceof MonsterGroup) {
    const plural = monster.initialCount > 1 ? 's' : '';
    monsterNameEl.textContent = `Un groupe de ${monster.initialCount} ${monster.name}${plural} (dont ${monster.currentCount} en vie)`;
    monsterHpBarEl.max = monster.totalMaxHp;
  } else {
    monsterNameEl.textContent = monster.name;
    monsterHpBarEl.max = monster.maxHp;
  }
  monsterHpBarEl.value = monster.currentHp;
}

function renderEquippedItem(hero, slot) {
    const item = hero.equipment[slot];
    const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
    if (!item) {
        return `<span>${slotName}: Aucun</span>`;
    }
    return `
        <div class="equipped-item rarity-${item.rarity}">
            <span>${slotName}: ${item.name}</span>
            <button class="unequip-btn" data-hero-id="${hero.id}" data-slot="${slot}" title="Déséquiper">X</button>
        </div>
    `;
}

function renderStatLine(label, baseValue, change, isPercent = false) {
    const displayValue = isPercent ? (baseValue * 100).toFixed(1) + '%' : Math.ceil(baseValue);
    if (change === 0 || change === undefined) {
        return `<p class="hero-stats">${label}: ${displayValue}</p>`;
    }
    
    const newValue = baseValue + change;
    const changeSign = change > 0 ? '+' : '';
    const changeClass = change > 0 ? 'stat-increase' : 'stat-decrease';
    const changeDisplay = isPercent ? (change * 100).toFixed(1) + '%' : Math.round(change);
    const newDisplayValue = isPercent ? (newValue * 100).toFixed(1) + '%' : Math.ceil(newValue);

    return `<p class="hero-stats">${label}: <span class="${changeClass}">${newDisplayValue} (${changeSign}${changeDisplay})</span></p>`;
}

function updateHeroesUI(heroes, itemToEquip) {
  heroesAreaEl.innerHTML = '';
  heroes.forEach((hero, index) => {
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.dataset.heroId = hero.id;

    let statsHtml;
    if (itemToEquip && hero.equipment[itemToEquip.baseDefinition.slot] !== undefined) {
        const changes = hero.calculateStatChanges(itemToEquip);
        const currentStats = hero.getAllStats();
        statsHtml = `
            ${renderStatLine('DPS', currentStats.dps, changes.dps)}
            ${renderStatLine('HP', currentStats.maxHp, changes.maxHp)}
            ${renderStatLine('Armure', currentStats.armor, changes.armor)}
            ${renderStatLine('Crit', currentStats.critChance, changes.critChance, true)}
            ${renderStatLine('HP/s', currentStats.hpRegen, changes.hpRegen)}
        `;
    } else {
        statsHtml = `
            <p class="hero-stats">DPS: ${hero.dps.toFixed(1)}</p>
            <p class="hero-stats">HP: ${Math.ceil(hero.hp)} / ${hero.maxHp}</p>
            <p class="hero-stats">Armure: ${hero.armor}</p>
            <p class="hero-stats">Crit: ${(hero.critChance * 100).toFixed(1)}%</p>
            <p class="hero-stats">HP/s: ${hero.hpRegen.toFixed(1)}</p>
        `;
    }
    
    card.innerHTML = `
        <div class="hero-main-content">
          <div class="hero-title">
            <strong class="hero-name">${hero.name}</strong>
            <span class="hero-level">Niveau ${hero.level}</span>
          </div>
          <div class="hero-stats-grid">
            ${statsHtml}
          </div>
          <progress class="hero-hp-bar" value="${hero.hp}" max="${hero.maxHp}"></progress>
          <p class="hero-stats xp-text">${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP</p>
          <progress class="hero-xp-bar" value="${hero.xp}" max="${hero.xpToNextLevel}"></progress>
          <div class="hero-equipment-display">
            ${renderEquippedItem(hero, 'arme')}
            ${renderEquippedItem(hero, 'torse')}
          </div>
        </div>
        <div class="hero-controls">
          ${index > 0 ? `<button class="move-hero-btn up" title="Monter" data-hero-id="${hero.id}" data-direction="up">▲</button>` : `<div class="move-placeholder"></div>`}
          ${index < heroes.length - 1 ? `<button class="move-hero-btn down" title="Descendre" data-hero-id="${hero.id}" data-direction="down">▼</button>` : `<div class="move-placeholder"></div>`}
        </div>
    `;
    
    card.classList.toggle('recovering', hero.status === 'recovering');
    card.classList.toggle('equip-mode', !!itemToEquip);
    heroesAreaEl.appendChild(card);
  });
}

function updateGoldUI(gold) {
  playerGoldEl.textContent = Math.floor(gold);
}

function updateGameStatusMessage(gameStatus) {
  gameStatusMessageEl.textContent = gameStatus === 'party_wipe' ? 'Groupe anéanti ! Récupération en cours...' : '';
}

function updateDungeonUI(floor, encounter, maxEncounters, gameStatus) {
  floorDisplayEl.textContent = `Étage ${floor}`;
  if (gameStatus === 'boss_fight') {
    encounterDisplayEl.textContent = "COMBAT DE BOSS";
  } else if (gameStatus === 'farming_boss_available' || gameStatus === 'floor_cleared') {
    encounterDisplayEl.textContent = `Étage ${floor} (Exploration)`;
  } else {
    encounterDisplayEl.textContent = `Rencontre ${encounter}`;
  }
}

function updateShopUI(shopItems) {
    shopAreaEl.innerHTML = '';
    if (!shopItems) return;
    shopItems.forEach((item, index) => {
        const itemCard = document.createElement('div');
        itemCard.className = `shop-item-card rarity-${item.rarity}`;
        let affixesHtml = Object.entries(item.affixes).map(([stat, value]) => {
            const affixInfo = AFFIX_DEFINITIONS[stat];
            return affixInfo ? `<p class="item-affix">${affixInfo.text.replace('X', value)}</p>` : '';
        }).join('');

        const primaryStatValue = item.stats[item.baseDefinition.stat];
        const primaryStatName = item.baseDefinition.stat;

        itemCard.innerHTML = `
            <div class="item-info">
                <p class="item-name">${item.name}</p>
                <p class="item-stats">+${primaryStatValue} ${primaryStatName}</p>
                ${affixesHtml}
            </div>
            <div class="item-actions">
                 <button class="item-action-btn buy-btn" data-item-index="${index}">${item.cost} Or</button>
            </div>
        `;
        shopAreaEl.appendChild(itemCard);
    });
}

function updateLootUI(droppedItems) {
    lootAreaEl.innerHTML = '';
    if (!droppedItems) return;

    droppedItems.forEach((item, index) => {
        const itemCard = document.createElement('div');
        itemCard.className = `loot-item-card rarity-${item.rarity}`;
        
        let affixesHtml = Object.entries(item.affixes).map(([stat, value]) => {
            const affixInfo = AFFIX_DEFINITIONS[stat];
            return affixInfo ? `<p class="item-affix">${affixInfo.text.replace('X', value)}</p>` : '';
        }).join('');

        const primaryStatValue = item.stats[item.baseDefinition.stat];
        const primaryStatName = item.baseDefinition.stat;

        itemCard.innerHTML = `
            <div class="item-info">
                <p class="item-name">${item.name}</p>
                <p class="item-stats">+${primaryStatValue} ${primaryStatName}</p>
                ${affixesHtml}
            </div>
            <div class="item-actions">
                <button class="item-action-btn pickup-btn" data-loot-index="${index}">Ramasser</button>
                <button class="item-action-btn discard-btn" data-loot-index="${index}" title="Jeter">Jeter</button>
            </div>
        `;
        lootAreaEl.appendChild(itemCard);
    });
}

function renderRecruitmentArea(heroDefinitions) {
  recruitmentAreaEl.innerHTML = '';
  for (const key in heroDefinitions) {
    const heroDef = heroDefinitions[key];
    if (heroDef.status === 'available') {
      const button = document.createElement('button');
      button.textContent = `Recruter ${heroDef.name} (${heroDef.cost} Or)`;
      button.dataset.heroId = heroDef.id;
      recruitmentAreaEl.appendChild(button);
    }
  }
}

function renderProgressionControls(gameStatus) {
  progressionControlsEl.innerHTML = '';
  if (gameStatus === 'farming_boss_available') {
    const bossButton = document.createElement('button');
    bossButton.id = 'fight-boss-btn';
    bossButton.textContent = 'Affronter le Boss';
    progressionControlsEl.appendChild(bossButton);
  } else if (gameStatus === 'floor_cleared') {
    const nextFloorButton = document.createElement('button');
    nextFloorButton.id = 'next-floor-btn';
    nextFloorButton.textContent = 'Étage Suivant';
    progressionControlsEl.appendChild(nextFloorButton);
  }
}

function showSavingIndicator() {
    saveIndicatorEl.classList.remove('hidden', 'saved');
    saveIndicatorEl.classList.add('saving');
    saveIndicatorEl.querySelector('.icon').textContent = '⚙️';
    saveIndicatorEl.querySelector('.text').textContent = 'Sauvegarde...';
}

function showSaveSuccess() {
    saveIndicatorEl.classList.remove('saving');
    saveIndicatorEl.classList.add('saved');
    saveIndicatorEl.querySelector('.icon').textContent = '✔️';
    saveIndicatorEl.querySelector('.text').textContent = 'Sauvegardé !';
}

function hideSaveIndicator() {
    saveIndicatorEl.classList.add('hidden');
}


// --- FONCTION PRINCIPALE EXPORTÉE ---
function updateUI(state) {
  // --- Traitement des notifications ---
  if (state.notifications && state.notifications.length > 0) {
      const notification = state.notifications.shift(); // Prend la plus ancienne
      showNotification(notification.message, notification.type);
  }

  // --- Mises à jour qui se produisent à chaque frame ---
  updateMonsterUI(state.activeMonster);
  updateGoldUI(state.gold);
  updateGameStatusMessage(state.gameStatus);
  updateDungeonUI(state.dungeonFloor, state.encounterIndex, state.encountersPerFloor, state.gameStatus);

  // --- Mises à jour conditionnelles basées sur les drapeaux ---
  if (state.ui.heroesNeedUpdate) {
      updateHeroesUI(state.heroes, state.itemToEquip);
      state.ui.heroesNeedUpdate = false;
  }
  if (state.ui.shopNeedsUpdate) {
      updateShopUI(state.shopItems);
      state.ui.shopNeedsUpdate = false;
  }
  if (state.ui.inventoryNeedsUpdate) {
      renderInventory(state.inventory, state.itemToEquip);
      state.ui.inventoryNeedsUpdate = false;
  }
  if (state.ui.lootNeedsUpdate) {
      updateLootUI(state.droppedItems);
      state.ui.lootNeedsUpdate = false;
  }
  if (state.ui.recruitmentNeedsUpdate) {
      renderRecruitmentArea(state.heroDefinitions);
      state.ui.recruitmentNeedsUpdate = false;
  }
  if (state.ui.progressionNeedsUpdate) {
      renderProgressionControls(state.gameStatus);
      state.ui.progressionNeedsUpdate = false;
  }
}

// --- EXPORT NOMMÉS ---
export {
    updateUI,
    showSavingIndicator,
    showSaveSuccess,
    hideSaveIndicator,
};
