// js/ui/StatsModalUI.js

import { createElement } from '../utils/domHelper.js';
import { Protector } from '../entities/Protector.js';
import { AFFIX_DEFINITIONS } from '../data/itemData.js';
import { UNIQUE_EFFECT_DESCRIPTIONS } from '../data/uniqueEffectData.js';

let statsModalInstance = null;

function calculateCumulativeAverage(data) {
    let sum = 0;
    let count = 0;
    return data.map(value => {
        sum += value;
        count++;
        return count > 0 ? sum / count : 0;
    });
}

function createEquippedItemCard(item, slotName) {
    if (!item) {
        return createElement('div', {
            className: 'stats-modal-item-card empty-slot',
            innerHTML: `<span class="slot-name">${slotName}</span><span class="item-name">Vide</span>`
        });
    }

    const card = createElement('div', { className: `stats-modal-item-card item-card rarity-${item.rarity.toLowerCase()}` });
    
    const header = createElement('div', { className: 'item-card-header' });
    header.appendChild(createElement('span', { className: 'slot-name', textContent: slotName }));
    header.appendChild(createElement('span', { className: 'item-name', textContent: item.name }));
    card.appendChild(header);
    
    const statsDiv = createElement('div', { className: 'item-stats' });
    for (const statKey in item.stats) {
        const value = item.stats[statKey];
        const affixDef = AFFIX_DEFINITIONS[statKey];
        if (!affixDef) continue;

        const prefix = value > 0 ? '+' : '';
        const suffix = affixDef.isPercent ? '%' : '';
        const statName = affixDef.text.replace('X', '').trim();
        
        const statLine = createElement('p', { className: 'item-stat-line', textContent: `${prefix}${value.toFixed(affixDef.isPercent ? 1 : 0)}${suffix} ${statName}` });
        
        if (item.implicitStatKeys && item.implicitStatKeys.includes(statKey)) {
            statLine.classList.add('implicit-stat');
        }
        statsDiv.appendChild(statLine);
    }
    
    if (item.baseDefinition.uniqueEffect) {
        const effectDescription = UNIQUE_EFFECT_DESCRIPTIONS[item.baseDefinition.uniqueEffect];
        if (effectDescription) {
            statsDiv.appendChild(createElement('p', { className: 'item-unique-effect', textContent: effectDescription }));
        }
    }
    
    card.appendChild(statsDiv);

    return card;
}

export function showStatsModal(hero, state, eventBus) {
    if (statsModalInstance) {
        statsModalInstance.close();
    }
    statsModalInstance = new StatsModal(hero, state, eventBus);
    statsModalInstance.render();
}

class StatsModal {
    constructor(hero, state, eventBus) {
        this.hero = hero;
        this.party = state.heroes;
        this.heroIndex = this.party.findIndex(h => h.id === hero.id);
        this.state = state;
        this.eventBus = eventBus;

        this.isPriest = hero.id === 'priest';
        this.isProtector = hero.id === 'protector'; // NOUVEAU : Flag pour le Protecteur
        this.charts = {};
        this.domElements = {};
        this.updateInterval = null;
    }

    render() {
        this.overlay = createElement('div', { id: 'stats-modal-overlay', className: 'modal-overlay' });
        this.modal = createElement('div', { className: 'modal-content stats-modal-content' });

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        const header = this.createHeader();
        const body = this.createBody();

        this.modal.append(header, body);
        this.overlay.appendChild(this.modal);
        
        document.body.appendChild(this.overlay);

        requestAnimationFrame(() => {
            this.initCharts(); 
            this.updateAllSections();
            this.updateInterval = setInterval(() => this.updateAllSections(), 1000);
        });
    }

    createHeader() {
        const header = createElement('div', { className: 'modal-header' });
        
        const titleContainer = createElement('div', { className: 'modal-title-container' });
        this.domElements.headerTitle = createElement('h2', { textContent: `Rapport de Combat : ${this.hero.name}` });
        
        const navControls = createElement('div', { className: 'modal-nav-controls' });
        this.domElements.prevBtn = createElement('button', { textContent: '<', className: 'nav-btn', title: 'Héros précédent' });
        this.domElements.nextBtn = createElement('button', { textContent: '>', className: 'nav-btn', title: 'Héros suivant' });
        
        this.domElements.prevBtn.addEventListener('click', () => this.navigateToHero('prev'));
        this.domElements.nextBtn.addEventListener('click', () => this.navigateToHero('next'));
        
        navControls.append(this.domElements.prevBtn, this.domElements.nextBtn);
        
        titleContainer.append(this.domElements.headerTitle, navControls);
        header.appendChild(titleContainer);

        const closeBtn = createElement('button', { textContent: 'X', className: 'close-btn' });
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(closeBtn);

        this.updateNavButtons();
        return header;
    }

