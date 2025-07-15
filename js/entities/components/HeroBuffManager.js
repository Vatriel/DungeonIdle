// js/entities/components/HeroBuffManager.js
// Ce module gère les buffs, débuffs et boucliers pour un héros.

export class HeroBuffManager {
    constructor(hero) {
        this.hero = hero; // Référence au héros parent
        this.activeBuffs = [];
        this.activeShields = [];
        this.shieldHp = 0;
    }

    /**
     * Met à jour la durée des buffs et des boucliers.
     * @param {number} dt - Le delta time.
     * @returns {boolean} - Vrai si un buff ou un bouclier a expiré, nécessitant un recalcul des stats.
     */
    update(dt) {
        let statsNeedRecalc = false;

        for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
            const buff = this.activeBuffs[i];
            buff.duration -= dt;
            if (buff.duration <= 0) {
                this.activeBuffs.splice(i, 1);
                statsNeedRecalc = true;
            }
        }
        
        let shieldChanged = false;
        for (let i = this.activeShields.length - 1; i >= 0; i--) {
            this.activeShields[i].duration -= dt;
            if (this.activeShields[i].duration <= 0) {
                this.activeShields.splice(i, 1);
                shieldChanged = true;
            }
        }

        if (shieldChanged) {
            this.recalculateShieldHp();
        }

        return statsNeedRecalc || shieldChanged;
    }

    /**
     * Ajoute un nouveau buff à la liste des buffs actifs.
     * @param {object} buff - L'objet buff à ajouter.
     */
    addBuff(buff) {
        this.activeBuffs.push(buff);
        this.hero.history.logEvent(`Reçoit l'effet '${buff.name}'`, 'buff');
    }

    /**
     * Applique un bouclier au héros.
     * @param {number} amount - La valeur de base du bouclier.
     * @param {number} duration - La durée du bouclier.
     * @param {EventBus} eventBus - Pour émettre des événements visuels.
     */
    applyShield(amount, duration, eventBus) {
        const finalAmount = amount * (1 + (this.hero.shieldPotency / 100));
        this.activeShields.push({ value: finalAmount, duration: duration });
        this.recalculateShieldHp();
        if (eventBus) {
            eventBus.emit('shield_applied', { hero: this.hero, amount: finalAmount });
        }
    }

    /**
     * Recalcule la valeur totale des points de vie du bouclier.
     */
    recalculateShieldHp() {
        this.shieldHp = this.activeShields.reduce((sum, shield) => sum + shield.value, 0);
    }

    /**
     * Renvoie un objet contenant la somme de tous les bonus de statistiques des buffs actifs.
     * @returns {object} - Un objet avec les bonus de stats.
     */
    getBonuses() {
        const bonuses = {};
        this.activeBuffs.forEach(buff => {
            if (bonuses[buff.stat] === undefined) {
                bonuses[buff.stat] = 0;
            }
            bonuses[buff.stat] += buff.value;
        });
        return bonuses;
    }

    /**
     * Consomme une partie des dégâts avec le bouclier.
     * @param {number} damageAmount - Le montant des dégâts entrants.
     * @returns {number} - Le montant des dégâts restants après absorption.
     */
    absorbDamage(damageAmount) {
        if (this.shieldHp <= 0) {
            return damageAmount;
        }

        const damageAbsorbed = Math.min(this.shieldHp, damageAmount);
        this.shieldHp -= damageAbsorbed;
        const damageRemaining = damageAmount - damageAbsorbed;
        
        this.hero.history.recordShieldAbsorption(damageAbsorbed);
        
        this.recalculateShieldHp();
        return damageRemaining;
    }

    /**
     * Récupère les données à sauvegarder pour ce manager.
     * @returns {object}
     */
    getSaveData() {
        return {
            activeBuffs: this.activeBuffs,
            // Les boucliers ne sont généralement pas sauvegardés car ils sont temporaires en combat.
        };
    }

    /**
     * Charge les données depuis une sauvegarde.
     * @param {object} data - Les données à charger.
     */
    loadSaveData(data) {
        if (data) {
            this.activeBuffs = data.activeBuffs || [];
        }
    }
}
