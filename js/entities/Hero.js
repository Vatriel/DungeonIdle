// js/entities/Hero.js

import { StatCalculator } from './components/StatCalculator.js';
import { HeroBuffManager } from './components/HeroBuffManager.js';
import { HeroCombatHistory } from './components/HeroCombatHistory.js';

const RECOVERY_RATE_SLOW = 2;

export class Hero {
  constructor(heroDefinition) {
    this.id = heroDefinition.id;
    this.name = heroDefinition.name;
    this.definition = heroDefinition;
    this.status = 'fighting';
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.attackTimer = 0;
    this.attackCounter = 0;
    this.hp = 0;

    this.equipment = {
      arme: null, torse: null, tete: null, jambes: null,
      mains: null, pieds: null, amulette: null, anneau1: null,
      anneau2: null, bibelot: null,
    };
    
    this.buffs = new HeroBuffManager(this);
    this.history = new HeroCombatHistory(this);

    this.baseMaxHp = 50;
    this.baseArmor = 0;
    this.baseCritChance = 0.05;
    this.baseCritDamage = 1.5;
    this.baseHpRegen = 1;
    this.baseGoldFind = 0;
    
    this._statsCache = {};
  }

  initialize(state) {
    this.recalculateStats(state);
    this.hp = this.maxHp;
    this.history.hpHistory.fill(this.hp);
  }

  update(state, dt, eventBus) {
      const buffsChanged = this.buffs.update(dt);
      if (buffsChanged) {
          this.recalculateStats(state);
          state.ui.heroesNeedUpdate = true;
      }

      const regenResult = this.regenerate(this.hpRegen * dt, 'regen', eventBus, state);
      if (regenResult.statusChanged) {
          state.ui.heroesNeedUpdate = true;
      }
      
      if (this.status === 'recovering') {
          const recoveryResult = this.regenerate(RECOVERY_RATE_SLOW * dt, 'regen', eventBus, state);
          if (recoveryResult.statusChanged) {
              state.ui.heroesNeedUpdate = true;
          }
      }
  }

  recalculateStats(state) {
    this._statsCache = StatCalculator.calculateFinalStats(this, state);
  }

  takeDamage(amount) { 
      if (this.status !== 'fighting') return { damageTaken: 0, statusChanged: false };
      
      let damageRemaining = amount * (1 - this.damageReduction);
      
      if (this.hasUniqueEffect('GLASS_ARMOR')) {
          damageRemaining *= 1.25;
      }

      damageRemaining = this.buffs.absorbDamage(damageRemaining);
      
      if (damageRemaining <= 0) {
          return { damageTaken: 0, statusChanged: false };
      }

      this.history.recordDamageTaken(damageRemaining);
      this.hp = Math.max(0, this.hp - damageRemaining); 
      
      const oldStatus = this.status;
      if (this.hp === 0) { 
          this.status = 'recovering';
          this.history.logEvent('Est vaincu.', 'damage');
      }
      return { damageTaken: damageRemaining, statusChanged: oldStatus !== this.status };
  }

  regenerate(amount, source = 'regen', eventBus, state) {
      if (this.hp >= this.maxHp) return { healedAmount: 0, statusChanged: false };
      const oldHp = this.hp;
      const oldStatus = this.status;

      const healMultiplier = (1 + (this.healPercent / 100)) * (1 + this.healEffectiveness);
      const finalHealAmount = amount * healMultiplier;

      this.hp = Math.min(this.maxHp, this.hp + finalHealAmount);
      if (this.status === 'recovering' && this.hp >= this.maxHp / 2) {
          this.status = 'fighting';
      }
      
      const healedAmount = this.hp - oldHp;
      // --- MODIFICATION : Tri des sources de soins pour l'historique ---
      if (healedAmount > 0) {
          if (source === 'lifesteal') {
              this.history.recordLifeStealHealing(healedAmount);
              if (eventBus) {
                  eventBus.emit('lifesteal_triggered', { hero: this, amount: healedAmount });
              }
          } else { // 'regen', 'heal', etc.
              this.history.recordHealingReceived(healedAmount);
              if (eventBus && source === 'heal') {
                  if (!state.damageBuckets[this.id]) {
                      state.damageBuckets[this.id] = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
                  }
                  state.damageBuckets[this.id].heal += healedAmount;
              }
          }
      }
      // --- FIN DE LA MODIFICATION ---

      return {
          healedAmount: healedAmount,
          statusChanged: oldStatus !== this.status
      };
  }
  
