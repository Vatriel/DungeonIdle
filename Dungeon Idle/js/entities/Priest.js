// js/entities/Priest.js

import { Hero } from './Hero.js';

// Définitions des buffs que le prêtre peut appliquer
const POSSIBLE_BUFFS = [
    { stat: 'damagePercent', value: 10, name: 'Puissance' },
    { stat: 'armor', value: 50, name: 'Protection' },
    { stat: 'critChance', value: 5, name: 'Précision' }
];

export class Priest extends Hero {
    constructor(heroDefinition) {
        super(heroDefinition);
        // Initialise le cooldown du buff
        this.buffCooldown = 0;
    }

    /**
     * Met à jour la logique spécifique du prêtre (soins et buffs).
     * @param {object} state - L'état global du jeu.
     * @param {number} dt - Le temps écoulé depuis la dernière frame.
     * @param {EventBus} eventBus - Le bus d'événements.
     */
    update(state, dt, eventBus) {
        // Appelle la méthode update de la classe parente (Hero) pour gérer la régénération et les buffs génériques
        super.update(state, dt, eventBus);

        // Le prêtre n'agit que s'il est en état de combattre
        if (!this.isFighting()) return;

        // Effectue les soins sur la cible la plus blessée du groupe
        this.performHeal(state.heroes, dt, state);

        // Gère le cooldown des buffs
        this.buffCooldown -= dt;
        // Applique un buff si le cooldown est terminé et si la chance de buff est supérieure à 0
        if (this.buffCooldown <= 0 && this._statsCache.finalBuffChance > 0) {
            this.applyBuff(state.heroes);
            // Réinitialise le cooldown basé sur la fréquence de buff calculée
            this.buffCooldown = 1 / this._statsCache.finalBuffChance;
        }
    }

    /**
     * Effectue des soins sur le héros du groupe ayant le plus faible pourcentage de HP.
     * @param {Hero[]} party - Le tableau des héros du groupe.
     * @param {number} dt - Le temps écoulé.
     * @param {object} state - L'état global du jeu (pour les buckets de dégâts/soins).
     */
    performHeal(party, dt, state) {
        let target = null;
        let lowestHpPercent = 1; // Commence à 100%

        // Trouve le héros avec le pourcentage de HP le plus bas
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
            // Calcule la quantité de soin basée sur la puissance de soin du prêtre et le delta-temps
            const healAmount = (this._statsCache.finalHealPower || 0) * dt;
            if (healAmount > 0) {
                // Applique le soin et vérifie si le statut du héros a changé
                const result = target.regenerate(healAmount);
                const healedAmount = result.healedAmount;
                
                if (result.statusChanged) {
                    state.ui.heroesNeedUpdate = true; // Signale une mise à jour de l'UI si le statut a changé
                }

                // Ajoute le soin au "bucket" de dégâts pour l'affichage flottant
                if (healedAmount > 0) {
                    if (!state.damageBuckets[target.id]) {
                        state.damageBuckets[target.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                    }
                    state.damageBuckets[target.id].heal = (state.damageBuckets[target.id].heal || 0) + healedAmount;
                }
            }
        }
    }

    /**
     * Applique un buff aléatoire à un héros du groupe.
     * @param {Hero[]} party - Le tableau des héros du groupe.
     */
    applyBuff(party) {
        // Filtre les alliés qui sont en état de combattre
        const fightingAllies = party.filter(h => h.isFighting());
        if (fightingAllies.length === 0) return;

        // Choisit une cible et un type de buff aléatoires
        const target = fightingAllies[Math.floor(Math.random() * fightingAllies.length)];
        const buffTemplate = POSSIBLE_BUFFS[Math.floor(Math.random() * POSSIBLE_BUFFS.length)];

        // Calcule la puissance et la durée finales du buff en tenant compte des bonus du prêtre
        const finalPotency = buffTemplate.value * (1 + (this._statsCache.finalBuffPotency || 0) / 100);
        const finalDuration = this.definition.baseBuffDuration * (1 + (this._statsCache.finalBuffDuration || 0) / 100);

        const newBuff = {
            id: `buff_${Date.now()}_${Math.random()}`, // ID unique pour le buff
            name: buffTemplate.name,
            stat: buffTemplate.stat,
            value: finalPotency,
            duration: finalDuration,
            maxDuration: finalDuration, // Stocke la durée max pour la barre de progression
        };

        target.addBuff(newBuff); // Ajoute le buff au héros ciblé
    }

    /**
     * Surcharge la méthode de recalcul des statistiques pour inclure les stats spécifiques au prêtre.
     * @param {object} [equipmentOverride] - Un équipement temporaire pour la simulation.
     * @returns {object} Les statistiques calculées.
     */
    _recalculateStats(equipmentOverride = this.equipment) {
        // Appelle la méthode parente pour obtenir les stats de base
        const calculatedStats = super._recalculateStats(equipmentOverride);

        // Récupère les bonus d'équipement pour les stats spécifiques au prêtre
        const bonuses = this._getBonusesFromEquipment(equipmentOverride);

        // Calcul des statistiques spécifiques au prêtre
        calculatedStats.finalHealPower = (this.definition.baseHealPerSecond + (bonuses.healPower || 0)) * (1 + (bonuses.healPercent || 0) / 100);
        // Renommé pour plus de clarté: 'baseBuffChance' est en fait une fréquence
        calculatedStats.finalBuffChance = this.definition.baseBuffChance; 
        calculatedStats.finalBuffPotency = bonuses.buffPotency || 0;
        calculatedStats.finalBuffDuration = this.definition.baseBuffDuration * (1 + (bonuses.buffDuration || 0) / 100);

        // Confirmation : Le Prêtre est un support pur et ne fait aucun dégât.
        calculatedStats.damage = 0;

        // Met à jour le cache interne si ce n'est pas une simulation
        if (equipmentOverride === this.equipment) {
            this._statsCache = calculatedStats;
        }

        return calculatedStats;
    }
}

