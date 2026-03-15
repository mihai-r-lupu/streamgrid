# Filtering

StreamGrid filters rows client-side or server-side based on the `filterMode` setting.

---

## How Filtering Works

StreamGrid renders a text input field above the table when `filters` is configured.
When the user types into it, the table filters rows in real time using a configurable debounce.

The search applies to **only the columns** you specify. Filtering is **case-insensitive** by default.

---

## Enabling Filtering

Specify the `filters` array when initializing StreamGrid:

```javascript
filters: ['name', 'email', 'status']
```

Only the `name`, `email`, and `status` fields will be searched. If `filters` is omitted, no filter input appears.

---

## Basic Example

```javascript
import { StreamGrid } from './src/StreamGrid.js';
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';

const grid = new StreamGrid('#grid', {
  dataAdapter: new RestApiAdapter({ baseUrl: 'http://localhost:3000' }),
  table: 'users',
  columns: ['name', 'email', 'status'],
  filters: ['name', 'email'],
  filterDebounceTime: 300,
  filterCaseSensitive: false,
});
```

---

## Filter Options

| Option | Type | Default | Description |
|---|---|---|---|
| `filters` | `string[]` | `[]` | Fields to search. No input rendered if omitted. |
| `filterDebounceTime` | `number` | `300` | Milliseconds to wait after the last keystroke before filtering. |
| `filterCaseSensitive` | `boolean` | `false` | When `true`, filtering respects letter case. |
| `filterMode` | `'auto' \| 'client' \| 'server'` | `'auto'` | Where filtering runs (see below). |
| `clientFilterThreshold` | `number` | `1000` | Row count at which `auto` mode switches from client to server. |

---

## Filter Modes

StreamGrid supports three strategies via `filterMode`:

| Mode | Behaviour |
|---|---|
| `'client'` | Always filters the in-memory DataSet. No extra server requests. Best for small datasets. |
| `'server'` | Always sends the filter query to the server as URL parameters (`q`, `fields`). Best when the full dataset is not loaded. |
| `'auto'` | Uses client filtering when the loaded row count is ≤ `clientFilterThreshold`; switches to server filtering above that threshold. |

```javascript
// Auto mode — small datasets filter locally, large ones hit the server
filterMode: 'auto',
clientFilterThreshold: 1000,
```

---

## Interaction with Pagination

Filtering resets pagination automatically to page 1 and works across all pagination modes (`pages`, `numbers`, `infinite`).

