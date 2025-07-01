// js/entities/Item.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';

const ITEM_SCALING_FACTOR = 1.22; // Les objets deviennent 22% plus puissants par niveau
const COST_MULTIPLIER = 15;

export class Item {
  constructor(definition, level) {
    this.baseDefinition = definition;
    this.level = level;

    // --- 1. Détermination de la Rareté ---
    this.rarity = this.rollRarity();

    // --- 2. Calcul de la Stat Primaire ---
    const scale = Math.pow(ITEM_SCALING_FACTOR, level - 1);
    const baseStatValue = Math.ceil(definition.baseValue * scale);
    
    // --- 3. Génération des Affixes (Stats Secondaires) ---
    this.affixes = this.generateAffixes();

    // --- 4. Construction du nom final ---
    this.name = this.generateName();

    // --- 5. Calcul du Coût Final ---
    // On met tout dans un objet "stats" pour plus de clarté
    this.stats = { [definition.stat]: baseStatValue, ...this.affixes };
    this.cost = this.calculateCost();
  }

  rollRarity() {
    const roll = Math.random();
    if (roll < 0.60) return 'common';   // 60% de chance
    if (roll < 0.90) return 'magic';    // 30% de chance
    return 'rare';                      // 10% de chance
  }

  generateAffixes() {
    const affixes = {};
    let affixCount = 0;
    if (this.rarity === 'magic') affixCount = Math.random() < 0.5 ? 1 : 2; // 1 ou 2 affixes
    if (this.rarity === 'rare') affixCount = Math.random() < 0.5 ? 3 : 4;  // 3 ou 4 affixes

    if (affixCount > 0) {
        const availableAffixes = [...this.baseDefinition.possibleAffixes];
        for (let i = 0; i < affixCount; i++) {
            if (availableAffixes.length === 0) break;
            
            // On choisit un affixe au hasard et on le retire du pool pour ne pas l'avoir 2x
            const randomIndex = Math.floor(Math.random() * availableAffixes.length);
            const chosenAffixKey = availableAffixes.splice(randomIndex, 1)[0];
            
            // On calcule sa valeur
            // Formule simple : la valeur de l'affixe dépend du niveau de l'objet
            let value = (Math.random() * 0.5 + 0.5) * this.level; 
            if (AFFIX_DEFINITIONS[chosenAffixKey].isPercent) {
                value = parseFloat((value * 0.5).toFixed(2)); // Les % sont plus petits
            } else {
                value = Math.ceil(value * 2); // Les stats brutes sont plus grandes
            }

            affixes[chosenAffixKey] = value;
        }
    }
    return affixes;
  }
  
  generateName() {
      // Pour l'instant on garde le nom de base, on pourra le modifier avec les affixes plus tard
      const rarityPrefix = {
          magic: "Magique ",
          rare: "Rare ",
          common: ""
      };
      return `[${rarityPrefix[this.rarity]}${this.baseDefinition.name}]`;
  }

  calculateCost() {
    let totalStatValue = 0;
    for(const [stat, value] of Object.entries(this.stats)) {
        totalStatValue += value;
    }
    const rarityMultiplier = { common: 1, magic: 2.5, rare: 5 };
    return Math.ceil(totalStatValue * COST_MULTIPLIER * rarityMultiplier[this.rarity]);
  }
}
