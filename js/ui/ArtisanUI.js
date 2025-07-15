// js/ui/ArtisanUI.js

import { createElement } from '../utils/domHelper.js';
import { ArtisanManager } from '../managers/ArtisanManager.js';
import { AFFIX_DEFINITIONS } from '../data/itemData.js';

const artisanPanelEl = document.getElementById('artisan-panel');
let stateCache = null;
let isLayoutCreated = false;
let eventBus = null;
let currentActiveTabId = 'artisan-recycle';

// NOUVEAU : Ordre des raretés pour le filtre
const RARITY_ORDER = ['defective', 'common', 'magic', 'rare', 'epic', 'legendary', 'mythic', 'artifact'];

/**
 * Creates the initial layout for the Artisan panel.
 */
function createArtisanLayout() {
    artisanPanelEl.innerHTML = '<h2>Forge</h2>';
    
    const resourcesEl = createElement('div', { className: 'artisan-resources' });
    resourcesEl.innerHTML = `
        <div class="essence-list">
            <p>Essences de base: <span id="artisan-base-essence">0</span></p>
            <p>Essences rares: <span id="artisan-rare-essence">0</span></p>
        </div>
    `;
    
    // NOUVEAU: Conteneur pour les boutons de recyclage
    const recycleButtonsContainer = createElement('div', { className: 'artisan-recycle-buttons' });

    const recycleBasicBtn = createElement('button', { 
        id: 'recycle-basic-btn', 
        className: 'btn discard-btn', 
        title: 'Recycle tous les objets non verrouillés de qualité Défectueux, Commun, Magique et Rare.', 
        textContent: 'Recyclage basique' 
    });
    recycleButtonsContainer.appendChild(recycleBasicBtn);

    const recycleAdvancedBtn = createElement('button', {
        id: 'recycle-advanced-btn',
        className: 'btn discard-btn',
        title: 'Recycle TOUS les objets non verrouillés, quelle que soit leur qualité. Soyez prudent !',
        textContent: 'Recyclage avancé'
    });
    recycleButtonsContainer.appendChild(recycleAdvancedBtn);
    
    resourcesEl.appendChild(recycleButtonsContainer); // Ajoute le conteneur de boutons au resourcesEl
    
    const mainLayout = createElement('div', { className: 'artisan-main-layout' });
    mainLayout.innerHTML = `
        <div class="artisan-inventory-column">
            <div class="artisan-inventory-header">
                <h3>Inventaire</h3>
            </div>
            <div class="artisan-inventory-grid"></div>
        </div>
        <div class="artisan-workspace">
            <div class="artisan-item-slot">
                <span class="placeholder">Sélectionnez un objet</span>
            </div>
            <div class="artisan-actions">
                <div class="tab-buttons">
                    <button class="tab-btn active" data-tab="artisan-recycle">Recycler</button>
                    <button class="tab-btn" data-tab="artisan-upgrade">Améliorer</button>
                    <button class="tab-btn" data-tab="artisan-reforge">Reforger</button>
                </div>
                <div id="artisan-recycle" class="tab-content active"></div>
                <div id="artisan-upgrade" class="tab-content"></div>
                <div id="artisan-reforge" class="tab-content"></div>
            </div>
        </div>
    `;
    
    artisanPanelEl.append(resourcesEl, mainLayout);
    isLayoutCreated = true;

    const tabButtons = artisanPanelEl.querySelectorAll('.tab-buttons .tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tab;
            currentActiveTabId = tabId; 
            tabButtons.forEach(btn => btn.classList.remove('active'));
            artisanPanelEl.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Écouteur pour le bouton "Recyclage basique"
    const recycleBasicBtnEl = artisanPanelEl.querySelector('#recycle-basic-btn');
    if (recycleBasicBtnEl) {
        recycleBasicBtnEl.addEventListener('click', () => {
            if (eventBus) {
                const message = "Êtes-vous sûr de vouloir recycler tous les objets Défectueux, Communs, Magiques et Rares non verrouillés ? Cette action est irréversible.";
                eventBus.emit('confirmation_requested', {
                    message,
                    action: { type: 'recycle_basic_items' } 
                });
            }
        });
    }

    // NOUVEAU : Écouteur pour le bouton "Recyclage avancé"
    const recycleAdvancedBtnEl = artisanPanelEl.querySelector('#recycle-advanced-btn');
    if (recycleAdvancedBtnEl) {
        recycleAdvancedBtnEl.addEventListener('click', () => {
            if (eventBus) {
                const message = "ATTENTION : Êtes-vous ABSOLUMENT sûr de vouloir recycler TOUS les objets non verrouillés de votre inventaire, quelle que soit leur qualité ? Cette action est irréversible et inclura les objets Épiques, Légendaires, Mythiques et Artefacts !";
                eventBus.emit('confirmation_requested', {
                    message,
                    action: { type: 'recycle_all_items_advanced' } 
                });
            }
        });
    }
}

/**
 * Updates the inventory grid in the Artisan panel.
 * @param {object} state - The current game state.
 */
function updateInventory(state) {
    const grid = artisanPanelEl.querySelector('.artisan-inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    state.inventory.forEach((item, index) => {
        const card = createElement('div', { className: 'artisan-item-card', dataset: { itemIndex: index } });
        if (index === state.ui.artisanSelectedItemIndex) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
        card.innerHTML = `<div class="artisan-item-info rarity-${item.rarity}">${item.name} (Niv. ${item.level})</div>`;
        grid.appendChild(card);
    });
}

