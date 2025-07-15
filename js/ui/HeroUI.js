// js/ui/HeroUI.js

import { createElement } from '../utils/domHelper.js';
import { ARMOR_CONSTANT, ARMOR_DECAY_FACTOR } from '../managers/DungeonManager.js';
import { Duelist } from '../entities/Duelist.js';
import { Protector } from '../entities/Protector.js';
import { Priest } from '../entities/Priest.js';
import { Flibustier } from '../entities/Flibustier.js';

const heroesAreaEl = document.getElementById('heroes-area');
const partyPowerScoreEl = document.getElementById('party-power-score');
const partyCombatRatingEl = document.getElementById('party-combat-rating');

function calculatePartyPowerScore(heroes, state) {
    if (!heroes || heroes.length === 0) return 0;
    return Math.floor(heroes.reduce((total, hero) => total + hero.getPowerScore(state), 0));
}

function calculatePartyCombatRating(heroes) {
    if (!heroes || heroes.length === 0) return 0;

    let totalDamage = 0;
    let totalSurvival = 0;

    heroes.forEach(hero => {
        const history = hero.history;
        if (!history) return;

        totalDamage += (history.damageDealt || []).reduce((a, b) => a + b, 0);
        totalSurvival += (history.healingReceived || []).reduce((a, b) => a + b, 0);
        totalSurvival += (history.damageMitigated || []).reduce((a, b) => a + b, 0);
        totalSurvival += (history.damageAvoided || []).reduce((a, b) => a + b, 0);
        totalSurvival += (history.shieldAbsorption || []).reduce((a, b) => a + b, 0);
    });

    if (totalDamage === 0 && totalSurvival === 0) return 0;
    
    const rating = Math.sqrt(Math.max(1, totalDamage) * Math.max(1, totalSurvival));

    return Math.floor(rating);
}

function createStatLine(label, baseValue, change, options = {}) {
    const { isPercent = false, decimals = 0, tooltip = '' } = options;
    const p = createElement('p', { title: tooltip });
    const labelSpan = `<span>${label}</span>`;
    let valueSpan;
    const finalValue = (baseValue ?? 0) + (change ?? 0);

    if (change && parseFloat(change.toFixed(decimals)) !== 0) {
        const valueString = isPercent ? `${(finalValue * 100).toFixed(decimals)}%` : finalValue.toFixed(decimals);
        const changeSign = change > 0 ? '+' : '';
        const changeString = isPercent ? (change * 100).toFixed(decimals) : change.toFixed(decimals);
        const changeClass = change > 0 ? 'stat-increase' : 'stat-decrease';
        valueSpan = `<span>${valueString} <span class="${changeClass}">(${changeSign}${changeString})</span></span>`;
    } else {
        const valueString = isPercent ? `${((baseValue ?? 0) * 100).toFixed(decimals)}%` : (baseValue ?? 0).toFixed(decimals);
        valueSpan = `<span>${valueString}</span>`;
    }
    
    p.innerHTML = labelSpan + valueSpan;
    return p;
}

function createHeroEquipment(hero) {
    const equipmentDisplay = createElement('div', { className: 'hero-equipment-display' });
    const equipmentSlots = ['arme', 'torse', 'tete', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];
    equipmentSlots.forEach(slot => {
        const item = hero.equipment[slot];
        const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
        const itemDiv = createElement('div', { className: 'equipped-item', dataset: { slot } });
        const nameSpan = createElement('span', { className: 'equipped-item-name' });
        
        if (item) {
            itemDiv.className = `equipped-item rarity-${item.rarity}`;
            nameSpan.textContent = `${slotName}: ${item.name}`;
            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(createElement('button', { className: 'unequip-btn', textContent: 'X', title: 'Déséquiper', dataset: { heroId: hero.id, slot: slot } }));
        } else {
            nameSpan.textContent = `${slotName}: Aucun`;
            itemDiv.appendChild(nameSpan);
        }
        equipmentDisplay.appendChild(itemDiv);
    });
    return equipmentDisplay;
}

