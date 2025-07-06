// js/data/itemData.js

export const ITEM_DEFINITIONS = {
  // --- ARMES ---
  SHORT_SWORD: {
    name: "Épée courte",
    type: 'weapon', slot: 'arme', subType: 'arme_dps',
    stat: 'flatPhysicalDamage', baseValue: 3,
    possibleAffixes: ['strength', 'dexterity', 'attackSpeedPercent', 'critChance', 'critDamage'] 
  },
  WAR_STAFF: {
    name: "Bâton de guerre",
    type: 'weapon', slot: 'arme', subType: 'arme_dps',
    stat: 'flatMagicalDamage', baseValue: 10,
    possibleAffixes: ['intelligence', 'critChance', 'critDamage', 'damagePercent'], 
    possibleMaluses: { armor: { chance: 0.6, magnitude: 0.8 } },
    classRestriction: ['mage']
  },
  PILGRIM_STAFF: {
    name: "Bâton de pèlerin",
    type: 'weapon', slot: 'arme', subType: 'arme_sacre',
    stat: 'healPower', baseValue: 8,
    possibleAffixes: ['intelligence', 'endurance', 'healPercent', 'hpRegen'],
    classRestriction: ['priest']
  },
  LUMBERJACK_AXE: {
    name: "Hache de Bûcheron",
    type: 'weapon', slot: 'arme', subType: 'arme_dps',
    stat: 'flatPhysicalDamage', baseValue: 8,
    possibleAffixes: ['strength', 'critDamage', 'damagePercent']
  },
  THIEF_DAGGER: {
    name: "Dague de Voleur",
    type: 'weapon', slot: 'arme', subType: 'arme_dps',
    stat: 'attackSpeedPercent', baseValue: 10,
    possibleAffixes: ['dexterity', 'critChance', 'lifeSteal', 'flatPhysicalDamage']
  },
  IRON_WARHAMMER: {
    name: "Marteau de Guerre en Fer",
    type: 'weapon', slot: 'arme', subType: 'arme_dps',
    stat: 'flatPhysicalDamage', baseValue: 6,
    possibleAffixes: ['strength', 'endurance', 'armor']
  },
  YEW_LONGBOW: {
    name: "Arc Long en If",
    type: 'weapon', slot: 'arme', subType: 'arme_dps',
    stat: 'flatPhysicalDamage', baseValue: 5,
    possibleAffixes: ['dexterity', 'critChance', 'attackSpeedPercent', 'damagePercent']
  },
  CONJURER_SCEPTER: {
    name: "Sceptre du Conjureur",
    type: 'weapon', slot: 'arme', subType: 'arme_dps',
    stat: 'flatMagicalDamage', baseValue: 9,
    possibleAffixes: ['intelligence', 'critDamage', 'buffDuration']
  },
  DRIFTWOOD_WAND: {
    name: "Baguette en Bois Flotté",
    type: 'weapon', slot: 'arme', subType: 'arme_dps',
    stat: 'attackSpeedPercent', baseValue: 8,
    possibleAffixes: ['intelligence', 'critChance', 'damagePercent']
  },

  // --- ARMURES EXISTANTES ---
  LEATHER_ARMOR: {
    name: "Armure de cuir",
    type: 'armor', slot: 'torse',
    stat: 'maxHp', baseValue: 15,
    possibleAffixes: ['endurance', 'dexterity', 'armor', 'hpPercent', 'hpRegen']
  },
  PLATE_ARMOR: {
    name: "Armure de plaques",
    type: 'armor', slot: 'torse',
    stat: 'armor', baseValue: 25,
    possibleAffixes: ['strength', 'endurance', 'hpPercent', 'thorns'],
    possibleMaluses: { attackSpeedPercent: { chance: 0.8, magnitude: 0.5 } },
    classRestriction: ['warrior']
  },

  // --- NOUVEAUX CASQUES ---
  IRON_HELM: {
    name: "Heaume en Fer",
    type: 'armor', slot: 'tete',
    stat: 'armor', baseValue: 15,
    possibleAffixes: ['strength', 'endurance', 'maxHp']
  },
  RANGER_HOOD: {
    name: "Capuche de Rôdeur",
    type: 'armor', slot: 'tete',
    stat: 'dexterity', baseValue: 4,
    possibleAffixes: ['critChance', 'goldFind']
  },
  ACOLYTE_CIRCLET: {
    name: "Diadème d'Acolyte",
    type: 'armor', slot: 'tete',
    stat: 'intelligence', baseValue: 4,
    possibleAffixes: ['healPower', 'buffPotency', 'hpRegen']
  },

  // --- NOUVELLES JAMBIÈRES ---
  PLATE_LEGGINGS: {
    name: "Jambières de Plaques",
    type: 'armor', slot: 'jambes',
    stat: 'armor', baseValue: 20,
    possibleAffixes: ['strength', 'endurance', 'thorns'],
    possibleMaluses: { "attackSpeedPercent": { "chance": 0.5, "magnitude": 0.4 } }
  },
  SOFT_LEATHER_PANTS: {
    name: "Braies en Cuir Souple",
    type: 'armor', slot: 'jambes',
    stat: 'maxHp', baseValue: 25,
    possibleAffixes: ['endurance', 'dexterity', 'hpRegen']
  },

  // --- NOUVEAUX GANTS ---
  STEEL_GAUNTLETS: {
    name: "Gantelets en Acier",
    type: 'armor', slot: 'mains',
    stat: 'strength', baseValue: 3,
    possibleAffixes: ['armor', 'flatPhysicalDamage', 'critDamage']
  },
  SURGEON_GLOVES: {
    name: "Gants de Chirurgien",
    type: 'armor', slot: 'mains',
    stat: 'attackSpeedPercent', baseValue: 6,
    possibleAffixes: ['dexterity', 'critChance']
  },

  // --- NOUVELLES BOTTES ---
  IRON_GREAVES: {
    name: "Solerets en Fer",
    type: 'armor', slot: 'pieds',
    stat: 'armor', baseValue: 12,
    possibleAffixes: ['strength', 'endurance']
  },
  TRAVEL_BOOTS: {
    name: "Bottes de Voyage",
    type: 'armor', slot: 'pieds',
    stat: 'endurance', baseValue: 5,
    possibleAffixes: ['hpRegen', 'goldFind']
  },
  
  // --- BIJOUX EXISTANTS ---
  GOLD_AMULET: {
      name: "Amulette de l'avare",
      type: 'jewelry', slot: 'amulette',
      stat: 'goldFind', baseValue: 5,
      possibleAffixes: ['goldFind', 'endurance'],
  },
  HOLY_TOME: {
    name: "Tome sacré",
    type: 'relic', slot: 'bibelot',
    stat: 'buffPotency', baseValue: 10,
    possibleAffixes: ['intelligence', 'buffDuration', 'healPercent'],
    classRestriction: ['priest']
  },

  // --- NOUVEAUX ANNEAUX ---
  RUBY_RING: {
    name: "Anneau de Rubis",
    type: 'jewelry', slot: 'ring',
    stat: 'strength', baseValue: 5,
    possibleAffixes: ['flatPhysicalDamage', 'maxHp']
  },
  EMERALD_RING: {
    name: "Anneau d'Émeraude",
    type: 'jewelry', slot: 'ring',
    stat: 'dexterity', baseValue: 5,
    possibleAffixes: ['critChance', 'attackSpeedPercent']
  },
  SAPPHIRE_RING: {
    name: "Anneau de Saphir",
    type: 'jewelry', slot: 'ring',
    stat: 'intelligence', baseValue: 5,
    possibleAffixes: ['flatMagicalDamage', 'buffPotency']
  },
  TOPAZ_RING: {
    name: "Anneau de Topaze",
    type: 'jewelry', slot: 'ring',
    stat: 'endurance', baseValue: 5,
    possibleAffixes: ['maxHp', 'hpRegen', 'armor']
  },
  CURSED_RING: {
    name: "Bague Maudite",
    type: 'jewelry', slot: 'ring',
    stat: 'critDamage', baseValue: 25,
    possibleAffixes: ['damagePercent', 'lifeSteal'],
    possibleMaluses: { "maxHp": { "chance": 1, "magnitude": 1.5 } }
  }
};

