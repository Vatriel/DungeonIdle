// js/ui/ProgressionMapUI.js

import { createElement } from '../utils/domHelper.js';
import { PROGRESSION_DATA } from '../data/progressionData.js';

let modalInstance = null;

function createProgressionMap(state) {
    if (modalInstance) {
        modalInstance.remove();
    }

    const highestFloor = state.highestFloorAchieved;
    const displayLimit = highestFloor + 10;

    const overlay = createElement('div', { id: 'progression-map-overlay', className: 'modal-overlay' });
    const modal = createElement('div', { className: 'modal-content progression-map-content' });
    
    const header = createElement('div', { className: 'modal-header' });
    header.appendChild(createElement('h2', { textContent: 'Feuille de Route du Donjon' }));
    const closeBtn = createElement('button', { textContent: 'X', className: 'close-btn' });
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);

    const timelineContainer = createElement('div', { className: 'timeline-container' });

    const allFloors = Object.keys(PROGRESSION_DATA).map(Number).sort((a, b) => a - b);

    for (const floor of allFloors) {
        if (floor > displayLimit) continue;

        const isDiscovered = floor <= highestFloor;
        const floorData = PROGRESSION_DATA[floor];

        const node = createElement('div', { className: 'timeline-node' });
        const floorCircle = createElement('div', { className: 'timeline-floor-circle', textContent: isDiscovered ? floor : '?' });
        if (isDiscovered) {
            floorCircle.classList.add('discovered');
        }
        node.appendChild(floorCircle);

        // FIX: Crée toujours les deux conteneurs (gauche et droite)
        // Le CSS se chargera de masquer ceux qui sont vides.
        // Cela garantit que le positionnement (gauche/droite) est toujours correct.
        const leftContent = createElement('div', { className: 'timeline-content left' });
        if (isDiscovered && floorData.left) {
            floorData.left.forEach(text => leftContent.appendChild(createElement('p', { textContent: `⚔️ ${text}` })));
        }
        node.appendChild(leftContent);

        const rightContent = createElement('div', { className: 'timeline-content right' });
        if (isDiscovered && floorData.right) {
            floorData.right.forEach(text => rightContent.appendChild(createElement('p', { textContent: `⭐ ${text}` })));
        }
        node.appendChild(rightContent);

        timelineContainer.appendChild(node);
    }

    const finalNode = createElement('div', { className: 'timeline-node final-node' });
    finalNode.appendChild(createElement('div', { className: 'timeline-floor-circle', textContent: '?' }));
    // Ajout d'un conteneur vide à gauche pour pousser le texte final à droite
    finalNode.appendChild(createElement('div', { className: 'timeline-content left' }));
    const finalTextContainer = createElement('div', { className: 'timeline-content right final-text' });
    finalTextContainer.appendChild(createElement('p', { textContent: 'De plus grands défis vous attendent...' }));
    finalNode.appendChild(finalTextContainer);
    timelineContainer.appendChild(finalNode);

    modal.append(header, timelineContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modalInstance = overlay;
}

export function showProgressionMap(state) {
    createProgressionMap(state);
}
