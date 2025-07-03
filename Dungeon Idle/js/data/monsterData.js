// js/data/monsterData.js

export const MONSTER_DEFINITIONS = {
  GOBLIN: {
    id: 'goblin',
    name: "Gobelin",
    baseHp: 30,
    baseDps: 3,
    // NOUVEAU : Configuration de l'apparition
    appearsAtFloor: 1,
    groupSize: { base: 2, perFloor: 0.5, random: 3 } // 2 + (0.5 * floor) + random(0-2)
  },
  ORC: {
    id: 'orc',
    name: "Orque",
    baseHp: 80,
    baseDps: 8,
    // NOUVEAU : Configuration de l'apparition
    appearsAtFloor: 3,
    groupSize: { base: 1, perFloor: 0.33, random: 2 } // 1 + (0.33 * floor) + random(0-1)
  },
  SKELETON: {
    id: 'skeleton',
    name: "Squelette",
    baseHp: 150,
    baseDps: 12,
    // NOUVEAU : Configuration de l'apparition
    appearsAtFloor: 5,
    groupSize: { base: 2, perFloor: 0.2, random: 3 } // 2 + (0.2 * floor) + random(0-2)
  },
  GHOUL: {
    id: 'ghoul',
    name: "Goule",
    baseHp: 320,
    baseDps: 25,
    // NOUVEAU : Configuration de l'apparition
    appearsAtFloor: 10,
    groupSize: { base: 1, perFloor: 0.125, random: 1 } // 1 + (0.125 * floor)
  },
  STONE_GOLEM: {
    id: 'stone_golem',
    name: "Golem de pierre",
    baseHp: 800,
    baseDps: 40,
    // NOUVEAU : Configuration de l'apparition
    appearsAtFloor: 15,
    groupSize: { base: 1, perFloor: 0, random: 1 } // Toujours 1
  }
};
