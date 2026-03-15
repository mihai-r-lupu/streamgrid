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