    createBody() {
        const body = createElement('div', { className: 'modal-body' });
        
        const mainSection = createElement('div', { className: 'stats-modal-main' });
        
        this.domElements.statsSection = createElement('div', { className: 'stats-modal-section' });
        this.domElements.equipmentSection = createElement('div', { className: 'stats-modal-section' });
        
        mainSection.append(this.domElements.statsSection, this.domElements.equipmentSection);
        
        const pieChartsSection = this.createPieChartsSection();
        const timeChartsSection = this.createTimeChartsSection(); 
        
        this.domElements.logList = createElement('div', { className: 'combat-log-list' });
        const logSection = createElement('div', { className: 'stats-modal-section combat-log-container' });
        logSection.innerHTML = '<h3>Journal de Combat</h3>';
        logSection.appendChild(this.domElements.logList);

        body.append(mainSection, pieChartsSection, timeChartsSection, logSection);
        return body;
    }

    createPieChartsSection() {
        const section = createElement('div', { className: 'stats-modal-pie-charts' });
        const damagePie = createElement('div', { className: 'stats-modal-section' });
        damagePie.innerHTML = `<h3>Sources de Dégâts</h3><div class="pie-chart-container"><canvas id="damage-pie-chart"></canvas></div>`;
        
        const survivalPie = createElement('div', { className: 'stats-modal-section' });
        survivalPie.innerHTML = `<h3>Sources de Survie</h3><div class="pie-chart-container"><canvas id="survival-pie-chart"></canvas></div>`;
        
        section.append(damagePie, survivalPie);
        return section;
    }

    createTimeChartsSection() {
        const section = createElement('div', { className: 'stats-modal-section' });
        section.innerHTML = '<h3>Historique de Combat (60s)</h3>';

        const chartsContainer = createElement('div', { className: 'time-charts-container' });

        const hpChartItem = createElement('div', { className: 'time-chart-item' });
        hpChartItem.innerHTML = `<div class="chart-container"><canvas id="hp-chart"></canvas></div>`;
        this.domElements.hpSummary = createElement('div', { className: 'chart-summary' });
        hpChartItem.appendChild(this.domElements.hpSummary);
        chartsContainer.appendChild(hpChartItem);
        
        const performanceChartItem = createElement('div', { className: 'time-chart-item' });
        performanceChartItem.innerHTML = `<div class="chart-container"><canvas id="performance-chart"></canvas></div>`;
        this.domElements.performanceSummary = createElement('div', { className: 'chart-summary' });
        performanceChartItem.appendChild(this.domElements.performanceSummary);
        chartsContainer.appendChild(performanceChartItem);

        section.appendChild(chartsContainer);
        return section;
    }

    updateAllSections() {
        this.updateStats();
        this.updateEquipment();
        this.updateCharts();
        this.updateCombatLog();
    }

    updateStats() {
        this.domElements.statsSection.innerHTML = '<h3>Statistiques Détaillées</h3>';
        const grid = createElement('div', { className: 'stats-modal-stats-grid' });
        const stats = this.hero.getAllStats();
        
        const statGroups = {
            'Attributs': ['strength', 'dexterity', 'intelligence', 'endurance'],
            'Combat': ['damage', 'attackSpeed', 'critChance', 'critDamage'],
            'Défense': ['maxHp', 'armor', 'hpRegen', 'riposteChance'],
            'Support': ['finalHealPower', 'finalBuffChance', 'finalBuffPotency', 'healPercent'],
            'Utilitaire': ['goldFind', 'lifeSteal', 'thorns']
        };

        if (this.hero instanceof Protector) {
            statGroups['Protecteur'] = ['shieldPotency', 'beamChargeRate'];
        }

        for (const groupName in statGroups) {
            const groupHasStats = statGroups[groupName].some(statKey => stats[statKey] !== undefined && stats[statKey] !== 0);
            if (!groupHasStats) continue;

            const groupEl = createElement('div', { className: 'stats-group' });
            groupEl.appendChild(createElement('h4', { textContent: groupName }));
            statGroups[groupName].forEach(statKey => {
                const statDef = stats[statKey];
                if (statDef !== undefined) {
                    const value = statDef;
                    const isPercent = statKey.includes('Chance') || statKey.includes('goldFind') || statKey.includes('lifeSteal') || statKey.includes('Potency') || statKey.includes('Percent') || statKey.includes('Rate');
                    const decimals = (Number.isInteger(value) || value === 0) ? 0 : 2;
                    let statName = statKey.replace('final', '').replace('Percent', '').replace('Rate', '');
                    statName = statName.charAt(0).toUpperCase() + statName.slice(1);
                    const text = `${statName}: ${isPercent ? (value * 100).toFixed(decimals) + '%' : value.toFixed(decimals)}`;
                    groupEl.appendChild(createElement('p', { textContent: text }));
                }
            });
            grid.appendChild(groupEl);
        }
        this.domElements.statsSection.appendChild(grid);
    }

