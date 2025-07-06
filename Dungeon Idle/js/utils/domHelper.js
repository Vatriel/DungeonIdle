// js/utils/domHelper.js

/**
 * Crée un nouvel élément DOM avec les options spécifiées.
 * @param {string} tag - Le nom de la balise HTML (ex: 'div', 'p', 'button').
 * @param {object} options - Un objet contenant les propriétés à définir pour l'élément.
 * @param {string} [options.className] - La classe CSS de l'élément.
 * @param {string} [options.textContent] - Le contenu textuel de l'élément.
 * @param {string} [options.title] - Le texte de l'attribut 'title' (infobulle).
 * @param {string} [options.id] - L'ID de l'élément.
 * @param {string} [options.type] - Le type de l'élément (utile pour les inputs/boutons).
 * @param {boolean} [options.checked] - L'état "checked" pour les cases à cocher.
 * @param {number} [options.value] - La valeur de l'élément (utile pour les inputs).
 * @param {number} [options.max] - La valeur maximale (utile pour les barres de progression).
 * @param {object} [options.dataset] - Un objet d'attributs de données (data-*) à ajouter.
 * @returns {HTMLElement} L'élément DOM créé.
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.textContent) el.textContent = options.textContent;
    if (options.title) el.title = options.title;
    if (options.id) el.id = options.id;
    if (options.type) el.type = options.type;
    if (options.checked !== undefined) el.checked = options.checked;
    if (options.value !== undefined) el.value = options.value;
    if (options.max !== undefined) el.max = options.max;
    if (options.dataset) {
        for (const key in options.dataset) {
            el.dataset[key] = options.dataset[key];
        }
    }
    return el;
}

