# Performance

---

## Pagination

For large datasets (10,000+ rows), pagination keeps the DOM small and scrolling smooth.

- Recommended `pageSize`: 10, 20, or 50
- `'pages'` mode for prev/next navigation
- `'numbers'` mode for direct page access

```javascript
pagination: true,
paginationMode: 'pages',
pageSize: 20,
```

---

## Infinite Scroll

Loads rows on demand as the user scrolls. The container needs a fixed height and `overflow-y: auto`.

- Recommended `infiniteScrollPageSize`: 50 or 100
- Trigger distance: 100–200px

```javascript
pagination: true,
paginationMode: 'infinite',
infiniteScrollPageSize: 50,
infiniteScrollTriggerDistance: 150,
```

---

## Filtering

Use `filterDebounceTime` to avoid re-filtering on every keystroke. 200–500ms works well.

```javascript
filters: ['name', 'email'],
filterDebounceTime: 300,
```

For datasets above `clientFilterThreshold` (default 1,000), `filterMode: 'auto'` sends filter queries to the server instead of scanning in memory. See [Filtering](Filtering.md) for details.

---

## Caching with CacheAdapter

For repeated requests to the same endpoint, wrap your adapter with `CacheAdapter` to avoid redundant network calls:

```javascript
import { CacheAdapter } from './src/dataAdapter/CacheAdapter.js';
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';

const adapter = new CacheAdapter(
    new RestApiAdapter({ baseUrl: 'https://api.example.com' }),
    { ttl: 30000, maxEntries: 100 }
);
```

- **TTL (Time-To-Live)** controls how long results stay in memory before expiring
- **In-flight deduplication** prevents duplicate simultaneous requests for the same cache key
- **LRU eviction** limits memory usage with `maxEntries`
- **Automatic invalidation** on writes (`insertRow`, `updateRow`, `deleteRow`) clears the table's cache entries

See [Adapters.md](Adapters.md) for full `CacheAdapter` options.

---

## Rough Sizing Guidelines

| Row count | Approach |
|---|---|
| Under 1,000 | Client-side filtering and pagination handle this fine |
| 1,000 – 50,000 | Use `filterMode: 'auto'` so large results filter server-side |
| 50,000+ | Use server-side filtering and small page sizes |
