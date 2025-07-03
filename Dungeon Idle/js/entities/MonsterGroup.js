// js/entities/MonsterGroup.js

export class MonsterGroup {
  /**
   * Construit un groupe de monstres.
   * @param {object} scaledDef - La définition du monstre avec les stats déjà améliorées pour l'étage.
   * @param {number} count - Le nombre de monstres dans le groupe.
   */
  constructor(scaledDef, count) {
    // --- Propriétés de base ---
    this.name = scaledDef.name;
    this.level = scaledDef.level; // Le niveau des monstres du groupe
    this.initialCount = count;
    
    // NOUVEAU : Un identifiant unique pour chaque instance de monstre.
    this.instanceId = crypto.randomUUID();
    
    // On garde la définition complète pour accéder au DPS de base plus tard
    this.baseDefinition = scaledDef;

    // --- Gestion des points de vie ---
    this.hpPerMonster = scaledDef.baseHp;
    this.totalMaxHp = this.hpPerMonster * this.initialCount;
    this.currentHp = this.totalMaxHp;
    
    // Le nombre de membres est calculé à partir de la vie actuelle
    this.currentCount = this.initialCount;
  }

  /**
   * Applique des dégâts au groupe entier.
   * @param {number} amount - La quantité de dégâts à infliger.
   */
  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.updateCount(); // Met à jour le nombre de membres après avoir pris des dégâts
  }

  /**
   * Recalcule le nombre de membres en vie basé sur les HP restants.
   */
  updateCount() {
    if (!this.isAlive()) {
      this.currentCount = 0;
      return;
    }
    // Formule clé : s'il reste 3.5 monstres en vie, on arrondit à 4.
    this.currentCount = Math.ceil(this.currentHp / this.hpPerMonster);
  }

  /**
   * Vérifie si le groupe contient encore au moins un membre en vie.
   * @returns {boolean}
   */
  isAlive() {
    return this.currentHp > 0;
  }
}
