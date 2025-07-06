// js/core/game.js

import { HERO_DEFINITIONS } from '../data/heroData.js';
import { Hero } from '../entities/Hero.js';
import { Priest } from '../entities/Priest.js';
import { StorageManager } from '../managers/StorageManager.js';
import { ShopManager } from '../managers/ShopManager.js';
import { InventoryManager } from '../managers/InventoryManager.js';
import { DungeonManager } from '../managers/DungeonManager.js';
import { UnlockManager } from '../managers/UnlockManager.js';
import { updateUI } from '../ui/UIUpdater.js';
import { showSavingIndicator, showSaveSuccess, hideSaveIndicator, showNotification, showConfirmationModal } from '../ui/EffectsUI.js';
import { EventBus } from './EventBus.js';

const PLAYER_CLICK_DAMAGE = 2;
const AUTOSAVE_INTERVAL = 10; // Intervalle d'autosauvegarde en secondes

let state = {}; // L'objet d'état global du jeu
let lastTime = 0; // Temps de la dernière frame pour le calcul du deltaTime
const eventBus = new EventBus(); // Instance du bus d'événements

/**
 * La boucle principale du jeu.
 * Met à jour la logique du jeu et l'interface utilisateur à chaque frame.
 * @param {DOMHighResTimeStamp} currentTime - Le temps actuel fourni par requestAnimationFrame.
 */
function gameLoop(currentTime) {
  if (lastTime === 0) lastTime = currentTime;
  const deltaTime = (currentTime - lastTime) / 1000; // Convertit en secondes
  
  // Sauvegarde une copie de l'état précédent pour les comparaisons dans l'UI (ex: animation de l'or)
  const oldState = { gold: state.gold };

  updateGameLogic(deltaTime); // Met à jour la logique du jeu
  updateUI(state, deltaTime, oldState); // Met à jour l'interface utilisateur
  lastTime = currentTime; // Met à jour le temps de la dernière frame
  requestAnimationFrame(gameLoop); // Demande la prochaine frame
}

/**
 * Met à jour la logique interne du jeu.
 * @param {number} dt - Le temps écoulé depuis la dernière mise à jour.
 */
function updateGameLogic(dt) {
  ShopManager.update(state, dt, eventBus);
  DungeonManager.update(state, dt, eventBus);

  // Gère l'autosauvegarde
  state.autosaveTimer += dt;
  if (state.autosaveTimer >= AUTOSAVE_INTERVAL) {
    state.autosaveTimer = 0;
    triggerSave();
  }
}

/**
 * Déclenche le processus de sauvegarde du jeu.
 */
async function triggerSave() {
    showSavingIndicator(); // Affiche l'indicateur de sauvegarde
    StorageManager.save(state); // Sauvegarde l'état du jeu
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simule un délai de sauvegarde
    showSaveSuccess(); // Affiche le succès de la sauvegarde
    setTimeout(hideSaveIndicator, 2000); // Cache l'indicateur après un délai
}

/**
 * Gère l'action de clic du joueur sur le monstre.
 */
function onPlayerClick() {
  if (state.activeMonster && state.activeMonster.isAlive()) {
    state.activeMonster.takeDamage(PLAYER_CLICK_DAMAGE); // Inflige des dégâts au monstre
    // Ajoute les dégâts au bucket pour l'affichage flottant
    if (!state.damageBuckets.monster) state.damageBuckets.monster = { damage: 0, crit: 0, heal: 0, timer: 0.3 };
    state.damageBuckets.monster.damage += PLAYER_CLICK_DAMAGE;
  }
}

/**
 * Recrute un nouveau héros si les conditions sont remplies.
 * @param {string} heroId - L'ID du héros à recruter.
 */
