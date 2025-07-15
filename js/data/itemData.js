// js/data/itemData.js

export const AFFIX_DEFINITIONS = {
    strength: { text: 'X Force', isPercent: false },
    dexterity: { text: 'X Dextérité', isPercent: false },
    intelligence: { text: 'X Intelligence', isPercent: false },
    endurance: { text: 'X Endurance', isPercent: false },
    damagePercent: { text: 'X% Dégâts', isPercent: true },
    attackSpeedPercent: { text: 'X% Vitesse d\'Attaque', isPercent: true },
    flatPhysicalDamage: { text: 'X Dégâts Physiques', isPercent: false },
    flatMagicalDamage: { text: 'X Dégâts Magiques', isPercent: false },
    maxHp: { text: 'X PV Max', isPercent: false },
    hpPercent: { text: 'X% PV Max', isPercent: true },
    armor: { text: 'X Armure', isPercent: false },
    critChance: { text: 'X% Chance de Coup Critique', isPercent: true },
    critDamage: { text: 'X% Dégâts Critiques', isPercent: true },
    hpRegen: { text: 'X Régénération de PV', isPercent: false },
    goldFind: { text: 'X% Découverte d\'Or', isPercent: true },
    lifeSteal: { text: 'X% Vol de Vie', isPercent: true },
    thorns: { text: 'X Épines', isPercent: false },
    healPower: { text: 'X Puissance des Soins', isPercent: false },
    healPercent: { text: 'X% Soins prodigués', isPercent: true },
    buffPotency: { text: 'X% Puissance des Améliorations', isPercent: true },
    buffDuration: { text: 'X% Durée des Améliorations', isPercent: true },
    riposteChance: { text: 'X% Chance de Riposte', isPercent: true },
    shieldPotency: { text: 'X% Puissance de Bouclier', isPercent: true },
    beamChargeRate: { text: 'X% Vitesse de charge du Rayon', isPercent: true },
};

