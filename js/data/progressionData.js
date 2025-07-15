// js/data/progressionData.js
// Ce fichier centralise tous les événements de progression du jeu.

export const PROGRESSION_DATA = {
    // Étage: { left: [Événements négatifs/Défis], right: [Événements positifs/Récompenses] }
    1: {
        right: ["Nouveau Héros : Guerrier"]
    },
    2: {
        left: ["Nouvel Ennemi : Araignée des Forêts"],
        right: ["Nouveau Héros : Mage"]
    },
    3: {
        left: ["Nouvel Ennemi : Orque"]
    },
    5: {
        left: ["Nouvel Ennemi : Squelette"]
    },
    7: {
        left: ["Nouvel Ennemi : Loup Sanguinaire"]
    },
    9: {
        left: ["Nouvel Ennemi : Nuée de Chauves-souris"]
    },
    10: {
        left: ["Nouvel Ennemi : Goule"]
    },
    11: {
        right: ["Nouveau Héros : Prêtre"]
    },
    12: {
        left: ["Nouvel Ennemi : Spectre Gémissant"]
    },
    15: {
        left: ["Nouvel Ennemi d'Élite : Golem de Pierre"],
        right: ["Mécanique débloquée : Renaissance", "Nouveau Héros : Duelliste"]
    },
    18: {
        left: ["Nouvel Ennemi d'Élite : Garde de Crypte"]
    },
    20: {
        right: ["Mécanique débloquée : La Forge"]
    },
    25: {
        right: ["Nouveau Héros : Protecteur"]
    },
    28: {
        left: ["Nouvel Ennemi d'Élite : Hydre du Chaos"]
    },
    30: {
        right: ["Mécanique débloquée : La Taverne !"]
    },
    40: {
        right: ["Nouveau Spécialiste : Le Bâtisseur"]
    },
};