function recruitHero(heroId) {
  const heroDef = state.heroDefinitions[heroId.toUpperCase()];
  // Vérifie si le héros est disponible et si le joueur a assez d'or
  if (heroDef && heroDef.status === 'available' && state.gold >= heroDef.cost) {
    state.gold -= heroDef.cost; // Déduit le coût
    heroDef.status = 'recruited'; // Met à jour le statut du héros

    let newHero;
    // Crée une instance de la classe de héros appropriée (Hero ou Priest)
    switch(heroId) {
        case 'priest':
            newHero = new Priest(heroDef);
            break;
        default:
            newHero = new Hero(heroDef);
            break;
    }

    state.heroes.push(newHero); // Ajoute le nouveau héros au groupe

    // Initialise l'état de la carte du héros (non réduite par défaut)
    if (!state.ui.heroCardState) state.ui.heroCardState = {};
    state.ui.heroCardState[newHero.id] = { isCollapsed: false };

    // Signale les mises à jour nécessaires de l'UI
    state.ui.heroesNeedUpdate = true;
    state.ui.recruitmentNeedsUpdate = true;
  }
}

/**
 * Déplace un héros dans le tableau des héros (change son ordre d'affichage/priorité).
 * @param {string} heroId - L'ID du héros à déplacer.
 * @param {string} direction - La direction du déplacement ('up' ou 'down').
 */
function moveHero(heroId, direction) {
  const index = state.heroes.findIndex(h => h.id === heroId);
  if (index === -1) return; // Le héros n'a pas été trouvé

  // Logique de déplacement dans le tableau
  if (direction === 'up' && index > 0) {
    [state.heroes[index], state.heroes[index - 1]] = [state.heroes[index - 1], state.heroes[index]];
    state.ui.heroesNeedUpdate = true; // Signale une mise à jour de l'UI
  } else if (direction === 'down' && index < state.heroes.length - 1) {
    [state.heroes[index], state.heroes[index + 1]] = [state.heroes[index + 1], state.heroes[index]];
    state.ui.heroesNeedUpdate = true; // Signale une mise à jour de l'UI
  }
}

/**
 * Bascule la vue d'une carte de héros entre réduite et étendue.
 * @param {string} heroId - L'ID du héros dont la vue doit être basculée.
 */
function toggleHeroCardView(heroId) {
    if (state.ui.heroCardState && state.ui.heroCardState[heroId]) {
        state.ui.heroCardState[heroId].isCollapsed = !state.ui.heroCardState[heroId].isCollapsed;
        state.ui.heroesNeedUpdate = true; // Signale une mise à jour de l'UI
    }
}

/**
 * Met en place tous les écouteurs d'événements globaux du jeu.
 */
