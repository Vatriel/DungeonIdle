// js/managers/TavernSpecialistsManager.js
// Gère la logique de recrutement et d'activation des spécialistes de la Taverne.

import { SPECIALIST_DEFINITIONS } from '../data/specialistData.js';

let localState = null;
let localEventBus = null;

export const TavernSpecialistsManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;
        console.log("TavernSpecialistsManager: Initialisation...");

        if (!localState.tavern.specialists) {
            localState.tavern.specialists = JSON.parse(JSON.stringify(SPECIALIST_DEFINITIONS));
        } else {
            for (const id in SPECIALIST_DEFINITIONS) {
                if (!localState.tavern.specialists[id]) {
                    localState.tavern.specialists[id] = JSON.parse(JSON.stringify(SPECIALIST_DEFINITIONS[id]));
                }
            }
        }

        eventBus.on('ui_recruit_specialist_clicked', (data) => TavernSpecialistsManager.recruitSpecialist(data.specialistId));
    },

    recruitSpecialist: (specialistId) => {
        const specialistDef = SPECIALIST_DEFINITIONS[specialistId.toUpperCase()];
        if (!specialistDef) {
            console.error(`TavernSpecialistsManager: Spécialiste inconnu : ${specialistId}`);
            localEventBus.emit('notification_requested', { message: "Erreur: Spécialiste inconnu.", type: 'error' });
            return;
        }

        const specialistStatus = localState.tavern.specialists[specialistId.toUpperCase()];
        
        if (specialistStatus.status === 'recruited') {
            localEventBus.emit('notification_requested', { message: `${specialistDef.name} a déjà été recruté.`, type: 'error' });
            return;
        }

        if (specialistStatus.status === 'locked') {
            localEventBus.emit('notification_requested', { message: `${specialistDef.name} n'est pas encore disponible.`, type: 'error' });
            return;
        }

        const cost = specialistDef.cost || {};
        const requirements = specialistDef.requirements || {};
        let canRecruit = true;
        let missingMessages = [];

        // --- DÉBUT DE LA MODIFICATION ---
        // Vérification des prérequis (non consommés)
        if (requirements.reputation && localState.tavern.reputation < requirements.reputation) {
            canRecruit = false;
            missingMessages.push(`Renommée ${requirements.reputation}`);
        }
        
        // Gère les prérequis de spécialistes, qu'il y en ait un ou plusieurs.
        if (requirements.specialistRecruited) {
            const requiredSpecialists = Array.isArray(requirements.specialistRecruited) 
                ? requirements.specialistRecruited 
                : [requirements.specialistRecruited];

            for (const requiredId of requiredSpecialists) {
                if (!TavernSpecialistsManager.isSpecialistRecruited(requiredId)) {
                    canRecruit = false;
                    const prereqName = SPECIALIST_DEFINITIONS[requiredId]?.name || 'un autre spécialiste';
                    missingMessages.push(`Recruter ${prereqName}`);
                }
            }
        }
        // --- FIN DE LA MODIFICATION ---

        // Vérification des coûts (consommés)
        if (cost.gold && localState.gold < cost.gold) {
            canRecruit = false;
            missingMessages.push(`${cost.gold - localState.gold} Or`);
        }
        if (cost.baseEssence && localState.resources.essences.base < cost.baseEssence) {
            canRecruit = false;
            missingMessages.push(`${cost.baseEssence - localState.resources.essences.base} Essences de base`);
        }

        if (!canRecruit) {
            localEventBus.emit('notification_requested', { message: `Conditions non remplies : ${missingMessages.join(', ')}.`, type: 'error' });
            return;
        }

        // Déduction des coûts uniquement
        if (cost.gold) localState.gold -= cost.gold;
        if (cost.baseEssence) localState.resources.essences.base -= cost.baseEssence;

        specialistStatus.status = 'recruited';
        localState.ui.tavernNeedsUpdate = true;
        localEventBus.emit('notification_requested', { message: `${specialistDef.name} a été recruté !`, type: 'success' });

        TavernSpecialistsManager._activateSpecialistFeature(specialistId.toUpperCase());
    },

    // --- DÉBUT DE LA MODIFICATION ---
    _activateSpecialistFeature: (specialistId) => {
        switch (specialistId) {
            case 'BLACKSMITH': 
                localState.blacksmithUnlocked = true;
                localState.ui.artisanNeedsUpdate = true;
                localEventBus.emit('notification_requested', { message: "Le Forgeron est arrivé ! Une nouvelle section est disponible dans la Forge.", type: 'info' });
                break;
            case 'BATISSEUR':
                // Plus besoin de logique ici, les prérequis sont gérés directement.
                break;
            case 'BLACKSMITH_RENOVATION':
                localEventBus.emit('notification_requested', { message: "Le Forgeron a commencé sa rénovation ! De nouvelles options sont disponibles à la Forge.", type: 'info' });
                break;
            default:
                console.warn(`TavernSpecialistsManager: Fonctionnalité non gérée pour le spécialiste : ${specialistId}`);
        }
    },
    // --- FIN DE LA MODIFICATION ---

    isSpecialistRecruited: (specialistId) => {
        return localState.tavern.specialists[specialistId.toUpperCase()]?.status === 'recruited';
    },

    // Cette fonction n'est plus nécessaire pour la logique de recrutement, mais peut être conservée pour d'autres usages.
    isSpecialistUnlocked: (specialistId) => {
        const def = SPECIALIST_DEFINITIONS[specialistId.toUpperCase()];
        if (!def) return false;

        if (def.requirements?.specialistRecruited) {
            const requiredSpecialists = Array.isArray(def.requirements.specialistRecruited)
                ? def.requirements.specialistRecruited
                : [def.requirements.specialistRecruited];
            
            for (const requiredId of requiredSpecialists) {
                if (!TavernSpecialistsManager.isSpecialistRecruited(requiredId)) {
                    return false;
                }
            }
        }
        return true;
    },

    getSpecialistStatus: (specialistId) => {
        const def = SPECIALIST_DEFINITIONS[specialistId.toUpperCase()];
        if (!def) return null;

        const currentStatus = localState.tavern.specialists[specialistId.toUpperCase()]?.status || 'locked';
        const cost = def.cost || {};
        const requirements = def.requirements || {};

        let canAfford = true;
        if (cost.gold && localState.gold < cost.gold) canAfford = false;
        if (cost.baseEssence && localState.resources.essences.base < cost.baseEssence) canAfford = false;
        if (requirements.reputation && localState.tavern.reputation < requirements.reputation) canAfford = false;

        const isUnlockedForDisplay = localState.tavern.specialists[specialistId.toUpperCase()]?.status !== 'locked';

        return {
            id: specialistId,
            name: def.name,
            description: def.description,
            cost: def.cost,
            requirements: def.requirements,
            status: currentStatus,
            canAfford: canAfford,
            isUnlockedForDisplay: isUnlockedForDisplay,
        };
    }
};
