// js/data/tavernGoodsData.js
// Définit les marchandises consommables disponibles à la taverne.

export const TAVERN_GOODS = {
    // Boissons avec bonus temporaires (en secondes)
    ADVENTURER_GROG: {
        id: 'ADVENTURER_GROG',
        name: "Grog de l'Aventurier",
        description: "Un remontant populaire qui semble attirer la bonne fortune et les poches bien remplies.",
        icon: '💰',
        bonus: { stat: 'goldFind', value: 20 }, // +20%
        duration: { type: 'timed', value: 600 }, // 10 minutes
        baseCost: 250,
    },
    BERSERKER_MEAD: {
        id: 'BERSERKER_MEAD',
        name: "Hydromel du Berserker",
        description: "Une boisson puissante qui éveille la fureur du combattant.",
        icon: '⚔️',
        bonus: { stat: 'damagePercent', value: 15 }, // +15%
        duration: { type: 'timed', value: 300 }, // 5 minutes
        baseCost: 400,
    },
    DWARVEN_STOUT: {
        id: 'DWARVEN_STOUT',
        name: "Bière Robuste du Nain",
        description: "Aussi solide que la montagne. Rend la peau dure comme la pierre.",
        icon: '🛡️',
        bonus: { stat: 'armorPercent', value: 25 }, // +25% armure
        duration: { type: 'timed', value: 300 }, // 5 minutes
        baseCost: 350,
    },
    SCHOLAR_WINE: {
        id: 'SCHOLAR_WINE',
        name: "Vin Épicé des Érudits",
        description: "Aiguise l'esprit et accélère l'apprentissage.",
        icon: '🎓',
        bonus: { stat: 'xpGainPercent', value: 15 }, // +15% XP
        duration: { type: 'timed', value: 900 }, // 15 minutes
        baseCost: 300,
    },

    // Rations avec bonus par nombre de rencontres
    TRAVELER_STEW: {
        id: 'TRAVELER_STEW',
        name: "Ragoût du Voyageur",
        description: "Un plat copieux qui renforce le corps pour les épreuves à venir.",
        icon: '🍲',
        bonus: { stat: 'endurancePercent', value: 10 }, // +10% Endurance
        duration: { type: 'encounter', value: 20 }, // 20 rencontres
        baseCost: 500,
    },
    ELVEN_WAYBREAD: {
        id: 'ELVEN_WAYBREAD',
        name: "Pain de Route Elfique",
        description: "Léger mais nourrissant, il décuple l'agilité et la précision.",
        icon: '🍞',
        bonus: { stat: 'dexterityPercent', value: 10 }, // +10% Dextérité
        duration: { type: 'encounter', value: 20 }, // 20 rencontres
        baseCost: 500,
    }
};
