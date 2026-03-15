// Lightweight pub/sub event emitter used for grid lifecycle events.

/**
 * Simple publish-subscribe event emitter.
 * Supports multiple listeners per event and explicit listener removal.
 */
export class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName
     * @param {Function} callback
     */
    on(eventName, callback) {
        if (!this.events[eventName]) this.events[eventName] = [];
        this.events[eventName].push(callback);
    }

    /**
     * Remove a previously registered listener.  No-op if not found.
     * @param {string} eventName
     * @param {Function} callback
     */
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    /**
     * Invoke all listeners registered for an event.
     * @param {string} eventName
     * @param {...*} args - Arguments forwarded to each listener.
     */
    emit(eventName, ...args) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach(callback => callback(...args));
    }
}