  levelUp(state, eventBus, shouldNotify = true) {
    this.level++;
    this.xp -= this.xpToNextLevel;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
    this.recalculateStats(state);
    this.hp = this.maxHp;
    this.history.logEvent(`Niveau ${this.level} atteint !`, 'buff');
    if (shouldNotify) {
        eventBus.emit('hero_leveled_up', { heroId: this.id });
    }
  }

  addXp(amount, eventBus, state) {
      this.xp += amount; 
      while (this.xp >= this.xpToNextLevel) { 
          this.levelUp(state, eventBus);
      } 
  }

  equipItem(state, item, slot) {
    if (!item || !slot) return;
    this.equipment[slot] = item;
    this.recalculateStats(state);
    if (this.hp > this.maxHp) {
        this.hp = this.maxHp;
    }
  }

  unequipItem(state, slot) {
      if (!this.equipment[slot]) return null;
      const unequippedItem = this.equipment[slot];
      this.equipment[slot] = null;
      this.recalculateStats(state);
      if (this.hp > this.maxHp) {
        this.hp = this.maxHp;
      }
      return unequippedItem;
  }

  calculateStatChanges(state, newItem) {
    const currentStats = this.getAllStats();
    let targetSlot = newItem.baseDefinition.slot;

    if (targetSlot === 'ring') {
        targetSlot = 'anneau1'; 
    }

    const simulatedEquipment = { ...this.equipment, [targetSlot]: newItem };
    const newStats = StatCalculator.calculateFinalStats(this, state, simulatedEquipment);
    const changes = {};

    for (const statKey in newStats) {
        const diff = (newStats[statKey] || 0) - (currentStats[statKey] || 0);
        if (Math.abs(diff) > 0.0001) { 
            changes[statKey] = diff;
        }
    }
    return changes;
  }

  getPowerScore(state, statsOverride = null) {
    const stats = statsOverride || this.getAllStats();

    const nonCritDamage = stats.damage || 0;
    const critDamageMult = stats.critDamage || 1;
    const critChance = stats.critChance || 0;
    const attackSpeed = stats.attackSpeed || 0;
    const avgDamagePerHit = (nonCritDamage * (1 - critChance)) + (nonCritDamage * critDamageMult * critChance);
    const effectiveDPS = avgDamagePerHit * attackSpeed;

    const dynamicArmorConstant = 200 * Math.pow(1.05, (state.dungeonFloor || 1) - 1);
    const damageReduction = (stats.armor || 0) / ((stats.armor || 0) + dynamicArmorConstant);
    const effectiveHP = (stats.maxHp || 1) / (1 - Math.max(0, Math.min(damageReduction, 0.95)));

    const sustain = (stats.hpRegen || 0) + (effectiveDPS * (stats.lifeSteal || 0));

    const thornsValue = (stats.thorns || 0) * 10;
    const survivalScore = effectiveHP + (sustain * 10) + thornsValue;
    
    let finalScore = effectiveDPS * survivalScore;

    if (this.id === 'priest') {
        const hps = this.finalHealPower || 0;
        const buffScore = (this.finalBuffPotency || 0) * (this.finalBuffDuration || 0);
        finalScore = (survivalScore * 5) + (hps * 500) + buffScore;
    } 
    else if (this.id === 'protector') {
        const shieldPotencyValue = (stats.shieldPotency || 0) * 200;
        const beamChargeValue = (stats.beamChargeRate || 0) * 150;
        finalScore = (survivalScore * 8) + shieldPotencyValue + beamChargeValue;
    }

    return finalScore / 1000;
  }
  
  getTheoreticalDPS() {
      const stats = this.getAllStats();
      const damage = stats.damage || 0;
      const attackSpeed = stats.attackSpeed || 0;
      const critChance = stats.critChance || 0;
      const critDamageMultiplier = stats.critDamage || 1;
      const nonCritChance = 1 - critChance;

      const dps = attackSpeed * ((nonCritChance * damage) + (critChance * damage * critDamageMultiplier));
      return dps;
  }

  hasUniqueEffect(effectId) {
      for (const slot in this.equipment) {
          if (this.equipment[slot] && this.equipment[slot].baseDefinition.uniqueEffect === effectId) {
              return true;
          }
      }
      return false;
  }
  
  isFighting() { return this.status === 'fighting'; }
  
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
  get shieldPotency() { return this._statsCache.shieldPotency || 0; }
  get beamChargeRate() { return this._statsCache.beamChargeRate || 0; }
  get healPercent() { return this._statsCache.healPercent || 0; }
  get damageReduction() { return this._statsCache.damageReduction || 0; }
  get healEffectiveness() { return this._statsCache.healEffectiveness || 0; }
  
  getAllStats() { return { ...this._statsCache }; }
}
