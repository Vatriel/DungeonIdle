// js/entities/components/HeroCombatHistory.js
// Ce module gère l'historique de combat et la journalisation pour un héros.

const HISTORY_LENGTH = 60;

export class HeroCombatHistory {
    constructor(hero) {
        this.hero = hero;
        this.log = [];

        this.damageDealt = Array(HISTORY_LENGTH).fill(0);
        this.damageDealtBreakdown = {
            normal: Array(HISTORY_LENGTH).fill(0),
            crit: Array(HISTORY_LENGTH).fill(0),
            riposte: Array(HISTORY_LENGTH).fill(0),
            thorns: Array(HISTORY_LENGTH).fill(0),
            beam: Array(HISTORY_LENGTH).fill(0)
        };
        this.damageTaken = Array(HISTORY_LENGTH).fill(0);
        this.damageMitigated = Array(HISTORY_LENGTH).fill(0);
        this.damageAvoided = Array(HISTORY_LENGTH).fill(0);
        this.healingDone = Array(HISTORY_LENGTH).fill(0);
        this.healingReceived = Array(HISTORY_LENGTH).fill(0);
        this.lifeStealHealing = Array(HISTORY_LENGTH).fill(0);
        this.hpHistory = Array(HISTORY_LENGTH).fill(0);
        this.shieldAbsorption = Array(HISTORY_LENGTH).fill(0);
        this.interceptedDamage = Array(HISTORY_LENGTH).fill(0);
        // NOUVEAU : Tableau pour les boucliers donnés
        this.shieldsGiven = Array(HISTORY_LENGTH).fill(0);
        
        this.historyBucket = this.resetBucket();
    }

    resetBucket() {
        return {
            damageDealt: { normal: 0, crit: 0, riposte: 0, thorns: 0, beam: 0 },
            damageTaken: 0,
            damageMitigated: 0,
            damageAvoided: 0,
            healingDone: 0,
            healingReceived: 0,
            lifeStealHealing: 0,
            shieldAbsorption: 0,
            interceptedDamage: 0,
            // NOUVEAU : Seau pour les boucliers donnés
            shieldsGiven: 0,
        };
    }

    logEvent(message, type) {
        this.log.push({ message, type, timestamp: Date.now() });
        if (this.log.length > 50) {
            this.log.shift();
        }
    }

    recordDamageDealt(amount, type = 'normal') { this.historyBucket.damageDealt[type] += amount; }
    recordDamageTaken(amount) { this.historyBucket.damageTaken += amount; }
    recordDamageMitigated(amount) { this.historyBucket.damageMitigated += amount; }
    recordDamageAvoided(amount) { this.historyBucket.damageAvoided += amount; }
    recordHealingDone(amount) { this.historyBucket.healingDone += amount; }
    recordHealingReceived(amount) { this.historyBucket.healingReceived += amount; }
    recordLifeStealHealing(amount) { this.historyBucket.lifeStealHealing += amount; }
    recordShieldAbsorption(amount) { this.historyBucket.shieldAbsorption += amount; }
    recordInterceptedDamage(amount) { this.historyBucket.interceptedDamage += amount; }
    // NOUVEAU : Méthode pour enregistrer les boucliers donnés
    recordShieldsGiven(amount) { this.historyBucket.shieldsGiven += amount; }


    collect() {
        const totalDamageDealt = Object.values(this.historyBucket.damageDealt).reduce((a, b) => a + b, 0);
        this.damageDealt.shift();
        this.damageDealt.push(totalDamageDealt);

        for (const type in this.historyBucket.damageDealt) {
            if (this.damageDealtBreakdown[type]) {
                this.damageDealtBreakdown[type].shift();
                this.damageDealtBreakdown[type].push(this.historyBucket.damageDealt[type]);
            }
        }

        this.damageTaken.shift();
        this.damageTaken.push(this.historyBucket.damageTaken);
        this.damageMitigated.shift();
        this.damageMitigated.push(this.historyBucket.damageMitigated);
        this.damageAvoided.shift();
        this.damageAvoided.push(this.historyBucket.damageAvoided);
        this.shieldAbsorption.shift();
        this.shieldAbsorption.push(this.historyBucket.shieldAbsorption);
        this.interceptedDamage.shift();
        this.interceptedDamage.push(this.historyBucket.interceptedDamage);

        this.healingDone.shift();
        this.healingDone.push(this.historyBucket.healingDone);
        this.healingReceived.shift();
        this.healingReceived.push(this.historyBucket.healingReceived);
        
        this.lifeStealHealing.shift();
        this.lifeStealHealing.push(this.historyBucket.lifeStealHealing);
        
        this.hpHistory.shift();
        this.hpHistory.push(this.hero.hp);

        // NOUVEAU : Collecte des données des boucliers donnés
        this.shieldsGiven.shift();
        this.shieldsGiven.push(this.historyBucket.shieldsGiven);

        this.historyBucket = this.resetBucket();
    }
}
