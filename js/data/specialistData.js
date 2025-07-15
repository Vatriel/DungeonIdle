// js/data/specialistData.js
// Définit les spécialistes de la Taverne que le joueur peut recruter.

export const SPECIALIST_DEFINITIONS = {
    BLACKSMITH: {
        id: 'blacksmith',
        name: 'Forgeron',
        description: 'Un maître forgeron qui peut vous aider à gérer votre butin et à améliorer vos objets. Débloque le filtre de butin automatique et des améliorations de forge.',
        cost: {
            gold: 100000,
            baseEssence: 1000,
        },
        requirements: {
            reputation: 1000,
        },
        unlockedFeature: 'lootFilter', 
        status: 'locked', // 'locked', 'available', 'recruited'
    },
    BATISSEUR: {
        id: 'batisseur',
        name: 'Bâtisseur',
        description: "Un architecte de renom qui supervise les grands projets. Son expertise est requise pour débloquer des améliorations majeures pour d'autres spécialistes.",
        cost: {
            gold: 500000,
        },
        requirements: {
            reputation: 2000,
        },
        status: 'locked',
    },
    // --- DÉBUT DE LA MODIFICATION ---
    BLACKSMITH_RENOVATION: {
        id: 'blacksmith_renovation',
        name: 'Rénovation de la Forge',
        description: "Le Forgeron souhaite agrandir et améliorer son espace de travail, mais ce projet d'envergure nécessite la supervision du Bâtisseur.",
        cost: {
            gold: 1000000,
        },
        requirements: { 
            // La rénovation requiert maintenant que le Forgeron ET le Bâtisseur soient recrutés.
            specialistRecruited: ['BLACKSMITH', 'BATISSEUR'] 
        },
        status: 'locked',
    },
    // --- FIN DE LA MODIFICATION ---
};
