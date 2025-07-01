// js/entities/Monster.js
export class Monster {
  constructor(monsterDefinition) {
    this.name = monsterDefinition.name;
    this.hp = monsterDefinition.baseHp;
    this.maxHp = monsterDefinition.baseHp;
    this.dps = monsterDefinition.baseDps;
    this.goldDrop = monsterDefinition.goldDrop;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp < 0) {
      this.hp = 0;
    }
  }

  isAlive() {
    return this.hp > 0;
  }
}