// js/entities/Priest.js

import { Hero } from './Hero.js';
import { StatCalculator } from './components/StatCalculator.js';

const POSSIBLE_BUFFS = [
    { stat: 'damagePercent', value: 10, name: 'Puissance' },
    { stat: 'armor', value: 50, name: 'Protection' },
    { stat: 'critChance', value: 5, name: 'Précision' }
];

export class Priest extends Hero {
    constructor(heroDefinition) {
        super(heroDefinition);
        this.buffCooldown = 0;
    }

    update(state, dt, eventBus) {
        super.update(state, dt, eventBus);

        if (!this.isFighting()) return;

        this.performHeal(state, dt);

        this.buffCooldown -= dt;
        if (this.buffCooldown <= 0 && this.finalBuffChance > 0) {
            this.applyBuff(state);
            this.buffCooldown = 1 / this.finalBuffChance;
        }
    }

    performHeal(state, dt) {
        let target = null;
        let lowestHpPercent = 1;

        state.heroes.forEach(hero => {
            if (hero.isFighting()) {
                const hpPercent = hero.hp / hero.maxHp;
                if (hpPercent < lowestHpPercent) {
                    lowestHpPercent = hpPercent;
                    target = hero;
                }
            }
        });

        if (target) {
            const healAmount = (this.finalHealPower || 0) * dt;
            if (healAmount > 0) {
                const result = target.regenerate(healAmount, 'heal', state.eventBus, state);
                const healedAmount = result.healedAmount;
                
                if (healedAmount > 0) {
                    // --- DÉBUT DE LA CORRECTION ---
                    this.history.recordHealingDone(healedAmount);
                    this.history.logEvent(`Soigne ${target.name} de ${Math.round(healedAmount)} HP.`, 'heal');
                    // --- FIN DE LA CORRECTION ---

                    if (this.hasUniqueEffect('SOUL_SIPHON_WAND') && state.activeMonster && state.activeMonster.isAlive()) {
                        const damageToDeal = healedAmount * 0.30;
                        state.activeMonster.takeDamage(damageToDeal);
                        
                        // --- DÉBUT DE LA CORRECTION ---
                        this.history.recordDamageDealt(damageToDeal, 'normal');
                        // --- FIN DE LA CORRECTION ---
                        if (!state.damageBuckets.monster) {
                            state.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                        }
                        state.damageBuckets.monster.damage += damageToDeal;
                    }
                }

                if (result.statusChanged) {
                    state.ui.heroesNeedUpdate = true;
                }
            }
        }
    }

    applyBuff(state) {
        const fightingAllies = state.heroes.filter(h => h.isFighting());
        if (fightingAllies.length === 0) return;

        const target = fightingAllies[Math.floor(Math.random() * fightingAllies.length)];
        const buffTemplate = POSSIBLE_BUFFS[Math.floor(Math.random() * POSSIBLE_BUFFS.length)];

        const finalPotency = buffTemplate.value * (1 + (this.finalBuffPotency || 0) / 100);
        const finalDuration = this.definition.baseBuffDuration * (1 + (this.finalBuffDuration || 0) / 100);

        const newBuff = {
            id: `buff_${Date.now()}_${Math.random()}`,
            name: buffTemplate.name,
            stat: buffTemplate.stat,
            value: finalPotency,
            duration: finalDuration,
            maxDuration: finalDuration,
        };

        target.buffs.addBuff(newBuff);
        target.recalculateStats(state); // Recalculate stats for the target
    }

    recalculateStats(state, equipmentOverride = this.equipment) {
        const calculatedStats = StatCalculator.calculateFinalStats(this, state, equipmentOverride);

        const bonuses = StatCalculator.getBonusesFromEquipment(equipmentOverride);

        calculatedStats.finalHealPower = (this.definition.baseHealPerSecond + (bonuses.healPower || 0)) * (1 + (bonuses.healPercent || 0) / 100);
        calculatedStats.finalBuffChance = this.definition.baseBuffChance; 
        calculatedStats.finalBuffPotency = bonuses.buffPotency || 0;
        calculatedStats.finalBuffDuration = this.definition.baseBuffDuration * (1 + (bonuses.buffDuration || 0) / 100);
        
        this._statsCache = calculatedStats;
    }

    // Getters pour les stats spécifiques au Prêtre
    get finalHealPower() { return this._statsCache.finalHealPower || 0; }
    get finalBuffChance() { return this._statsCache.finalBuffChance || 0; }
    get finalBuffPotency() { return this._statsCache.finalBuffPotency || 0; }
    get finalBuffDuration() { return this._statsCache.finalBuffDuration || 0; }
}
