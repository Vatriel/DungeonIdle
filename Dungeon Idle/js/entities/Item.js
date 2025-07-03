// js/entities/Item.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';

const ITEM_SCALING_FACTOR = 1.22;
const COST_MULTIPLIER = 15;

export class Item {
  constructor(definition, level) {
    this.baseDefinition = definition;
    this.level = level;
    this.rarity = this.rollRarity();
    const scale = Math.pow(ITEM_SCALING_FACTOR, level - 1);
    const baseStatValue = Math.ceil(definition.baseValue * scale);
    this.affixes = this.generateAffixes();
    this.name = this.generateName();
    this.stats = { [definition.stat]: baseStatValue, ...this.affixes };
    this.cost = this.calculateCost();
  }

  rollRarity() {
    const roll = Math.random();
    if (roll < 0.60) return 'common';
    if (roll < 0.90) return 'magic';
    return 'rare';
  }

  generateAffixes() {
    const affixes = {};
    let affixCount = 0;
    if (this.rarity === 'magic') affixCount = Math.random() < 0.5 ? 1 : 2;
    if (this.rarity === 'rare') affixCount = Math.random() < 0.5 ? 3 : 4;

    const availableAffixes = [...(this.baseDefinition.possibleAffixes || [])];
    
    // CORRIGÉ : Logique de malus pilotée par les données
    const malusPool = this.baseDefinition.possibleMaluses || {};
    for (const malusKey in malusPool) {
        const malusConfig = malusPool[malusKey];
        
        // On retire la clé du pool des affixes positifs possibles pour éviter un double tirage
        const indexInPositives = availableAffixes.indexOf(malusKey);
        if (indexInPositives > -1) {
            availableAffixes.splice(indexInPositives, 1);
        }

        // On tire au sort pour voir si le malus s'applique
        if (Math.random() < malusConfig.chance) {
            let value = (Math.random() * 0.5 + 0.5) * this.level * (malusConfig.magnitude || 1);
            if (AFFIX_DEFINITIONS[malusKey].isPercent) {
                value = parseFloat((value * 0.5).toFixed(2));
            } else {
                value = Math.ceil(value * 2);
            }
            affixes[malusKey] = -value; // Applique la valeur en négatif
        }
    }

    // On génère ensuite les affixes positifs normaux
    for (let i = 0; i < affixCount; i++) {
        if (availableAffixes.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * availableAffixes.length);
        const chosenAffixKey = availableAffixes.splice(randomIndex, 1)[0];
        
        let value = (Math.random() * 0.5 + 0.5) * this.level; 

        if (AFFIX_DEFINITIONS[chosenAffixKey].isPercent) {
            value = parseFloat((value * 0.5).toFixed(2));
        } else {
            value = Math.ceil(value * 2);
        }

        // On ajoute la valeur (au cas où un affixe serait déjà présent, bien que peu probable ici)
        affixes[chosenAffixKey] = (affixes[chosenAffixKey] || 0) + value;
    }
    return affixes;
  }
  
  generateName() {
      const rarityPrefix = {
          magic: "Magique ",
          rare: "Rare ",
          common: ""
      };
      return `[${rarityPrefix[this.rarity]}${this.baseDefinition.name}]`;
  }

  calculateCost() {
    let totalStatValue = 0;
    // MODIFIÉ : On prend en compte la valeur de la stat de base et des affixes
    for(const [stat, value] of Object.entries(this.stats)) {
        // Pour le coût, on peut considérer qu'un malus réduit la valeur de l'objet
        totalStatValue += value;
    }
    const rarityMultiplier = { common: 1, magic: 2.5, rare: 5 };
    // On s'assure que le coût ne soit pas négatif
    return Math.max(1, Math.ceil(totalStatValue * COST_MULTIPLIER * rarityMultiplier[this.rarity]));
  }
}
