// js/ui/UIUpdater.js

import { MonsterGroup } from '../entities/MonsterGroup.js';
import { renderInventory } from './InventoryUI.js';
import { renderHeroesUI, updateHeroVitals } from './HeroUI.js';
import { renderShopUI } from './ShopUI.js';
import { renderLootUI } from './LootUI.js';
import { flushDamageBuckets, showNotification } from './EffectsUI.js';
import { createElement } from '../utils/domHelper.js'; // Importe la fonction createElement

// Récupération des éléments DOM principaux
const monsterNameEl = document.getElementById('monster-name');
const monsterHpBarEl = document.getElementById('monster-hp-bar');
const monsterHpTextEl = document.getElementById('monster-hp-text');
const playerGoldEl = document.getElementById('player-gold');
const recruitmentAreaEl = document.getElementById('recruitment-area');
const recruitmentSectionEl = document.getElementById('recruitment-section');
const gameStatusMessageEl = document.getElementById('game-status-message');
const floorDisplayEl = document.getElementById('floor-display');
const encounterDisplayEl = document.getElementById('encounter-display');
const progressionControlsEl = document.getElementById('progression-controls');

let lastRenderedMonsterInstanceId = null; // Pour optimiser les transitions de la barre de vie du monstre

/**
 * Met à jour l'interface utilisateur du monstre actif.
 * @param {MonsterGroup|Boss|null} monster - Le monstre actuellement actif.
 */
function updateMonsterUI(monster) {
  if (!monster) {
    // Si aucun monstre n'est actif, réinitialise l'affichage
    monsterNameEl.textContent = '---';
    monsterHpTextEl.textContent = 'HP: 0 / 0';
    monsterHpBarEl.style.width = '0%';
    lastRenderedMonsterInstanceId = null;
    return;
  }
  
  // Détecte si c'est un nouveau monstre pour appliquer une transition de barre de vie instantanée
  const isNewMonster = monster.instanceId !== lastRenderedMonsterInstanceId;
  const maxHp = monster.totalMaxHp || monster.maxHp; // Utilise totalMaxHp pour MonsterGroup, maxHp pour Boss
  const currentHp = monster.currentHp || 0;
  const hpPercent = (currentHp / maxHp) * 100;

  if (isNewMonster) {
      // Désactive temporairement la transition pour un "pop" visuel de la nouvelle barre de vie
      monsterHpBarEl.classList.add('no-transition');
      monsterHpBarEl.style.width = '100%'; // Affiche la barre pleine pour le nouveau monstre

      // Réactive la transition après un court délai pour les mises à jour suivantes
      requestAnimationFrame(() => {
          monsterHpBarEl.classList.remove('no-transition');
          monsterHpBarEl.style.width = `${hpPercent}%`; 
      });
      lastRenderedMonsterInstanceId = monster.instanceId;
  } else {
      // Met à jour la largeur de la barre de vie avec transition normale
      monsterHpBarEl.style.width = `${hpPercent}%`;
  }

  // Affiche le nom du monstre ou du groupe de monstres
  if (monster instanceof MonsterGroup) {
    const plural = monster.initialCount > 1 ? 's' : '';
    monsterNameEl.textContent = `Un groupe de ${monster.initialCount} ${monster.name}${plural} (dont ${monster.currentCount} en vie)`;
  } else { // C'est un Boss
    monsterNameEl.textContent = monster.name;
  }

  // Affiche les HP numériques
  monsterHpTextEl.textContent = `HP: ${Math.ceil(currentHp)} / ${Math.ceil(maxHp)}`;
}

/**
 * Met à jour l'affichage de l'or du joueur, y compris le bonus de découverte d'or et une animation.
 * @param {object} state - L'état global du jeu.
 * @param {object} oldState - L'état précédent du jeu (pour détecter les changements d'or).
 */
function updateGoldUI(state, oldState) {
    let totalGoldFind = 0;
    state.heroes.forEach(hero => totalGoldFind += hero.goldFind); // Somme les bonus de découverte d'or des héros
    const goldFindPercent = (totalGoldFind * 100).toFixed(0); // Convertit en pourcentage

    const currentGold = Math.floor(state.gold);
    let goldText = currentGold;
    if (goldFindPercent > 0) {
        goldText += ` (+${goldFindPercent}%)`; // Ajoute le bonus si applicable
    }
    playerGoldEl.textContent = goldText;

    // Déclenche une animation "pop" si l'or a augmenté
    if (currentGold > (oldState.gold || 0)) {
        playerGoldEl.classList.add('gold-pop');
        playerGoldEl.addEventListener('animationend', () => {
            playerGoldEl.classList.remove('gold-pop');
        }, { once: true });
    }
}

/**
 * Met à jour le message d'état général du jeu.
 * @param {object} state - L'état global du jeu.
 */
function updateGameStatusMessage(state) {
  const { gameStatus, bossUnlockReached, bossIsDefeated, pendingBossFight } = state;
  let message = '';
  if (gameStatus === 'party_wipe') {
    message = 'Groupe anéanti ! Récupération en cours...';
  } else if (gameStatus === 'encounter_cooldown') {
    message = 'Combat terminé !';
  } else if (pendingBossFight) {
    message = 'Le boss arrive !';
  } else if (gameStatus === 'boss_fight') {
    message = 'COMBAT CONTRE LE BOSS !';
  } else if (bossIsDefeated) {
    message = 'Le gardien de l\'étage est vaincu !';
  } else if (bossUnlockReached) {
    message = 'Le gardien de l\'étage peut être affronté.';
  }
  gameStatusMessageEl.textContent = message;
}

