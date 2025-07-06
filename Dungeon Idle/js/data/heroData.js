// js/data/heroData.js
export const HERO_DEFINITIONS = {
    ADVENTURER: {
        id: 'adventurer',
        name: 'Aventurier',
        cost: 0,
        status: 'recruited',
        damageType: 'physical',
        // defaultDamageScaling a été retiré car il n'était pas utilisé et le scaling est géré directement dans Hero.js
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
        // defaultDamageScaling a été retiré
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
        // defaultDamageScaling a été retiré
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
        // defaultDamageScaling a été retiré
        baseDamage: 0, // Le prêtre ne fait pas de dégâts, il est un support pur.
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
        baseBuffChance: 0.2, // Renommé en baseBuffFrequency dans Priest.js pour plus de clarté
        baseBuffDuration: 5,
        allowedSubTypes: {
            arme: ['arme_sacre']
        }
    }
};

