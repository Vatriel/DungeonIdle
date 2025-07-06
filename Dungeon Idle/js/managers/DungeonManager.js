// js/managers/DungeonManager.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Boss } from '../entities/Boss.js';
import { Item } from '../entities/Item.js';
import { MONSTER_DEFINITIONS } from '../data/monsterData.js';
import { BOSS_NAMES, BOSS_TITLES } from '../data/bossData.js';
import { ITEM_DEFINITIONS } from '../data/itemData.js';

const RECOVERY_RATE_WIPE = 25; // Taux de récupération des HP après un "party wipe"
const ENGAGEMENT_LIMIT = 3; // Nombre maximal de monstres qui peuvent attaquer un héros simultanément (pour MonsterGroup)
const ENEMY_SCALING_FACTOR = 1.15; // Facteur de mise à l'échelle des ennemis par étage
const BASE_BOSS_HP = 200; // HP de base d'un boss
const BASE_BOSS_DAMAGE = 15; // Dégâts de base d'un boss
const BASE_BOSS_ATTACK_SPEED = 1.0; // Vitesse d'attaque de base d'un boss
export const ARMOR_CONSTANT = 200; // Constante de base utilisée dans la formule de réduction des dégâts par l'armure: Dégâts_réduits = Dégâts_bruts * (1 - Armure / (Armure + ARMOR_CONSTANT))
export const ARMOR_DECAY_FACTOR = 1.05; // Facteur d'augmentation de la constante d'armure par étage (rend l'armure moins efficace)
const BASE_DROP_CHANCE = 0.15; // Chance de base qu'un item soit lâché après un combat
const ENCOUNTER_COOLDOWN_DURATION = 0.5; // Durée du cooldown entre les rencontres

