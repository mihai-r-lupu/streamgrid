# StreamGrid

![Tests](https://img.shields.io/badge/tests-77%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)

StreamGrid is a lightweight, zero-dependency JavaScript data table library written in pure ES6+. It renders HTML tables from any data source, supports built-in text filtering with automatic client/server mode switching, three pagination modes (pages, numbers, infinite scroll), a WordPress-style hook system, and an init-time plugin API — all without a framework.

## Live Demo

[**Try StreamGrid →**](https://mihai-r-lupu.github.io/stream-grid/docs/index.html)

---

## Architecture

```
StreamGrid
├── dataAdapter (BaseDataAdapter / RestApiAdapter)
├── DataSet → filterEngine.js
├── EventEmitter  (lifecycle events)
├── HookManager   (WordPress-style hooks)
└── Paginator     (page / infinite helpers)
```

---

## Installation

Clone the repository and install dev dependencies:

```bash
git clone https://github.com/mihai-r-lupu/stream-grid.git
cd stream-grid
npm install
```

Import directly as an ES Module — no bundler required:

```js
import { StreamGrid } from './src/StreamGrid.js';
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';
```

---

## Minimal Working Example

```js
import { StreamGrid } from './src/StreamGrid.js';
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';

const grid = new StreamGrid('#my-table', {
    dataAdapter: new RestApiAdapter({ baseUrl: 'http://localhost:3000' }),
    table: 'users',
    columns: ['name', 'email', 'status'],
    filters: ['name', 'email'],
    pagination: true,
    paginationMode: 'numbers',
    pageSize: 20,
});
```

This renders a fully functional data table inside `#my-table`, fetching live data from a REST API. A filter input appears above the table, and numbered pagination controls appear below.

To run a local mock API for development:

```bash
npm run demo   # starts json-server and opens the demo page
```

---

## Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `dataAdapter` | `BaseDataAdapter` | — | **Required.** Data source adapter instance. |
| `table` | `string` | — | **Required.** Table/resource name passed to the adapter. |
| `columns` | `string[] \| {field, label}[]` | `[]` | Column definitions. Auto-discovered from adapter if omitted. |
| `filters` | `string[]` | `[]` | Fields to enable text filtering on. No filter input if omitted. |
| `plugins` | `object[]` | `[]` | Plugin objects with an optional `init(grid)` method. |
| `customClickHandlers` | `{selector, callback}[]` | `[]` | Delegated click handlers tied to CSS selectors inside the table. |
| `pagination` | `boolean` | `true` | Enable pagination controls. |
| `paginationMode` | `'pages' \| 'numbers' \| 'infinite'` | `'pages'` | Pagination display mode. |
| `pageSize` | `number` | `10` | Rows per page. |
| `paginationFirstLastButtons` | `boolean` | `true` | Show First and Last navigation buttons. |
| `paginationPrevNextText` | `{prev, next}` | `{prev: 'Previous', next: 'Next'}` | Prev/Next button labels. |
| `paginationFirstLastText` | `{first, last}` | `{first: 'First', last: 'Last'}` | First/Last button labels. |
| `paginationOptions` | `object` | `{}` | Advanced options for `numbers` mode (see [Pagination Modes](#pagination-modes)). |
| `scrollContainer` | `string` | container selector | CSS selector for the scroll container used in `infinite` mode. |
| `infiniteScrollTriggerDistance` | `number` | `100` | Pixels from scroll bottom to trigger next batch load. |
| `infiniteScrollPageSize` | `number` | `pageSize` | Rows to append per scroll trigger. |
| `infiniteScrollTotalLimit` | `number` | `undefined` | Hard cap on total rows loaded in infinite mode. |
| `filterDebounceTime` | `number` | `300` | Milliseconds to debounce the filter input. |
| `filterCaseSensitive` | `boolean` | `false` | Enable case-sensitive filtering. |
| `filterMode` | `'auto' \| 'client' \| 'server'` | `'auto'` | Filtering strategy (see [Filter Modes](#filter-modes)). |
| `clientFilterThreshold` | `number` | `1000` | Row count above which `auto` mode switches to server filtering. |
| `loadDefaultCss` | `boolean` | `true` | Auto-inject the bundled `streamgrid.css`. |

---

## Pagination Modes

### `pages` — Classic Prev/Next

```js
paginationMode: 'pages',
pageSize: 20,
paginationFirstLastButtons: true,
paginationPrevNextText: { prev: '← Prev', next: 'Next →' },
paginationFirstLastText: { first: '« First', last: 'Last »' },
```

Renders First / Previous / Next / Last buttons only.

### `numbers` — Sliding window page numbers

```js
paginationMode: 'numbers',
pageSize: 20,
paginationOptions: {
    maxPageButtons: 7,     // visible page number count
    showEllipses: true,    // render '…' when pages are hidden
    jumpOffset: 10,        // render «10 / 10» jump buttons
    groupSize: 50,         // render a group-select dropdown
    showPageInput: true,   // render a go-to-page input
},
```

Renders First / Prev + numbered page buttons + Next / Last. All `paginationOptions` are optional.

### `infinite` — Scroll-triggered loading

```js
paginationMode: 'infinite',
infiniteScrollPageSize: 50,
infiniteScrollTriggerDistance: 150,
infiniteScrollTotalLimit: 500,   // optional cap
```

No pagination controls are rendered. More rows are appended automatically when the user scrolls within `infiniteScrollTriggerDistance` pixels of the container bottom.

---

## Auto-Switching Client/Server Filtering

When the loaded row count is at or below `clientFilterThreshold`, filtering runs in memory. Above it, the grid sends the filter query to the server through the adapter.

| Mode | Behaviour |
|---|---|
| `'client'` | Always filter in-memory. No extra server requests. |
| `'server'` | Always send the filter query to the server as URL parameters (`q`, `fields`). |
| `'auto'` *(default)* | Uses client filtering when the loaded row count is ≤ `clientFilterThreshold`; switches to server filtering above it. |

```js
filterMode: 'auto',
clientFilterThreshold: 1000,
filters: ['name', 'email'],
filterDebounceTime: 300,
```

---

## Events

Subscribe to lifecycle events with `grid.on(eventName, callback)`.

| Event | Payload | When |
|---|---|---|
| `dataLoaded` | `row[]` | After data is fetched from the adapter. |
| `tableRendered` | `gridInstance` | After the table body is re-rendered. |
| `filterApplied` | `{filterText, totalFilteredRows}` | After a filter operation completes. |
| `paginationChanged` | `{currentPage, totalRows}` | When the user navigates to a different page. |
| `dataRowClicked` | `rowData` | When a `<tbody>` row is clicked. |
| `cellClicked` | `{rowData, columnField}` | When a `<td>` is clicked. |
| `headerClicked` | `{columnField}` | When a `<th>` is clicked. |
| `headerRowClicked` | — | When the `<thead>` row is clicked. |
| `tableClicked` | `MouseEvent` | When anything inside the table is clicked. |

```js
grid.on('dataRowClicked', row => console.log('Row clicked:', row));
grid.on('filterApplied', ({ filterText, totalFilteredRows }) => {
    console.log(`Showing ${totalFilteredRows} results for "${filterText}"`);
});
```

---

## Hooks

The hook system follows the WordPress `addAction` / `addFilter` pattern. Multiple callbacks stack in registration order.

**Action hooks** — fire-and-forget side effects:

```js
grid.addAction('myAction', (data) => {
    console.log('Action fired with:', data);
});
grid.doAction('myAction', { foo: 'bar' });
```

**Filter hooks** — chainable value transformation:

```js
grid.addFilter('myFilter', (value) => value.toUpperCase());
grid.addFilter('myFilter', (value) => `[${value}]`);

const result = grid.applyFilters('myFilter', 'hello');
// result === '[HELLO]'
```

---

## Plugins

A plugin is any object with an optional `init(grid)` method. It receives the full grid instance and can attach DOM controls, subscribe to events, call any public method, or register hooks.

```js
class WordCountPlugin {
    init(grid) {
        const label = document.createElement('div');
        grid.on('filterApplied', ({ totalFilteredRows }) => {
            label.textContent = `${totalFilteredRows} rows`;
        });
        grid.container.parentElement.insertBefore(label, grid.container);
    }
}

const grid = new StreamGrid('#my-table', {
    // ...
    plugins: [new WordCountPlugin()],
});
```

Plugins are initialised after data is loaded, so `grid.dataSet` is populated when `init()` runs.

---

## Custom Adapters

Extend `BaseDataAdapter` and implement its five methods to connect StreamGrid to any backend.

```js
import { BaseDataAdapter } from './src/dataAdapter/BaseDataAdapter.js';

export class MyAdapter extends BaseDataAdapter {
    async getColumns(table) {
        // Return ['col1', 'col2', ...]
    }
    async fetchData(table, options = {}) {
        // Return [{ col1: 'val', col2: 'val', ... }, ...]
    }
    async insertRow(table, data) { /* ... */ }
    async updateRow(table, id, data) { /* ... */ }
    async deleteRow(table, id) { /* ... */ }
}
```

For REST APIs, the built-in `RestApiAdapter` serialises filter, pagination, and sort state into standard URL query parameters:

```js
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';

const adapter = new RestApiAdapter({ baseUrl: 'https://api.example.com' });
```

`RestApiAdapter` automatically fetches one row (`?_limit=1`) and infers column names from its keys.  No dedicated `/columns` endpoint is required.

---

## Testing

**Unit tests** (Mocha + Chai, JSDOM — no browser required):

```bash
npm run test:unit
```

**End-to-end tests** (Playwright — server starts automatically):

```bash
npm run test:e2e
```

Playwright auto-starts json-server via the `webServer` config. To keep the server running for manual testing as well:

```bash
npm run serve:test     # terminal 1: start json-server on port 3000
npm run test:e2e       # terminal 2: run Playwright tests
```

**Run both:**

```bash
npm test
```

---

## License

MIT — see [LICENSE](LICENSE).