function setupEventListeners() {
  // Événement déclenché lorsqu'un monstre est vaincu
  eventBus.on('monster_defeated', (data) => {
    state.gold += data.goldGained; // Ajoute l'or gagné
    UnlockManager.checkUnlocks(state, eventBus); // Vérifie les déblocages de héros

    let needsFullUpdate = false;
    // Distribue l'XP aux héros qui combattent
    state.heroes.forEach(hero => {
      if (hero.isFighting()) {
        const previousLevel = hero.level;
        hero.addXp(data.xpGained, eventBus);
        if (hero.level > previousLevel) {
          needsFullUpdate = true; // Si un héros monte de niveau, l'UI des héros doit être entièrement mise à jour
        }
      }
    });
    
    if (needsFullUpdate) {
        state.ui.heroesNeedUpdate = true;
    }
  });

  // Événement déclenché lorsqu'un item est lâché par un monstre
  eventBus.on('item_dropped', (data) => InventoryManager.addDroppedItem(state, data.item));
  
  // Événement déclenché lorsque le type de rencontre change (combat, cooldown, boss)
  eventBus.on('encounter_changed', (data) => {
      state.gameStatus = data.newStatus;
      state.encounterIndex = data.encounterIndex;
      state.activeMonster = data.newMonster;
      state.ui.progressionNeedsUpdate = true; // Signale une mise à jour de l barre de progression
  });
  
  // Événement déclenché lorsque l'état global du donjon change (ex: party wipe)
  eventBus.on('dungeon_state_changed', (data) => {
      state.gameStatus = data.newStatus;
      state.ui.progressionNeedsUpdate = true;
      if (data.fullHeal) { // Si un soin complet est demandé (ex: après un wipe ou avant un boss)
          state.heroes.forEach(hero => {
              hero.hp = hero.maxHp;
              hero.status = 'fighting'; // Remet tous les héros en état de combattre
          });
          state.ui.heroesNeedUpdate = true; // Signale une mise à jour de l'UI des héros
      }
  });

  // Événement déclenché lorsque le joueur avance à l'étage suivant
  eventBus.on('floor_advanced', (data) => {
      state.dungeonFloor = data.newFloor;
      state.encounterIndex = 1; // Réinitialise l'index de rencontre
      state.bossUnlockReached = false; // Le boss du nouvel étage n'est pas encore débloqué
      state.bossIsDefeated = false; // Le boss du nouvel étage n'est pas encore vaincu
      state.pendingBossFight = false; // Pas de combat de boss en attente
      state.gameStatus = 'encounter_cooldown'; // Commence par un cooldown
      state.encounterCooldown = 0.5;
      state.activeMonster = null; // Réinitialise le monstre actif
      UnlockManager.checkUnlocks(state, eventBus); // Vérifie les nouveaux déblocages pour le nouvel étage
      state.ui.progressionNeedsUpdate = true; // Signale une mise à jour de l'UI de progression
  });

  // Événement déclenché lorsqu'un héros monte de niveau
  eventBus.on('hero_leveled_up', (data) => {
      // La logique de flash visuel est maintenant gérée dans HeroUI.js lors du rendu
      // On s'assure juste que l'UI des héros est marquée pour une mise à jour complète.
      state.ui.heroesNeedUpdate = true;
  });

  // Événement déclenché lorsqu'un item est glissé-déposé sur un héros
  eventBus.on('item_dropped_on_hero', (data) => {
      InventoryManager.equipItemFromDrag(state, data.inventoryIndex, data.heroId, eventBus);
  });

  // Événement pour afficher une notification
  eventBus.on('notification_sent', (data) => state.notifications.push(data));
  // Événement pour forcer une mise à jour complète de l'UI des héros
  eventBus.on('ui_heroes_need_update', () => { state.ui.heroesNeedUpdate = true; });


  // --- Setup des écouteurs d'événements du DOM (interactions utilisateur) ---

  // Bouton de rafraîchissement de la boutique
  document.getElementById('refresh-shop-btn').addEventListener('click', () => {
      ShopManager.clearShop(state);
  });

  // Bouton de bascule du mode verrouillage de la boutique
  document.getElementById('toggle-lock-mode-btn').addEventListener('click', (event) => {
    state.ui.shopLockModeActive = !state.ui.shopLockModeActive;
    event.currentTarget.classList.toggle('active', state.ui.shopLockModeActive);
    document.getElementById('shop-panel').classList.toggle('lock-mode-active', state.ui.shopLockModeActive);
  });

  // Clic dans la zone de la boutique (achat ou verrouillage)
  document.getElementById('shop-area').addEventListener('click', (event) => {
    // Si le mode verrouillage est actif, on verrouille/déverrouille l'item
    if (state.ui.shopLockModeActive) {
        const itemCard = event.target.closest('.shop-item-card');
        if (itemCard) {
            const itemIndex = parseInt(itemCard.querySelector('.buy-btn').dataset.itemIndex, 10);
            const item = state.shopItems[itemIndex];
            if (item) {
                item.isLocked = !item.isLocked;
                state.ui.shopNeedsUpdate = true; // Signale une mise à jour de l'UI de la boutique
            }
        }
        return;
    }

    // Sinon, on tente d'acheter l'item
    const buyButton = event.target.closest('.buy-btn');
    if (buyButton) {
      ShopManager.buyItem(state, parseInt(buyButton.dataset.itemIndex, 10), eventBus);
    }
  });

  // Clic dans le panneau de l'ennemi (ramassage de butin ou clic sur le monstre)
  document.getElementById('enemy-panel').addEventListener('click', (event) => {
    const target = event.target;
    if (target.matches('.pickup-btn')) {
        InventoryManager.pickupItem(state, parseInt(target.dataset.lootIndex, 10), eventBus);
    } else if (target.matches('.discard-btn')) {
        InventoryManager.discardLootItem(state, parseInt(target.dataset.lootIndex, 10));
    } else if (!target.closest('.item-card')) { // Si le clic n'est pas sur une carte d'item, c'est un clic sur le monstre
        onPlayerClick();
    }
  });

  // Clic dans la zone de recrutement
  document.getElementById('recruitment-area').addEventListener('click', (event) => {
    const button = event.target.closest('[data-hero-id]');
    if (button) recruitHero(button.dataset.heroId);
  });
  
  // Clic dans les contrôles de progression (affronter boss, étage suivant)
  document.getElementById('progression-controls').addEventListener('click', (event) => {
    if (event.target.id === 'fight-boss-btn') {
        state.pendingBossFight = true; // Marque le combat de boss comme en attente
        showNotification('Le boss arrive ! Préparez-vous !', 'success'); // Notification
        state.ui.progressionNeedsUpdate = true;
    } else if (event.target.id === 'next-floor-btn') {
        DungeonManager.advanceToNextFloor(state, eventBus); // Avance à l'étage suivant
    }
  });

  // Clic dans la zone des héros (basculer la vue, déséquiper, déplacer)
  document.getElementById('heroes-area').addEventListener('click', (event) => {
    const target = event.target;
    
    // Basculer la vue de la carte du héros
    const toggleButton = target.closest('.toggle-view-btn');
    if (toggleButton) {
        event.preventDefault();
        toggleHeroCardView(toggleButton.dataset.heroId);
        return;
    }

    // Déséquiper un item
    const unequipButton = target.closest('.unequip-btn');
    if (unequipButton) {
        event.preventDefault();
        const { heroId, slot } = unequipButton.dataset;
        const hero = state.heroes.find(h => h.id === heroId);
        if (hero) InventoryManager.unequipItemFromHero(state, hero, slot, eventBus);
        return;
    }
    
    // Déplacer un héros
    const moveButton = target.closest('.move-hero-btn');
    if (moveButton) {
        event.preventDefault();
        const { heroId, direction } = moveButton.dataset;
        moveHero(heroId, direction);
        return;
    }

    // Équiper un item en mode clic (si un item est sélectionné dans l'inventaire)
    if (state.itemToEquip) {
        event.preventDefault();
        const heroCard = target.closest('.hero-card');
        if (heroCard) {
            const hero = state.heroes.find(h => h.id === heroCard.dataset.heroId);
            if (hero) InventoryManager.equipItemOnHero(state, hero, eventBus);
        } else {
            // Si le clic n'est pas sur une carte de héros, annule le mode d'équipement
            InventoryManager.cancelEquip(state);
        }
    }
  });
  
  // Clic dans la grille de l'inventaire (sélectionner/désélectionner un item, jeter)
  document.getElementById('inventory-grid').addEventListener('click', (event) => {
      event.preventDefault();
      const target = event.target;
      if (target.matches('.inventory-discard-btn')) {
          InventoryManager.discardInventoryItem(state, parseInt(target.dataset.inventoryIndex, 10));
      } else {
          const itemCard = target.closest('.inventory-item');
          if (itemCard) {
              InventoryManager.selectItemToEquip(state, parseInt(itemCard.dataset.inventoryIndex, 10));
          }
      }
  });

  // Bouton de réinitialisation du jeu
  document.getElementById('reset-game-btn').addEventListener('click', () => {
    showConfirmationModal("Êtes-vous sûr de vouloir réinitialiser votre partie ? Toute votre progression sera perdue.", () => {
        StorageManager.reset();
    });
  });

  // Première mise à jour de l'UI au démarrage
  updateUI(state, 0, { gold: state.gold });

  // Démarre la boucle de jeu
  requestAnimationFrame(gameLoop);
}

