// js/entities/Priest.js

import { Hero } from './Hero.js';

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

        this.performHeal(state.heroes, dt, state);

        this.buffCooldown -= dt;
        if (this.buffCooldown <= 0 && this._statsCache.finalBuffChance > 0) {
            this.applyBuff(state, state.heroes); // MODIFIÉ : Passe l'état
            this.buffCooldown = 1 / this._statsCache.finalBuffChance;
        }
    }

    performHeal(party, dt, state) {
        let target = null;
        let lowestHpPercent = 1;

        party.forEach(hero => {
            if (hero.isFighting()) {
                const hpPercent = hero.hp / hero.maxHp;
                if (hpPercent < lowestHpPercent) {
                    lowestHpPercent = hpPercent;
                    target = hero;
                }
            }
        });

        if (target) {
            const healAmount = (this._statsCache.finalHealPower || 0) * dt;
            if (healAmount > 0) {
                const result = target.regenerate(healAmount);
                const healedAmount = result.healedAmount;
                
                if (result.statusChanged) {
                    state.ui.heroesNeedUpdate = true;
                }

                if (healedAmount > 0) {
                    if (!state.damageBuckets[target.id]) {
                        state.damageBuckets[target.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                    }
                    state.damageBuckets[target.id].heal = (state.damageBuckets[target.id].heal || 0) + healedAmount;
                }
            }
        }
    }

    applyBuff(state, party) { // MODIFIÉ : Passe l'état
        const fightingAllies = party.filter(h => h.isFighting());
        if (fightingAllies.length === 0) return;

        const target = fightingAllies[Math.floor(Math.random() * fightingAllies.length)];
        const buffTemplate = POSSIBLE_BUFFS[Math.floor(Math.random() * POSSIBLE_BUFFS.length)];

        const finalPotency = buffTemplate.value * (1 + (this._statsCache.finalBuffPotency || 0) / 100);
        const finalDuration = this.definition.baseBuffDuration * (1 + (this._statsCache.finalBuffDuration || 0) / 100);

        const newBuff = {
            id: `buff_${Date.now()}_${Math.random()}`,
            name: buffTemplate.name,
            stat: buffTemplate.stat,
            value: finalPotency,
            duration: finalDuration,
            maxDuration: finalDuration,
        };

        target.addBuff(state, newBuff); // MODIFIÉ : Passe l'état
    }

    _recalculateStats(state, equipmentOverride = this.equipment) {
        const calculatedStats = super._recalculateStats(state, equipmentOverride); // MODIFIÉ : Passe l'état

        const bonuses = this._getBonusesFromEquipment(equipmentOverride);

        calculatedStats.finalHealPower = (this.definition.baseHealPerSecond + (bonuses.healPower || 0)) * (1 + (bonuses.healPercent || 0) / 100);
        calculatedStats.finalBuffChance = this.definition.baseBuffChance; 
        calculatedStats.finalBuffPotency = bonuses.buffPotency || 0;
        calculatedStats.finalBuffDuration = this.definition.baseBuffDuration * (1 + (bonuses.buffDuration || 0) / 100);

        calculatedStats.damage = 0;

        if (equipmentOverride === this.equipment) {
            this._statsCache = calculatedStats;
        }

        return calculatedStats;
    }
}
