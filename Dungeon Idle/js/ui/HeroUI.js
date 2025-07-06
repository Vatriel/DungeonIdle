// js/ui/HeroUI.js

import { createElement } from '../utils/domHelper.js'; // Importe la fonction createElement
// Importe les constantes d'armure depuis DungeonManager
import { ARMOR_CONSTANT, ARMOR_DECAY_FACTOR } from '../managers/DungeonManager.js';

const heroesAreaEl = document.getElementById('heroes-area');

// Helper pour créer une ligne de stat, avec ou sans comparaison
function createStatLine(label, baseValue, change, options = {}) {
    const { isPercent = false, decimals = 0, tooltip = '' } = options;
    
    const p = createElement('p');
    if (tooltip) p.title = tooltip;

    const labelSpan = `<span>${label}</span>`;
    let valueSpan;

    // Calcule la valeur finale et le changement arrondi
    const finalValue = baseValue + (change || 0);
    const roundedChange = change ? parseFloat(change.toFixed(decimals)) : 0;

    // Si un changement existe et qu'il est significatif, on affiche la comparaison
    if (change && roundedChange !== 0) {
        const valueString = isPercent ? `${(finalValue * 100).toFixed(decimals)}%` : finalValue.toFixed(decimals);
        const changeSign = change > 0 ? '+' : '';
        const changeString = isPercent ? (change * 100).toFixed(decimals) : change.toFixed(decimals);
        const changeClass = change > 0 ? 'stat-increase' : 'stat-decrease';
        
        valueSpan = `<span>${valueString} <span class="${changeClass}">(${changeSign}${changeString})</span></span>`;
    } else {
        // Affichage normal sans comparaison
        const valueString = isPercent ? `${(baseValue * 100).toFixed(decimals)}%` : baseValue.toFixed(decimals);
        valueSpan = `<span>${valueString}</span>`;
    }
    
    p.innerHTML = labelSpan + valueSpan;
    return p;
}

/**
 * Rend les détails des statistiques d'un héros, avec comparaison si un item est en cours d'équipement.
 * @param {Hero} hero - Le héros à afficher.
 * @param {Item|null} itemToEquip - L'item sélectionné pour l'équipement (pour la comparaison).
 * @param {number} currentFloor - L'étage actuel du donjon, nécessaire pour le calcul de l'armure.
 * @returns {HTMLElement} Le conteneur des détails du héros.
 */
