// js/entities/Boss.js

import { Enemy } from './Enemy.js'; // Importe la classe de base Enemy

export class Boss extends Enemy {
  constructor(name, hp, damage, attackSpeed, level) {
    // Appelle le constructeur de la classe parente Enemy
    super(name, level); 

    this.maxHp = hp; // HP maximum du boss
    this.currentHp = hp; // HP actuels du boss
    this.damage = damage; // Dégâts infligés par le boss
    this.attackSpeed = attackSpeed; // Vitesse d'attaque du boss
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

