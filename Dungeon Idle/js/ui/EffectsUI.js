// js/ui/EffectsUI.js

// Ce fichier gère tous les effets visuels non liés à un composant spécifique,
// comme les notifications, les textes de dégâts flottants et l'indicateur de sauvegarde.

import { createElement } from '../utils/domHelper.js'; // Importe la fonction createElement

const floatingTextContainerEl = document.getElementById('floating-text-container');
const saveIndicatorEl = document.getElementById('save-indicator');
const BUCKET_FLUSH_INTERVAL = 0.3; // Intervalle de temps pour vider les "buckets" de dégâts/soins

// --- Fonctions exportées ---

/**
 * Affiche une notification temporaire à l'écran.
 * @param {string} message - Le message à afficher.
 * @param {string} type - Le type de notification ('error', 'success').
 */
export function showNotification(message, type = 'error') {
    let area = document.getElementById('notification-area');
    // Crée la zone de notification si elle n'existe pas
    if (!area) {
        area = createElement('div', { id: 'notification-area' });
        document.body.appendChild(area);
    }
    // Crée l'élément de notification
    const notif = createElement('div', { className: `notification ${type}`, textContent: message });
    area.appendChild(notif);
    // Anime l'apparition de la notification
    requestAnimationFrame(() => { notif.classList.add('show'); });
    // Fait disparaître la notification après un délai
    setTimeout(() => {
        notif.classList.remove('show');
        notif.addEventListener('transitionend', () => notif.remove()); // Supprime l'élément après la transition
    }, 3000);
}

/**
 * Crée un texte flottant (dégâts, critique, soin) au-dessus d'un élément cible.
 * @param {number} text - La valeur numérique à afficher.
 * @param {string} type - Le type de texte flottant ('damage', 'crit', 'heal').
 * @param {HTMLElement} targetElement - L'élément DOM au-dessus duquel le texte doit apparaître.
 */
function createFloatingText(text, type, targetElement) {
    const textEl = createElement('div', {
        className: `floating-text ${type}`,
        textContent: Math.ceil(text) // Arrondit le texte à l'entier supérieur
    });

    // Positionne le texte au-dessus de l'élément cible
    const rect = targetElement.getBoundingClientRect();
    const xOffset = rect.width * (0.2 + Math.random() * 0.6); // Position X aléatoire dans l'élément
    textEl.style.left = `${rect.left + xOffset}px`;
    textEl.style.top = `${rect.top + 20}px`; // Légèrement au-dessus de l'élément

    floatingTextContainerEl.appendChild(textEl);
    textEl.style.animation = 'floatUp 1.5s ease-out forwards'; // Déclenche l'animation
    textEl.addEventListener('animationend', () => textEl.remove()); // Supprime l'élément après l'animation
}

/**
 * Vide les "buckets" de dégâts/soins accumulés et crée les textes flottants correspondants.
 * @param {object} state - L'état global du jeu, contenant les damageBuckets.
 * @param {number} dt - Le temps écoulé depuis la dernière mise à jour.
 */
export function flushDamageBuckets(state, dt) {
    for (const targetId in state.damageBuckets) {
        const bucket = state.damageBuckets[targetId];
        bucket.timer -= dt; // Décrémente le timer du bucket

        if (bucket.timer <= 0) {
            // Détermine l'élément cible pour le texte flottant (monstre ou héros)
            const targetElement = targetId === 'monster'
                ? document.getElementById('monster-area')
                : document.querySelector(`.hero-card[data-hero-id="${targetId}"]`);
            
            if (targetElement) {
                // Crée les textes flottants pour les dégâts, critiques et soins si les valeurs sont > 0
                if (bucket.damage > 0) createFloatingText(bucket.damage, 'damage', targetElement);
                if (bucket.crit > 0) createFloatingText(bucket.crit, 'crit', targetElement);
                if (bucket.heal > 0) createFloatingText(bucket.heal, 'heal', targetElement);
            }
            
            // Réinitialise toutes les valeurs du bucket et son timer
            bucket.damage = 0;
            bucket.crit = 0;
            bucket.heal = 0;
            bucket.timer = BUCKET_FLUSH_INTERVAL;
        }
    }
}

/**
 * Affiche l'indicateur de sauvegarde avec un état "sauvegarde en cours".
 */
export function showSavingIndicator() {
    saveIndicatorEl.classList.remove('hidden', 'saved');
    saveIndicatorEl.classList.add('saving');
    saveIndicatorEl.querySelector('.icon').textContent = '⚙️'; // Icône d'engrenage
    saveIndicatorEl.querySelector('.text').textContent = 'Sauvegarde...';
}

/**
 * Affiche l'indicateur de sauvegarde avec un état "sauvegardé".
 */
export function showSaveSuccess() {
    saveIndicatorEl.classList.remove('saving');
    saveIndicatorEl.classList.add('saved');
    saveIndicatorEl.querySelector('.icon').textContent = '✔️'; // Icône de coche
    saveIndicatorEl.querySelector('.text').textContent = 'Sauvegardé !';
}

/**
 * Cache l'indicateur de sauvegarde.
 */
export function hideSaveIndicator() {
    saveIndicatorEl.classList.add('hidden');
}

/**
 * Affiche une modal de confirmation personnalisée.
 * @param {string} message - Le message à afficher dans la modal.
 * @param {Function} onConfirm - La fonction à exécuter si l'utilisateur confirme.
 * @param {Function} [onCancel] - La fonction à exécuter si l'utilisateur annule.
 */
export function showConfirmationModal(message, onConfirm, onCancel) {
    // Crée l'arrière-plan semi-transparent de la modal
    const overlay = createElement('div', { className: 'modal-overlay' });
    // Crée le conteneur de la modal
    const modal = createElement('div', { className: 'modal-content' });
    
    modal.appendChild(createElement('p', { textContent: message })); // Message de la modal

    const buttonContainer = createElement('div', { className: 'modal-buttons' });
    
    // Bouton de confirmation
    const confirmBtn = createElement('button', { textContent: 'Confirmer', className: 'buy-btn' });
    confirmBtn.addEventListener('click', () => {
        onConfirm();
        overlay.remove(); // Supprime la modal après confirmation
    });
    buttonContainer.appendChild(confirmBtn);

    // Bouton d'annulation
    const cancelBtn = createElement('button', { textContent: 'Annuler', className: 'discard-btn' });
    cancelBtn.addEventListener('click', () => {
        if (onCancel) onCancel();
        overlay.remove(); // Supprime la modal après annulation
    });
    buttonContainer.appendChild(cancelBtn);

    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay); // Ajoute la modal au corps du document
}

