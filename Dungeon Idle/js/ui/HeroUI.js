// js/ui/HeroUI.js

const heroesAreaEl = document.getElementById('heroes-area');

function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.textContent) el.textContent = options.textContent;
    if (options.title) el.title = options.title;
    if (options.dataset) {
        for (const key in options.dataset) {
            el.dataset[key] = options.dataset[key];
        }
    }
    return el;
}

// Helper pour créer une ligne de stat, avec ou sans comparaison
function createStatLine(label, baseValue, change, options = {}) {
    const { isPercent = false, decimals = 0, tooltip = '' } = options;
    
    const p = createElement('p');
    if (tooltip) p.title = tooltip;

    const labelSpan = `<span>${label}</span>`;
    let valueSpan;

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
        // Affichage normal
        const valueString = isPercent ? `${(baseValue * 100).toFixed(decimals)}%` : baseValue.toFixed(decimals);
        valueSpan = `<span>${valueString}</span>`;
    }
    
    p.innerHTML = labelSpan + valueSpan;
    return p;
}


function renderHeroDetails(hero, itemToEquip) {
    const detailsContainer = createElement('div', { className: 'hero-details-container' });

    let changes = {};
    const currentStats = hero.getAllStats();
    if (itemToEquip) {
        changes = hero.calculateStatChanges(itemToEquip);
    }

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
    // CORRECTION: Application des décimales demandées
    combatGroup.appendChild(createStatLine('Vit. Atk', currentStats.attackSpeed, changes.attackSpeed, { decimals: 2, tooltip: 'Attaques par seconde' }));
    combatGroup.appendChild(createStatLine('Chance Crit.', currentStats.critChance, changes.critChance, { isPercent: true, decimals: 1 }));
    combatGroup.appendChild(createStatLine('Dégâts Crit.', currentStats.critDamage, changes.critDamage, { isPercent: true, decimals: 0 }));
    detailsContainer.appendChild(combatGroup);

    // --- Section Défense ---
    const defenseGroup = createElement('div', { className: 'stats-group' });
    defenseGroup.innerHTML = '<h4>Défense</h4>';
    const armorReduction = (100 * (currentStats.armor + (changes.armor || 0)) / ((currentStats.armor + (changes.armor || 0)) + 200)).toFixed(0);
    defenseGroup.appendChild(createStatLine('Armure', currentStats.armor, changes.armor, { tooltip: `Réduit les dégâts de ${armorReduction}%` }));
    
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

    // CORRECTION: Application des décimales demandées
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


function renderHeroBuffs(hero) {
    const buffsContainer = createElement('div', { className: 'buffs-container' });
    if (hero.activeBuffs) {
        hero.activeBuffs.forEach(buff => {
            const buffIcon = createElement('div', {
                className: 'buff-icon',
                textContent: buff.name.substring(0, 1),
                title: `${buff.name}: +${buff.value.toFixed(1)}${buff.stat.includes('Percent') ? '%' : ''} (${buff.duration.toFixed(0)}s)`
            });
            const buffBar = createElement('div', {className: 'buff-duration-bar'});
            buffBar.style.width = `${(buff.duration / buff.maxDuration) * 100}%`;
            buffIcon.appendChild(buffBar);
            buffsContainer.appendChild(buffIcon);
        });
    }
    return buffsContainer;
}

function renderHeroEquipment(hero) {
    const equipmentDisplay = createElement('div', { className: 'hero-equipment-display' });
    const equipmentSlots = ['arme', 'torse', 'tete', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];
    equipmentSlots.forEach(slot => {
        const item = hero.equipment[slot];
        const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
        const itemDiv = createElement('div', { className: 'equipped-item' });
        if (item) {
            itemDiv.classList.add(`rarity-${item.rarity}`);
            itemDiv.appendChild(createElement('span', { textContent: `${slotName}: ${item.name}` }));
            itemDiv.appendChild(createElement('button', { className: 'unequip-btn', textContent: 'X', title: 'Déséquiper', dataset: { heroId: hero.id, slot: slot } }));
        } else {
            itemDiv.appendChild(createElement('span', { textContent: `${slotName}: Aucun` }));
        }
        equipmentDisplay.appendChild(itemDiv);
    });
    return equipmentDisplay;
}

function createHeroCard(hero, index, heroesCount, isCollapsed, itemToEquip, eventBus) {
    const card = createElement('div', { className: 'hero-card', dataset: { heroId: hero.id } });
    if (isCollapsed) card.classList.add('collapsed');
    if (hero.status === 'recovering') card.classList.add('recovering');
    if (itemToEquip) card.classList.add('equip-mode');

    if (hero.isFighting() && (hero.hp / hero.maxHp) < 0.25) {
        card.classList.add('is-low-hp');
    }

    card.addEventListener('dragover', (event) => {
        event.preventDefault();
        card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
    });
    card.addEventListener('drop', (event) => {
        event.preventDefault();
        card.classList.remove('drag-over');
        const inventoryIndex = event.dataTransfer.getData('text/plain');
        if (inventoryIndex !== '') {
            eventBus.emit('item_dropped_on_hero', {
                inventoryIndex: parseInt(inventoryIndex, 10),
                heroId: hero.id
            });
        }
    });

    const mainContent = createElement('div', { className: 'hero-main-content' });
    const controls = createElement('div', { className: 'hero-controls' });

    const titleDiv = createElement('div', { className: 'hero-title' });
    titleDiv.appendChild(createElement('strong', { className: 'hero-name', textContent: hero.name }));
    titleDiv.appendChild(createElement('span', { className: 'hero-level', textContent: `Niveau ${hero.level}` }));
    titleDiv.appendChild(createElement('button', { className: 'toggle-view-btn', textContent: isCollapsed ? '+' : '-', dataset: { heroId: hero.id } }));
    mainContent.appendChild(titleDiv);
    
    const collapsedInfo = createElement('div', { className: 'collapsed-info' });
    const dps = (hero.damage * hero.attackSpeed).toFixed(1);
    collapsedInfo.appendChild(createElement('p', { className: 'hero-stats', textContent: `DPS: ${dps}` }));
    mainContent.appendChild(collapsedInfo);

    mainContent.appendChild(renderHeroDetails(hero, itemToEquip));
    
    const hpBarContainer = createElement('div', { className: 'progress-bar-container' });
    hpBarContainer.appendChild(createElement('div', { className: 'progress-bar-fill hp hero-hp-bar' }));
    mainContent.appendChild(hpBarContainer);
    
    mainContent.appendChild(renderHeroBuffs(hero));
    mainContent.appendChild(createElement('p', { className: 'hero-stats xp-text', textContent: `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP` }));
    
    const xpBarContainer = createElement('div', { className: 'progress-bar-container hero-xp-bar' });
    xpBarContainer.appendChild(createElement('div', { className: 'progress-bar-fill xp hero-xp-bar-fill' }));
    mainContent.appendChild(xpBarContainer);

    mainContent.appendChild(renderHeroEquipment(hero));

    if (index > 0) {
        controls.appendChild(createElement('button', { className: 'move-hero-btn up', title: 'Monter', textContent: '▲', dataset: { heroId: hero.id, direction: 'up' } }));
    } else {
        controls.appendChild(createElement('div', { className: 'move-placeholder' }));
    }
    if (index < heroesCount - 1) {
        controls.appendChild(createElement('button', { className: 'move-hero-btn down', title: 'Descendre', textContent: '▼', dataset: { heroId: hero.id, direction: 'down' } }));
    } else {
        controls.appendChild(createElement('div', { className: 'move-placeholder' }));
    }

    card.appendChild(mainContent);
    card.appendChild(controls);
    return card;
}

export function updateHeroVitals(heroes) {
    heroes.forEach(hero => {
        const card = heroesAreaEl.querySelector(`.hero-card[data-hero-id="${hero.id}"]`);
        if (!card) return;

        const hpPercent = (hero.hp / hero.maxHp) * 100;
        const hpBarFill = card.querySelector('.hero-hp-bar');
        if (hpBarFill) {
            hpBarFill.style.width = `${hpPercent}%`;
        }

        const currentHpEl = card.querySelector('.hero-current-hp');
        if (currentHpEl) {
            currentHpEl.textContent = Math.ceil(hero.hp);
        }

        const xpPercent = (hero.xp / hero.xpToNextLevel) * 100;
        const xpBarFill = card.querySelector('.hero-xp-bar-fill');
        if (xpBarFill) {
            xpBarFill.style.width = `${xpPercent}%`;
        }

        const xpText = card.querySelector('.xp-text');
        if (xpText) {
            xpText.textContent = `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP`;
        }

        if (hero.isFighting() && hpPercent < 25) {
            card.classList.add('is-low-hp');
        } else {
            card.classList.remove('is-low-hp');
        }
    });
}

export function renderHeroesUI(heroes, itemToEquip, heroCardState, eventBus) {
  heroesAreaEl.innerHTML = '';
  heroes.forEach((hero, index) => {
    const isCollapsed = heroCardState[hero.id] ? heroCardState[hero.id].isCollapsed : false;
    const card = createHeroCard(hero, index, heroes.length, isCollapsed, itemToEquip, eventBus);
    heroesAreaEl.appendChild(card);
  });
}
