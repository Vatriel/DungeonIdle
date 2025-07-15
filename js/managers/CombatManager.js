// js/managers/CombatManager.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { Duelist } from '../entities/Duelist.js';
import { Protector } from '../entities/Protector.js';
import { Flibustier } from '../entities/Flibustier.js'; // NOUVEAU : Import du Flibustier
import { Boss } from '../entities/Boss.js'; 
import { ARMOR_CONSTANT, ARMOR_DECAY_FACTOR } from './DungeonManager.js';
import { TrophyManager } from './TrophyManager.js';

const ENGAGEMENT_LIMIT = 3;
const PLAYER_CLICK_DAMAGE = 2;

let localState = null;
let localEventBus = null;

function update(dt) {
    if (localState.gameStatus !== 'fighting' && localState.gameStatus !== 'boss_fight') {
        return;
    }

    if (!localState.activeMonster || !localState.activeMonster.isAlive()) {
        return;
    }

    handleHeroesAttack(dt);

    if (!localState.activeMonster.isAlive()) {
        return;
    }

    handleMonsterAttack(dt);
    
    if (localState.activeMonster instanceof Boss) {
        handleBossAura(localState.activeMonster, dt);
    }
}

function handleHeroesAttack(dt) {
    const monster = localState.activeMonster;
    if (!monster) return;

    localState.heroes.forEach(hero => {
        if (!hero.isFighting()) return;

        if (hero instanceof Protector) {
            // ... (logique du Protecteur inchangée)
            if (hero.attackCycleCooldown > 0) {
                hero.attackCycleCooldown -= dt;
                return;
            }

            hero.beamInstanceTimer += dt;
            const totalCycleTime = 10 / (1 + (hero.beamChargeRate / 100));
            const timePerInstance = totalCycleTime / 10;

            if (hero.beamInstanceTimer >= timePerInstance) {
                hero.beamInstanceTimer -= timePerInstance;

                if (hero.attackCycleInstance === 0) {
                    hero.dpsReferenceValueA = hero.getTheoreticalDPS();
                    hero.attackCycleInstance = 1;
                }

                const instance = hero.attackCycleInstance;
                const valueA = hero.dpsReferenceValueA;
                let damageDealt = 0;
                let chargeFactor = 0;

                if (instance < 10) {
                    chargeFactor = 0.3 * instance;
                    damageDealt = chargeFactor * valueA;
                } else {
                    chargeFactor = 5.0;
                    damageDealt = chargeFactor * valueA;
                    hero.attackCycleInstance = 0;
                    hero.attackCycleCooldown = 2.0;
                }
                
                if (hero.attackCycleInstance !== 0) {
                    hero.attackCycleInstance++;
                }

                if (damageDealt > 0) {
                    const trophyBonus = TrophyManager.getDamageBonus(monster);
                    damageDealt *= (1 + trophyBonus);

                    localEventBus.emit('protector_beam_fired', { damage: damageDealt, chargeFactor: chargeFactor });
                    hero.history.recordDamageDealt(damageDealt, 'beam');
                    
                    if (monster) {
                        monster.takeDamage(damageDealt);
                    }
                }

                const lowestHpAlly = localState.heroes.filter(h => h.isFighting()).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
                if (lowestHpAlly) {
                    const shieldValue = hero.definition.shieldOnHitValue + (hero.intelligence * 0.1);
                    lowestHpAlly.buffs.applyShield(shieldValue, 3, localEventBus);
                }
            }
        } else {
            hero.attackTimer += dt;
            const attackCooldown = 1 / hero.attackSpeed;

            if (hero.attackTimer >= attackCooldown) {
                hero.attackTimer -= attackCooldown;
                hero.attackCounter++;

                let damageDealt = hero.damage;
                let isCrit = false;

                if (hero.hasUniqueEffect('SURGICAL_GLOVES') && hero.attackCounter >= 5) {
                    isCrit = true;
                    hero.attackCounter = 0;
                    hero.history.logEvent('Précision Chirurgicale !', 'crit');
                }

                if (!isCrit && Math.random() < hero.critChance) {
                    isCrit = true;
                }
                
                if (isCrit) {
                    damageDealt *= hero.critDamage;
                }
                
                const trophyBonus = TrophyManager.getDamageBonus(monster);
                damageDealt *= (1 + trophyBonus);

                if (damageDealt > 0) {
                    localEventBus.emit('hero_dealt_damage', { hero, target: monster, damage: damageDealt });
                    if (isCrit) {
                        localEventBus.emit('hero_dealt_critical_strike', { hero, target: monster, damage: damageDealt });
                        hero.history.logEvent(`Coup critique ! (${Math.round(damageDealt)} dégâts)`, 'crit');
                        hero.history.recordDamageDealt(damageDealt, 'crit');
                    } else {
                        hero.history.logEvent(`Attaque (${Math.round(damageDealt)} dégâts)`, 'damage');
                        hero.history.recordDamageDealt(damageDealt, 'normal');
                    }

                    if (monster instanceof MonsterGroup) {
                        const countBefore = monster.currentCount;
                        monster.takeDamage(damageDealt);
                        const countAfter = monster.currentCount;
                        if (countAfter < countBefore) {
                            const unitsDefeated = countBefore - countAfter;
                            for (let i = 0; i < unitsDefeated; i++) {
                                localEventBus.emit('monster_unit_defeated', { hpPerMonster: monster.hpPerMonster });
                            }
                        }
                    } else {
                        monster.takeDamage(damageDealt);
                    }
                    
                    if (hero.lifeSteal > 0) {
                        hero.regenerate(damageDealt * hero.lifeSteal, 'lifesteal', localEventBus, localState);
                    }

                    if (!localState.damageBuckets.monster) localState.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                    if (isCrit) {
                        localState.damageBuckets.monster.crit += damageDealt;
                    } else {
                        localState.damageBuckets.monster.damage += damageDealt;
                    }
                }
                
                // NOUVEAU : Logique de génération des Doublons d'Or pour le Flibustier
                if (hero instanceof Flibustier) {
                    if (isCrit) {
                        hero.addDoubloon();
                        localState.ui.heroesNeedUpdate = true;
                    }
                    if (hero.hasUniqueEffect('DOUBLOON_PISTOL') && Math.random() < 0.10) {
                        hero.addDoubloon();
                        localState.ui.heroesNeedUpdate = true;
                    }
                }
            }
        }
    });
}

