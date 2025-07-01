// js/ui/InventoryUI.js

const inventoryGridEl = document.getElementById('inventory-grid');

/**
 * Affiche les objets de l'inventaire dans la grille.
 * @param {Array<Item>} inventory - Le tableau d'objets de l'inventaire.
 * @param {object | null} itemToEquip - L'objet actuellement sélectionné pour l'équipement.
 */
export function renderInventory(inventory, itemToEquip) {
    if (!inventoryGridEl) return;

    // Sécurité : si l'inventaire est undefined, on le traite comme un tableau vide.
    const items = inventory || [];
    inventoryGridEl.innerHTML = '';

    items.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = `inventory-item rarity-${item.rarity}`;
        itemEl.dataset.inventoryIndex = index;
        
        // On met en surbrillance l'objet sélectionné
        if (itemToEquip && itemToEquip.inventoryIndex === index) {
            itemEl.classList.add('selected');
        }

        // On crée une info-bulle simple
        let tooltipText = `${item.name}\n`;
        for (const [stat, value] of Object.entries(item.stats)) {
            tooltipText += `+${value} ${stat}\n`;
        }
        itemEl.title = tooltipText.trim();

        // On pourrait ajouter une icône ici plus tard
        itemEl.textContent = item.baseDefinition.name.substring(0, 3).toUpperCase();

        inventoryGridEl.appendChild(itemEl);
    });
}
