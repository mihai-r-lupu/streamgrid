// WordPress-style action and filter hook system for in-process extensibility.

/**
 * Manages named action and filter hooks.
 *
 * Action hooks allow any number of callbacks to run as side-effects when a
 * named point in the application is reached.  Filter hooks chain callbacks
 * so each one receives and may transform the value returned by the previous.
 */
export class HookManager {
    constructor() {
        this.actions = {};
        this.filters = {};
    }

    /**
     * Register a callback for an action hook.
     * @param {string} hookName
     * @param {Function} callback
     */
    addAction(hookName, callback) {
        if (!this.actions[hookName]) this.actions[hookName] = [];
        this.actions[hookName].push(callback);
    }

    /**
     * Execute all callbacks registered for an action hook.
     * @param {string} hookName
     * @param {...*} args - Arguments forwarded to each callback.
     */
    doAction(hookName, ...args) {
        if (!this.actions[hookName]) return;
        this.actions[hookName].forEach(callback => callback(...args));
    }

    /**
     * Register a callback for a filter hook.
     * @param {string} hookName
     * @param {Function} callback - Receives the current value (plus extra args) and must return the modified value.
     */
    addFilter(hookName, callback) {
        if (!this.filters[hookName]) this.filters[hookName] = [];
        this.filters[hookName].push(callback);
    }

    /**
     * Pass a value through all filter callbacks registered for a hook.
     * Callbacks are chained via Array.reduce, so each receives the output of the previous.
     * @param {string} hookName
     * @param {*} value - Initial value.
     * @param {...*} args - Additional arguments forwarded to each callback.
     * @returns {*} The final transformed value.
     */
    applyFilters(hookName, value, ...args) {
        if (!this.filters[hookName]) return value;
        return this.filters[hookName].reduce((modifiedValue, callback) => {
            return callback(modifiedValue, ...args);
        }, value);
    }
}
