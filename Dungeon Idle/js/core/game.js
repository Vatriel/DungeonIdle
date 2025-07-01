// js/core/Game.js

import { HERO_DEFINITIONS } from '../data/heroData.js';
import { MONSTER_DEFINITIONS } from '../data/monsterData.js';
import { BOSS_NAMES, BOSS_TITLES } from '../data/bossData.js';
import { Hero } from '../entities/Hero.js';
import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { updateUI, renderRecruitmentArea, renderProgressionControls } from '../ui/UIUpdater.js';
import { StorageManager } from '../managers/StorageManager.js';
import { ShopManager } from '../managers/ShopManager.js';

// --- CONSTANTES DE GAMEPLAY ---
const PLAYER_CLICK_DAMAGE = 2;
const RECOVERY_RATE_SLOW = 2;
const RECOVERY_RATE_WIPE = 25;
const ENGAGEMENT_LIMIT = 3;
const ENEMY_SCALING_FACTOR = 1.15;
const BASE_BOSS_HP = 200;
const BASE_BOSS_DPS = 15;
const ARMOR_CONSTANT = 200;
const AUTOSAVE_INTERVAL = 5;
const BASE_SHOP_REFRESH_COST = 50;
const BASE_DROP_CHANCE = 0.15;

// --- ÉTAT CENTRAL DU JEU ---
let state = {
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
  shopRefreshCost: BASE_SHOP_REFRESH_COST,
  heroDefinitions: {},
  droppedItems: []
};
let lastTime = 0;

// --- BOUCLE DE JEU & ROUTEUR DE LOGIQUE ---
function gameLoop(currentTime) {
  if (lastTime === 0) lastTime = currentTime;
  const deltaTime = (currentTime - lastTime) / 1000;
  updateGameLogic(deltaTime);
  updateUI(state);
  lastTime = currentTime;
  requestAnimationFrame(gameLoop);
}

function updateGameLogic(dt) {
  switch (state.gameStatus) {
    case 'fighting':
    case 'farming_boss_available':
    case 'boss_fight':
    case 'floor_cleared':
      runFightingLogic(dt);
      break;
    case 'party_wipe':
      runPartyWipeRecoveryLogic(dt);
      break;
  }
  
  ShopManager.update(state, dt);

  state.autosaveTimer += dt;
  if (state.autosaveTimer >= AUTOSAVE_INTERVAL) {
    state.autosaveTimer = 0;
    StorageManager.save(state);
  }
  
  state.shopRefreshCost = BASE_SHOP_REFRESH_COST * state.dungeonFloor;

  const warriorDef = state.heroDefinitions.WARRIOR;
  if (warriorDef && state.gold >= warriorDef.cost && warriorDef.status === 'locked') {
    warriorDef.status = 'available';
    renderRecruitmentArea(state.heroDefinitions);
  }
}

// --- LOGIQUES DE JEU SPÉCIFIQUES ---
function runFightingLogic(dt) {
  state.heroes.forEach(hero => {
    hero.regenerate(hero.hpRegen * dt);
    if (hero.status === 'recovering') {
      hero.regenerate(RECOVERY_RATE_SLOW * dt);
    }
  });
  if (!state.activeMonster || !state.activeMonster.isAlive()) {
    handleMonsterDefeated();
    return;
  }
  let totalPartyDps = 0;
  state.heroes.forEach(hero => {
    if (hero.isFighting()) {
      let heroDps = hero.dps;
      if (Math.random() < hero.critChance) {
        heroDps *= hero.critDamage;
      }
      totalPartyDps += heroDps;
    }
  });
  state.activeMonster.takeDamage(totalPartyDps * dt);
  let monsterTotalDps = 0;
  let baseDpsPerAttacker = 0;
  if (state.activeMonster instanceof MonsterGroup) {
    monsterTotalDps = state.activeMonster.baseDefinition.baseDps * state.activeMonster.currentCount;
    baseDpsPerAttacker = state.activeMonster.baseDefinition.baseDps;
  } else {
    monsterTotalDps = state.activeMonster.dps;
    baseDpsPerAttacker = state.activeMonster.dps;
  }
  let remainingDpsToDeal = monsterTotalDps;
  const fightingHeroes = state.heroes.filter(hero => hero.isFighting());
  for (const hero of fightingHeroes) {
    if (remainingDpsToDeal <= 0) break;
    const maxDpsOnThisHero = (state.activeMonster instanceof Boss) ? remainingDpsToDeal : ENGAGEMENT_LIMIT * baseDpsPerAttacker;
    const dpsDealtToHero = Math.min(remainingDpsToDeal, maxDpsOnThisHero);
    const damageReduction = hero.armor / (hero.armor + ARMOR_CONSTANT);
    const finalDamage = dpsDealtToHero * (1 - damageReduction);
    hero.takeDamage(finalDamage * dt);
    remainingDpsToDeal -= dpsDealtToHero;
  }
  if (state.heroes.every(hero => !hero.isFighting())) {
    if (state.gameStatus === 'boss_fight') {
      state.gameStatus = 'farming_boss_available';
      renderProgressionControls(state.gameStatus);
      generateNextEncounter();
    } else {
      state.gameStatus = 'party_wipe';
      renderProgressionControls(state.gameStatus);
    }
  }
}

