// js/entities/Boss.js

import { Enemy } from './Enemy.js'; // Importe la classe de base Enemy

export class Boss extends Enemy {
  constructor(name, hp, damage, attackSpeed, level) {
    // Appelle le constructeur de la classe parente Enemy
    super(name, level); 

    // --- CORRECTION ---
    // Ajout d'un ID générique pour que les contrats de type "tuer un boss" et les trophées puissent fonctionner.
    this.id = 'boss';
    // --- FIN DE LA CORRECTION ---

    this.maxHp = hp; // HP maximum du boss
    this.currentHp = hp; // HP actuels du boss
    this.damage = damage; // Dégâts infligés par le boss
    this.attackSpeed = attackSpeed; // Vitesse d'attaque du boss

    // Les dégâts de l'aura sont un pourcentage des dégâts de l'attaque principale.
    this.auraDamage = this.damage * 0.20; // 20% des dégâts du boss
    // L'aura inflige des dégâts toutes les 2 secondes.
    this.auraTickRate = 2.0; 
    // Timer pour suivre le temps jusqu'au prochain déclenchement de l'aura.
    this.auraTimer = 0;
  }

  /**
   * Inflige des dégâts au boss.
   * @param {number} amount - La quantité de dégâts à infliger.
   */
  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  /**
   * Vérifie si le boss est toujours en vie.
   * @returns {boolean} True si le boss a encore des HP, false sinon.
   */
  isAlive() {
    return this.currentHp > 0;
  }
}
