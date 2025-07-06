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

    // Constantes de base des statistiques
    this.baseMaxHp = 50;
    this.baseArmor = 0;
    this.baseCritChance = 0.05;
    this.baseCritDamage = 1.5; // Multiplicateur de dégâts critiques (ex: 1.5 pour +50% de dégâts)
    this.baseHpRegen = 1;
    this.baseGoldFind = 0;
    
    this._statsCache = {};
    // Recalcule les statistiques initiales après la définition de l'équipement de base
    this._recalculateStats();
    // Initialise les HP après que maxHp soit calculé
    this.hp = this.maxHp;
  }

  update(state, dt, eventBus) {
      // Régénération passive des HP pour tous les héros
      const regenResult = this.regenerate(this.hpRegen * dt);
      if (regenResult.statusChanged) {
          // Si le statut du héros a changé (ex: de 'recovering' à 'fighting'),
          // on signale une mise à jour complète de l'UI des héros.
          state.ui.heroesNeedUpdate = true;
      }
      
      // Logique de récupération spécifique si le héros est "mort"
      if (this.status === 'recovering') {
          const recoveryResult = this.regenerate(RECOVERY_RATE_SLOW * dt);
          if (recoveryResult.statusChanged) {
              state.ui.heroesNeedUpdate = true;
          }
      }

      let statsNeedRecalc = false;
      // Met à jour la durée des buffs et retire ceux qui sont expirés
      for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
          const buff = this.activeBuffs[i];
          buff.duration -= dt;
          if (buff.duration <= 0) {
              this.activeBuffs.splice(i, 1);
              statsNeedRecalc = true; // Les stats doivent être recalculées si un buff expire
          }
      }

      if (statsNeedRecalc) {
          this._recalculateStats();
          // Émet un événement pour indiquer que l'UI des héros doit être mise à jour
          // (car les stats ou les buffs ont changé)
          eventBus.emit('ui_heroes_need_update');
      }
  }
  
  /**
   * Calcule les bonus de statistiques totaux provenant de l'équipement.
   * @param {object} equipment - L'objet d'équipement à analyser.
   * @returns {object} Un objet contenant la somme de tous les bonus.
   */
  _getBonusesFromEquipment(equipment) {
      // Initialise tous les bonus à 0.
      // NOTE: Pour une extensibilité future, cette liste pourrait être générée dynamiquement
      // à partir d'une définition centralisée de toutes les statistiques possibles.
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

  /**
   * Recalcule toutes les statistiques du héros en fonction de son niveau, de sa définition
   * et de son équipement. Met à jour le cache des statistiques.
   * @param {object} [equipmentOverride] - Un équipement temporaire à utiliser pour la simulation (ex: pour comparer un nouvel item).
   * @returns {object} Les statistiques calculées.
   */
  _recalculateStats(equipmentOverride = this.equipment) {
    const bonuses = this._getBonusesFromEquipment(equipmentOverride);
    
    // Applique les bonus des buffs actifs
    this.activeBuffs.forEach(buff => {
        if (bonuses[buff.stat] !== undefined) {
            bonuses[buff.stat] += buff.value;
        }
    });

    const calculatedStats = {};
    
    // Calcul des attributs primaires
    calculatedStats.strength = this.definition.baseStrength + (this.level - 1) * this.definition.strengthPerLevel + (bonuses.strength || 0);
    calculatedStats.dexterity = this.definition.baseDexterity + (this.level - 1) * this.definition.dexterityPerLevel + (bonuses.dexterity || 0);
    calculatedStats.intelligence = this.definition.baseIntelligence + (this.level - 1) * this.definition.intelligencePerLevel + (bonuses.intelligence || 0);
    calculatedStats.endurance = this.definition.baseEndurance + (this.level - 1) * this.definition.endurancePerLevel + (bonuses.endurance || 0);

    // Calcul des dégâts de base (affectés par le type de dégâts du héros)
    let baseDamageFromStats = this.definition.baseDamage;
    if (this.definition.damageType === 'physical') {
        baseDamageFromStats += calculatedStats.strength * 2;
    } else { // 'magical'
        baseDamageFromStats += calculatedStats.intelligence * 2;
    }

    // Calcul des HP max, armure et régénération HP
    calculatedStats.maxHp = this.baseMaxHp + (calculatedStats.endurance * 20);
    calculatedStats.armor = this.baseArmor + (calculatedStats.strength * 0.5) + (calculatedStats.endurance * 0.25);
    calculatedStats.hpRegen = this.baseHpRegen + (calculatedStats.endurance * 0.1);

    // Application des bonus d'équipement et de buffs (pourcentages et valeurs brutes)
    const flatDamageBonus = (this.definition.damageType === 'physical' ? (bonuses.flatPhysicalDamage || 0) : (bonuses.flatMagicalDamage || 0));
    calculatedStats.damage = (baseDamageFromStats + flatDamageBonus) * (1 + ((bonuses.damagePercent || 0) / 100));
    
    const baseAttackSpeed = this.definition.baseAttackSpeed;
    calculatedStats.attackSpeed = baseAttackSpeed * (1 + ((bonuses.attackSpeedPercent || 0) / 100));

    calculatedStats.maxHp = Math.ceil((calculatedStats.maxHp + (bonuses.maxHp || 0)) * (1 + ((bonuses.hpPercent || 0) / 100)));
    calculatedStats.armor += (bonuses.armor || 0);
    calculatedStats.hpRegen += (bonuses.hpRegen || 0);
    
    // Les chances et dégâts critiques sont des pourcentages directs (0.05 = 5%)
    calculatedStats.critChance = this.baseCritChance + ((bonuses.critChance || 0) / 100);
    // Les dégâts critiques sont un multiplicateur de base (1.5 = +50%) auquel on ajoute les bonus en pourcentage.
    calculatedStats.critDamage = this.baseCritDamage + ((bonuses.critDamage || 0) / 100); 

    // Les pourcentages de découverte d'or et de vol de vie sont divisés par 100
    calculatedStats.goldFind = this.baseGoldFind + ((bonuses.goldFind || 0) / 100);
    calculatedStats.lifeSteal = ((bonuses.lifeSteal || 0) / 100);
    calculatedStats.thorns = bonuses.thorns || 0;
    
    // Si ce n'est pas une simulation, met à jour le cache interne du héros
    if (equipmentOverride === this.equipment) {
        this._statsCache = calculatedStats;
    }
    return calculatedStats;
  }
  
  // Getters pour accéder aux statistiques calculées via le cache
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

  /**
   * Calcule la différence de statistiques qu'un nouvel item apporterait.
   * @param {Item} newItem - L'item à simuler.
   * @returns {object} Un objet des changements de statistiques.
   */
  calculateStatChanges(newItem) {
    const currentStats = this.getAllStats();
    let targetSlot = newItem.baseDefinition.slot;

    // Si l'item est un anneau, nous devons simuler son équipement sur le premier slot d'anneau disponible
    // ou sur anneau1 s'ils sont tous deux occupés (selon la logique de determineTargetSlot dans InventoryManager).
    // Pour une simulation de comparaison, on peut simplement le placer sur anneau1 pour voir l'impact.
    if (targetSlot === 'ring') {
        // Pour la simulation, nous allons toujours simuler sur 'anneau1' pour obtenir une comparaison de base.
        // La logique réelle d'équipement dans InventoryManager gérera le choix du slot.
        targetSlot = 'anneau1'; 
    }

    const simulatedEquipment = { ...this.equipment, [targetSlot]: newItem };
    const newStats = this._recalculateStats(simulatedEquipment);
    const changes = {};

    for (const statKey in currentStats) {
        const diff = newStats[statKey] - currentStats[statKey];
        // Utilise un epsilon pour comparer les flottants et éviter les changements insignifiants
        if (Math.abs(diff) > 0.0001) { 
            changes[statKey] = diff;
        }
    }
    return changes;
  }

  /**
   * Équipe un item dans un slot donné.
   * @param {Item} item - L'item à équiper.
   * @param {string} slot - Le slot d'équipement.
   */
  equipItem(item, slot) {
    if (!item || !slot) return;
    this.equipment[slot] = item;
    this._recalculateStats(); // Recalcule les stats après l'équipement
    // S'assure que les HP actuels ne dépassent pas les nouveaux HP max
    if (this.hp > this.maxHp) {
        this.hp = this.maxHp;
    }
  }

  /**
   * Déséquipe un item d'un slot donné.
   * @param {string} slot - Le slot d'équipement.
   * @returns {Item|null} L'item déséquipé, ou null.
   */
  unequipItem(slot) {
      if (!this.equipment[slot]) return null;
      const unequippedItem = this.equipment[slot];
      this.equipment[slot] = null;
      this._recalculateStats(); // Recalcule les stats après le déséquipement
      // S'assure que les HP actuels ne dépassent pas les nouveaux HP max
      if (this.hp > this.maxHp) {
        this.hp = this.maxHp;
      }
      return unequippedItem;
  }

  /**
   * Fait monter le héros de niveau.
   * @param {EventBus} eventBus - Le bus d'événements.
   */
  levelUp(eventBus) {
    this.level++;
    this.xp -= this.xpToNextLevel;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5); // Augmente l'XP requise
    this._recalculateStats(); // Recalcule les stats après le gain de niveau
    this.hp = this.maxHp; // Restaure tous les HP au niveau
    eventBus.emit('hero_leveled_up', { heroId: this.id });
  }

  /**
   * Ajoute un buff actif au héros.
   * @param {object} buff - L'objet buff à ajouter.
   */
  addBuff(buff) {
      this.activeBuffs.push(buff);
      this._recalculateStats(); // Recalcule les stats car les buffs affectent les stats
  }

  /**
   * Régénère les points de vie du héros.
   * @param {number} amount - La quantité de HP à régénérer.
   * @returns {object} Un objet indiquant la quantité soignée et si le statut a changé.
   */
  regenerate(amount) {
      if (this.hp >= this.maxHp) return { healedAmount: 0, statusChanged: false };
      const oldHp = this.hp;
      const oldStatus = this.status;

      this.hp = Math.min(this.maxHp, this.hp + amount);
      // Change le statut de 'recovering' à 'fighting' si les HP dépassent un certain seuil
      if (this.status === 'recovering' && this.hp >= this.maxHp / 2) {
          this.status = 'fighting';
      }
      
      return {
          healedAmount: this.hp - oldHp,
          statusChanged: oldStatus !== this.status
      };
  }

  /**
   * Ajoute de l'expérience au héros et le fait monter de niveau si l'XP est suffisante.
   * @param {number} amount - La quantité d'XP à ajouter.
   * @param {EventBus} eventBus - Le bus d'événements.
   */
  addXp(amount, eventBus) { 
      this.xp += amount; 
      while (this.xp >= this.xpToNextLevel) { 
          this.levelUp(eventBus); 
      } 
  }
  
  /**
   * Inflige des dégâts au héros.
   * @param {number} amount - La quantité de dégâts à prendre.
   * @returns {boolean} True si le statut du héros a changé (ex: est tombé KO), false sinon.
   */
  takeDamage(amount) { 
      // Les héros ne prennent pas de dégâts s'ils sont déjà en récupération
      if (this.status !== 'fighting') return false; 
      this.hp = Math.max(0, this.hp - amount); 
      if (this.hp === 0) { 
          this.status = 'recovering'; // Le héros est tombé KO
          return true;
      }
      return false;
  }
  
  /**
   * Vérifie si le héros est en état de combattre.
   * @returns {boolean} True si le héros est en train de combattre.
   */
  isFighting() { return this.status === 'fighting'; }
}

