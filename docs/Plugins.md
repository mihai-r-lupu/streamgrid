# Plugin System for StreamGrid

StreamGrid supports a WordPress-inspired hook system and a plugin lifecycle API. A plugin is any object with an optional `init(grid)` method and an optional `destroy(grid)` method. Plugins can transform data in the rendering pipeline via **filters**, fire side effects at lifecycle points via **actions**, and register named **commands**.

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

    destroy(grid) {
        // Clean up any DOM or listeners your plugin created
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
| After first data load | `plugin.init(grid)` is called for each plugin, in registration order |
| Live operation | Plugins react to events, modify data via hooks, extend UI |
| `destroy()` called | `beforeDestroy` action fires, then `plugin.destroy(grid)` for each plugin, then DOM is cleared |

> `plugin.init(grid)` is called **after** data loads and the table renders — `grid.dataSet` is already populated. To run logic before data loads, listen to the `loading` event from inside `init()`.

---

## Hooks vs Events

StreamGrid exposes both **hooks** and **events**. They serve different purposes:

| | Hooks | Events |
|---|---|---|
| **Purpose** | Transform data in the pipeline | Notify observers after something happened |
| **API** | `addFilter()` / `addAction()` | `on()` / `off()` / `emit()` |
| **Return value** | Filters return modified data; actions fire side effects | No return value expected |
| **Use case** | Modify rows before render, inject CSS classes, cancel page changes | Logging, analytics, updating external UI |

Both are needed. Hooks let plugins modify the grid's internal pipeline; events let consumers react to the result.

---

## Hook API

All hook methods are available directly on the grid instance.

### Filters

Filters receive a value and return a (possibly modified) version. Multiple filters chain in priority order.

```javascript
grid.addFilter('hookName', callback, priority?, nsOrOpts?)
grid.applyFilters('hookName', value, ...args)  // returns transformed value
grid.removeFilter('hookName', callback)
grid.hasFilter('hookName')  // returns boolean
```

### Actions

Actions fire side effects at a specific lifecycle point. They do not return a value.

```javascript
grid.addAction('hookName', callback, priority?, nsOrOpts?)
grid.doAction('hookName', ...args)
grid.removeAction('hookName', callback)
grid.hasAction('hookName')  // returns boolean
```

### Async Hooks

For hooks that need to `await` async operations. Callbacks are awaited sequentially in priority order:

```javascript
await grid.doActionAsync('hookName', ...args)
await grid.applyFiltersAsync('hookName', value, ...args)
```

### Priority

The optional `priority` parameter (default `10`) controls execution order. Lower numbers run first:

```javascript
grid.addFilter('beforeRender', myFilter, 5);   // runs before priority 10
grid.addAction('afterRender', myAction, 20);    // runs after priority 10
```

Same-priority callbacks execute in registration order (FIFO).

### Namespace

Group hooks under a namespace for bulk removal. Pass a string or options object as the 4th parameter:

```javascript
// String shorthand
grid.addAction('afterRender', callback, 10, 'my-plugin');
grid.addFilter('beforeRender', filter, 10, 'my-plugin');

// Options object
grid.addAction('afterRender', callback, 10, { namespace: 'my-plugin' });

// Remove all hooks registered under the namespace
grid.removeAllHooks('my-plugin');
```

### Once

Register a callback that fires only once, then auto-removes itself:

```javascript
grid.addAction('afterRender', callback, 10, { once: true });

// Combine with namespace
grid.addAction('afterRender', callback, 10, { once: true, namespace: 'my-plugin' });
```

### Error Isolation

If a hook callback throws, the error is caught and logged to `console.error`. The remaining callbacks in the chain continue executing. This prevents a single broken plugin from crashing the entire grid.

### Return Value Contract

If a filter callback returns `undefined` (e.g. forgot a `return` statement), the previous value is preserved and passed to the next filter. This prevents accidental data loss in the chain.

---

## Built-in Hook Fire Points

StreamGrid fires hooks at 17 points in its lifecycle:

### Data Hooks

| Hook | Type | Receives | Returns |
|---|---|---|---|
| `beforeFetch` | filter | `config` object | Modified config (passed to adapter) |
| `afterFetch` | filter | `data` array | Modified data array |
| `beforeDataLoad` | filter | `{ incoming, current }` | `{ incoming, current }` — must return full object | Merge/transform incoming rows before DataSet is replaced |

```javascript
// Inject a custom parameter into every fetch
grid.addFilter('beforeFetch', config => {
    config.customParam = 'value';
    return config;
});

// Transform rows after fetching
grid.addFilter('afterFetch', data => {
    return data.map(row => ({ ...row, name: row.name.toUpperCase() }));
});
```

### Render Hooks

| Hook | Type | Receives | Returns |
|---|---|---|---|
| `beforeRender` | filter | `rowsToShow` array | Modified rows array |
| `headerRowRender` | filter | `{ element }` (`<tr>`) | `{ element }` |
| `headerCellRender` | filter | `{ column, element }` (`<th>`) | `{ element }` |
| `rowRender` | filter | `{ row, index, element }` (`<tr>`) | `{ element }` |
| `rowClass` | filter | `{ className, row, index }` | Modified object with `className` |
| `cellRender` | filter | `{ value, row, column, element }` | Modified object (can replace `element`) |
| `afterRender` | action | `gridInstance` | — |

```javascript
// Filter out certain rows before they render
grid.addFilter('beforeRender', rows => rows.filter(r => r.active));

// Add CSS classes to specific rows
grid.addFilter('rowClass', info => {
    return { ...info, className: info.row.status === 'overdue' ? 'highlight-red' : '' };
});

// Modify cell elements (e.g. add data attributes)
grid.addFilter('cellRender', info => {
    info.element.setAttribute('data-field', info.column.field || info.column);
    return info;
});

// Append a resize handle to every header cell (column resize plugin pattern)
grid.addFilter('headerCellRender', ({ column, element }) => {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.addEventListener('mousedown', startResize);
    element.appendChild(handle);
    return { column, element };
});

// Apply sticky positioning to the first column header cell (frozen columns pattern)
grid.addFilter('headerCellRender', ({ column, element }) => {
    const field = typeof column === 'string' ? column : column.field;
    if (field === 'name') {
        element.style.position = 'sticky';
        element.style.left = '0';
    }
    return { column, element };
});

// Make all rows draggable (row drag-and-drop plugin pattern)
grid.addFilter('rowRender', ({ row, index, element }) => {
    element.draggable = true;
    element.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', index));
    return { row, index, element };
});

// Run logic after the table has rendered
grid.addAction('afterRender', grid => {
    console.log('Table rendered with', grid.getFilteredRows().length, 'rows');
});
```

### Filter & Sort Hooks

| Hook | Type | Receives | Returns |
|---|---|---|---|
| `beforeFilter` | filter | `{ filterText, fields, options }` | Modified filter config |
| `beforeSort` | filter | `sortStack` array | Modified sort stack |
| `afterSort` | action | `{ sortStack }` | — |

```javascript
// Override or transform the filter text
grid.addFilter('beforeFilter', config => {
    config.filterText = config.filterText.replace(/[^\w\s]/g, '');
    return config;
});

// Force a specific sort direction
grid.addFilter('beforeSort', sortStack => {
    return [{ field: 'name', direction: 'asc' }];
});
```

### Pagination Hooks

| Hook | Type | Receives | Returns |
|---|---|---|---|
| `beforePageChange` | filter | `{ targetPage, currentPage, totalRows }` | Modified object (set `targetPage: null` to cancel) |

```javascript
// Prevent navigating past page 5
grid.addFilter('beforePageChange', info => {
    if (info.targetPage > 5) return { ...info, targetPage: null };
    return info;
});

// Redirect to a different page
grid.addFilter('beforePageChange', info => {
    if (info.targetPage === 2) return { ...info, targetPage: 3 };
    return info;
});
```

### Destroy Hook

| Hook | Type | Receives | Returns |
|---|---|---|---|
| `beforeDestroy` | action | `gridInstance` | — |

```javascript
grid.addAction('beforeDestroy', grid => {
    console.log('Grid is being destroyed');
});

// Shorthand
grid.onDestroy(() => { /* cleanup */ });
```

### State Hooks

These hooks allow plugins to participate in the `exportConfig()` / `importConfig()` round-trip,
saving and restoring their own state alongside the grid's built-in state.

| Hook | Type | Receives | Returns |
|---|---|---|---|
| `getState` | filter | full config snapshot object | augmented snapshot (spread in plugin keys) |
| `setState` | action | full snapshot object | — |

```javascript
// A ColumnWidthPlugin saving and restoring column widths:
class ColumnWidthPlugin {
    constructor() { this._widths = {}; }

    init(grid) {
        // On export: add column widths to the snapshot
        grid.addFilter('getState', state => ({ ...state, columnWidths: this._widths }), 10, 'col-width');

        // On import: restore column widths from snapshot
        // Must use ?? — older snapshots won't have this key
        grid.addAction('setState', snapshot => {
            this._widths = snapshot.columnWidths ?? {};
        }, 10, 'col-width');
    }
}
```

> **Plugin contract:** `setState` handlers must be **synchronous**. They fire before `init()`
> re-renders — any async handler will race the render and produce inconsistent state.
>
> **Snapshot tolerance:** always use `?? defaultValue` for every key read from the snapshot.
> Snapshots captured before the plugin was installed won't contain the plugin's keys.

### Data Load Hooks

`beforeDataLoad` fires in `_loadData()` after the adapter resolves and after `afterFetch`,
but **before** `this.dataSet` is replaced. This is the insertion point for:

- **Live polling / merge**: diff incoming rows against current and produce a merged result
- **Client-side joins**: augment rows with data from a second source
- **Response normalisation**: flatten or reshape nested API responses

**Plugin contract:** The filter callback receives `{ incoming, current }` and **must return
the full object** — returning only the array will cause `incoming` to be `undefined`.

```javascript
grid.addFilter('beforeDataLoad', ({ incoming, current }) => {
    // Merge by id: update existing rows, append new ones
    const map = new Map(current.map(r => [r.id, r]));
    for (const row of incoming) map.set(row.id, { ...map.get(row.id), ...row });
    return { incoming: [...map.values()], current };
}, 10, 'live-poll');
```

### Plugin-Convention Hooks

Plugin-convention hooks are not fired by StreamGrid core. They are a named contract that one plugin fires and other plugins can listen to. This is the same pattern as WooCommerce plugin-fired actions — the hook name is a well-known string, but the grid's lifecycle doesn't trigger it automatically.

The inline editing hooks follow this pattern. An editing plugin fires `commitCellEdit` when a cell is saved; a persistence plugin (or the same plugin) listens on `commitCellEdit` to write the value back to the DataSet.

| Hook | Type | Fired by | Arguments |
|---|---|---|---|
| `beforeCellEdit` | filter | editing plugin | `{ row, column, element }` |
| `commitCellEdit` | action | editing plugin | `{ row, column, oldValue, newValue }` |
| `cancelCellEdit` | action | editing plugin | `{ row, column }` |

```javascript
// An inline editing plugin — fires hooks as a named contract for other plugins
class InlineEditPlugin {
    init(grid) {
        grid.addFilter('cellRender', ({ value, row, column, element }) => {
            element.addEventListener('dblclick', () => {
                // Ask other plugins if they want a custom editor element
                const editInfo = grid.applyFilters('beforeCellEdit', { row, column, element });
                const input = editInfo.element.tagName === 'INPUT'
                    ? editInfo.element
                    : Object.assign(document.createElement('input'), { value });

                element.replaceChildren(input);
                input.focus();

                input.addEventListener('blur', () => {
                    grid.doAction('commitCellEdit', {
                        row, column,
                        oldValue: value,
                        newValue: input.value
                    });
                });

                input.addEventListener('keydown', e => {
                    if (e.key === 'Escape') grid.doAction('cancelCellEdit', { row, column });
                });
            });
            return { value, row, column, element };
        });

        // Write committed values back to the DataSet by row reference
        grid.addAction('commitCellEdit', ({ row, column, newValue }) => {
            const field = typeof column === 'string' ? column : column.field;
            // updateRow() works by reference identity — no ID needed
            grid.dataSet.updateRow(row, { [field]: newValue });
            grid._renderBody();
        }, 10, 'inline-edit-writeback');
    }
}
```

> **`DataSet.updateRow(rowRef, updates)`** — companion method for editing plugins. Updates a row by
> object reference identity using `indexOf`. Spreads updates non-destructively. A no-op if the row
> reference is not found. Used instead of `update(id, updates)` when the plugin has a row reference
> from `cellRender` but not the row's ID value.

> **Async hooks:** For use cases where hook callbacks need to perform async work (e.g., a
> `commitCellEdit` handler that writes to the server, or a `beforeDataLoad` handler that
> enriches rows from a second API), use `grid.doActionAsync()` / `grid.applyFiltersAsync()`.
> Callbacks are awaited sequentially in priority order. The sync variants (`doAction`,
> `applyFilters`) remain unchanged — do not swap them in core fire points.

---

## Command Registry

Register and execute named commands through the grid:

```javascript
grid.registerCommand('refresh', async () => {
    grid.showLoading();
    await grid.init();
});

grid.registerCommand('exportCSV', () => {
    const rows = grid.getFilteredRows();
    return rows.map(r => Object.values(r).join(',')).join('\n');
});

// Execute from anywhere
grid.executeCommand('refresh');
const csv = grid.executeCommand('exportCSV');
```

Calling `executeCommand` for an unregistered command throws an error.

---

## Debug Mode

Enable debug logging to see every hook call:

```javascript
grid.hooks.debug = true;
// Console now logs: [HookManager] hookName (N callbacks)
```

---

## Destroying the Grid

Call `destroy()` to tear down the grid cleanly:

```javascript
grid.destroy();
```

This fires the `beforeDestroy` action, calls `plugin.destroy(grid)` for each plugin (if the method exists), clears the container DOM, and resets the DataSet.

---

## Full Plugin Example

```javascript
class HighlightPlugin {
    init(grid) {
        // Add row highlighting based on data
        grid.addFilter('rowClass', info => {
            return { ...info, className: info.row.priority === 'high' ? 'row-highlight' : '' };
        }, 10, 'highlight-plugin');

        // Add a custom data attribute to every cell
        grid.addFilter('cellRender', info => {
            info.element.setAttribute('data-field', info.column.field || info.column);
            return info;
        }, 10, 'highlight-plugin');

        // Register a command to toggle highlighting
        grid.registerCommand('toggleHighlight', () => {
            this.enabled = !this.enabled;
        });

        this.enabled = true;
    }

    destroy(grid) {
        // Remove all hooks registered under our namespace
        grid.removeAllHooks('highlight-plugin');
    }
}
```

