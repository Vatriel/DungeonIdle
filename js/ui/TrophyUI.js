// js/ui/TrophyUI.js
// Gère l'affichage de la Salle des Trophées.

import { createElement } from '../utils/domHelper.js';
import { TROPHY_DEFINITIONS, TROPHY_SET_BONUSES } from '../data/trophyData.js';

// Garde en mémoire si la structure a été créée pour éviter de la reconstruire inutilement.
let isLayoutCreated = false;

/**
 * Crée la structure initiale de la Salle des Trophées.
 * @param {HTMLElement} trophyPanelEl - L'élément du panneau où construire la disposition.
 */
function createTrophyRoomLayout(trophyPanelEl) {
    trophyPanelEl.innerHTML = ''; // Vide le panneau au cas où

    const content = createElement('div', { className: 'trophy-room-content' });

    // Section pour les bonus de set
    const setsContainer = createElement('div', { className: 'trophy-sets-container' });
    setsContainer.appendChild(createElement('h4', { textContent: 'Bonus de Collection' }));
    setsContainer.appendChild(createElement('div', { id: 'trophy-set-list', className: 'trophy-set-list' }));
    
    // Section pour la collection de trophées
    const collectionContainer = createElement('div', { className: 'trophy-collection-container' });
    
    // Texte de remplissage qui s'affichera si la collection est vide
    collectionContainer.appendChild(createElement('p', {
        id: 'trophy-placeholder-text',
        className: 'empty-list-message',
        textContent: "C'est ici que se trouveront les preuves de vos exploits.",
    }));

    // Grille pour les cartes de trophées
    collectionContainer.appendChild(createElement('div', { id: 'trophy-grid', className: 'trophy-grid' }));

    content.append(setsContainer, collectionContainer);
    trophyPanelEl.appendChild(content);
    isLayoutCreated = true;
}

/**
 * Met à jour l'affichage des bonus de set.
 * @param {object} state - L'état actuel du jeu.
 */
function updateSetBonuses(state) {
    const listEl = document.getElementById('trophy-set-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    for (const setName in TROPHY_SET_BONUSES) {
        const setInfo = TROPHY_SET_BONUSES[setName];
        const isUnlocked = (state.activeTrophyBonuses.damageVsCategory && state.activeTrophyBonuses.damageVsCategory[setName] > 0) || 
                           (state.activeTrophyBonuses.goldVsCategory && state.activeTrophyBonuses.goldVsCategory[setName] > 0);

        const setItem = createElement('div', { className: 'trophy-set-item' });
        if (isUnlocked) {
            setItem.classList.add('unlocked');
        }
        
        setItem.innerHTML = `
            <div class="set-name">${setName}</div>
            <div class="set-bonus">${setInfo.bonus.description}</div>
        `;
        listEl.appendChild(setItem);
    }
}

/**
 * Met à jour la grille des trophées collectés de manière plus robuste.
 * @param {object} state - L'état actuel du jeu.
 */
function updateTrophyCollection(state) {
    const gridEl = document.getElementById('trophy-grid');
    const placeholderEl = document.getElementById('trophy-placeholder-text');
    if (!gridEl || !placeholderEl) {
        console.error("TrophyUI Error: La grille des trophées ou le placeholder est introuvable dans le DOM.");
        return;
    }

    const hasTrophies = state.trophies && Object.keys(state.trophies).length > 0;

    if (hasTrophies) {
        placeholderEl.style.display = 'none';
        gridEl.style.display = 'grid';
        gridEl.innerHTML = ''; // On vide la grille pour la reconstruire proprement

        for (const trophyId in TROPHY_DEFINITIONS) {
            const def = TROPHY_DEFINITIONS[trophyId];
            const count = state.trophies[trophyId] || 0;
            const bonus = state.activeTrophyBonuses.damageVsMonster?.[def.monsterId] || 0;

            const cardEl = createElement('div', { className: 'trophy-card', dataset: { trophyId: trophyId } });
            cardEl.innerHTML = `
                <div class="trophy-name">${def.name}</div>
                <div class="trophy-icon">🏆</div>
                <div class="trophy-count">Possédés : <span>${count}</span></div>
                <div class="trophy-bonus">Bonus : <span>+${(bonus * 100).toFixed(2)}% Dégâts</span></div>
            `;
            
            cardEl.classList.toggle('not-owned', count === 0);
            gridEl.appendChild(cardEl);
        }
    } else {
        placeholderEl.style.display = 'block';
        gridEl.style.display = 'none';
        gridEl.innerHTML = '';
    }
}

/**
 * Fonction principale pour rendre ou mettre à jour l'UI des trophées.
 * @param {object} state - L'état actuel du jeu.
 */
export function renderTrophyUI(state) {
    const trophyPanelEl = document.getElementById('tavern-trophies');
    if (!trophyPanelEl) {
        console.error("TrophyUI Error: Le panneau des trophées est introuvable.");
        return;
    }
    
    // La logique originale est restaurée.
    if (!isLayoutCreated || trophyPanelEl.innerHTML.trim() === '') {
        createTrophyRoomLayout(trophyPanelEl);
    }

    updateSetBonuses(state);
    updateTrophyCollection(state);
}
