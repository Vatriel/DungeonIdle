// js/managers/DungeonManager.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { MONSTER_DEFINITIONS } from '../data/monsterData.js';
import { BOSS_NAMES, BOSS_TITLES } from '../data/bossData.js';
import { ITEM_DEFINITIONS } from '../data/itemData.js';
import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';
import { Protector } from '../entities/Protector.js';
import { UnlockManager } from './UnlockManager.js';

export const ARMOR_CONSTANT = 200;
export const ARMOR_DECAY_FACTOR = 1.05;

const RECOVERY_RATE_WIPE = 25;
const BOOSTED_RECOVERY_RATE_FACTOR = 0.33;
const ENEMY_SCALING_FACTOR = 1.15;
const BASE_BOSS_HP = 200;
const BASE_BOSS_DAMAGE = 25;
const BASE_BOSS_ATTACK_SPEED = 1.0;
const BASE_DROP_CHANCE = 0.15;
const ENCOUNTER_COOLDOWN_DURATION = 0.5;

let localState = null;
let localEventBus = null;

function update(dt) {
    switch (localState.gameStatus) {
        case 'fighting':
        case 'boss_fight':
            if (localState.activeMonster) {
                if (!localState.activeMonster.isAlive()) {
                    handleMonsterDefeated();
                } else if (localState.heroes.every(hero => !hero.isFighting())) {
                    handlePartyWipe();
                }
            } else {
                prepareNextEncounter();
            }
            break;
        case 'party_wipe':
            runPartyWipeRecoveryLogic(dt);
            break;
        case 'encounter_cooldown':
            runEncounterCooldownLogic(dt);
            break;
    }
}

function runPartyWipeRecoveryLogic(dt) {
    let allHeroesFull = true;
    let statusHasChanged = false;
    localState.heroes.forEach(hero => {
        let healAmount;
        if (localState.partyWipeHealBoostActive) {
            healAmount = hero.maxHp * BOOSTED_RECOVERY_RATE_FACTOR * dt;
        } else {
            healAmount = RECOVERY_RATE_WIPE * dt;
        }
        const result = hero.regenerate(healAmount, 'regen', localEventBus, localState);
        
        if (result.statusChanged) statusHasChanged = true;
        if (hero.hp < hero.maxHp) allHeroesFull = false;
    });

    if (statusHasChanged) localState.ui.heroesNeedUpdate = true;

    if (allHeroesFull) {
        localState.heroes.forEach(hero => hero.status = 'fighting');
        // Direct state change
        localState.gameStatus = 'encounter_cooldown';
        localState.encounterCooldown = ENCOUNTER_COOLDOWN_DURATION;
        localState.ui.progressionNeedsUpdate = true;
        localState.ui.partyPanelNeedsUpdate = true;
    }
}

function runEncounterCooldownLogic(dt) {
    localState.encounterCooldown -= dt;
    if (localState.encounterCooldown <= 0) {
        prepareNextEncounter();
    }
}

function prepareNextEncounter() {
    localState.heroes.forEach(hero => {
        if (hero instanceof Protector) {
            hero.attackCycleInstance = 0;
            hero.attackCycleCooldown = 0;
            hero.dpsReferenceValueA = 0;
            hero.beamInstanceTimer = 0;
        }
    });

    if (localState.pendingBossFight) {
        localState.pendingBossFight = false;
        startBossFight();
    } else {
        generateRegularEncounter();
    }
}

function handlePartyWipe() {
    localState.pendingBossFight = false;
    localState.partyWipeHealBoostActive = false;
    // Direct state change
    localState.gameStatus = 'party_wipe';
    localState.ui.progressionNeedsUpdate = true;
    localState.ui.partyPanelNeedsUpdate = true;
}

function handleMonsterDefeated() {
    const defeatedMonster = localState.activeMonster;
    if (!defeatedMonster) return;

    const goldGained = (defeatedMonster.maxHp || defeatedMonster.totalMaxHp) * 0.1;
    const xpGained = (defeatedMonster.maxHp || defeatedMonster.totalMaxHp) * 0.5;

    localEventBus.emit('monster_defeated', { goldGained, xpGained });
    localEventBus.emit('monster_defeated_by_type', { 
        monsterId: defeatedMonster.id, 
        count: defeatedMonster instanceof MonsterGroup ? defeatedMonster.initialCount : 1
    });

    if (Math.random() < BASE_DROP_CHANCE) {
        generateLoot(defeatedMonster);
    }

    const wasBoss = localState.gameStatus === 'boss_fight';
    if (wasBoss) {
        localState.bossIsDefeated = true;
    } else {
        if (localState.encounterIndex >= localState.encountersPerFloor && !localState.bossUnlockReached) {
            localState.bossUnlockReached = true;
        }
        localState.encounterIndex++;
    }

    // Direct state change
    localState.activeMonster = null;
    localState.gameStatus = 'encounter_cooldown';
    localState.encounterCooldown = ENCOUNTER_COOLDOWN_DURATION;
    localState.ui.progressionNeedsUpdate = true;
    localState.ui.partyPanelNeedsUpdate = true;
}