/**
 * Retourne un nouvel état de jeu initial.
 * @returns {object} L'état initial du jeu.
 */
function getNewGameState() {
    const initialState = {
        heroes: [],
        activeMonster: null,
        gold: 0,
        gameStatus: 'fighting', // État initial du jeu
        dungeonFloor: 1,
        encounterIndex: 1,
        encountersPerFloor: 10, // Nombre de rencontres avant le boss
        encounterCooldown: 0,
        bossUnlockReached: false,
        bossIsDefeated: false,
        pendingBossFight: false,
        shopItems: [],
        shopRestockTimer: 0,
        autosaveTimer: 0,
        heroDefinitions: JSON.parse(JSON.stringify(HERO_DEFINITIONS)), // Copie profonde des définitions de héros
        droppedItems: [],
        inventory: [],
        itemToEquip: null, // L'item actuellement sélectionné pour être équipé
        ui: {
            shopNeedsUpdate: true,
            heroesNeedUpdate: true,
            inventoryNeedsUpdate: true,
            lootNeedsUpdate: true,
            recruitmentNeedsUpdate: true,
            progressionNeedsUpdate: true,
            heroCardState: {}, // État d'affichage des cartes de héros (réduites/étendues)
            shopLockModeActive: false, // Indique si le mode verrouillage de la boutique est actif
        },
        notifications: [], // File d'attente des notifications
        floatingTexts: [], // Textes flottants (dégâts, soins)
        damageBuckets: {}, // Accumulateurs de dégâts/soins pour les textes flottants
        eventBus: eventBus, // Référence au bus d'événements
    };

    // Initialise les héros qui sont par défaut "recruited"
    for (const key in initialState.heroDefinitions) {
        const heroDef = initialState.heroDefinitions[key];
        if (heroDef.status === 'recruited') {
            let newHero;
            switch(heroDef.id) {
                case 'priest':
                    newHero = new Priest(heroDef);
                    break;
                default:
                    newHero = new Hero(heroDef);
                    break;
            }
            initialState.heroes.push(newHero);
            // Initialise l'état de la carte du héros
            if (!initialState.ui.heroCardState) initialState.ui.heroCardState = {};
            initialState.ui.heroCardState[newHero.id] = { isCollapsed: false };
        }
    }
    return initialState;
}

