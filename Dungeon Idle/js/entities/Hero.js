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

    // MODIFIÉ : Ajout des nouveaux emplacements
    this.equipment = {
      arme: null,
      torse: null,
      tete: null,
      jambes: null,
      mains: null,
      pieds: null,
      amulette: null,
      anneau1: null,
      anneau2: null,
      bibelot: null,
    };

    this.baseDps = heroDefinition.baseDps;
    this.baseMaxHp = 100;
    this.baseArmor = 0;
    this.baseCritChance = 0.05; // 5%
    this.baseCritDamage = 1.5;  // 150%
    this.baseHpRegen = 0;
    this.baseGoldFind = 0; // NOUVEAU
    
    this.hp = this.maxHp;
  }

  // --- MÉTHODES DE CALCUL DE STATS ---

  getStatsFromEquipment(equipment = this.equipment) {
    // MODIFIÉ : Ajout de goldFind
    const bonuses = {
      dps: 0, dpsPercent: 0, maxHp: 0, hpPercent: 0,
      armor: 0, critChance: 0, critDamage: 0, hpRegen: 0, goldFind: 0,
    };

    for (const slot in equipment) {
      const item = equipment[slot];
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

  get dps() { return this.baseDps * (1 + (this.getStatsFromEquipment().dpsPercent / 100)) + this.getStatsFromEquipment().dps; }
  get maxHp() { return Math.ceil((this.baseMaxHp + this.getStatsFromEquipment().maxHp) * (1 + (this.getStatsFromEquipment().hpPercent / 100))); }
  get armor() { return this.baseArmor + this.getStatsFromEquipment().armor; }
  get critChance() { return this.baseCritChance + (this.getStatsFromEquipment().critChance / 100); }
  get critDamage() { return this.baseCritDamage + (this.getStatsFromEquipment().critDamage / 100); }
  get hpRegen() { return this.baseHpRegen + this.getStatsFromEquipment().hpRegen; }
  get goldFind() { return this.baseGoldFind + (this.getStatsFromEquipment().goldFind / 100); } // NOUVEAU

  getAllStats() {
    return {
      dps: this.dps,
      maxHp: this.maxHp,
      armor: this.armor,
      critChance: this.critChance,
      critDamage: this.critDamage,
      hpRegen: this.hpRegen,
      goldFind: this.goldFind, // NOUVEAU
    };
  }

  calculateStatChanges(newItem) {
    const changes = {};
    const currentStats = this.getAllStats();
    
    const slot = newItem.baseDefinition.slot;
    const simulatedEquipment = { ...this.equipment, [slot]: newItem };

    const newBonuses = this.getStatsFromEquipment(simulatedEquipment);
    const newStats = {
      dps: this.baseDps * (1 + (newBonuses.dpsPercent / 100)) + newBonuses.dps,
      maxHp: Math.ceil((this.baseMaxHp + newBonuses.maxHp) * (1 + (newBonuses.hpPercent / 100))),
      armor: this.baseArmor + newBonuses.armor,
      critChance: this.baseCritChance + (newBonuses.critChance / 100),
      critDamage: this.baseCritDamage + (newBonuses.critDamage / 100),
      hpRegen: this.baseHpRegen + newBonuses.hpRegen,
      goldFind: this.baseGoldFind + (newBonuses.goldFind / 100), // NOUVEAU
    };

    for (const statKey in currentStats) {
        const diff = newStats[statKey] - currentStats[statKey];
        if (diff !== 0) {
            changes[statKey] = diff;
        }
    }

    return changes;
  }

  // --- AUTRES MÉTHODES --- (inchangées)
  equipItem(item) {
    if (!item || !item.baseDefinition.slot) return;
    const slot = item.baseDefinition.slot;
    this.equipment[slot] = item;
    console.log(`${item.name} équipé sur ${this.name}.`);
    if (this.hp > this.maxHp) {
        this.hp = this.maxHp;
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
