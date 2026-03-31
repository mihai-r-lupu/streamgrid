// WordPress-style action and filter hook system for in-process extensibility.
// Supports priority ordering, namespaces, once registration, async execution,
// error isolation, command registry, and debug logging.

/**
 * Manages named action and filter hooks with priority ordering.
 *
 * Action hooks allow any number of callbacks to run as side-effects when a
 * named point in the application is reached.  Filter hooks chain callbacks
 * so each one receives and may transform the value returned by the previous.
 *
 * Entries are stored as `{ callback, priority, namespace, once }` objects
 * and kept sorted by ascending priority (lower = earlier). Same priority
 * preserves insertion order (FIFO).
 */
export class HookManager {
    constructor() {
        /** @type {Object<string, Array<{callback:Function, priority:number, namespace:string|null, once:boolean}>>} */
        this.actions = {};
        /** @type {Object<string, Array<{callback:Function, priority:number, namespace:string|null, once:boolean}>>} */
        this.filters = {};
        /** @type {Object<string, Function>} */
        this._commands = {};
        /** @type {boolean} */
        this.debug = false;
    }

    // ── Actions ────────────────────────────────────────────────────────────────

    /**
     * Register a callback for an action hook.
     * @param {string} hookName
     * @param {Function} callback
     * @param {number} [priority=10] - Lower runs first.
     * @param {string|object|null} [nsOrOpts=null] - Namespace string or options `{ once, namespace }`.
     */
    addAction(hookName, callback, priority = 10, nsOrOpts = null) {
        if (!this.actions[hookName]) this.actions[hookName] = [];
        const { namespace, once } = _parseOpts(nsOrOpts);
        const entry = { callback, priority, namespace, once };
        _insertSorted(this.actions[hookName], entry);
    }