/**
 * Initialise le jeu au démarrage de la page.
 * Charge la sauvegarde ou démarre une nouvelle partie.
 */
export function initGame() {
  const loadedState = StorageManager.load();
  let isNewGame = false;
  
  if (loadedState) {
    state = loadedState;
    state.eventBus = eventBus; // Réassigne le bus d'événements après le chargement

    // S'assure que les propriétés UI et de jeu existent pour les anciennes sauvegardes
    const heroCardState = state.ui?.heroCardState || {};
    const shopLockModeActive = state.ui?.shopLockModeActive || false;
    
    state.encountersPerFloor = state.encountersPerFloor || 10;
    state.encounterCooldown = state.encounterCooldown || 0;
    state.bossUnlockReached = state.bossUnlockReached || false;
    state.bossIsDefeated = state.bossIsDefeated || false;
    state.pendingBossFight = state.pendingBossFight || false;

    // Réinitialise les drapeaux de mise à jour UI pour forcer un premier rendu complet
    state.ui = {
        shopNeedsUpdate: true,
        heroesNeedUpdate: true,
        inventoryNeedsUpdate: true,
        lootNeedsUpdate: true,
        recruitmentNeedsUpdate: true,
        progressionNeedsUpdate: true,
        heroCardState: heroCardState,
        shopLockModeActive: shopLockModeActive,
    };
    state.notifications = state.notifications || [];
    state.floatingTexts = []; // Les textes flottants ne sont pas persistés
    state.damageBuckets = {}; // Les buckets de dégâts ne sont pas persistés
  } else {
    state = getNewGameState(); // Démarre une nouvelle partie
    isNewGame = true;
  }
  
  setupEventListeners(); // Met en place tous les écouteurs d'événements
  
  UnlockManager.checkUnlocks(state, eventBus); // Vérifie les déblocages initiaux

  // Si c'est une nouvelle partie, initialise l'état de combat
  if (isNewGame) {
      state.gameStatus = 'encounter_cooldown';
      state.encounterCooldown = 0.5;
  }

  // La boucle de jeu est lancée à la fin de initGame
  // La première mise à jour de l'UI est faite juste avant le requestAnimationFrame
}

