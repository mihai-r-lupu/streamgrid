# Plugin System for StreamGrid

StreamGrid supports a simple plugin API. A plugin is any object with an optional `init(grid)` method. It receives the full grid instance once data has been loaded, and can attach DOM controls, subscribe to events, call any public method, or register hooks.

---

## Using Plugins

Pass plugin instances in the `plugins` array at construction time:

```javascript
import { StreamGrid } from './src/StreamGrid.js';

const grid = new StreamGrid('#example-container', {
  dataAdapter: adapter,
  table: 'users',
  columns: ['name', 'email', 'status'],
  plugins: [new WordCountPlugin(), new CsvExportPlugin()]
});
```

StreamGrid calls `plugin.init(grid)` for each plugin after the first data load, so `grid.dataSet` is already populated when `init()` runs.

---

## Writing a Plugin

```javascript
class WordCountPlugin {
    init(grid) {
        const label = document.createElement('div');
        label.textContent = `${grid.getFilteredRows().length} rows`;

        grid.on('filterApplied', ({ totalFilteredRows }) => {
            label.textContent = `${totalFilteredRows} rows`;
        });

        grid.container.parentElement.insertBefore(label, grid.container);
    }
}
```

A plugin with a CSV export button:

```javascript
class CsvExportPlugin {
    init(grid) {
        const btn = document.createElement('button');
        btn.textContent = 'Export CSV';
        btn.addEventListener('click', () => {
            const rows = grid.getFilteredRows();
            const csv = rows.map(r => Object.values(r).join(',')).join('\n');
            const a = Object.assign(document.createElement('a'), {
                href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
                download: 'export.csv'
            });
            a.click();
            URL.revokeObjectURL(a.href);
        });
        grid.container.parentElement.insertBefore(btn, grid.container);
    }
}
```

---

## Plugin Lifecycle

| Phase | What happens |
|---|---|
| Construction | `plugins` array is stored |
| `init()` called | `loading` event fires, shimmer rows appear |
| After first data load | `plugin.init(grid)` is called for each plugin |
| Live operation | Plugins react to events, extend UI, modify grid behaviour |

> `plugin.init(grid)` is called **after** data loads and the table renders — `grid.dataSet` is already populated. To run logic before data loads, listen to the `loading` event from inside `init()`.

