/**
 * Crée un élément HTML avec les propriétés spécifiées.
 * C'est la fonction utilitaire attendue par plusieurs modules UI.
 * @param {string} tag - Le type d'élément (ex: 'div', 'p', 'button').
 * @param {object} [properties={}] - Un objet de propriétés à appliquer.
 * - className: string (peut être une chaîne d'espaces ou un tableau de chaînes)
 * - textContent: string
 * - title: string
 * - id: string
 * - style: object (objet de paires clé-valeur CSS)
 * - dataset: object (objet de paires clé-valeur pour les data-attributs)
 * - onclick: function (pour les gestionnaires d'événements directs)
 * @returns {HTMLElement}
 */
export function createElement(tag, properties = {}) {
    const element = document.createElement(tag);

    for (const prop in properties) {
        if (Object.prototype.hasOwnProperty.call(properties, prop)) {
            const value = properties[prop];
            if (prop === 'className') {
                // Gère les classes comme une chaîne ou un tableau de chaînes
                if (Array.isArray(value)) {
                    element.classList.add(...value);
                } else {
                    element.className = value;
                }
            } else if (prop === 'textContent') {
                element.textContent = value;
            } else if (prop === 'dataset' && typeof value === 'object') {
                for (const dataAttr in value) {
                    if (Object.prototype.hasOwnProperty.call(value, dataAttr)) {
                        element.dataset[dataAttr] = value[dataAttr];
                    }
                }
            } else if (prop === 'style' && typeof value === 'object') {
                 for (const styleProp in value) {
                    if (Object.prototype.hasOwnProperty.call(value, styleProp)) {
                        element.style[styleProp] = value[styleProp];
                    }
                }
            } else if (prop.startsWith('on') && typeof value === 'function') {
                // Gère les gestionnaires d'événements (ex: onclick, onchange)
                element[prop] = value;
            }
            else {
                // Pour les autres propriétés directes comme 'id', 'title', 'src'
                element[prop] = value;
            }
        }
    }
    return element;
}

// La classe DomHelper a été supprimée car ses fonctionnalités sont maintenant
// entièrement couvertes par la fonction createElement, rendant le code plus cohérent.
