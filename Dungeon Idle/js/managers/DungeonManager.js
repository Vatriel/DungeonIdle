// js/managers/DungeonManager.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { MONSTER_DEFINITIONS } from '../data/monsterData.js';
import { BOSS_NAMES, BOSS_TITLES } from '../data/bossData.js';
import { ITEM_DEFINITIONS } from '../data/itemData.js';

const RECOVERY_RATE_WIPE = 25;
const ENGAGEMENT_LIMIT = 3;
const ENEMY_SCALING_FACTOR = 1.15;
const BASE_BOSS_HP = 200;
const BASE_BOSS_DPS = 15;
const ARMOR_CONSTANT = 200;
const BASE_DROP_CHANCE = 0.15;

function update(state, dt, eventBus) {
    switch (state.gameStatus) {
        case 'fighting':
        case 'farming_boss_available':
        case 'boss_fight':
        case 'floor_cleared':
            runFightingLogic(state, dt, eventBus);
            break;
        case 'party_wipe':
            runPartyWipeRecoveryLogic(state, dt, eventBus);
            break;
    }
}

function runFightingLogic(state, dt, eventBus) {
    // CORRECTION : Garde de sécurité pour s'assurer qu'il y a toujours un monstre
    if (!state.activeMonster) {
        console.warn("Aucun monstre actif, tentative d'en générer un nouveau.");
        generateNextEncounter(state, eventBus);
        return;
    }

    // Si le monstre actuel est mort, on gère sa défaite et on arrête cette frame
    if (!state.activeMonster.isAlive()) {
        handleMonsterDefeated(state, eventBus);
        return;
    }

    state.ui.heroBarsNeedUpdate = true; 

    // Chaque héros exécute sa propre logique de mise à jour (incluant la régénération)
    state.heroes.forEach(hero => {
        hero.update(state.heroes, dt, eventBus);
    });
    
    // Le reste de la logique de combat...
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
            if (isCrit) state.damageBuckets.monster.crit += damageDealt;
            else state.damageBuckets.monster.damage += damageDealt;
        }
    });
    state.activeMonster.takeDamage(totalPartyDps);

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
        const maxDpsOnThisHero = (state.activeMonster instanceof Boss) ? remainingDpsToDeal : (ENGAGEMENT_LIMIT * baseDpsPerAttacker) * dt;
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
            eventBus.emit('dungeon_state_changed', { newStatus: 'farming_boss_available' });
        } else {
            eventBus.emit('dungeon_state_changed', { newStatus: 'party_wipe' });
        }
    }
}

function runPartyWipeRecoveryLogic(state, dt, eventBus) {
    state.ui.heroBarsNeedUpdate = true;
    let allHeroesFull = true;
    state.heroes.forEach(hero => {
        hero.regenerate(RECOVERY_RATE_WIPE * dt);
        if (hero.hp < hero.maxHp) allHeroesFull = false;
    });
    if (allHeroesFull) {
        state.heroes.forEach(hero => hero.status = 'fighting');
        eventBus.emit('dungeon_state_changed', { newStatus: 'fighting', fullHeal: false });
        state.ui.heroesNeedUpdate = true;
    }
}

function handleMonsterDefeated(state, eventBus) {
    let totalGoldFind = 0;
    state.heroes.forEach(hero => { if (hero.isFighting()) totalGoldFind += hero.goldFind; });
    const baseGoldGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.1;
    const goldGained = baseGoldGained * (1 + totalGoldFind);
    const xpGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.5;
    
    eventBus.emit('monster_defeated', { goldGained, xpGained });

    if (Math.random() < BASE_DROP_CHANCE) {
        generateLoot(state, eventBus);
    }

    if (state.gameStatus === 'boss_fight') {
        eventBus.emit('dungeon_state_changed', { newStatus: 'floor_cleared' });
        if (state.ui.autoProgressToNextFloor) {
            advanceToNextFloor(state, eventBus);
        }
        return;
    }
    
    if (state.gameStatus === 'fighting') {
        const newEncounterIndex = state.encounterIndex + 1;
        if (newEncounterIndex > state.encountersPerFloor) {
            eventBus.emit('dungeon_state_changed', { newStatus: 'farming_boss_available' });
            if (state.ui.autoProgressToBoss) {
                startBossFight(state, eventBus);
            }
            return;
        }
    }
    generateNextEncounter(state, eventBus);
}

function generateLoot(state, eventBus) {
    const itemLevel = state.activeMonster.level;
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const itemDef = ITEM_DEFINITIONS[randomKey];
    const newItem = new Item(itemDef, itemLevel);
    eventBus.emit('item_dropped', { item: newItem });
}

function generateNextEncounter(state, eventBus) {
    const currentFloor = state.dungeonFloor;
    const availableMonsters = Object.values(MONSTER_DEFINITIONS).filter(def => currentFloor >= def.appearsAtFloor);

    if (availableMonsters.length === 0) {
        console.error(`Aucun monstre disponible pour l'étage ${currentFloor}`);
        return;
    }

    const chosenMonsterDef = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    const sizeConfig = chosenMonsterDef.groupSize;
    let monsterCount = sizeConfig.base + (sizeConfig.perFloor * currentFloor) + Math.floor(Math.random() * sizeConfig.random);
    monsterCount = Math.max(1, Math.floor(monsterCount));
    
    const scale = Math.pow(ENEMY_SCALING_FACTOR, currentFloor - 1);
    const scaledDef = { 
        ...chosenMonsterDef, 
        level: currentFloor, 
        baseHp: Math.ceil(chosenMonsterDef.baseHp * scale), 
        baseDps: parseFloat((chosenMonsterDef.baseDps * scale).toFixed(2)) 
    };
    
    const newMonster = new MonsterGroup(scaledDef, monsterCount);
    const newEncounterIndex = state.gameStatus === 'fighting' ? state.encounterIndex + 1 : state.encounterIndex;

    eventBus.emit('encounter_changed', {
        newStatus: state.gameStatus,
        encounterIndex: newEncounterIndex,
        newMonster: newMonster
    });
}


function startBossFight(state, eventBus) {
    if (state.gameStatus !== 'farming_boss_available') return;
    
    eventBus.emit('dungeon_state_changed', { newStatus: 'boss_fight', fullHeal: true });

    const scale = Math.pow(ENEMY_SCALING_FACTOR, state.dungeonFloor - 1);
    const bossLevel = state.dungeonFloor;
    const bossName = `${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]} ${BOSS_TITLES[Math.floor(Math.random() * BOSS_TITLES.length)]}`;
    const bossHp = Math.ceil((BASE_BOSS_HP * bossLevel) * scale);
    const bossDps = parseFloat((BASE_BOSS_DPS * scale).toFixed(2));
    const newMonster = new Boss(bossName, bossHp, bossDps, bossLevel);

    eventBus.emit('encounter_changed', {
        newStatus: 'boss_fight',
        encounterIndex: state.encounterIndex,
        newMonster: newMonster
    });
}

function advanceToNextFloor(state, eventBus) {
    if (state.gameStatus !== 'floor_cleared') return;
    
    const newFloor = state.dungeonFloor + 1;
    eventBus.emit('floor_advanced', { newFloor: newFloor });
    
    generateNextEncounter({ ...state, dungeonFloor: newFloor, encounterIndex: 0 }, eventBus);
}

export const DungeonManager = {
    update,
    generateNextEncounter,
    startBossFight,
    advanceToNextFloor,
};
