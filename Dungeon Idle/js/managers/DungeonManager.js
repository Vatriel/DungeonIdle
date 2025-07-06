// js/managers/DungeonManager.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { MONSTER_DEFINITIONS } from '../data/monsterData.js';
import { BOSS_NAMES, BOSS_TITLES } from '../data/bossData.js';
import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { Duelist } from '../entities/Duelist.js';

const RECOVERY_RATE_WIPE = 25;
const ENGAGEMENT_LIMIT = 3;
const ENEMY_SCALING_FACTOR = 1.15;
const BASE_BOSS_HP = 200;
const BASE_BOSS_DAMAGE = 15;
const BASE_BOSS_ATTACK_SPEED = 1.0;
export const ARMOR_CONSTANT = 200;
export const ARMOR_DECAY_FACTOR = 1.05;
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
    if (!state.activeMonster || !state.activeMonster.isAlive()) {
        if (state.activeMonster) {
            handleMonsterDefeated(state, eventBus);
        } else {
            prepareNextEncounter(state, eventBus);
        }
        return;
    }

    state.heroes.forEach(hero => {
        hero.update(state, dt, eventBus);
        if (!hero.isFighting()) return;

        hero.attackTimer += dt;
        const attackCooldown = 1 / hero.attackSpeed;

        if (hero.attackTimer >= attackCooldown) {
            hero.attackTimer -= attackCooldown;

            let damageDealt = hero.damage;
            let isCrit = false;
            if (Math.random() < hero.critChance) {
                damageDealt *= hero.critDamage;
                isCrit = true;
                // MODIFIÉ : Émission de l'événement pour le texte "CRITIQUE!"
                eventBus.emit('flavor_text_triggered', { text: 'CRITIQUE !', targetId: 'monster', type: 'crit-text' });
            }

            state.activeMonster.takeDamage(damageDealt);
            
            if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
            if (isCrit) state.damageBuckets.monster.crit += damageDealt;
            else state.damageBuckets.monster.damage += damageDealt;
        }
    });
    
    if (!state.activeMonster.isAlive()) {
        handleMonsterDefeated(state, eventBus);
        return;
    }

    const monster = state.activeMonster;
    monster.attackTimer += dt;

    let monsterAttackSpeed;
    if (monster instanceof MonsterGroup) {
        monsterAttackSpeed = monster.baseDefinition.baseAttackSpeed;
    } else {
        monsterAttackSpeed = monster.attackSpeed;
    }
    const monsterAttackCooldown = 1 / monsterAttackSpeed;

    if (monster.attackTimer >= monsterAttackCooldown) {
        monster.attackTimer -= monsterAttackCooldown;

        let totalDamageToDeal;
        let damagePerAttacker;

        if (monster instanceof MonsterGroup) {
            damagePerAttacker = monster.baseDefinition.baseDamage;
            totalDamageToDeal = damagePerAttacker * monster.currentCount;
        } else {
            damagePerAttacker = monster.damage;
            totalDamageToDeal = monster.damage;
        }

        let remainingDamageToDeal = totalDamageToDeal;
        const fightingHeroes = state.heroes.filter(hero => hero.isFighting());

        const dynamicArmorConstant = ARMOR_CONSTANT * Math.pow(ARMOR_DECAY_FACTOR, state.dungeonFloor - 1);

        for (const hero of fightingHeroes) {
            if (remainingDamageToDeal <= 0) break;
            const maxDamageOnThisHero = (monster instanceof Boss) ? remainingDamageToDeal : (ENGAGEMENT_LIMIT * damagePerAttacker);
            const damageDealtToHero = Math.min(remainingDamageToDeal, maxDamageOnThisHero);
            
            const damageReduction = hero.armor / (hero.armor + dynamicArmorConstant);
            let finalDamage = damageDealtToHero * (1 - damageReduction);
            
            let damageResult = { damageTaken: finalDamage, statusChanged: false, counterAttackDmg: 0, parryDmg: 0 };

            if (hero instanceof Duelist) {
                damageResult = hero.takeDamage(finalDamage, eventBus);
                finalDamage = damageResult.damageTaken;
            } else {
                const statusChanged = hero.takeDamage(finalDamage);
                damageResult.statusChanged = statusChanged;
            }

            if (damageResult.statusChanged) {
                state.ui.heroesNeedUpdate = true;
            }

            if (damageResult.counterAttackDmg > 0) {
                state.activeMonster.takeDamage(damageResult.counterAttackDmg);
                if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                state.damageBuckets.monster.crit += damageResult.counterAttackDmg;
            }
            if (damageResult.parryDmg > 0) {
                state.activeMonster.takeDamage(damageResult.parryDmg);
                if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                state.damageBuckets.monster.damage += damageResult.parryDmg;
            }

            if (!state.damageBuckets[hero.id]) state.damageBuckets[hero.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
            state.damageBuckets[hero.id].damage += finalDamage;
            remainingDamageToDeal -= damageDealtToHero;
        }
    }

    if (state.heroes.every(hero => !hero.isFighting())) {
        state.pendingBossFight = false;
        eventBus.emit('dungeon_state_changed', { newStatus: 'party_wipe' });
    }
}

function runPartyWipeRecoveryLogic(state, dt, eventBus) {
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
    } else {
        if (state.encounterIndex >= state.encountersPerFloor && !state.bossUnlockReached) {
            state.bossUnlockReached = true;
        }
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
    const newItem = new Item(itemDef, itemLevel, state.dungeonFloor); 
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
    
    const sizeConfig = { ...chosenMonsterDef.groupSize }; 

    if (!chosenMonsterDef.isFixedGroupSize) {
        const floorTier = Math.floor((currentFloor - 1) / 10);
        sizeConfig.base += floorTier * 1;
        sizeConfig.random += floorTier * 2;
    }

    let monsterCount = sizeConfig.base + (sizeConfig.perFloor * currentFloor) + Math.floor(Math.random() * sizeConfig.random);
    monsterCount = Math.max(1, Math.floor(monsterCount));
    
    const scale = Math.pow(ENEMY_SCALING_FACTOR, currentFloor - 1);
    const scaledDef = { 
        ...chosenMonsterDef, 
        level: currentFloor, 
        baseHp: Math.ceil(chosenMonsterDef.baseHp * scale), 
        baseDamage: parseFloat((chosenMonsterDef.baseDamage * scale).toFixed(2)),
        baseAttackSpeed: chosenMonsterDef.baseAttackSpeed
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
    const bossDamage = parseFloat((BASE_BOSS_DAMAGE * scale).toFixed(2));
    const bossAttackSpeed = BASE_BOSS_ATTACK_SPEED;
    const newMonster = new Boss(bossName, bossHp, bossDamage, bossAttackSpeed, bossLevel);

    eventBus.emit('encounter_changed', {
        newStatus: 'boss_fight',
        encounterIndex: state.encounterIndex,
        newMonster: newMonster
    });
}

function advanceToNextFloor(state, eventBus) {
    if (!state.bossIsDefeated) return;
    
    state.highestFloorThisRun = state.dungeonFloor + 1;
    
    eventBus.emit('floor_advanced', { newFloor: state.dungeonFloor + 1 });
}

export const DungeonManager = {
    update,
    startBossFight,
    advanceToNextFloor,
};
