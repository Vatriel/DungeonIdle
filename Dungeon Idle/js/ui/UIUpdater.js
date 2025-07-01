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
const shopControlsEl = document.getElementById('shop-controls');


// --- FONCTIONS INTERNES (AIDES) ---

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

function updateHeroesUI(heroes, itemToEquip) {
  const existingCardIds = new Set();
  heroes.forEach((hero, index) => {
    existingCardIds.add(hero.id);
    let card = heroesAreaEl.querySelector(`[data-hero-id="${hero.id}"]`);
    if (!card) {
      card = document.createElement('div');
      card.className = 'hero-card';
      card.dataset.heroId = hero.id;
      card.innerHTML = `
        <div class="hero-main-content">
          <div class="hero-title">
            <strong class="hero-name"></strong>
            <span class="hero-level"></span>
          </div>
          <div class="hero-stats-grid">
            <p class="hero-stats" data-stat="dps"></p>
            <p class="hero-stats" data-stat="hp"></p>
            <p class="hero-stats" data-stat="armor"></p>
            <p class="hero-stats" data-stat="crit"></p>
            <p class="hero-stats" data-stat="hpRegen"></p>
          </div>
          <progress class="hero-hp-bar" value="100" max="100"></progress>
          <p class="hero-stats xp-text" data-stat="xp"></p>
          <progress class="hero-xp-bar" value="0" max="100"></progress>
          <div class="hero-equipment-display"></div>
        </div>
        <div class="hero-controls"></div>
      `;
    }
    card.querySelector('.hero-name').textContent = hero.name;
    card.querySelector('.hero-level').textContent = `Niveau ${hero.level}`;
    card.querySelector('[data-stat="dps"]').textContent = `DPS: ${hero.dps.toFixed(1)}`;
    card.querySelector('[data-stat="hp"]').textContent = `HP: ${Math.ceil(hero.hp)} / ${hero.maxHp}`;
    card.querySelector('[data-stat="armor"]').textContent = `Armure: ${hero.armor}`;
    card.querySelector('[data-stat="crit"]').textContent = `Crit: ${(hero.critChance * 100).toFixed(1)}%`;
    card.querySelector('[data-stat="hpRegen"]').textContent = `HP/s: ${hero.hpRegen.toFixed(1)}`;
    card.querySelector('[data-stat="xp"]').textContent = `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP`;
    const hpBar = card.querySelector('.hero-hp-bar');
    hpBar.value = hero.hp;
    hpBar.max = hero.maxHp;
    const xpBar = card.querySelector('.hero-xp-bar');
    xpBar.value = hero.xp;
    xpBar.max = hero.xpToNextLevel;
    const weaponName = hero.equipment.arme ? hero.equipment.arme.name : 'Mains nues';
    const armorName = hero.equipment.torse ? hero.equipment.torse.name : 'Aucune armure';
    card.querySelector('.hero-equipment-display').innerHTML = `
        <span>Arme: ${weaponName}</span>
        <span>Torse: ${armorName}</span>
    `;
    const controls = card.querySelector('.hero-controls');
    controls.innerHTML = `
      ${index > 0 ? `<button class="move-hero-btn up" title="Monter" data-hero-id="${hero.id}" data-direction="up">▲</button>` : `<div class="move-placeholder"></div>`}
      ${index < heroes.length - 1 ? `<button class="move-hero-btn down" title="Descendre" data-hero-id="${hero.id}" data-direction="down">▼</button>` : `<div class="move-placeholder"></div>`}
    `;
    if (heroesAreaEl.children[index] !== card) {
      heroesAreaEl.insertBefore(card, heroesAreaEl.children[index] || null);
    }
    card.classList.toggle('recovering', hero.status === 'recovering');
    card.classList.toggle('equip-mode', !!itemToEquip);
  });
  for (const card of Array.from(heroesAreaEl.children)) {
    if (!existingCardIds.has(card.dataset.heroId)) {
      card.remove();
    }
  }
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
        let affixesHtml = '';
        for (const [stat, value] of Object.entries(item.affixes)) {
            const affixInfo = AFFIX_DEFINITIONS[stat];
            if (affixInfo) {
                const statText = affixInfo.text.replace('X', value);
                affixesHtml += `<p class="item-affix">${statText}</p>`;
            }
        }
        const primaryStatValue = item.stats[item.baseDefinition.stat];
        const primaryStatName = item.baseDefinition.stat;
        itemCard.innerHTML = `
            <div class="shop-item-info">
                <p class="item-name">${item.name}</p>
                <p class="item-stats">+${primaryStatValue} ${primaryStatName}</p>
                ${affixesHtml}
            </div>
            <button class="buy-btn" data-item-index="${index}">${item.cost} Or</button>
        `;
        shopAreaEl.appendChild(itemCard);
    });
}

function updateShopControlsUI(gold, shopRefreshCost) {
    shopControlsEl.innerHTML = `
        <button class="refresh-shop-btn" id="refresh-shop-btn">
            Nettoyer la boutique
        </button>
    `;
}

function updateLootUI(droppedItems) {
    if (!lootAreaEl || !droppedItems) {
        if(lootAreaEl) lootAreaEl.innerHTML = '';
        return;
    }
    lootAreaEl.innerHTML = '';
    droppedItems.forEach((item, index) => {
        const itemCard = document.createElement('div');
        itemCard.className = `shop-item-card rarity-${item.rarity} loot-item-card`;
        itemCard.dataset.lootIndex = index;
        let affixesHtml = '';
        for (const [stat, value] of Object.entries(item.affixes)) {
            const affixInfo = AFFIX_DEFINITIONS[stat];
            if (affixInfo) {
                affixesHtml += `<p class="item-affix">${affixInfo.text.replace('X', value)}</p>`;
            }
        }
        const primaryStatValue = item.stats[item.baseDefinition.stat];
        const primaryStatName = item.baseDefinition.stat;
        itemCard.innerHTML = `
            <div class="shop-item-info">
                <p class="item-name">${item.name}</p>
                <p class="item-stats">+${primaryStatValue} ${primaryStatName}</p>
                ${affixesHtml}
            </div>
            <span class="pickup-text">Ramasser</span>
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
  updateMonsterUI(state.activeMonster);
  updateHeroesUI(state.heroes, state.itemToEquip);
  updateGoldUI(state.gold);
  updateGameStatusMessage(state.gameStatus);
  updateDungeonUI(state.dungeonFloor, state.encounterIndex, state.encountersPerFloor, state.gameStatus);
  updateLootUI(state.droppedItems);
  updateShopUI(state.shopItems);
  updateShopControlsUI(state.gold, state.shopRefreshCost);
  // CORRECTION : On appelle la fonction importée pour dessiner l'inventaire
  renderInventory(state.inventory, state.itemToEquip);
}

// --- EXPORT NOMMÉS ---
export {
    updateUI,
    renderRecruitmentArea,
    renderProgressionControls,
    showSavingIndicator,
    showSaveSuccess,
    hideSaveIndicator
};