function createHeroCard(hero, index, heroesCount, isCollapsed, eventBus, state) {
    const card = createElement('div', { className: 'hero-card', dataset: { heroId: hero.id } });

    const mainContent = createElement('div', { className: 'hero-main-content' });
    const controls = createElement('div', { className: 'hero-controls' });
    
    // CORRECTION : Le titre contient maintenant le nom et le conteneur de ressource spéciale
    const titleDiv = createElement('div', { className: 'hero-title' });
    const titleText = createElement('div', { className: 'hero-title-text' });
    titleText.appendChild(createElement('strong', { className: 'hero-name' }));
    titleText.appendChild(createElement('span', { className: 'hero-level' }));
    titleDiv.appendChild(titleText);
    titleDiv.appendChild(createElement('div', { className: 'hero-special-resource-container' })); // Nouveau conteneur
    
    const collapsedInfo = createElement('div', { className: 'collapsed-info' });
    collapsedInfo.appendChild(createElement('p', { className: 'hero-stats dps-text' }));

    const hpBarContainer = createElement('div', { className: 'progress-bar-container hero-hp-container' });
    hpBarContainer.appendChild(createElement('div', { className: 'progress-bar-fill hp hero-hp-bar' }));
    hpBarContainer.appendChild(createElement('div', { className: 'progress-bar-fill shield hero-shield-bar' }));
    
    const xpBarContainer = createElement('div', { className: 'progress-bar-container hero-xp-bar' });
    xpBarContainer.appendChild(createElement('div', { className: 'progress-bar-fill xp hero-xp-bar-fill' }));

    mainContent.appendChild(titleDiv);
    mainContent.appendChild(createElement('button', { className: 'utility-icon-btn stats-btn', title: 'Rapport de Combat', textContent: '📊', dataset: { heroId: hero.id } }));
    mainContent.appendChild(collapsedInfo);
    mainContent.appendChild(createElement('div', { className: 'hero-details-container' }));
    mainContent.appendChild(hpBarContainer);
    mainContent.appendChild(createElement('div', { className: 'collapsed-buffs-container' }));
    mainContent.appendChild(createElement('div', { className: 'buffs-container' }));
    mainContent.appendChild(createElement('p', { className: 'hero-stats xp-text' }));
    mainContent.appendChild(xpBarContainer);
    
    // CORRECTION : L'ancien conteneur de doublons est supprimé
    // mainContent.appendChild(createElement('div', { className: 'hero-doubloons-container' }));

    mainContent.appendChild(createHeroEquipment(hero));
    mainContent.appendChild(createElement('div', { className: 'power-score-preview' }));
    
    controls.appendChild(createElement('button', { className: 'toggle-view-btn', dataset: { heroId: hero.id } }));
    controls.appendChild(createElement('button', { className: 'move-hero-btn up', title: 'Monter', textContent: '▲', dataset: { heroId: hero.id, direction: 'up' } }));
    controls.appendChild(createElement('button', { className: 'move-hero-btn down', title: 'Descendre', textContent: '▼', dataset: { heroId: hero.id, direction: 'down' } }));

    card.appendChild(mainContent);
    card.appendChild(controls);

    updateHeroCard(card, hero, index, heroesCount, isCollapsed, null, state);
    return card;
}