function handleMonsterAttack(dt) {
    // ... (logique de l'attaque du monstre inchangée)
    const monster = localState.activeMonster;
    monster.attackTimer += dt;
    const monsterAttackCooldown = 1 / (monster.attackSpeed || monster.baseDefinition.baseAttackSpeed);

    if (monster.attackTimer >= monsterAttackCooldown) {
        monster.attackTimer -= monsterAttackCooldown;
        const fightingHeroes = localState.heroes.filter(hero => hero.isFighting());
        if (fightingHeroes.length === 0) return;

        const dynamicArmorConstant = ARMOR_CONSTANT * Math.pow(ARMOR_DECAY_FACTOR, localState.dungeonFloor - 1);
        const protector = localState.heroes.find(h => h instanceof Protector && h.isFighting());
        const monsterCount = (monster instanceof MonsterGroup) ? monster.currentCount : 1;
        const damagePerAttacker = (monster instanceof MonsterGroup) ? monster.baseDefinition.baseDamage : monster.damage;

        for (let i = 0; i < monsterCount; i++) {
            const targetHeroIndex = Math.floor(i / ENGAGEMENT_LIMIT);
            if (targetHeroIndex >= fightingHeroes.length) continue;

            let originalTarget = fightingHeroes[targetHeroIndex];
            let targetHero = originalTarget;
            let isIntercepted = false;

            if (protector && originalTarget.id !== protector.id && (originalTarget.hp / originalTarget.maxHp) < protector.definition.interceptionThreshold && protector.interceptionTimer <= 0) {
                isIntercepted = true;
                protector.interceptionTimer = protector.definition.interceptionCooldown;
                protector.history.logEvent(`Intercepte une attaque pour ${originalTarget.name} !`, 'buff');
                localEventBus.emit('flavor_text_triggered', { text: 'INTERCEPTION !', targetId: protector.id, type: 'defense-text' });
                targetHero = protector;
            }
            
            const damageReduction = targetHero.armor / (targetHero.armor + dynamicArmorConstant);
            let finalDamage = damagePerAttacker * (1 - damageReduction);
            
            if (isIntercepted) {
                finalDamage *= (1 - protector.definition.interceptionDamageReduction);
            }

            targetHero.history.recordDamageMitigated(damagePerAttacker - finalDamage);
            
            let damageResult;
            if (targetHero instanceof Duelist) {
                damageResult = targetHero.takeDamage(finalDamage, localEventBus, damagePerAttacker);
            } else {
                damageResult = targetHero.takeDamage(finalDamage);
            }
            
            if (isIntercepted) {
                protector.history.recordInterceptedDamage(damageResult.damageTaken);
            }
            
            localEventBus.emit('hero_took_damage', { hero: targetHero, damage: damageResult.damageTaken });

            if (damageResult.statusChanged && targetHero.status === 'recovering') {
                localEventBus.emit('ally_defeated', { defeatedHero: targetHero, party: fightingHeroes });
            }
            
            if (targetHero.thorns > 0 && damageResult.damageTaken > 0) {
                let thornsDamage = targetHero.thorns;
                thornsDamage *= (1 + ((targetHero.damagePercent || 0) / 100)); 
                monster.takeDamage(thornsDamage);
                targetHero.history.logEvent(`Épines (${Math.round(thornsDamage)} dégâts)`, 'thorns');
                targetHero.history.recordDamageDealt(thornsDamage, 'thorns');
                if (!localState.damageBuckets.monster) {
                    localState.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                }
                localState.damageBuckets.monster.damage += thornsDamage;
            }
            if (damageResult.counterAttackDmg > 0) {
                targetHero.history.recordDamageDealt(damageResult.counterAttackDmg, 'riposte');
                monster.takeDamage(damageResult.counterAttackDmg);
            }
            if (damageResult.parryDmg > 0) {
                targetHero.history.recordDamageDealt(damageResult.parryDmg, 'riposte');
                monster.takeDamage(damageResult.parryDmg);
            }
            
            if (!localState.damageBuckets[targetHero.id]) localState.damageBuckets[targetHero.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
            localState.damageBuckets[targetHero.id].damage += damageResult.damageTaken;
        }
    }
}

function handleBossAura(boss, dt) {
    // ... (logique de l'aura du boss inchangée)
    boss.auraTimer += dt;

    if (boss.auraTimer >= boss.auraTickRate) {
        boss.auraTimer -= boss.auraTickRate;
        const fightingHeroes = localState.heroes.filter(hero => hero.isFighting());
        const dynamicArmorConstant = ARMOR_CONSTANT * Math.pow(ARMOR_DECAY_FACTOR, localState.dungeonFloor - 1);

        fightingHeroes.forEach(hero => {
            const damageReduction = hero.armor / (hero.armor + dynamicArmorConstant);
            const finalDamage = boss.auraDamage * (1 - damageReduction);
            hero.history.recordDamageMitigated(boss.auraDamage - finalDamage);

            let damageResult;
            if (hero instanceof Duelist) {
                damageResult = hero.takeDamage(finalDamage, localEventBus, boss.auraDamage);
            } else {
                damageResult = hero.takeDamage(finalDamage);
            }
            
            if (!localState.damageBuckets[hero.id]) {
                localState.damageBuckets[hero.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
            }
            localState.damageBuckets[hero.id].damage += damageResult.damageTaken;

            if (damageResult.statusChanged && hero.status === 'recovering') {
                localEventBus.emit('ally_defeated', { defeatedHero: hero, party: fightingHeroes });
            }
        });
    }
}

/**
 * NOUVEAU : Gère la génération de doublons à la mort d'un monstre.
 */
function onMonsterDefeated() {
    localState.heroes.forEach(hero => {
        if (hero instanceof Flibustier && hero.isFighting()) {
            hero.addDoubloon();
            localState.ui.heroesNeedUpdate = true;
        }
    });
}

export const CombatManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;

        eventBus.on('ui_monster_clicked', () => {
            if (localState.activeMonster && localState.activeMonster.isAlive()) {
                localState.activeMonster.takeDamage(PLAYER_CLICK_DAMAGE);
                if (!localState.damageBuckets.monster) {
                    localState.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                }
                localState.damageBuckets.monster.damage += PLAYER_CLICK_DAMAGE;
            }
        });

        // NOUVEAU : Écouteur pour la mort d'un monstre
        eventBus.on('monster_defeated', onMonsterDefeated);
    },
    update
};
