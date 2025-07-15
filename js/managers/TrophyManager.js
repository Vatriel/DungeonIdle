// js/managers/TrophyManager.js
// Gère la logique de la collection de trophées et le calcul des bonus.

import { TROPHY_DEFINITIONS, TROPHY_SET_BONUSES } from '../data/trophyData.js';

let localState = null;
let localEventBus = null;

// Constante pour la formule de rendement décroissant (similaire à l'armure)
const TROPHY_BONUS_CONSTANT = 100;

export const TrophyManager = {
    init(eventBus, state) {
        localState = state;
        localEventBus = eventBus;

        eventBus.on('trophy_earned', this.addTrophy.bind(this));
        
        // Calculer les bonus initiaux au chargement du jeu
        this.recalculateAllBonuses();
    },

    /**
     * Ajoute un trophée à la collection du joueur et recalcule les bonus.
     * @param {object} data - Contient l'ID du trophée.
     */
    addTrophy(data) {
        const { trophyId } = data;
        if (!TROPHY_DEFINITIONS[trophyId]) return;

        if (!localState.trophies[trophyId]) {
            localState.trophies[trophyId] = 0;
        }
        localState.trophies[trophyId]++;
        
        console.log(`Trophée ${trophyId} ajouté. Total : ${localState.trophies[trophyId]}`);
        
        // Recalculer tous les bonus car un nouveau trophée peut compléter un set.
        this.recalculateAllBonuses();
    },

    /**
     * Recalcule tous les bonus de trophées (individuels et de set).
     */
    recalculateAllBonuses() {
        const newBonuses = {
            damageVsMonster: {}, // { monsterId: bonus, ... }
            damageVsCategory: {}, // { categoryName: bonus, ... }
            goldVsCategory: {}, // { categoryName: bonus, ... }
        };

        // 1. Calculer les bonus de dégâts individuels (rendement décroissant)
        for (const trophyId in localState.trophies) {
            const count = localState.trophies[trophyId];
            const monsterId = TROPHY_DEFINITIONS[trophyId]?.monsterId;
            if (monsterId) {
                // Formule : (count * bonus_par_trophée) / (count * bonus_par_trophée + constante)
                // Pour un bonus de 1% par trophée, on peut simplifier en utilisant directement `count`
                const bonus = count / (count + TROPHY_BONUS_CONSTANT);
                newBonuses.damageVsMonster[monsterId] = bonus;
            }
        }

        // 2. Calculer les bonus de set
        for (const setName in TROPHY_SET_BONUSES) {
            const setInfo = TROPHY_SET_BONUSES[setName];
            const ownedTrophiesInSet = Object.values(TROPHY_DEFINITIONS)
                .filter(def => def.category === setName && localState.trophies[def.monsterId] > 0)
                .length;

            if (ownedTrophiesInSet >= setInfo.count) {
                const { effect } = setInfo.bonus;
                if (effect.type === 'damage_vs_category') {
                    if (!newBonuses.damageVsCategory[effect.category]) {
                        newBonuses.damageVsCategory[effect.category] = 0;
                    }
                    newBonuses.damageVsCategory[effect.category] += effect.value;
                } else if (effect.type === 'gold_vs_category') {
                    // ... (logique pour d'autres types de bonus de set)
                }
            }
        }
        
        localState.activeTrophyBonuses = newBonuses;
        console.log("Bonus de trophées recalculés :", localState.activeTrophyBonuses);
    },

    /**
     * Récupère le bonus de dégâts total contre un monstre spécifique.
     * @param {Enemy} monster - L'instance du monstre.
     * @returns {number} - Le multiplicateur de dégâts (ex: 0.05 pour +5%).
     */
    getDamageBonus(monster) {
        if (!monster || !localState.activeTrophyBonuses) return 0;

        let totalBonus = 0;
        const monsterId = monster.id;
        const monsterCategory = TROPHY_DEFINITIONS[monsterId]?.category;

        // Bonus individuel contre ce monstre
        if (localState.activeTrophyBonuses.damageVsMonster?.[monsterId]) {
            totalBonus += localState.activeTrophyBonuses.damageVsMonster[monsterId];
        }

        // Bonus de set contre la catégorie de ce monstre
        if (monsterCategory && localState.activeTrophyBonuses.damageVsCategory?.[monsterCategory]) {
            totalBonus += localState.activeTrophyBonuses.damageVsCategory[monsterCategory];
        }

        return totalBonus;
    }
};
