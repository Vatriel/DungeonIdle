// js/ui/tavern/TavernContractsUI.js

import { createElement } from '../../utils/domHelper.js';
import { TavernContractsManager } from '../../managers/TavernContractsManager.js';
import { CONTRACT_DEFINITIONS } from '../../data/contractData.js';

/**
 * Creates a card element for a single contract.
 * @param {object} contract - The contract data.
 * @param {string} type - The type of list ('available', 'active', 'completed').
 * @returns {HTMLElement} The contract card element.
 */
function createContractCard(contract, type) {
    const contractDef = CONTRACT_DEFINITIONS[contract.contractId];
    if (!contractDef) {
        console.error("Error: Contract definition not found for ID:", contract.contractId);
        return null;
    }

    const card = createElement('div', { className: 'contract-card', dataset: { contractId: contract.contractId } });
    card.innerHTML = `
        <div class="contract-header">
            <span class="contract-name">${contractDef.name}</span>
            <span class="contract-type">${contractDef.type === 'monsterHunt' ? 'Chasse' : 'Collecte'}</span>
        </div>
        <p class="contract-description">${contractDef.description}</p>
        <div class="contract-rewards">Récompenses : ${TavernContractsManager.getContractRewardsText(contract.contractId)}</div>
    `;
    
    const actionsDiv = createElement('div', { className: 'contract-actions' });
    if (type === 'available') {
        actionsDiv.appendChild(createElement('button', { textContent: 'Accepter', className: 'btn contract-accept-btn', dataset: { contractId: contract.contractId } }));
    } else if (type === 'active') {
        actionsDiv.appendChild(createElement('span', { textContent: `Progression: ${TavernContractsManager.getContractProgressText(contract)}` }));
        actionsDiv.appendChild(createElement('button', { textContent: 'Abandonner', className: 'btn discard-btn contract-abandon-btn', dataset: { contractId: contract.contractId } }));
    } else if (type === 'completed') {
        actionsDiv.appendChild(createElement('button', { textContent: 'Réclamer', className: 'btn buy-btn contract-claim-btn', dataset: { contractId: contract.contractId } }));
    }
    
    card.appendChild(actionsDiv);
    return card;
}

/**
 * Updates a list of contracts in the UI.
 * @param {HTMLElement} container - The container element for the list.
 * @param {Array<object>} contracts - The array of contracts to display.
 * @param {string} type - The type of list ('available', 'active', 'completed').
 */
function updateContractList(container, contracts, type) {
    container.innerHTML = '';

    if (!contracts || contracts.length === 0) {
        let message = "Aucun contrat.";
        if (type === 'available') message = "Aucun contrat disponible.";
        if (type === 'active') message = "Vous n'avez aucun contrat actif.";
        if (type === 'completed') message = "Aucun contrat terminé en attente.";
        container.appendChild(createElement('p', { className: 'empty-list-message', textContent: message }));
        return;
    }

    contracts.forEach(contract => {
        const cardEl = createContractCard(contract, type);
        if (cardEl) container.appendChild(cardEl);
    });
}

/**
 * Renders the entire contracts tab UI.
 * @param {HTMLElement} container - The main container for the contracts tab.
 * @param {object} state - The current game state.
 * @param {EventBus} eventBus - The global event bus.
 */
export function renderContractsUI(container, state, eventBus) {
    // Main wrapper for layout
    const contentWrapper = createElement('div', { 
        id: 'tavern-contracts-content-wrapper', 
        style: { display: 'flex', flexDirection: 'column', height: '100%' } 
    });
    
    // Container for the three columns
    const columnsContainer = createElement('div', { id: 'contracts-columns-container' });

    // Available Contracts Column
    const availableColumn = createElement('div', { className: 'contract-column' });
    availableColumn.appendChild(createElement('h4', { textContent: 'Disponibles' }));
    const availableContractsContainer = createElement('div', { className: 'contract-list' });
    availableColumn.appendChild(availableContractsContainer);

    // Active Contracts Column
    const activeColumn = createElement('div', { className: 'contract-column' });
    const activeHeader = createElement('h4', { textContent: 'Actifs' });
    const maxActive = state.tavern.maxActiveContracts || 1;
    activeHeader.appendChild(createElement('span', { 
        id: 'active-contracts-counter', 
        className: 'header-counter',
        textContent: `(${state.tavern.activeContracts.length}/${maxActive})`
    }));
    activeColumn.appendChild(activeHeader);
    const activeContractsContainer = createElement('div', { className: 'contract-list' });
    activeColumn.appendChild(activeContractsContainer);

    // Completed Contracts Column
    const completedColumn = createElement('div', { className: 'contract-column' });
    completedColumn.appendChild(createElement('h4', { textContent: 'Terminés' }));
    const completedContractsContainer = createElement('div', { className: 'contract-list' });
    completedColumn.appendChild(completedContractsContainer);

    columnsContainer.append(availableColumn, activeColumn, completedColumn);
    
    // Refresh Button
    const refreshContractsButton = createElement('button', { 
        id: 'tavern-refresh-contracts-btn', 
        className: 'btn utility-btn', 
        textContent: 'Rafraîchir Contrats (50 Or)' 
    });
    refreshContractsButton.addEventListener('click', () => eventBus.emit('ui_tavern_refresh_contracts_clicked'));

    // Populate columns
    updateContractList(availableContractsContainer, state.tavern.availableContracts, 'available');
    updateContractList(activeContractsContainer, state.tavern.activeContracts, 'active');
    updateContractList(completedContractsContainer, state.tavern.completedContracts, 'completed');

    // Assemble and append to the main container
    contentWrapper.append(columnsContainer, refreshContractsButton);
    container.appendChild(contentWrapper);

    // Add a single event listener to the container for delegation
    container.addEventListener('click', (e) => {
        const acceptButton = e.target.closest('.contract-accept-btn');
        if (acceptButton) {
            eventBus.emit('ui_tavern_accept_contract_clicked', { contractId: acceptButton.dataset.contractId });
            return;
        }

        const abandonButton = e.target.closest('.contract-abandon-btn');
        if (abandonButton) {
            eventBus.emit('ui_tavern_abandon_contract_clicked', { contractId: abandonButton.dataset.contractId });
            return;
        }
        
        const claimButton = e.target.closest('.contract-claim-btn');
        if (claimButton) {
            eventBus.emit('ui_tavern_claim_contract_clicked', { contractId: claimButton.dataset.contractId });
        }
    });
}
