// js/entities/Priest.js

import { Hero } from './Hero.js';

// Liste des buffs que le prêtre peut appliquer.
const POSSIBLE_BUFFS = [
    { stat: 'dpsPercent', value: 10, name: 'Puissance' },
    { stat: 'armor', value: 50, name: 'Protection' },
    { stat: 'critChance', value: 5, name: 'Précision' }
];

export class Priest extends Hero {
    constructor(heroDefinition) {
        // Appelle le constructeur de la classe Hero
        super(heroDefinition);

        // Le prêtre a sa propre logique de "cooldown" pour ses buffs
        this.buffCooldown = 0;
    }

    /**
     * Surcharge la méthode de mise à jour du Héros pour y ajouter
     * la logique spécifique du Prêtre (soin et buffs).
     * @param {Array<Hero>} party - La liste de tous les héros alliés.
     * @param {number} dt - Le delta time.
     * @param {EventBus} eventBus - Le bus d'événements pour la communication.
     */
    update(party, dt, eventBus) {
        // On appelle d'abord la méthode update du parent (pour gérer les durées des buffs)
        super.update(party, dt, eventBus);

        if (!this.isFighting()) return;

        // --- Logique de Soin ---
        this.performHeal(party, dt, eventBus);

        // --- Logique de Buff ---
        this.buffCooldown -= dt;
        if (this.buffCooldown <= 0) {
            this.applyBuff(party);
            // Le cooldown est basé sur la chance : 1 / chance = temps moyen entre les buffs
            this.buffCooldown = 1 / this._statsCache.finalBuffChance;
        }
    }

    /**
     * Trouve l'allié le plus blessé et lui applique un soin.
     */
    performHeal(party, dt, eventBus) {
        let target = null;
        let lowestHpPercent = 1;

        // Trouve l'allié avec le % de vie le plus bas
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
                const healedAmount = target.regenerate(healAmount); // regenerate retourne le montant soigné
                eventBus.emit('hero_healed', { targetId: target.id, amount: healedAmount });
            }
        }
    }

    /**
     * Choisit un allié et un buff au hasard et l'applique.
     */
    applyBuff(party) {
        const fightingAllies = party.filter(h => h.isFighting());
        if (fightingAllies.length === 0) return;

        const target = fightingAllies[Math.floor(Math.random() * fightingAllies.length)];
        const buffTemplate = POSSIBLE_BUFFS[Math.floor(Math.random() * POSSIBLE_BUFFS.length)];

        // Calcule la puissance et la durée réelles du buff
        const finalPotency = buffTemplate.value * (1 + (this._statsCache.finalBuffPotency || 0) / 100);
        const finalDuration = this._statsCache.finalBuffDuration || 5;

        const newBuff = {
            id: `buff_${Date.now()}_${Math.random()}`,
            name: buffTemplate.name,
            stat: buffTemplate.stat,
            value: finalPotency,
            duration: finalDuration,
            maxDuration: finalDuration,
        };

        target.addBuff(newBuff);
    }

    /**
     * Surcharge le recalcul des stats pour ajouter celles du Prêtre
     * et garantir que le DPS est toujours à zéro.
     */
    _recalculateStats(equipmentOverride = this.equipment) {
        // Appelle la méthode parente pour obtenir les stats de base (DPS, armure, etc.)
        const calculatedStats = super._recalculateStats(equipmentOverride);

        // --- Logique Spécifique au Prêtre ---
        const bonuses = this._getBonusesFromEquipment(equipmentOverride);

        // Ajoute les nouvelles stats au calcul
        calculatedStats.finalHealPower = (this.definition.baseHealPerSecond + (bonuses.healPower || 0)) * (1 + (bonuses.healPercent || 0) / 100);
        calculatedStats.finalBuffChance = this.definition.baseBuffChance; // Pourrait être augmenté par des objets
        calculatedStats.finalBuffPotency = bonuses.buffPotency || 0;
        calculatedStats.finalBuffDuration = this.definition.baseBuffDuration * (1 + (bonuses.buffDuration || 0) / 100);

        // --- VERROU DE SÉCURITÉ ---
        // On s'assure que le DPS est TOUJOURS zéro, quoi qu'il arrive.
        calculatedStats.dps = 0;

        // Si ce n'est pas une simulation, on met à jour le cache principal
        if (equipmentOverride === this.equipment) {
            this._statsCache = calculatedStats;
        }

        return calculatedStats;
    }
}
