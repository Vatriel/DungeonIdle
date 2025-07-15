// js/managers/TavernManager.js

import { TavernContractsManager } from './TavernContractsManager.js';
import { TavernConsumablesManager } from './TavernConsumablesManager.js';
import { TavernUpgradesManager } from './TavernUpgradesManager.js';
import { TavernSpecialistsManager } from './TavernSpecialistsManager.js'; // NOUVEAU : Import du manager des spécialistes

let localState = null;
let localEventBus = null;

export const TavernManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;
        console.log("TavernManager: Initialisation...");

        // Initialisation des sous-managers
        TavernContractsManager.init(eventBus, state);
        TavernConsumablesManager.init(eventBus, state);
        TavernUpgradesManager.init(eventBus, state);
        TavernSpecialistsManager.init(eventBus, state); // NOUVEAU : Initialisation du manager des spécialistes

        // Événements UI de haut niveau pour la Taverne
        localEventBus.on('ui_tavern_modal_requested', (data) => {
            // Logique pour ouvrir la modale, si elle n'est pas gérée directement dans UIUpdater
            // localEventBus.emit('show_tavern_modal', data.state); // Exemple
        });
        localEventBus.on('ui_close_tavern_modal_clicked', () => {
            // Logique pour fermer la modale, si elle n'est pas gérée directement dans UIUpdater
            // localEventBus.emit('hide_tavern_modal'); // Exemple
        });
    },

    update: (dt) => {
        // Délégation des mises à jour aux sous-managers
        TavernContractsManager.update(dt);
        TavernConsumablesManager.update(dt);
        // TavernUpgradesManager n'a pas de logique 'update' par tick, ses effets sont événementiels.
        // TavernSpecialistsManager n'a pas de logique 'update' par tick.
    },
    
    // Vous pouvez exposer les fonctions utilitaires des sous-managers si d'autres modules en ont besoin.
    // Cependant, il est préférable de les importer directement dans les modules UI si possible pour une dépendance directe.
    // Exemple : getContractRewardsText: TavernContractsManager.getContractRewardsText
};
