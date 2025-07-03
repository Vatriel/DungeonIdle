// js/entities/Hero.js

const RECOVERY_RATE_SLOW = 2;

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
      arme: null, torse: null, tete: null, jambes: null,
      mains: null, pieds: null, amulette: null, anneau1: null,
      anneau2: null, bibelot: null,
    };
    this.activeBuffs = [];

    this.baseDps = heroDefinition.baseDps;
    this.baseMaxHp = 100;
    this.baseArmor = 0;
    this.baseCritChance = 0.05;
    this.baseCritDamage = 1.5;
    this.baseHpRegen = 0;
    this.baseGoldFind = 0;
    
    this._statsCache = {};
    this._recalculateStats();
    this.hp = this.maxHp;
  }

  update(party, dt, eventBus) {
      this.regenerate(this.hpRegen * dt);
      if (this.status === 'recovering') {
          this.regenerate(RECOVERY_RATE_SLOW * dt);
      }

      let statsNeedRecalc = false;
      for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
          const buff = this.activeBuffs[i];
          buff.duration -= dt;
          if (buff.duration <= 0) {
              this.activeBuffs.splice(i, 1);
              statsNeedRecalc = true;
          }
      }

      if (statsNeedRecalc) {
          this._recalculateStats();
          eventBus.emit('ui_heroes_need_update');
      }
  }
  
  _getBonusesFromEquipment(equipment) {
      const bonuses = {
        dps: 0, dpsPercent: 0, maxHp: 0, hpPercent: 0,
        armor: 0, critChance: 0, critDamage: 0, hpRegen: 0, goldFind: 0,
        healPower: 0, healPercent: 0, buffPotency: 0, buffDuration: 0,
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

  _recalculateStats(equipmentOverride = this.equipment) {
    const bonuses = this._getBonusesFromEquipment(equipmentOverride);
    
    this.activeBuffs.forEach(buff => {
        if (bonuses[buff.stat] !== undefined) {
            bonuses[buff.stat] += buff.value;
        }
    });

    const calculatedStats = {};
    calculatedStats.dps = this.baseDps * (1 + (bonuses.dpsPercent / 100)) + bonuses.dps;
    calculatedStats.maxHp = Math.ceil((this.baseMaxHp + bonuses.maxHp) * (1 + (bonuses.hpPercent / 100)));
    calculatedStats.armor = this.baseArmor + bonuses.armor;
    calculatedStats.critChance = this.baseCritChance + (bonuses.critChance / 100);
    calculatedStats.critDamage = this.baseCritDamage + (bonuses.critDamage / 100);
    calculatedStats.hpRegen = this.baseHpRegen + bonuses.hpRegen;
    calculatedStats.goldFind = this.baseGoldFind + (bonuses.goldFind / 100);
    
    if (equipmentOverride === this.equipment) {
        this._statsCache = calculatedStats;
    }
    return calculatedStats;
  }
  
  get dps() { return this._statsCache.dps || 0; }
  get maxHp() { return this._statsCache.maxHp || 0; }
  get armor() { return this._statsCache.armor || 0; }
  get critChance() { return this._statsCache.critChance || 0; }
  get critDamage() { return this._statsCache.critDamage || 0; }
  get hpRegen() { return this._statsCache.hpRegen || 0; }
  get goldFind() { return this._statsCache.goldFind || 0; }
  getAllStats() { return { ...this._statsCache }; }

  calculateStatChanges(newItem) {
    const changes = {};
    const currentStats = this.getAllStats();
    const slot = newItem.baseDefinition.slot;
    const simulatedEquipment = { ...this.equipment, [slot]: newItem };
    const newStats = this._recalculateStats(simulatedEquipment);
    for (const statKey in currentStats) {
        const diff = newStats[statKey] - currentStats[statKey];
        if (Math.abs(diff) > 0.001) {
            changes[statKey] = diff;
        }
    }
    return changes;
  }

  equipItem(item) {
    if (!item || !item.baseDefinition.slot) return;
    const slot = item.baseDefinition.slot;
    this.equipment[slot] = item;
    this._recalculateStats();
    if (this.hp > this.maxHp) {
        this.hp = this.maxHp;
    }
  }

  unequipItem(slot) {
      if (!this.equipment[slot]) return null;
      const unequippedItem = this.equipment[slot];
      this.equipment[slot] = null;
      this._recalculateStats();
      if (this.hp > this.maxHp) {
        this.hp = this.maxHp;
      }
      return unequippedItem;
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNextLevel;
    this.baseMaxHp += this.definition.hpPerLevel;
    this.baseDps += this.definition.dpsPerLevel;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
    this._recalculateStats();
    this.hp = this.maxHp;
  }

  addBuff(buff) {
      this.activeBuffs.push(buff);
      this._recalculateStats();
  }

  regenerate(amount) {
      if (this.hp >= this.maxHp) return 0;
      const oldHp = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + amount);
      if (this.status === 'recovering' && this.hp >= this.maxHp / 2) {
          this.status = 'fighting';
      }
      return this.hp - oldHp;
  }

  addXp(amount) { this.xp += amount; while (this.xp >= this.xpToNextLevel) { this.levelUp(); } }
  takeDamage(amount) { if (this.status !== 'fighting') return; this.hp = Math.max(0, this.hp - amount); if (this.hp === 0) { this.status = 'recovering'; } }
  isFighting() { return this.status === 'fighting'; }
}
