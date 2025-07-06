// js/entities/Duelist.js

import { Hero } from './Hero.js';

const RIPOSTE_OUTCOMES = {
    COUNTER_ATTACK: 0.15,
    PARRY: 0.35,
    DODGE: 0.50
};

export class Duelist extends Hero {
    constructor(heroDefinition) {
        super(heroDefinition);
        this.baseRiposteChance = heroDefinition.baseRiposteChance || 0.05;
    }

    _recalculateStats(state, equipmentOverride = this.equipment) {
        const calculatedStats = super._recalculateStats(state, equipmentOverride);
        const bonuses = this._getBonusesFromEquipment(equipmentOverride);
        const riposteBonus = bonuses.riposteChance || 0;
        calculatedStats.riposteChance = this.baseRiposteChance + (riposteBonus / 100);

        if (equipmentOverride === this.equipment) {
            this._statsCache = calculatedStats;
        }

        return calculatedStats;
    }

    takeDamage(amount, eventBus) {
        if (!this.isFighting()) {
            return super.takeDamage(amount);
        }

        if (Math.random() < this.riposteChance) {
            const outcomeRoll = Math.random();
            
            if (outcomeRoll < RIPOSTE_OUTCOMES.COUNTER_ATTACK) {
                // MODIFIÉ : Émission de l'événement pour le texte "CONTRE !"
                eventBus.emit('flavor_text_triggered', { text: 'CONTRE !', targetId: this.id, type: 'defense-text' });
                return {
                    damageTaken: 0,
                    counterAttackDmg: this.damage,
                    parryDmg: 0
                };
            } else if (outcomeRoll < RIPOSTE_OUTCOMES.COUNTER_ATTACK + RIPOSTE_OUTCOMES.PARRY) {
                // MODIFIÉ : Émission de l'événement pour le texte "PARADE !"
                eventBus.emit('flavor_text_triggered', { text: 'PARADE !', targetId: this.id, type: 'defense-text' });
                return {
                    damageTaken: 0,
                    counterAttackDmg: 0,
                    parryDmg: amount * 0.5
                };
            } else {
                // MODIFIÉ : Émission de l'événement pour le texte "ESQUIVE !"
                eventBus.emit('flavor_text_triggered', { text: 'ESQUIVE !', targetId: this.id, type: 'defense-text' });
                return {
                    damageTaken: 0,
                    counterAttackDmg: 0,
                    parryDmg: 0
                };
            }
        }

        const statusChanged = super.takeDamage(amount);
        return {
            damageTaken: amount,
            counterAttackDmg: 0,
            parryDmg: 0,
            statusChanged: statusChanged
        };
    }
}