function generateLoot(defeatedMonster) {
    const itemLevel = defeatedMonster.level || localState.dungeonFloor;
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const itemDef = ITEM_DEFINITIONS[randomKey];
    const newItem = new Item(itemDef, itemLevel, localState.dungeonFloor);
    localEventBus.emit('item_dropped', { item: newItem });
}

function generateRegularEncounter() {
    const currentFloor = localState.dungeonFloor;
    const availableMonsters = Object.values(MONSTER_DEFINITIONS).filter(def => currentFloor >= def.appearsAtFloor);
    if (availableMonsters.length === 0) return;
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
    
    // Direct state change instead of emitting 'encounter_changed'
    localState.gameStatus = 'fighting';
    localState.activeMonster = newMonster;
    localState.ui.progressionNeedsUpdate = true;
}

function startBossFight() {
    // Direct state change
    localState.gameStatus = 'boss_fight';
    localState.heroes.forEach(hero => {
        hero.hp = hero.maxHp;
        hero.status = 'fighting';
    });
    localState.ui.heroesNeedUpdate = true;

    const scale = Math.pow(ENEMY_SCALING_FACTOR, localState.dungeonFloor - 1);
    const bossLevel = localState.dungeonFloor;
    const bossName = `${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]} ${BOSS_TITLES[Math.floor(Math.random() * BOSS_TITLES.length)]}`;
    const bossHp = Math.ceil((BASE_BOSS_HP * bossLevel) * scale);
    const bossDamage = parseFloat((BASE_BOSS_DAMAGE * scale).toFixed(2));
    const bossAttackSpeed = BASE_BOSS_ATTACK_SPEED;
    const newMonster = new Boss(bossName, bossHp, bossDamage, bossAttackSpeed, bossLevel);
    
    // Direct state change
    localState.activeMonster = newMonster;
    localState.ui.progressionNeedsUpdate = true;
}

function advanceToNextFloor() {
    if (!localState.bossIsDefeated) return;
    
    // Direct state change
    localState.dungeonFloor++;
    localState.highestFloorAchieved = Math.max(localState.highestFloorAchieved, localState.dungeonFloor);
    localState.highestFloorThisRun = Math.max(localState.highestFloorThisRun, localState.dungeonFloor);
    UnlockManager.checkUnlocks(localState, localEventBus);
    localState.encounterIndex = 1;
    localState.bossUnlockReached = false;
    localState.bossIsDefeated = false;
    localState.pendingBossFight = false;
    localState.activeMonster = null;
    localState.gameStatus = 'encounter_cooldown';
    localState.encounterCooldown = 0.5;
    localState.ui.progressionNeedsUpdate = true;
}

export const DungeonManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;
        
        eventBus.on('monster_defeated', (data) => {
            const goldBonus = (state.prestigeUpgrades.GOLDEN_ECHO ? PRESTIGE_UPGRADES.GOLDEN_ECHO.effect(state.prestigeUpgrades.GOLDEN_ECHO) / 100 : 0) + (state.globalAuraBonuses.goldFind / 100);
            state.gold += data.goldGained * (1 + goldBonus);
            UnlockManager.checkUnlocks(state, eventBus);
            state.ui.shopNeedsUpdate = true;
        });
        
        eventBus.on('ui_fight_boss_clicked', () => {
            localState.pendingBossFight = true;
            localEventBus.emit('notification_requested', { message: 'Le boss arrive ! Préparez-vous !', type: 'success' });
            localState.ui.progressionNeedsUpdate = true;
        });

        eventBus.on('ui_next_floor_clicked', advanceToNextFloor);
        
        eventBus.on('ui_boost_heal_clicked', () => {
            if (localState.gameStatus === 'party_wipe' && !localState.partyWipeHealBoostActive) {
                localState.partyWipeHealBoostActive = true;
                localState.ui.partyPanelNeedsUpdate = true;
            }
        });
    },
    update,
    advanceToNextFloor
};
