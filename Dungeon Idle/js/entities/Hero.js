// js/entities/Hero.js

export class Hero {
  constructor(heroDefinition) {
    this.id = heroDefinition.id;
    this.name = heroDefinition.name;
    this.status = 'fighting';
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.definition = heroDefinition;

    this.equipment = {
      arme: null,
      torse: null,
    };

    this.baseDps = heroDefinition.baseDps;
    this.baseMaxHp = 100;
    this.baseArmor = 0;
    this.baseCritChance = 0.05; // 5%
    this.baseCritDamage = 1.5;  // 150%

    this.hp = this.maxHp;
    this.baseHpRegen = 0;
  }

  // --- NOUVELLE MÉTHODE CENTRALISÉE POUR CALCULER LES BONUS ---
  // Cette méthode parcourt tout l'équipement et additionne les bonus
  getStatsFromEquipment() {
    const bonuses = {
      dps: 0,
      dpsPercent: 0,
      maxHp: 0,
      hpPercent: 0,
      armor: 0,
      critChance: 0,
      critDamage: 0,
      hpRegen: 0,
      goldFind: 0,
    };

    for (const slot in this.equipment) {
      const item = this.equipment[slot];
      if (item) {
        for (const [stat, value] of Object.entries(item.stats)) {
          if (bonuses[stat] !== undefined) {
            bonuses[stat] += value;
          }
        }
      }
    }
    return bonuses;
  }


  // --- GETTERS UTILISANT LA NOUVELLE MÉTHODE ---
  get dps() {
    const bonuses = this.getStatsFromEquipment();
    const totalFlatDps = this.baseDps + bonuses.dps;
    const totalPercentDps = 1 + (bonuses.dpsPercent / 100);
    return totalFlatDps * totalPercentDps;
  }

  get maxHp() {
    const bonuses = this.getStatsFromEquipment();
    const totalFlatHp = this.baseMaxHp + bonuses.maxHp;
    const totalPercentHp = 1 + (bonuses.hpPercent / 100);
    return Math.ceil(totalFlatHp * totalPercentHp);
  }
  
  get armor() {
    const bonuses = this.getStatsFromEquipment();
    return this.baseArmor + bonuses.armor;
  }
  
  get critChance() {
    const bonuses = this.getStatsFromEquipment();
    return this.baseCritChance + (bonuses.critChance / 100);
  }

  get critDamage() {
    const bonuses = this.getStatsFromEquipment();
    return this.baseCritDamage + (bonuses.critDamage / 100);
  }
  
get hpRegen() {
    const bonuses = this.getStatsFromEquipment();
    return this.baseHpRegen + (bonuses.hpRegen || 0);
  }

  equipItem(item) {
    if (!item || !item.baseDefinition.slot) return;
    const slot = item.baseDefinition.slot;
    this.equipment[slot] = item;
    console.log(`${item.name} équipé sur ${this.name}.`);
    if (item.baseDefinition.stat === 'maxHp') {
        this.hp = this.maxHp; // Soin complet quand on équipe une nouvelle armure
    }
  }
  
  levelUp() {
    this.level++;
    this.xp -= this.xpToNextLevel;
    this.baseMaxHp += this.definition.hpPerLevel;
    this.baseDps += this.definition.dpsPerLevel;
    this.hp = this.maxHp;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
    console.log(`${this.name} passe au niveau ${this.level} !`);
  }
  
  addXp(amount) { this.xp += amount; while (this.xp >= this.xpToNextLevel) { this.levelUp(); } }
  takeDamage(amount) { if (this.status !== 'fighting') return; this.hp = Math.max(0, this.hp - amount); if (this.hp === 0) { this.status = 'recovering'; } }
  regenerate(amount) { if (this.hp >= this.maxHp) return; this.hp = Math.min(this.maxHp, this.hp + amount); if (this.status === 'recovering' && this.hp >= this.maxHp / 2) { this.status = 'fighting'; } }
  isFighting() { return this.status === 'fighting'; }
}
