// js/entities/components/StatCalculator.js
// Ce module est responsable de toute la logique complexe de calcul des statistiques d'un héros.

import { PRESTIGE_UPGRADES } from '../../data/prestigeData.js';
import { TAVERN_GOODS } from '../../data/tavernGoodsData.js';

export const StatCalculator = {
    getBonusesFromEquipment(equipment) {
        const bonuses = {
          strength: 0, dexterity: 0, intelligence: 0, endurance: 0,
          damagePercent: 0, attackSpeedPercent: 0, flatPhysicalDamage: 0, flatMagicalDamage: 0,
          maxHp: 0, hpPercent: 0, armor: 0, critChance: 0, critDamage: 0, 
          hpRegen: 0, goldFind: 0, lifeSteal: 0, thorns: 0,
          healPower: 0, healPercent: 0, buffPotency: 0, buffDuration: 0,
          riposteChance: 0,
          shieldPotency: 0, beamChargeRate: 0,
          // Ajout de stats en % pour les consommables
          armorPercent: 0, endurancePercent: 0, dexterityPercent: 0,
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
    },

    calculateFinalStats(hero, state, equipmentOverride = hero.equipment) {
        const bonuses = this.getBonusesFromEquipment(equipmentOverride);
        
        if (hero.hasUniqueEffect('MADMANS_MASK')) {
            bonuses.critDamage += 30;
            bonuses.critChance -= 10;
        }
        if (hero.hasUniqueEffect('DRUNKARDS_RING')) {
            bonuses.strength += 20;
            bonuses.attackSpeedPercent -= 15;
            bonuses.critChance -= 10;
        }
        if (hero.hasUniqueEffect('ANCHOR_LEGGINGS')) {
            bonuses.armor *= 1.5;
            bonuses.hpPercent += 25;
            bonuses.attackSpeedPercent -= 30;
        }

        const buffBonuses = hero.buffs.getBonuses();
        for (const stat in buffBonuses) {
            if (bonuses[stat] !== undefined) {
                bonuses[stat] += buffBonuses[stat];
            }
        }

        // --- NOUVEAU : AJOUT DES BONUS DES CONSOMMABLES ACTIFS ---
        if (state.activeConsumables && state.activeConsumables.length > 0) {
            for (const consumable of state.activeConsumables) {
                const good = TAVERN_GOODS[consumable.id];
                if (good && good.bonus) {
                    if (bonuses[good.bonus.stat] !== undefined) {
                        bonuses[good.bonus.stat] += good.bonus.value;
                    } else {
                        // Initialise la stat si elle n'existe pas dans l'objet bonuses
                        bonuses[good.bonus.stat] = good.bonus.value;
                    }
                }
            }
        }
        // --- FIN DE L'AJOUT ---

        const auras = state.globalAuraBonuses || {};
        bonuses.attackSpeedPercent += auras.attackSpeedPercent || 0;
        bonuses.armor += auras.armor || 0;
        bonuses.critDamage += auras.critDamage || 0;
        bonuses.riposteChance += auras.riposteChance || 0;

        if (hero.hasUniqueEffect('CLEAR_MIND_DIADEM')) {
            bonuses.critChance += Math.floor(bonuses.intelligence / 10);
        }
        if (hero.hasUniqueEffect('SPIRIT_FORCE_ROBE')) {
            bonuses.healPower += (hero.definition.baseStrength + (bonuses.strength || 0)) * 0.25;
        }

        const calculatedStats = {};
        
        let archivistBonus = 0;
        if (hero.hasUniqueEffect('ARCHIVIST_SEAL')) {
            archivistBonus = Math.floor(hero.level / 5);
        }

        let baseEndurance = hero.definition.baseEndurance + (hero.level - 1) * hero.definition.endurancePerLevel + (bonuses.endurance || 0) + archivistBonus;
        baseEndurance *= (1 + ((auras.endurancePercent || 0) / 100) + ((bonuses.endurancePercent || 0) / 100));
        calculatedStats.endurance = baseEndurance;

        calculatedStats.strength = hero.definition.baseStrength + (hero.level - 1) * hero.definition.strengthPerLevel + (bonuses.strength || 0) + archivistBonus;
        
        let baseDexterity = hero.definition.baseDexterity + (hero.level - 1) * hero.definition.dexterityPerLevel + (bonuses.dexterity || 0) + archivistBonus;
        baseDexterity *= (1 + ((bonuses.dexterityPercent || 0) / 100));
        calculatedStats.dexterity = baseDexterity;

        calculatedStats.intelligence = hero.definition.baseIntelligence + (hero.level - 1) * hero.definition.intelligencePerLevel + (bonuses.intelligence || 0) + archivistBonus;

        if (hero.hasUniqueEffect('BALANCE_BOOTS')) {
            const { strengthPerLevel, dexterityPerLevel, intelligencePerLevel } = hero.definition;
            if (strengthPerLevel >= dexterityPerLevel && strengthPerLevel >= intelligencePerLevel) {
                calculatedStats.strength += (calculatedStats.dexterity + calculatedStats.intelligence) * 0.15;
            } else if (dexterityPerLevel >= strengthPerLevel && dexterityPerLevel >= intelligencePerLevel) {
                calculatedStats.dexterity += (calculatedStats.strength + calculatedStats.intelligence) * 0.15;
            } else {
                calculatedStats.intelligence += (calculatedStats.strength + calculatedStats.dexterity) * 0.15;
            }
        }

        let baseDamageFromStats = hero.definition.baseDamage;
        if (hero.definition.damageType === 'physical') {
            baseDamageFromStats += calculatedStats.strength * 2;
        } else {
            baseDamageFromStats += calculatedStats.intelligence * 2;
        }

        calculatedStats.maxHp = hero.baseMaxHp + (calculatedStats.endurance * 20);
        
        let baseArmor = hero.baseArmor + (calculatedStats.strength * 0.5) + (calculatedStats.endurance * 0.25);
        baseArmor *= (1 + ((bonuses.armorPercent || 0) / 100));
        calculatedStats.armor = baseArmor;

        calculatedStats.hpRegen = hero.baseHpRegen + (calculatedStats.endurance * 0.1);

        const flatDamageBonus = (hero.definition.damageType === 'physical' ? (bonuses.flatPhysicalDamage || 0) : (bonuses.flatMagicalDamage || 0));
        calculatedStats.damage = (baseDamageFromStats + flatDamageBonus) * (1 + ((bonuses.damagePercent || 0) / 100));
        
        const baseAttackSpeed = hero.definition.baseAttackSpeed;
        calculatedStats.attackSpeed = baseAttackSpeed * (1 + ((bonuses.attackSpeedPercent || 0) / 100));

        calculatedStats.maxHp = Math.ceil((calculatedStats.maxHp + (bonuses.maxHp || 0)) * (1 + ((bonuses.hpPercent || 0) / 100)));
        calculatedStats.armor += (bonuses.armor || 0);
        
        if (hero.hasUniqueEffect('MOUNTAIN_GREAVES')) {
            calculatedStats.armor += calculatedStats.maxHp * 0.05;
        }

        calculatedStats.hpRegen += (bonuses.hpRegen || 0);
        
        let rawCritChance = hero.baseCritChance + ((bonuses.critChance || 0) / 100);
        let excessCritChance = 0;
        if (rawCritChance > 1.0) {
            excessCritChance = rawCritChance - 1.0;
            calculatedStats.critChance = 1.0;
        } else {
            calculatedStats.critChance = rawCritChance;
        }

        calculatedStats.critDamage = hero.baseCritDamage + ((bonuses.critDamage || 0) / 100) + (excessCritChance * 0.5); 

        calculatedStats.goldFind = hero.baseGoldFind + ((bonuses.goldFind || 0) / 100);
        calculatedStats.lifeSteal = ((bonuses.lifeSteal || 0) / 100);
        calculatedStats.thorns = bonuses.thorns || 0;
        
        calculatedStats.healPower = (bonuses.healPower || 0);
        calculatedStats.healPercent = (bonuses.healPercent || 0);
        
        calculatedStats.shieldPotency = (bonuses.shieldPotency || 0);
        calculatedStats.beamChargeRate = (bonuses.beamChargeRate || 0);
        
        calculatedStats.damageReduction = (auras.damageReduction || 0) / 100;
        calculatedStats.healEffectiveness = (auras.healEffectiveness || 0) / 100;

        if (state && state.prestigeUpgrades) {
            const eternalStrengthLevel = state.prestigeUpgrades.ETERNAL_STRENGTH;
            if (eternalStrengthLevel) {
                const bonusPercent = PRESTIGE_UPGRADES.ETERNAL_STRENGTH.effect(eternalStrengthLevel);
                calculatedStats.damage *= (1 + bonusPercent / 100);
            }
        }

        if (hero.hasUniqueEffect('GLASS_ARMOR')) {
            calculatedStats.damage *= 1.25;
        }

        if (hero.hasUniqueEffect('BLOODLETTER_AXE')) {
            // MODIFIÉ : L'effet de la Hache du Saigneur est maintenant de 100% de la régénération de PV
            calculatedStats.damage += calculatedStats.hpRegen * 1; // Anciennement * 5
        }

        if (hero.hasUniqueEffect('VITAL_TRANSMUTATION_NECKLACE')) {
            calculatedStats.lifeSteal += calculatedStats.critChance * 0.25;
        }

        return calculatedStats;
    }
};
