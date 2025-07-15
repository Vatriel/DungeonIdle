// js/ui/EffectsUI.js

import { createElement } from '../utils/domHelper.js';

const floatingTextContainerEl = document.getElementById('floating-text-container');
const saveIndicatorEl = document.getElementById('save-indicator');
const BUCKET_FLUSH_INTERVAL = 0.3;

export function showNotification(message, type = 'error', targetElement = null) {
    let area = document.getElementById('notification-area');
    if (!area) {
        area = createElement('div', { id: 'notification-area' });
        document.body.appendChild(area);
    }

    const notif = createElement('div', { className: `notification ${type}`, textContent: message });

    if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        notif.style.position = 'absolute';
        notif.style.top = `${rect.top - 30}px`;
        notif.style.left = `${rect.left + rect.width / 2}px`;
        notif.style.transform = 'translateX(-50%)';
        floatingTextContainerEl.appendChild(notif);
    } else {
        area.appendChild(notif);
    }

    requestAnimationFrame(() => { notif.classList.add('show'); });
    
    setTimeout(() => {
        notif.classList.remove('show');
        notif.addEventListener('transitionend', () => notif.remove());
    }, type === 'riposte' ? 1000 : 3000);
}

// CORRECTION : Ajout du mot-clé 'export' pour rendre la fonction accessible aux autres modules.
export function createFloatingText(text, type, targetElement) {
    let textContent;
    switch (type) {
        case 'crit':
            textContent = `${Math.ceil(text)}!`;
            break;
        case 'shield':
            textContent = `+${Math.ceil(text)}`;
            break;
        case 'lifesteal':
        case 'heal':
            textContent = `+${Math.ceil(text)}`;
            break;
        default:
            textContent = Math.ceil(text);
            break;
    }
    
    const textEl = createElement('div', {
        className: `floating-text ${type}`,
        textContent: textContent
    });

    const rect = targetElement.getBoundingClientRect();
    const xOffset = rect.width * (0.2 + Math.random() * 0.6);
    textEl.style.left = `${rect.left + xOffset}px`;
    textEl.style.top = `${rect.top + 20}px`;

    floatingTextContainerEl.appendChild(textEl);
    textEl.style.animation = 'floatUp 1.5s ease-out forwards';
    textEl.addEventListener('animationend', () => textEl.remove());
}

export function createProtectorBeamText(damage, chargeFactor, targetElement) {
    let textContent = `${Math.ceil(damage)}`;
    if (chargeFactor >= 5.0) {
        textContent += '!!!';
    } else if (chargeFactor >= 2.0) {
        textContent += '!!';
    } else if (chargeFactor >= 1.0) {
        textContent += '!';
    }

    const textEl = createElement('div', {
        className: 'floating-text beam',
        textContent: textContent
    });

    const rect = targetElement.getBoundingClientRect();
    const xOffset = rect.width * (0.2 + Math.random() * 0.6);
    textEl.style.left = `${rect.left + xOffset}px`;
    textEl.style.top = `${rect.top + 20}px`;

    floatingTextContainerEl.appendChild(textEl);
    textEl.style.animation = 'floatUp 1.5s ease-out forwards';
    textEl.addEventListener('animationend', () => textEl.remove());
}


export function createFlavorFloatingText(text, type, targetElement) {
    const textEl = createElement('div', {
        className: `floating-text flavor-text ${type}`,
        textContent: text
    });

    const rect = targetElement.getBoundingClientRect();
    const xOffset = rect.width * (0.2 + Math.random() * 0.6);
    textEl.style.left = `${rect.left + xOffset}px`;
    textEl.style.top = `${rect.top}px`;
    textEl.style.transform = 'translateX(-50%)';

    floatingTextContainerEl.appendChild(textEl);
    textEl.style.animation = 'flavorPop 0.8s ease-out forwards';
    textEl.addEventListener('animationend', () => textEl.remove());
}


export function flushDamageBuckets(state, dt) {
    for (const targetId in state.damageBuckets) {
        const bucket = state.damageBuckets[targetId];
        bucket.timer -= dt;

        if (bucket.timer <= 0) {
            const targetElement = targetId === 'monster'
                ? document.getElementById('monster-area')
                : document.querySelector(`.hero-card[data-hero-id="${targetId}"]`);
            
            if (targetElement) {
                if (bucket.damage > 0) createFloatingText(bucket.damage, 'damage', targetElement);
                if (bucket.crit > 0) createFloatingText(bucket.crit, 'crit', targetElement);
                if (bucket.heal > 0) createFloatingText(bucket.heal, 'heal', targetElement);
            }
            
            bucket.damage = 0;
            bucket.crit = 0;
            bucket.heal = 0;
            bucket.timer = BUCKET_FLUSH_INTERVAL;
        }
    }
}

export function showSavingIndicator() {
    saveIndicatorEl.classList.remove('hidden', 'saved');
    saveIndicatorEl.classList.add('saving');
    saveIndicatorEl.querySelector('.icon').textContent = '⚙️';
    saveIndicatorEl.querySelector('.text').textContent = 'Sauvegarde...';
}

export function showSaveSuccess() {
    saveIndicatorEl.classList.remove('saving');
    saveIndicatorEl.classList.add('saved');
    saveIndicatorEl.querySelector('.icon').textContent = '✔️';
    saveIndicatorEl.querySelector('.text').textContent = 'Sauvegardé !';
}

export function hideSaveIndicator() {
    saveIndicatorEl.classList.add('hidden');
}

export function showConfirmationModal(message, eventBus, action, onCancel) {
    const overlay = createElement('div', { className: 'modal-overlay' });
    const modal = createElement('div', { className: 'modal-content' });
    
    modal.appendChild(createElement('p', { textContent: message }));

    const buttonContainer = createElement('div', { className: 'modal-buttons' });
    
    const confirmBtn = createElement('button', { textContent: 'Confirmer', className: 'buy-btn' });
    confirmBtn.addEventListener('click', () => {
        if (eventBus && action) {
            eventBus.emit('confirmation_accepted', action);
        }
        overlay.remove();
    });
    buttonContainer.appendChild(confirmBtn);

    const cancelBtn = createElement('button', { textContent: 'Annuler', className: 'discard-btn' });
    cancelBtn.addEventListener('click', () => {
        if (onCancel) onCancel();
        overlay.remove();
    });
    buttonContainer.appendChild(cancelBtn);

    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
