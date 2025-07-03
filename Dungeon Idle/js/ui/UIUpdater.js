// js/ui/UIUpdater.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { renderInventory } from './InventoryUI.js';

const BUCKET_FLUSH_INTERVAL = 0.3; 

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

function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.textContent) el.textContent = options.textContent;
    if (options.title) el.title = options.title;
    if (options.value !== undefined) el.value = options.value;
    if (options.max !== undefined) el.max = options.max;
    if (options.dataset) {
        for (const key in options.dataset) {
            el.dataset[key] = options.dataset[key];
        }
    }
    return el;
}

function showNotification(message, type = 'error') {
    let area = document.getElementById('notification-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'notification-area';
        document.body.appendChild(area);
    }
    const notif = createElement('div', { className: `notification ${type}`, textContent: message });
    area.appendChild(notif);
    requestAnimationFrame(() => { notif.classList.add('show'); });
    setTimeout(() => {
        notif.classList.remove('show');
        notif.addEventListener('transitionend', () => notif.remove());
    }, 3000);
}

function createFloatingText(text, type, targetElement) {
    const textEl = createElement('div', {
        className: `floating-text ${type}`,
        textContent: Math.ceil(text)
    });

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
                if (bucket.damage > 0) createFloatingText(bucket.damage, 'damage', targetElement);
                if (bucket.crit > 0) createFloatingText(bucket.crit, 'crit', targetElement);
                if (bucket.heal > 0) createFloatingText(bucket.heal, 'heal', targetElement);
            }
            
            bucket.damage = 0;
            bucket.crit = 0;
            bucket.heal = 0;
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

function renderStatLine(label, baseValue, change, isPercent = false) {
    const displayValue = isPercent ? (baseValue * 100).toFixed(1) + '%' : Math.ceil(baseValue);
    const p = createElement('p', { className: 'hero-stats', textContent: `${label}: ${displayValue}` });

    if (change !== 0 && change !== undefined) {
        const newValue = baseValue + change;
        const changeSign = change > 0 ? '+' : '';
        const changeClass = change > 0 ? 'stat-increase' : 'stat-decrease';
        const changeDisplay = isPercent ? (change * 100).toFixed(1) + '%' : Math.round(change);
        const newDisplayValue = isPercent ? (newValue * 100).toFixed(1) + '%' : Math.ceil(newValue);

        p.innerHTML = '';
        p.appendChild(document.createTextNode(`${label}: `));
        const span = createElement('span', {
            className: changeClass,
            textContent: `${newDisplayValue} (${changeSign}${changeDisplay})`
        });
        p.appendChild(span);
    }
    return p;
}

