// js/ui/InventoryUI.js

const inventoryGridEl = document.getElementById('inventory-grid');

/**
 * Rend l'interface utilisateur de l'inventaire.
 * @param {Item[]} inventory - Le tableau des items dans l'inventaire.
 * @param {Item|null} itemToEquip - L'item actuellement sélectionné pour être équipé.
 */
export function renderInventory(inventory, itemToEquip) {
    if (!inventoryGridEl) return;

    const items = inventory || [];
    inventoryGridEl.innerHTML = ''; // Vide la grille de l'inventaire

    items.forEach((item, index) => {
        const container = document.createElement('div');
        container.className = 'inventory-item-container';

        const itemEl = document.createElement('div');
        itemEl.className = `inventory-item rarity-${item.rarity}`;
        itemEl.dataset.inventoryIndex = index;
        
        // Ajoute une classe 'selected' si l'item est en cours d'équipement
        if (itemToEquip && itemToEquip.inventoryIndex === index) {
            itemEl.classList.add('selected');
        }

        // Crée l'infobulle avec les stats de l'item
        let tooltipText = `${item.name}\n`;
        for (const [stat, value] of Object.entries(item.stats)) {
            const sign = value > 0 ? '+' : '';
            tooltipText += `${sign}${value} ${stat}\n`;
        }
        itemEl.title = tooltipText.trim();
        itemEl.textContent = item.baseDefinition.name.substring(0, 3).toUpperCase(); // Affiche les 3 premières lettres du nom

        // Ajout des propriétés et écouteurs pour le drag-and-drop
        itemEl.draggable = true; // Rend l'élément draggable
        itemEl.addEventListener('dragstart', (event) => {
            // Stocke l'index de l'objet dans les données du transfert
            event.dataTransfer.setData('text/plain', index);
            event.dataTransfer.effectAllowed = 'move'; // Définit l'effet visuel du drag
            // Ajoute une classe pour styliser l'objet pendant le drag avec un léger délai
            setTimeout(() => itemEl.classList.add('dragging'), 0);
        });

        itemEl.addEventListener('dragend', () => {
            itemEl.classList.remove('dragging'); // Retire la classe de drag à la fin
        });

        // Affiche le bouton "Jeter" uniquement si aucun item n'est sélectionné pour équiper
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

