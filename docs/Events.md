# Events

Subscribe to lifecycle events with `grid.on(eventName, callback)`. Multiple handlers can be registered for the same event.

---

## Built-in Events

| Event | When It Fires | Payload |
|:---|:---|:---|
| `loading` | At the start of `init()`, before any network requests | `()` |
| `tableRendered` | After the table body is inserted into the DOM | `(gridInstance)` |
| `dataLoaded` | After data is fetched from the adapter | `(fullDataArray)` |
| `filterApplied` | After a filter operation completes | `{ filterText, totalFilteredRows }` |
| `paginationChanged` | When the user changes page | `{ currentPage, totalRows }` |
| `sortChanged` | After the sort stack changes (header click) | `{ sortStack: [{field, direction}] }` |
| `dataRowClicked` | When a `<tbody>` data row is clicked | `(rowData)` |
| `cellClicked` | When a `<td>` in a data row is clicked | `{ rowData, columnField }` |
| `headerClicked` | When a `<th>` is clicked | `{ columnField }` |
| `headerRowClicked` | When the `<thead>` row is clicked | `()` |
| `tableClicked` | When anything inside the table is clicked | `(originalClickEvent)` |

> **Note:** `cellClicked`, `dataRowClicked`, and `tableClicked` are **not** emitted when clicking shimmer (loading) or empty-state rows.

---

## Example Usage

```javascript
const grid = new StreamGrid('#example-grid', { /* options */ });

grid.on('dataLoaded', (data) => {
    console.log('Loaded', data.length, 'rows');
});

grid.on('tableRendered', (gridInstance) => {
    console.log('Grid rendered!', gridInstance);
});

grid.on('cellClicked', (payload) => {
    console.log('Clicked cell in column', payload.columnField, 'Row:', payload.rowData);
});

grid.on('paginationChanged', ({ currentPage, totalRows }) => {
    console.log(`Page ${currentPage} of ${Math.ceil(totalRows / pageSize)}`);
});
```

---

## Event Firing Order

During a typical page load and user interaction, events fire in this order:

```
1. loading          ← init() starts, shimmer rows appear
2. dataLoaded       ← data fetched from adapter
3. tableRendered    ← rows (or empty state) painted
---
4. (User types in filter) -> filterApplied
5. (User clicks page button) -> paginationChanged
6. (User clicks a cell) -> cellClicked, dataRowClicked, tableClicked
7. (User clicks header cell) -> headerClicked, headerRowClicked, tableClicked
8. (User clicks sortable header) -> sortChanged, headerClicked, headerRowClicked, tableClicked
```

---

## Custom Events in Plugins

Plugins can emit their own events through the grid instance:

```javascript
this.emit('customPluginEvent', { data: 'whatever' });
```

Consumers listen with `.on('customPluginEvent', callback)` the same way as built-in events.

---

## Events vs Hooks

StreamGrid also exposes a **hook system** (`addFilter` / `addAction`) that serves a different purpose from events. See [Plugins.md](Plugins.md) for the full hook API.

| | Events (`on`/`emit`) | Hooks (`addFilter`/`addAction`) |
|---|---|---|
| **Purpose** | Notify after something happened | Transform data or fire side effects within the pipeline |
| **Changes behaviour?** | No — observation only | Yes — filters modify data, actions run at lifecycle points |
| **When to use** | Logging, analytics, UI updates | Modifying rows, adding CSS classes, cancelling navigation |