function renderHeroDetails(hero, itemToEquip, currentFloor) {
    const detailsContainer = createElement('div', { className: 'hero-details-container' });

    let changes = {};
    const currentStats = hero.getAllStats();
    if (itemToEquip) {
        // Calcule les changements de stats si l'item était équipé
        changes = hero.calculateStatChanges(itemToEquip);
    }

    // Calcul de la constante d'armure dynamique pour l'affichage de l'infobulle
    // Le facteur est appliqué à partir du 2ème étage (étage 1 => puissance 0, étage 2 => puissance 1)
    const dynamicArmorConstant = ARMOR_CONSTANT * Math.pow(ARMOR_DECAY_FACTOR, currentFloor - 1);

    // --- Section Attributs ---
    const attributesGroup = createElement('div', { className: 'stats-group' });
    attributesGroup.innerHTML = '<h4>Attributs</h4>';
    attributesGroup.appendChild(createStatLine('Force', currentStats.strength, changes.strength));
    attributesGroup.appendChild(createStatLine('Dextérité', currentStats.dexterity, changes.dexterity));
    attributesGroup.appendChild(createStatLine('Intelligence', currentStats.intelligence, changes.intelligence));
    attributesGroup.appendChild(createStatLine('Endurance', currentStats.endurance, changes.endurance));
    detailsContainer.appendChild(attributesGroup);

    // --- Section Combat ---
    const combatGroup = createElement('div', { className: 'stats-group' });
    combatGroup.innerHTML = '<h4>Combat</h4>';
    combatGroup.appendChild(createStatLine('Dégâts', currentStats.damage, changes.damage, { decimals: 1, tooltip: `Type: ${hero.definition.damageType}` }));
    combatGroup.appendChild(createStatLine('Vit. Atk', currentStats.attackSpeed, changes.attackSpeed, { decimals: 2, tooltip: 'Attaques par seconde' }));
    combatGroup.appendChild(createStatLine('Chance Crit.', currentStats.critChance, changes.critChance, { isPercent: true, decimals: 1 }));
    combatGroup.appendChild(createStatLine('Dégâts Crit.', currentStats.critDamage, changes.critDamage, { isPercent: true, decimals: 0 }));
    detailsContainer.appendChild(combatGroup);

    // --- Section Défense ---
    const defenseGroup = createElement('div', { className: 'stats-group' });
    defenseGroup.innerHTML = '<h4>Défense</h4>';
    // Calcule la réduction de dégâts de l'armure pour l'infobulle en utilisant la constante dynamique
    const armorReduction = (100 * (currentStats.armor + (changes.armor || 0)) / ((currentStats.armor + (changes.armor || 0)) + dynamicArmorConstant)).toFixed(0);
    defenseGroup.appendChild(createStatLine('Armure', currentStats.armor, changes.armor, { tooltip: `Réduit les dégâts de ${armorReduction}%` }));
    
    // Ligne des HP avec comparaison
    const hpLine = createElement('p');
    hpLine.classList.add('hero-hp-display');
    const hpLabel = `<span>HP</span>`;
    let hpValueHTML;
    const roundedMaxHpChange = changes.maxHp ? Math.round(changes.maxHp) : 0;

    if (changes.maxHp && roundedMaxHpChange !== 0) {
        const finalMaxHp = Math.floor(currentStats.maxHp + changes.maxHp);
        const sign = changes.maxHp > 0 ? '+' : '';
        const changeClass = changes.maxHp > 0 ? 'stat-increase' : 'stat-decrease';
        const changeText = ` <span class="${changeClass}">(${sign}${roundedMaxHpChange})</span>`;
        hpValueHTML = `<span>${Math.ceil(hero.hp)}/${finalMaxHp}${changeText}</span>`;
    } else {
        const finalMaxHp = Math.floor(currentStats.maxHp + (changes.maxHp || 0));
        hpValueHTML = `<span><span class="hero-current-hp">${Math.ceil(hero.hp)}</span>/${finalMaxHp}</span>`;
    }
    hpLine.innerHTML = hpLabel + hpValueHTML;
    defenseGroup.appendChild(hpLine);

    defenseGroup.appendChild(createStatLine('Régén. HP', currentStats.hpRegen, changes.hpRegen, { decimals: 1, tooltip: 'HP par seconde' }));
    detailsContainer.appendChild(defenseGroup);

    // --- Section Utilitaire ---
    const utilityGroup = createElement('div', { className: 'stats-group' });
    utilityGroup.innerHTML = '<h4>Utilitaire</h4>';
    utilityGroup.appendChild(createStatLine('Vol de Vie', currentStats.lifeSteal, changes.lifeSteal, { isPercent: true, decimals: 1 }));
    utilityGroup.appendChild(createStatLine('Épines', currentStats.thorns, changes.thorns));
    utilityGroup.appendChild(createStatLine('Or trouvé', currentStats.goldFind, changes.goldFind, { isPercent: true, decimals: 0 }));
    detailsContainer.appendChild(utilityGroup);

    return detailsContainer;
}

/**
 * Rend les icônes et barres de durée des buffs actifs d'un héros.
 * @param {Hero} hero - Le héros dont les buffs doivent être affichés.
 * @returns {HTMLElement} Le conteneur des buffs.
 */
function renderHeroBuffs(hero) {
    const buffsContainer = createElement('div', { className: 'buffs-container' });
    if (hero.activeBuffs) {
        hero.activeBuffs.forEach(buff => {
            const buffIcon = createElement('div', {
                className: 'buff-icon',
                textContent: buff.name.substring(0, 1), // Affiche la première lettre du nom du buff
                title: `${buff.name}: +${buff.value.toFixed(1)}${buff.stat.includes('Percent') ? '%' : ''} (${buff.duration.toFixed(0)}s)`
            });
            const buffBar = createElement('div', {className: 'buff-duration-bar'});
            buffBar.style.width = `${(buff.duration / buff.maxDuration) * 100}%`; // Barre de progression de la durée
            buffIcon.appendChild(buffBar);
            buffsContainer.appendChild(buffIcon);
        });
    }
    return buffsContainer;
}

/**
 * Rend la liste de l'équipement d'un héros.
 * @param {Hero} hero - Le héros dont l'équipement doit être affiché.
 * @returns {HTMLElement} Le conteneur de l'équipement.
 */
