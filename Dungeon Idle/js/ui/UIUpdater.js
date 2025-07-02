// js/ui/UIUpdater.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { renderInventory } from './InventoryUI.js';

// --- CONSTANTES ---
const BUCKET_FLUSH_INTERVAL = 0.3; 

// --- RÉCUPÉRATION DES ÉLÉMENTS DU DOM ---
const monsterNameEl = document.getElementById('monster-name');
const monsterHpBarEl = document.getElementById('monster-hp-bar');
const heroesAreaEl = document.getElementById('heroes-area');
const playerGoldEl = document.getElementById('player-gold');
const recruitmentAreaEl = document.getElementById('recruitment-area');
const recruitmentSectionEl = document.getElementById('recruitment-section');
const gameStatusMessageEl = document.getElementById('game-status-message');
const floorDisplayEl = document.getElementById('floor-display');
const encounterDisplayEl = document.getElementById('encounter-display');
const progressionControlsEl = document.getElementById('progression-controls');
const autoProgressionControlsEl = document.getElementById('auto-progression-controls');
const shopAreaEl = document.getElementById('shop-area');
const saveIndicatorEl = document.getElementById('save-indicator');
const lootAreaEl = document.getElementById('loot-area');
const floatingTextContainerEl = document.getElementById('floating-text-container');


// --- FONCTION DE NOTIFICATION ---
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
    requestAnimationFrame(() => { notif.classList.add('show'); });
    setTimeout(() => {
        notif.classList.remove('show');
        notif.addEventListener('transitionend', () => notif.remove());
    }, 3000);
}


// --- SYSTÈME DE TEXTE DE COMBAT ---
function createFloatingText(text, type, targetElement) {
    const textEl = document.createElement('div');
    textEl.className = `floating-text ${type}`;
    textEl.textContent = Math.ceil(text);

    const rect = targetElement.getBoundingClientRect();
    const xOffset = rect.width * (0.2 + Math.random() * 0.6);
    textEl.style.left = `${rect.left + xOffset}px`;
    textEl.style.top = `${rect.top + 20}px`;

    floatingTextContainerEl.appendChild(textEl);
    textEl.style.animation = 'floatUp 1.5s ease-out forwards';
    textEl.addEventListener('animationend', () => textEl.remove());
}

function flushDamageBuckets(state, dt) {
    for (const targetId in state.damageBuckets) {
        const bucket = state.damageBuckets[targetId];
        bucket.timer -= dt;

        if (bucket.timer <= 0) {
            const targetElement = targetId === 'monster'
                ? document.getElementById('monster-area')
                : document.querySelector(`.hero-card[data-hero-id="${targetId}"]`);
            
            if (targetElement) {
                if (bucket.damage > 0) {
                    createFloatingText(bucket.damage, 'damage', targetElement);
                }
                if (bucket.crit > 0) {
                    createFloatingText(bucket.crit, 'crit', targetElement);
                }
            }
            
            bucket.damage = 0;
            bucket.crit = 0;
            bucket.timer = BUCKET_FLUSH_INTERVAL;
        }
    }
}

function handleSpamTexts(state) {
    if (!state.floatingTexts || state.floatingTexts.length === 0) return;

    state.floatingTexts.forEach(textInfo => {
        const targetElement = textInfo.targetId === 'monster'
            ? document.getElementById('monster-area')
            : document.querySelector(`.hero-card[data-hero-id="${textInfo.targetId}"]`);
        
        if (targetElement) {
            createFloatingText(textInfo.text, textInfo.type, targetElement);
        }
    });

    state.floatingTexts = [];
}


// --- FONCTIONS DE RENDU SPÉCIFIQUES ---
function updateHeroBars(heroes) {
    heroes.forEach(hero => {
        const card = heroesAreaEl.querySelector(`.hero-card[data-hero-id="${hero.id}"]`);
        if (!card) return;

        const hpBar = card.querySelector('.hero-hp-bar');
        if (hpBar) {
            hpBar.value = hero.hp;
            hpBar.max = hero.maxHp;
        }

        const xpBar = card.querySelector('.hero-xp-bar');
        if (xpBar) {
            xpBar.value = hero.xp;
            xpBar.max = hero.xpToNextLevel;
        }
    });
}

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

