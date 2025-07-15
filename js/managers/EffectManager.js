// js/managers/EffectManager.js

import { Flibustier } from '../entities/Flibustier.js'; // NOUVEAU : Import du Flibustier

let localState = null;
let localEventBus = null;

/**
 * Applies a bleed status effect to a target.
 * @param {object} target - The monster to apply the effect to.
 * @param {number} damagePerSecond - Damage over time.
 * @param {number} duration - Duration of the effect.
 */
function applyBleed(target, damagePerSecond, duration) {
    target.activeStatusEffects.push({
        id: 'bleed',
        damagePerSecond: damagePerSecond,
        duration: duration,
        remainingDuration: duration,
    });
    localEventBus.emit('notification_requested', { message: `${target.name} saigne !`, type: 'error' });
}

/**
 * NOUVEAU : Applies a poison status effect to a target.
 * @param {object} target - The monster to apply the effect to.
 * @param {number} damagePerSecond - Damage over time.
 * @param {number} duration - Duration of the effect.
 */
function applyPoison(target, damagePerSecond, duration) {
    target.activeStatusEffects.push({
        id: 'poison',
        damagePerSecond: damagePerSecond,
        duration: duration,
        remainingDuration: duration,
    });
    localEventBus.emit('notification_requested', { message: `${target.name} est empoisonné !`, type: 'success' });
}

/**
 * Handles logic when a hero deals a critical strike.
 * @param {object} data - Event data { hero, target, damage }.
 */
function onHeroDealtCriticalStrike(data) {
    const { hero, target, damage } = data;
    
    // Dagger of the Opportunist effect
    if (hero.hasUniqueEffect('OPPORTUNIST_DAGGER')) {
        const bleedDamage = (damage * 1.5) / 5;
        applyBleed(target, bleedDamage, 5);
    }

    // NOUVEAU : Flibustier's "Lames Enduites" passive
    if (hero instanceof Flibustier) {
        let poisonDamage = (hero.dexterity + hero.intelligence) * 0.2; // 20% of Dex+Int per second
        let poisonDuration = 5;
        // Synergy with unique item
        if (hero.hasUniqueEffect('TOAD_VENOM_VIAL')) {
            poisonDamage *= 1.25;
            poisonDuration += 3;
        }
        applyPoison(target, poisonDamage, poisonDuration);
    }
}

function onAllyDefeated(data) {
    const { party } = data;
    party.forEach(hero => {
        if (hero.hasUniqueEffect('VENGEANCE_HELM')) {
            hero.buffs.addBuff({
                id: 'vengeance_buff',
                name: 'Vengeance',
                stat: 'damagePercent',
                value: 100,
                duration: 10,
                maxDuration: 10,
            });
            hero.recalculateStats(localState);
            localState.ui.heroesNeedUpdate = true;
            localEventBus.emit('notification_requested', { message: `${hero.name} est enragé par la Vengeance !`, type: 'success' });
        }
    });
}

function onMonsterDefeated(data) {
    const bearer = localState.heroes.find(hero => 
        hero.isFighting() && hero.hasUniqueEffect('BLOODTHIRSTY_ARMOR')
    );

    if (bearer) {
        const healAmount = bearer.maxHp * 0.08;
        bearer.regenerate(healAmount, 'heal', localEventBus, localState);
        bearer.history.logEvent(`S'abreuve de la défaite ennemie (+${Math.round(healAmount)} PV)`, 'heal');
    }
}

function handleStoicGuardian(dt) {
    const bearers = localState.heroes.filter(h => h.isFighting() && h.hasUniqueEffect('STOIC_GUARDIAN_GAUNTLETS'));
    if (bearers.length === 0) return;

    const fightingAllies = localState.heroes.filter(h => h.isFighting());
    if (fightingAllies.length < 2) return;

    bearers.forEach(bearer => {
        let weakestAlly = null;
        let lowestHpPercent = 1;

        fightingAllies.forEach(ally => {
            if (ally.id !== bearer.id) {
                const hpPercent = ally.hp / ally.maxHp;
                if (hpPercent < lowestHpPercent) {
                    lowestHpPercent = hpPercent;
                    weakestAlly = ally;
                }
            }
        });

        if (weakestAlly) {
            const healAmount = (bearer.hpRegen * 0.30) * dt;
            if (healAmount > 0) {
                const result = weakestAlly.regenerate(healAmount);
                const healedAmount = result.healedAmount;

                if (healedAmount > 0) {
                    bearer.history.historyBucket.healingDone += healedAmount;
                    weakestAlly.history.historyBucket.healingReceived += healedAmount;

                    if (!localState.damageBuckets[weakestAlly.id]) {
                        localState.damageBuckets[weakestAlly.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                    }
                    localState.damageBuckets[weakestAlly.id].heal += healedAmount;
                }
            }
        }
    });
}

function init(eventBus, state) {
    localState = state;
    localEventBus = eventBus;
    eventBus.on('hero_dealt_critical_strike', onHeroDealtCriticalStrike);
    eventBus.on('ally_defeated', onAllyDefeated);
    eventBus.on('monster_defeated', onMonsterDefeated);
}

function update(dt) {
    // Handle status effects on the current monster
    if (localState.activeMonster) {
        for (let i = localState.activeMonster.activeStatusEffects.length - 1; i >= 0; i--) {
            const effect = localState.activeMonster.activeStatusEffects[i];
            effect.remainingDuration -= dt;

            if (effect.damagePerSecond > 0) {
                const damageToDeal = effect.damagePerSecond * dt;
                localState.activeMonster.takeDamage(damageToDeal);
            }

            if (effect.remainingDuration <= 0) {
                localState.activeMonster.activeStatusEffects.splice(i, 1);
            }
        }
    }

    // Handle hero-specific passive effects that need updates
    localState.heroes.forEach(hero => {
        // NOUVEAU : Handle Davy Jones' Chest life drain
        if (hero.hasUniqueEffect('DAVY_JONES_CHEST') && hero.isFighting()) {
            const drainAmount = hero.maxHp * 0.01 * dt; // 1% of max HP per second
            hero.takeDamage(drainAmount); // This damage bypasses some things, but takeDamage is fine for now
            // We can emit a specific floating text for this later if needed
        }
    });

    handleStoicGuardian(dt);
}

export const EffectManager = {
    init,
    update,
};