function updateHeroDetails(detailsContainer, hero, itemToEquip, state) {
    detailsContainer.innerHTML = '';
    let changes = {};
    if (itemToEquip) {
        changes = hero.calculateStatChanges(state, itemToEquip);
    }
    const currentStats = hero.getAllStats();
    const currentFloor = state.dungeonFloor;
    const dynamicArmorConstant = ARMOR_CONSTANT * Math.pow(ARMOR_DECAY_FACTOR, currentFloor - 1);

    const attributesGroup = createElement('div', { className: 'stats-group' });
    attributesGroup.innerHTML = '<h4>Attributs</h4>';
    attributesGroup.appendChild(createStatLine('Force', currentStats.strength, changes.strength));
    attributesGroup.appendChild(createStatLine('Dextérité', currentStats.dexterity, changes.dexterity));
    attributesGroup.appendChild(createStatLine('Intelligence', currentStats.intelligence, changes.intelligence));
    attributesGroup.appendChild(createStatLine('Endurance', currentStats.endurance, changes.endurance));
    
    const combatGroup = createElement('div', { className: 'stats-group' });
    combatGroup.innerHTML = '<h4>Combat</h4>';
    combatGroup.appendChild(createStatLine('Dégâts', currentStats.damage, changes.damage, { decimals: 1, tooltip: `Type: ${hero.definition.damageType}` }));
    combatGroup.appendChild(createStatLine('Vit. Atk', currentStats.attackSpeed, changes.attackSpeed, { decimals: 2, tooltip: 'Attaques par seconde' }));
    combatGroup.appendChild(createStatLine('Chance Crit.', currentStats.critChance, changes.critChance, { isPercent: true, decimals: 1 }));
    combatGroup.appendChild(createStatLine('Dégâts Crit.', currentStats.critDamage, changes.critDamage, { isPercent: true, decimals: 0 }));
    
    const defenseGroup = createElement('div', { className: 'stats-group' });
    defenseGroup.innerHTML = '<h4>Défense</h4>';
    const armorReduction = (100 * (currentStats.armor + (changes.armor || 0)) / ((currentStats.armor + (changes.armor || 0)) + dynamicArmorConstant)).toFixed(0);
    defenseGroup.appendChild(createStatLine('Armure', currentStats.armor, changes.armor, { tooltip: `Réduit les dégâts de ${armorReduction}%` }));
    
    if (hero instanceof Duelist) {
        const riposteTooltip = "Chance d'annuler une attaque et de déclencher un effet :\n- Esquive (50%)\n- Parade (35%, renvoie 50% des dégâts)\n- Contre-attaque (15%, inflige 100% de vos dégâts)";
        defenseGroup.appendChild(createStatLine('Riposte', hero.riposteChance, changes.riposteChance, { isPercent: true, decimals: 1, tooltip: riposteTooltip }));
    }
    
    defenseGroup.appendChild(createStatLine('Régén. HP', currentStats.hpRegen, changes.hpRegen, { decimals: 1, tooltip: 'HP par seconde' }));

    const utilityGroup = createElement('div', { className: 'stats-group' });
    utilityGroup.innerHTML = '<h4>Utilitaire</h4>';
    utilityGroup.appendChild(createStatLine('Vol de Vie', currentStats.lifeSteal, changes.lifeSteal, { isPercent: true, decimals: 1 }));
    utilityGroup.appendChild(createStatLine('Épines', currentStats.thorns, changes.thorns));
    utilityGroup.appendChild(createStatLine('Or trouvé', currentStats.goldFind, changes.goldFind, { isPercent: true, decimals: 0 }));

    if (hero instanceof Protector) {
        const protectorGroup = createElement('div', { className: 'stats-group' });
        protectorGroup.innerHTML = '<h4>Protecteur</h4>';
        protectorGroup.appendChild(createStatLine('Puiss. Bouclier', currentStats.shieldPotency, changes.shieldPotency, { isPercent: true, decimals: 0 }));
        protectorGroup.appendChild(createStatLine('Charge Rayon', currentStats.beamChargeRate, changes.beamChargeRate, { isPercent: true, decimals: 0 }));
        detailsContainer.appendChild(protectorGroup);
    }
    if (hero instanceof Priest) {
        const priestGroup = createElement('div', { className: 'stats-group' });
        priestGroup.innerHTML = '<h4>Prêtre</h4>';
        priestGroup.appendChild(createStatLine('Puiss. Soins', hero.finalHealPower, 0, { decimals: 1 }));
        detailsContainer.appendChild(priestGroup);
    }

    detailsContainer.appendChild(attributesGroup);
    detailsContainer.appendChild(combatGroup);
    detailsContainer.appendChild(defenseGroup);
    detailsContainer.appendChild(utilityGroup);
}

function updatePowerScorePreview(previewContainer, hero, itemToEquip, state) {
    previewContainer.innerHTML = '';
    if (!itemToEquip) return;

    const originalEquipment = { ...hero.equipment };
    const currentHeroScore = hero.getPowerScore(state);

    let bestScoreIncrease = -Infinity;
    
    const targetSlots = [];
    if (itemToEquip.baseDefinition.slot === 'ring') {
        targetSlots.push('anneau1', 'anneau2');
    } else {
        targetSlots.push(itemToEquip.baseDefinition.slot);
    }

    targetSlots.forEach(slot => {
        const tempEquipment = { ...originalEquipment, [slot]: itemToEquip };
        hero.equipment = tempEquipment;
        hero.recalculateStats(state);
        const newScore = hero.getPowerScore(state);
        const increase = newScore - currentHeroScore;
        if (increase > bestScoreIncrease) {
            bestScoreIncrease = increase;
        }
    });

    hero.equipment = originalEquipment;
    hero.recalculateStats(state);

    const powerChange = bestScoreIncrease;
    const sign = powerChange >= 0 ? '+' : '';
    const changeClass = powerChange >= 0 ? 'stat-increase' : 'stat-decrease';
    
    previewContainer.innerHTML = `Puissance : <span class="${changeClass}">${sign}${Math.floor(powerChange)}</span>`;
}


