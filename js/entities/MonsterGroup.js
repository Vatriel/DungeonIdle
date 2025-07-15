// js/entities/MonsterGroup.js

import { Enemy } from './Enemy.js'; // Importe la classe de base Enemy

export class MonsterGroup extends Enemy {
  constructor(scaledDef, count) {
    // Appelle le constructeur de la classe parente Enemy
    super(scaledDef.name, scaledDef.level); 
    
    // --- CORRECTION ---
    // Ajout de l'ID de la définition pour que les contrats et trophées puissent identifier ce monstre.
    this.id = scaledDef.id;
    // --- FIN DE LA CORRECTION ---

    this.initialCount = count; // Nombre initial de monstres dans le groupe
    this.baseDefinition = scaledDef; // Définition de base du monstre (avec stats scalées)

    this.hpPerMonster = scaledDef.baseHp; // HP par monstre individuel
    this.totalMaxHp = this.hpPerMonster * this.initialCount; // HP total du groupe
    this.currentHp = this.totalMaxHp; // HP actuels du groupe
    this.currentCount = this.initialCount; // Nombre actuel de monstres en vie dans le groupe
  }

  /**
   * Inflige des dégâts au groupe de monstres.
   * Met à jour les HP totaux et le nombre de monstres en vie.
   * @param {number} amount - La quantité de dégâts à infliger.
   */
  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.updateCount(); // Met à jour le nombre de monstres en vie après avoir pris des dégâts
  }

  /**
   * Met à jour le nombre de monstres vivants dans le groupe en fonction des HP restants.
   */
  updateCount() {
    if (!this.isAlive()) {
      this.currentCount = 0; // Si le groupe est mort, le compte est zéro
      return;
    }
    // Calcule le nombre de monstres en vie en arrondissant au plafond (un monstre même avec 1 HP compte comme entier)
    this.currentCount = Math.ceil(this.currentHp / this.hpPerMonster);
  }

  /**
   * Vérifie si le groupe de monstres est toujours en vie.
   * @returns {boolean} True si le groupe a encore des HP, false sinon.
   */
  isAlive() {
    return this.currentHp > 0;
  }
}
