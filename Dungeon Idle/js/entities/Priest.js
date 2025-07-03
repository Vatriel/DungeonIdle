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
     * @param {object} state - L'état global du jeu.
     * @param {number} dt - Le delta time.
     * @param {EventBus} eventBus - Le bus d'événements pour la communication.
     */
    // MODIFIÉ : On reçoit l'état global (state) au lieu de juste la "party"
    update(state, dt, eventBus) {
        // On appelle d'abord la méthode update du parent (pour gérer les durées des buffs)
        // Note : La méthode parente est un peu redondante maintenant, mais on la laisse pour la gestion des buffs sur le prêtre lui-même.
        super.update(state, dt, eventBus);

        if (!this.isFighting()) return;

        // --- Logique de Soin ---
        this.performHeal(state.heroes, dt, state); // MODIFIÉ : On passe l'état global

        // --- Logique de Buff ---
        this.buffCooldown -= dt;
        if (this.buffCooldown <= 0 && this._statsCache.finalBuffChance > 0) {
            this.applyBuff(state.heroes);
            // Le cooldown est basé sur la chance : 1 / chance = temps moyen entre les buffs
            this.buffCooldown = 1 / this._statsCache.finalBuffChance;
        }
    }

    /**
     * Trouve l'allié le plus blessé et lui applique un soin.
     * MODIFIÉ : Utilise maintenant les "damageBuckets" pour regrouper les textes de soin.
     */
    performHeal(party, dt, state) {
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
                const result = target.regenerate(healAmount); // regenerate retourne un objet
                const healedAmount = result.healedAmount;
                
                // Si le statut a changé (ex: de 'recovering' à 'fighting'), on force une mise à jour de l'UI
                if (result.statusChanged) {
                    state.ui.heroesNeedUpdate = true;
                }

                // NOUVEAU : On ajoute le soin au "seau" de la cible pour regrouper l'affichage
                if (healedAmount > 0) {
                    if (!state.damageBuckets[target.id]) {
                        state.damageBuckets[target.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                    }
                    // On s'assure que la propriété heal existe avant d'ajouter
                    state.damageBuckets[target.id].heal = (state.damageBuckets[target.id].heal || 0) + healedAmount;
                }
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