    /**
     * Execute all callbacks registered for an action hook.
     * Callbacks that threw are caught, logged, and skipped — the chain continues.
     * Entries registered with `once: true` are removed after their first execution.
     * @param {string} hookName
     * @param {...*} args - Arguments forwarded to each callback.
     */
    doAction(hookName, ...args) {
        const list = this.actions[hookName];
        if (!list) return;
        if (this.debug) console.log(`[HookManager] doAction("${hookName}") — ${list.length} callbacks`);
        const toRemove = [];
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            try {
                entry.callback(...args);
            } catch (err) {
                console.error(`[HookManager] action "${hookName}" callback threw:`, err);
            }
            if (entry.once) toRemove.push(i);
        }
        _removeIndices(list, toRemove);
    }

    /**
     * Remove a specific action callback by reference.
     * @param {string} hookName
     * @param {Function} callback
     */
    removeAction(hookName, callback) {
        if (!this.actions[hookName]) return;
        this.actions[hookName] = this.actions[hookName].filter(e => e.callback !== callback);
    }

    /**
     * Returns true if at least one action callback is registered for the hook.
     * @param {string} hookName
     * @returns {boolean}
     */
    hasAction(hookName) {
        return (this.actions[hookName]?.length ?? 0) > 0;
    }

    /**
     * Run action callbacks sequentially, awaiting each. Returns a Promise.
     * @param {string} hookName
     * @param {...*} args
     * @returns {Promise<void>}
     */
    async doActionAsync(hookName, ...args) {
        const list = this.actions[hookName];
        if (!list) return;
        if (this.debug) console.log(`[HookManager] doActionAsync("${hookName}") — ${list.length} callbacks`);
        const toRemove = [];
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            try {
                await entry.callback(...args);
            } catch (err) {
                console.error(`[HookManager] async action "${hookName}" callback threw:`, err);
            }
            if (entry.once) toRemove.push(i);
        }
        _removeIndices(list, toRemove);
    }

    // ── Filters ────────────────────────────────────────────────────────────────

    /**
     * Register a callback for a filter hook.
     * @param {string} hookName
     * @param {Function} callback - Receives the current value (plus extra args) and must return the modified value.
     * @param {number} [priority=10] - Lower runs first.
     * @param {string|object|null} [nsOrOpts=null] - Namespace string or options `{ once, namespace }`.
     */
    addFilter(hookName, callback, priority = 10, nsOrOpts = null) {
        if (!this.filters[hookName]) this.filters[hookName] = [];
        const { namespace, once } = _parseOpts(nsOrOpts);
        const entry = { callback, priority, namespace, once };
        _insertSorted(this.filters[hookName], entry);
    }

    /**
     * Pass a value through all filter callbacks registered for a hook.
     * If a callback returns `undefined`, the previous value is preserved (passthrough).
     * Callbacks that throw are caught, logged, and skipped.
     * @param {string} hookName
     * @param {*} value - Initial value.
     * @param {...*} args - Additional arguments forwarded to each callback.
     * @returns {*} The final transformed value.
     */
    applyFilters(hookName, value, ...args) {
        const list = this.filters[hookName];
        if (!list) return value;
        if (this.debug) console.log(`[HookManager] applyFilters("${hookName}") — ${list.length} callbacks`);
        let result = value;
        const toRemove = [];
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            try {
                const returned = entry.callback(result, ...args);
                if (returned !== undefined && typeof returned.then === 'function') {
                    console.warn(
                        `[StreamGrid] filter "${hookName}" returned a Promise. ` +
                        `Use grid.applyFiltersAsync("${hookName}", ...) or make the callback synchronous.`
                    );
                }
                if (returned !== undefined) result = returned;
            } catch (err) {
                console.error(`[HookManager] filter "${hookName}" callback threw:`, err);
            }
            if (entry.once) toRemove.push(i);
        }
        _removeIndices(list, toRemove);
        return result;
    }

    /**
     * Async filter chain — each callback may return a Promise.
     * If a callback returns `undefined`, the previous value is preserved.
     * @param {string} hookName
     * @param {*} value
     * @param {...*} args
     * @returns {Promise<*>}
     */
    async applyFiltersAsync(hookName, value, ...args) {
        const list = this.filters[hookName];
        if (!list) return value;
        if (this.debug) console.log(`[HookManager] applyFiltersAsync("${hookName}") — ${list.length} callbacks`);
        let result = value;
        const toRemove = [];
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            try {
                const returned = await entry.callback(result, ...args);
                if (returned !== undefined) result = returned;
            } catch (err) {
                console.error(`[HookManager] async filter "${hookName}" callback threw:`, err);
            }
            if (entry.once) toRemove.push(i);
        }
        _removeIndices(list, toRemove);
        return result;
    }

    /**
     * Remove a specific filter callback by reference.
     * @param {string} hookName
     * @param {Function} callback
     */
    removeFilter(hookName, callback) {
        if (!this.filters[hookName]) return;
        this.filters[hookName] = this.filters[hookName].filter(e => e.callback !== callback);
    }

    /**
     * Returns true if at least one filter callback is registered for the hook.
     * @param {string} hookName
     * @returns {boolean}
     */
    hasFilter(hookName) {
        return (this.filters[hookName]?.length ?? 0) > 0;
    }

    // ── Namespace bulk removal ─────────────────────────────────────────────────

    /**
     * Remove all hooks (actions and filters) registered under a namespace.
     * @param {string} namespace
     */
    removeAllHooks(namespace) {
        for (const hookName of Object.keys(this.actions)) {
            this.actions[hookName] = this.actions[hookName].filter(e => e.namespace !== namespace);
        }
        for (const hookName of Object.keys(this.filters)) {
            this.filters[hookName] = this.filters[hookName].filter(e => e.namespace !== namespace);
        }
    }

    // ── Command Registry ───────────────────────────────────────────────────────

    /**
     * Register a named command.
     * @param {string} name
     * @param {Function} handler
     */
    registerCommand(name, handler) {
        this._commands[name] = handler;
    }

    /**
     * Execute a registered command by name. Throws if not found.
     * @param {string} name
     * @param {...*} args
     * @returns {*} Whatever the handler returns.
     */
    executeCommand(name, ...args) {
        const handler = this._commands[name];
        if (!handler) throw new Error(`[HookManager] command "${name}" is not registered`);
        return handler(...args);
    }
}

// ── Private helpers ────────────────────────────────────────────────────────────

/**
 * Parse the namespace/options parameter which can be a string or an object.
 * @param {string|object|null} nsOrOpts
 * @returns {{ namespace: string|null, once: boolean }}
 */
function _parseOpts(nsOrOpts) {
    if (!nsOrOpts) return { namespace: null, once: false };
    if (typeof nsOrOpts === 'string') return { namespace: nsOrOpts, once: false };
    return { namespace: nsOrOpts.namespace || null, once: !!nsOrOpts.once };
}

/**
 * Insert an entry into a sorted-by-priority array, maintaining FIFO for equal priorities.
 * @param {Array} list
 * @param {object} entry
 */
function _insertSorted(list, entry) {
    let i = list.length;
    while (i > 0 && list[i - 1].priority > entry.priority) i--;
    list.splice(i, 0, entry);
}

/**
 * Remove entries at given indices (must be ascending) from a list in-place.
 * @param {Array} list
 * @param {number[]} indices
 */
function _removeIndices(list, indices) {
    for (let i = indices.length - 1; i >= 0; i--) {
        list.splice(indices[i], 1);
    }
}
