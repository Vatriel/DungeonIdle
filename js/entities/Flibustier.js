// js/entities/Flibustier.js

import { Hero } from './Hero.js';
import { StatCalculator } from './components/StatCalculator.js';

const MAX_DOUBLOONS = 8;

// List of possible sea shanties (buffs)
const SEA_SHANTIES = [
    { id: 'shanty_gold', name: "Gigue du Coffre au Trésor", stat: 'goldFind', value: 50, duration: 15 },
    { id: 'shanty_speed', name: "Hurlement de la Tempête", stat: 'attackSpeedPercent', value: 20, duration: 10 },
    { id: 'shanty_lifesteal', name: "Ballade du Marin Ivre", stat: 'lifeSteal', value: 5, duration: 12 }
];

export class Flibustier extends Hero {
    constructor(heroDefinition) {
        super(heroDefinition);
        this.doubloons = 0;
    }

    /**
     * Adds a doubloon to the Flibustier's count, up to the maximum.
     */
    addDoubloon() {
        if (this.doubloons < MAX_DOUBLOONS) {
            this.doubloons++;
            // TODO: Add visual feedback in HeroUI
        }
    }

    /**
     * Main update loop for the Flibustier.
     * Checks for the "Pillage ou Poudre !" skill trigger.
     * @param {object} state - The global game state.
     * @param {number} dt - The delta time.
     * @param {EventBus} eventBus - The global event bus.
     */
    update(state, dt, eventBus) {
        super.update(state, dt, eventBus);

        if (this.doubloons >= MAX_DOUBLOONS) {
            this.pillageOrPowder(state, eventBus);
        }
    }

    /**
     * Triggers the special skill, consuming all doubloons for a random effect.
     * @param {object} state - The global game state.
     * @param {EventBus} eventBus - The global event bus.
     */
    pillageOrPowder(state, eventBus) {
        this.doubloons = 0; // Consume doubloons
        const roll = Math.random();

        if (roll < 0.5) { // 50% chance for a damage effect
            this.performDamageSkill(state, eventBus);
        } else { // 50% chance for a sea shanty
            this.performSeaShanty(state, eventBus);
        }
         state.ui.heroesNeedUpdate = true; // Update UI to show doubloons reset
    }

    /**
     * Performs a random damage-based skill.
     * @param {object} state - The global game state.
     * @param {EventBus} eventBus - The global event bus.
     */
    performDamageSkill(state, eventBus) {
        const damageRoll = Math.random();
        const monster = state.activeMonster;
        if (!monster || !monster.isAlive()) return;

        this.history.logEvent(`Déclenche 'Pillage ou Poudre !'`, 'crit');

        if (damageRoll < 0.7) { // 70% chance for Buckshot (AoE)
            const damage = this.damage * 1.5; // Moderate damage
            // This is a simplified AoE, for a real one we'd need to target multiple enemies.
            // For now, it just hits the main target hard.
            monster.takeDamage(damage);
            this.history.recordDamageDealt(damage, 'crit');
            eventBus.emit('notification_requested', { message: `${this.name} tire une volée de mitraille !`, type: 'riposte' });

        } else { // 30% chance for Silver Bullet (Single Target)
            const damage = this.damage * 4; // Huge damage
            monster.takeDamage(damage);
            this.history.recordDamageDealt(damage, 'crit');
            eventBus.emit('notification_requested', { message: `${this.name} tire une Balle en Argent !`, type: 'crit' });
        }
    }

    /**
     * Performs a random sea shanty, buffing the entire party.
     * @param {object} state - The global game state.
     * @param {EventBus} eventBus - The global event bus.
     */
    performSeaShanty(state, eventBus) {
        const shanty = SEA_SHANTIES[Math.floor(Math.random() * SEA_SHANTIES.length)];
        this.history.logEvent(`Entonne '${shanty.name}'`, 'buff');
        eventBus.emit('notification_requested', { message: `${this.name} chante : ${shanty.name} !`, type: 'success' });

        // Apply buff to all fighting heroes
        state.heroes.forEach(hero => {
            if (hero.isFighting()) {
                let buffValue = shanty.value;
                // Unique item synergy
                if(this.hasUniqueEffect('VETERAN_ACCORDION')) {
                    buffValue *= 1.40;
                }

                hero.buffs.addBuff({
                    id: `${shanty.id}_${Date.now()}`,
                    name: shanty.name,
                    stat: shanty.stat,
                    value: buffValue,
                    duration: shanty.duration * (this.hasUniqueEffect('VETERAN_ACCORDION') ? 1.40 : 1),
                    maxDuration: shanty.duration * (this.hasUniqueEffect('VETERAN_ACCORDION') ? 1.40 : 1),
                });
                hero.recalculateStats(state);
            }
        });
    }

    /**
     * Overrides the default stat calculation to add custom mechanics.
     * @param {object} state - The global game state.
     * @param {object} equipmentOverride - Optional equipment to simulate.
     */
    recalculateStats(state, equipmentOverride = this.equipment) {
        // First, get the stats calculated by the standard method
        const calculatedStats = StatCalculator.calculateFinalStats(this, state, equipmentOverride);

        // --- "Fortune du Flibustier" Mechanic ---
        const goldBonusThreshold = 100000;
        let fortuneMultiplier = 1.0;

        // Unique item synergy
        const multiplierPerThreshold = this.hasUniqueEffect('PIRATE_KING_RING') ? 0.015 : 0.01;

        const bonusTiers = Math.floor(state.gold / goldBonusThreshold);
        fortuneMultiplier += bonusTiers * multiplierPerThreshold;

        calculatedStats.damage *= fortuneMultiplier;

        // --- "Davy Jones' Chest" Cursed Item ---
        if (this.hasUniqueEffect('DAVY_JONES_CHEST')) {
            calculatedStats.goldFind = (calculatedStats.goldFind || 0) + 1.0; // Add 100% gold find
            // The life drain effect will be handled in the CombatManager or a dedicated effect manager
        }

        // Store the final calculated stats in the cache
        this._statsCache = calculatedStats;
    }
}
