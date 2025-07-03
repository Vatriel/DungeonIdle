// js/data/heroData.js
export const HERO_DEFINITIONS = {
    ADVENTURER: {
        id: 'adventurer',
        name: 'Aventurier',
        baseDps: 5,
        cost: 0,
        status: 'recruited',
        hpPerLevel: 10,
        dpsPerLevel: 5
    },
    WARRIOR: {
        id: 'warrior',
        name: 'Guerrier',
        baseDps: 15,
        cost: 100,
        status: 'locked',
        hpPerLevel: 20,
        dpsPerLevel: 2,
        allowedSubTypes: {
            arme: ['arme_dps']
        }
    },
    MAGE: {
        id: 'mage',
        name: 'Mage',
        baseDps: 25,
        cost: 0,
        status: 'locked',
        hpPerLevel: 2,
        dpsPerLevel: 10
    },
    PRIEST: {
        id: 'priest',
        name: 'Prêtre',
        baseDps: 0,
        cost: 10000,
        status: 'locked',
        // Stats de croissance (tanky, comme demandé)
        hpPerLevel: 18,
        dpsPerLevel: 0,
        // Nouvelles stats de base
        baseHealPerSecond: 5,
        baseBuffChance: 0.2, // 20% de chance par seconde
        baseBuffDuration: 5,
        // Autorise uniquement les objets sacrés en main
        allowedSubTypes: {
            arme: ['arme_sacre']
        }
    }
};
