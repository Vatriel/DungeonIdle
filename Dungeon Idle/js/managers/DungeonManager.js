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
const ENCOUNTER_COOLDOWN_DURATION = 0.5;

function update(state, dt, eventBus) {
    switch (state.gameStatus) {
        case 'fighting':
        case 'boss_fight':
            runFightingLogic(state, dt, eventBus);
            break;
        
        case 'party_wipe':
            runPartyWipeRecoveryLogic(state, dt, eventBus);
            break;
        
        case 'encounter_cooldown':
            runEncounterCooldownLogic(state, dt, eventBus);
            break;
    }
}

function runEncounterCooldownLogic(state, dt, eventBus) {
    state.encounterCooldown -= dt;
    if (state.encounterCooldown <= 0) {
        prepareNextEncounter(state, eventBus);
    }
}

function prepareNextEncounter(state, eventBus) {
    if (state.pendingBossFight) {
        state.pendingBossFight = false; 
        startBossFight(state, eventBus);
    } else {
        generateRegularEncounter(state, eventBus);
    }
}

function runFightingLogic(state, dt, eventBus) {
    if (!state.activeMonster) {
        console.warn("État de combat sans monstre actif. Préparation d'une nouvelle rencontre.");
        prepareNextEncounter(state, eventBus);
        return;
    }

    if (!state.activeMonster.isAlive()) {
        handleMonsterDefeated(state, eventBus);
        return;
    }

    state.ui.heroBarsNeedUpdate = true; 

    state.heroes.forEach(hero => {
        hero.update(state, dt, eventBus);
    });
    
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

            if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
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
        
        if (hero.takeDamage(finalDamage)) {
            state.ui.heroesNeedUpdate = true;
        }

        if (!state.damageBuckets[hero.id]) state.damageBuckets[hero.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
        state.damageBuckets[hero.id].damage += finalDamage;
        remainingDpsToDeal -= dpsDealtToHero;
    }

    if (state.heroes.every(hero => !hero.isFighting())) {
        state.pendingBossFight = false;
        eventBus.emit('dungeon_state_changed', { newStatus: 'party_wipe' });
    }
}

function runPartyWipeRecoveryLogic(state, dt, eventBus) {
    state.ui.heroBarsNeedUpdate = true;
    let allHeroesFull = true;
    let statusHasChanged = false;

    state.heroes.forEach(hero => {
        const result = hero.regenerate(RECOVERY_RATE_WIPE * dt);
        if (result.statusChanged) {
            statusHasChanged = true;
        }
        if (hero.hp < hero.maxHp) allHeroesFull = false;
    });

    if (statusHasChanged) {
        state.ui.heroesNeedUpdate = true;
    }

    if (allHeroesFull) {
        state.heroes.forEach(hero => hero.status = 'fighting');
        eventBus.emit('dungeon_state_changed', { newStatus: 'encounter_cooldown', fullHeal: true });
        state.encounterCooldown = ENCOUNTER_COOLDOWN_DURATION;
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

    const wasBoss = state.gameStatus === 'boss_fight';

    if (wasBoss) {
        state.bossIsDefeated = true;
        if (state.ui.autoProgressToNextFloor) {
            advanceToNextFloor(state, eventBus);
            return;
        }
    } else {
        // CORRECTION : La logique de déblocage du boss est revue pour être plus fiable.
        // On vérifie d'abord si la rencontre actuelle est celle qui débloque le boss.
        if (state.encounterIndex >= state.encountersPerFloor && !state.bossUnlockReached) {
            state.bossUnlockReached = true;
            if (state.ui.autoProgressToBoss) {
                state.pendingBossFight = true;
            }
        }
        // On incrémente ensuite le compteur pour la prochaine rencontre.
        state.encounterIndex++;
    }

    state.gameStatus = 'encounter_cooldown';
    state.encounterCooldown = ENCOUNTER_COOLDOWN_DURATION;
    state.activeMonster = null;

    eventBus.emit('dungeon_state_changed', { newStatus: 'encounter_cooldown' });
    state.ui.progressionNeedsUpdate = true;
}


function generateLoot(state, eventBus) {
    const itemLevel = state.activeMonster.level || state.dungeonFloor;
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const itemDef = ITEM_DEFINITIONS[randomKey];
    const newItem = new Item(itemDef, itemLevel);
    eventBus.emit('item_dropped', { item: newItem });
}

function generateRegularEncounter(state, eventBus) {
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
    
    state.gameStatus = 'fighting';

    eventBus.emit('encounter_changed', {
        newStatus: 'fighting',
        encounterIndex: state.encounterIndex,
        newMonster: newMonster
    });
}


function startBossFight(state, eventBus) {
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
    if (!state.bossIsDefeated) return;
    eventBus.emit('floor_advanced', { newFloor: state.dungeonFloor + 1 });
}

export const DungeonManager = {
    update,
    startBossFight,
    advanceToNextFloor,
};
