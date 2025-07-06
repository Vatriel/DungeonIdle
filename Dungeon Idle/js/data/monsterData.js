// js/data/monsterData.js

export const MONSTER_DEFINITIONS = {
  GOBLIN: {
    id: 'goblin',
    name: "Gobelin",
    baseHp: 30,
    // NOUVELLES STATS DE COMBAT
    damageType: 'physical',
    baseDamage: 2.5,
    baseAttackSpeed: 1.2,
    // CONFIGURATION D'APPARITION
    appearsAtFloor: 1,
    groupSize: { base: 2, perFloor: 0.5, random: 3 },
    isFixedGroupSize: false // Par défaut, la taille du groupe n'est pas fixe
  },
  ORC: {
    id: 'orc',
    name: "Orque",
    baseHp: 80,
    // NOUVELLES STATS DE COMBAT
    damageType: 'physical',
    baseDamage: 8,
    baseAttackSpeed: 0.8,
    // CONFIGURATION D'APPARITION
    appearsAtFloor: 3,
    groupSize: { base: 1, perFloor: 0.33, random: 2 },
    isFixedGroupSize: false
  },
  SKELETON: {
    id: 'skeleton',
    name: "Squelette",
    baseHp: 150,
    // NOUVELLES STATS DE COMBAT
    damageType: 'physical',
    baseDamage: 10,
    baseAttackSpeed: 1.0,
    // CONFIGURATION D'APPARITION
    appearsAtFloor: 5,
    groupSize: { base: 2, perFloor: 0.2, random: 3 },
    isFixedGroupSize: false
  },
  GHOUL: {
    id: 'ghoul',
    name: "Goule",
    baseHp: 320,
    // NOUVELLES STATS DE COMBAT
    damageType: 'physical',
    baseDamage: 20,
    baseAttackSpeed: 1.1,
    // CONFIGURATION D'APPARITION
    appearsAtFloor: 10,
    groupSize: { base: 1, perFloor: 0.125, random: 1 },
    isFixedGroupSize: false
  },
  STONE_GOLEM: {
    id: 'stone_golem',
    name: "Golem de pierre",
    baseHp: 800,
    // NOUVELLES STATS DE COMBAT
    damageType: 'physical',
    baseDamage: 50,
    baseAttackSpeed: 0.5,
    // CONFIGURATION D'APPARITION
    appearsAtFloor: 15,
    groupSize: { base: 1, perFloor: 0, random: 1 },
    isFixedGroupSize: true // Ce monstre a une taille de groupe fixe et ne sera pas affecté par le scaling des groupes
  }
};

