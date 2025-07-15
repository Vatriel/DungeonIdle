// js/managers/TavernContractsManager.js

import { CONTRACT_DEFINITIONS } from '../data/contractData.js';
import { TROPHY_DEFINITIONS } from '../data/trophyData.js';

let localState = null;
let localEventBus = null;
let contractRefreshTimer = 0;

const CONTRACT_REFRESH_INTERVAL = 120; // Temps de rafraîchissement automatique en secondes
// const MAX_AVAILABLE_CONTRACTS = 3; // Sera dynamique
// const MAX_ACTIVE_CONTRACTS = 1; // Sera dynamique

export const TavernContractsManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;
        
        // Écouteurs d'événements spécifiques aux contrats
        eventBus.on('ui_tavern_accept_contract_clicked', (data) => TavernContractsManager.acceptContract(data.contractId));
        eventBus.on('ui_tavern_claim_contract_clicked', (data) => TavernContractsManager.claimContractReward(data.contractId));
        eventBus.on('ui_tavern_abandon_contract_clicked', (data) => TavernContractsManager.abandonContract(data.contractId));
        eventBus.on('ui_tavern_refresh_contracts_clicked', () => TavernContractsManager.refreshContracts(true));

        eventBus.on('monster_defeated_by_type', (data) => TavernContractsManager.trackMonsterDefeat(data));
        eventBus.on('item_added_to_inventory_by_type', (data) => TavernContractsManager.trackItemCollection(data));
        
        // NOUVEAU : Écouteur pour la réclamation de contrat (pour les effets d'améliorations)
        eventBus.on('ui_tavern_claim_contract_clicked', (data) => {
            const contract = localState.tavern.completedContracts.find(c => c.contractId === data.contractId);
            if (contract) {
                // Émettre un événement plus générique pour que d'autres managers puissent réagir
                localEventBus.emit('contract_claimed', { contractId: data.contractId, rewards: contract.rewards });
                TavernContractsManager.claimContractReward(data.contractId);
            }
        });

        // Initialiser les limites dynamiques si elles n'existent pas
        if (localState.tavern.maxAvailableContracts === undefined) localState.tavern.maxAvailableContracts = 3;
        if (localState.tavern.maxActiveContracts === undefined) localState.tavern.maxActiveContracts = 1;

        // Rafraîchir les contrats au démarrage si la taverne est débloquée et qu'il n'y en a pas.
        if (localState.tavernUnlocked && localState.tavern.availableContracts.length === 0) {
            TavernContractsManager.refreshContracts(false);
        }
    },

    update: (dt) => {
        // Mise à jour des cooldowns des contrats
        for (const contractId in localState.tavern.contractCooldowns) {
            let cooldownRemaining = localState.tavern.contractCooldowns[contractId];
            // Appliquer la réduction de cooldown si l'amélioration est active
            const cooldownReductionPercent = (localState.tavern.contractCooldownReduction || 0);
            if (cooldownReductionPercent > 0) {
                cooldownRemaining -= dt * (1 + cooldownReductionPercent / 100);
            } else {
                cooldownRemaining -= dt;
            }
            localState.tavern.contractCooldowns[contractId] = cooldownRemaining;

            if (localState.tavern.contractCooldowns[contractId] <= 0) {
                delete localState.tavern.contractCooldowns[contractId];
                localState.ui.tavernNeedsUpdate = true;
                console.log(`TavernContractsManager: Cooldown pour le contrat ${contractId} terminé.`);
            }
        }

        // Rafraîchissement automatique des contrats
        if (localState.tavernUnlocked) {
            contractRefreshTimer += dt;
            if (contractRefreshTimer >= CONTRACT_REFRESH_INTERVAL) {
                contractRefreshTimer = 0;
                console.log("TavernContractsManager: Rafraîchissement automatique des contrats.");
                TavernContractsManager.refreshContracts(false);
                localEventBus.emit('notification_requested', { message: "De nouveaux contrats sont disponibles à la Taverne !", type: 'info' });
            }
        }
    },

    refreshContracts: (paidRefresh) => {
        console.log(`TavernContractsManager: Tentative de rafraîchissement des contrats (payant: ${paidRefresh}).`);
        const refreshCost = 50;
        if (paidRefresh && localState.gold < refreshCost) {
            localEventBus.emit('notification_requested', { message: `Pas assez d'or pour rafraîchir les contrats (${refreshCost} Or).`, type: 'error' });
            return;
        }
        if (paidRefresh) {
            localState.gold -= refreshCost;
        }

        const currentActiveAndCompleted = [
            ...localState.tavern.activeContracts.map(c => c.contractId),
            ...localState.tavern.completedContracts.map(c => c.contractId)
        ];

        const availableContractDefs = Object.values(CONTRACT_DEFINITIONS).filter(def => {
            const isUnlockedByReputation = localState.tavern.reputation >= def.reputationTierRequired;
            const isOnCooldown = localState.tavern.contractCooldowns[def.id] > 0;
            const isAlreadyActiveOrCompleted = currentActiveAndCompleted.includes(def.id);
            return isUnlockedByReputation && !isOnCooldown && !isAlreadyActiveOrCompleted;
        });

        localState.tavern.availableContracts = [];

        const shuffledContracts = availableContractDefs.sort(() => 0.5 - Math.random());
        // Utilise la limite dynamique
        const contractsToGenerate = Math.min(localState.tavern.maxAvailableContracts, shuffledContracts.length);
        for (let i = 0; i < contractsToGenerate; i++) {
            const contractDef = shuffledContracts[i];
            localState.tavern.availableContracts.push({
                contractId: contractDef.id,
                name: contractDef.name,
                description: contractDef.description,
                type: contractDef.type,
                rewards: contractDef.rewards,
                quantity: contractDef.quantity,
                targetMonsterId: contractDef.targetMonsterId,
                targetItemType: contractDef.targetItemType,
                targetItemRarity: contractDef.targetItemRity,
            });
        }
        console.log(`TavernContractsManager: ${localState.tavern.availableContracts.length} nouveaux contrats générés.`);
        localState.ui.tavernNeedsUpdate = true;
        localEventBus.emit('notification_requested', { message: "Liste des contrats rafraîchie !", type: 'info' });
    },

    acceptContract: (contractId) => {
        // Utilise la limite dynamique
        if (localState.tavern.activeContracts.length >= localState.tavern.maxActiveContracts) {
            localEventBus.emit('notification_requested', { message: `Vous avez déjà ${localState.tavern.maxActiveContracts} contrat(s) actif(s).`, type: 'error' });
            return;
        }

        const contractIndex = localState.tavern.availableContracts.findIndex(c => c.contractId === contractId);
        if (contractIndex === -1) {
            localEventBus.emit('notification_requested', { message: "Contrat non trouvé ou déjà accepté.", type: 'error' });
            return;
        }

        const contractToActivate = localState.tavern.availableContracts.splice(contractIndex, 1)[0];
        contractToActivate.progress = 0;
        localState.tavern.activeContracts.push(contractToActivate);

        localState.ui.tavernNeedsUpdate = true;
        localEventBus.emit('notification_requested', { message: `Contrat "${contractToActivate.name}" accepté !`, type: 'success' });
    },

    trackMonsterDefeat: (data) => {
        localState.tavern.activeContracts.forEach(contract => {
            const contractDef = CONTRACT_DEFINITIONS[contract.contractId];
            if (contractDef && contractDef.type === 'monsterHunt' && contractDef.targetMonsterId === data.monsterId) {
                contract.progress = Math.min(contractDef.quantity, (contract.progress || 0) + data.count);
                // Appliquer les bonus de gain de réputation si l'amélioration est active
                const reputationGainBonus = (localState.tavern.reputationGainBonus || 0);
                if (reputationGainBonus > 0) {
                    // Si le contrat a une récompense de réputation, l'augmenter
                    if (contractDef.rewards.reputation) {
                        contractDef.rewards.reputation = Math.ceil(contractDef.rewards.reputation * (1 + reputationGainBonus / 100));
                    }
                }

                if (contract.progress >= contractDef.quantity) {
                    TavernContractsManager._moveContractToCompleted(contract.contractId);
                }
                localState.ui.tavernNeedsUpdate = true;
            }
        });
    },

    trackItemCollection: (data) => {
        localState.tavern.activeContracts.forEach(contract => {
            const contractDef = CONTRACT_DEFINITIONS[contract.contractId];
            if (contractDef && contractDef.type === 'itemCollection') {
                const item = data.item;
                const itemDef = item.baseDefinition;
                
                let typeMatches = false;
                // MODIFICATION : Gérer les types génériques 'weapon' et 'armor'
                if (contractDef.targetItemType === 'weapon') {
                    typeMatches = itemDef.type === 'arme';
                } else if (contractDef.targetItemType === 'armor') {
                    typeMatches = ['torse', 'tete', 'jambes', 'mains', 'pieds'].includes(itemDef.type);
                } else {
                    // Pour tous les autres types, la correspondance doit être exacte
                    typeMatches = contractDef.targetItemType === itemDef.type;
                }

                const rarityMatches = contractDef.targetItemRarity === item.rarity;

                if (typeMatches && rarityMatches) {
                    contract.progress = Math.min(contractDef.quantity, (contract.progress || 0) + 1);
                    // Appliquer les bonus de gain de réputation si l'amélioration est active
                    const reputationGainBonus = (localState.tavern.reputationGainBonus || 0);
                    if (reputationGainBonus > 0) {
                        if (contractDef.rewards.reputation) {
                            contractDef.rewards.reputation = Math.ceil(contractDef.rewards.reputation * (1 + reputationGainBonus / 100));
                        }
                    }

                     if (contract.progress >= contractDef.quantity) {
                        TavernContractsManager._moveContractToCompleted(contract.contractId);
                    }
                    localState.ui.tavernNeedsUpdate = true;
                }
            }
        });
    },

    _moveContractToCompleted: (contractId) => {
        const contractIndex = localState.tavern.activeContracts.findIndex(c => c.contractId === contractId);
        if (contractIndex !== -1) {
            const completedContract = localState.tavern.activeContracts.splice(contractIndex, 1)[0];
            localState.tavern.completedContracts.push(completedContract);
            localEventBus.emit('notification_requested', { message: `Contrat "${completedContract.name}" terminé ! Allez le réclamer à la Taverne.`, type: 'success' });
            console.log(`TavernContractsManager: Contrat "${completedContract.name}" déplacé vers les terminés.`);
        }
    },

    // La logique de réclamation est maintenant déclenchée par un événement depuis TavernUI
    claimContractReward: (contractId) => {
        const contractIndex = localState.tavern.completedContracts.findIndex(c => c.contractId === contractId);
        if (contractIndex === -1) return;

        const contract = localState.tavern.completedContracts.splice(contractIndex, 1)[0];
        const contractDef = CONTRACT_DEFINITIONS[contract.contractId];

        if (!contractDef) {
            console.error(`TavernContractsManager: Définition de contrat introuvable pour l'ID: ${contract.contractId}`);
            return;
        }

        const rewards = contractDef.rewards;
        let rewardMessages = [];
        if (rewards.gold) {
            localState.gold += rewards.gold;
            rewardMessages.push(`+${rewards.gold} Or`);
        }
        if (rewards.reputation) {
            localState.tavern.reputation += rewards.reputation;
            rewardMessages.push(`+${rewards.reputation} Renommée`);
        }
        if (rewards.baseEssence) {
            localState.resources.essences.base += rewards.baseEssence;
            rewardMessages.push(`+${rewards.baseEssence} Essences de base`);
        }
        if (rewards.rareEssence) {
            localState.resources.essences.rare += rewards.rareEssence;
             rewardMessages.push(`+${rewards.rareEssence} Essences rares`);
        }
        
        if (rewards.trophy) {
            localEventBus.emit('trophy_earned', { trophyId: rewards.trophy });
            const trophyDef = TROPHY_DEFINITIONS[rewards.trophy];
            if (trophyDef) {
                rewardMessages.push(`Trophée obtenu : ${trophyDef.name} !`);
            }
        }
        
        localEventBus.emit('notification_requested', { message: `Récompenses du contrat "${contract.name}" obtenues !`, type: 'success' });
        rewardMessages.forEach(msg => localEventBus.emit('notification_requested', { message: msg, type: 'info' }));
        
        // Appliquer la réduction de cooldown des améliorations
        let finalCooldown = contractDef.cooldown;
        const cooldownReductionPercent = (localState.tavern.contractCooldownReduction || 0);
        if (cooldownReductionPercent > 0) {
            finalCooldown = finalCooldown * (1 - cooldownReductionPercent / 100);
        }
        localState.tavern.contractCooldowns[contract.contractId] = finalCooldown;

        localState.ui.tavernNeedsUpdate = true;
    },

    abandonContract: (contractId) => {
        const contractIndex = localState.tavern.activeContracts.findIndex(c => c.contractId === contractId);
        if (contractIndex === -1) return;

        const contract = localState.tavern.activeContracts.splice(contractIndex, 1)[0];
        const contractDef = CONTRACT_DEFINITIONS[contract.contractId];
        
        // Appliquer la réduction de cooldown des améliorations
        let finalCooldown = contractDef.cooldown * 0.5; // Pénalité de cooldown pour abandon
        const cooldownReductionPercent = (localState.tavern.contractCooldownReduction || 0);
        if (cooldownReductionPercent > 0) {
            finalCooldown = finalCooldown * (1 - cooldownReductionPercent / 100);
        }
        localState.tavern.contractCooldowns[contract.contractId] = finalCooldown;
        
        localEventBus.emit('notification_requested', { message: `Contrat "${contract.name}" abandonné.`, type: 'error' });
        localState.ui.tavernNeedsUpdate = true;
    },
    
    // Fonctions utilitaires pour l'UI
    getContractDisplayName: (contractId) => {
        const def = CONTRACT_DEFINITIONS[contractId];
        return def ? def.name : "Contrat inconnu";
    },
    getContractDescription: (contractId) => {
        const def = CONTRACT_DEFINITIONS[contractId];
        return def ? def.description : "Description inconnue.";
    },
    getContractProgressText: (contract) => {
        const def = CONTRACT_DEFINITIONS[contract.contractId];
        if (!def) return "Progression inconnue";
        if (contract.type === 'monsterHunt' || contract.type === 'itemCollection') {
            return `${contract.progress || 0}/${def.quantity}`;
        }
        return "N/A";
    },
    getContractRewardsText: (contractId) => {
        const def = CONTRACT_DEFINITIONS[contractId];
        if (!def || !def.rewards) return "Aucune récompense";
        let text = [];
        if (def.rewards.gold) text.push(`${def.rewards.gold} Or`);
        if (def.rewards.reputation) text.push(`${def.rewards.reputation} Renommée`);
        if (def.rewards.baseEssence) text.push(`${def.rewards.baseEssence} Ess. Base`);
        if (def.rewards.rareEssence) text.push(`${def.rewards.rareEssence} Ess. Rare`);
        if (def.rewards.trophy) {
            const trophyDef = TROPHY_DEFINITIONS[def.rewards.trophy];
            if (trophyDef) {
                text.push(trophyDef.name);
            }
        }
        return text.join(', ') || "Aucune";
    },
    isContractOnCooldown: (contractId) => {
        return localState.tavern.contractCooldowns[contractId] > 0;
    },
    getContractCooldownRemaining: (contractId) => {
        return Math.ceil(localState.tavern.contractCooldowns[contractId] || 0);
    }
};
