// js/data/tavernUpgradesData.js
// Définit les améliorations de la Taverne, gratuites ou payantes.

export const TAVERN_UPGRADES = {
    // ==================================================================
    // AMÉLIORATIONS GRATUITES (Débloquées par Renommée ou Étage Max Atteint)
    // ==================================================================

    CONTRACT_SLOT_EXPANSION: {
        id: 'CONTRACT_SLOT_EXPANSION',
        // CORRECTION : Ajout du nom manquant.
        name: "Expansion des Contrats",
        description: "Augmente de +{value} le nombre de contrats disponibles et actifs simultanément.",
        type: 'free',
        unlockCondition: { reputation: 500, floor: 0 }, // Renommée 500
        effect: (level) => level, // Retourne simplement le niveau, qui correspond à l'augmentation (+1 par niveau)
        formatValue: (value) => value, // Pas de signe + ici, car déjà dans la description
        maxLevel: 1, 
    },
    INFLUENTIAL_REPUTATION: {
        id: 'INFLUENTIAL_REPUTATION',
        name: "Réputation Influente",
        description: "Augmente tous les gains de Renommée de {value}%.",
        type: 'free',
        unlockCondition: { reputation: 1000, floor: 0 }, // Renommée 1000
        effect: (level) => level * 10, // +10% par niveau (un seul niveau pour l'instant)
        formatValue: (value) => value,
        maxLevel: 1, 
    },
    LOYAL_CLIENTELE: {
        id: 'LOYAL_CLIENTELE',
        name: "Clientèle Assidue",
        description: "Les consommables chronométrés ont une durée augmentée de {value}%.",
        type: 'free',
        unlockCondition: { reputation: 1500, floor: 35 }, // Étage 35 + Renommée 1500
        effect: (level) => level * 20, // +20% par niveau
        formatValue: (value) => value,
        maxLevel: 1,
    },
    DEDICATED_MESSENGER: {
        id: 'DEDICATED_MESSENGER',
        name: "Messager Dévoué",
        description: "Réduit le cooldown après avoir réclamé ou abandonné un contrat de {value}%.",
        type: 'free',
        unlockCondition: { reputation: 2000, floor: 40 }, // Étage 40 + Renommée 2000
        effect: (level) => level * 15, // -15% par niveau
        formatValue: (value) => value,
        maxLevel: 1,
    },

    // ==================================================================
    // AMÉLIORATIONS PAYANTES (Débloquées par Renommée/Étage Max + Coût en Or/Trophées)
    // ==================================================================

    LOYALTY_CARD: {
        id: 'LOYALTY_CARD',
        name: "Carte de Fidélité",
        description: "Débloque l'option d'achat automatique des marchandises de la Taverne et réduit leur coût de {value}.", // MODIFIÉ
        type: 'paid',
        unlockCondition: { reputation: 2500, floor: 40 }, // Renommée 2500 + Étage 40
        baseCost: { gold: 50000 },
        effect: (level) => 5, // MODIFIÉ : L'effet est maintenant une valeur numérique (5% de réduction)
        formatValue: (value) => `${value}%`, // MODIFIÉ : Formatage en pourcentage
        maxLevel: 1,
    },
    SAMPLE_SHOP: {
        id: 'SAMPLE_SHOP',
        name: "Boutique d'Échantillons",
        description: "Débloque la vente de l'Élixir de Fureur à la Taverne.",
        type: 'paid',
        unlockCondition: { reputation: 3000, floor: 40 }, // Renommée 3000 + Étage 40
        baseCost: { trophy: 'wailing_spectre', quantity: 1 }, // Coût: 1 Trophée de Spectre Gémissant
        effect: (level) => true, // Cet effet est un simple déblocage, retourne vrai si débloqué
        maxLevel: 1,
    },
    MASTER_ARTISAN: {
        id: 'MASTER_ARTISAN',
        name: "Maître Artisan",
        description: "Chaque fois que vous réclamez un contrat qui octroie des essences, vous avez {value}% de chances d'obtenir une Essence Rare supplémentaire.",
        type: 'paid',
        unlockCondition: { reputation: 3500, floor: 50 }, // Renommée 3500 + Étage 50
        baseCost: { trophy: 'chaos_hydra', quantity: 1 }, // Coût: 1 Trophée d'Hydre du Chaos
        effect: (level) => level * 20, // +20% de chance par niveau
        formatValue: (value) => value,
        maxLevel: 1,
    },
};