function updateHeroBuffs(buffsContainer, hero) {
    buffsContainer.innerHTML = '';
    hero.buffs.activeBuffs?.forEach(buff => {
        const buffIcon = createElement('div', {
            className: 'buff-icon',
            textContent: buff.name.substring(0, 1),
            title: `${buff.name}: +${buff.value.toFixed(1)}${buff.stat.includes('Percent') ? '%' : ''} (${buff.duration.toFixed(0)}s)`
        });
        const buffBar = createElement('div', {className: 'buff-duration-bar', style: { width: `${(buff.duration / buff.maxDuration) * 100}%` }});
        buffIcon.appendChild(buffBar);
        buffsContainer.appendChild(buffIcon);
    });
}

function updateCollapsedBuffs(buffsContainer, hero) {
    if (!buffsContainer) return;
    buffsContainer.innerHTML = '';
    hero.buffs.activeBuffs?.forEach(buff => {
        const buffIcon = createElement('div', {
            className: 'collapsed-buff-icon',
            textContent: buff.name.substring(0, 1),
            title: `${buff.name}: +${buff.value.toFixed(1)}${buff.stat.includes('Percent') ? '%' : ''} (${buff.duration.toFixed(0)}s)`
        });
        const buffBar = createElement('div', {className: 'buff-duration-bar', style: { width: `${(buff.duration / buff.maxDuration) * 100}%` }});
        buffIcon.appendChild(buffBar);
        buffsContainer.appendChild(buffIcon);
    });
}

function updateHeroEquipment(equipmentContainer, hero) {
    const equipmentSlots = ['arme', 'torse', 'tete', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];
    equipmentSlots.forEach(slot => {
        const item = hero.equipment[slot];
        const itemDiv = equipmentContainer.querySelector(`.equipped-item[data-slot="${slot}"]`);
        if (!itemDiv) return;

        const nameSpan = itemDiv.querySelector('.equipped-item-name');
        let unequipBtn = itemDiv.querySelector('.unequip-btn');

        if (item) {
            itemDiv.className = `equipped-item rarity-${item.rarity}`;
            nameSpan.textContent = `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item.name}`;
            if (!unequipBtn) {
                unequipBtn = createElement('button', { className: 'unequip-btn', textContent: 'X', title: 'Déséquiper', dataset: { heroId: hero.id, slot: slot } });
                itemDiv.appendChild(unequipBtn);
            }
        } else {
            itemDiv.className = 'equipped-item';
            nameSpan.textContent = `${slot.charAt(0).toUpperCase() + slot.slice(1)}: Aucun`;
            unequipBtn?.remove();
        }
    });
}

// CORRECTION : Nouvelle fonction pour mettre à jour les barres de ressources spéciales
function updateSpecialResourceDisplay(container, hero) {
    container.innerHTML = ''; // Vider le conteneur
    
    if (hero instanceof Flibustier) {
        for (let i = 0; i < hero.doubloons; i++) {
            const doubloonEl = createElement('span', { className: 'resource-bar doubloon' });
            container.appendChild(doubloonEl);
        }
    } else if (hero instanceof Protector) {
        // Affiche une barre pour chaque instance du cycle d'attaque, jusqu'à 10
        for (let i = 1; i < hero.attackCycleInstance; i++) {
            const chargeEl = createElement('span', { className: 'resource-bar beam-charge' });
            container.appendChild(chargeEl);
        }
    }
}

function updateHeroCard(card, hero, index, heroesCount, isCollapsed, itemToEquip, state) {
    card.classList.toggle('collapsed', isCollapsed);
    card.classList.toggle('recovering', hero.status === 'recovering');
    card.classList.toggle('equip-mode', !!itemToEquip);
    
    card.querySelector('.hero-name').textContent = hero.name;
    card.querySelector('.hero-level').textContent = `Niveau ${hero.level}`;
    card.querySelector('.hero-controls .toggle-view-btn').textContent = isCollapsed ? '+' : '-';
    
    updateHeroDetails(card.querySelector('.hero-details-container'), hero, itemToEquip, state);
    updateHeroBuffs(card.querySelector('.buffs-container'), hero);
    updateCollapsedBuffs(card.querySelector('.collapsed-buffs-container'), hero);
    updateHeroEquipment(card.querySelector('.hero-equipment-display'), hero);
    updatePowerScorePreview(card.querySelector('.power-score-preview'), hero, itemToEquip, state);
    
    // CORRECTION : Appel de la nouvelle fonction de mise à jour
    updateSpecialResourceDisplay(card.querySelector('.hero-special-resource-container'), hero);

    updateSingleHeroVitals(hero, card);

    const upBtn = card.querySelector('.move-hero-btn.up');
    const downBtn = card.querySelector('.move-hero-btn.down');
    upBtn.style.visibility = index > 0 ? 'visible' : 'hidden';
    downBtn.style.visibility = index < heroesCount - 1 ? 'visible' : 'hidden';
}

