// js/data/heroData.js
export const HERO_DEFINITIONS = {
    ADVENTURER: {
        id: 'adventurer',
        name: 'Aventurier',
        cost: 0,
        status: 'recruited',
        damageType: 'physical',
        baseDamage: 4,
        baseAttackSpeed: 1.2,
        baseStrength: 8,
        baseDexterity: 7,
        baseIntelligence: 5,
        baseEndurance: 8,
        strengthPerLevel: 1,
        dexterityPerLevel: 1,
        intelligencePerLevel: 1,
        endurancePerLevel: 2,
    },
    WARRIOR: {
        id: 'warrior',
        name: 'Guerrier',
        cost: 100,
        status: 'locked',
        damageType: 'physical',
        baseDamage: 10,
        baseAttackSpeed: 0.8,
        baseStrength: 12,
        baseDexterity: 6,
        baseIntelligence: 3,
        baseEndurance: 10,
        strengthPerLevel: 3,
        dexterityPerLevel: 1,
        intelligencePerLevel: 0,
        endurancePerLevel: 2,
        allowedSubTypes: {
            arme: ['arme_dps']
        }
    },
    MAGE: {
        id: 'mage',
        name: 'Mage',
        cost: 0,
        status: 'locked',
        damageType: 'magical',
        baseDamage: 18,
        baseAttackSpeed: 0.6,
        baseStrength: 4,
        baseDexterity: 7,
        baseIntelligence: 12,
        baseEndurance: 6,
        strengthPerLevel: 0,
        dexterityPerLevel: 1,
        intelligencePerLevel: 3,
        endurancePerLevel: 1,
    },
    PRIEST: {
        id: 'priest',
        name: 'Prêtre',
        cost: 10000,
        status: 'locked',
        damageType: 'magical',
        baseDamage: 0,
        baseAttackSpeed: 1.0,
        baseStrength: 6,
        baseDexterity: 5,
        baseIntelligence: 10,
        baseEndurance: 9,
        strengthPerLevel: 1,
        dexterityPerLevel: 1,
        intelligencePerLevel: 2,
        endurancePerLevel: 2,
        baseHealPerSecond: 5,
        baseBuffChance: 0.2,
        baseBuffDuration: 5,
        allowedSubTypes: {
            arme: ['arme_sacre']
        }
    },
    // NOUVEAU : Définition du Duelliste
    DUELIST: {
        id: 'duelist',
        name: 'Duelliste',
        cost: 50000, // Coût élevé pour un héros d'élite
        status: 'locked', // Débloqué via le prestige
        damageType: 'physical',
        baseDamage: 15,
        baseAttackSpeed: 1.5, // Très rapide
        baseStrength: 10,
        baseDexterity: 14, // Statistique principale
        baseIntelligence: 4,
        baseEndurance: 5, // Très fragile
        strengthPerLevel: 2,
        dexterityPerLevel: 3,
        intelligencePerLevel: 0,
        endurancePerLevel: 1,
        baseRiposteChance: 0.05, // 5% de chance de base
        allowedSubTypes: {
            arme: ['arme_dps'] // Peut utiliser les mêmes armes que les autres combattants physiques
        }
    }
};
