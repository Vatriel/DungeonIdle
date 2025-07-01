// js/data/itemData.js

export const ITEM_DEFINITIONS = {
  // --- ARMES ---
  SHORT_SWORD: {
    name: "Épée courte",
    type: 'weapon',
    slot: 'arme',
    stat: 'dps',
    baseValue: 3,
    // NOUVEAU : Liste des bonus possibles pour cet objet
    possibleAffixes: ['critChance', 'critDamage', 'dpsPercent'] 
  },
  
  // --- ARMURES ---
  LEATHER_ARMOR: {
    name: "Armure de cuir",
    type: 'armor',
    slot: 'torse',
    stat: 'maxHp',
    baseValue: 15,
    possibleAffixes: ['armor', 'hpPercent', 'hpRegen']
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
    goldFind:      { text: "+X% Découverte d'Or", isPercent: true },
};
