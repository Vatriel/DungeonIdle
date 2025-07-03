// js/ui/InventoryUI.js

const inventoryGridEl = document.getElementById('inventory-grid');

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
            const sign = value > 0 ? '+' : '';
            tooltipText += `${sign}${value} ${stat}\n`;
        }
        itemEl.title = tooltipText.trim();
        itemEl.textContent = item.baseDefinition.name.substring(0, 3).toUpperCase();

        // NOUVEAU : Ajout des propriétés et écouteurs pour le drag-and-drop
        itemEl.draggable = true;
        itemEl.addEventListener('dragstart', (event) => {
            // On stocke l'index de l'objet dans les données du transfert
            event.dataTransfer.setData('text/plain', index);
            event.dataTransfer.effectAllowed = 'move';
            // On ajoute une classe pour styliser l'objet pendant le drag
            setTimeout(() => itemEl.classList.add('dragging'), 0);
        });

        itemEl.addEventListener('dragend', () => {
            itemEl.classList.remove('dragging');
        });


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