/**
 * Updates the workspace area of the Artisan panel.
 * @param {object} state - The current game state.
 */
function updateWorkspace(state) {
    const itemIndex = state.ui.artisanSelectedItemIndex;
    const item = state.inventory[itemIndex];
    
    const slot = artisanPanelEl.querySelector('.artisan-item-slot');
    const recycleTab = document.getElementById('artisan-recycle');
    const upgradeTab = document.getElementById('artisan-upgrade');
    const reforgeTab = document.getElementById('artisan-reforge');

    if (!item) {
        slot.innerHTML = `<span class="placeholder">Sélectionnez un objet</span>`;
        recycleTab.innerHTML = '';
        upgradeTab.innerHTML = '';
        reforgeTab.innerHTML = '';
        return;
    }

    slot.innerHTML = `<div class="artisan-item-info rarity-${item.rarity}">${item.name} (Niv. ${item.level})</div>`;

    recycleTab.innerHTML = `
        <p class="artisan-action-description">Détruit l'objet pour récupérer des essences arcaniques. Cette action est irréversible.</p>
        <button class="artisan-confirm-btn discard-btn" data-action="recycle">Recycler</button>
    `;

    const upgradeCostGold = Math.floor(ArtisanManager.UPGRADE_COST.base * Math.pow(ArtisanManager.UPGRADE_COST.scale, item.upgradeLevel));
    const upgradeCostEssence = Math.floor(ArtisanManager.UPGRADE_COST.essenceBase * Math.pow(ArtisanManager.UPGRADE_COST.essenceScale, item.upgradeLevel));
    upgradeTab.innerHTML = `
        <p class="artisan-action-description">Améliore la statistique principale de l'objet. Chaque niveau augmente le coût de la prochaine amélioration.</p>
        <div class="artisan-cost">Coût : ${upgradeCostGold} Or, ${upgradeCostEssence} Essences</div>
        <button class="artisan-confirm-btn buy-btn" data-action="upgrade">Améliorer (+${item.upgradeLevel})</button>
    `;

    const reforgeCostGold = ArtisanManager.REFORGE_COST.base * (item.level);
    const reforgeCostEssence = ArtisanManager.REFORGE_COST.essenceBase;
    const reforgeCostEssenceRare = ArtisanManager.REFORGE_COST.essenceRare;
    let reforgeContent = `<p class="artisan-action-description">Choisissez un affixe à modifier. Une fois choisi, les autres affixes seront verrouillés pour cet objet. La reforge consomme des ressources et remplace l'affixe par un autre, aléatoirement.</p>`;
    
    const affixList = createElement('ul', { className: 'artisan-reforge-affix-list' });
    for (const key in item.affixes) {
        const isLocked = item.reforgedAffixKey && item.reforgedAffixKey !== key;
        const li = createElement('li');
        if (isLocked) li.classList.add('locked');

        li.innerHTML = `<span>${AFFIX_DEFINITIONS[key].text.replace('X', item.affixes[key])}</span>`;
        if (!isLocked) {
            const reforgeBtn = createElement('button', { textContent: 'Reforger', dataset: { action: 'reforge', affixKey: key } });
            reforgeBtn.classList.add('artisan-confirm-btn');
            li.appendChild(reforgeBtn);
        }
        affixList.appendChild(li);
    }
    reforgeTab.innerHTML = reforgeContent;
    reforgeTab.appendChild(affixList);
    reforgeTab.appendChild(createElement('div', { className: 'artisan-cost', textContent: `Coût : ${reforgeCostGold} Or, ${reforgeCostEssence} Essences, ${reforgeCostEssenceRare} Essences Rares` }));

    const actionButtons = artisanPanelEl.querySelectorAll('.artisan-confirm-btn');
    actionButtons.forEach(button => {
        button.removeEventListener('click', handleArtisanActionClick);
        button.addEventListener('click', handleArtisanActionClick);
    });
}

