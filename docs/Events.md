# Events

Subscribe to lifecycle events with `grid.on(eventName, callback)`. Multiple handlers can be registered for the same event.

---

## Built-in Events

| Event | When It Fires | Payload |
|:---|:---|:---|
| `tableRendered` | After the table body is inserted into the DOM | `(gridInstance)` |
| `dataLoaded` | After data is fetched from the adapter | `(fullDataArray)` |
| `filterApplied` | After a filter operation completes | `{ filterText, totalFilteredRows }` |
| `paginationChanged` | When the user changes page | `{ currentPage, totalRows }` |
| `dataRowClicked` | When a `<tbody>` row is clicked | `(rowData)` |
| `cellClicked` | When a `<td>` is clicked | `{ rowData, columnField }` |
| `headerClicked` | When a `<th>` is clicked | `{ columnField }` |
| `headerRowClicked` | When the `<thead>` row is clicked | `()` |
| `tableClicked` | When anything inside the table is clicked | `(originalClickEvent)` |

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
1. dataLoaded
2. tableRendered
---
3. (User types in filter) -> filterApplied
4. (User clicks page button) -> paginationChanged
5. (User clicks a cell) -> cellClicked, dataRowClicked, tableClicked
6. (User clicks header cell) -> headerClicked, headerRowClicked, tableClicked
```

---

## Custom Events in Plugins

Plugins can emit their own events through the grid instance:

```javascript
this.emit('customPluginEvent', { data: 'whatever' });
```

Consumers listen with `.on('customPluginEvent', callback)` the same way as built-in events.
