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

function renderStatLine(label, baseValue, change, isPercent = false) {
    const displayValue = isPercent ? (baseValue * 100).toFixed(1) + '%' : Math.ceil(baseValue);
    const p = createElement('p', { className: 'hero-stats', textContent: `${label}: ${displayValue}` });

    if (change !== 0 && change !== undefined) {
        const newValue = baseValue + change;
        const changeSign = change > 0 ? '+' : '';
        const changeClass = change > 0 ? 'stat-increase' : 'stat-decrease';
        const changeDisplay = isPercent ? (change * 100).toFixed(1) + '%' : Math.round(change);
        const newDisplayValue = isPercent ? (newValue * 100).toFixed(1) + '%' : Math.ceil(newValue);

        p.innerHTML = '';
        p.appendChild(document.createTextNode(`${label}: `));
        const span = createElement('span', {
            className: changeClass,
            textContent: `${newDisplayValue} (${changeSign}${changeDisplay})`
        });
        p.appendChild(span);
    }
    return p;
}

function renderHeroStatsGrid(hero, itemToEquip) {
    const statsGrid = createElement('div', { className: 'hero-stats-grid' });
    if (itemToEquip && hero.equipment[itemToEquip.baseDefinition.slot] !== undefined) {
        const changes = hero.calculateStatChanges(itemToEquip);
        const currentStats = hero.getAllStats();
        statsGrid.appendChild(renderStatLine('DPS', currentStats.dps, changes.dps));
        statsGrid.appendChild(renderStatLine('HP', currentStats.maxHp, changes.maxHp));
        statsGrid.appendChild(renderStatLine('Armure', currentStats.armor, changes.armor));
        statsGrid.appendChild(renderStatLine('Crit', currentStats.critChance, changes.critChance, true));
        statsGrid.appendChild(renderStatLine('HP/s', currentStats.hpRegen, changes.hpRegen));
    } else {
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `DPS: ${hero.dps.toFixed(1)}` }));
        statsGrid.appendChild(createElement('p', { className: 'hero-stats hero-hp-text', textContent: `HP: ${Math.ceil(hero.hp)} / ${hero.maxHp}` }));
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `Armure: ${hero.armor}` }));
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `Crit: ${(hero.critChance * 100).toFixed(1)}%` }));
        statsGrid.appendChild(createElement('p', { className: 'hero-stats', textContent: `HP/s: ${hero.hpRegen.toFixed(1)}` }));
    }
    return statsGrid;
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

// CORRIGÉ : La fonction crée maintenant des divs au lieu de <progress>
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
    collapsedInfo.appendChild(createElement('p', { className: 'hero-stats', textContent: `DPS: ${hero.dps.toFixed(1)}` }));
    mainContent.appendChild(collapsedInfo);

    mainContent.appendChild(renderHeroStatsGrid(hero, itemToEquip));
    
    // Barre de HP
    const hpBarContainer = createElement('div', { className: 'progress-bar-container' });
    hpBarContainer.appendChild(createElement('div', { className: 'progress-bar-fill hp hero-hp-bar' }));
    mainContent.appendChild(hpBarContainer);
    
    mainContent.appendChild(renderHeroBuffs(hero));
    mainContent.appendChild(createElement('p', { className: 'hero-stats xp-text', textContent: `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP` }));
    
    // Barre d'XP
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

// CORRIGÉ : La fonction met à jour le style `width` de nos nouvelles barres
// MODIFIÉ : La fonction met maintenant aussi à jour le texte de l'XP.
export function updateHeroVitals(heroes) {
    heroes.forEach(hero => {
        const card = heroesAreaEl.querySelector(`.hero-card[data-hero-id="${hero.id}"]`);
        if (!card) return;

        // Mise à jour de la barre de HP
        const hpPercent = (hero.hp / hero.maxHp) * 100;
        const hpBarFill = card.querySelector('.hero-hp-bar');
        if (hpBarFill) {
            hpBarFill.style.width = `${hpPercent}%`;
        }

        // Mise à jour du texte des HP
        const hpText = card.querySelector('.hero-hp-text');
        if (hpText) {
            hpText.textContent = `HP: ${Math.ceil(hero.hp)} / ${hero.maxHp}`;
        }

        // Mise à jour de la barre d'XP
        const xpPercent = (hero.xp / hero.xpToNextLevel) * 100;
        const xpBarFill = card.querySelector('.hero-xp-bar-fill');
        if (xpBarFill) {
            xpBarFill.style.width = `${xpPercent}%`;
        }

        // NOUVEAU : Mise à jour du texte de l'XP pour assurer la synchronisation.
        const xpText = card.querySelector('.xp-text');
        if (xpText) {
            xpText.textContent = `${Math.floor(hero.xp)} / ${hero.xpToNextLevel} XP`;
        }

        // Mise à jour de l'alerte visuelle pour les faibles HP
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
