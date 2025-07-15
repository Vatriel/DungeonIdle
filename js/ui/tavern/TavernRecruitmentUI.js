// js/ui/tavern/TavernRecruitmentUI.js

import { createElement } from '../../utils/domHelper.js';
import { HERO_DEFINITIONS } from '../../data/heroData.js';
import { SPECIALIST_DEFINITIONS } from '../../data/specialistData.js';
import { TavernSpecialistsManager } from '../../managers/TavernSpecialistsManager.js';

/**
 * Creates a card for recruiting a hero or a specialist.
 * Handles the special display logic for the Flibustier.
 * @param {object} definition - The hero or specialist definition object.
 * @param {string} type - 'hero' or 'specialist'.
 * @param {object} state - The current game state.
 * @returns {HTMLElement} The recruitment card element.
 */
function createRecruitmentCard(definition, type, state) {
    const isRecruited = (type === 'hero')
        ? state.heroDefinitions[definition.id.toUpperCase()]?.status === 'recruited'
        : state.tavern.specialists[definition.id.toUpperCase()]?.status === 'recruited';

    const card = createElement('div', { className: 'recruitment-card' });
    if (isRecruited) {
        card.classList.add('recruited');
    }

    const isFlibustierLocked = definition.id === 'flibustier' && definition.status === 'locked';

    card.appendChild(createElement('h5', { textContent: isFlibustierLocked ? "L'Étranger Mystérieux" : definition.name }));
    
    const descriptionText = isFlibustierLocked ? definition.teaserDescription : definition.description;
    card.appendChild(createElement('p', { textContent: descriptionText, className: 'recruitment-description' }));

    // Display requirements
    if (definition.requirements || isFlibustierLocked) {
        const reqDiv = createElement('div', { className: 'recruitment-requirements' });
        let reqText = 'Prérequis : ';
        const reqParts = [];

        const renownRequirement = definition.unlockCondition?.reputation || definition.requirements?.reputation;
        if (renownRequirement) {
            reqParts.push(`${renownRequirement.toLocaleString()} Renommée`);
        }

        if (definition.requirements?.specialistRecruited) {
            const requiredSpecialists = Array.isArray(definition.requirements.specialistRecruited)
                ? definition.requirements.specialistRecruited
                : [definition.requirements.specialistRecruited];
            
            requiredSpecialists.forEach(reqId => {
                const prereqName = SPECIALIST_DEFINITIONS[reqId.toUpperCase()]?.name || "Spécialiste";
                reqParts.push(`${prereqName} recruté`);
            });
        }
        
        if (reqParts.length > 0) {
            reqDiv.textContent = reqText + reqParts.join(', ');
            card.appendChild(reqDiv);
        }
    }

    // Display cost only when the hero is available
    if (!isFlibustierLocked) {
        const costDiv = createElement('div', { className: 'recruitment-cost' });
        let costText = 'Coût : ';
        const costParts = [];

        if (definition.cost) {
            if (typeof definition.cost === 'object') {
                if (definition.cost.gold) {
                    costParts.push(`${definition.cost.gold.toLocaleString()} Or`);
                }
                if (definition.cost.baseEssence) {
                    costParts.push(`${definition.cost.baseEssence} Ess. Base`);
                }
            } else if (typeof definition.cost === 'number' && definition.cost > 0) {
                costParts.push(`${definition.cost.toLocaleString()} Or`);
            }
        }
        
        if (costParts.length > 0) {
            costText += costParts.join(', ');
        } else {
            costText += 'Gratuit';
        }

        costDiv.textContent = costText;
        card.appendChild(costDiv);
    }

    // Recruitment button
    const button = createElement('button', {
        className: `btn ${type === 'hero' ? 'recruit-hero-btn' : 'recruit-specialist-btn'}`,
        dataset: { [`${type}Id`]: definition.id }
    });

    if (isRecruited) {
        button.textContent = 'Recruté';
        button.disabled = true;
    } else if (isFlibustierLocked) {
        button.textContent = '???';
        button.disabled = true;
    } else {
        // CORRECTION : Le bouton affiche maintenant "Recruter" pour tous les héros, y compris le Flibustier.
        button.textContent = 'Recruter';

        let canAffordCost = true;
        let goldCost = 0;

        if (definition.cost) {
            if (typeof definition.cost === 'object') {
                goldCost = definition.cost.gold || 0;
            } else { // It's a number
                goldCost = definition.cost;
            }
        }
        
        if (state.gold < goldCost) {
            canAffordCost = false;
        }
        
        if (!canAffordCost) {
            button.disabled = true;
        }
    }
    card.appendChild(button);

    return card;
}

/**
 * Renders the entire recruitment tab UI.
 * @param {HTMLElement} container - The main container for the recruitment tab.
 * @param {object} state - The current game state.
 * @param {EventBus} eventBus - The global event bus.
 */
export function renderRecruitmentUI(container, state, eventBus) {
    container.innerHTML = `
        <div class="recruitment-sections-container">
            <div class="recruitment-section">
                <h4>Héros Aventuriers</h4>
                <div id="hero-recruitment-list" class="recruitment-list"></div>
            </div>
            <div class="recruitment-section">
                <h4>Spécialistes de la Taverne</h4>
                <div id="specialist-recruitment-list" class="recruitment-list"></div>
            </div>
        </div>
    `;

    const heroListEl = container.querySelector('#hero-recruitment-list');
    const specialistListEl = container.querySelector('#specialist-recruitment-list');

    // Populate heroes list, always showing the Flibustier's card (locked or available)
    const flibustierDef = state.heroDefinitions['FLIBUSTIER'];
    if (flibustierDef.status !== 'recruited') {
        heroListEl.appendChild(createRecruitmentCard(flibustierDef, 'hero', state));
    }

    const availableHeroes = Object.values(state.heroDefinitions).filter(def => def.status === 'available' && def.id !== 'flibustier');
    if (availableHeroes.length > 0) {
        availableHeroes.forEach(heroDef => {
            heroListEl.appendChild(createRecruitmentCard(heroDef, 'hero', state));
        });
    } else if (flibustierDef.status === 'recruited') {
        heroListEl.appendChild(createElement('p', { className: 'empty-list-message', textContent: 'Aucun nouveau héros à recruter.' }));
    }

    // Populate specialists list
    const specialistsToDisplay = Object.values(SPECIALIST_DEFINITIONS).filter(def => {
        const specialistState = state.tavern.specialists[def.id.toUpperCase()];
        return specialistState?.status === 'available';
    });

    if (specialistsToDisplay.length > 0) {
        specialistsToDisplay.forEach(specialistDef => {
            specialistListEl.appendChild(createRecruitmentCard(specialistDef, 'specialist', state));
        });
    } else {
        specialistListEl.appendChild(createElement('p', { className: 'empty-list-message', textContent: 'Aucun spécialiste disponible pour le moment.' }));
    }

    // Add a single event listener for recruitment buttons
    container.addEventListener('click', (e) => {
        const recruitHeroButton = e.target.closest('.recruit-hero-btn');
        if (recruitHeroButton && !recruitHeroButton.disabled) {
            eventBus.emit('ui_recruit_hero_clicked', { heroId: recruitHeroButton.dataset.heroId });
            return;
        }
        
        const recruitSpecialistButton = e.target.closest('.recruit-specialist-btn');
        if (recruitSpecialistButton && !recruitSpecialistButton.disabled) {
            eventBus.emit('ui_recruit_specialist_clicked', { specialistId: recruitSpecialistButton.dataset.specialistId });
        }
    });
}
