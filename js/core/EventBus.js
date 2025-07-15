// js/core/EventBus.js

/**
 * Une classe simple pour créer un système d'émission et d'écoute d'événements.
 * Cela permet de découpler les différents modules du jeu.
 */
class EventBusController {
  constructor() {
    this.listeners = {};
  }

  /**
   * S'abonne à un événement.
   * @param {string} eventName - Le nom de l'événement.
   * @param {Function} callback - La fonction à appeler lorsque l'événement est émis.
   * @returns {Function} Une fonction pour se désabonner facilement.
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
    // Retourne une fonction de "désinscription" pour un nettoyage facile
    return () => {
      this.off(eventName, callback);
    };
  }

  /**
   * Se désabonne d'un événement.
   * @param {string} eventName - Le nom de l'événement.
   * @param {Function} callback - La fonction à supprimer des auditeurs.
   */
  off(eventName, callback) {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName] = this.listeners[eventName].filter(
      listener => listener !== callback
    );
  }

  /**
   * Émet un événement, déclenchant tous les callbacks abonnés.
   * @param {string} eventName - Le nom de l'événement à émettre.
   * @param {*} data - Les données à passer en argument aux auditeurs.
   */
  emit(eventName, data) {
    if (!this.listeners[eventName]) {
      return;
    }
    // On appelle chaque auditeur pour cet événement
    this.listeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Erreur dans un auditeur d'événement (${eventName}) :`, e);
      }
    });
  }
}

// Exporte une instance unique (singleton) de l'EventBus pour toute l'application.
export const eventBus = new EventBusController();
