# Pagination

StreamGrid supports three pagination modes:

| Mode | Description |
|:---|:---|
| `pages` | Prev/Next buttons |
| `numbers` | Numbered page links with sliding window |
| `infinite` | Load more rows on scroll |

---

## Configuration

```javascript
pagination: true,
paginationMode: 'pages' // 'pages' | 'numbers' | 'infinite'
```

Default: `'pages'`.

---

## Prev/Next and First/Last Buttons

| Option | Default | Description |
|:---|:---|:---|
| `paginationFirstLastButtons` | `true` | Show First and Last buttons |
| `paginationPrevNextText` | `{ prev: 'Previous', next: 'Next' }` | Prev/Next labels |
| `paginationFirstLastText` | `{ first: 'First', last: 'Last' }` | First/Last labels |

```javascript
paginationFirstLastButtons: true,
paginationPrevNextText: { prev: '← Prev', next: 'Next →' },
paginationFirstLastText: { first: '« First', last: 'Last »' },
```

---

## Infinite Scroll

When `paginationMode` is `'infinite'`, rows are appended as the user scrolls near the bottom. No pagination buttons are rendered.

| Option | Default | Description |
|:---|:---|:---|
| `infiniteScrollTriggerDistance` | `100` | Distance (px) from bottom to trigger load |
| `infiniteScrollPageSize` | `pageSize` | Rows to load per trigger |
| `infiniteScrollTotalLimit` | `undefined` | Optional max row cap |

```javascript
pagination: true,
paginationMode: 'infinite',
pageSize: 20,
infiniteScrollTriggerDistance: 150,
infiniteScrollPageSize: 20,
infiniteScrollTotalLimit: 500
```
