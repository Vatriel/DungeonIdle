// js/entities/Item.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';

// --- MODIFICATION : NOUVELLES CONSTANTES POUR L'ÉQUILIBRAGE ---
// Ce multiplicateur contrôle la puissance de la statistique principale.
// Il est appliqué à la racine carrée du niveau.
const MAIN_STAT_LEVEL_MULTIPLIER = 0.8; 
const COST_MULTIPLIER = 15;

export class Item {
  constructor(definition, level, currentFloor = 1) {
    this.instanceId = crypto.randomUUID();
    this.baseDefinition = definition;
    this.level = level;
    this.rarity = this.rollRarity(currentFloor);
    
    this.upgradeLevel = 0;
    this.reforgedAffixKey = null;
    this.locked = false;

    // --- MODIFICATION : LA STAT PRINCIPALE UTILISE MAINTENANT LA RACINE CARRÉE ---
    // Cette formule aligne la croissance de la stat principale sur celle des affixes.
    const scale = 1 + Math.sqrt(Math.max(0, level - 1)) * MAIN_STAT_LEVEL_MULTIPLIER;
    const baseStatValue = Math.ceil(definition.baseValue * scale);
    
    const implicitStats = this.generateImplicitStats();
    this.affixes = this.generateAffixes();
    this.name = this.generateName();
    
    this.stats = { 
        [definition.stat]: baseStatValue,
        ...implicitStats,
        ...this.affixes 
    };
    this.implicitStatKeys = Object.keys(implicitStats);

    const rarityMultiplier = { 
        defective: 0.8,
        common: 1.0, 
        magic: 1.15,
        rare: 1.35,
        epic: 1.60,
        legendary: 1.90,
        mythic: 2.25,
        artifact: 2.75
    };
    const finalMultiplier = rarityMultiplier[this.rarity] || 1.0;

    if (finalMultiplier !== 1.0) {
        for (const statKey in this.stats) {
            this.stats[statKey] = Math.ceil(this.stats[statKey] * finalMultiplier);
        }
    }

    this.cost = this.calculateCost();
  }

  rollRarity(currentFloor) {
    const roll = Math.random();
    const floorFactor = Math.log1p(currentFloor / 10); 

    if (roll < 0.001 * floorFactor) return 'artifact';
    if (roll < 0.005 * floorFactor) return 'mythic';
    if (roll < 0.02 * floorFactor) return 'legendary';
    if (roll < 0.10 * floorFactor) return 'epic';
    if (roll < 0.30) return 'rare';
    if (roll < 0.65) return 'magic';
    if (roll < 0.90) return 'common';
    return 'defective';
  }

  generateImplicitStats() {
    const implicits = {};
    if (!this.baseDefinition.implicitStats) {
        return implicits;
    }

    for (const statKey in this.baseDefinition.implicitStats) {
        const config = this.baseDefinition.implicitStats[statKey];
        const baseValue = config.base;
        const variance = config.variance;
        const randomFactor = 1 + (Math.random() * variance * 2) - variance;
        const levelScale = Math.pow(1.06, this.level - 1);
        
        let value = Math.ceil(baseValue * randomFactor * levelScale);
        implicits[statKey] = value;
    }
    return implicits;
  }

  generateAffixes() {
    const affixes = {};
    let affixCount = 0;
    switch (this.rarity) {
        case 'magic':     affixCount = Math.random() < 0.5 ? 1 : 2; break;
        case 'rare':      affixCount = Math.random() < 0.5 ? 3 : 4; break;
        case 'epic':      affixCount = Math.random() < 0.5 ? 4 : 5; break;
        case 'legendary': affixCount = Math.random() < 0.5 ? 5 : 6; break;
        case 'mythic':
        case 'artifact':  affixCount = 6; break;
        case 'defective': affixCount = Math.random() < 0.3 ? 1 : 0; break;
    }

    const availableAffixes = [...(this.baseDefinition.possibleAffixes || [])];
    
    const malusPool = this.baseDefinition.possibleMaluses || {};
    if (this.rarity === 'defective' && Math.random() < 0.5) {
        affixCount = 0;
        const malusKeys = Object.keys(malusPool);
        if (malusKeys.length > 0) {
            const randomMalusKey = malusKeys[Math.floor(Math.random() * malusKeys.length)];
            const malusConfig = malusPool[randomMalusKey];
            let value = (Math.random() * 0.5 + 0.5) * Math.sqrt(this.level) * (malusConfig.magnitude || 1);
            if (AFFIX_DEFINITIONS[randomMalusKey].isPercent) {
                value = parseFloat((value * 0.5).toFixed(2));
            } else {
                value = Math.ceil(value * 2);
            }
            affixes[randomMalusKey] = -value;
        }
    }

    for (let i = 0; i < affixCount; i++) {
        if (availableAffixes.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * availableAffixes.length);
        const chosenAffixKey = availableAffixes.splice(randomIndex, 1)[0];
        
        const rollQuality = (this.rarity === 'artifact') ? 1.0 : (Math.random() * 0.5 + 0.5);
        let value = rollQuality * Math.sqrt(this.level); 

        if (AFFIX_DEFINITIONS[chosenAffixKey].isPercent) {
            value = parseFloat((value * 1.0).toFixed(2)); 
        } else {
            value = Math.ceil(value * 2);
        }
        affixes[chosenAffixKey] = value;
    }
    return affixes;
  }
  
  generateName() {
      const rarityPrefix = {
          defective: "Défectueux ",
          common: "",
          magic: "Magique ",
          rare: "Rare ",
          epic: "Épique ",
          legendary: "Légendaire ",
          mythic: "Mythique ",
          artifact: "Artéfact : "
      };
      return `[${rarityPrefix[this.rarity] || ""}${this.baseDefinition.name}]`;
  }

  calculateCost() {
    let totalStatValue = 0;
    for(const [stat, value] of Object.entries(this.stats)) {
        if (value > 0) {
            totalStatValue += value;
        }
    }
    const rarityMultiplier = { 
        defective: 0.5,
        common: 1, 
        magic: 2.5, 
        rare: 5, 
        epic: 10,
        legendary: 25,
        mythic: 60,
        artifact: 150
    };
    const upgradeMultiplier = 1 + (this.upgradeLevel * 0.5);
    return Math.max(1, Math.ceil(totalStatValue * COST_MULTIPLIER * rarityMultiplier[this.rarity] * upgradeMultiplier));
  }
}
