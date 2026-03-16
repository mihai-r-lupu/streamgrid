import { expect } from 'chai';
import { CacheAdapter } from '../../src/dataAdapter/CacheAdapter.js';
import { StreamGrid } from '../../src/StreamGrid.js';

// ── Mock factory ──────────────────────────────────────────────────────────────

/**
 * Creates a fresh mock inner adapter with per-table call counters.
 * fetchData returns [{ id: <callCount> }] so callers can detect re-fetches.
 */
function makeMockAdapter() {
    return {
        fetchCalls: {},
        columnCalls: {},
        async fetchData(table) {
            this.fetchCalls[table] = (this.fetchCalls[table] || 0) + 1;
            return [{ id: this.fetchCalls[table] }];
        },
        async getColumns(table) {
            this.columnCalls[table] = (this.columnCalls[table] || 0) + 1;
            return ['id', 'name'];
        },
        async insertRow(table, data) { return { ...data, id: 99 }; },
        async updateRow(table, id, data) { return { ...data, id }; },
        async deleteRow() { return true; }
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CacheAdapter', () => {

    // 1. Returns data from inner adapter on first call
    it('returns data from inner adapter on first call', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        const data = await cache.fetchData('users', {});
        expect(data).to.deep.equal([{ id: 1 }]);
        expect(inner.fetchCalls['users']).to.equal(1);
    });

    // 2. Returns cached data on second call within TTL (inner adapter called exactly once)
    it('returns cached data on second call within TTL (inner adapter called once)', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        const first = await cache.fetchData('users', {});
        const second = await cache.fetchData('users', {});
        expect(second).to.deep.equal(first);
        expect(inner.fetchCalls['users']).to.equal(1);
    });

    // 3. Bypasses cache after TTL expires
    it('bypasses cache after TTL expires', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 50 });
        await cache.fetchData('users', {});
        await new Promise(resolve => setTimeout(resolve, 60));
        await cache.fetchData('users', {});
        expect(inner.fetchCalls['users']).to.equal(2);
    });

    // 4. Per-table TTL override is respected
    it('respects per-table TTL override', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000, ttlOverrides: { users: 50 } });
        await cache.fetchData('users', {});
        await new Promise(resolve => setTimeout(resolve, 60));
        await cache.fetchData('users', {});
        expect(inner.fetchCalls['users']).to.equal(2);
    });

    // 5. In-flight deduplication: two simultaneous calls resolve with same promise
    it('deduplicates simultaneous calls: returns same promise, inner adapter called once', () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        const p1 = cache.fetchData('users', {});
        const p2 = cache.fetchData('users', {});
        expect(p1).to.equal(p2);
        return Promise.all([p1, p2]).then(() => {
            expect(inner.fetchCalls['users']).to.equal(1);
        });
    });

    // 6. In-flight entry is removed after resolution
    it('removes in-flight entry after resolution', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        const key = cache._fetchKey('users', {});
        await cache.fetchData('users', {});
        expect(cache._inFlight.has(key)).to.be.false;
    });

    // 7. In-flight entry is removed after rejection; rejection propagates
    it('removes in-flight entry after rejection and propagates the rejection', async () => {
        const networkError = new Error('network failure');
        const failingAdapter = {
            async fetchData() { throw networkError; },
            async getColumns() { return []; },
            async insertRow() { return {}; },
            async updateRow() { return {}; },
            async deleteRow() { return true; }
        };
        const cache = new CacheAdapter(failingAdapter, { ttl: 60000 });
        const key = cache._fetchKey('users', {});
        let thrown;
        try {
            await cache.fetchData('users', {});
        } catch (e) {
            thrown = e;
        }
        expect(thrown).to.equal(networkError);
        expect(cache._inFlight.has(key)).to.be.false;
    });

    // 8. insertRow invalidates only the matching table's cache entries, not other tables
    it('insertRow invalidates only the matching table cache entries, not other tables', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        await cache.fetchData('users', {});
        await cache.fetchData('orders', {});
        await cache.insertRow('users', { name: 'Alice' });
        // users cache invalidated — inner is called again
        await cache.fetchData('users', {});
        expect(inner.fetchCalls['users']).to.equal(2);
        // orders cache still intact — inner is not called again
        await cache.fetchData('orders', {});
        expect(inner.fetchCalls['orders']).to.equal(1);
    });

    // 9. updateRow invalidates matching table entries
    it('updateRow invalidates matching table cache entries', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        await cache.fetchData('users', {});
        await cache.updateRow('users', 1, { name: 'Bob' });
        await cache.fetchData('users', {});
        expect(inner.fetchCalls['users']).to.equal(2);
    });

    // 10. deleteRow invalidates matching table entries
    it('deleteRow invalidates matching table cache entries', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        await cache.fetchData('users', {});
        await cache.deleteRow('users', 1);
        await cache.fetchData('users', {});
        expect(inner.fetchCalls['users']).to.equal(2);
    });

    // 11. LRU eviction: inserting entry 101 evicts LRU (not most recently accessed)
    it('LRU eviction evicts least recently used entry, not least recently inserted', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000, maxEntries: 2 });

        // Fill cache: tableA inserted first (oldest), then tableB
        await cache.fetchData('tableA', {});
        await cache.fetchData('tableB', {});

        // Promote tableA: access it, making tableB the new LRU
        await cache.fetchData('tableA', {}); // cache hit, promotes A to end

        // Insert tableC: at capacity=2, should evict tableB (LRU), not tableA
        await cache.fetchData('tableC', {});

        // tableA must still be cached (inner called only once)
        await cache.fetchData('tableA', {});
        expect(inner.fetchCalls['tableA']).to.equal(1);

        // tableB was evicted (inner called again)
        await cache.fetchData('tableB', {});
        expect(inner.fetchCalls['tableB']).to.equal(2);
    });

    // 12. getColumns cached for session lifetime (inner adapter called once)
    it('caches getColumns for session lifetime (inner adapter called once)', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        await cache.getColumns('users');
        await cache.getColumns('users');
        await cache.getColumns('users');
        expect(inner.columnCalls['users']).to.equal(1);
    });

    // 13. clearCache() clears all entries; next call hits inner adapter again
    it('clearCache clears all entries; next call hits inner adapter again', async () => {
        const inner = makeMockAdapter();
        const cache = new CacheAdapter(inner, { ttl: 60000 });
        await cache.fetchData('users', {});
        await cache.getColumns('users');
        cache.clearCache();
        expect(cache._fetchCache.size).to.equal(0);
        expect(cache._columnCache.size).to.equal(0);
        expect(cache._inFlight.size).to.equal(0);
        // Both caches should be re-populated from inner after clear
        await cache.fetchData('users', {});
        expect(inner.fetchCalls['users']).to.equal(2);
        await cache.getColumns('users');
        expect(inner.columnCalls['users']).to.equal(2);
    });

    // 14. Constructor does not perform TTL validation (no error for negative ttl)
    it('constructor does not perform TTL validation (accepts negative ttl without error)', () => {
        // By design, CacheAdapter does not validate constructor options.
        // A negative ttl means every entry expires instantly — entries are never returned from cache.
        expect(() => new CacheAdapter(makeMockAdapter(), { ttl: -1 })).to.not.throw();
    });

    // 15. StreamGrid._validateAdapter throws on missing method with correct error message
    it('StreamGrid._validateAdapter throws on missing method with correct error message', () => {
        const incompleteAdapter = {
            getColumns: () => { },
            fetchData: async () => []
            // insertRow, updateRow, deleteRow intentionally absent
        };
        // Call the private method via the prototype to avoid DOM instantiation
        expect(() => StreamGrid.prototype._validateAdapter.call({}, incompleteAdapter))
            .to.throw('StreamGrid: dataAdapter is missing required method "insertRow".');
    });

});