export const ITEM_DEFINITIONS = {
    // ==================================================================
    // OBJETS DE BASE
    // ==================================================================
    
    // --- Armes ---
    epeeCourte: { type: 'arme', name: 'Épée Courte', stat: 'flatPhysicalDamage', baseValue: 5, possibleAffixes: ['strength', 'dexterity', 'critChance', 'critDamage', 'attackSpeedPercent', 'lifeSteal'] },
    hachette: { type: 'arme', name: 'Hachette', stat: 'flatPhysicalDamage', baseValue: 7, possibleAffixes: ['strength', 'critDamage', 'damagePercent', 'lifeSteal'] },
    masseEnBois: { type: 'arme', name: 'Masse en Bois', stat: 'flatPhysicalDamage', baseValue: 6, possibleAffixes: ['strength', 'endurance', 'damagePercent'] },
    batonMagique: { type: 'arme', name: 'Bâton Magique', stat: 'flatMagicalDamage', baseValue: 5, subType: 'magic_focus', possibleAffixes: ['intelligence', 'hpRegen', 'healPower', 'healPercent'] },
    dagueRapide: { type: 'arme', name: 'Dague Rapide', stat: 'flatPhysicalDamage', baseValue: 4, possibleAffixes: ['dexterity', 'attackSpeedPercent', 'critChance', 'lifeSteal'] },
    arcCourt: { type: 'arme', name: 'Arc Court', stat: 'flatPhysicalDamage', baseValue: 5, possibleAffixes: ['dexterity', 'critChance', 'critDamage', 'attackSpeedPercent'] },
    
    // --- Tête ---
    casqueEnCuir: { type: 'tete', name: 'Casque en Cuir', stat: 'armor', baseValue: 3, possibleAffixes: ['dexterity', 'critChance', 'hpPercent'] },
    heaumeEnFer: { type: 'tete', name: 'Heaume en Fer', stat: 'armor', baseValue: 5, possibleAffixes: ['strength', 'endurance', 'maxHp', 'thorns'] },
    couronneMagique: { type: 'tete', name: 'Couronne Magique', stat: 'armor', baseValue: 2, possibleAffixes: ['intelligence', 'hpRegen', 'buffPotency'] },

    // --- Torse ---
    armureDeCuir: { type: 'torse', name: 'Armure de Cuir', stat: 'armor', baseValue: 8, possibleAffixes: ['dexterity', 'endurance', 'hpPercent', 'riposteChance'] },
    plastronEnFer: { type: 'torse', name: 'Plastron en Fer', stat: 'armor', baseValue: 12, possibleAffixes: ['strength', 'endurance', 'maxHp', 'thorns', 'shieldPotency'] },
    robeDeSorcier: { type: 'torse', name: 'Robe de Sorcier', stat: 'armor', baseValue: 5, possibleAffixes: ['intelligence', 'hpRegen', 'healPercent', 'buffDuration'] },
    cotteBarbelee: { type: 'torse', name: 'Cotte Barbelée', stat: 'armor', baseValue: 10, implicitStats: { thorns: { base: 15, variance: 0.2 } }, possibleAffixes: ['strength', 'endurance', 'maxHp', 'thorns', 'damagePercent'] },

    // --- Jambes ---
    jambieresEnCuir: { type: 'jambes', name: 'Jambières en Cuir', stat: 'armor', baseValue: 6, possibleAffixes: ['dexterity', 'attackSpeedPercent', 'critChance'] },
    jambieresEnFer: { type: 'jambes', name: 'Jambières en Fer', stat: 'armor', baseValue: 9, possibleAffixes: ['strength', 'endurance', 'hpPercent', 'thorns'] },
    pantalonDeMage: { type: 'jambes', name: 'Pantalon de Mage', stat: 'armor', baseValue: 4, possibleAffixes: ['intelligence', 'hpRegen', 'goldFind'] },

    // --- Mains ---
    gantsEnTissu: { type: 'mains', name: 'Gants en Tissu', stat: 'armor', baseValue: 2, possibleAffixes: ['intelligence', 'critChance', 'healPower'] },
    ganteletsEnFer: { type: 'mains', name: 'Gantelets en Fer', stat: 'armor', baseValue: 4, possibleAffixes: ['strength', 'damagePercent', 'attackSpeedPercent', 'lifeSteal', 'shieldPotency'] },
    gantsAgiles: { type: 'mains', name: 'Gants Agiles', stat: 'armor', baseValue: 3, possibleAffixes: ['dexterity', 'critDamage', 'attackSpeedPercent', 'lifeSteal'] },

    // --- Pieds ---
    bottesLegeres: { type: 'pieds', name: 'Bottes Légères', stat: 'armor', baseValue: 3, possibleAffixes: ['dexterity', 'attackSpeedPercent', 'riposteChance'] },
    soleretsEnFer: { type: 'pieds', name: 'Solerets en Fer', stat: 'armor', baseValue: 5, possibleAffixes: ['strength', 'endurance', 'hpPercent', 'thorns'] },
    sandalesMagiques: { type: 'pieds', name: 'Sandales Magiques', stat: 'armor', baseValue: 2, possibleAffixes: ['intelligence', 'hpRegen', 'buffDuration'] },

    // --- Bijoux ---
    amuletteSimple: { type: 'amulette', name: 'Amulette Simple', stat: 'hpRegen', baseValue: 1, possibleAffixes: ['strength', 'dexterity', 'intelligence', 'endurance', 'goldFind', 'lifeSteal', 'thorns', 'shieldPotency'] },
    anneauDeFer: { type: 'anneau1', name: 'Anneau de Fer', stat: 'maxHp', baseValue: 10, possibleAffixes: ['strength', 'endurance', 'hpPercent', 'thorns'] },
    anneauDeJade: { type: 'anneau2', name: 'Anneau de Jade', stat: 'hpRegen', baseValue: 0.5, possibleAffixes: ['intelligence', 'healPower', 'healPercent', 'lifeSteal'] },
    bibelotEnOs: { type: 'bibelot', name: 'Bibelot en Os', stat: 'critChance', baseValue: 1, possibleAffixes: ['strength', 'dexterity', 'critDamage', 'damagePercent', 'lifeSteal'] },
    sceauVampirique: { type: 'anneau1', name: 'Sceau Vampirique', stat: 'maxHp', baseValue: 15, implicitStats: { lifeSteal: { base: 2, variance: 0.25 } }, possibleAffixes: ['strength', 'damagePercent', 'critDamage', 'lifeSteal'] },
    egideProtectrice: { type: 'amulette', name: 'Égide Protectrice', stat: 'armor', baseValue: 5, implicitStats: { shieldPotency: { base: 10, variance: 0.2 } }, possibleAffixes: ['endurance', 'hpPercent', 'shieldPotency'] },

    // ==================================================================
    // OBJETS DE DÉGÂTS MAGIQUES
    // ==================================================================
    GUARDIAN_ORB: { type: 'arme', name: 'Orbe de Gardien', stat: 'flatMagicalDamage', baseValue: 4, subType: 'magic_focus', possibleAffixes: ['intelligence', 'endurance', 'maxHp', 'hpRegen', 'shieldPotency', 'beamChargeRate'] },
    SCEPTER_OF_HEALING: { type: 'arme', name: 'Sceptre du Soin', stat: 'flatMagicalDamage', baseValue: 3, subType: 'magic_focus', possibleAffixes: ['intelligence', 'healPower', 'healPercent', 'buffPotency', 'buffDuration', 'hpRegen'] },
    ARCANE_FOCUS_WEAPON: { type: 'arme', name: 'Focus Arcanique', stat: 'flatMagicalDamage', baseValue: 6, subType: 'magic_focus', possibleAffixes: ['intelligence', 'damagePercent', 'critChance', 'critDamage', 'flatMagicalDamage'] },

    // ==================================================================
    // OBJETS UNIQUES EXISTANTS
    // ==================================================================
    OPPORTUNIST_DAGGER: { name: "Dague de l'Opportuniste", type: 'arme', slot: 'arme', stat: 'critChance', baseValue: 5, uniqueEffect: 'OPPORTUNIST_DAGGER', possibleAffixes: ['dexterity', 'attackSpeedPercent', 'critDamage'] },
    // ... (tous les autres objets uniques) ...
    MARTYRS_CHARM: { name: "Charme du Martyr", type: 'amulette', slot: 'amulette', stat: 'healPower', baseValue: 20, uniqueEffect: 'MARTYRS_CHARM', possibleAffixes: ['endurance', 'hpPercent'] },


    // ==================================================================
    // NOUVEAUX OBJETS POUR LE FLIBUSTIER
    // ==================================================================
    
    // --- Armes de base ---
    PISTOLET_A_SILEX: { 
        type: 'arme', name: 'Pistolet à Silex', stat: 'attackSpeedPercent', baseValue: 10,
        subType: 'pistolet',
        possibleAffixes: ['dexterity', 'critChance', 'attackSpeedPercent', 'goldFind'] 
    },
    MOUSQUET_DE_MARINE: { 
        type: 'arme', name: 'Mousquet de Marine', stat: 'flatPhysicalDamage', baseValue: 20,
        subType: 'mousquet',
        possibleAffixes: ['dexterity', 'damagePercent', 'critDamage'] 
    },
    TROMBLON_ECARLATE: { 
        type: 'arme', name: 'Tromblon Écarlate', stat: 'damagePercent', baseValue: 8,
        subType: 'tromblon',
        possibleAffixes: ['strength', 'dexterity', 'critChance', 'critDamage'] 
    },

    // --- Équipements de base ---
    CACHE_OEIL_DE_CAPITAINE: { 
        type: 'tete', name: 'Cache-œil de Capitaine', stat: 'critChance', baseValue: 3,
        implicitStats: { armor: { base: 5, variance: 0.3 } },
        possibleAffixes: ['dexterity', 'critDamage', 'goldFind'],
        classRestriction: ['flibustier']
    },
    CROCHET_ACERE: { 
        type: 'mains', name: 'Crochet Acéré', stat: 'flatPhysicalDamage', baseValue: 8,
        implicitStats: { armor: { base: 4, variance: 0.2 } },
        possibleAffixes: ['strength', 'critChance'],
        classRestriction: ['flibustier']
    },
    JAMBE_DE_BOIS_RENFORCEE: { 
        type: 'jambes', name: 'Jambe de Bois Renforcée', stat: 'endurance', baseValue: 10,
        implicitStats: { armor: { base: 12, variance: 0.1 } },
        possibleAffixes: ['maxHp', 'hpPercent', 'thorns'],
        classRestriction: ['flibustier']
    },

    // --- Objets Uniques ---
    DOUBLOON_PISTOL: { 
        name: "Le Doublon", type: 'arme', slot: 'arme', subType: 'pistolet',
        stat: 'attackSpeedPercent', baseValue: 15, 
        uniqueEffect: 'DOUBLOON_PISTOL',
        possibleAffixes: ['dexterity', 'critChance', 'goldFind'],
        classRestriction: ['flibustier']
    },
    KRAKEN_MUSKET: { 
        name: "Le Kraken", type: 'arme', slot: 'arme', subType: 'mousquet',
        stat: 'critDamage', baseValue: 50, 
        uniqueEffect: 'KRAKEN_MUSKET',
        possibleAffixes: ['dexterity', 'damagePercent'],
        classRestriction: ['flibustier']
    },
    PIRATE_KING_RING: { 
        name: "Bague du Roi des Pirates", type: 'anneau1', slot: 'anneau1', 
        stat: 'goldFind', baseValue: 25, 
        uniqueEffect: 'PIRATE_KING_RING',
        possibleAffixes: ['dexterity', 'critDamage', 'damagePercent'],
        classRestriction: ['flibustier']
    },
    TOAD_VENOM_VIAL: {
        name: "Fiole du Venin de Crapaud Baveux", type: 'bibelot', slot: 'bibelot',
        stat: 'intelligence', baseValue: 15,
        uniqueEffect: 'TOAD_VENOM_VIAL',
        possibleAffixes: ['dexterity', 'critChance'],
        classRestriction: ['flibustier']
    },
    VETERAN_ACCORDION: {
        name: "L'Accordéon du Vétéran", type: 'bibelot', slot: 'bibelot',
        stat: 'endurance', baseValue: 15,
        uniqueEffect: 'VETERAN_ACCORDION',
        possibleAffixes: ['intelligence', 'hpRegen'],
        classRestriction: ['flibustier']
    },
    DAVY_JONES_CHEST: {
        name: "Le Coffre de Davy Jones", type: 'bibelot', slot: 'bibelot',
        stat: 'goldFind', baseValue: 100,
        uniqueEffect: 'DAVY_JONES_CHEST',
        possibleAffixes: ['lifeSteal'],
        classRestriction: ['flibustier']
    },
};
