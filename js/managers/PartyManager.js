// js/managers/PartyManager.js

import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { Duelist } from '../entities/Duelist.js';
import { Protector } from '../entities/Protector.js';
import { Flibustier } from '../entities/Flibustier.js'; // NOUVEAU : Import du Flibustier
import { PRESTIGE_UPGRADES } from '../data/prestigeData.js';
import { TAVERN_GOODS } from '../data/tavernGoodsData.js';

let localState = null;
let localEventBus = null;

function recruitHero(heroId) {
    if (localState.heroes.some(hero => hero.id === heroId)) {
        localEventBus.emit('notification_requested', { message: "Ce héros est déjà dans votre groupe.", type: 'error' });
        return;
    }

    const heroDef = localState.heroDefinitions[heroId.toUpperCase()];
    if (heroDef && heroDef.status === 'available' && localState.gold >= heroDef.cost) {
        localState.gold -= heroDef.cost;
        heroDef.status = 'recruited';

        let newHero;
        // NOUVEAU : Ajout du cas pour le Flibustier
        switch (heroDef.id) {
            case 'priest': newHero = new Priest(heroDef); break;
            case 'duelist': newHero = new Duelist(heroDef); break;
            case 'protector': newHero = new Protector(heroDef); break;
            case 'flibustier': newHero = new Flibustier(heroDef); break;
            default: newHero = new Hero(heroDef); break;
        }

        const startingLevel = localState.prestigeUpgrades.STARTING_LEVEL ? PRESTIGE_UPGRADES.STARTING_LEVEL.effect(localState.prestigeUpgrades.STARTING_LEVEL) : 1;
        if (startingLevel > 1) {
            for (let i = 1; i < startingLevel; i++) {
                newHero.levelUp(localState, localEventBus, false);
            }
        }

        newHero.initialize(localState);
        localState.heroes.push(newHero);

        if (!localState.ui.heroCardState) localState.ui.heroCardState = {};
        localState.ui.heroCardState[newHero.id] = { isCollapsed: true };

        localEventBus.emit('notification_requested', { message: `${newHero.name} a rejoint le groupe !`, type: 'success' });
        localState.ui.heroesNeedUpdate = true;
        localState.ui.recruitmentNeedsUpdate = true;
    } else {
        localEventBus.emit('notification_requested', { message: `Conditions non remplies pour recruter ${heroDef.name}.`, type: 'error' });
    }
}

function moveHero(heroId, direction) {
    const index = localState.heroes.findIndex(h => h.id === heroId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        [localState.heroes[index], localState.heroes[index - 1]] = [localState.heroes[index - 1], localState.heroes[index]];
        localState.ui.heroesNeedUpdate = true;
    } else if (direction === 'down' && index < localState.heroes.length - 1) {
        [localState.heroes[index], localState.heroes[index + 1]] = [localState.heroes[index + 1], localState.heroes[index]];
        localState.ui.heroesNeedUpdate = true;
    }
}

function toggleHeroCardView(heroId) {
    if (localState.ui.heroCardState && localState.ui.heroCardState[heroId]) {
        localState.ui.heroCardState[heroId].isCollapsed = !localState.ui.heroCardState[heroId].isCollapsed;
        localState.ui.heroesNeedUpdate = true;
    }
}

function distributeXp(data) {
    let needsFullUpdate = false;
    const xpBonus = localState.prestigeUpgrades.LEARNED_SOUL ? PRESTIGE_UPGRADES.LEARNED_SOUL.effect(localState.prestigeUpgrades.LEARNED_SOUL) / 100 : 0;
    
    let consumableXpBonus = 0;
    const xpConsumable = localState.activeConsumables.find(c => TAVERN_GOODS[c.id]?.bonus.stat === 'xpGainPercent');
    if (xpConsumable) {
        consumableXpBonus = TAVERN_GOODS[xpConsumable.id].bonus.value / 100;
    }

    localState.heroes.forEach(hero => {
        let mentorBonus = 0;
        localState.heroes.forEach(h => {
            if (h.equipment.mains?.baseDefinition.uniqueEffect === 'MENTORS_GAUNTLETS' && h.id !== hero.id) {
                mentorBonus += 0.10;
            }
        });
        
        const finalXpGained = data.xpGained * (1 + xpBonus + mentorBonus + consumableXpBonus);
        if (hero.isFighting()) {
            const previousLevel = hero.level;
            hero.addXp(finalXpGained, localEventBus, localState);
            if (hero.level > previousLevel) {
                needsFullUpdate = true;
            }
        }
    });

    if (needsFullUpdate) {
        localState.ui.heroesNeedUpdate = true;
    }
}

function updateAuraBonuses() {
    const auraBonuses = {
        attackSpeedPercent: 0, armor: 0, riposteChance: 0, goldFind: 0,
        damageReduction: 0, critDamage: 0, healEffectiveness: 0, endurancePercent: 0,
    };

    localState.heroes.forEach(hero => {
        for (const slot in hero.equipment) {
            const item = hero.equipment[slot];
            if (item && item.baseDefinition.aura) {
                switch (item.baseDefinition.uniqueEffect) {
                    case 'LEADERS_HELM': auraBonuses.attackSpeedPercent += 5; break;
                    case 'BROTHERHOOD_BREASTPLATE': auraBonuses.armor += 50; break;
                    case 'CONFIDENT_STEP_LEGGINGS': auraBonuses.riposteChance += 3; break;
                    case 'HERALDS_BOOTS': auraBonuses.goldFind += 15; break;
                    case 'HARMONY_PENDANT': auraBonuses.damageReduction += 3; break;
                    case 'FURY_TOTEM': auraBonuses.critDamage += 20; break;
                    case 'PATRIARCHS_STAFF': auraBonuses.healEffectiveness += 10; break;
                    case 'RALLYING_HORN': auraBonuses.endurancePercent += 5; break;
                }
            }
        }
    });
    localState.globalAuraBonuses = auraBonuses;
}

function update(dt) {
    updateAuraBonuses();
    localState.heroes.forEach(hero => hero.update(localState, dt, localEventBus));
}

export const PartyManager = {
    init: (eventBus, state) => {
        localState = state;
        localEventBus = eventBus;

        eventBus.on('ui_recruit_hero_clicked', (data) => recruitHero(data.heroId));
        eventBus.on('ui_move_hero_clicked', (data) => moveHero(data.heroId, data.direction));
        eventBus.on('ui_toggle_hero_card_view_clicked', (data) => toggleHeroCardView(data.heroId));
        eventBus.on('monster_defeated', distributeXp);
        eventBus.on('hero_leveled_up', () => { localState.ui.heroesNeedUpdate = true; });
    },
    update
};