function runPartyWipeRecoveryLogic(dt) {
  let allHeroesFull = true;
  state.heroes.forEach(hero => {
    hero.regenerate(RECOVERY_RATE_WIPE * dt);
    if (hero.hp < hero.maxHp) allHeroesFull = false;
  });
  if (allHeroesFull) {
    state.heroes.forEach(hero => hero.status = 'fighting');
    state.gameStatus = 'fighting';
    renderProgressionControls(state.gameStatus);
  }
}

// --- GESTIONNAIRES ---
function handleMonsterDefeated() {
  if (!state.activeMonster) return;
  if (Math.random() < BASE_DROP_CHANCE) {
    console.log("Loot !");
    generateLoot();
  }
  const goldGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.1;
  const xpGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.5;
  state.gold += goldGained;
  state.heroes.forEach(hero => { if (hero.isFighting()) hero.addXp(xpGained); });
  if (state.gameStatus === 'boss_fight') {
    state.gameStatus = 'floor_cleared';
    renderProgressionControls(state.gameStatus);
    generateNextEncounter();
    return;
  }
  if (state.gameStatus === 'fighting') {
    state.encounterIndex++;
    if (state.encounterIndex > state.encountersPerFloor) {
      state.gameStatus = 'farming_boss_available';
      renderProgressionControls(state.gameStatus);
    }
  }
  generateNextEncounter();
}

function generateLoot() {
    const itemLevel = state.activeMonster.level;
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const itemDef = ITEM_DEFINITIONS[randomKey];
    
    const newItem = new Item(itemDef, itemLevel);
    state.droppedItems.push(newItem);
}

function pickupItem(itemIndex) {
    const item = state.droppedItems[itemIndex];
    if (!item) return;

    console.log(`Objet ramassé : ${item.name}`);
    
    // On retire l'objet du sol
    state.droppedItems.splice(itemIndex, 1);

    // On essaie de l'équiper (logique identique à celle de la boutique)
    let equipped = false;
    for (const hero of state.heroes) {
        if (hero.equipment[item.baseDefinition.slot] === null) {
            hero.equipItem(item);
            equipped = true;
            break;
        }
    }
    if (!equipped && state.heroes.length > 0) {
        state.heroes[0].equipItem(item);
    }
}

function generateNextEncounter() {
  const difficultyIndex = Math.min(state.encounterIndex, state.encountersPerFloor);
  const currentFloor = state.dungeonFloor;
  let chosenMonsterDef, monsterCount;
  if (currentFloor < 3) {
    chosenMonsterDef = MONSTER_DEFINITIONS.GOBLIN;
    monsterCount = 2 + difficultyIndex + Math.floor(Math.random() * 3);
  } else {
    const encounterPool = [MONSTER_DEFINITIONS.GOBLIN, MONSTER_DEFINITIONS.ORC];
    chosenMonsterDef = encounterPool[Math.floor(Math.random() * encounterPool.length)];
    if (chosenMonsterDef.id === 'orc') {
      monsterCount = 1 + Math.floor(currentFloor / 2) + Math.floor(Math.random() * 2);
    } else {
      monsterCount = 3 + difficultyIndex + Math.floor(Math.random() * 4);
    }
  }
  const scale = Math.pow(ENEMY_SCALING_FACTOR, currentFloor - 1);
  const scaledDef = { ...chosenMonsterDef, level: currentFloor, baseHp: Math.ceil(chosenMonsterDef.baseHp * scale), baseDps: parseFloat((chosenMonsterDef.baseDps * scale).toFixed(2)) };
  monsterCount = Math.max(1, monsterCount);
  state.activeMonster = new MonsterGroup(scaledDef, monsterCount);
}

