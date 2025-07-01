// js/entities/Boss.js

export class Boss {
  /**
   * Construit un Boss unique.
   * @param {string} name - Le nom généré du boss (ex: "Gorbuz le Balafré").
   * @param {number} hp - Le total de points de vie du boss.
   * @param {number} dps - Les dégâts par seconde constants du boss.
   * @param {number} level - Le niveau du boss.
   */
  constructor(name, hp, dps, level) {
    this.name = name;
    this.maxHp = hp;
    this.currentHp = hp;
    this.dps = dps;
    this.level = level;
  }

  /**
   * Applique des dégâts au boss.
   * @param {number} amount - La quantité de dégâts à infliger.
   */
  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  /**
   * Vérifie si le boss est toujours en vie.
   * @returns {boolean}
   */
  isAlive() {
    return this.currentHp > 0;
  }
}