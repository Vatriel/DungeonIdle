// js/entities/Enemy.js

/**
 * Classe de base pour toutes les entités ennemies (Monstres, Boss).
 * Fournit des propriétés et méthodes communes.
 */
export class Enemy {
  constructor(name, level) {
    this.name = name;
    this.level = level;
    this.instanceId = crypto.randomUUID(); // ID unique pour chaque instance d'ennemi
    this.attackTimer = 0; // Timer pour gérer le cooldown d'attaque
    
    // NOUVEAU : Propriétés pour les effets de statut
    this.activeStatusEffects = [];
  }

  /**
   * Inflige des dégâts à l'ennemi.
   * Doit être surchargée par les classes dérivées pour gérer les HP spécifiques (currentHp, totalMaxHp).
   * @param {number} amount - La quantité de dégâts à infliger.
   */
  takeDamage(amount) {
    // Cette méthode est surchargée par MonsterGroup et Boss.
    // On peut la laisser vide ici ou ajouter une logique de base si nécessaire.
  }

  /**
   * Vérifie si l'ennemi est toujours en vie.
   * Doit être surchargée par les classes dérivées.
   * @returns {boolean} True si l'ennemi a encore des HP, false sinon.
   */
  isAlive() {
    // Cette méthode sera surchargée par MonsterGroup et Boss.
    return false;
  }
}
