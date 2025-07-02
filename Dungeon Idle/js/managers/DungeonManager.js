// js/managers/DungeonManager.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { Hero } from '../entities/Hero.js';
import { MONSTER_DEFINITIONS } from '../data/monsterData.js';
import { BOSS_NAMES, BOSS_TITLES } from '../data/bossData.js';
import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { InventoryManager } from './InventoryManager.js';

const RECOVERY_RATE_SLOW = 2;
const RECOVERY_RATE_WIPE = 25;
const ENGAGEMENT_LIMIT = 3;
const ENEMY_SCALING_FACTOR = 1.15;
const BASE_BOSS_HP = 200;
const BASE_BOSS_DPS = 15;
const ARMOR_CONSTANT = 200;
const BASE_DROP_CHANCE = 0.15;

function update(state, dt) {
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
    state.ui.heroBarsNeedUpdate = true; 

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
            let isCrit = false;
            if (Math.random() < hero.critChance) {
                heroDps *= hero.critDamage;
                isCrit = true;
            }
            const damageDealt = heroDps * dt;
            totalPartyDps += damageDealt;

            if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, timer: 0.3 };
            
            if (isCrit) {
                state.damageBuckets.monster.crit += damageDealt;
            } else {
                if (Math.random() < 0.03) {
                    state.floatingTexts.push({ text: damageDealt, type: 'damage', targetId: 'monster' });
                } else {
                    state.damageBuckets.monster.damage += damageDealt;
                }
            }
        }
    });

    state.activeMonster.takeDamage(totalPartyDps);

    // MODIFIÉ : Restauration de la logique de "tanking"
    let monsterTotalDps = 0;
    let baseDpsPerAttacker = 0;
    if (state.activeMonster instanceof MonsterGroup) {
        monsterTotalDps = state.activeMonster.baseDefinition.baseDps * state.activeMonster.currentCount;
        baseDpsPerAttacker = state.activeMonster.baseDefinition.baseDps;
    } else {
        monsterTotalDps = state.activeMonster.dps;
        baseDpsPerAttacker = state.activeMonster.dps;
    }

    let remainingDpsToDeal = monsterTotalDps * dt;
    const fightingHeroes = state.heroes.filter(hero => hero.isFighting());

    for (const hero of fightingHeroes) {
        if (remainingDpsToDeal <= 0) break;

        const maxDpsOnThisHero = (state.activeMonster instanceof Boss) 
            ? remainingDpsToDeal 
            : (ENGAGEMENT_LIMIT * baseDpsPerAttacker) * dt;
            
        const dpsDealtToHero = Math.min(remainingDpsToDeal, maxDpsOnThisHero);
        const damageReduction = hero.armor / (hero.armor + ARMOR_CONSTANT);
        const finalDamage = dpsDealtToHero * (1 - damageReduction);
        
        hero.takeDamage(finalDamage);

        if (!state.damageBuckets[hero.id]) state.damageBuckets[hero.id] = { damage: 0, crit: 0, timer: 0.3 };
        state.damageBuckets[hero.id].damage += finalDamage;
        
        remainingDpsToDeal -= dpsDealtToHero;
    }

    if (state.heroes.every(hero => !hero.isFighting())) {
        if (state.gameStatus === 'boss_fight') {
            state.gameStatus = 'farming_boss_available';
            state.ui.progressionNeedsUpdate = true;
            generateNextEncounter(state);
        } else {
            state.gameStatus = 'party_wipe';
            state.ui.progressionNeedsUpdate = true;
        }
    }
}

function runPartyWipeRecoveryLogic(state, dt) {
    state.ui.heroBarsNeedUpdate = true;
    let allHeroesFull = true;
    state.heroes.forEach(hero => {
        hero.regenerate(RECOVERY_RATE_WIPE * dt);
        if (hero.hp < hero.maxHp) allHeroesFull = false;
    });
    if (allHeroesFull) {
        state.heroes.forEach(hero => hero.status = 'fighting');
        state.gameStatus = 'fighting';
        state.ui.progressionNeedsUpdate = true;
        state.ui.heroesNeedUpdate = true;
    }
}