    updateEquipment() {
        this.domElements.equipmentSection.innerHTML = '<h3>Équipement</h3>';
        const grid = createElement('div', { className: 'stats-modal-equipment-grid' });
        
        const equipmentOrder = ['arme', 'tete', 'torse', 'jambes', 'mains', 'pieds', 'amulette', 'anneau1', 'anneau2', 'bibelot'];

        for (const slot of equipmentOrder) {
            const item = this.hero.equipment[slot];
            const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
            const itemCard = createEquippedItemCard(item, slotName);
            grid.appendChild(itemCard);
        }
        
        this.domElements.equipmentSection.appendChild(grid);
    }

    updateCombatLog() {
        this.domElements.logList.innerHTML = '';
        this.hero.history.log.slice().reverse().forEach(entry => {
            this.domElements.logList.appendChild(createElement('p', { textContent: entry.message, className: `log-event-${entry.type}` }));
        });
    }

    initCharts() {
        const hpCtx = document.getElementById('hp-chart')?.getContext('2d');
        if (hpCtx) {
            this.charts.hp = new Chart(hpCtx, {
                data: { 
                    labels: Array(60).fill(''), 
                    datasets: [ 
                        { type: 'line', label: 'Points de Vie', yAxisID: 'y-hp', data: [], fill: true, borderColor: 'hsl(200, 80%, 60%)', backgroundColor: 'hsla(200, 80%, 60%, 0.2)', borderWidth: 2, tension: 0.1, pointRadius: 0 }, 
                        { type: 'bar', label: 'Soins Reçus', yAxisID: 'y-flux', data: [], backgroundColor: 'hsl(120, 60%, 50%)', borderWidth: 0 }, 
                        { type: 'bar', label: 'Vol de Vie', yAxisID: 'y-flux', data: [], backgroundColor: 'hsl(300, 70%, 50%)', borderWidth: 0 }, // NOUVEAU : Vol de vie
                        { type: 'bar', label: 'Dégâts Subis', yAxisID: 'y-flux', data: [], backgroundColor: 'hsl(0, 70%, 55%)', borderWidth: 0 } 
                    ] 
                },
                options: this.getChartOptions({ y1Label: 'Points de Vie', y2Label: 'Flux HP/s', y1Max: this.hero.maxHp * 1.1 })
            });
        }
        
        const perfLabel = this.isPriest ? 'HPS' : 'DPS';
        const performanceCtx = document.getElementById('performance-chart')?.getContext('2d');
        if (performanceCtx) {
            this.charts.performance = new Chart(performanceCtx, {
                data: { 
                    labels: Array(60).fill(''), 
                    datasets: [ 
                        { type: 'bar', label: perfLabel, data: [], backgroundColor: this.isPriest ? 'hsl(120, 60%, 50%)' : 'hsl(50, 100%, 50%)', borderWidth: 0 }, 
                        { type: 'line', label: `Moyenne ${perfLabel}`, data: [], borderColor: this.isPriest ? 'hsl(120, 100%, 80%)' : 'hsl(50, 100%, 80%)', borderWidth: 2, tension: 0.1, fill: false, pointRadius: 0 } 
                    ] 
                },
                options: this.getChartOptions({ y1Label: perfLabel })
            });
        }

        const damagePieCtx = document.getElementById('damage-pie-chart')?.getContext('2d');
        if (damagePieCtx) {
            this.charts.damagePie = new Chart(damagePieCtx, {
                type: 'pie',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: this.getPieChartOptions('Sources de Dégâts')
            });
        }

        const survivalPieCtx = document.getElementById('survival-pie-chart')?.getContext('2d');
        if (survivalPieCtx) {
            this.charts.survivalPie = new Chart(survivalPieCtx, {
                type: 'pie',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: this.getPieChartOptions('Sources de Survie')
            });
        }
    }

