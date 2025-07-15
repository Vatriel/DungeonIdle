// js/core/GameLoop.js

import { state } from './StateManager.js';
import { eventBus } from './EventBus.js';
import { OfflineManager } from './OfflineManager.js';
import { StorageManager } from '../managers/StorageManager.js';
import { updateUI, forceFullUIRender } from '../ui/UIUpdater.js';
import { PartyManager } from '../managers/PartyManager.js';
import { DungeonManager } from '../managers/DungeonManager.js';
import { CombatManager } from '../managers/CombatManager.js';
import { EffectManager } from '../managers/EffectManager.js';
import { updateHistoryManager } from '../managers/HistoryManager.js';
import { ShopManager } from '../managers/ShopManager.js';
import { TavernManager } from '../managers/TavernManager.js';

// --- Game Loop Variables ---
let lastTime = 0;
let isSaving = false;
const AUTOSAVE_INTERVAL = 10; // in seconds
const OFFLINE_THRESHOLD = 5.0; // in seconds

/**
 * Triggers the game save process.
 */
async function triggerSave() {
    isSaving = true;
    eventBus.emit('save_started');
    StorageManager.save(state);
    await new Promise(resolve => setTimeout(resolve, 500));
    eventBus.emit('save_finished');
    setTimeout(() => {
        eventBus.emit('save_indicator_hide_requested');
        isSaving = false;
    }, 2000);
}

/**
 * Updates the core logic of the game for a given time delta.
 * @param {number} dt - The delta time in seconds.
 */
function updateGameLogic(dt) {
    PartyManager.update(dt);
    DungeonManager.update(dt);
    CombatManager.update(dt);
    EffectManager.update(dt);
    updateHistoryManager(dt);
    ShopManager.update(dt);
    TavernManager.update(dt);

    if (state.options.autoFightBoss && state.bossUnlockReached && !state.pendingBossFight && !state.bossIsDefeated && state.gameStatus !== 'boss_fight') {
        state.pendingBossFight = true;
        eventBus.emit('notification_requested', { message: 'Boss enclenché automatiquement !', type: 'success' });
        state.ui.progressionNeedsUpdate = true;
    }
    if (state.options.autoNextFloor && state.bossIsDefeated) {
        DungeonManager.advanceToNextFloor();
    }

    state.autosaveTimer += dt;
    if (state.autosaveTimer >= AUTOSAVE_INTERVAL && !isSaving) {
        state.autosaveTimer = 0;
        triggerSave();
    }
}

/**
 * The main game loop function, called by requestAnimationFrame.
 * @param {number} currentTime - The current timestamp provided by the browser.
 */
function gameLoop(currentTime) {
    if (lastTime === 0) {
        lastTime = currentTime;
        requestAnimationFrame(gameLoop);
        return;
    }

    let deltaTime = (currentTime - lastTime) / 1000;

    if (deltaTime > OFFLINE_THRESHOLD) {
        OfflineManager.handleCatchUp(deltaTime, updateGameLogic);
        forceFullUIRender(state);
        deltaTime = 1 / 60; // Use a fixed delta time for the first frame after catch-up
    }

    if (!state.isGamePaused) {
        updateGameLogic(deltaTime);
    }
    
    updateUI(state, deltaTime);
    
    lastTime = currentTime;
    requestAnimationFrame(gameLoop);
}

/**
 * Starts the game loop.
 */
export function runGameLoop() {
    // Initialize the OfflineManager before starting the loop
    OfflineManager.init();
    requestAnimationFrame(gameLoop);
}