export const AFFIX_DEFINITIONS = {
    // Attributs Primaires
    strength:          { text: "+X Force", isPercent: false },
    dexterity:         { text: "+X Dextérité", isPercent: false },
    intelligence:      { text: "+X Intelligence", isPercent: false },
    endurance:         { text: "+X Endurance", isPercent: false },
    // Combat
    damagePercent:       { text: "+X% Dégâts", isPercent: true },
    attackSpeedPercent:  { text: "+X% Vitesse d'Attaque", isPercent: true },
    flatPhysicalDamage:  { text: "+X Dégâts Physiques", isPercent: false },
    flatMagicalDamage:   { text: "+X Dégâts Magiques", isPercent: false },
    critChance:          { text: "+X% Chance Critique", isPercent: true },
    critDamage:          { text: "+X% Dégâts Critiques", isPercent: true },
    // Défense & Utilitaire
    maxHp:               { text: "+X HP", isPercent: false },
    hpPercent:           { text: "+X% HP", isPercent: true },
    armor:               { text: "+X Armure", isPercent: false },
    hpRegen:             { text: "+X HP/s", isPercent: false },
    lifeSteal:           { text: "+X% Vol de Vie", isPercent: true },
    thorns:              { text: "Renvoie X dégâts", isPercent: false },
    goldFind:            { text: "+X% Découverte d'Or", isPercent: true },
    // Support
    healPower:           { text: "+X Puissance de Soin", isPercent: false },
    healPercent:         { text: "+X% Soin", isPercent: true },
    buffPotency:         { text: "+X% Efficacité des Buffs", isPercent: true },
    buffDuration:        { text: "+X% Durée des Buffs", isPercent: true },
};