function renderStatLine(label, baseValue, change, isPercent) {
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

function updateHeroesUI(heroes, itemToEquip, heroCardState) {
  heroesAreaEl.innerHTML = '';
  heroes.forEach((hero, index) => {
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.dataset.heroId = hero.id;

    const isCollapsed = heroCardState[hero.id] ? heroCardState[hero.id].isCollapsed : false;
    if (isCollapsed) {
        card.classList.add('collapsed');
    }

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
    
    const equipmentSlots = ['arme', 'torse', 'tete', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];
    const equipmentHtml = equipmentSlots.map(slot => renderEquippedItem(hero, slot)).join('');

    const toggleButtonText = isCollapsed ? '+' : '-';

    card.innerHTML = `
        <div class="hero-main-content">
          <div class="hero-title">
            <strong class="hero-name">${hero.name}</strong>
            <span class="hero-level">Niveau ${hero.level}</span>
            <button class="toggle-view-btn" data-hero-id="${hero.id}">${toggleButtonText}</button>
          </div>
          <div class="collapsed-info">
            <p class="hero-stats">DPS: ${hero.dps.toFixed(1)}</p>
          </div>
          <div class="hero-stats-grid">
            ${statsHtml}
          </div>
          <progress class="hero-hp-bar" value="${hero.hp}" max="${hero.maxHp}"></progress>
          <p class="hero-stats xp-text">${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP</p>
          <progress class="hero-xp-bar" value="${hero.xp}" max="${hero.xpToNextLevel}"></progress>
          <div class="hero-equipment-display">
            ${equipmentHtml}
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

function updateGoldUI(state) {
    let totalGoldFind = 0;
    state.heroes.forEach(hero => totalGoldFind += hero.goldFind);
    const goldFindPercent = (totalGoldFind * 100).toFixed(0);

    let goldText = Math.floor(state.gold);
    if (goldFindPercent > 0) {
        goldText += ` (+${goldFindPercent}%)`;
    }
    playerGoldEl.textContent = goldText;
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
        if (item.isLocked) {
            itemCard.classList.add('locked');
        }

        let affixesHtml = Object.entries(item.stats).map(([stat, value]) => {
            if (stat === item.baseDefinition.stat) return '';
            const affixInfo = AFFIX_DEFINITIONS[stat];
            if (!affixInfo) return '';
            const text = affixInfo.text.replace('X', value > 0 ? value : -value);
            const sign = value > 0 ? '+' : '-';
            return `<p class="item-affix">${sign}${text.substring(1)}</p>`;
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
        
        let affixesHtml = Object.entries(item.stats).map(([stat, value]) => {
            if (stat === item.baseDefinition.stat) return '';
            const affixInfo = AFFIX_DEFINITIONS[stat];
            if (!affixInfo) return '';
            const text = affixInfo.text.replace('X', value > 0 ? value : -value);
            const sign = value > 0 ? '+' : '-';
            return `<p class="item-affix">${sign}${text.substring(1)}</p>`;
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
  const availableHeroes = Object.values(heroDefinitions).filter(def => def.status === 'available');

  if (availableHeroes.length > 0) {
    recruitmentSectionEl.classList.remove('hidden');
    availableHeroes.forEach(heroDef => {
        const button = document.createElement('button');
        const costText = heroDef.cost > 0 ? `${heroDef.cost} Or` : 'Gratuit';
        button.textContent = `Recruter ${heroDef.name} (${costText})`;
        button.dataset.heroId = heroDef.id;
        recruitmentAreaEl.appendChild(button);
    });
  } else {
    recruitmentSectionEl.classList.add('hidden');
  }
}

function updateProgressionUI(state) {
  progressionControlsEl.innerHTML = '';
  if (state.gameStatus === 'farming_boss_available') {
    const bossButton = document.createElement('button');
    bossButton.id = 'fight-boss-btn';
    bossButton.textContent = 'Affronter le Boss';
    progressionControlsEl.appendChild(bossButton);
  } else if (state.gameStatus === 'floor_cleared') {
    const nextFloorButton = document.createElement('button');
    nextFloorButton.id = 'next-floor-btn';
    nextFloorButton.textContent = 'Étage Suivant';
    progressionControlsEl.appendChild(nextFloorButton);
  }

  autoProgressionControlsEl.innerHTML = '';
  
  const autoBossLabel = document.createElement('label');
  autoBossLabel.className = 'auto-control-label';
  autoBossLabel.innerHTML = `<input type="checkbox" id="auto-boss-checkbox"> Passer au boss`;
  autoBossLabel.querySelector('input').checked = state.ui.autoProgressToBoss;
  autoProgressionControlsEl.appendChild(autoBossLabel);

  const autoFloorLabel = document.createElement('label');
  autoFloorLabel.className = 'auto-control-label';
  autoFloorLabel.innerHTML = `<input type="checkbox" id="auto-floor-checkbox"> Passer à l'étage suivant`;
  autoFloorLabel.querySelector('input').checked = state.ui.autoProgressToNextFloor;
  autoProgressionControlsEl.appendChild(autoFloorLabel);
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
function updateUI(state, dt) {
  flushDamageBuckets(state, dt);
  handleSpamTexts(state);

  if (state.notifications && state.notifications.length > 0) {
      const notification = state.notifications.shift();
      showNotification(notification.message, notification.type);
  }

  updateMonsterUI(state.activeMonster);
  updateGoldUI(state);
  updateGameStatusMessage(state.gameStatus);
  updateDungeonUI(state.dungeonFloor, state.encounterIndex, state.encountersPerFloor, state.gameStatus);

  if (state.ui.heroesNeedUpdate) {
      updateHeroesUI(state.heroes, state.itemToEquip, state.ui.heroCardState);
      state.ui.heroesNeedUpdate = false;
  } else if (state.ui.heroBarsNeedUpdate) {
      updateHeroBars(state.heroes);
      state.ui.heroBarsNeedUpdate = false;
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
      updateProgressionUI(state);
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
