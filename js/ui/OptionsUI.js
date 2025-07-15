// js/ui/OptionsUI.js
// Ce fichier gère la création et l'affichage de la fenêtre modale des options.

import { createElement } from '../utils/domHelper.js';
import { state } from '../core/StateManager.js'; // Import de l'état global
import { SPECIALIST_DEFINITIONS } from '../data/specialistData.js'; // Import des définitions pour la réinitialisation

/**
 * Crée et affiche la fenêtre modale des options.
 * @param {object} currentState - L'état actuel du jeu, contenant les options.
 * @param {EventBus} eventBus - Pour émettre des événements de changement d'option.
 */
export function showOptionsModal(currentState, eventBus) {
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
        currentState.options.autoFightBoss
    );
    body.appendChild(autoBossOption);

    // Option : Auto Next Floor
    const autoFloorOption = createCheckboxOption(
        'auto-next-floor',
        'Avancer à l\'étage suivant automatiquement',
        'Si coché, le groupe avancera à l\'étage suivant dès que le boss sera vaincu.',
        currentState.options.autoNextFloor
    );
    body.appendChild(autoFloorOption);

    // Zone de Danger
    const dangerZone = createElement('div', { className: 'danger-zone' });
    dangerZone.appendChild(createElement('h3', { textContent: 'Zone de Danger' }));
    
    const softResetBtn = createElement('button', {
        className: 'danger-btn',
        textContent: 'Recommencer la partie'
    });
    softResetBtn.title = 'Réinitialise la partie en cours (sans prestige)';
    softResetBtn.addEventListener('click', () => {
        eventBus.emit('ui_soft_reset_clicked');
        overlay.remove();
    });

    const hardResetBtn = createElement('button', {
        className: 'danger-btn',
        textContent: 'Réinitialisation Complète'
    });
    hardResetBtn.title = 'Efface TOUTES les données de sauvegarde (partie et prestige)';
    hardResetBtn.addEventListener('click', () => {
        eventBus.emit('ui_hard_reset_clicked');
        overlay.remove();
    });

    // Bouton pour ajouter de la renommée (dev/debug)
    const addRenownBtn = createElement('button', {
        className: 'danger-btn',
        textContent: 'Gagner 1000 Renommée (Dev)'
    });
    addRenownBtn.title = 'Ajoute instantanément 1000 Renommée pour le développement.';
    addRenownBtn.addEventListener('click', () => {
        state.tavern.reputation += 1000;
        state.ui.tavernNeedsUpdate = true;
        eventBus.emit('notification_requested', { message: '1000 Renommée ajoutée !', type: 'success' });
    });

    // NOUVEAU : Bouton pour réinitialiser les spécialistes
    const resetSpecialistsBtn = createElement('button', {
        className: 'danger-btn',
        textContent: 'Réinitialiser les Spécialistes (Dev)'
    });
    resetSpecialistsBtn.title = 'Réinitialise le statut de tous les spécialistes à "verrouillé" et réinitialise les fonctionnalités associées.';
    resetSpecialistsBtn.addEventListener('click', () => {
        // Réinitialise le statut de chaque spécialiste à son état par défaut
        for (const specialistId in SPECIALIST_DEFINITIONS) {
            if (state.tavern.specialists[specialistId]) {
                state.tavern.specialists[specialistId].status = SPECIALIST_DEFINITIONS[specialistId].status || 'locked';
            }
        }
        // Réinitialise les fonctionnalités débloquées par les spécialistes
        state.blacksmithUnlocked = false;
        
        // Met à jour l'UI
        state.ui.tavernNeedsUpdate = true;
        state.ui.artisanNeedsUpdate = true;
        eventBus.emit('notification_requested', { message: 'Déblocage des spécialistes réinitialisé.', type: 'success' });
    });

    dangerZone.append(softResetBtn, hardResetBtn, addRenownBtn, resetSpecialistsBtn);
    body.appendChild(dangerZone);


    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Ajoute les écouteurs d'événements pour les options après la création
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
