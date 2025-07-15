// js/entities/Duelist.js

import { Hero } from './Hero.js';
import { StatCalculator } from './components/StatCalculator.js';

const RIPOSTE_OUTCOME_WEIGHTS_BASE = {
    DODGE: 1500,
    PARRY: 1300,
    COUNTER_ATTACK: 100
};

const RIPOSTE_OUTCOME_WEIGHTS_GROWTH = {
    DODGE: 1,
    PARRY: 2,
    COUNTER_ATTACK: 3
};

export class Duelist extends Hero {
    constructor(heroDefinition) {
        super(heroDefinition);
        this.baseRiposteChance = heroDefinition.baseRiposteChance || 0.05;
    }

    get riposteChance() { return this._statsCache.riposteChance || 0; }

    _calculateRiposteOutcomeProbabilities(riposteValue) {
        const dodgeWeight = RIPOSTE_OUTCOME_WEIGHTS_BASE.DODGE + (riposteValue * RIPOSTE_OUTCOME_WEIGHTS_GROWTH.DODGE);
        const parryWeight = RIPOSTE_OUTCOME_WEIGHTS_BASE.PARRY + (riposteValue * RIPOSTE_OUTCOME_WEIGHTS_GROWTH.PARRY);
        const counterAttackWeight = RIPOSTE_OUTCOME_WEIGHTS_BASE.COUNTER_ATTACK + (riposteValue * RIPOSTE_OUTCOME_WEIGHTS_GROWTH.COUNTER_ATTACK);

        const totalWeight = dodgeWeight + parryWeight + counterAttackWeight;

        return {
            DODGE: dodgeWeight / totalWeight,
            PARRY: parryWeight / totalWeight,
            COUNTER_ATTACK: counterAttackWeight / totalWeight
        };
    }

    recalculateStats(state, equipmentOverride = this.equipment) {
        const calculatedStats = StatCalculator.calculateFinalStats(this, state, equipmentOverride);
        const bonuses = StatCalculator.getBonusesFromEquipment(equipmentOverride);
        const riposteBonus = bonuses.riposteChance || 0;
        
        const totalRiposteValue = (this.baseRiposteChance * 100) + riposteBonus;
        calculatedStats.riposteChance = totalRiposteValue / (totalRiposteValue + 100);

        this._statsCache = calculatedStats;
    }

    takeDamage(amount, eventBus, rawDamage) {
        if (!this.isFighting()) {
            return super.takeDamage(amount);
        }

        const outcomeProbs = this._calculateRiposteOutcomeProbabilities(this.riposteChance * 100);

        if (Math.random() < this.riposteChance) {
            const outcomeRoll = Math.random();
            const avoided = rawDamage || amount;
            
            // --- DÉBUT DE LA CORRECTION ---
            if (outcomeRoll < outcomeProbs.COUNTER_ATTACK) {
                eventBus.emit('flavor_text_triggered', { text: 'CONTRE !', targetId: this.id, type: 'defense-text' });
                this.history.logEvent(`Contre-attaque ! (${Math.round(this.damage)} dégâts)`, 'riposte');
                this.history.recordDamageAvoided(avoided);
                return {
                    damageTaken: 0,
                    counterAttackDmg: this.damage,
                    parryDmg: 0
                };
            } else if (outcomeRoll < outcomeProbs.COUNTER_ATTACK + outcomeProbs.PARRY) {
                eventBus.emit('flavor_text_triggered', { text: 'PARADE !', targetId: this.id, type: 'defense-text' });
                this.history.logEvent(`Parade ! (${Math.round(amount * 0.5)} dégâts renvoyés)`, 'riposte');
                this.history.recordDamageAvoided(avoided);
                return {
                    damageTaken: 0,
                    counterAttackDmg: 0,
                    parryDmg: amount * 0.5
                };
            } else {
                eventBus.emit('flavor_text_triggered', { text: 'ESQUIVE !', targetId: this.id, type: 'defense-text' });
                this.history.logEvent(`Esquive ! (${Math.round(avoided)} dégâts évités)`, 'riposte');
                this.history.recordDamageAvoided(avoided);
                return {
                    damageTaken: 0,
                    counterAttackDmg: 0,
                    parryDmg: 0
                };
            }
            // --- FIN DE LA CORRECTION ---
        }

        const damageResult = super.takeDamage(amount); 
        return {
            damageTaken: damageResult.damageTaken,
            counterAttackDmg: 0,
            parryDmg: 0,
            statusChanged: damageResult.statusChanged
        };
    }
}
