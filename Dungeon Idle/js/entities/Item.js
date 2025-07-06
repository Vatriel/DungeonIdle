// js/entities/Item.js

import { AFFIX_DEFINITIONS } from '../data/itemData.js';

const ITEM_SCALING_FACTOR = 1.22; // Facteur de mise à l'échelle des items par niveau
const COST_MULTIPLIER = 15; // Multiplicateur de coût de base

export class Item {
  constructor(definition, level, currentFloor = 1) { // Ajout de currentFloor avec une valeur par défaut
    this.baseDefinition = definition; // La définition de base de l'item (du fichier itemData.js)
    this.level = level; // Le niveau de l'item
    this.rarity = this.rollRarity(currentFloor); // Passage de currentFloor à rollRarity
    
    // Calcule la valeur de la statistique de base de l'item en fonction de son niveau
    const scale = Math.pow(ITEM_SCALING_FACTOR, level - 1);
    const baseStatValue = Math.ceil(definition.baseValue * scale);
    
    this.affixes = this.generateAffixes(); // Génère les affixes aléatoires de l'item
    this.name = this.generateName(); // Génère le nom complet de l'item (avec préfixe de rareté)
    
    // Combine la statistique de base et les affixes pour former les statistiques finales de l'item
    this.stats = { [definition.stat]: baseStatValue, ...this.affixes };
    this.cost = this.calculateCost(); // Calcule le coût de l'item
  }

  /**
   * Détermine la rareté de l'item de manière aléatoire.
   * La rareté "Legendary" n'apparaît qu'à partir de l'étage 15.
   * @param {number} currentFloor - L'étage actuel du donjon.
   * @returns {string} La rareté de l'item ('common', 'magic', 'rare', 'legendary').
   */
  rollRarity(currentFloor) {
    const roll = Math.random();
    
    // Si l'étage est suffisant, il y a une petite chance de légendaire
    if (currentFloor >= 15 && roll < 0.01) return 'legendary'; // 1% de chance d'être légendaire à partir de l'étage 15
    if (roll < 0.60) return 'common'; // 60% de chance d'être commun
    if (roll < 0.90) return 'magic';  // 30% de chance d'être magique (60-90)
    return 'rare';                    // 10% de chance d'être rare (90-100)
  }

  /**
   * Génère les affixes (bonus et malus) de l'item en fonction de sa rareté.
   * @returns {object} Un objet des affixes générés avec leurs valeurs.
   */
  generateAffixes() {
    const affixes = {};
    let affixCount = 0;
    // Détermine le nombre d'affixes positifs en fonction de la rareté
    if (this.rarity === 'magic') affixCount = Math.random() < 0.5 ? 1 : 2;
    if (this.rarity === 'rare') affixCount = Math.random() < 0.5 ? 3 : 4;
    if (this.rarity === 'legendary') affixCount = Math.random() < 0.5 ? 5 : 6; // Plus d'affixes pour le légendaire

    // Crée une copie du pool d'affixes possibles pour pouvoir en retirer sans modifier la définition de base
    const availableAffixes = [...(this.baseDefinition.possibleAffixes || [])];
    
    // --- Logique de génération des malus ---
    const malusPool = this.baseDefinition.possibleMaluses || {};
    for (const malusKey in malusPool) {
        const malusConfig = malusPool[malusKey];
        
        // Si un malus est tiré, on s'assure qu'il ne peut pas être aussi un affixe positif
        const indexInPositives = availableAffixes.indexOf(malusKey);
        if (indexInPositives > -1) {
            availableAffixes.splice(indexInPositives, 1);
        }

        // Tire au sort pour voir si le malus s'applique (selon sa chance définie)
        if (Math.random() < malusConfig.chance) {
            let value = (Math.random() * 0.5 + 0.5) * this.level * (malusConfig.magnitude || 1);
            // Si l'affixe est un pourcentage, sa valeur est ajustée
            if (AFFIX_DEFINITIONS[malusKey].isPercent) {
                value = parseFloat((value * 0.5).toFixed(2));
            } else {
                value = Math.ceil(value * 2);
            }
            affixes[malusKey] = -value; // Applique la valeur en négatif pour un malus
        }
    }

    // --- Logique de génération des affixes positifs normaux ---
    for (let i = 0; i < affixCount; i++) {
        // S'il n'y a plus d'affixes disponibles, on arrête
        if (availableAffixes.length === 0) break;
        
        // Choisit un affixe aléatoire parmi ceux disponibles et le retire du pool
        const randomIndex = Math.floor(Math.random() * availableAffixes.length);
        const chosenAffixKey = availableAffixes.splice(randomIndex, 1)[0];
        
        let value = (Math.random() * 0.5 + 0.5) * this.level; 

        // Ajuste la valeur si l'affixe est un pourcentage
        if (AFFIX_DEFINITIONS[chosenAffixKey].isPercent) {
            value = parseFloat((value * 0.5).toFixed(2));
        } else {
            value = Math.ceil(value * 2);
        }

        // Ajoute la valeur de l'affixe. Comme un affixe est retiré du pool après avoir été choisi,
        // il n'est pas nécessaire de vérifier s'il est déjà présent (affixes[chosenAffixKey] || 0)
        // car il ne sera tiré qu'une seule fois.
        affixes[chosenAffixKey] = value;
    }
    return affixes;
  }
  
  /**
   * Génère le nom complet de l'item en ajoutant un préfixe de rareté.
   * @returns {string} Le nom formaté de l'item.
   */
  generateName() {
      const rarityPrefix = {
          common: "",
          magic: "Magique ",
          rare: "Rare ",
          legendary: "Légendaire " // Préfixe pour les légendaires
      };
      return `[${rarityPrefix[this.rarity]}${this.baseDefinition.name}]`;
  }

  /**
   * Calcule le coût de l'item en fonction de ses statistiques et de sa rareté.
   * @returns {number} Le coût de l'item.
   */
  calculateCost() {
    let totalStatValue = 0;
    // Somme toutes les valeurs de statistiques (les malus réduisent le coût)
    for(const [stat, value] of Object.entries(this.stats)) {
        totalStatValue += value;
    }
    // Multiplicateurs de coût basés sur la rareté
    const rarityMultiplier = { common: 1, magic: 2.5, rare: 5, legendary: 15 }; // Multiplicateur plus élevé pour légendaire
    // S'assure que le coût ne soit jamais négatif (minimum 1 or)
    return Math.max(1, Math.ceil(totalStatValue * COST_MULTIPLIER * rarityMultiplier[this.rarity]));
  }
}