    updateCharts() {
        const history = this.hero.history;
        if (!history) return;
        
        if (this.charts.hp) {
            this.charts.hp.data.datasets[0].data = history.hpHistory;
            this.charts.hp.data.datasets[1].data = history.healingReceived;
            this.charts.hp.data.datasets[2].data = history.lifeStealHealing; // NOUVEAU : Vol de vie
            this.charts.hp.data.datasets[3].data = history.damageTaken;
            const maxFlux = Math.max(...history.healingReceived, ...history.lifeStealHealing, ...history.damageTaken); // Inclure le vol de vie
            this.charts.hp.options.scales['y-flux'].max = maxFlux > 10 ? maxFlux * 1.1 : 10;
            this.charts.hp.update('none'); 
        }
        
        if (this.charts.performance) {
            const perfLabel = this.isPriest ? 'HPS' : 'DPS';
            const performanceData = this.isPriest ? history.healingDone : history.damageDealt;
            this.charts.performance.data.datasets[0].data = performanceData;
            this.charts.performance.data.datasets[0].label = perfLabel;
            this.charts.performance.data.datasets[1].data = calculateCumulativeAverage(performanceData);
            this.charts.performance.data.datasets[1].label = `Moyenne ${perfLabel}`;
            const maxPerf = Math.max(...performanceData);
            this.charts.performance.options.scales.y.max = maxPerf > 10 ? maxPerf * 1.1 : 10;
            this.charts.performance.update('none');
        }
        
        const totalIntercepted = history.interceptedDamage.reduce((a, b) => a + b, 0);
        const totalHealingReceived = history.healingReceived.reduce((a, b) => a + b, 0);
        const totalLifeStealHealing = history.lifeStealHealing.reduce((a, b) => a + b, 0); // NOUVEAU
        const totalDamageTaken = history.damageTaken.reduce((a, b) => a + b, 0);
        const totalShieldAbsorption = history.shieldAbsorption.reduce((a, b) => a + b, 0); // NOUVEAU
        const totalShieldsGiven = history.shieldsGiven.reduce((a, b) => a + b, 0); // NOUVEAU

        let hpSummaryHtml = `<div class="summary-metric"><span class="value">${Math.round(totalHealingReceived)}</span><br><span class="label">Total Soins Reçus</span></div>`;
        hpSummaryHtml += `<div class="summary-metric"><span class="value">${Math.round(totalLifeStealHealing)}</span><br><span class="label">Total Vol de Vie</span></div>`; // NOUVEAU
        hpSummaryHtml += `<div class="summary-metric"><span class="value">${Math.round(totalDamageTaken)}</span><br><span class="label">Total Dégâts Subis</span></div>`;
        
        if (totalIntercepted > 0) {
            hpSummaryHtml += `<div class="summary-metric"><span class="value">${Math.round(totalIntercepted)}</span><br><span class="label">Dégâts Interceptés</span></div>`;
        }
        // NOUVEAU : Affichage des stats spécifiques au Protecteur
        if (this.isProtector) {
            if (totalShieldsGiven > 0) {
                hpSummaryHtml += `<div class="summary-metric"><span class="value">${Math.round(totalShieldsGiven)}</span><br><span class="label">Boucliers Donnés</span></div>`;
            }
            if (totalShieldAbsorption > 0) {
                hpSummaryHtml += `<div class="summary-metric"><span class="value">${Math.round(totalShieldAbsorption)}</span><br><span class="label">Dégâts Bloqués (Boucliers)</span></div>`;
            }
        }
        this.domElements.hpSummary.innerHTML = hpSummaryHtml;


        const totalPerf = (this.isPriest ? history.healingDone : history.damageDealt).reduce((a, b) => a + b, 0);
        const avgPerf = totalPerf / history.damageDealt.filter(d => d > 0).length || 0;
        this.domElements.performanceSummary.innerHTML = `<div class="summary-metric"><span class="value">${Math.round(totalPerf)}</span><br><span class="label">${this.isPriest ? 'Total Soins Prodigués' : 'Total Dégâts Infligés'}</span></div><div class="summary-metric"><span class="value">${avgPerf.toFixed(1)}</span><br><span class="label">${this.isPriest ? 'HPS Moyen' : 'DPS Moyen'}</span></div>`;

        const damageBreakdown = history.damageDealtBreakdown;
        this.charts.damagePie.data.labels = ['Normaux', 'Critiques', 'Riposte', 'Épines', 'Rayon'];
        this.charts.damagePie.data.datasets[0].data = [
            damageBreakdown.normal.reduce((a, b) => a + b, 0), 
            damageBreakdown.crit.reduce((a, b) => a + b, 0), 
            damageBreakdown.riposte.reduce((a, b) => a + b, 0), 
            damageBreakdown.thorns.reduce((a, b) => a + b, 0),
            damageBreakdown.beam.reduce((a, b) => a + b, 0)
        ];
        this.charts.damagePie.data.datasets[0].backgroundColor = ['hsl(210, 50%, 60%)', 'hsl(50, 100%, 50%)', 'hsl(280, 50%, 60%)', 'hsl(0, 60%, 50%)', 'hsl(200, 80%, 60%)'];
        this.charts.damagePie.update('none');

        this.charts.survivalPie.data.labels = ['Soins Reçus', 'Vol de Vie', 'Dégâts Mitigés', 'Dégâts Évités', 'Dégâts Absorbés'];
        this.charts.survivalPie.data.datasets[0].data = [
            history.healingReceived.reduce((a,b) => a+b, 0),
            history.lifeStealHealing.reduce((a,b) => a+b, 0),
            history.damageMitigated.reduce((a,b) => a+b, 0),
            history.damageAvoided.reduce((a,b) => a+b, 0),
            history.shieldAbsorption.reduce((a,b) => a+b, 0)
        ];
        this.charts.survivalPie.data.datasets[0].backgroundColor = [
            'hsl(120, 60%, 50%)', // Soins Reçus (vert)
            'hsl(300, 70%, 50%)', // Vol de Vie (violet/rose)
            'hsl(180, 50%, 50%)', // Dégâts Mitigés (cyan)
            'hsl(0, 0%, 90%)',    // Dégâts Évités (blanc)
            'hsl(240, 80%, 70%)'  // Dégâts Absorbés (bleu)
        ];
        this.charts.survivalPie.update('none');
    }

