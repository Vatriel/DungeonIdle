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
        allowedSubTypes: {
            arme: ['magic_focus'] 
        }
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
            arme: ['arme_sacre', 'magic_focus']
        }
    },
    DUELIST: {
        id: 'duelist',
        name: 'Duelliste',
        cost: 50000,
        status: 'locked',
        damageType: 'physical',
        baseDamage: 15,
        baseAttackSpeed: 1.5,
        baseStrength: 10,
        baseDexterity: 14,
        baseIntelligence: 4,
        baseEndurance: 5,
        strengthPerLevel: 2,
        dexterityPerLevel: 3,
        intelligencePerLevel: 0,
        endurancePerLevel: 1,
        baseRiposteChance: 0.05,
        allowedSubTypes: {
            arme: ['arme_dps']
        }
    },
    PROTECTOR: {
        id: 'protector',
        name: 'Protecteur',
        cost: 100000,
        status: 'locked',
        damageType: 'magical',
        baseDamage: 8,
        baseAttackSpeed: 0.8,
        baseStrength: 8,
        baseDexterity: 4,
        baseIntelligence: 12,
        baseEndurance: 10,
        strengthPerLevel: 1,
        dexterityPerLevel: 1,
        intelligencePerLevel: 3,
        endurancePerLevel: 2,
        shieldOnHitValue: 5,
        aoeShieldValue: 20,
        aoeShieldCooldown: 12,
        interceptionThreshold: 0.35,
        interceptionDamageReduction: 0.5,
        interceptionCooldown: 7,
        allowedSubTypes: {
            arme: ['arme_sacre', 'arme_dps', 'magic_focus']
        }
    },
    FLIBUSTIER: {
        id: 'flibustier',
        name: 'Flibustier',
        cost: 1000000,
        status: 'locked',
        unlockCondition: {
            reputation: 3000
        },
        // NOUVEAU : Description pour la carte de recrutement avant déblocage.
        teaserDescription: "Un homme étrange à l'œil brillant passe de table en table. Il chante des airs marins entraînants, une lueur de malice dans le regard. Il semble attendre quelque chose... ou quelqu'un d'assez réputé pour s'offrir ses services.",
        description: "Un maître de la poudre et des coups bas, dont la puissance augmente avec votre fortune. Parfait pour ceux qui aiment parier gros.", // Description une fois débloqué
        damageType: 'physical',
        baseDamage: 12,
        baseAttackSpeed: 1.0,
        baseStrength: 7,
        baseDexterity: 12,
        baseIntelligence: 9,
        baseEndurance: 6,
        strengthPerLevel: 1,
        dexterityPerLevel: 3,
        intelligencePerLevel: 2,
        endurancePerLevel: 1,
        allowedSubTypes: {
            arme: ['pistolet', 'mousquet', 'tromblon']
        }
    }
};
