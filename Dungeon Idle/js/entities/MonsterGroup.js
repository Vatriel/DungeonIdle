// js/entities/MonsterGroup.js

export class MonsterGroup {
  constructor(scaledDef, count) {
    this.name = scaledDef.name;
    this.level = scaledDef.level;
    this.initialCount = count;
    this.instanceId = crypto.randomUUID();
    this.baseDefinition = scaledDef;
    this.attackTimer = 0; // Timer pour gérer le cooldown d'attaque

    this.hpPerMonster = scaledDef.baseHp;
    this.totalMaxHp = this.hpPerMonster * this.initialCount;
    this.currentHp = this.totalMaxHp;
    this.currentCount = this.initialCount;
  }

  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.updateCount();
  }

  updateCount() {
    if (!this.isAlive()) {
      this.currentCount = 0;
      return;
    }
    this.currentCount = Math.ceil(this.currentHp / this.hpPerMonster);
  }

  isAlive() {
    return this.currentHp > 0;
  }
}
