# Getting Started

## Web Component Quick Start

The fastest way to embed StreamGrid is the `<stream-grid>` Web Component — one `<script>` tag and then pure HTML:

```html
<script type="module" src="path/to/src/webComponent/stream-grid.js"></script>

<stream-grid
  src="https://jsonplaceholder.typicode.com/users"
  table="users"
  page-size="10">
</stream-grid>
```

No JavaScript required for the basic case. For full attribute reference see the [Web Component section in README.md](../README.md#web-component).

If you need JS-level control (render callbacks, plugins, event listeners), the `element.grid` escape hatch gives you the full `StreamGrid` instance:

```js
const el = document.querySelector('stream-grid');
el.grid.on('sortChanged', ({ sortStack }) => console.log(sortStack));
```

---

## JavaScript API Quick Start

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

## Prerequisites

- A modern browser with ES6 module support
- A local web server — browsers block ES module imports from `file://`. VS Code Live Server works.
- A backend API: the examples below use json-server, or you can [write your own adapter](../docs/Adapters.md).

---

## Running json-server

```bash
npm install -g json-server
json-server --watch db.json --port 3000
```

Your `db.json` needs a resource matching your `table` option:

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com", "status": "Active" }
  ]
}
```

---

## Troubleshooting

| Problem | Solution |
|:---|:---|
| Module not loading | Use a web server, not `file://` |
| `fetch` fails | Check that json-server or your API is running |
| Styling missing | Include `streamgrid.css` or set `loadDefaultCss: true` |

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
});
```

This renders a table inside `#example-container`, fetching data from the REST API.

---

## Three Ways to Configure Columns

StreamGrid supports three distinct entry points for declaring columns. Choose whatever fits your workflow.

### 1 — JS array (programmatic)

Pass an array of field names or column objects directly in the constructor. Ideal when column config lives in JavaScript:

```js
const grid = new StreamGrid('#grid', {
  dataAdapter: myAdapter,
  table: 'users',
  columns: [
    { field: 'name',  label: 'Full Name' },
    { field: 'email', label: 'Email', sortable: false },
    { field: 'age',   label: 'Age',   sorter: 'number' },
  ],
  filters: ['name', 'email'],
});
```

### 2 — Web Component declarative (`<stream-grid-column>`)

When using the `<stream-grid>` custom element, declare columns as child elements. StreamGrid reads them at connection time:

```html
<stream-grid src="https://api.example.com/users" table="users" page-size="10">
  <stream-grid-column field="name"  label="Full Name" filter></stream-grid-column>
  <stream-grid-column field="email" label="Email"     filter sortable="false"></stream-grid-column>
  <stream-grid-column field="age"   label="Age"       sorter="number"></stream-grid-column>
</stream-grid>
```

| Attribute  | Description                                                  |
|------------|--------------------------------------------------------------|
| `field`    | Data key. Required.                                          |
| `label`    | Header text.                                                 |
| `sortable` | `"false"` to disable sorting.                                |
| `width`    | CSS width (e.g. `"120px"`).                                  |
| `sorter`   | `"string"` / `"number"` / `"date"`.                         |
| `filter`   | Boolean. Present = add field to `filters`.                   |

### 3 — DOM `<th>` elements (`columns: 'dom'`)

Pre-author a `<thead>` in your container markup and pass `columns: 'dom'`. StreamGrid reads the `<th>` elements before clearing the container for its own layout. Inspired by DataTables:

```html
<div id="grid">
  <table>
    <thead>
      <tr>
        <th data-field="name"  data-sg-label="Full Name" data-sg-filter>Name</th>
        <th data-field="email" data-sg-filter data-sg-sortable="false">Email</th>
        <th data-field="age"   data-sg-sorter="number">Age</th>
        <th data-field="sku"   data-sg-width="100px">SKU</th>
      </tr>
    </thead>
  </table>
</div>
```

```js
const grid = new StreamGrid('#grid', {
  dataAdapter: myAdapter,
  table: 'users',
  columns: 'dom',
});
```

| `data-*` attribute | Description                                                  |
|--------------------|--------------------------------------------------------------|
| `data-field`       | Data key. **Required** — throws if absent.                   |
| `data-sg-label`    | Header text. Falls back to `th.textContent`, then `data-field`. |
| `data-sg-sortable` | `"false"` to disable sorting.                                |
| `data-sg-sorter`   | `"string"` / `"number"` / `"date"`.                         |
| `data-sg-filter`   | Boolean attribute. Present = add field to `filters`.         |
| `data-sg-width`    | CSS width (e.g. `"120px"`).                                  |

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
| `loadingText` | `'Loading\u2026'` | Shimmer placeholder text (or pass a function) |
| `emptyText` | `'No results'` | Empty-state message (or pass a function) |

---

## Loading State and Empty State

StreamGrid automatically shows a shimmer skeleton while data is loading, then shows an empty-state row when no results match the current filter.

### Customising the messages

Both options accept a plain string or a zero-argument function that returns a string or an `HTMLElement`:

```js
const grid = new StreamGrid('#grid', {
    dataAdapter: adapter,
    table: 'users',
    // Plain string (default)
    emptyText: 'No users found',

    // Or a function returning a string
    emptyText: () => `<em>No users match your search</em>`,

    // Or a function returning a DOM node
    emptyText: () => {
        const el = document.createElement('span');
        el.textContent = 'No results — try a different filter';
        return el;
    },
});
```

> **Security note:** When `emptyText` returns an HTML string, it is set via `innerHTML`. If you include user-supplied content in the string, escape it first.

### Triggering the loading state manually

`showLoading()` is public — call it before any manual data refresh to show the shimmer immediately:

```js
document.querySelector('#refresh').addEventListener('click', async () => {
    grid.showLoading();
    await grid.init();
});
```

### Listening for the `loading` event

The `loading` event fires at the very start of `init()`, before any network requests. Use it to disable UI controls while the grid is fetching:

```js
grid.on('loading', () => {
    document.querySelector('#refresh').disabled = true;
});
grid.on('tableRendered', () => {
    document.querySelector('#refresh').disabled = false;
});
```

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

---

## Column Render Callbacks

Each column definition can include a `render(value, row, context)` function for full control over cell content — returning a string (set as `innerHTML`), a DOM `Node`, or `null`/`undefined` to fall back to the raw value.

For the complete API, XSS-safe templating with the `html` tag, and custom error handling, see [Column Render Callbacks](../README.md#column-render-callbacks) in the README.

---

## Sorting

Columns are sortable by default. Click any column header to sort; click again to reverse; click a third time to clear. Hold **Shift** while clicking to build a multi-column sort.

```js
const grid = new StreamGrid('#my-grid', {
    dataAdapter: myAdapter,
    table: 'users',
    columns: [
        { field: 'name',   label: 'Name' },              // string sort (default)
        { field: 'age',    label: 'Age',    sorter: 'number' },
        { field: 'joined', label: 'Joined', sorter: 'date' },
        { field: 'id',     label: 'ID',     sortable: false },
    ],
});
```

To set an initial sort or restore a saved sort state:

```js
new StreamGrid('#grid', {
    // ...
    sortStack: [{ field: 'name', direction: 'asc' }],
});
```

For the full options reference (`sortMode`, `clientSortThreshold`, `sortNullsFirst`, the Shift+click interaction model, and the `sortMode` × `filterMode` combination table) see [Column Sorting](../README.md#column-sorting) in the README.
