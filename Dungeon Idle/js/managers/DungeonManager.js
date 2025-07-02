// js/managers/DungeonManager.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { Hero } from '../entities/Hero.js';
import { MONSTER_DEFINITIONS } from '../data/monsterData.js';
import { BOSS_NAMES, BOSS_TITLES } from '../data/bossData.js';
import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { InventoryManager } from './InventoryManager.js';
// MODIFIÉ : On n'importe plus rien de UIUpdater

const RECOVERY_RATE_SLOW = 2;
const RECOVERY_RATE_WIPE = 25;
const ENGAGEMENT_LIMIT = 3;
const ENEMY_SCALING_FACTOR = 1.15;
const BASE_BOSS_HP = 200;
const BASE_BOSS_DPS = 15;
const ARMOR_CONSTANT = 200;
const BASE_DROP_CHANCE = 0.15;

function update(state, dt) {
    // NOUVEAU : On lève un drapeau pour les barres de vie des héros qui changent constamment
    state.ui.heroesNeedUpdate = true;

    switch (state.gameStatus) {
        case 'fighting':
        case 'farming_boss_available':
        case 'boss_fight':
        case 'floor_cleared':
            runFightingLogic(state, dt);
            break;
        case 'party_wipe':
            runPartyWipeRecoveryLogic(state, dt);
            break;
    }
}

function runFightingLogic(state, dt) {
    state.heroes.forEach(hero => {
        hero.regenerate(hero.hpRegen * dt);
        if (hero.status === 'recovering') {
            hero.regenerate(RECOVERY_RATE_SLOW * dt);
        }
    });

    if (!state.activeMonster || !state.activeMonster.isAlive()) {
        handleMonsterDefeated(state);
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
            state.ui.progressionNeedsUpdate = true; // NOUVEAU
            generateNextEncounter(state);
        } else {
            state.gameStatus = 'party_wipe';
            state.ui.progressionNeedsUpdate = true; // NOUVEAU
        }
    }
}

function runPartyWipeRecoveryLogic(state, dt) {
    let allHeroesFull = true;
    state.heroes.forEach(hero => {
        hero.regenerate(RECOVERY_RATE_WIPE * dt);
        if (hero.hp < hero.maxHp) allHeroesFull = false;
    });
    if (allHeroesFull) {
        state.heroes.forEach(hero => hero.status = 'fighting');
        state.gameStatus = 'fighting';
        state.ui.progressionNeedsUpdate = true; // NOUVEAU
    }
}

function handleMonsterDefeated(state) {
    if (!state.activeMonster) return;
    const goldGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.1;
    const xpGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.5;
    state.gold += goldGained;
    state.heroes.forEach(hero => { if (hero.isFighting()) hero.addXp(xpGained); });
    state.ui.heroesNeedUpdate = true; // NOUVEAU : Pour l'XP et le niveau

    if (Math.random() < BASE_DROP_CHANCE) {
        generateLoot(state);
    }

    if (state.gameStatus === 'boss_fight') {
        state.gameStatus = 'floor_cleared';
        state.ui.progressionNeedsUpdate = true; // NOUVEAU
        generateNextEncounter(state);
        return;
    }
    if (state.gameStatus === 'fighting') {
        state.encounterIndex++;
        if (state.encounterIndex > state.encountersPerFloor) {
            state.gameStatus = 'farming_boss_available';
            state.ui.progressionNeedsUpdate = true; // NOUVEAU
        }
    }
    generateNextEncounter(state);
}

function generateLoot(state) {
    const itemLevel = state.activeMonster.level;
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const itemDef = ITEM_DEFINITIONS[randomKey];
    const newItem = new Item(itemDef, itemLevel);
    InventoryManager.addDroppedItem(state, newItem);
    // NOUVEAU : InventoryManager lèvera le drapeau lootNeedsUpdate
}

function generateNextEncounter(state) {
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

function startBossFight(state) {
    if (state.gameStatus !== 'farming_boss_available') return;
    state.heroes.forEach(hero => {
        hero.hp = hero.maxHp;
        hero.status = 'fighting';
    });
    state.gameStatus = 'boss_fight';
    state.ui.progressionNeedsUpdate = true; // NOUVEAU
    state.ui.heroesNeedUpdate = true; // NOUVEAU
    const scale = Math.pow(ENEMY_SCALING_FACTOR, state.dungeonFloor - 1);
    const bossLevel = state.dungeonFloor;
    const bossName = `${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]} ${BOSS_TITLES[Math.floor(Math.random() * BOSS_TITLES.length)]}`;
    const bossHp = Math.ceil((BASE_BOSS_HP * bossLevel) * scale);
    const bossDps = parseFloat((BASE_BOSS_DPS * scale).toFixed(2));
    state.activeMonster = new Boss(bossName, bossHp, bossDps, bossLevel);
}

function advanceToNextFloor(state) {
    if (state.gameStatus !== 'floor_cleared') return;
    state.dungeonFloor++;
    state.encounterIndex = 1;
    state.gameStatus = 'fighting';
    const mageDef = state.heroDefinitions.MAGE;
    if (state.dungeonFloor === 2 && mageDef.status === 'locked') {
        mageDef.status = 'recruited';
        state.heroes.push(new Hero(mageDef));
        state.ui.heroesNeedUpdate = true; // NOUVEAU
    }
    state.ui.progressionNeedsUpdate = true; // NOUVEAU
    generateNextEncounter(state);
}

export const DungeonManager = {
    update,
    generateNextEncounter,
    startBossFight,
    advanceToNextFloor,
};
