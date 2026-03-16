// CacheAdapter — decorator adapter that wraps any StreamGrid-compatible adapter
// with LRU caching, request deduplication, and table-scoped write invalidation.

import { stableSerialise } from '../utils/stableSerialise.js';

/**
 * Wraps any adapter to add LRU caching, in-flight deduplication, and
 * table-scoped cache invalidation on write operations.
 *
 * Does not extend BaseDataAdapter — implements the adapter contract directly.
 */
export class CacheAdapter {
    /**
     * @param {object} innerAdapter - Any adapter implementing the 5-method contract.
     * @param {object} [options]
     * @param {number} [options.ttl=60000] - Default fetchData cache TTL in milliseconds.
     * @param {{ [table: string]: number }} [options.ttlOverrides={}] - Per-table TTL overrides.
     * @param {number} [options.maxEntries=100] - Maximum number of fetchData cache entries (LRU).
     */
    constructor(innerAdapter, options = {}) {
        this._innerAdapter = innerAdapter;
        this._ttl = options.ttl ?? 60000;
        this._ttlOverrides = options.ttlOverrides ?? {};
        this._maxEntries = options.maxEntries ?? 100;

        /** @type {Map<string, { data: object[], expiresAt: number }>} */
        this._fetchCache = new Map();
        /** @type {Map<string, string[]>} */
        this._columnCache = new Map();
        /** @type {Map<string, Promise>} */
        this._inFlight = new Map();
    }

    // ── Cache key helpers ──────────────────────────────────────────────────────

    _fetchKey(table, options) {
        return `${table}::${stableSerialise(options)}`;
    }

    _invalidateTable(table) {
        const prefix = `${table}::`;
        for (const key of this._fetchCache.keys()) {
            if (key.startsWith(prefix)) this._fetchCache.delete(key);
        }
    }

    // ── Adapter methods ────────────────────────────────────────────────────────

    /**
     * Returns column names for the table. Cached for the lifetime of this instance
     * with no TTL — column structure is not expected to change during a session.
     *
     * **Schema changes:** The column cache is never invalidated by write operations
     * (`insertRow`, `updateRow`, `deleteRow`). If the underlying table schema changes
     * during a session, call `clearCache()` to force a fresh fetch on the next call.
     * @param {string} table
     * @returns {Promise<string[]>}
     */
    async getColumns(table) {
        if (this._columnCache.has(table)) return this._columnCache.get(table);
        const result = await this._innerAdapter.getColumns(table);
        this._columnCache.set(table, result);
        return result;
    }

    /**
     * Fetches rows with LRU caching and in-flight deduplication.
     * @param {string} table
     * @param {object} [options={}]
     * @returns {Promise<object[]>}
     */
    fetchData(table, options = {}) {
        const key = this._fetchKey(table, options);

        // TTL check — promote to most-recently-used on hit
        if (this._fetchCache.has(key)) {
            const entry = this._fetchCache.get(key);
            if (Date.now() < entry.expiresAt) {
                this._fetchCache.delete(key);
                this._fetchCache.set(key, entry);
                return Promise.resolve(entry.data);
            }
        }

        // In-flight deduplication
        if (this._inFlight.has(key)) {
            return this._inFlight.get(key);
        }

        // Cache miss
        const ttl = this._ttlOverrides[table] ?? this._ttl;

        const promise = this._innerAdapter.fetchData(table, options)
            .then(data => {
                // LRU eviction when at capacity — first Map entry is the least recently used
                if (this._fetchCache.size >= this._maxEntries) {
                    const lruKey = this._fetchCache.keys().next().value;
                    this._fetchCache.delete(lruKey);
                }
                this._fetchCache.set(key, { data, expiresAt: Date.now() + ttl });
                return data;
            })
            .finally(() => {
                this._inFlight.delete(key);
            });

        this._inFlight.set(key, promise);
        return promise;
    }

    /**
     * Inserts a row and invalidates all cached fetchData entries for the table.
     * @param {string} table
     * @param {object} data
     * @returns {Promise<object>}
     */
    async insertRow(table, data) {
        const result = await this._innerAdapter.insertRow(table, data);
        this._invalidateTable(table);
        return result;
    }

    /**
     * Updates a row and invalidates all cached fetchData entries for the table.
     * @param {string} table
     * @param {number|string} id
     * @param {object} data
     * @returns {Promise<object>}
     */
    async updateRow(table, id, data) {
        const result = await this._innerAdapter.updateRow(table, id, data);
        this._invalidateTable(table);
        return result;
    }

    /**
     * Deletes a row and invalidates all cached fetchData entries for the table.
     * @param {string} table
     * @param {number|string} id
     * @returns {Promise<boolean>}
     */
    async deleteRow(table, id) {
        const result = await this._innerAdapter.deleteRow(table, id);
        this._invalidateTable(table);
        return result;
    }

    // ── Utility ────────────────────────────────────────────────────────────────

    /**
     * Clears all cached data (fetchData results, column results, and in-flight entries).
     * Useful for testing and for force-refresh scenarios.
     *
     * **Known behaviour with in-flight requests:** If `clearCache()` is called while a
     * `fetchData` request is still in flight, the in-flight entry is removed from
     * `_inFlight` but the underlying promise continues to run. When it resolves, its
     * `.then()` callback will re-populate `_fetchCache` with the fresh result (the cache
     * key is captured in the closure at the time the request was started). The net outcome
     * is correct — callers receive their data and the cache ends up populated with a fresh
     * entry — but note that the cache will not be empty for long if requests are active
     * at the time of the call. `clearCache()` does not cancel or reject any pending promises.
     */
    clearCache() {
        this._fetchCache.clear();
        this._columnCache.clear();
        this._inFlight.clear();
    }
}
