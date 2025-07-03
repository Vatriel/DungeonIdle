// js/data/itemData.js

export const ITEM_DEFINITIONS = {
  // --- ARMES DPS ---
  SHORT_SWORD: {
    name: "Épée courte",
    type: 'weapon',
    slot: 'arme',
    subType: 'arme_dps',
    stat: 'dps',
    baseValue: 3,
    possibleAffixes: ['critChance', 'critDamage', 'dpsPercent'] 
  },
  WAR_STAFF: {
    name: "Bâton de guerre",
    type: 'weapon',
    slot: 'arme',
    subType: 'arme_dps',
    stat: 'dps',
    baseValue: 10,
    possibleAffixes: ['critChance', 'critDamage', 'dpsPercent'], 
    // CORRIGÉ : Logique de malus pilotée par les données
    possibleMaluses: {
        armor: { chance: 0.6, magnitude: 0.8 } // 60% de chance d'avoir un malus d'armure, à 80% de sa valeur normale
    },
    classRestriction: ['mage']
  },
  
  // --- ARMURES ---
  LEATHER_ARMOR: {
    name: "Armure de cuir",
    type: 'armor',
    slot: 'torse',
    stat: 'maxHp',
    baseValue: 15,
    possibleAffixes: ['armor', 'hpPercent', 'hpRegen']
  },
  PLATE_ARMOR: {
    name: "Armure de plaques",
    type: 'armor',
    slot: 'torse',
    stat: 'armor',
    baseValue: 25,
    possibleAffixes: ['hpPercent', 'hpRegen'],
    // CORRIGÉ : Logique de malus pilotée par les données
    possibleMaluses: {
        dpsPercent: { chance: 0.8, magnitude: 0.5 } // 80% de chance d'avoir un malus de DPS, à 50% de sa valeur normale
    },
    classRestriction: ['warrior']
  },

  // NOUVEAU : Amulette
  GOLD_AMULET: {
      name: "Amulette de l'avare",
      type: 'jewelry',
      slot: 'amulette',
      stat: 'goldFind',
      baseValue: 5, // +5% de base
      possibleAffixes: ['goldFind'],
      // Aucune restriction de classe
  },

  // --- NOUVEAUX OBJETS POUR LE PRÊTRE ---
  PILGRIM_STAFF: {
    name: "Bâton de pèlerin",
    type: 'weapon',
    slot: 'arme',
    subType: 'arme_sacre', // Le sous-type qui le rend équipable par le prêtre
    stat: 'healPower',
    baseValue: 8,
    possibleAffixes: ['healPercent', 'hpRegen', 'maxHp'],
    classRestriction: ['priest']
  },
  HOLY_TOME: {
    name: "Tome sacré",
    type: 'relic',
    slot: 'bibelot',
    stat: 'buffPotency',
    baseValue: 10,
    possibleAffixes: ['buffDuration', 'healPercent'],
    classRestriction: ['priest']
  }
};

// On définit nos affixes et comment ils fonctionnent
export const AFFIX_DEFINITIONS = {
    dpsPercent:    { text: "+X% DPS", isPercent: true },
    critChance:    { text: "+X% Chance Critique", isPercent: true },
    critDamage:    { text: "+X% Dégâts Critiques", isPercent: true },
    maxHp:         { text: "+X HP", isPercent: false },
    hpPercent:     { text: "+X% HP", isPercent: true },
    armor:         { text: "+X Armure", isPercent: false },
    hpRegen:       { text: "+X HP/s", isPercent: false },
    goldFind:      { text: "+X% Découverte d'Or", isPercent: true },
    // NOUVEAUX AFFIXES
    healPower:     { text: "+X Puissance de Soin", isPercent: false },
    healPercent:   { text: "+X% Soin", isPercent: true },
    buffPotency:   { text: "+X% Efficacité des Buffs", isPercent: true },
    buffDuration:  { text: "+X% Durée des Buffs", isPercent: true },
};