function handleMonsterDefeated(state) {
    if (!state.activeMonster) return;

    let totalGoldFind = 0;
    state.heroes.forEach(hero => {
        if (hero.isFighting()) {
            totalGoldFind += hero.goldFind;
        }
    });

    const baseGoldGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.1;
    const goldGained = baseGoldGained * (1 + totalGoldFind);
    const xpGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.5;
    
    state.gold += goldGained;
    let needsFullUpdate = false;
    state.heroes.forEach(hero => { 
        if (hero.isFighting()) {
            const previousLevel = hero.level;
            hero.addXp(xpGained);
            if (hero.level > previousLevel) {
                needsFullUpdate = true;
            }
        }
    });

    if (needsFullUpdate) {
        state.ui.heroesNeedUpdate = true;
    } else {
        state.ui.heroBarsNeedUpdate = true;
    }

    if (Math.random() < BASE_DROP_CHANCE) {
        generateLoot(state);
    }

    if (state.gameStatus === 'boss_fight') {
        state.gameStatus = 'floor_cleared';
        state.ui.progressionNeedsUpdate = true;
        if (state.ui.autoProgressToNextFloor) {
            advanceToNextFloor(state);
        } else {
            generateNextEncounter(state);
        }
        return;
    }
    if (state.gameStatus === 'fighting') {
        state.encounterIndex++;
        if (state.encounterIndex > state.encountersPerFloor) {
            state.gameStatus = 'farming_boss_available';
            state.ui.progressionNeedsUpdate = true;
            if (state.ui.autoProgressToBoss) {
                startBossFight(state);
                return;
            }
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
}

function generateNextEncounter(state) {
    const difficultyIndex = Math.min(state.encounterIndex, state.encountersPerFloor);
    const currentFloor = state.dungeonFloor;
    
    let encounterPool = [];
    if (currentFloor >= 1)  encounterPool.push(MONSTER_DEFINITIONS.GOBLIN);
    if (currentFloor >= 3)  encounterPool.push(MONSTER_DEFINITIONS.ORC);
    if (currentFloor >= 5)  encounterPool.push(MONSTER_DEFINITIONS.SKELETON);
    if (currentFloor >= 10) encounterPool.push(MONSTER_DEFINITIONS.GHOUL);
    if (currentFloor >= 15) encounterPool.push(MONSTER_DEFINITIONS.STONE_GOLEM);

    const chosenMonsterDef = encounterPool[Math.floor(Math.random() * encounterPool.length)];

    let monsterCount = 1;
    switch(chosenMonsterDef.id) {
        case 'goblin':
            monsterCount = 2 + difficultyIndex + Math.floor(Math.random() * 3);
            break;
        case 'orc':
            monsterCount = 1 + Math.floor(currentFloor / 3) + Math.floor(Math.random() * 2);
            break;
        case 'skeleton':
            monsterCount = 2 + Math.floor(currentFloor / 5) + Math.floor(Math.random() * 3);
            break;
        case 'ghoul':
            monsterCount = 1 + Math.floor(currentFloor / 8);
            break;
        case 'stone_golem':
            monsterCount = 1;
            break;
    }
    
    const scale = Math.pow(ENEMY_SCALING_FACTOR, currentFloor - 1);
    const scaledDef = { 
        ...chosenMonsterDef, 
        level: currentFloor, 
        baseHp: Math.ceil(chosenMonsterDef.baseHp * scale), 
        baseDps: parseFloat((chosenMonsterDef.baseDps * scale).toFixed(2)) 
    };
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
    state.ui.progressionNeedsUpdate = true;
    state.ui.heroesNeedUpdate = true;
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
        mageDef.status = 'available';
        state.ui.recruitmentNeedsUpdate = true;
    }
    state.ui.progressionNeedsUpdate = true;
    generateNextEncounter(state);
}

export const DungeonManager = {
    update,
    generateNextEncounter,
    startBossFight,
    advanceToNextFloor,
};
