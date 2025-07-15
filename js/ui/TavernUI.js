// js/ui/TavernUI.js
// Gère l'affichage et la coordination de la fenêtre modale de la Taverne.

import { createElement } from '../utils/domHelper.js';
import { renderContractsUI } from './tavern/TavernContractsUI.js';
import { renderGoodsUI } from './tavern/TavernGoodsUI.js';
import { renderUpgradesUI } from './tavern/TavernUpgradesUI.js';
import { renderRecruitmentUI } from './tavern/TavernRecruitmentUI.js';
import { renderTrophyUI } from './TrophyUI.js';

const modalOverlay = document.getElementById('tavern-modal-overlay');
const reputationDisplaySpan = createElement('span');
let isInitialized = false;

/**
 * Initializes the main structure of the tavern modal and its top-level event listeners.
 * @param {EventBus} eventBus - The global event bus.
 */
function initializeTavern(eventBus) {
    if (isInitialized || !modalOverlay) return;

    const modalHeader = modalOverlay.querySelector('.modal-header');
    const closeButton = document.getElementById('close-tavern-modal-btn');

    // Add renown display to the header
    const headerRenownDisplay = createElement('div', { className: 'header-renown-display' });
    headerRenownDisplay.innerHTML = 'Renommée : ';
    headerRenownDisplay.appendChild(reputationDisplaySpan);
    
    if (modalHeader && closeButton) {
        // Insert renown display before the close button
        modalHeader.insertBefore(headerRenownDisplay, closeButton);
    }

    // Event listener for the close button
    closeButton.addEventListener('click', () => eventBus.emit('ui_close_tavern_modal_clicked'));

    // Event listener to close the modal when clicking the overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target.id === 'tavern-modal-overlay') {
            eventBus.emit('ui_close_tavern_modal_clicked');
        }
    });

    // Event listener for tab switching
    modalOverlay.querySelector('.tab-buttons').addEventListener('click', (e) => {
        if (e.target.matches('.tab-btn')) {
            eventBus.emit('ui_tavern_tab_changed', { tabId: e.target.dataset.tab });
        }
    });
    
    isInitialized = true;
}

/**
 * Renders the content of the currently active tab by delegating to the appropriate UI module.
 * @param {object} state - The current game state.
 * @param {EventBus} eventBus - The global event bus.
 */
function renderActiveTab(state, eventBus) {
    const activeTabId = state.ui.tavernActiveTab;
    const contentEl = document.getElementById(activeTabId);
    if (!contentEl) return;

    // Clear previous content to ensure a fresh render
    contentEl.innerHTML = '';

    // Delegate rendering to the specific UI module
    switch (activeTabId) {
        case 'tavern-contracts':
            renderContractsUI(contentEl, state, eventBus);
            break;
        case 'tavern-trophies':
            // TrophyUI manages its own container, so we just call it
            renderTrophyUI(state);
            break;
        case 'tavern-consumables':
            renderGoodsUI(contentEl, state, eventBus);
            break;
        case 'tavern-upgrades':
            renderUpgradesUI(contentEl, state, eventBus);
            break;
        case 'tavern-recruitment':
            renderRecruitmentUI(contentEl, state, eventBus);
            break;
    }
}

/**
 * Main render function for the tavern. Updates dynamic parts and calls the active tab renderer.
 * @param {object} state - The current game state.
 * @param {EventBus} eventBus - The global event bus.
 */
export function renderTavernUI(state, eventBus) {
    if (!isInitialized) return;

    // Update renown display
    reputationDisplaySpan.textContent = state.tavern.reputation.toLocaleString('fr-FR');

    // Set active classes for tabs
    modalOverlay.querySelectorAll('.tab-buttons .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === state.ui.tavernActiveTab);
    });
    modalOverlay.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === state.ui.tavernActiveTab);
    });

    // Render the content of the active tab
    renderActiveTab(state, eventBus);
}

/**
 * Shows the tavern modal.
 * @param {object} state - The current game state.
 * @param {EventBus} eventBus - The global event bus.
 */
export function showTavernModal(state, eventBus) { 
    if (!modalOverlay) return;
    initializeTavern(eventBus);
    modalOverlay.classList.remove('hidden');
    renderTavernUI(state, eventBus);
}

/**
 * Hides the tavern modal.
 */
export function hideTavernModal() {
    if (modalOverlay) {
        modalOverlay.classList.add('hidden');
    }
}
