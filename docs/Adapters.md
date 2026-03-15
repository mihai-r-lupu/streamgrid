# Adapters

StreamGrid uses an adapter system to connect to different data sources (REST APIs, CSV files, GraphQL, etc.). Adapters implement five methods: `getColumns`, `fetchData`, `insertRow`, `updateRow`, `deleteRow`.

---

## Built-in Adapters

| Adapter | Purpose |
|---|---|
| `RestApiAdapter` | Connects to RESTful JSON APIs (json-server, Express, Rails, etc.) |

---

## RestApiAdapter

`RestApiAdapter` accepts a single `{ baseUrl }` option:

```javascript
import { RestApiAdapter } from './src/dataAdapter/RestApiAdapter.js';

const adapter = new RestApiAdapter({ baseUrl: 'http://localhost:3000' });
```

Plug it into StreamGrid:

```javascript
new StreamGrid('#my-grid', {
    dataAdapter: adapter,
    table: 'users',
    columns: ['name', 'email', 'status'],
});
```

Filter, pagination, and sort state are serialised into URL query parameters by `src/queryBuilder.js`. For example, a filter for `alice` on fields `name` and `email` becomes:

```
GET /users?q=alice&fields=name,email
```

---

## How `getColumns()` Works

`RestApiAdapter` fetches a single row via `GET /<table>?_limit=1` and infers column names from its keys. No dedicated `/columns` endpoint is required.

---

## Building Your Own Adapter

Extend `BaseDataAdapter` and implement its five methods:

| Method | Signature | Description |
|---|---|---|
| `getColumns` | `(table) → string[]` | Return an array of column names |
| `fetchData` | `(table, config?) → object[]` | Return an array of row objects |
| `insertRow` | `(table, data) → object` | Insert a new row, return it |
| `updateRow` | `(table, id, data) → object` | Update a row by ID, return it |
| `deleteRow` | `(table, id) → boolean` | Delete a row by ID |

```javascript
import { BaseDataAdapter } from './src/dataAdapter/BaseDataAdapter.js';

export class MyCustomAdapter extends BaseDataAdapter {
    async getColumns(table) {
        // Return ['col1', 'col2', ...]
    }
    async fetchData(table, config = {}) {
        // Return [{ col1: 'val', col2: 'val', ... }, ...]
    }
    async insertRow(table, data) { /* ... */ }
    async updateRow(table, id, data) { /* ... */ }
    async deleteRow(table, id) { /* ... */ }
}
```

Then pass it to StreamGrid exactly like `RestApiAdapter`:

```javascript
new StreamGrid('#my-grid', { dataAdapter: new MyCustomAdapter(), table: 'products' });
```

---

## Compatibility Notes

| Backend | Compatible? | Notes |
|---|---|---|
| json-server | ✅ Fully tested | |
| Node.js / Express | ✅ Yes | |
| Rails API | ✅ Yes | |
| Django REST Framework | ✅ Yes | |
| Firebase REST API | ⚠️ Partially | Needs custom pagination handling |
| GraphQL | ❌ | Needs a dedicated `GraphQLAdapter` |
| CSV endpoints | ❌ | Needs a dedicated `CsvApiAdapter` |


---

## Future Adapters

- `CsvApiAdapter` — for CSV file endpoints
- `GraphQLAdapter` — for GraphQL APIs
- `FirebaseAdapter` — for Firestore / Realtime DB
