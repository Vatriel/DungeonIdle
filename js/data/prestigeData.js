// js/data/prestigeData.js
// NOUVEAU : Ce fichier définit toutes les améliorations de prestige disponibles.

export const PRESTIGE_UPGRADES = {
    // --- Améliorations de Prestige ---
    // Chaque objet représente une amélioration achetable avec des Échos de l'Âme.
    // - id: Identifiant unique.
    // - name: Nom affiché dans l'UI.
    // - description: Texte expliquant l'effet. {value} et {nextValue} seront remplacés dynamiquement.
    // - baseCost: Coût en Échos pour le premier niveau.
    // - costScale: Multiplicateur de coût pour chaque niveau supplémentaire.
    // - maxLevel: Niveau maximum de l'amélioration.
    // - effect: Fonction qui calcule la valeur du bonus au niveau donné.
    // - formatValue: Fonction pour formater la valeur du bonus pour l'affichage.
    
    SOUL_RICHES: {
        id: 'SOUL_RICHES',
        name: "Richesses d'Outre-Tombe",
        description: "Commencez chaque partie avec {value} Or de plus. Prochain niveau : +{nextValue} Or.",
        baseCost: 5,
        costScale: 2.5,
        maxLevel: 10,
        effect: (level) => level * 500,
        formatValue: (value) => Math.floor(value),
    },
    GOLDEN_ECHO: {
        id: 'GOLDEN_ECHO',
        name: "Écho Doré",
        description: "Augmente tous les gains d'Or de {value}%. Prochain niveau : +{nextValue}%.",
        baseCost: 10,
        costScale: 1.8,
        maxLevel: 20,
        effect: (level) => level * 5,
        formatValue: (value) => value,
    },
    ETERNAL_STRENGTH: {
        id: 'ETERNAL_STRENGTH',
        name: "Force Éternelle",
        description: "Augmente les dégâts de base de tous les héros de {value}%. Prochain niveau : +{nextValue}%.",
        baseCost: 15,
        costScale: 2,
        maxLevel: 25,
        effect: (level) => level * 2,
        formatValue: (value) => value,
    },
    LEARNED_SOUL: {
        id: 'LEARNED_SOUL',
        name: "Savoir Ancestral",
        description: "Augmente tous les gains d'XP de {value}%. Prochain niveau : +{nextValue}%.",
        baseCost: 20,
        costScale: 1.9,
        maxLevel: 20,
        effect: (level) => level * 5,
        formatValue: (value) => value,
    },
    STARTING_LEVEL: {
        id: 'STARTING_LEVEL',
        name: "Héritage de l'Aventurier",
        description: "Vos héros commencent au niveau {value}. Prochain niveau : +1.",
        baseCost: 100,
        costScale: 5,
        maxLevel: 5,
        effect: (level) => level + 1,
        formatValue: (value) => value,
    },
    // NOUVEAU : Amélioration pour la capacité de la boutique
    SHOP_CAPACITY: {
        id: 'SHOP_CAPACITY',
        name: "Capacité du Marchand",
        description: "Augmente le nombre maximum d'objets proposés par le Marchand de {value}. Prochain niveau : +{nextValue}.",
        baseCost: 25,
        costScale: 2.0,
        maxLevel: 5, // Par exemple, 5 niveaux pour +5 objets
        effect: (level) => level * 1, // +1 objet par niveau
        formatValue: (value) => value,
    }
};
