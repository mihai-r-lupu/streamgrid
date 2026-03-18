# Adapters

StreamGrid uses an adapter system to connect to different data sources (REST APIs, CSV files, GraphQL, etc.). Adapters implement five methods: `getColumns`, `fetchData`, `insertRow`, `updateRow`, `deleteRow`.

---

## Built-in Adapters

| Adapter | Purpose |
|---|---|
| `RestApiAdapter` | Connects to RESTful JSON APIs (json-server, Express, Rails, etc.) |
| `CacheAdapter` | Decorator that wraps any adapter with LRU caching and request deduplication |

---

## RestApiAdapter

`RestApiAdapter` accepts a single `{ baseUrl }` option:

```javascript
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';

const adapter = new RestApiAdapter({ baseUrl: 'http://localhost:3000' });
```

Plug it into StreamGrid:

```javascript
new StreamGrid('#my-grid', {
    dataAdapter: adapter,
    table: 'users',
    columns: ['name', 'email', 'status'],
});
```

Filter, pagination, and sort state are serialised into URL query parameters by `src/queryBuilder.js`. For example, a filter for `alice` on fields `name` and `email` becomes:

```
GET /users?q=alice&fields=name,email
```

---

## How `getColumns()` Works

`RestApiAdapter` fetches a single row via `GET /<table>?_limit=1` and infers column names from its keys. No dedicated `/columns` endpoint is required.

---

## CacheAdapter

`CacheAdapter` wraps any existing adapter and adds:

- **LRU caching** with configurable TTL for `fetchData` results
- **Per-table TTL overrides** for tables with different freshness requirements
- **In-flight deduplication** — simultaneous identical requests share one network call
- **Table-scoped cache invalidation** on writes (`insertRow`, `updateRow`, `deleteRow`)
- **Session-lifetime column caching** — `getColumns` is never re-fetched during a session

```javascript
import { CacheAdapter } from './src/dataAdapter/CacheAdapter.js';
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';

const adapter = new CacheAdapter(
    new RestApiAdapter({ baseUrl: 'http://localhost:3000' }),
    {
        ttl: 30000,                          // default TTL: 30 seconds
        ttlOverrides: { departments: 300000 }, // departments cached for 5 minutes
        maxEntries: 100,                      // LRU cap (default: 100)
    }
);

new StreamGrid('#my-grid', {
    dataAdapter: adapter,
    table: 'users',
});
```

### Constructor options

| Option | Type | Default | Description |
|---|---|---|---|
| `ttl` | `number` (ms) | `60000` | Default `fetchData` cache lifetime |
| `ttlOverrides` | `{ [table]: number }` | `{}` | Per-table TTL overrides |
| `maxEntries` | `number` | `100` | Maximum cached `fetchData` entries (LRU eviction) |

### `clearCache()`

Clears all cached `fetchData` results, column results, and in-flight entries:

```javascript
adapter.clearCache();
```

**Note:** If `clearCache()` is called while a request is in flight, the in-flight entry is removed from the deduplication map but the underlying promise continues running. When it resolves, it will repopulate the cache with fresh data. No pending promises are cancelled or rejected.

### Column cache lifetime

`getColumns` results are cached for the lifetime of the `CacheAdapter` instance with no TTL. Column structure is not expected to change during a session. If a table's schema changes, call `adapter.clearCache()` to force a fresh fetch on the next `getColumns` call.

---

## Building Your Own Adapter

The adapter contract is duck-typed: any object that implements all five methods is a valid adapter. Extending `BaseDataAdapter` is optional — it provides convenience stubs and will throw descriptive errors for unimplemented methods, but is not required by StreamGrid.

Implement the five methods:

| Method | Signature | Description |
|---|---|---|
| `getColumns` | `(table) → string[]` | Return an array of column names |
| `fetchData` | `(table, config?) → object[]` | Return an array of row objects |
| `insertRow` | `(table, data) → object` | Insert a new row, return it |
| `updateRow` | `(table, id, data) → object` | Update a row by ID, return it |
| `deleteRow` | `(table, id) → boolean` | Delete a row by ID |

```javascript
import { BaseDataAdapter } from './src/dataAdapter/BaseDataAdapter.js';

export class MyCustomAdapter extends BaseDataAdapter {
    async getColumns(table) {
        // Return ['col1', 'col2', ...]
    }
    async fetchData(table, config = {}) {
        // Return [{ col1: 'val', col2: 'val', ... }, ...]
    }
    async insertRow(table, data) { /* ... */ }
    async updateRow(table, id, data) { /* ... */ }
    async deleteRow(table, id) { /* ... */ }
}
```

Then pass it to StreamGrid exactly like `RestApiAdapter`:

```javascript
new StreamGrid('#my-grid', { dataAdapter: new MyCustomAdapter(), table: 'products' });
```

---

## Compatibility Notes

| Backend | Compatible? | Notes |
|---|---|---|
| json-server | ✅ Fully tested | |
| Node.js / Express | ✅ Yes | |
| Rails API | ✅ Yes | |
| Django REST Framework | ✅ Yes | |
| Firebase REST API | ⚠️ Partially | Needs custom pagination handling |
| GraphQL | ❌ | Needs a dedicated `GraphQLAdapter` |
| CSV endpoints | ❌ | Needs a dedicated `CsvApiAdapter` |
