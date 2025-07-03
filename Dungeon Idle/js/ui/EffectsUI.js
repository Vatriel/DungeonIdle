// js/ui/EffectsUI.js

// Ce fichier gère tous les effets visuels non liés à un composant spécifique,
// comme les notifications, les textes de dégâts flottants et l'indicateur de sauvegarde.

const floatingTextContainerEl = document.getElementById('floating-text-container');
const saveIndicatorEl = document.getElementById('save-indicator');
const BUCKET_FLUSH_INTERVAL = 0.3; 

// --- Fonctions utilitaires ---
// NOTE: Cette fonction est dupliquée dans plusieurs fichiers UI.
// Pour une future amélioration, elle pourrait être centralisée dans un fichier `domUtils.js`.
function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.textContent) el.textContent = options.textContent;
    if (options.title) el.title = options.title;
    if (options.value !== undefined) el.value = options.value;
    if (options.max !== undefined) el.max = options.max;
    if (options.dataset) {
        for (const key in options.dataset) {
            el.dataset[key] = options.dataset[key];
        }
    }
    return el;
}

// --- Fonctions exportées ---

export function showNotification(message, type = 'error') {
    let area = document.getElementById('notification-area');
    if (!area) {
        area = document.createElement('div');
        area.id = 'notification-area';
        document.body.appendChild(area);
    }
    const notif = createElement('div', { className: `notification ${type}`, textContent: message });
    area.appendChild(notif);
    requestAnimationFrame(() => { notif.classList.add('show'); });
    setTimeout(() => {
        notif.classList.remove('show');
        notif.addEventListener('transitionend', () => notif.remove());
    }, 3000);
}

function createFloatingText(text, type, targetElement) {
    const textEl = createElement('div', {
        className: `floating-text ${type}`,
        textContent: Math.ceil(text)
    });

    const rect = targetElement.getBoundingClientRect();
    const xOffset = rect.width * (0.2 + Math.random() * 0.6);
    textEl.style.left = `${rect.left + xOffset}px`;
    textEl.style.top = `${rect.top + 20}px`;

    floatingTextContainerEl.appendChild(textEl);
    textEl.style.animation = 'floatUp 1.5s ease-out forwards';
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

export function handleSpamTexts(state) {
    if (!state.floatingTexts || state.floatingTexts.length === 0) return;

    state.floatingTexts.forEach(textInfo => {
        const targetElement = textInfo.targetId === 'monster'
            ? document.getElementById('monster-area')
            : document.querySelector(`.hero-card[data-hero-id="${textInfo.targetId}"]`);
        
        if (targetElement) {
            createFloatingText(textInfo.text, textInfo.type, targetElement);
        }
    });

    state.floatingTexts = [];
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