function renderHeroEquipment(hero) {
    const equipmentDisplay = createElement('div', { className: 'hero-equipment-display' });
    const equipmentSlots = ['arme', 'torse', 'tete', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];
    equipmentSlots.forEach(slot => {
        const item = hero.equipment[slot];
        // Formate le nom du slot pour l'affichage
        const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
        const itemDiv = createElement('div', { className: 'equipped-item' });
        if (item) {
            itemDiv.classList.add(`rarity-${item.rarity}`); // Ajoute la classe de rareté pour le style
            itemDiv.appendChild(createElement('span', { textContent: `${slotName}: ${item.name}` }));
            // Bouton pour déséquiper l'item
            itemDiv.appendChild(createElement('button', { className: 'unequip-btn', textContent: 'X', title: 'Déséquiper', dataset: { heroId: hero.id, slot: slot } }));
        } else {
            itemDiv.appendChild(createElement('span', { textContent: `${slotName}: Aucun` }));
        }
        equipmentDisplay.appendChild(itemDiv);
    });
    return equipmentDisplay;
}

/**
 * Crée une carte de héros complète.
 * @param {Hero} hero - Le héros à représenter.
 * @param {number} index - L'index du héros dans le tableau (pour les boutons de déplacement).
 * @param {number} heroesCount - Le nombre total de héros (pour les boutons de déplacement).
 * @param {boolean} isCollapsed - Indique si la carte doit être réduite.
 * @param {Item|null} itemToEquip - L'item sélectionné pour l'équipement.
 * @param {EventBus} eventBus - Le bus d'événements.
 * @param {number} currentFloor - L'étage actuel du donjon.
 * @returns {HTMLElement} La carte de héros.
 */
function createHeroCard(hero, index, heroesCount, isCollapsed, itemToEquip, eventBus, currentFloor) {
    const card = createElement('div', { className: 'hero-card', dataset: { heroId: hero.id } });
    if (isCollapsed) card.classList.add('collapsed'); // Ajoute la classe si la carte est réduite
    if (hero.status === 'recovering') card.classList.add('recovering'); // Style pour les héros en récupération
    if (itemToEquip) card.classList.add('equip-mode'); // Style si un item est en cours d'équipement

    // Ajoute une classe si le héros a peu de HP et est en combat
    if (hero.isFighting() && (hero.hp / hero.maxHp) < 0.25) {
        card.classList.add('is-low-hp');
    }

    // --- Logique de Drag & Drop pour équiper les items ---
    card.addEventListener('dragover', (event) => {
        event.preventDefault(); // Permet le drop
        card.classList.add('drag-over'); // Ajoute un style visuel au survol
    });
    card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over'); // Retire le style au départ du drag
    });
    card.addEventListener('drop', (event) => {
        event.preventDefault();
        card.classList.remove('drag-over');
        const inventoryIndex = event.dataTransfer.getData('text/plain'); // Récupère l'index de l'item
        if (inventoryIndex !== '') {
            eventBus.emit('item_dropped_on_hero', { // Émet l'événement de drop
                inventoryIndex: parseInt(inventoryIndex, 10),
                heroId: hero.id
            });
        }
    });

    const mainContent = createElement('div', { className: 'hero-main-content' });
    const controls = createElement('div', { className: 'hero-controls' });

    // Titre de la carte (Nom, Niveau, Bouton de bascule)
    const titleDiv = createElement('div', { className: 'hero-title' });
    titleDiv.appendChild(createElement('strong', { className: 'hero-name', textContent: hero.name }));
    const levelEl = createElement('span', { className: 'hero-level', textContent: `Niveau ${hero.level}` });
    titleDiv.appendChild(levelEl);
    titleDiv.appendChild(createElement('button', { className: 'toggle-view-btn', textContent: isCollapsed ? '+' : '-', dataset: { heroId: hero.id } }));
    mainContent.appendChild(titleDiv);
    
    // Informations affichées en mode réduit (DPS)
    const collapsedInfo = createElement('div', { className: 'collapsed-info' });
    const dps = (hero.damage * hero.attackSpeed).toFixed(1);
    collapsedInfo.appendChild(createElement('p', { className: 'hero-stats', textContent: `DPS: ${dps}` }));
    mainContent.appendChild(collapsedInfo);

    // Détails des statistiques (visibles en mode étendu)
    mainContent.appendChild(renderHeroDetails(hero, itemToEquip, currentFloor));
    
    // Barre de HP
    const hpBarContainer = createElement('div', { className: 'progress-bar-container' });
    hpBarContainer.appendChild(createElement('div', { className: 'progress-bar-fill hp hero-hp-bar' }));
    mainContent.appendChild(hpBarContainer);
    
    // Buffs actifs
    mainContent.appendChild(renderHeroBuffs(hero));
    // Texte d'XP
    mainContent.appendChild(createElement('p', { className: 'hero-stats xp-text', textContent: `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP` }));
    
    // Barre d'XP
    const xpBarContainer = createElement('div', { className: 'progress-bar-container hero-xp-bar' });
    xpBarContainer.appendChild(createElement('div', { className: 'progress-bar-fill xp hero-xp-bar-fill' }));
    mainContent.appendChild(xpBarContainer);

    // Équipement
    mainContent.appendChild(renderHeroEquipment(hero));

    // Boutons de déplacement du héros (haut/bas)
    if (index > 0) {
        controls.appendChild(createElement('button', { className: 'move-hero-btn up', title: 'Monter', textContent: '▲', dataset: { heroId: hero.id, direction: 'up' } }));
    } else {
        controls.appendChild(createElement('div', { className: 'move-placeholder' })); // Placeholder pour maintenir l'alignement
    }
    if (index < heroesCount - 1) {
        controls.appendChild(createElement('button', { className: 'move-hero-btn down', title: 'Descendre', textContent: '▼', dataset: { heroId: hero.id, direction: 'down' } }));
    } else {
        controls.appendChild(createElement('div', { className: 'move-placeholder' })); // Placeholder
    }

    card.appendChild(mainContent);
    card.appendChild(controls);
    return card;
}

