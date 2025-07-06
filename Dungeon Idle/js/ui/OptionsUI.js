// js/ui/OptionsUI.js
// NOUVEAU : Ce fichier gère la création et l'affichage de la fenêtre modale des options.

import { createElement } from '../utils/domHelper.js';

/**
 * Crée et affiche la fenêtre modale des options.
 * @param {object} state - L'état actuel du jeu, contenant les options.
 * @param {EventBus} eventBus - Pour émettre des événements de changement d'option.
 */
export function showOptionsModal(state, eventBus) {
    // Si la modale existe déjà, on ne fait rien pour éviter les doublons
    if (document.getElementById('options-modal-overlay')) return;

    // Crée l'arrière-plan semi-transparent
    const overlay = createElement('div', { id: 'options-modal-overlay', className: 'modal-overlay' });
    
    // Crée le conteneur de la modale
    const modal = createElement('div', { className: 'modal-content options-modal' });
    
    // Header de la modale
    const header = createElement('div', { className: 'modal-header' });
    header.appendChild(createElement('h2', { textContent: 'Options' }));
    const closeBtn = createElement('button', { textContent: 'X', className: 'close-btn' });
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Corps de la modale avec les options
    const body = createElement('div', { className: 'modal-body' });

    // Option : Auto Fight Boss
    const autoBossOption = createCheckboxOption(
        'auto-fight-boss',
        'Combattre le boss automatiquement',
        'Si coché, le groupe affrontera le gardien de l\'étage dès qu\'il sera disponible.',
        state.options.autoFightBoss
    );
    body.appendChild(autoBossOption);

    // Option : Auto Next Floor
    const autoFloorOption = createCheckboxOption(
        'auto-next-floor',
        'Avancer à l\'étage suivant automatiquement',
        'Si coché, le groupe avancera à l\'étage suivant dès que le boss sera vaincu.',
        state.options.autoNextFloor
    );
    body.appendChild(autoFloorOption);

    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Ajoute les écouteurs d'événements après la création
    modal.querySelector('#auto-fight-boss-checkbox').addEventListener('change', (e) => {
        eventBus.emit('option_changed', { key: 'autoFightBoss', value: e.target.checked });
    });
    modal.querySelector('#auto-next-floor-checkbox').addEventListener('change', (e) => {
        eventBus.emit('option_changed', { key: 'autoNextFloor', value: e.target.checked });
    });
}

/**
 * Helper pour créer une ligne d'option avec une case à cocher.
 * @param {string} id - L'ID de base pour les éléments.
 * @param {string} labelText - Le texte du label.
 * @param {string} helpText - Le texte d'aide affiché sous le label.
 * @param {boolean} isChecked - L'état initial de la case.
 * @returns {HTMLElement} Le conteneur de l'option.
 */
function createCheckboxOption(id, labelText, helpText, isChecked) {
    const wrapper = createElement('div', { className: 'option-wrapper' });
    
    const input = createElement('input', { 
        type: 'checkbox', 
        id: `${id}-checkbox`, 
        checked: isChecked 
    });

    const label = createElement('label', { htmlFor: `${id}-checkbox`, textContent: labelText });
    
    const textContainer = createElement('div', { className: 'option-text' });
    textContainer.appendChild(label);
    textContainer.appendChild(createElement('p', { className: 'option-help', textContent: helpText }));

    wrapper.appendChild(input);
    wrapper.appendChild(textContainer);

    return wrapper;
}