/**
 * Handles click events on Artisan action buttons.
 * @param {Event} e - The click event.
 */
function handleArtisanActionClick(e) {
    const action = e.target.dataset.action;
    const affixKey = e.target.dataset.affixKey;
    if (eventBus) {
        eventBus.emit('ui_artisan_action_clicked', { action, affixKey });
    }
}

/**
 * Renders or updates the Artisan UI.
 * @param {object} state - The current game state.
 * @param {EventBus} bus - The global EventBus instance.
 */
export function renderArtisanUI(state, bus) {
    stateCache = state;
    eventBus = bus;
    
    if (!state.artisanUnlocked) {
        artisanPanelEl.innerHTML = `
            <div class="locked-feature-message">
                <h2>Forge</h2>
                <p>Continuez d'explorer le donjon pour débloquer la forge.</p>
            </div>
        `;
        isLayoutCreated = false;
        return;
    }

    if (!isLayoutCreated) {
        createArtisanLayout();
    }

    document.getElementById('artisan-base-essence').textContent = state.resources.essences.base;
    document.getElementById('artisan-rare-essence').textContent = state.resources.essences.rare;

    // NOUVEAU : Affichage de la section du filtre de butin si le Forgeron est débloqué
    let lootFilterSection = artisanPanelEl.querySelector('#artisan-loot-filter-section');
    if (state.blacksmithUnlocked) {
        if (!lootFilterSection) {
            lootFilterSection = createElement('div', { id: 'artisan-loot-filter-section', className: 'artisan-section' });
            lootFilterSection.innerHTML = `
                <h3>Filtre de Butin (Forgeron)</h3>
                <div class="filter-controls">
                    <label class="checkbox-container">
                        <input type="checkbox" id="loot-filter-toggle" ${state.options.lootFilterActive ? 'checked' : ''}>
                        <span class="checkmark"></span> Activer le filtre
                    </label>
                    <div class="filter-rarity-select">
                        <label for="loot-filter-rarity">Recycler jusqu'à :</label>
                        <select id="loot-filter-rarity"></select>
                    </div>
                </div>
                <p class="filter-description">Les objets de rareté inférieure ou égale au seuil sélectionné seront automatiquement recyclés à la chute.</p>
            `;
            // Insérer la section après les ressources
            artisanPanelEl.querySelector('.artisan-resources').after(lootFilterSection);

            // Remplir la liste déroulante des raretés
            const raritySelect = lootFilterSection.querySelector('#loot-filter-rarity');
            RARITY_ORDER.forEach(rarity => {
                const option = createElement('option', { value: rarity, textContent: rarity.charAt(0).toUpperCase() + rarity.slice(1) });
                raritySelect.appendChild(option);
            });

            // Attacher les écouteurs d'événements
            lootFilterSection.querySelector('#loot-filter-toggle').addEventListener('change', (e) => {
                eventBus.emit('ui_toggle_loot_filter_clicked', { active: e.target.checked });
            });
            lootFilterSection.querySelector('#loot-filter-rarity').addEventListener('change', (e) => {
                eventBus.emit('ui_loot_filter_rarity_changed', { rarity: e.target.value });
            });
        }
        // Mettre à jour l'état de la sélection de rareté
        lootFilterSection.querySelector('#loot-filter-rarity').value = state.options.lootFilterRarityThreshold;
        lootFilterSection.querySelector('#loot-filter-toggle').checked = state.options.lootFilterActive;
        lootFilterSection.classList.remove('hidden');
    } else {
        if (lootFilterSection) {
            lootFilterSection.classList.add('hidden');
        }
    }

    updateInventory(state);
    updateWorkspace(state);

    const activeTabButton = artisanPanelEl.querySelector(`.tab-buttons button[data-tab="${currentActiveTabId}"]`);
    const activeTabContent = document.getElementById(currentActiveTabId);

    if (activeTabButton && activeTabContent) {
        artisanPanelEl.querySelectorAll('.tab-buttons .tab-btn').forEach(btn => btn.classList.remove('active'));
        artisanPanelEl.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        activeTabButton.classList.add('active');
        activeTabContent.classList.add('active');
    }
}
