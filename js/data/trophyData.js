// js/data/trophyData.js
// Définit les trophées, leurs monstres associés, et les sets de collection.

export const TROPHY_DEFINITIONS = {
    // Trophées classés par ordre d'apparition des monstres dans le donjon

    // Étage 1
    goblin: { monsterId: 'goblin', name: 'Trophée de Gobelin', category: 'Gobelinoïde' },
    
    // Étage 2
    forest_spider: { monsterId: 'forest_spider', name: 'Pattes d\'Araignée Géante', category: 'Insectoïde' },

    // Étage 3
    orc: { monsterId: 'orc', name: 'Trophée d\'Orque', category: 'Peau-Verte' },
    
    // Étage 5
    skeleton: { monsterId: 'skeleton', name: 'Trophée de Squelette', category: 'Mort-Vivant' },

    // Étage 7
    dire_wolf: { monsterId: 'dire_wolf', name: 'Crocs de Loup Sanguinaire', category: 'Bête' },

    // Étage 9
    swarm_of_bats: { monsterId: 'swarm_of_bats', name: 'Ailes de Chauves-souris Géantes', category: 'Insectoïde' },

    // Étage 10
    ghoul: { monsterId: 'ghoul', name: 'Trophée de Goule', category: 'Mort-Vivant' },

    // Étage 12
    wailing_spectre: { monsterId: 'wailing_spectre', name: 'Trophée de Spectre', category: 'Mort-Vivant' },

    // Étage 15
    stone_golem: { monsterId: 'stone_golem', name: 'Coeur de Golem de Pierre', category: 'Élémentaire' },
    
    // Étage 18
    armored_crypt_guard: { monsterId: 'armored_crypt_guard', name: 'Casque de Garde de Crypte', category: 'Construct' },

    // Étage 28
    chaos_hydra: { monsterId: 'chaos_hydra', name: 'Écaille d\'Hydre du Chaos', category: 'Bête' },
    
    // Trophée de Boss (générique, pas d'étage d'apparition spécifique)
    boss: { monsterId: 'boss', name: 'Fragment d\'Âme de Gardien', category: 'Boss' },
};

export const TROPHY_SET_BONUSES = {
    // Nom du set: { count: nombre de trophées uniques requis, bonus: { description, effect } }
    'Mort-Vivant': {
        count: 3, // Nécessite les 3 trophées de morts-vivants
        bonus: {
            description: "+5% de dégâts contre tous les monstres de la catégorie 'Mort-Vivant'.",
            effect: { type: 'damage_vs_category', category: 'Mort-Vivant', value: 0.05 }
        }
    },
    'Peau-Verte': {
        count: 2, // Gobelin + Orque (si on ajoute d'autres peaux-vertes plus tard)
        bonus: {
            description: "+10% d'or trouvé sur les monstres de la catégorie 'Peau-Verte'.",
            effect: { type: 'gold_vs_category', category: 'Peau-Verte', value: 0.10 }
        }
    },
    // NOUVEAUX SETS
    'Insectoïde': {
        count: 2, // Araignée + Chauve-souris
        bonus: {
            description: "+5% de dégâts contre tous les monstres de la catégorie 'Insectoïde'.",
            effect: { type: 'damage_vs_category', category: 'Insectoïde', value: 0.05 }
        }
    },
    'Bête': {
        count: 2, // Loup + Hydre
        bonus: {
            description: "+5% de dégâts contre tous les monstres de la catégorie 'Bête'.",
            effect: { type: 'damage_vs_category', category: 'Bête', value: 0.05 }
        }
    }
};