function createHeroCard(hero, index, heroesCount, isCollapsed, itemToEquip) {
    const card = createElement('div', { className: 'hero-card', dataset: { heroId: hero.id } });
    if (isCollapsed) card.classList.add('collapsed');
    if (hero.status === 'recovering') card.classList.add('recovering');
    if (itemToEquip) card.classList.add('equip-mode');

    const mainContent = createElement('div', { className: 'hero-main-content' });
    const controls = createElement('div', { className: 'hero-controls' });

    const titleDiv = createElement('div', { className: 'hero-title' });
    titleDiv.appendChild(createElement('strong', { className: 'hero-name', textContent: hero.name }));
    titleDiv.appendChild(createElement('span', { className: 'hero-level', textContent: `Niveau ${hero.level}` }));
    titleDiv.appendChild(createElement('button', { className: 'toggle-view-btn', textContent: isCollapsed ? '+' : '-', dataset: { heroId: hero.id } }));
    mainContent.appendChild(titleDiv);
    
    const collapsedInfo = createElement('div', { className: 'collapsed-info' });
    collapsedInfo.appendChild(createElement('p', { className: 'hero-stats', textContent: `DPS: ${hero.dps.toFixed(1)}` }));
    mainContent.appendChild(collapsedInfo);

    const statsGrid = createElement('div', { className: 'hero-stats-grid' });
    if (itemToEquip && hero.equipment[itemToEquip.baseDefinition.slot] !== undefined) {
        const changes = hero.calculateStatChanges(itemToEquip);
        const currentStats = hero.getAllStats();
        statsGrid.appendChild(renderStatLine('DPS', currentStats.dps, changes.dps));
        statsGrid.appendChild(renderStatLine('HP', currentStats.maxHp, changes.maxHp));
        statsGrid.appendChild(renderStatLine('Armure', currentStats.armor, changes.armor));
        statsGrid.appendChild(renderStatLine('Crit', currentStats.critChance, changes.critChance, true));
        statsGrid.appendChild(renderStatLine('HP/s', currentStats.hpRegen, changes.hpRegen));
    } else {
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `DPS: ${hero.dps.toFixed(1)}` }));
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `HP: ${Math.ceil(hero.hp)} / ${hero.maxHp}` }));
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `Armure: ${hero.armor}` }));
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `Crit: ${(hero.critChance * 100).toFixed(1)}%` }));
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `HP/s: ${hero.hpRegen.toFixed(1)}` }));
    }
    mainContent.appendChild(statsGrid);

    mainContent.appendChild(createElement('progress', { className: 'hero-hp-bar', value: hero.hp, max: hero.maxHp }));
    
    const buffsContainer = createElement('div', { className: 'buffs-container' });
    if (hero.activeBuffs) {
        hero.activeBuffs.forEach(buff => {
            const buffIcon = createElement('div', {
                className: 'buff-icon',
                textContent: buff.name.substring(0, 1),
                title: `${buff.name}: +${buff.value.toFixed(1)}${buff.stat.includes('Percent') ? '%' : ''} (${buff.duration.toFixed(0)}s)`
            });
            const buffBar = createElement('div', {className: 'buff-duration-bar'});
            buffBar.style.width = `${(buff.duration / buff.maxDuration) * 100}%`;
            buffIcon.appendChild(buffBar);
            buffsContainer.appendChild(buffIcon);
        });
    }
    mainContent.appendChild(buffsContainer);

    mainContent.appendChild(createElement('p', { className: 'hero-stats xp-text', textContent: `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP` }));
    mainContent.appendChild(createElement('progress', { className: 'hero-xp-bar', value: hero.xp, max: hero.xpToNextLevel }));

    const equipmentDisplay = createElement('div', { className: 'hero-equipment-display' });
    const equipmentSlots = ['arme', 'torse', 'tete', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];
    equipmentSlots.forEach(slot => {
        const item = hero.equipment[slot];
        const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
        const itemDiv = createElement('div', { className: 'equipped-item' });
        if (item) {
            itemDiv.classList.add(`rarity-${item.rarity}`);
            itemDiv.appendChild(createElement('span', { textContent: `${slotName}: ${item.name}` }));
            itemDiv.appendChild(createElement('button', { className: 'unequip-btn', textContent: 'X', title: 'Déséquiper', dataset: { heroId: hero.id, slot: slot } }));
        } else {
            itemDiv.appendChild(createElement('span', { textContent: `${slotName}: Aucun` }));
        }
        equipmentDisplay.appendChild(itemDiv);
    });
    mainContent.appendChild(equipmentDisplay);

    if (index > 0) {
        controls.appendChild(createElement('button', { className: 'move-hero-btn up', title: 'Monter', textContent: '▲', dataset: { heroId: hero.id, direction: 'up' } }));
    } else {
        controls.appendChild(createElement('div', { className: 'move-placeholder' }));
    }
    if (index < heroesCount - 1) {
        controls.appendChild(createElement('button', { className: 'move-hero-btn down', title: 'Descendre', textContent: '▼', dataset: { heroId: hero.id, direction: 'down' } }));
    } else {
        controls.appendChild(createElement('div', { className: 'move-placeholder' }));
    }

    card.appendChild(mainContent);
    card.appendChild(controls);
    return card;
}

function updateHeroesUI(heroes, itemToEquip, heroCardState) {
  heroesAreaEl.innerHTML = '';
  heroes.forEach((hero, index) => {
    const isCollapsed = heroCardState[hero.id] ? heroCardState[hero.id].isCollapsed : false;
    const card = createHeroCard(hero, index, heroes.length, isCollapsed, itemToEquip);
    heroesAreaEl.appendChild(card);
  });
}

function createShopItemCard(item, index) {
    const itemCard = createElement('div', { className: `shop-item-card rarity-${item.rarity}` });
    if (item.isLocked) itemCard.classList.add('locked');

    const itemInfo = createElement('div', { className: 'item-info' });
    itemInfo.appendChild(createElement('p', { className: 'item-name', textContent: item.name }));
    const primaryStatValue = item.stats[item.baseDefinition.stat];
    const primaryStatName = item.baseDefinition.stat;
    itemInfo.appendChild(createElement('p', { className: 'item-stats', textContent: `+${primaryStatValue} ${primaryStatName}` }));

    Object.entries(item.stats).forEach(([stat, value]) => {
        if (stat === item.baseDefinition.stat) return;
        const affixInfo = AFFIX_DEFINITIONS[stat];
        if (!affixInfo) return;
        const text = affixInfo.text.replace('X', value > 0 ? value : -value);
        const sign = value > 0 ? '+' : '-';
        itemInfo.appendChild(createElement('p', { className: 'item-affix', textContent: `${sign}${text.substring(1)}` }));
    });

    const itemActions = createElement('div', { className: 'item-actions' });
    itemActions.appendChild(createElement('button', { className: 'item-action-btn buy-btn', textContent: `${item.cost} Or`, dataset: { itemIndex: index } }));
    
    itemCard.appendChild(itemInfo);
    itemCard.appendChild(itemActions);
    return itemCard;
}