/**
 * Met à jour uniquement les barres de vie et d'XP des héros.
 * Cette fonction est optimisée pour des mises à jour fréquentes sans recréer tout le DOM.
 * @param {Hero[]} heroes - Le tableau des héros.
 */
export function updateHeroVitals(heroes) {
    heroes.forEach(hero => {
        const card = heroesAreaEl.querySelector(`.hero-card[data-hero-id="${hero.id}"]`);
        if (!card) return; // Si la carte n'existe pas encore (pas encore rendue)

        // Met à jour la barre de HP
        const hpPercent = (hero.hp / hero.maxHp) * 100;
        const hpBarFill = card.querySelector('.hero-hp-bar');
        if (hpBarFill) {
            hpBarFill.style.width = `${hpPercent}%`;
        }

        // Met à jour le texte des HP
        const currentHpEl = card.querySelector('.hero-current-hp');
        if (currentHpEl) {
            currentHpEl.textContent = Math.ceil(hero.hp);
        }

        // Met à jour la barre d'XP
        const xpPercent = (hero.xp / hero.xpToNextLevel) * 100;
        const xpBarFill = card.querySelector('.hero-xp-bar-fill');
        if (xpBarFill) {
            xpBarFill.style.width = `${xpPercent}%`;
        }

        // Met à jour le texte d'XP
        const xpText = card.querySelector('.xp-text');
        if (xpText) {
            xpText.textContent = `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP`;
        }

        // Gère la classe 'is-low-hp' pour l'animation
        if (hero.isFighting() && hpPercent < 25) {
            card.classList.add('is-low-hp');
        } else {
            card.classList.remove('is-low-hp');
        }
    });
}

/**
 * Rend l'interface utilisateur complète des héros.
 * Cette fonction recrée les cartes des héros et est appelée lorsque des changements majeurs
 * nécessitent un rafraîchissement complet (ex: équipement, level up, recrutement).
 * @param {Hero[]} heroes - Le tableau des héros à afficher.
 * @param {Item|null} itemToEquip - L'item actuellement sélectionné pour l'équipement.
 * @param {object} heroCardState - L'état de réduction/extension de chaque carte de héros.
 * @param {EventBus} eventBus - Le bus d'événements.
 * @param {number} currentFloor - L'étage actuel du donjon.
 * @returns {HTMLElement} La carte de héros.
 */
export function renderHeroesUI(heroes, itemToEquip, heroCardState, eventBus, currentFloor) {
  heroesAreaEl.innerHTML = ''; // Vide la zone des héros
  heroes.forEach((hero, index) => {
    // Récupère l'état de réduction de la carte du héros
    const isCollapsed = heroCardState[hero.id] ? heroCardState[hero.id].isCollapsed : false;
    // Passe currentFloor à createHeroCard
    const card = createHeroCard(hero, index, heroes.length, isCollapsed, itemToEquip, eventBus, currentFloor);
    heroesAreaEl.appendChild(card); // Ajoute la carte au DOM

    // Ajoute l'animation de flash si le héros vient de monter de niveau (basé sur l'événement)
    // Cette logique est déplacée ici depuis game.js pour une meilleure séparation des préoccupations UI.
    if (heroCardState[hero.id] && heroCardState[hero.id].justLeveledUp) {
        const levelEl = card.querySelector('.hero-level');
        if (levelEl) {
            levelEl.classList.add('level-up-flash');
            levelEl.addEventListener('animationend', () => {
                levelEl.classList.remove('level-up-flash');
                // Réinitialise le drapeau après l'animation
                heroCardState[hero.id].justLeveledUp = false; 
            }, { once: true });
        }
    }
  });
}

