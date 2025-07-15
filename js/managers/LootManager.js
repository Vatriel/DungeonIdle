// js/managers/LootManager.js

import { initLootUI } from '../ui/LootUI.js';
import { ArtisanManager } from './ArtisanManager.js'; // NOUVEAU : Import du ArtisanManager

let localState = null;
let localEventBus = null;

// NOUVEAU : Ordre des raretés pour la comparaison
const RARITY_ORDER = ['defective', 'common', 'magic', 'rare', 'epic', 'legendary', 'mythic', 'artifact'];

/**
 * Ajoute un objet tombé au sol à la liste du butin, ou le recycle si le filtre est actif.
 * @param {object} data - L'objet de l'événement contenant l'item.
 */
function onItemDropped(data) {
    if (data && data.item) {
        const item = data.item;

        // NOUVEAU : Logique du filtre de butin
        if (localState.options.lootFilterActive && localState.blacksmithUnlocked) {
            const itemRarityIndex = RARITY_ORDER.indexOf(item.rarity);
            const thresholdRarityIndex = RARITY_ORDER.indexOf(localState.options.lootFilterRarityThreshold);

            if (itemRarityIndex <= thresholdRarityIndex) {
                // Recycle l'objet automatiquement
                ArtisanManager.recycleItemImmediately(item);
                return; // Ne pas ajouter l'objet au butin
            }
        }

        localState.droppedItems.push(item);
        
        // --- DÉBUT DE LA MODIFICATION ---
        // Gérer la limite de butin au sol
        if (localState.droppedItems.length > localState.droppedItemsSize) {
            localState.droppedItems.shift(); // Supprime l'objet le plus ancien
        }
        // --- FIN DE LA MODIFICATION ---

        // Demande une mise à jour de l'interface utilisateur pour afficher le nouveau butin.
        localState.ui.lootNeedsUpdate = true;
    }
}

export const LootManager = {
    /**
     * Initialise le LootManager.
     * @param {EventBus} eventBus - L'instance de l'EventBus global.
     * @param {object} state - L'état global du jeu.
     */
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;

        // Initialise l'interface utilisateur du butin (ce qui attache les listeners aux boutons)
        initLootUI(eventBus);

        // Écoute l'événement 'item_dropped' émis par le DungeonManager.
        eventBus.on('item_dropped', onItemDropped);
    }
};
