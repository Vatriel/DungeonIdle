// js/data/itemData.js

export const ITEM_DEFINITIONS = {
  // --- ARMES ---
  SHORT_SWORD: {
    name: "Épée courte",
    type: 'weapon',
    slot: 'arme',
    stat: 'dps',
    baseValue: 3,
    possibleAffixes: ['critChance', 'critDamage', 'dpsPercent'] 
  },
  // NOUVEAU : Bâton du Mage
  WAR_STAFF: {
    name: "Bâton de guerre",
    type: 'weapon',
    slot: 'arme',
    stat: 'dps',
    baseValue: 10,
    // MODIFIÉ : Peut avoir un malus d'armure
    possibleAffixes: ['critChance', 'critDamage', 'dpsPercent', 'armor'], 
    classRestriction: ['mage'] // NOUVEAU : Uniquement pour le Mage
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
  // NOUVEAU : Armure du Guerrier
  PLATE_ARMOR: {
    name: "Armure de plaques",
    type: 'armor',
    slot: 'torse',
    stat: 'armor',
    baseValue: 25,
    // MODIFIÉ : Peut avoir un malus de DPS
    possibleAffixes: ['hpPercent', 'hpRegen', 'dpsPercent'], 
    classRestriction: ['warrior'] // NOUVEAU : Uniquement pour le Guerrier
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
  }
};

// NOUVEAU : On définit nos affixes et comment ils fonctionnent
export const AFFIX_DEFINITIONS = {
    dpsPercent:    { text: "+X% DPS",          isPercent: true },
    critChance:    { text: "+X% Chance Critique", isPercent: true },
    critDamage:    { text: "+X% Dégâts Critiques", isPercent: true },
    maxHp:         { text: "+X HP",             isPercent: false },
    hpPercent:     { text: "+X% HP",            isPercent: true },
    armor:         { text: "+X Armure",         isPercent: false },
    hpRegen:       { text: "+X HP/s",           isPercent: false },
    // NOUVEAU
    goldFind:      { text: "+X% Découverte d'Or", isPercent: true },
};