/**
 * Met à jour la logique du donjon en fonction de l'état actuel du jeu.
 * @param {object} state - L'objet d'état global du jeu.
 * @param {number} dt - Le temps écoulé depuis la dernière mise à jour.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function update(state, dt, eventBus) {
    switch (state.gameStatus) {
        case 'fighting':
        case 'boss_fight':
            runFightingLogic(state, dt, eventBus); // Logique de combat
            break;
        
        case 'party_wipe':
            runPartyWipeRecoveryLogic(state, dt, eventBus); // Logique de récupération après un "party wipe"
            break;
        
        case 'encounter_cooldown':
            runEncounterCooldownLogic(state, dt, eventBus); // Logique du cooldown entre les rencontres
            break;
    }
}

/**
 * Gère le compte à rebours entre les rencontres.
 * @param {object} state - L'objet d'état global du jeu.
 * @param {number} dt - Le temps écoulé.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function runEncounterCooldownLogic(state, dt, eventBus) {
    state.encounterCooldown -= dt;
    if (state.encounterCooldown <= 0) {
        prepareNextEncounter(state, eventBus); // Prépare la prochaine rencontre une fois le cooldown terminé
    }
}

/**
 * Prépare et démarre la prochaine rencontre (monstre normal ou boss).
 * @param {object} state - L'objet d'état global du jeu.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function prepareNextEncounter(state, eventBus) {
    if (state.pendingBossFight) {
        state.pendingBossFight = false; // Réinitialise le drapeau
        startBossFight(state, eventBus); // Démarre le combat de boss
    } else {
        generateRegularEncounter(state, eventBus); // Génère une rencontre normale
    }
}

/**
 * Gère la logique de combat principal (héros attaquent, monstre attaque).
 * @param {object} state - L'objet d'état global du jeu.
 * @param {number} dt - Le temps écoulé.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function runFightingLogic(state, dt, eventBus) {
    // Si le monstre n'est pas défini ou est mort, gère la défaite du monstre
    if (!state.activeMonster || !state.activeMonster.isAlive()) {
        if (state.activeMonster) { // S'il y avait un monstre actif qui vient de mourir
            handleMonsterDefeated(state, eventBus);
        } else { // S'il n'y a pas de monstre actif (nouvelle rencontre)
            prepareNextEncounter(state, eventBus);
        }
        return;
    }

    // --- LOGIQUE D'ATTAQUE DES HÉROS ---
    state.heroes.forEach(hero => {
        hero.update(state, dt, eventBus); // Met à jour les buffs du héros, etc.
        if (!hero.isFighting()) return; // Le héros doit être en état de combattre

        hero.attackTimer += dt;
        const attackCooldown = 1 / hero.attackSpeed; // Temps entre les attaques

        if (hero.attackTimer >= attackCooldown) {
            hero.attackTimer -= attackCooldown; // Réinitialise le timer d'attaque

            let damageDealt = hero.damage;
            let isCrit = false;
            // Vérifie si l'attaque est un coup critique
            if (Math.random() < hero.critChance) {
                damageDealt *= hero.critDamage;
                isCrit = true;
            }

            state.activeMonster.takeDamage(damageDealt); // Le monstre prend les dégâts
            
            // Ajoute les dégâts au bucket pour l'affichage flottant
            if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
            if (isCrit) state.damageBuckets.monster.crit += damageDealt;
            else state.damageBuckets.monster.damage += damageDealt;
        }
    });
    
    // Si le monstre est mort après les attaques des héros, gère sa défaite
    if (!state.activeMonster.isAlive()) {
        handleMonsterDefeated(state, eventBus);
        return;
    }

    // --- LOGIQUE D'ATTAQUE DU MONSTRE ---
    const monster = state.activeMonster;
    monster.attackTimer += dt;

    let monsterAttackSpeed;
    if (monster instanceof MonsterGroup) {
        monsterAttackSpeed = monster.baseDefinition.baseAttackSpeed;
    } else { // Boss
        monsterAttackSpeed = monster.attackSpeed;
    }
    const monsterAttackCooldown = 1 / monsterAttackSpeed;

    if (monster.attackTimer >= monsterAttackCooldown) {
        monster.attackTimer -= monsterAttackCooldown; // Réinitialise le timer d'attaque du monstre

        let totalDamageToDeal;
        let damagePerAttacker;

        if (monster instanceof MonsterGroup) {
            damagePerAttacker = monster.baseDefinition.baseDamage;
            totalDamageToDeal = damagePerAttacker * monster.currentCount; // Dégâts totaux du groupe
        } else { // Boss
            damagePerAttacker = monster.damage;
            totalDamageToDeal = monster.damage; // Dégâts du boss
        }

        let remainingDamageToDeal = totalDamageToDeal;
        const fightingHeroes = state.heroes.filter(hero => hero.isFighting());

        // Calcule la constante d'armure dynamique basée sur l'étage actuel
        // Le facteur est appliqué à partir du 2ème étage (étage 1 => puissance 0, étage 2 => puissance 1)
        const dynamicArmorConstant = ARMOR_CONSTANT * Math.pow(ARMOR_DECAY_FACTOR, state.dungeonFloor - 1);

        // Distribue les dégâts du monstre aux héros
        for (const hero of fightingHeroes) {
            if (remainingDamageToDeal <= 0) break;
            const maxDamageOnThisHero = (monster instanceof Boss) ? remainingDamageToDeal : (ENGAGEMENT_LIMIT * damagePerAttacker);
            const damageDealtToHero = Math.min(remainingDamageToDeal, maxDamageOnThisHero);
            
            // Calcul de la réduction des dégâts par l'armure en utilisant la constante dynamique
            const damageReduction = hero.armor / (hero.armor + dynamicArmorConstant);
            const finalDamage = damageDealtToHero * (1 - damageReduction);
            
            // Le héros prend les dégâts et on vérifie si son statut a changé
            if (hero.takeDamage(finalDamage)) {
                state.ui.heroesNeedUpdate = true;
            }

            // Ajoute les dégâts au bucket du héros pour l'affichage flottant
            if (!state.damageBuckets[hero.id]) state.damageBuckets[hero.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
            state.damageBuckets[hero.id].damage += finalDamage;
            remainingDamageToDeal -= damageDealtToHero;
        }
    }

    // Vérifie si tous les héros sont tombés KO (party wipe)
    if (state.heroes.every(hero => !hero.isFighting())) {
        state.pendingBossFight = false;
        eventBus.emit('dungeon_state_changed', { newStatus: 'party_wipe' });
    }
}

/**
 * Gère la logique de récupération après un "party wipe".
 * @param {object} state - L'objet d'état global du jeu.
 * @param {number} dt - Le temps écoulé.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function runPartyWipeRecoveryLogic(state, dt, eventBus) {
    let allHeroesFull = true;
    let statusHasChanged = false;

    // Régénère les HP de tous les héros
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

    // Si tous les héros sont full HP, le groupe est prêt à reprendre le combat
    if (allHeroesFull) {
        state.heroes.forEach(hero => hero.status = 'fighting');
        eventBus.emit('dungeon_state_changed', { newStatus: 'encounter_cooldown', fullHeal: true });
        state.encounterCooldown = ENCOUNTER_COOLDOWN_DURATION;
        state.ui.heroesNeedUpdate = true;
    }
}

/**
 * Gère les actions après la défaite d'un monstre (gain d'or/XP, loot, progression).
 * @param {object} state - L'objet d'état global du jeu.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function handleMonsterDefeated(state, eventBus) {
    let totalGoldFind = 0;
    state.heroes.forEach(hero => { if (hero.isFighting()) totalGoldFind += hero.goldFind; });
    const baseGoldGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.1;
    const goldGained = baseGoldGained * (1 + totalGoldFind);
    const xpGained = (state.activeMonster.maxHp || state.activeMonster.totalMaxHp) * 0.5;
    
    eventBus.emit('monster_defeated', { goldGained, xpGained });

    // Chance de générer du butin
    if (Math.random() < BASE_DROP_CHANCE) {
        generateLoot(state, eventBus);
    }

    const wasBoss = state.gameStatus === 'boss_fight';

    if (wasBoss) {
        state.bossIsDefeated = true;
    } else {
        // Si l'index de rencontre atteint le seuil et que le boss n'est pas encore débloqué, le débloque
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


/**
 * Génère un item de butin aléatoire.
 * @param {object} state - L'objet d'état global du jeu.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function generateLoot(state, eventBus) {
    const itemLevel = state.activeMonster.level || state.dungeonFloor;
    const itemKeys = Object.keys(ITEM_DEFINITIONS);
    const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
    const itemDef = ITEM_DEFINITIONS[randomKey];
    // Passage de state.dungeonFloor au constructeur Item pour la logique de rareté
    const newItem = new Item(itemDef, itemLevel, state.dungeonFloor); 
    eventBus.emit('item_dropped', { item: newItem });
}

/**
 * Génère une rencontre de monstres normale.
 * @param {object} state - L'objet d'état global du jeu.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function generateRegularEncounter(state, eventBus) {
    const currentFloor = state.dungeonFloor;
    // Filtre les monstres disponibles pour l'étage actuel
    const availableMonsters = Object.values(MONSTER_DEFINITIONS).filter(def => currentFloor >= def.appearsAtFloor);

    if (availableMonsters.length === 0) {
        console.error(`Aucun monstre disponible pour l'étage ${currentFloor}`);
        return;
    }

    const chosenMonsterDef = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    
    // Crée une copie de la configuration de taille de groupe pour la modifier si nécessaire
    const sizeConfig = { ...chosenMonsterDef.groupSize }; 

    // Applique le scaling de la taille du groupe tous les 10 étages, sauf pour les monstres à taille fixe
    if (!chosenMonsterDef.isFixedGroupSize) {
        const floorTier = Math.floor((currentFloor - 1) / 10); // Palier d'étage (0 pour 1-10, 1 pour 11-20, etc.)
        sizeConfig.base += floorTier * 1; // Augmente le minimum de 1 par palier
        sizeConfig.random += floorTier * 2; // Augmente le maximum de 2 par palier (en augmentant la plage aléatoire)
    }

    let monsterCount = sizeConfig.base + (sizeConfig.perFloor * currentFloor) + Math.floor(Math.random() * sizeConfig.random);
    monsterCount = Math.max(1, Math.floor(monsterCount)); // S'assure qu'il y a au moins 1 monstre
    
    // Applique le scaling de l'ennemi en fonction de l'étage
    const scale = Math.pow(ENEMY_SCALING_FACTOR, currentFloor - 1);
    const scaledDef = { 
        ...chosenMonsterDef, 
        level: currentFloor, 
        baseHp: Math.ceil(chosenMonsterDef.baseHp * scale), 
        baseDamage: parseFloat((chosenMonsterDef.baseDamage * scale).toFixed(2)),
        baseAttackSpeed: chosenMonsterDef.baseAttackSpeed // La vitesse d'attaque ne scale pas avec les étages pour l'instant
    };
    
    const newMonster = new MonsterGroup(scaledDef, monsterCount);
    
    state.gameStatus = 'fighting';

    eventBus.emit('encounter_changed', {
        newStatus: 'fighting',
        encounterIndex: state.encounterIndex,
        newMonster: newMonster
    });
}


/**
 * Démarre un combat de boss.
 * @param {object} state - L'objet d'état global du jeu.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function startBossFight(state, eventBus) {
    // Émet un événement pour changer l'état du donjon et soigner complètement le groupe
    eventBus.emit('dungeon_state_changed', { newStatus: 'boss_fight', fullHeal: true });

    // Calcule les statistiques du boss en fonction de l'étage
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

/**
 * Avance le joueur à l'étage suivant du donjon.
 * @param {object} state - L'objet d'état global du jeu.
 * @param {EventBus} eventBus - Le bus d'événements.
 */
function advanceToNextFloor(state, eventBus) {
    if (!state.bossIsDefeated) return;
    eventBus.emit('floor_advanced', { newFloor: state.dungeonFloor + 1 });
}

export const DungeonManager = {
    update,
    startBossFight,
    advanceToNextFloor,
};
