// js/entities/Boss.js

export class Boss {
  constructor(name, hp, damage, attackSpeed, level) {
    this.name = name;
    this.maxHp = hp;
    this.currentHp = hp;
    this.damage = damage; // La stat s'appelle maintenant 'damage'
    this.attackSpeed = attackSpeed; // Le boss a aussi une vitesse d'attaque
    this.level = level;
    this.instanceId = crypto.randomUUID();
    this.attackTimer = 0; // Timer pour gérer le cooldown d'attaque
  }

  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  isAlive() {
    return this.currentHp > 0;
  }
}
