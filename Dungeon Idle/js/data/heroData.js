// js/data/heroData.js
export const HERO_DEFINITIONS = {
    ADVENTURER: {
        id: 'adventurer',
        name: 'Aventurier',
        baseDps: 5,
        cost: 0,
        status: 'recruited',
        // Stats de croissance
        hpPerLevel: 10,
        dpsPerLevel: 5
    },
    WARRIOR: {
        id: 'warrior',
        name: 'Guerrier',
        baseDps: 15,
        cost: 100,
        status: 'locked',
        // Stats de croissance
        hpPerLevel: 20, // Tanky
        dpsPerLevel: 2   // Peu de dégâts
    },
    MAGE: {
        id: 'mage',
        name: 'Mage',
        baseDps: 25,
        cost: 0,
        status: 'locked',
        // Stats de croissance
        hpPerLevel: 2,   // Fragile
        dpsPerLevel: 10  // Gros dégâts
    }
};