function generateBossName() {
  const name = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)];
  const title = BOSS_TITLES[Math.floor(Math.random() * BOSS_TITLES.length)];
  return `${name} ${title}`;
}

function startBossFight() {
  if (state.gameStatus !== 'farming_boss_available') return;
  state.heroes.forEach(hero => {
    hero.hp = hero.maxHp;
    hero.status = 'fighting';
  });
  state.gameStatus = 'boss_fight';
  renderProgressionControls(state.gameStatus);
  const scale = Math.pow(ENEMY_SCALING_FACTOR, state.dungeonFloor - 1);
  const bossLevel = state.dungeonFloor;
  const bossName = generateBossName();
  const bossHp = Math.ceil((BASE_BOSS_HP * bossLevel) * scale);
  const bossDps = parseFloat((BASE_BOSS_DPS * scale).toFixed(2));
  state.activeMonster = new Boss(bossName, bossHp, bossDps, bossLevel);
}

function advanceToNextFloor() {
  if (state.gameStatus !== 'floor_cleared') return;
  state.dungeonFloor++;
  state.encounterIndex = 1;
  state.gameStatus = 'fighting';
  const mageDef = state.heroDefinitions.MAGE;
  if (state.dungeonFloor === 2 && mageDef.status === 'locked') {
    mageDef.status = 'recruited';
    state.heroes.push(new Hero(mageDef));
  }
  renderProgressionControls(state.gameStatus);
  generateNextEncounter();
}

function onPlayerClick() {
  if (state.activeMonster && state.activeMonster.isAlive()) {
    state.activeMonster.takeDamage(PLAYER_CLICK_DAMAGE);
  }
}

function recruitHero(heroId) {
  const heroDef = state.heroDefinitions[heroId.toUpperCase()];
  if (heroDef && heroDef.status === 'available') {
    if (state.gold >= heroDef.cost) {
      state.gold -= heroDef.cost;
      heroDef.status = 'recruited';
      state.heroes.push(new Hero(heroDef));
      renderRecruitmentArea(state.heroDefinitions);
    }
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
    state.autosaveTimer = 0;
    state.shopRestockTimer = 0;
    state.shopItems = [];
  } else {
    state.heroDefinitions = JSON.parse(JSON.stringify(HERO_DEFINITIONS));
    for (const key in state.heroDefinitions) {
      if (state.heroDefinitions[key].status === 'recruited') {
        state.heroes.push(new Hero(state.heroDefinitions[key]));
      }
    }
    generateNextEncounter();
  }
  
  const enemyPanel = document.getElementById('enemy-panel');
  enemyPanel.addEventListener('click', onPlayerClick);
  
  const shopArea = document.getElementById('shop-area');
  shopArea.addEventListener('mousedown', (event) => {
    event.preventDefault();
    const button = event.target.closest('.buy-btn');
    if (button) {
      const itemIndex = parseInt(button.dataset.itemIndex, 10);
      ShopManager.buyItem(state, itemIndex);
    }
  });

  const recruitmentArea = document.getElementById('recruitment-area');
  recruitmentArea.addEventListener('click', (event) => {
    const button = event.target.closest('[data-hero-id]');
    if (button) recruitHero(button.dataset.heroId);
  });

  const progressionControls = document.getElementById('progression-controls');
  progressionControls.addEventListener('click', (event) => {
    if (event.target.id === 'fight-boss-btn') startBossFight();
    else if (event.target.id === 'next-floor-btn') advanceToNextFloor();
  });

  const heroesArea = document.getElementById('heroes-area');
  heroesArea.addEventListener('mousedown', (event) => {
    event.preventDefault(); 
    const button = event.target.closest('.move-hero-btn');
    if (button) {
      const { heroId, direction } = button.dataset;
      moveHero(heroId, direction);
    }
  });

  renderRecruitmentArea(state.heroDefinitions);
  renderProgressionControls(state.gameStatus);
  requestAnimationFrame(gameLoop);
}