/**
 * Met à jour l'affichage de l'étage du donjon et de l'index de rencontre.
 * @param {object} state - L'état global du jeu.
 */
function updateDungeonUI(state) {
  const { dungeonFloor, encounterIndex, gameStatus, bossIsDefeated, bossUnlockReached } = state;
  floorDisplayEl.textContent = `Étage ${dungeonFloor}`;
  
  if (gameStatus === 'boss_fight') {
    encounterDisplayEl.textContent = "COMBAT DE BOSS";
  } else if (bossIsDefeated) {
    encounterDisplayEl.textContent = `Exploration (Boss vaincu)`;
  } else if (bossUnlockReached) {
    encounterDisplayEl.textContent = `Rencontre ${encounterIndex} (Boss disponible)`;
  } else {
    encounterDisplayEl.textContent = `Rencontre ${encounterIndex}`;
  }
}

/**
 * Rend la zone de recrutement des héros.
 * @param {object} heroDefinitions - Les définitions des héros.
 */
function renderRecruitmentArea(heroDefinitions) {
  recruitmentAreaEl.innerHTML = ''; // Vide la zone de recrutement
  // Filtre les héros qui sont "disponibles" (débloqués mais pas encore recrutés)
  const availableHeroes = Object.values(heroDefinitions).filter(def => def.status === 'available');

  if (availableHeroes.length > 0) {
    recruitmentSectionEl.classList.remove('hidden'); // Affiche la section de recrutement
    availableHeroes.forEach(heroDef => {
        const button = createElement('button', {
            textContent: `Recruter ${heroDef.name} (${heroDef.cost > 0 ? `${heroDef.cost} Or` : 'Gratuit'})`,
            dataset: { heroId: heroDef.id } // Stocke l'ID du héros dans un attribut de données
        });
        recruitmentAreaEl.appendChild(button);
    });
  } else {
    recruitmentSectionEl.classList.add('hidden'); // Cache la section si aucun héros n'est disponible
  }
}

/**
 * Met à jour les contrôles de progression (boutons "Affronter le Boss", "Étage Suivant").
 * @param {object} state - L'état global du jeu.
 */
function updateProgressionUI(state) {
  progressionControlsEl.innerHTML = ''; // Vide les contrôles

  // Affiche le bouton "Affronter le Boss" si le boss est débloqué, pas encore vaincu,
  // et qu'on n'est pas déjà en train de l'attendre ou de le combattre.
  if (state.bossUnlockReached && !state.bossIsDefeated && !state.pendingBossFight && state.gameStatus !== 'boss_fight') {
    progressionControlsEl.appendChild(createElement('button', { textContent: 'Affronter le Boss', id: 'fight-boss-btn' }));
  } else if (state.bossIsDefeated) {
    // Le bouton "Étage Suivant" n'apparaît que si le boss est vaincu.
    progressionControlsEl.appendChild(createElement('button', { textContent: 'Étage Suivant', id: 'next-floor-btn' }));
  }
}

/**
 * Fonction principale de mise à jour de l'interface utilisateur.
 * Appelée à chaque frame de la boucle de jeu.
 * @param {object} state - L'état global du jeu.
 * @param {number} dt - Le temps écoulé.
 * @param {object} oldState - L'état précédent du jeu.
 */
export function updateUI(state, dt, oldState) {
  // Vide les "buckets" de dégâts/soins et crée les textes flottants
  flushDamageBuckets(state, dt);
  
  // Affiche les notifications en file d'attente
  if (state.notifications && state.notifications.length > 0) {
      const notification = state.notifications.shift(); // Prend la première notification de la file
      showNotification(notification.message, notification.type);
  }

  // Mises à jour UI fréquentes (sans recréer les éléments)
  updateMonsterUI(state.activeMonster);
  updateHeroVitals(state.heroes); // Met à jour les barres de vie/XP des héros
  updateGoldUI(state, oldState);
  updateGameStatusMessage(state);
  updateDungeonUI(state);

  // Mises à jour UI complètes (recréant les éléments) basées sur les drapeaux
  if (state.ui.heroesNeedUpdate) {
      // Passe l'étage actuel à renderHeroesUI pour le calcul de l'armure dans l'infobulle
      renderHeroesUI(state.heroes, state.itemToEquip, state.ui.heroCardState, state.eventBus, state.dungeonFloor);
      state.ui.heroesNeedUpdate = false; // Réinitialise le drapeau
  }

  if (state.ui.shopNeedsUpdate) {
      renderShopUI(state.shopItems);
      state.ui.shopNeedsUpdate = false;
  }

  if (state.ui.inventoryNeedsUpdate) {
      renderInventory(state.inventory, state.itemToEquip);
      state.ui.inventoryNeedsUpdate = false;
  }

  if (state.ui.lootNeedsUpdate) {
      renderLootUI(state.droppedItems);
      state.ui.lootNeedsUpdate = false;
  }

  if (state.ui.recruitmentNeedsUpdate) {
      renderRecruitmentArea(state.heroDefinitions);
      state.ui.recruitmentNeedsUpdate = false;
  }
  
  if (state.ui.progressionNeedsUpdate) {
      updateProgressionUI(state);
      state.ui.progressionNeedsUpdate = false;
  }
}

