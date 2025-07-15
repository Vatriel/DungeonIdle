// js/data/monsterData.js

export const MONSTER_DEFINITIONS = {
  GOBLIN: {
    id: 'goblin',
    name: "Gobelin",
    baseHp: 30,
    damageType: 'physical',
    baseDamage: 2.5,
    baseAttackSpeed: 1.2,
    appearsAtFloor: 1,
    groupSize: { base: 2, perFloor: 0.5, random: 3 },
    isFixedGroupSize: false
  },
  ORC: {
    id: 'orc',
    name: "Orque",
    baseHp: 80,
    damageType: 'physical',
    baseDamage: 8,
    baseAttackSpeed: 0.8,
    appearsAtFloor: 3,
    groupSize: { base: 1, perFloor: 0.33, random: 2 },
    isFixedGroupSize: false
  },
  SKELETON: {
    id: 'skeleton',
    name: "Squelette",
    baseHp: 150,
    damageType: 'physical',
    baseDamage: 10,
    baseAttackSpeed: 1.0,
    appearsAtFloor: 5,
    groupSize: { base: 2, perFloor: 0.2, random: 3 },
    isFixedGroupSize: false
  },
  GHOUL: {
    id: 'ghoul',
    name: "Goule",
    baseHp: 320,
    damageType: 'physical',
    baseDamage: 18,
    baseAttackSpeed: 1,
    appearsAtFloor: 10,
    groupSize: { base: 1, perFloor: 0.1, random: 1 },
    isFixedGroupSize: false
  },
  STONE_GOLEM: {
    id: 'stone_golem',
    name: "Golem de pierre",
    baseHp: 800,
    damageType: 'physical',
    baseDamage: 50,
    baseAttackSpeed: 0.5,
    appearsAtFloor: 15,
    groupSize: { base: 1, perFloor: 0, random: 1 },
    isFixedGroupSize: true
  },

  WAILING_SPECTRE: {
    id: 'wailing_spectre',
    name: "Spectre Gémissant",
    baseHp: 250,
    damageType: 'physical',
    baseDamage: 15,
    baseAttackSpeed: 0.9,
    appearsAtFloor: 12,
    groupSize: { base: 1, perFloor: 0.15, random: 2 },
    isFixedGroupSize: false
  },

  ARMORED_CRYPT_GUARD: {
    id: 'armored_crypt_guard',
    name: "Garde de Crypte en Armure",
    baseHp: 1200,
    damageType: 'physical',
    baseDamage: 40,
    baseAttackSpeed: 0.6, // Lent mais puissant
    appearsAtFloor: 18,
    groupSize: { base: 1, perFloor: 0, random: 1 }, // Apparaît seul
    isFixedGroupSize: true
  },

  CHAOS_HYDRA: {
    id: 'chaos_hydra',
    name: "Hydre du Chaos",
    baseHp: 2500,
    damageType: 'physical',
    baseDamage: 60,
    baseAttackSpeed: 1.0,
    appearsAtFloor: 28,
    groupSize: { base: 1, perFloor: 0, random: 1 }, // Toujours seule
    isFixedGroupSize: true
  },

  // NOUVEAUX MONSTRES BASIQUES
  FOREST_SPIDER: {
    id: 'forest_spider',
    name: "Araignée des Forêts",
    baseHp: 40,
    damageType: 'physical',
    baseDamage: 3,
    baseAttackSpeed: 1.5,
    appearsAtFloor: 2, // Apparaît tôt pour la variété
    groupSize: { base: 2, perFloor: 0.5, random: 2 }, // Petits groupes
    isFixedGroupSize: false
  },
  DIRE_WOLF: {
    id: 'dire_wolf',
    name: "Loup Sanguinaire",
    baseHp: 100,
    damageType: 'physical',
    baseDamage: 10,
    baseAttackSpeed: 1.1,
    appearsAtFloor: 7, // Milieu de donjon
    groupSize: { base: 1, perFloor: 0.2, random: 1 }, // Petits groupes ou seul
    isFixedGroupSize: false
  },
  SWARM_OF_BATS: {
    id: 'swarm_of_bats',
    name: "Nuée de Chauves-souris",
    baseHp: 20, // Très peu de HP par chauve-souris
    damageType: 'physical',
    baseDamage: 1.5, // Très peu de dégâts par chauve-souris
    baseAttackSpeed: 2.0, // Très rapide
    appearsAtFloor: 9, // Un défi de quantité
    groupSize: { base: 5, perFloor: 1, random: 5 }, // Très grands groupes
    isFixedGroupSize: false
  },
};