function updateShopUI(shopItems) {
    shopAreaEl.innerHTML = '';
    if (!shopItems) return;
    shopItems.forEach((item, index) => {
        const itemCard = createShopItemCard(item, index);
        shopAreaEl.appendChild(itemCard);
    });
}

function createLootItemCard(item, index) {
    const itemCard = createElement('div', { className: `loot-item-card rarity-${item.rarity}` });

    const itemInfo = createElement('div', { className: 'item-info' });
    itemInfo.appendChild(createElement('p', { className: 'item-name', textContent: item.name }));
    const primaryStatValue = item.stats[item.baseDefinition.stat];
    const primaryStatName = item.baseDefinition.stat;
    itemInfo.appendChild(createElement('p', { className: 'item-stats', textContent: `+${primaryStatValue} ${primaryStatName}` }));

    Object.entries(item.stats).forEach(([stat, value]) => {
        if (stat === item.baseDefinition.stat) return;
        const affixInfo = AFFIX_DEFINITIONS[stat];
        if (!affixInfo) return;
        const text = affixInfo.text.replace('X', value > 0 ? value : -value);
        const sign = value > 0 ? '+' : '-';
        itemInfo.appendChild(createElement('p', { className: 'item-affix', textContent: `${sign}${text.substring(1)}` }));
    });

    const itemActions = createElement('div', { className: 'item-actions' });
    itemActions.appendChild(createElement('button', { className: 'item-action-btn pickup-btn', textContent: 'Ramasser', dataset: { lootIndex: index } }));
    itemActions.appendChild(createElement('button', { className: 'item-action-btn discard-btn', textContent: 'Jeter', title: 'Jeter', dataset: { lootIndex: index } }));

    itemCard.appendChild(itemInfo);
    itemCard.appendChild(itemActions);
    return itemCard;
}

function updateLootUI(droppedItems) {
    lootAreaEl.innerHTML = '';
    if (!droppedItems) return;
    droppedItems.forEach((item, index) => {
        const itemCard = createLootItemCard(item, index);
        lootAreaEl.appendChild(itemCard);
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

// --- CORRECTION APPLIQUÉE ICI ---
function updateProgressionUI(state) {
  progressionControlsEl.innerHTML = '';
  if (state.gameStatus === 'farming_boss_available') {
    const bossButton = createElement('button', { textContent: 'Affronter le Boss' });
    bossButton.id = 'fight-boss-btn'; // On assigne l'ID manuellement
    progressionControlsEl.appendChild(bossButton);
  } else if (state.gameStatus === 'floor_cleared') {
    const nextFloorButton = createElement('button', { textContent: 'Étage Suivant' });
    nextFloorButton.id = 'next-floor-btn'; // On assigne l'ID manuellement
    progressionControlsEl.appendChild(nextFloorButton);
  }

  autoProgressionControlsEl.innerHTML = '';
  
  const autoBossLabel = createElement('label', { className: 'auto-control-label' });
  const autoBossCheckbox = createElement('input');
  autoBossCheckbox.type = 'checkbox';
  autoBossCheckbox.id = 'auto-boss-checkbox';
  autoBossCheckbox.checked = state.ui.autoProgressToBoss;
  autoBossLabel.appendChild(autoBossCheckbox);
  autoBossLabel.appendChild(document.createTextNode(' Passer au boss'));
  autoProgressionControlsEl.appendChild(autoBossLabel);

  const autoFloorLabel = createElement('label', { className: 'auto-control-label' });
  const autoFloorCheckbox = createElement('input');
  autoFloorCheckbox.type = 'checkbox';
  autoFloorCheckbox.id = 'auto-floor-checkbox';
  autoFloorCheckbox.checked = state.ui.autoProgressToNextFloor;
  autoFloorLabel.appendChild(autoFloorCheckbox);
  autoFloorLabel.appendChild(document.createTextNode(" Passer à l'étage suivant"));
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

export {
    updateUI,
    showSavingIndicator,
    showSaveSuccess,
    hideSaveIndicator,
};
