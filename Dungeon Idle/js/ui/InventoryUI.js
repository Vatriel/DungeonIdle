// js/ui/InventoryUI.js

const inventoryGridEl = document.getElementById('inventory-grid');

/**
 * Affiche les objets de l'inventaire dans la grille.
 * @param {Array<Item>} inventory - Le tableau d'objets de l'inventaire.
 * @param {object | null} itemToEquip - L'objet actuellement sélectionné pour l'équipement.
 */
export function renderInventory(inventory, itemToEquip) {
    if (!inventoryGridEl) return;

    const items = inventory || [];
    inventoryGridEl.innerHTML = '';

    items.forEach((item, index) => {
        const container = document.createElement('div');
        container.className = 'inventory-item-container';

        const itemEl = document.createElement('div');
        itemEl.className = `inventory-item rarity-${item.rarity}`;
        itemEl.dataset.inventoryIndex = index;
        
        if (itemToEquip && itemToEquip.inventoryIndex === index) {
            itemEl.classList.add('selected');
        }

        let tooltipText = `${item.name}\n`;
        for (const [stat, value] of Object.entries(item.stats)) {
            tooltipText += `+${value} ${stat}\n`;
        }
        itemEl.title = tooltipText.trim();
        itemEl.textContent = item.baseDefinition.name.substring(0, 3).toUpperCase();

        // On ajoute le bouton "Jeter" uniquement si on n'est pas en mode équipement
        // pour éviter les clics accidentels.
        if (!itemToEquip) {
            const discardBtn = document.createElement('button');
            discardBtn.className = 'item-action-btn discard-btn inventory-discard-btn';
            discardBtn.dataset.inventoryIndex = index;
            discardBtn.title = 'Jeter';
            discardBtn.textContent = 'X';
            container.appendChild(discardBtn);
        }

        container.appendChild(itemEl);
        inventoryGridEl.appendChild(container);
    });
}
