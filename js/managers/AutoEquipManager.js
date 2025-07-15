// js/managers/AutoEquipManager.js
// Ce manager contient la logique d'équipement automatique.

import { STAT_WEIGHTS } from '../data/statWeightData.js';
import { AFFIX_DEFINITIONS } from '../data/itemData.js';

let localState = null;
let localEventBus = null;

/**
 * Vérifie si un objet est compatible avec un slot de héros donné.
 * @param {Item} item - L'objet à vérifier.
 * @param {string} slot - Le nom du slot (ex: 'arme', 'torse').
 * @param {Hero} hero - Le héros cible.
 * @returns {boolean} Vrai si l'objet est compatible.
 */
function isItemCompatible(item, slot, hero) {
    // MODIFICATION: Utilise item.baseDefinition.slot OU item.baseDefinition.type
    const itemSlotType = item.baseDefinition.slot || item.baseDefinition.type;

    // Cas spécial pour les anneaux : un objet 'ring' peut aller dans 'anneau1' ou 'anneau2'
    if (itemSlotType === 'ring') {
        if (slot !== 'anneau1' && slot !== 'anneau2') {
            return false;
        }
    } else if (itemSlotType !== slot) { // Compare le slot de l'objet avec le slot cible
        return false;
    }

    const classRestriction = item.baseDefinition.classRestriction;
    if (classRestriction && !classRestriction.includes(hero.id)) {
        return false;
    }

    const itemSubType = item.baseDefinition.subType;
    if (itemSubType) {
        const allowedSubTypes = hero.definition.allowedSubTypes?.[itemSlotType]; // Utilise itemSlotType ici
        if (allowedSubTypes && !allowedSubTypes.includes(itemSubType)) {
            return false;
        }
    }

    return true;
}

/**
 * Exécute l'algorithme d'équipement automatique amélioré.
 * Cette fonction déséquipe tout, puis ré-équipe itérativement le meilleur objet
 * pour le meilleur slot afin de maximiser la puissance globale.
 */
function runAutoEquip() {
    // 1. Préparation : Mettre tous les objets (inventaire + équipés) dans une piscine commune.
    let itemPool = [...localState.inventory];
    localState.heroes.forEach(hero => {
        // MODIFICATION: Parcourt tous les slots d'équipement possibles, pas seulement ceux qui ont un objet
        const allPossibleSlots = ['arme', 'torse', 'tete', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];
        allPossibleSlots.forEach(slot => {
            if (hero.equipment[slot]) {
                itemPool.push(hero.equipment[slot]);
                hero.equipment[slot] = null; // Déséquiper l'objet pour le mettre dans le pool
            }
        });
        // Recalculer les stats du héros "nu" pour avoir une base de comparaison.
        hero.recalculateStats(localState);
    });

    // 2. Attribution Itérative : Continue tant qu'on trouve des améliorations.
    let improvementFound = true;
    let iterationCount = 0; // Ajout pour éviter les boucles infinies potentielles
    const MAX_ITERATIONS = 100; // Limite le nombre d'itérations pour la sécurité

    while (improvementFound && iterationCount < MAX_ITERATIONS) {
        improvementFound = false;
        let bestAssignment = { scoreIncrease: 0, hero: null, item: null, slot: null, itemIndex: -1, oldItem: null };

        // Itère sur chaque héros pour trouver la meilleure amélioration possible à ce stade.
        for (const hero of localState.heroes) {
            const currentHeroScore = hero.getPowerScore(localState);

            // Itère sur chaque slot d'équipement du héros.
            const slots = ['arme', 'torse', 'tete', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];
            for (const slot of slots) {
                // Simuler l'équipement de chaque objet du pool dans ce slot
                for (let i = 0; i < itemPool.length; i++) {
                    const item = itemPool[i];

                    if (isItemCompatible(item, slot, hero)) {
                        const oldItemInSlot = hero.equipment[slot]; // L'objet actuellement équipé dans ce slot (peut être null)

                        // Simuler l'équipement du nouvel objet
                        hero.equipment[slot] = item;
                        hero.recalculateStats(localState);
                        const newScore = hero.getPowerScore(localState);
                        
                        // Calculer l'augmentation de score. Si le slot était vide, tout score > 0 est une amélioration.
                        const scoreIncrease = newScore - currentHeroScore;

                        // Annuler la simulation pour ne pas affecter les calculs suivants.
                        hero.equipment[slot] = oldItemInSlot; 
                        hero.recalculateStats(localState); // Revenir à l'état original du héros

                        // Si ce mouvement est le meilleur trouvé jusqu'à présent, on le sauvegarde.
                        // MODIFICATION: Autorise un scoreIncrease très faible mais positif pour remplir les slots vides.
                        if (scoreIncrease > bestAssignment.scoreIncrease && scoreIncrease > 0.001) { // Utilise un petit seuil
                            bestAssignment = { scoreIncrease, hero, item, slot, itemIndex: i, oldItem: oldItemInSlot };
                        }
                    }
                }
            }
        }

        // 3. Appliquer la meilleure attribution trouvée dans cette itération.
        if (bestAssignment.scoreIncrease > 0.001) { // Utilise le même petit seuil
            const { hero, item, slot, itemIndex, oldItem } = bestAssignment;
            
            // Retirer l'objet du pool
            itemPool.splice(itemIndex, 1);

            // Si un ancien objet était équipé, le remettre dans le pool
            if (oldItem) {
                itemPool.push(oldItem);
            }
            
            // Équiper le nouvel objet de manière permanente
            hero.equipItem(localState, item, slot); // Utilise la fonction equipItem du héros pour s'assurer que les stats sont recalculées.
            
            improvementFound = true; // Une amélioration a été trouvée, continuer la boucle
        }
        iterationCount++;
    }

    // 4. Finalisation : Remettre les objets non utilisés dans l'inventaire.
    localState.inventory = itemPool;
    localEventBus.emit('notification_requested', { message: 'Équipement automatique terminé !', type: 'success' });
    localState.ui.inventoryNeedsUpdate = true;
    localState.ui.heroesNeedUpdate = true;
}


export const AutoEquipManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;
        eventBus.on('ui_auto_equip_clicked', runAutoEquip);
    }
};
