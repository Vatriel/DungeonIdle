// js/managers/InputManager.js

export const InputManager = {
    init(eventBus) {
        this.eventBus = eventBus;
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('enemy-panel').addEventListener('click', (event) => {
            const target = event.target;
            if (!target.closest('.item-card') && !target.closest('.loot-actions')) {
                this.eventBus.emit('ui_monster_clicked');
            }
        });

        document.getElementById('heroes-area').addEventListener('click', (event) => {
            const target = event.target;
            const heroCard = target.closest('.hero-card');
            
            const statsButton = target.closest('.stats-btn');
            if (statsButton) {
                event.preventDefault();
                this.eventBus.emit('ui_stats_button_clicked', { heroId: statsButton.dataset.heroId });
                return;
            }

            const toggleButton = target.closest('.toggle-view-btn');
            if (toggleButton) {
                event.preventDefault();
                this.eventBus.emit('ui_toggle_hero_card_view_clicked', { heroId: toggleButton.dataset.heroId });
                return;
            }

            const unequipButton = target.closest('.unequip-btn');
            if (unequipButton) {
                event.preventDefault();
                this.eventBus.emit('ui_unequip_button_clicked', { heroId: unequipButton.dataset.heroId, slot: unequipButton.dataset.slot });
                return;
            }
            
            const moveButton = target.closest('.move-hero-btn');
            if (moveButton) {
                event.preventDefault();
                this.eventBus.emit('ui_move_hero_clicked', { heroId: moveButton.dataset.heroId, direction: moveButton.dataset.direction });
                return;
            }

            if (heroCard) {
                this.eventBus.emit('ui_hero_card_clicked', { heroId: heroCard.dataset.heroId });
            } else {
                this.eventBus.emit('ui_equip_canceled');
            }
        });

        document.getElementById('recruitment-area').addEventListener('click', (event) => {
            const button = event.target.closest('[data-hero-id]');
            if (button) {
                this.eventBus.emit('ui_recruit_hero_clicked', { heroId: button.dataset.heroId });
            }
        });
        
        document.getElementById('progression-controls').addEventListener('click', (event) => {
            if (event.target.id === 'fight-boss-btn') {
                this.eventBus.emit('ui_fight_boss_clicked');
            } else if (event.target.id === 'next-floor-btn') {
                this.eventBus.emit('ui_next_floor_clicked');
            }
        });

        document.querySelector('.tab-buttons').addEventListener('click', (event) => {
            if (event.target.matches('.tab-btn')) {
                this.eventBus.emit('ui_tab_changed', { tabId: event.target.dataset.tab });
            }
        });
        
        document.getElementById('loot-area').addEventListener('click', (event) => {
            const target = event.target;
            const pickAllButton = target.closest('#pick-all-loot-button');
            if (pickAllButton) {
                this.eventBus.emit('ui_pick_all_loot_clicked');
                return;
            }
        });

        document.getElementById('auto-equip-btn').addEventListener('click', () => {
            this.eventBus.emit('ui_auto_equip_clicked');
        });

        document.getElementById('artisan-panel').addEventListener('click', (event) => {
            const target = event.target;
            const itemCard = target.closest('.artisan-item-card');
            if (itemCard) {
                this.eventBus.emit('artisan_item_selected', { itemIndex: parseInt(itemCard.dataset.itemIndex, 10) });
                return;
            }
            const actionButton = target.closest('.artisan-confirm-btn');
            if (actionButton) {
                this.eventBus.emit('ui_artisan_action_clicked', { 
                    action: actionButton.dataset.action, 
                    affixKey: actionButton.dataset.affixKey 
                });
            }
        });

        document.getElementById('refresh-shop-btn').addEventListener('click', () => {
            this.eventBus.emit('ui_reroll_shop_clicked');
        });
        document.getElementById('toggle-lock-mode-btn').addEventListener('click', () => {
            this.eventBus.emit('ui_shop_toggle_lock_mode_clicked');
        });

        document.getElementById('options-btn').addEventListener('click', () => {
            this.eventBus.emit('ui_options_button_clicked');
        });
        document.getElementById('prestige-btn').addEventListener('click', () => {
            this.eventBus.emit('ui_prestige_button_clicked');
        });
        document.getElementById('tavern-btn').addEventListener('click', () => {
            this.eventBus.emit('ui_tavern_button_clicked');
        });

        document.getElementById('boost-heal-btn').addEventListener('click', () => {
            this.eventBus.emit('ui_boost_heal_clicked');
        });

        document.getElementById('progression-map-btn').addEventListener('click', () => {
            this.eventBus.emit('ui_progression_map_clicked');
        });

        document.getElementById('prestige-cards-container').addEventListener('click', (event) => {
            const buyButton = event.target.closest('.prestige-card .buy-btn');
            if (buyButton) {
                const upgradeId = buyButton.dataset.upgradeId;
                if (upgradeId) {
                    this.eventBus.emit('ui_prestige_buy_upgrade_clicked', { upgradeId });
                }
            }
        });

        // MODIFIÉ : Retiré les écouteurs d'événements spécifiques à la Taverne d'ici.
        // Ils seront gérés directement dans TavernUI.js car les éléments sont dynamiques.
        // document.getElementById('tavern-modal-overlay').addEventListener('click', (e) => { ... });
        // const tavernContractsPanel = document.getElementById('tavern-contracts');
        // if (tavernContractsPanel) { ... }
        // const tavernTabButtons = document.querySelector('.tavern-body .tab-buttons');
        // if (tavernTabButtons) { ... }

        // NOUVEAU : Écouteur pour la fermeture de la modale de la Taverne (délégation sur l'overlay)
        // Cet écouteur doit rester ici car l'overlay est un élément statique qui existe dès le chargement du DOM.
        // Il est important qu'il soit attaché une seule fois.
        document.getElementById('tavern-modal-overlay').addEventListener('click', (e) => {
            // Si le clic est sur l'overlay lui-même ou sur le bouton de fermeture de la modale
            if (e.target.id === 'tavern-modal-overlay' || e.target.id === 'close-tavern-modal-btn') {
                this.eventBus.emit('ui_close_tavern_modal_clicked');
            }
        });
    }
};
