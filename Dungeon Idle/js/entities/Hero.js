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
    this.attackTimer = 0;

    this.equipment = {
      arme: null, torse: null, tete: null, jambes: null,
      mains: null, pieds: null, amulette: null, anneau1: null,
      anneau2: null, bibelot: null,
    };
    this.activeBuffs = [];

    // Constantes de base
    this.baseMaxHp = 50;
    this.baseArmor = 0;
    this.baseCritChance = 0.05;
    this.baseCritDamage = 1.5;
    this.baseHpRegen = 1;
    this.baseGoldFind = 0;
    
    this._statsCache = {};
    this._recalculateStats();
    this.hp = this.maxHp;
  }

  update(state, dt, eventBus) {
      const regenResult = this.regenerate(this.hpRegen * dt);
      if (regenResult.statusChanged) {
          state.ui.heroesNeedUpdate = true;
      }
      
      if (this.status === 'recovering') {
          const recoveryResult = this.regenerate(RECOVERY_RATE_SLOW * dt);
          if (recoveryResult.statusChanged) {
              state.ui.heroesNeedUpdate = true;
          }
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
        strength: 0, dexterity: 0, intelligence: 0, endurance: 0,
        damagePercent: 0, attackSpeedPercent: 0, flatPhysicalDamage: 0, flatMagicalDamage: 0,
        maxHp: 0, hpPercent: 0, armor: 0, critChance: 0, critDamage: 0, 
        hpRegen: 0, goldFind: 0, lifeSteal: 0, thorns: 0,
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
    
    calculatedStats.strength = this.definition.baseStrength + (this.level - 1) * this.definition.strengthPerLevel + (bonuses.strength || 0);
    calculatedStats.dexterity = this.definition.baseDexterity + (this.level - 1) * this.definition.dexterityPerLevel + (bonuses.dexterity || 0);
    calculatedStats.intelligence = this.definition.baseIntelligence + (this.level - 1) * this.definition.intelligencePerLevel + (bonuses.intelligence || 0);
    calculatedStats.endurance = this.definition.baseEndurance + (this.level - 1) * this.definition.endurancePerLevel + (bonuses.endurance || 0);

    let baseDamageFromStats = this.definition.baseDamage;
    if (this.definition.damageType === 'physical') {
        baseDamageFromStats += calculatedStats.strength * 2;
    } else {
        baseDamageFromStats += calculatedStats.intelligence * 2;
    }

    calculatedStats.maxHp = this.baseMaxHp + (calculatedStats.endurance * 20);
    calculatedStats.armor = this.baseArmor + (calculatedStats.strength * 0.5) + (calculatedStats.endurance * 0.25);
    calculatedStats.critChance = this.baseCritChance + ((bonuses.critChance || 0) / 100);
    calculatedStats.critDamage = this.baseCritDamage + ((bonuses.critDamage || 0) / 100);
    calculatedStats.hpRegen = this.baseHpRegen + (calculatedStats.endurance * 0.1);

    const flatDamageBonus = (this.definition.damageType === 'physical' ? (bonuses.flatPhysicalDamage || 0) : (bonuses.flatMagicalDamage || 0));
    calculatedStats.damage = (baseDamageFromStats + flatDamageBonus) * (1 + ((bonuses.damagePercent || 0) / 100));
    
    const baseAttackSpeed = this.definition.baseAttackSpeed;
    calculatedStats.attackSpeed = baseAttackSpeed * (1 + ((bonuses.attackSpeedPercent || 0) / 100));

    calculatedStats.maxHp = Math.ceil((calculatedStats.maxHp + (bonuses.maxHp || 0)) * (1 + ((bonuses.hpPercent || 0) / 100)));
    calculatedStats.armor += (bonuses.armor || 0);
    calculatedStats.hpRegen += (bonuses.hpRegen || 0);
    
    // CORRECTION : On divise par 100 ici pour convertir en vrai pourcentage, comme pour les critiques.
    calculatedStats.goldFind = this.baseGoldFind + ((bonuses.goldFind || 0) / 100);
    calculatedStats.lifeSteal = ((bonuses.lifeSteal || 0) / 100);
    calculatedStats.thorns = bonuses.thorns || 0;
    
    if (equipmentOverride === this.equipment) {
        this._statsCache = calculatedStats;
    }
    return calculatedStats;
  }
  
  get strength() { return this._statsCache.strength || 0; }
  get dexterity() { return this._statsCache.dexterity || 0; }
  get intelligence() { return this._statsCache.intelligence || 0; }
  get endurance() { return this._statsCache.endurance || 0; }
  get damage() { return this._statsCache.damage || 0; }
  get attackSpeed() { return this._statsCache.attackSpeed || 0; }
  get maxHp() { return this._statsCache.maxHp || 0; }
  get armor() { return this._statsCache.armor || 0; }
  get critChance() { return this._statsCache.critChance || 0; }
  get critDamage() { return this._statsCache.critDamage || 0; }
  get hpRegen() { return this._statsCache.hpRegen || 0; }
  get goldFind() { return this._statsCache.goldFind || 0; }
  get lifeSteal() { return this._statsCache.lifeSteal || 0; }
  get thorns() { return this._statsCache.thorns || 0; }
  getAllStats() { return { ...this._statsCache }; }

  calculateStatChanges(newItem) {
    const currentStats = this.getAllStats();
    let targetSlot = newItem.baseDefinition.slot;

    if (targetSlot === 'ring') {
        targetSlot = 'anneau1';
    }

    const simulatedEquipment = { ...this.equipment, [targetSlot]: newItem };
    const newStats = this._recalculateStats(simulatedEquipment);
    const changes = {};

    for (const statKey in currentStats) {
        const diff = newStats[statKey] - currentStats[statKey];
        if (Math.abs(diff) > 0.0001) { // Utilisation d'un epsilon plus petit pour les pourcentages
            changes[statKey] = diff;
        }
    }
    return changes;
  }

  equipItem(item, slot) {
    if (!item || !slot) return;
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

  levelUp(eventBus) {
    this.level++;
    this.xp -= this.xpToNextLevel;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
    this._recalculateStats();
    this.hp = this.maxHp;
    eventBus.emit('hero_leveled_up', { heroId: this.id });
  }

  addBuff(buff) {
      this.activeBuffs.push(buff);
      this._recalculateStats();
  }

  regenerate(amount) {
      if (this.hp >= this.maxHp) return { healedAmount: 0, statusChanged: false };
      const oldHp = this.hp;
      const oldStatus = this.status;

      this.hp = Math.min(this.maxHp, this.hp + amount);
      if (this.status === 'recovering' && this.hp >= this.maxHp / 2) {
          this.status = 'fighting';
      }
      
      return {
          healedAmount: this.hp - oldHp,
          statusChanged: oldStatus !== this.status
      };
  }

  addXp(amount, eventBus) { 
      this.xp += amount; 
      while (this.xp >= this.xpToNextLevel) { 
          this.levelUp(eventBus); 
      } 
  }
  
  takeDamage(amount) { 
      if (this.status !== 'fighting') return false; 
      this.hp = Math.max(0, this.hp - amount); 
      if (this.hp === 0) { 
          this.status = 'recovering'; 
          return true;
      }
      return false;
  }
  
  isFighting() { return this.status === 'fighting'; }
}
