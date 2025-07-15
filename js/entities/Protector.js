// js/entities/Protector.js

import { Hero } from './Hero.js';

export class Protector extends Hero {
    constructor(heroDefinition) {
        super(heroDefinition);

        // Timer pour le bouclier de zone
        this.aoeShieldTimer = this.definition.aoeShieldCooldown;
        // Timer pour la compétence d'interception
        this.interceptionTimer = 0;

        this.attackCycleInstance = 0;
        this.attackCycleCooldown = 0;
        this.dpsReferenceValueA = 0;
        this.beamInstanceTimer = 0;
    }

    update(state, dt, eventBus) {
        super.update(state, dt, eventBus);

        if (!this.isFighting()) return;

        // Logique du bouclier de zone
        this.aoeShieldTimer -= dt;
        if (this.aoeShieldTimer <= 0) {
            this.aoeShieldTimer = this.definition.aoeShieldCooldown;
            const shieldValue = this.definition.aoeShieldValue + (this.intelligence * 0.5);
            state.heroes.forEach(hero => {
                if (hero.isFighting()) {
                    hero.buffs.applyShield(shieldValue, 5, eventBus);
                }
            });
            this.history.logEvent(`Lance 'Don de Vitalité' sur le groupe.`, 'buff');
            // NOUVEAU : Enregistre les boucliers donnés
            this.history.recordShieldsGiven(shieldValue * state.heroes.filter(h => h.isFighting()).length); // Estime la somme des boucliers donnés
            state.ui.heroesNeedUpdate = true;
        }
        
        // Logique de l'interception
        if (this.interceptionTimer > 0) {
            this.interceptionTimer -= dt;
        }
    }

    takeDamage(amount) {
        const result = super.takeDamage(amount);
        if (result.statusChanged && this.status === 'recovering') {
            this.attackCycleInstance = 0;
            this.attackCycleCooldown = 0;
            this.dpsReferenceValueA = 0;
            this.beamInstanceTimer = 0;
        }
        return result;
    }
}