function updateSingleHeroVitals(hero, card) {
    if (!card) return;

    const hpPercent = (hero.hp / hero.maxHp) * 100;
    card.querySelector('.hero-hp-bar').style.width = `${hpPercent}%`;
    
    const shieldPercent = (hero.buffs.shieldHp / hero.maxHp) * 100;
    card.querySelector('.hero-shield-bar').style.width = `${Math.min(100, shieldPercent)}%`;

    const dpsTextEl = card.querySelector('.hero-stats.dps-text');
    if (dpsTextEl) {
        const shieldText = hero.buffs.shieldHp > 0 ? ` (+${Math.ceil(hero.buffs.shieldHp)})` : '';
        let combatStatText;
        if (hero instanceof Priest) {
            combatStatText = `HPS : ${(hero.finalHealPower || 0).toFixed(1)}`; 
        } else {
            combatStatText = `DPS : ${(hero.damage * hero.attackSpeed).toFixed(1)}`;
        }
        dpsTextEl.textContent = `HP : ${Math.ceil(hero.hp)}/${hero.maxHp}${shieldText} | ${combatStatText}`;
    }

    const xpPercent = (hero.xp / hero.xpToNextLevel) * 100;
    card.querySelector('.hero-xp-bar-fill').style.width = `${xpPercent}%`;
    card.querySelector('.xp-text').textContent = `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP`;

    card.classList.toggle('is-low-hp', hero.isFighting() && hpPercent < 25);
    updateCollapsedBuffs(card.querySelector('.collapsed-buffs-container'), hero);
    
    // CORRECTION : Mise à jour des ressources spéciales également dans cette fonction
    updateSpecialResourceDisplay(card.querySelector('.hero-special-resource-container'), hero);
}

function updatePartyScoresUI(heroes, state) {
    if (partyPowerScoreEl) {
        const powerScore = calculatePartyPowerScore(heroes, state);
        partyPowerScoreEl.textContent = powerScore.toLocaleString('fr-FR');
    }
    if (partyCombatRatingEl) {
        const combatRating = calculatePartyCombatRating(heroes);
        partyCombatRatingEl.textContent = combatRating.toLocaleString('fr-FR');
    }
}

export function updateHeroVitals(heroes, state) {
    if (!heroes) return;
    heroes.forEach(hero => {
        const card = heroesAreaEl.querySelector(`.hero-card[data-hero-id="${hero.id}"]`);
        if (card) {
            updateSingleHeroVitals(hero, card);
        }
    });
    updatePartyScoresUI(heroes, state);
}

export function renderHeroesUI(heroes, itemToEquip, heroCardState, eventBus, state) {
    const existingCards = new Map();
    heroesAreaEl.querySelectorAll('.hero-card').forEach(card => {
        existingCards.set(card.dataset.heroId, card);
    });

    const heroesInOrder = heroes.map(h => h.id);
    const cardsInDom = Array.from(heroesAreaEl.children);
    const cardsInOrder = cardsInDom.map(c => c.dataset.heroId);

    if (JSON.stringify(heroesInOrder) !== JSON.stringify(cardsInOrder)) {
        heroes.forEach(hero => {
            const card = cardsInDom.find(c => c.dataset.heroId === hero.id);
            if (card) heroesAreaEl.appendChild(card);
        });
    }
    
    heroes.forEach((hero, index) => {
        const isCollapsed = heroCardState[hero.id]?.isCollapsed ?? false;
        let card = existingCards.get(hero.id);

        if (card) {
            updateHeroCard(card, hero, index, heroes.length, isCollapsed, itemToEquip, state);
            existingCards.delete(hero.id);
        } else {
            card = createHeroCard(hero, index, heroes.length, isCollapsed, eventBus, state);
            heroesAreaEl.appendChild(card);
        }
    });

    existingCards.forEach(card => card.remove());

    updatePartyScoresUI(heroes, state);
}