    getChartOptions({ y1Label = 'Valeur', y2Label, y1Max }) {
        const options = { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: false, 
            interaction: { mode: 'index', intersect: false }, 
            scales: { 
                x: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } }, 
                y: { display: !y2Label, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#e0e0e0' }, beginAtZero: true } 
            }, 
            plugins: { legend: { labels: { color: '#e0e0e0' } } } 
        };
        if (y2Label) {
            options.scales['y-hp'] = { type: 'linear', position: 'left', ticks: { color: 'hsl(200, 80%, 80%)' }, grid: { color: 'rgba(255,255,255,0.1)' }, title: { display: true, text: y1Label, color: 'hsl(200, 80%, 80%)' }, min: 0, max: y1Max };
            options.scales['y-flux'] = { type: 'linear', position: 'right', ticks: { color: 'hsl(100, 40%, 80%)' }, grid: { drawOnChartArea: false }, title: { display: true, text: y2Label, color: 'hsl(100, 40%, 80%)' }, beginAtZero: true };
            options.scales.y.display = false;
        }
        return options;
    }

    getPieChartOptions(title) {
        return { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: false, 
            plugins: { 
                legend: { position: 'bottom', labels: { color: '#e0e0e0' } }, 
                title: { display: true, text: title, color: '#e0e0e0', font: { size: 16 } } 
            } 
        };
    }

    navigateToHero(direction) {
        if (direction === 'prev' && this.heroIndex > 0) {
            this.heroIndex--;
        } else if (direction === 'next' && this.heroIndex < this.party.length - 1) {
            this.heroIndex++;
        } else {
            return;
        }

        const newHero = this.party[this.heroIndex];
        this.updateForNewHero(newHero);
    }

    updateForNewHero(newHero) {
        this.hero = newHero;
        this.isPriest = this.hero.id === 'priest';
        this.isProtector = this.hero.id === 'protector'; // NOUVEAU : Mettre à jour le flag

        if (this.charts.hp) this.charts.hp.destroy();
        if (this.charts.performance) this.charts.performance.destroy();
        if (this.charts.damagePie) this.charts.damagePie.destroy();
        if (this.charts.survivalPie) this.charts.survivalPie.destroy();
        this.charts = {};

        this.domElements.headerTitle.textContent = `Rapport de Combat : ${this.hero.name}`;
        this.updateNavButtons();
        
        this.initCharts();
        this.updateAllSections();
    }

    updateNavButtons() {
        this.domElements.prevBtn.disabled = this.heroIndex <= 0;
        this.domElements.nextBtn.disabled = this.heroIndex >= this.party.length - 1;
    }

    close() {
        if (this.charts.hp) this.charts.hp.destroy();
        if (this.charts.performance) this.charts.performance.destroy();
        if (this.charts.damagePie) this.charts.damagePie.destroy();
        if (this.charts.survivalPie) this.charts.survivalPie.destroy();
        
        clearInterval(this.updateInterval);
        this.overlay.remove();
        statsModalInstance = null;
    }
}
