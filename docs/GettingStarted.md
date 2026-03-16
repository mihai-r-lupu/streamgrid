# Getting Started

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

Or include the files directly:

- `src/StreamGrid.js`
- `src/streamgrid.css`

Import StreamGrid as an ES Module:

```javascript
import { StreamGrid } from './src/StreamGrid.js';
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';
```

---

## Basic Setup

```javascript
import { StreamGrid } from './src/StreamGrid.js';
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';

const grid = new StreamGrid('#example-container', {
  dataAdapter: new RestApiAdapter({ baseUrl: 'http://localhost:3000' }),
  table: 'users',
  columns: ['name', 'email', 'status'],
  pageSize: 10,
  pagination: true,
  paginationMode: 'numbers',
  paginationFirstLastButtons: true,
  loadDefaultCss: true
});
```

This renders a table inside `#example-container`, fetching data from the REST API.

---

## Key Concepts

- **Data Adapter** — connects StreamGrid to a backend data source (e.g. `RestApiAdapter`)
- **DataSet** — handles in-memory operations: select, insert, update, delete, filtering
- **Pagination Modes** — `pages`, `numbers`, or `infinite` scroll
- **Default CSS** — `streamgrid.css` is injected automatically unless `loadDefaultCss: false`

---

## Defaults

| Option | Default | Purpose |
|:---|:---|:---|
| `pagination` | `true` | Pagination enabled |
| `paginationMode` | `'pages'` | Prev/Next buttons |
| `loadDefaultCss` | `true` | Auto-injects `streamgrid.css` |

---

## Prerequisites

- Modern browser with ES6 module support
- A local web server (VS Code Live Server works) — `file://` won't load ES modules
- For REST APIs: json-server (`npm install -g json-server`) or your own backend

---

## Running json-server

```bash
npm install -g json-server
json-server --watch db.json --port 3000
```

Make sure `db.json` has a resource like `"users": []`.

---

## Troubleshooting

| Problem | Solution |
|:---|:---|
| Module not loading | Use a web server, not `file://` |
| `fetch` fails | Check that json-server or your API is running |
| Styling missing | Include `streamgrid.css` or set `loadDefaultCss: true` |

---

## Saving and Restoring Grid State

`exportConfig()` returns a single plain serialisable object that captures both the static configuration and the live state of the grid (current page, active filter text, all option values). The object is safe to pass to `JSON.stringify` and can be stored in `localStorage`, a database, or a URL parameter.

### Basic save and restore

```js
// Save
const snapshot = grid.exportConfig();
localStorage.setItem('gridState', JSON.stringify(snapshot));

// Restore
const saved = JSON.parse(localStorage.getItem('gridState'));
const grid = new StreamGrid('#grid', { ...saved, dataAdapter: myAdapter });
```

The restored grid starts on the exact page and with the exact filter text that was active when the snapshot was taken.

### The `version` field

Every snapshot includes `version: 1`. This field will be incremented if the snapshot schema changes in a future release. If you load a snapshot from a newer version into an older build of StreamGrid, the constructor throws immediately with a descriptive error — before any DOM side effects occur.

### Re-supplying `dataAdapter`

`dataAdapter` instances are not serialisable and are intentionally omitted from the snapshot. You must re-supply the adapter when reconstructing the grid, as shown in the example above.

### Re-attaching column `render` callbacks

Function-valued column properties (e.g. `render`) are stripped from the exported column objects. The absence is intentional — the property key is omitted entirely, not set to `null`. To restore render functions, merge the snapshot columns with your definitions:

```js
const snapshot = grid.exportConfig();
const restoredColumns = snapshot.columns.map(col => ({
    ...col,
    ...myColumnRenders[col.field]   // re-attach render functions by field name
}));
new StreamGrid('#grid', { ...snapshot, dataAdapter: myAdapter, columns: restoredColumns });
```

### `scrollContainer` round-trip

The `scrollContainer` option is stored internally as the original CSS selector string. It is exported as that same string and passed back to the constructor unchanged, so the DOM query is re-executed at reconstruction time against the current document.

### Filter text and the `filters` option

`currentFilterText` is only meaningful for restore purposes when `filters` is also a non-empty array. If `filters: []` (the default), no filter input is rendered and the saved filter text has no effect on the results — the grid ignores filter text when no filterable fields are configured. To restore a filtered view, ensure both `currentFilterText` and `filters` are present in the snapshot, which they will be when using `exportConfig()` on a properly configured grid.
