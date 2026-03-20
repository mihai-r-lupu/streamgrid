/* Auto-generated - do not edit manually.
   Edit the JSON files in data/ and re-run the build script. */
window.STREAMGRID_DATA = {};
window.STREAMGRID_DATA.meta = {
  "name": "StreamGrid",
  "version": "1.0.0",
  "repositoryUrl": "https://github.com/MikeyA-yo/stream-grid",
  "license": "MIT",
  "status": "active-development",
  "lastUpdated": "2025-07-14",
  "positioning": "Zero-dependency ES6+ data table library",
  "description": "Lightweight, framework-free JavaScript data table that renders from any data source. Built-in text filtering with automatic client/server mode switching, three pagination modes, a WordPress-style hook system, and an init-time plugin API — all without a single dependency.",
  "coreAbstraction": "The Grid — a self-contained table controller backed by pluggable DataAdapters and driven by a declarative config object or HTML attributes.",
  "pipeline": "DataAdapter → DataSet → StreamGrid → DOM",
  "scope": {
    "inScope": [
      "HTML table rendering from any data source",
      "Client-side and server-side pagination (pages, numbered, infinite scroll)",
      "Client-side and server-side filtering with auto-switching",
      "Client-side and server-side sorting with multi-column support",
      "Pluggable data adapters (REST API, cache, custom)",
      "Web Component API (<stream-grid>, <stream-grid-column>)",
      "Declarative template rendering with {{value}} interpolation",
      "Plugin system and hook-based extensibility"
    ],
    "outOfScope": [
      "Framework bindings (React, Vue, Angular)",
      "Build tools / TypeScript compilation",
      "CSS-in-JS or theming engine",
      "Charting or visualization",
      "Form generation or validation",
      "Backend / database layer"
    ]
  },
  "audience": [
    "Developers who want a fast, zero-dependency data table",
    "Teams building admin dashboards without a framework",
    "Projects needing server-side pagination without framework overhead",
    "Developers migrating from jQuery DataTables to modern vanilla JS"
  ],
  "stats": {
    "codebaseLines": 2300,
    "unitTests": 253,
    "e2eTests": 51,
    "totalTests": 304,
    "dependencies": 0
  }
}
;
window.STREAMGRID_DATA.components = [
  {
    "id": "streamgrid",
    "name": "StreamGrid",
    "class": "StreamGrid",
    "namespace": "Core",
    "files": ["src/StreamGrid.js"],
    "status": "done",
    "description": "Main grid orchestrator. Manages DOM rendering, data loading, filtering, sorting, pagination, and event lifecycle.",
    "responsibility": "Coordinates DataAdapter, DataSet, EventEmitter, HookManager, and plugin system. Builds the table DOM from configuration. Auto-switches between client and server modes for filtering and sorting based on configurable thresholds.",
    "dependencies": ["dataset", "event-emitter", "hook-manager", "filter-engine", "paginator", "pagination-helpers", "sort-comparators", "query-builder"],
    "milestone": "foundation"
  },
  {
    "id": "dataset",
    "name": "DataSet",
    "class": "DataSet",
    "namespace": "Core",
    "files": ["src/DataSet.js"],
    "status": "done",
    "description": "In-memory dataset wrapper with CRUD, sort, and filter operations.",
    "responsibility": "Stores rows as an array, provides append/clear/getAll/setAll methods. Serves as the client-side data layer between adapter responses and grid rendering.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "base-data-adapter",
    "name": "BaseDataAdapter",
    "class": "BaseDataAdapter",
    "namespace": "DataAdapter",
    "files": ["src/dataAdapter/BaseDataAdapter.js"],
    "status": "done",
    "description": "Abstract base class defining the contract for all data adapters.",
    "responsibility": "Declares the interface methods (getRows, getColumns, insertRow, updateRow, deleteRow) that concrete adapters must implement. Provides consistent error messages for unimplemented methods.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "rest-api-adapter",
    "name": "RestApiAdapter",
    "class": "RestApiAdapter",
    "namespace": "DataAdapter",
    "files": ["src/dataAdapter/RestApiAdapter.js"],
    "status": "done",
    "description": "REST API data adapter using fetch for JSON HTTP backends.",
    "responsibility": "Connects to any JSON REST API. Supports configurable endpoints, custom headers, server-side pagination/filtering/sorting via query builder functions, and automatic column inference from response keys.",
    "dependencies": ["base-data-adapter", "query-builder"],
    "milestone": "foundation"
  },
  {
    "id": "cache-adapter",
    "name": "CacheAdapter",
    "class": "CacheAdapter",
    "namespace": "DataAdapter",
    "files": ["src/dataAdapter/CacheAdapter.js"],
    "status": "done",
    "description": "Decorator adapter that wraps any adapter with LRU caching and in-flight deduplication.",
    "responsibility": "Caches adapter responses with configurable TTL and per-table overrides. Deduplicates concurrent identical requests. Invalidates table-scoped cache on write operations. Exposes clearCache() public method.",
    "dependencies": ["base-data-adapter", "stable-serialise"],
    "milestone": "top-20"
  },
  {
    "id": "event-emitter",
    "name": "EventEmitter",
    "class": "EventEmitter",
    "namespace": "Events",
    "files": ["src/events/EventEmitter.js"],
    "status": "done",
    "description": "Lightweight pub/sub emitter for grid lifecycle events.",
    "responsibility": "Provides on/off/emit interface. Used by StreamGrid for row click, cell click, header click, page change, filter change, sort change, and loading events.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "hook-manager",
    "name": "HookManager",
    "class": "HookManager",
    "namespace": "Hooks",
    "files": ["src/hooks/HookManager.js"],
    "status": "done",
    "description": "WordPress-style action and filter hook system for extensibility.",
    "responsibility": "Provides addAction/doAction/addFilter/applyFilters interface with priority ordering. Used by the plugin system to allow init-time customization of grid behavior.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "filter-engine",
    "name": "Filter Engine",
    "class": null,
    "namespace": "Core/Filtering",
    "files": ["src/core/filtering/filterEngine.js"],
    "status": "done",
    "description": "Pure function for multi-field text filtering with case sensitivity options.",
    "responsibility": "Exports filterRows(rows, filterText, fields, options). Supports case-insensitive substring matching across multiple fields. Used by StreamGrid for client-side filtering.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "paginator",
    "name": "Paginator",
    "class": null,
    "namespace": "Core/Pagination",
    "files": ["src/core/pagination/paginator.js"],
    "status": "done",
    "description": "Pure functions for classic and infinite scroll pagination.",
    "responsibility": "Exports page(data, pageNum, pageSize) for classic pagination and infinite(data, loadedCount, pageSize) for infinite scroll. Slices data arrays without mutation.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "pagination-helpers",
    "name": "Pagination Helpers",
    "class": null,
    "namespace": "Core/Pagination",
    "files": ["src/core/pagination/paginationHelpers.js"],
    "status": "done",
    "description": "Sliding-window page number calculations for pagination UI.",
    "responsibility": "Exports getPageWindow(currentPage, totalPages, windowSize). Computes which page buttons to render in the pagination bar.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "sort-comparators",
    "name": "Sort Comparators",
    "class": null,
    "namespace": "Core/Sorting",
    "files": ["src/core/sorting/sortComparators.js"],
    "status": "done",
    "description": "Built-in comparators for string, number, and date sorting.",
    "responsibility": "Exports SORT_COMPARATORS map with string/number/date comparator functions. Supports custom (a, b) => number functions for user-defined sort logic.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "query-builder",
    "name": "Query Builder",
    "class": null,
    "namespace": "Core",
    "files": ["src/queryBuilder.js"],
    "status": "done",
    "description": "Pure functions serializing filter/pagination/sort state to URL query parameters.",
    "responsibility": "Exports buildFilterParams, buildPaginationParams, buildSortParams. Used by RestApiAdapter to construct server-side request URLs.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "html-utils",
    "name": "HTML Utilities",
    "class": null,
    "namespace": "Utils",
    "files": ["src/utils/html.js"],
    "status": "done",
    "description": "XSS-safe HTML rendering utilities.",
    "responsibility": "Exports escapeHtml(str) for entity escaping and html tagged template literal for safe DOM string construction. Used by template rendering and render callbacks.",
    "dependencies": [],
    "milestone": "foundation"
  },
  {
    "id": "stable-serialise",
    "name": "Stable Serialise",
    "class": null,
    "namespace": "Utils",
    "files": ["src/utils/stableSerialise.js"],
    "status": "done",
    "description": "Deterministic JSON serialization with sorted keys.",
    "responsibility": "Exports stableSerialise(obj). Produces identical output regardless of object key insertion order. Used by CacheAdapter for cache key generation.",
    "dependencies": [],
    "milestone": "top-20"
  },
  {
    "id": "stream-grid-element",
    "name": "StreamGridElement",
    "class": "StreamGridElement",
    "namespace": "WebComponent",
    "files": ["src/webComponent/StreamGridElement.js"],
    "status": "done",
    "description": "Custom element implementing <stream-grid> for declarative HTML-first usage.",
    "responsibility": "Registers <stream-grid> custom element. Maps HTML attributes to StreamGrid options. Light DOM rendering (no Shadow DOM). Supports src, table, page-size, pagination-mode, filter-mode, filter-debounce, sort-mode, and template attributes. Provides grid escape hatch via element.grid property. Uses queueMicrotask batching for attribute changes.",
    "dependencies": ["streamgrid", "stream-grid-column"],
    "milestone": "top-20"
  },
  {
    "id": "stream-grid-column",
    "name": "StreamGridColumn",
    "class": "StreamGridColumn",
    "namespace": "WebComponent",
    "files": ["src/webComponent/StreamGridColumn.js"],
    "status": "done",
    "description": "Custom element implementing <stream-grid-column> for declarative column configuration.",
    "responsibility": "Passive data carrier that notifies its parent <stream-grid> element on attribute changes. Supports field, label, sortable, sorter, width, filter, and template attributes. Triggers parent reinit on connect/disconnect/attribute change.",
    "dependencies": [],
    "milestone": "top-20"
  },
  {
    "id": "stream-grid-entry",
    "name": "Web Component Entry",
    "class": null,
    "namespace": "WebComponent",
    "files": ["src/webComponent/stream-grid.js"],
    "status": "done",
    "description": "Entry point that exports StreamGridElement, StreamGridColumn, and re-exports StreamGrid.",
    "responsibility": "Convenience entry point for importing the full Web Component suite. Registers both custom elements and provides the core StreamGrid class.",
    "dependencies": ["stream-grid-element", "stream-grid-column", "streamgrid"],
    "milestone": "top-20"
  },
  {
    "id": "streamgrid-css",
    "name": "StreamGrid CSS",
    "class": null,
    "namespace": "Styles",
    "files": ["src/streamgrid.css"],
    "status": "done",
    "description": "Core stylesheet with sg- namespaced classes, shimmer loading animation, and responsive design.",
    "responsibility": "Provides all visual styling for the grid: table layout, pagination controls, filter input, loading shimmer, empty states, sort indicators, and scroll containers. Uses CSS custom properties for theming.",
    "dependencies": [],
    "milestone": "foundation"
  }
]
;
window.STREAMGRID_DATA.features = {
  "categories": [
    {
      "id": "core-rendering",
      "name": "Core Rendering",
      "description": "Table rendering, DOM management, and visual states"
    },
    {
      "id": "data-layer",
      "name": "Data Layer",
      "description": "Data adapters, datasets, and data fetching"
    },
    {
      "id": "pagination",
      "name": "Pagination",
      "description": "Client-side and server-side pagination modes"
    },
    {
      "id": "filtering",
      "name": "Filtering",
      "description": "Client-side and server-side text filtering with auto-switching"
    },
    {
      "id": "sorting",
      "name": "Sorting",
      "description": "Client-side and server-side column sorting with multi-column support"
    },
    {
      "id": "web-component",
      "name": "Web Component",
      "description": "Declarative HTML-first API via custom elements"
    },
    {
      "id": "extensibility",
      "name": "Extensibility",
      "description": "Plugin system, hooks, events, and developer APIs"
    },
    {
      "id": "planned",
      "name": "Planned Features",
      "description": "Backlog items on the roadmap"
    },
    {
      "id": "planned-plugins",
      "name": "Planned Plugins",
      "description": "Features designed to ship as opt-in plugins"
    }
  ],
  "features": [
    {
      "id": "table-rendering",
      "category": "core-rendering",
      "name": "HTML table rendering",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Renders a full HTML table from a configuration object and data source. Builds thead, tbody, and optional pagination/filter UI.",
      "implementation": "StreamGrid.js renderHeader(), renderBody(), renderPagination() methods.",
      "benefit": "Single constructor call produces a complete, interactive data table.",
      "components": ["streamgrid"]
    },
    {
      "id": "loading-state",
      "category": "core-rendering",
      "name": "Loading shimmer state",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Animated shimmer rows with staggered CSS animation delays while data loads.",
      "implementation": "showLoading() API with sg-loading-row class and CSS @keyframes shimmer. Zero JS animation.",
      "benefit": "Users see immediate visual feedback — no blank table flash.",
      "components": ["streamgrid", "streamgrid-css"]
    },
    {
      "id": "empty-state",
      "category": "core-rendering",
      "name": "Empty state display",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Shows a configurable message when there are no rows or when filters return no matches.",
      "implementation": "Two paths: genuine empty dataset vs. active filter with no results. Both use .sg-empty-row. Configurable emptyText option.",
      "benefit": "Users never see a blank table — they always know why there's no data.",
      "components": ["streamgrid"]
    },
    {
      "id": "render-callbacks",
      "category": "core-rendering",
      "name": "Column render callbacks",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Per-column render(value, row, context) function that returns string (innerHTML), Node (appendChild), or null (textContent).",
      "implementation": "render() function in column config with context = { type: 'display', field, col }. onRenderError hook for error handling.",
      "benefit": "Full control over cell content — badges, links, images, custom HTML — without modifying data.",
      "components": ["streamgrid", "html-utils"]
    },
    {
      "id": "template-rendering",
      "category": "core-rendering",
      "name": "Declarative template rendering",
      "status": "done",
      "tier": "core",
      "milestone": "template",
      "description": "{{value}} and {{row.field}} interpolation in HTML <template> elements, with XSS protection via escapeHtml().",
      "implementation": "Web component template attribute on <stream-grid> or <stream-grid-column>. Compiles template strings to render functions at init time.",
      "benefit": "HTML-first developers can customize cell rendering without writing JavaScript.",
      "components": ["stream-grid-element", "stream-grid-column", "html-utils"]
    },
    {
      "id": "rest-adapter",
      "category": "data-layer",
      "name": "REST API adapter",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Connects to any JSON REST API via fetch. Supports custom headers, configurable endpoints, and automatic column inference.",
      "implementation": "RestApiAdapter extends BaseDataAdapter. Uses query builder functions for server-side pagination, filtering, and sorting.",
      "benefit": "Drop-in integration with any JSON API — no backend changes needed.",
      "components": ["rest-api-adapter", "query-builder"]
    },
    {
      "id": "cache-adapter",
      "category": "data-layer",
      "name": "CacheAdapter (LRU + dedup)",
      "status": "done",
      "tier": "core",
      "milestone": "top-20",
      "description": "Wraps any adapter with LRU caching, configurable TTL, per-table TTL overrides, and in-flight request deduplication.",
      "implementation": "CacheAdapter decorator pattern. Uses stableSerialise for deterministic cache keys. Auto-invalidates on writes.",
      "benefit": "Reduces API calls dramatically — identical concurrent requests return the same promise.",
      "components": ["cache-adapter", "stable-serialise"]
    },
    {
      "id": "dataset",
      "category": "data-layer",
      "name": "In-memory DataSet",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Client-side data store with append, clear, getAll, and setAll operations.",
      "implementation": "DataSet class wraps an array of row objects.",
      "benefit": "Clean separation between adapter responses and grid rendering layer.",
      "components": ["dataset"]
    },
    {
      "id": "custom-adapter",
      "category": "data-layer",
      "name": "Custom adapter support",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Extend BaseDataAdapter to connect to any data source — Firebase, GraphQL, localStorage, or static arrays.",
      "implementation": "BaseDataAdapter abstract class with getRows/getColumns/insertRow/updateRow/deleteRow contract.",
      "benefit": "Not locked into REST APIs — works with any backend or client-side data source.",
      "components": ["base-data-adapter"]
    },
    {
      "id": "client-pagination",
      "category": "pagination",
      "name": "Client-side pagination",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Three modes: 'pages' (prev/next), 'numbers' (clickable page buttons with sliding window), 'infinite' (load more on scroll).",
      "implementation": "paginator.js page() and infinite() functions. paginationHelpers.js getPageWindow() for button calculations.",
      "benefit": "Works with any data source — no server support needed. Three UX patterns in one option.",
      "components": ["paginator", "pagination-helpers", "streamgrid"]
    },
    {
      "id": "server-pagination",
      "category": "pagination",
      "name": "Server-side pagination",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Delegates pagination to the server via query parameters. Supports all three pagination modes.",
      "implementation": "RestApiAdapter passes _page/_limit params to server. Grid reads X-Total-Count header for page calculations.",
      "benefit": "Handles millions of rows — only the current page is fetched.",
      "components": ["rest-api-adapter", "query-builder", "streamgrid"]
    },
    {
      "id": "infinite-scroll",
      "category": "pagination",
      "name": "Infinite scroll",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Appends rows as the user scrolls to the bottom. Works in both client-side and server-side modes.",
      "implementation": "paginationMode: 'infinite'. Intersection Observer or scroll event detection. loadMoreRows() public API.",
      "benefit": "Modern UX for large datasets — no page buttons, just continuous scrolling.",
      "components": ["paginator", "streamgrid"]
    },
    {
      "id": "client-filter",
      "category": "filtering",
      "name": "Client-side text filtering",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Debounced text input filters rows across all columns using case-insensitive substring matching.",
      "implementation": "filterEngine.js filterRows() pure function. Configurable debounce delay and filter fields.",
      "benefit": "Instant, responsive filtering with no server round-trips for small datasets.",
      "components": ["filter-engine", "streamgrid"]
    },
    {
      "id": "server-filter",
      "category": "filtering",
      "name": "Server-side filtering",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Sends filter text to the server as a query parameter when the dataset exceeds the client-side threshold.",
      "implementation": "filterMode: 'server' or auto-switching via clientFilterThreshold. Query builder serializes filter state.",
      "benefit": "Scales to any dataset size — the server handles the heavy lifting.",
      "components": ["rest-api-adapter", "query-builder", "streamgrid"]
    },
    {
      "id": "auto-switch-filter",
      "category": "filtering",
      "name": "Auto-switching filter mode",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Automatically switches between client-side and server-side filtering based on a configurable row threshold.",
      "implementation": "filterMode: 'auto' (default). clientFilterThreshold determines the crossover point.",
      "benefit": "Optimal performance without manual configuration — fast for small data, scalable for large data.",
      "components": ["streamgrid"]
    },
    {
      "id": "client-sort",
      "category": "sorting",
      "name": "Client-side sorting",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Click column headers to sort. Three-click cycle: ascending → descending → clear.",
      "implementation": "sortComparators.js with string/number/date comparators. Multi-column via shift-click. Sort priority badges in headers.",
      "benefit": "Instant, responsive sorting with visual indicators.",
      "components": ["sort-comparators", "streamgrid"]
    },
    {
      "id": "multi-column-sort",
      "category": "sorting",
      "name": "Multi-column sorting",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Shift-click to add secondary, tertiary sort levels. Sort priority badges show the order.",
      "implementation": "sortStack array of { field, direction } objects. Visual priority indicators on column headers.",
      "benefit": "Complex data analysis without custom code — sort by category, then by date, then by name.",
      "components": ["sort-comparators", "streamgrid"]
    },
    {
      "id": "server-sort",
      "category": "sorting",
      "name": "Server-side sorting",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Delegates sorting to the server when dataset exceeds client threshold.",
      "implementation": "sortMode: 'server' or auto-switching via clientSortThreshold. Query builder serializes sort state.",
      "benefit": "Handles datasets too large for client-side sort.",
      "components": ["rest-api-adapter", "query-builder", "streamgrid"]
    },
    {
      "id": "custom-comparators",
      "category": "sorting",
      "name": "Custom sort comparators",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Per-column custom sort function: (a, b) => number.",
      "implementation": "Column config sorter option accepts 'string', 'number', 'date', or a custom function.",
      "benefit": "Sort by priority levels, custom formats, or computed values.",
      "components": ["sort-comparators"]
    },
    {
      "id": "web-component",
      "category": "web-component",
      "name": "<stream-grid> custom element",
      "status": "done",
      "tier": "core",
      "milestone": "top-20",
      "description": "Declarative HTML-first grid via custom element. Maps HTML attributes to StreamGrid options.",
      "implementation": "StreamGridElement registers <stream-grid>. Light DOM. Attributes: src, table, page-size, pagination-mode, filter-mode, filter-debounce, sort-mode, template. queueMicrotask batching for attribute changes.",
      "benefit": "Use StreamGrid without writing a single line of JavaScript — just HTML attributes.",
      "components": ["stream-grid-element"]
    },
    {
      "id": "web-component-column",
      "category": "web-component",
      "name": "<stream-grid-column> declarative columns",
      "status": "done",
      "tier": "core",
      "milestone": "top-20",
      "description": "Declarative column configuration via <stream-grid-column> child elements.",
      "implementation": "Passive data carrier with field, label, sortable, sorter, width, filter, and template attributes. Notifies parent on changes.",
      "benefit": "Define columns in HTML — no JavaScript column config array needed.",
      "components": ["stream-grid-column"]
    },
    {
      "id": "dom-config",
      "category": "web-component",
      "name": "Declarative DOM column config",
      "status": "done",
      "tier": "core",
      "milestone": "top-20",
      "description": "Read column definitions from existing <th> elements in the DOM using columns: 'dom'.",
      "implementation": "data-field, data-sg-label, data-sg-sortable, data-sg-sorter, data-sg-width, data-sg-filter attributes on <th> elements.",
      "benefit": "Progressive enhancement — add StreamGrid to an existing HTML table without rewriting it.",
      "components": ["streamgrid"]
    },
    {
      "id": "grid-escape-hatch",
      "category": "web-component",
      "name": "element.grid escape hatch",
      "status": "done",
      "tier": "core",
      "milestone": "top-20",
      "description": "Access the underlying StreamGrid instance from the custom element for programmatic control.",
      "implementation": "element.grid property returns the StreamGrid instance after initialization.",
      "benefit": "Start declarative, drop to JavaScript when you need full control.",
      "components": ["stream-grid-element"]
    },
    {
      "id": "event-system",
      "category": "extensibility",
      "name": "Event system",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Lightweight pub/sub events for row click, cell click, header click, page change, filter change, sort change, and loading states.",
      "implementation": "EventEmitter with on/off/emit. Events: rowClicked, cellClicked, headerClicked, pageChanged, filterChanged, sortChanged, loadingStart, loadingEnd.",
      "benefit": "React to grid interactions without coupling to DOM events.",
      "components": ["event-emitter", "streamgrid"]
    },
    {
      "id": "hook-system",
      "category": "extensibility",
      "name": "WordPress-style hook system",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "addAction/doAction/addFilter/applyFilters with priority ordering for init-time customization.",
      "implementation": "HookManager class. Plugins register hooks during the init lifecycle.",
      "benefit": "Familiar API for WordPress developers. Extensible without subclassing.",
      "components": ["hook-manager"]
    },
    {
      "id": "plugin-system",
      "category": "extensibility",
      "name": "Init-time plugin API",
      "status": "done",
      "tier": "core",
      "milestone": "foundation",
      "description": "Plugins receive the grid instance at init and can register hooks, events, and modify behavior.",
      "implementation": "plugins: [MyPlugin] in grid config. Each plugin is a function(grid) called during construction.",
      "benefit": "First-class extension point — plugins are just functions, no class hierarchy.",
      "components": ["streamgrid", "hook-manager"]
    },
    {
      "id": "export-config",
      "category": "extensibility",
      "name": "Config export/import",
      "status": "done",
      "tier": "core",
      "milestone": "top-20",
      "description": "Serializable snapshot of grid state: columns, filters, pagination, sort. Round-trip safe.",
      "implementation": "exportConfig() returns plain object with no functions or DOM references. JSON.stringify() safe.",
      "benefit": "Save and restore grid state — bookmarkable URLs, user preferences, grid presets.",
      "components": ["streamgrid"]
    },
    {
      "id": "url-sync",
      "category": "planned",
      "name": "URL-sync state",
      "status": "planned",
      "tier": "core",
      "description": "Persist page/filter/sort state in the URL via replaceState for bookmarkable grids.",
      "benefit": "Users can share or bookmark grid views. Browser back button works naturally."
    },
    {
      "id": "live-mode",
      "category": "planned",
      "name": "Live/real-time polling mode",
      "status": "planned",
      "tier": "core",
      "description": "paginationMode: 'live' polls the adapter on an interval, diffs rows, and updates only what changed.",
      "benefit": "Real-time dashboards and monitoring without WebSocket complexity."
    },
    {
      "id": "keyboard-nav",
      "category": "planned",
      "name": "Keyboard navigation",
      "status": "planned",
      "tier": "core",
      "description": "Arrow keys, Enter for activation, / to focus filter, Escape to clear.",
      "benefit": "Accessibility moat — most grid libraries have poor keyboard support."
    },
    {
      "id": "row-grouping",
      "category": "planned",
      "name": "Row grouping",
      "status": "planned",
      "tier": "core",
      "description": "groupBy: 'field' creates collapsible group headers in the table.",
      "benefit": "Organize large datasets visually — group by category, status, or any field."
    },
    {
      "id": "virtual-scrolling",
      "category": "planned",
      "name": "Virtual scrolling",
      "status": "planned",
      "tier": "core",
      "description": "Render only visible rows for massive datasets. Rewrites renderBody() with a viewport approach.",
      "benefit": "Handle 100,000+ rows without DOM performance degradation."
    },
    {
      "id": "frozen-columns",
      "category": "planned",
      "name": "Frozen/pinned columns",
      "status": "planned",
      "tier": "core",
      "description": "pinned: 'left' or 'right' via CSS position: sticky.",
      "benefit": "Keep key columns visible while scrolling wide tables horizontally."
    },
    {
      "id": "auto-type-inference",
      "category": "planned",
      "name": "Zero-config column type inference",
      "status": "planned",
      "tier": "core",
      "description": "Infer column types (string, number, date, boolean) from data and auto-choose filter controls.",
      "benefit": "Smart defaults — range sliders for numbers, date pickers for dates, checkboxes for booleans."
    },
    {
      "id": "diff-render",
      "category": "planned",
      "name": "Diff-aware re-render",
      "status": "planned",
      "tier": "core",
      "description": "Patch only changed rows instead of full innerHTML wipe. Requires rowKey option.",
      "benefit": "Preserves DOM state (inputs, selections) and reduces reflow."
    },
    {
      "id": "migration-adapter",
      "category": "planned",
      "name": "Migration adapter (DataTables/Tabulator)",
      "status": "planned",
      "tier": "core",
      "description": "fromDataTablesConfig(cfg) converts a DataTables configuration to StreamGrid format.",
      "benefit": "Zero-friction migration path from legacy grid libraries."
    },
    {
      "id": "csv-export",
      "category": "planned-plugins",
      "name": "CSV Export plugin",
      "status": "planned",
      "tier": "plugin",
      "description": "Export visible rows to .csv file. Respects current filter and sort state.",
      "benefit": "One-click data download for end users."
    },
    {
      "id": "inline-editing",
      "category": "planned-plugins",
      "name": "Inline Editing plugin",
      "status": "planned",
      "tier": "plugin",
      "description": "Click to edit cell values directly in the table. Emits edit events for persistence.",
      "benefit": "Spreadsheet-like editing without leaving the table."
    },
    {
      "id": "column-resize",
      "category": "planned-plugins",
      "name": "Column Resize plugin",
      "status": "planned",
      "tier": "plugin",
      "description": "Drag column borders to resize. Persists widths via exportConfig().",
      "benefit": "Users control column widths to fit their content."
    },
    {
      "id": "column-visibility",
      "category": "planned-plugins",
      "name": "Column Visibility plugin",
      "status": "planned",
      "tier": "plugin",
      "description": "Toggle column visibility dynamically via a dropdown or API.",
      "benefit": "Users see only the columns they care about."
    },
    {
      "id": "toolbar-component",
      "category": "planned-plugins",
      "name": "<stream-grid-toolbar> component",
      "status": "planned",
      "tier": "plugin",
      "description": "Declarative toolbar with search, export, column visibility, and refresh controls.",
      "benefit": "Common grid UI pattern in a single web component."
    }
  ]
}
;
window.STREAMGRID_DATA.milestones = [
  {
    "id": "foundation",
    "name": "Foundation — Core Grid Engine",
    "status": "completed",
    "completedDate": "2025-04",
    "description": "Loading state (shimmer), empty state, column render callbacks, column sorting with multi-column support. Four foundational gaps closed — the threshold between prototype and usable library."
  },
  {
    "id": "top-20",
    "name": "Top-20 Improvements (6 of 20)",
    "status": "completed",
    "completedDate": "2025-06",
    "description": "Web Component API (<stream-grid>/<stream-grid-column>), CacheAdapter with LRU + dedup, declarative DOM config (columns: 'dom'), exportConfig() for state serialization, multi-column sorting, and column render callbacks."
  },
  {
    "id": "impression",
    "name": "Impression Maximizer (9 wins)",
    "status": "completed",
    "completedDate": "2025-06",
    "description": "All quick and medium wins shipped: filterEngine unit tests, dead mock branch fix, Adapters.md fix, debug comment cleanup, package.json metadata, README badges + module map, auto-switching behavioral test, GitHub Pages demos, ARCHITECTURE.md."
  },
  {
    "id": "template",
    "name": "Declarative Template Rendering",
    "status": "completed",
    "completedDate": "2025-07",
    "description": "{{value}} and {{row.field}} interpolation in <template> elements with XSS-safe escapeHtml() protection. Works on both <stream-grid> and <stream-grid-column> elements."
  },
  {
    "id": "server-pagination",
    "name": "Server-Side Pagination & Sorting",
    "status": "completed",
    "completedDate": "2025-05",
    "description": "Full server-side support for pagination, filtering, and sorting via RestApiAdapter query builders. Auto-switching between client and server modes based on configurable thresholds."
  },
  {
    "id": "304-tests",
    "name": "304 Tests Milestone",
    "status": "completed",
    "completedDate": "2025-07",
    "description": "253 unit tests (Mocha + Chai + JSDOM + Sinon) and 51 E2E tests (Playwright) covering all core features, adapters, events, hooks, plugins, and web component behavior."
  }
]
;
window.STREAMGRID_DATA.pricing = {
  "notes": "StreamGrid ships everything as MIT-licensed open source. Features are organised into Core (always available), Plugin (opt-in extensions), and Adapter (data-source connectors) tiers.",
  "tiers": [
    {
      "id": "core",
      "name": "Core",
      "description": "Included in the base StreamGrid library. Zero-dependency, always available.",
      "color": "#10b981"
    },
    {
      "id": "plugin",
      "name": "Plugin",
      "description": "Opt-in extensions loaded via the plugin system. Keep core lean, add power as needed.",
      "color": "#8b5cf6"
    },
    {
      "id": "adapter",
      "name": "Adapter",
      "description": "Data source adapters that extend BaseDataAdapter. Composable via CacheAdapter.",
      "color": "#3b82f6"
    }
  ],
  "allocation": {
    "core": [
      { "featureId": "table-rendering", "notes": "Fundamental — core value" },
      { "featureId": "loading-state", "notes": "Foundation requirement" },
      { "featureId": "empty-state", "notes": "Foundation requirement" },
      { "featureId": "render-callbacks", "notes": "Essential customization" },
      { "featureId": "template-rendering", "notes": "HTML-first differentiator" },
      { "featureId": "dataset", "notes": "Internal data layer" },
      { "featureId": "client-pagination", "notes": "Core UX — all 3 modes" },
      { "featureId": "server-pagination", "notes": "Core scalability story" },
      { "featureId": "infinite-scroll", "notes": "Core UX pattern" },
      { "featureId": "client-filter", "notes": "Core interactivity" },
      { "featureId": "server-filter", "notes": "Core scalability story" },
      { "featureId": "auto-switch-filter", "notes": "Differentiator — unique to StreamGrid" },
      { "featureId": "client-sort", "notes": "Core interactivity" },
      { "featureId": "multi-column-sort", "notes": "Power user essential" },
      { "featureId": "server-sort", "notes": "Core scalability story" },
      { "featureId": "custom-comparators", "notes": "Customization hook" },
      { "featureId": "web-component", "notes": "Differentiator — unique to StreamGrid" },
      { "featureId": "web-component-column", "notes": "Declarative API pair" },
      { "featureId": "dom-config", "notes": "Progressive enhancement" },
      { "featureId": "grid-escape-hatch", "notes": "Declarative → programmatic bridge" },
      { "featureId": "event-system", "notes": "Core lifecycle" },
      { "featureId": "hook-system", "notes": "Extensibility backbone" },
      { "featureId": "plugin-system", "notes": "Extension point" },
      { "featureId": "export-config", "notes": "State management" },
      { "featureId": "url-sync", "notes": "Planned — bookmarkable state" },
      { "featureId": "live-mode", "notes": "Planned — real-time polling" },
      { "featureId": "keyboard-nav", "notes": "Planned — accessibility" },
      { "featureId": "row-grouping", "notes": "Planned — may be core or plugin" },
      { "featureId": "virtual-scrolling", "notes": "Planned — performance critical" },
      { "featureId": "frozen-columns", "notes": "Planned — CSS sticky approach" },
      { "featureId": "auto-type-inference", "notes": "Planned — smart defaults" },
      { "featureId": "diff-render", "notes": "Planned — performance optimization" }
    ],
    "plugin": [
      { "featureId": "csv-export", "notes": "Independent feature, small surface area" },
      { "featureId": "inline-editing", "notes": "Keeps core lean — spreadsheet-like editing" },
      { "featureId": "column-resize", "notes": "Optional layout feature" },
      { "featureId": "column-visibility", "notes": "Optional UI control" },
      { "featureId": "toolbar-component", "notes": "Convenience component — search/export/columns/refresh" }
    ],
    "adapter": [
      { "featureId": "rest-adapter", "notes": "Primary built-in adapter" },
      { "featureId": "cache-adapter", "notes": "Decorator — wraps any adapter" },
      { "featureId": "custom-adapter", "notes": "User-implemented via BaseDataAdapter" }
    ]
  },
  "competitorComparison": {
    "description": "How competitors split features between free and paid tiers",
    "competitors": [
      {
        "name": "AG-Grid",
        "model": "Community (MIT) + Enterprise (paid per-developer)",
        "freeIncludes": "Sorting, filtering, pagination, cell rendering, theming, accessibility, keyboard nav, virtualization",
        "paidOnly": "Server-side row model, Excel export, pivot tables, range selection, integrated charts, master/detail, row grouping, clipboard, tool panels, context menu",
        "lesson": "AG-Grid gates server-side features and advanced UI behind Enterprise. StreamGrid includes server-side capabilities in core — our differentiator."
      },
      {
        "name": "Tabulator",
        "model": "Fully free (MIT)",
        "freeIncludes": "Everything — sorting, filtering, pagination, editing, grouping, tree data, clipboard, virtual rendering, spreadsheet mode, data export",
        "paidOnly": "Nothing — all features are MIT",
        "lesson": "Tabulator proves a full-featured grid can be fully open source. StreamGrid follows this model — all core features are free, plugins add optional power."
      },
      {
        "name": "DataTables",
        "model": "Core (MIT) + Editor (paid) + Extensions (free)",
        "freeIncludes": "Core table, Ajax, pagination, search, sorting, events, i18n, plus free extensions (RowGroup, Scroller, FixedColumns, Buttons, KeyTable, Responsive)",
        "paidOnly": "Editor extension ($119–$1,159) for inline editing",
        "lesson": "DataTables keeps the core and most extensions free, only charging for the complex editing product. StreamGrid's plugin approach is similar — editing would be an opt-in plugin."
      },
      {
        "name": "Grid.js",
        "model": "Fully free (MIT)",
        "freeIncludes": "Core table, search, sorting, pagination, custom rendering, server data, plugins",
        "paidOnly": "Nothing — lightweight and fully free",
        "lesson": "Grid.js is the closest in philosophy to StreamGrid: lightweight, zero-dep, MIT. But it lacks adapters, hooks, web components, and server-side capabilities."
      },
      {
        "name": "Handsontable",
        "model": "Hobby (free non-commercial) + Commercial ($999+/yr per developer)",
        "freeIncludes": "Full features but only for personal/non-commercial use",
        "paidOnly": "Any commercial use requires a license ($999+ Standard, $1299+ Priority, custom Enterprise)",
        "lesson": "Handsontable charges for commercial use of the same features. StreamGrid is MIT for all uses — commercial included."
      }
    ]
  }
}
;
window.STREAMGRID_DATA.competitive = {
  "legend": {
    "symbols": {
      "✓": "Supported",
      "△": "Partial / indirect support",
      "✕": "Not supported"
    },
    "sgStatus": {
      "done": "Implemented and tested",
      "partial": "Partially implemented",
      "planned": "On the roadmap",
      "deferred": "Considered but deferred",
      "not-yet": "Not yet addressed"
    },
    "tierKeys": {
      "free": "Open-source / free-tier competitors",
      "paid": "Commercial / enterprise competitors"
    }
  },
  "competitors": {
    "free": [
      {
        "id": "ag-community",
        "name": "AG-Grid Community",
        "fullName": "AG-Grid Community (MIT)"
      },
      {
        "id": "tabulator",
        "name": "Tabulator",
        "fullName": "Tabulator (MIT)"
      },
      {
        "id": "gridjs",
        "name": "Grid.js",
        "fullName": "Grid.js (MIT)"
      },
      {
        "id": "datatables",
        "name": "DataTables",
        "fullName": "DataTables (MIT)"
      }
    ],
    "paid": [
      {
        "id": "ag-enterprise",
        "name": "AG-Grid Enterprise",
        "fullName": "AG-Grid Enterprise (Commercial)"
      },
      {
        "id": "handsontable",
        "name": "Handsontable",
        "fullName": "Handsontable (Commercial)"
      }
    ]
  },
  "pricing": [
    {
      "label": "License model",
      "ag-enterprise": "Per-developer, perpetual + 1yr support",
      "handsontable": "Per-developer, annual subscription"
    },
    {
      "label": "Starting price",
      "ag-enterprise": "$999+/dev",
      "handsontable": "$999+/dev"
    },
    {
      "label": "Free tier available",
      "ag-enterprise": { "symbol": "✓" },
      "handsontable": { "symbol": "△" }
    },
    {
      "label": "Open source (MIT)",
      "ag-enterprise": { "symbol": "✕" },
      "handsontable": { "symbol": "✕" }
    },
    {
      "label": "Zero dependencies",
      "ag-enterprise": { "symbol": "✕" },
      "handsontable": { "symbol": "✕" }
    },
    {
      "label": "Framework-free vanilla JS",
      "ag-enterprise": { "symbol": "✓" },
      "handsontable": { "symbol": "✓" }
    }
  ],
  "differentiators": {
    "title": "StreamGrid Exclusive Capabilities",
    "description": "Features where StreamGrid provides capabilities no competitor offers — verified against AG-Grid, Tabulator, DataTables, Grid.js and Handsontable."
  },
  "categories": [
    {
      "id": "data-loading",
      "name": "Data Loading & Adapters",
      "features": [
        {
          "feature": "Zero-dependency design",
          "free": {
            "ag-community": { "symbol": "✕", "detail": "500KB+ core bundle" },
            "tabulator": { "symbol": "✓", "detail": "No dependencies since v6" },
            "gridjs": { "symbol": "✓", "detail": "Zero-dep, ~12KB gzipped" },
            "datatables": { "symbol": "✕", "detail": "Requires jQuery" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✕", "detail": "Even larger than Community" },
            "handsontable": { "symbol": "✕", "detail": "Includes HyperFormula and other deps" }
          },
          "sg": {
            "status": "done",
            "sources": ["all"],
            "note": "Zero runtime dependencies. Pure ES6+ modules. No build step required."
          }
        },
        {
          "feature": "REST API adapter",
          "free": {
            "ag-community": { "symbol": "✕", "detail": "No built-in adapter pattern" },
            "tabulator": { "symbol": "✓", "detail": "ajaxURL + ajaxConfig for remote data" },
            "gridjs": { "symbol": "✓", "detail": "server property with url + then callback" },
            "datatables": { "symbol": "✓", "detail": "ajax option for remote data" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓", "detail": "Server-side row model" },
            "handsontable": { "symbol": "✕", "detail": "Manual data binding only" }
          },
          "sg": {
            "status": "done",
            "sources": ["all"],
            "note": "RestApiAdapter with configurable endpoints, custom headers, query builders for server-side pagination/filtering/sorting."
          }
        },
        {
          "feature": "Pluggable adapter architecture",
          "free": {
            "ag-community": { "symbol": "✕" },
            "tabulator": { "symbol": "△", "detail": "ajaxRequestFunc override, not a full adapter pattern" },
            "gridjs": { "symbol": "△", "detail": "Custom data function, not a formal adapter" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "△", "detail": "Datasource interface for SSRM" },
            "handsontable": { "symbol": "✕" }
          },
          "differentiator": {
            "detail": "StreamGrid's BaseDataAdapter defines a formal interface (getRows, getColumns, insertRow, updateRow, deleteRow) that any custom adapter can implement. CacheAdapter demonstrates the decorator pattern — wrap any adapter with LRU caching and in-flight deduplication. No other grid library has a composable adapter architecture.",
            "competitors": "Tabulator and Grid.js allow custom data functions, but don't provide a formal interface or adapter composition. AG-Grid Enterprise has a datasource interface but only for server-side row model (Enterprise feature)."
          },
          "sg": {
            "status": "done",
            "sources": ["all"],
            "note": "BaseDataAdapter abstract class. Extend for any data source: REST, GraphQL, Firebase, localStorage, static arrays."
          }
        },
        {
          "feature": "Adapter composition (CacheAdapter)",
          "free": {
            "ag-community": { "symbol": "✕" },
            "tabulator": { "symbol": "✕" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✕" },
            "handsontable": { "symbol": "✕" }
          },
          "differentiator": {
            "detail": "CacheAdapter wraps any adapter with LRU caching, configurable TTL per table, and in-flight request deduplication. Concurrent identical requests return the same promise. Cache auto-invalidates on write operations. This decorator pattern is unique to StreamGrid.",
            "competitors": "No competitor offers adapter composition. Caching in other grids is either non-existent or hard-coded into the grid's internal data pipeline."
          },
          "sg": {
            "status": "done",
            "sources": ["all"],
            "note": "CacheAdapter decorator with LRU, TTL, per-table overrides, in-flight dedup, and auto-invalidation on writes."
          }
        }
      ]
    },
    {
      "id": "pagination",
      "name": "Pagination",
      "features": [
        {
          "feature": "Client-side pagination",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "✓" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Three modes: pages (prev/next), numbers (clickable buttons), infinite scroll." }
        },
        {
          "feature": "Numbered page buttons",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "✓" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Sliding window page buttons via getPageWindow()." }
        },
        {
          "feature": "Infinite scroll",
          "free": {
            "ag-community": { "symbol": "✓", "detail": "Row model based" },
            "tabulator": { "symbol": "✓", "detail": "Progressive loading" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "△", "detail": "Via Scroller extension" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✕" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "paginationMode: 'infinite'. Works with both client-side and server-side data." }
        },
        {
          "feature": "Server-side pagination",
          "free": {
            "ag-community": { "symbol": "✕", "detail": "SSRM is Enterprise only" },
            "tabulator": { "symbol": "✓", "detail": "paginationMode: 'remote'" },
            "gridjs": { "symbol": "△", "detail": "Via custom server callback" },
            "datatables": { "symbol": "✓", "detail": "serverSide: true" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓", "detail": "Server-Side Row Model" },
            "handsontable": { "symbol": "✕", "detail": "No built-in server-side pagination" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "RestApiAdapter sends _page/_limit params. Grid reads X-Total-Count header for page calculations." }
        }
      ]
    },
    {
      "id": "filtering",
      "name": "Filtering",
      "features": [
        {
          "feature": "Client-side text filtering",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "✓" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Debounced text input filtering across multiple fields. Case-insensitive substring matching." }
        },
        {
          "feature": "Server-side filtering",
          "free": {
            "ag-community": { "symbol": "✕", "detail": "Enterprise only" },
            "tabulator": { "symbol": "✓", "detail": "filterMode: 'remote'" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✓", "detail": "serverSide: true" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✕" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "filterMode: 'server'. Query builder serializes filter state to URL params." }
        },
        {
          "feature": "Auto-switching filter mode",
          "free": {
            "ag-community": { "symbol": "✕" },
            "tabulator": { "symbol": "✕" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✕" },
            "handsontable": { "symbol": "✕" }
          },
          "differentiator": {
            "detail": "StreamGrid automatically switches between client-side and server-side filtering based on a configurable row threshold (clientFilterThreshold). Small datasets get instant client-side filtering; large datasets are delegated to the server. No other grid library does this.",
            "competitors": "All competitors require manual configuration of filter mode. You must decide upfront whether to filter client-side or server-side."
          },
          "sg": { "status": "done", "sources": ["all"], "note": "filterMode: 'auto' (default). Switches at clientFilterThreshold." }
        },
        {
          "feature": "Debounced filter input",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓", "detail": "headerFilterLiveFilterDelay: 300ms" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "△", "detail": "Manual debounce needed" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Configurable debounce delay via filterDebounce option." }
        }
      ]
    },
    {
      "id": "sorting",
      "name": "Sorting",
      "features": [
        {
          "feature": "Client-side sorting",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "✓" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Click column headers. Three-click cycle: asc → desc → clear." }
        },
        {
          "feature": "Multi-column sorting",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "△", "detail": "Basic multi-sort only" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Shift-click to add secondary sort levels. Visual priority badges on headers." }
        },
        {
          "feature": "Server-side sorting",
          "free": {
            "ag-community": { "symbol": "✕", "detail": "Enterprise only" },
            "tabulator": { "symbol": "✓", "detail": "sortMode: 'remote'" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✓", "detail": "serverSide: true" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✕" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "sortMode: 'server' or auto-switching via clientSortThreshold." }
        },
        {
          "feature": "Custom sort comparators",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "✓" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Per-column sorter: 'string', 'number', 'date', or custom function." }
        }
      ]
    },
    {
      "id": "rendering",
      "name": "Rendering & Cell Content",
      "features": [
        {
          "feature": "Custom cell rendering",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "✓" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "render(value, row, context) returns string (innerHTML), Node, or null (textContent)." }
        },
        {
          "feature": "Declarative template rendering",
          "free": {
            "ag-community": { "symbol": "✕" },
            "tabulator": { "symbol": "✕" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✕" },
            "handsontable": { "symbol": "✕" }
          },
          "differentiator": {
            "detail": "StreamGrid supports {{value}} and {{row.field}} interpolation in HTML <template> elements, with automatic XSS protection via escapeHtml(). HTML-first developers can customize cell rendering without writing a single line of JavaScript. No other grid library offers this.",
            "competitors": "All competitors require JavaScript callback functions for custom cell content. None support declarative HTML template interpolation."
          },
          "sg": { "status": "done", "sources": ["all"], "note": "{{value}}/{{row.field}} interpolation in <template> elements. XSS-safe escapeHtml()." }
        },
        {
          "feature": "Loading shimmer state",
          "free": {
            "ag-community": { "symbol": "△", "detail": "Loading overlay, no shimmer" },
            "tabulator": { "symbol": "△", "detail": "Loading overlay element" },
            "gridjs": { "symbol": "△", "detail": "Loading indicator" },
            "datatables": { "symbol": "△", "detail": "'Processing...' text" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "△", "detail": "Loading overlay" },
            "handsontable": { "symbol": "△", "detail": "Loading indicator" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Animated shimmer rows with staggered CSS delays. Zero JS animation — pure CSS @keyframes." }
        },
        {
          "feature": "Empty state display",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "✓" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "Configurable emptyText. Distinguishes empty dataset from filtered-no-results." }
        }
      ]
    },
    {
      "id": "web-component",
      "name": "Web Component & Declarative API",
      "features": [
        {
          "feature": "Web Component API",
          "free": {
            "ag-community": { "symbol": "✕" },
            "tabulator": { "symbol": "✕" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✕" },
            "handsontable": { "symbol": "✕" }
          },
          "differentiator": {
            "detail": "StreamGrid is the only data grid library with a native Web Component API. <stream-grid> and <stream-grid-column> custom elements let you create fully functional data tables using only HTML attributes — no JavaScript required. Light DOM rendering (no Shadow DOM) means standard CSS works without piercing.",
            "competitors": "AG-Grid, Tabulator, DataTables, Grid.js and Handsontable all require JavaScript initialization. None provide custom elements."
          },
          "sg": { "status": "done", "sources": ["all"], "note": "<stream-grid> and <stream-grid-column> custom elements. Attribute-driven configuration." }
        },
        {
          "feature": "Declarative DOM column config",
          "free": {
            "ag-community": { "symbol": "✕" },
            "tabulator": { "symbol": "✕" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "△", "detail": "Reads existing HTML tables" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✕" },
            "handsontable": { "symbol": "✕" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "columns: 'dom' reads <th data-field> attributes. Progressive enhancement for existing tables." }
        },
        {
          "feature": "Config export/import (state serialization)",
          "free": {
            "ag-community": { "symbol": "✓", "detail": "getState/setState API" },
            "tabulator": { "symbol": "✓", "detail": "Persistence module" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✕" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "exportConfig() returns JSON-safe snapshot. new StreamGrid(el, {...base, ...snapshot}) reconstructs identical state." }
        }
      ]
    },
    {
      "id": "extensibility",
      "name": "Extensibility",
      "features": [
        {
          "feature": "Plugin system",
          "free": {
            "ag-community": { "symbol": "△", "detail": "Module-based, not plugin API" },
            "tabulator": { "symbol": "✓", "detail": "Module system" },
            "gridjs": { "symbol": "✓", "detail": "Plugin API" },
            "datatables": { "symbol": "✓", "detail": "Extension system" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓", "detail": "Modules + Enterprise modules" },
            "handsontable": { "symbol": "✓", "detail": "Custom plugins" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "plugins: [MyPlugin]. Each plugin is a function(grid) called during init, with access to hooks and events." }
        },
        {
          "feature": "Hook system (actions + filters)",
          "free": {
            "ag-community": { "symbol": "✕" },
            "tabulator": { "symbol": "✕" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✕" },
            "handsontable": { "symbol": "✓", "detail": "Events and hooks system" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "WordPress-style addAction/doAction/addFilter/applyFilters with priority ordering." }
        },
        {
          "feature": "Event system",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✓" },
            "datatables": { "symbol": "✓" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "done", "sources": ["all"], "note": "EventEmitter with on/off/emit. Events for row/cell/header click, page/filter/sort change, loading." }
        }
      ]
    },
    {
      "id": "advanced",
      "name": "Advanced Features",
      "features": [
        {
          "feature": "Virtual scrolling",
          "free": {
            "ag-community": { "symbol": "✓", "detail": "Column and row virtualization by default" },
            "tabulator": { "symbol": "✓", "detail": "Virtual rendering by default" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "△", "detail": "Via Scroller extension" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓", "detail": "Row and column virtualization" }
          },
          "sg": { "status": "planned", "sources": [], "note": "On roadmap — render only visible rows for massive datasets." }
        },
        {
          "feature": "Row grouping",
          "free": {
            "ag-community": { "symbol": "✕", "detail": "Enterprise only" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "△", "detail": "Via RowGroup extension" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "△", "detail": "Via parent-child rows" }
          },
          "sg": { "status": "planned", "sources": [], "note": "On roadmap — groupBy: 'field' with collapsible group headers." }
        },
        {
          "feature": "Inline editing",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕", "detail": "Via Editor extension (paid)" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓", "detail": "Core feature — spreadsheet-like editing" }
          },
          "sg": { "status": "planned", "sources": [], "note": "Planned as opt-in plugin." }
        },
        {
          "feature": "Column resize",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "planned", "sources": [], "note": "Planned as opt-in plugin." }
        },
        {
          "feature": "CSV/Excel export",
          "free": {
            "ag-community": { "symbol": "△", "detail": "CSV only" },
            "tabulator": { "symbol": "✓", "detail": "CSV, XLSX, PDF, JSON" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✓", "detail": "Via Buttons extension" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓", "detail": "Excel export with styles" },
            "handsontable": { "symbol": "✓", "detail": "CSV export" }
          },
          "sg": { "status": "planned", "sources": [], "note": "Planned as opt-in plugin — CSV export of visible rows." }
        },
        {
          "feature": "Column visibility toggle",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✓", "detail": "Via ColVis extension" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓", "detail": "Via Tool Panel" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "planned", "sources": [], "note": "Planned as opt-in plugin." }
        },
        {
          "feature": "Tree data / hierarchical rows",
          "free": {
            "ag-community": { "symbol": "✕", "detail": "Enterprise only" },
            "tabulator": { "symbol": "✓", "detail": "dataTree option" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✕" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓", "detail": "Row parent-child" }
          },
          "sg": { "status": "planned", "sources": [], "note": "On roadmap — expand/collapse parent-child hierarchical rows." }
        },
        {
          "feature": "Frozen/pinned columns",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓", "detail": "Via frozen columns" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "✓", "detail": "Via FixedColumns extension" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "planned", "sources": [], "note": "On roadmap — pinned: 'left'|'right' via CSS position: sticky." }
        },
        {
          "feature": "Keyboard navigation",
          "free": {
            "ag-community": { "symbol": "✓" },
            "tabulator": { "symbol": "✓" },
            "gridjs": { "symbol": "✕" },
            "datatables": { "symbol": "△", "detail": "Via KeyTable extension" }
          },
          "paid": {
            "ag-enterprise": { "symbol": "✓" },
            "handsontable": { "symbol": "✓" }
          },
          "sg": { "status": "planned", "sources": [], "note": "On roadmap — arrow keys, Enter, / to focus filter, Escape to clear." }
        }
      ]
    }
  ]
}
;
window.STREAMGRID_DATA.capabilities = {
  "matrix": [
    {
      "category": "Data Loading",
      "capabilities": [
        { "name": "REST API data fetching", "status": "supported", "sources": ["RestApiAdapter"], "notes": "Configurable endpoints, custom headers, query builders for pagination/filtering/sorting" },
        { "name": "Static array / inline data", "status": "supported", "sources": ["StreamGrid"], "notes": "Pass data directly via config or adapter" },
        { "name": "LRU caching with TTL", "status": "supported", "sources": ["CacheAdapter"], "notes": "Per-table TTL overrides, in-flight request deduplication, auto-invalidation on writes" },
        { "name": "Custom data adapters", "status": "supported", "sources": ["BaseDataAdapter"], "notes": "Extend BaseDataAdapter for any data source (Firebase, GraphQL, localStorage)" },
        { "name": "GraphQL adapter", "status": "planned", "sources": [], "notes": "Planned additional adapter" },
        { "name": "Firebase adapter", "status": "planned", "sources": [], "notes": "Planned additional adapter" },
        { "name": "CSV API adapter", "status": "planned", "sources": [], "notes": "Planned additional adapter for CSV HTTP endpoints" }
      ]
    },
    {
      "category": "Pagination",
      "capabilities": [
        { "name": "Prev/next page navigation", "status": "supported", "sources": ["StreamGrid", "paginator"], "notes": "paginationMode: 'pages'" },
        { "name": "Numbered page buttons", "status": "supported", "sources": ["StreamGrid", "paginationHelpers"], "notes": "paginationMode: 'numbers'. Sliding window via getPageWindow()" },
        { "name": "Infinite scroll", "status": "supported", "sources": ["StreamGrid", "paginator"], "notes": "paginationMode: 'infinite'. loadMoreRows() public API" },
        { "name": "Server-side pagination", "status": "supported", "sources": ["RestApiAdapter", "queryBuilder"], "notes": "_page/_limit query params, X-Total-Count header" },
        { "name": "Configurable page size", "status": "supported", "sources": ["StreamGrid"], "notes": "pageSize option" }
      ]
    },
    {
      "category": "Filtering",
      "capabilities": [
        { "name": "Client-side text filtering", "status": "supported", "sources": ["filterEngine"], "notes": "Multi-field, case-insensitive substring matching" },
        { "name": "Server-side filtering", "status": "supported", "sources": ["RestApiAdapter", "queryBuilder"], "notes": "filterMode: 'server'" },
        { "name": "Auto-switching filter mode", "status": "supported", "sources": ["StreamGrid"], "notes": "filterMode: 'auto'. Switches at clientFilterThreshold" },
        { "name": "Debounced filter input", "status": "supported", "sources": ["StreamGrid"], "notes": "Configurable delay via filterDebounce" },
        { "name": "Multi-field filtering", "status": "planned", "sources": [], "notes": "Independent per-column filter logic" },
        { "name": "Advanced filter operators", "status": "planned", "sources": [], "notes": "equals, starts-with, range, etc." }
      ]
    },
    {
      "category": "Sorting",
      "capabilities": [
        { "name": "Click-to-sort column headers", "status": "supported", "sources": ["StreamGrid"], "notes": "Three-click cycle: asc → desc → clear" },
        { "name": "Multi-column sort (shift-click)", "status": "supported", "sources": ["StreamGrid", "sortComparators"], "notes": "sortStack with visual priority badges" },
        { "name": "Built-in comparators", "status": "supported", "sources": ["sortComparators"], "notes": "string, number, date comparators" },
        { "name": "Custom sort functions", "status": "supported", "sources": ["sortComparators"], "notes": "Per-column custom (a, b) => number" },
        { "name": "Server-side sorting", "status": "supported", "sources": ["RestApiAdapter", "queryBuilder"], "notes": "sortMode: 'server' or auto-switching via clientSortThreshold" },
        { "name": "Auto-switching sort mode", "status": "supported", "sources": ["StreamGrid"], "notes": "sortMode: 'auto'" }
      ]
    },
    {
      "category": "Rendering",
      "capabilities": [
        { "name": "HTML table rendering from config", "status": "supported", "sources": ["StreamGrid"], "notes": "Builds thead, tbody, pagination, filter UI from config object" },
        { "name": "Column render callbacks", "status": "supported", "sources": ["StreamGrid"], "notes": "render(value, row, context) returns string, Node, or null" },
        { "name": "Template interpolation", "status": "supported", "sources": ["StreamGridElement", "StreamGridColumn"], "notes": "{{value}}/{{row.field}} in <template> elements with XSS protection" },
        { "name": "Loading shimmer animation", "status": "supported", "sources": ["StreamGrid", "streamgrid.css"], "notes": "Staggered CSS @keyframes shimmer. showLoading() API" },
        { "name": "Empty state with configurable text", "status": "supported", "sources": ["StreamGrid"], "notes": "emptyText option. Two modes: empty dataset vs. filtered-no-results" },
        { "name": "Virtual scrolling", "status": "planned", "sources": [], "notes": "Render only visible rows for massive datasets" },
        { "name": "Diff-aware re-render", "status": "planned", "sources": [], "notes": "Patch changed rows instead of full innerHTML wipe" }
      ]
    },
    {
      "category": "Web Component",
      "capabilities": [
        { "name": "<stream-grid> custom element", "status": "supported", "sources": ["StreamGridElement"], "notes": "Attribute-driven: src, table, page-size, pagination-mode, filter-mode, sort-mode, template" },
        { "name": "<stream-grid-column> declarative columns", "status": "supported", "sources": ["StreamGridColumn"], "notes": "field, label, sortable, sorter, width, filter, template attributes" },
        { "name": "Light DOM rendering", "status": "supported", "sources": ["StreamGridElement"], "notes": "No Shadow DOM — standard CSS works. sg- namespaced classes" },
        { "name": "element.grid escape hatch", "status": "supported", "sources": ["StreamGridElement"], "notes": "Access the underlying StreamGrid instance for programmatic control" },
        { "name": "Child-notifies-parent reinit", "status": "supported", "sources": ["StreamGridColumn"], "notes": "Attribute changes on <stream-grid-column> trigger parent reinit via queueMicrotask" },
        { "name": "Declarative DOM column config", "status": "supported", "sources": ["StreamGrid"], "notes": "columns: 'dom' reads <th data-field> from existing markup" }
      ]
    },
    {
      "category": "Extensibility",
      "capabilities": [
        { "name": "Init-time plugin system", "status": "supported", "sources": ["StreamGrid"], "notes": "plugins: [fn]. Each plugin receives grid instance at construction" },
        { "name": "WordPress-style hooks", "status": "supported", "sources": ["HookManager"], "notes": "addAction/doAction/addFilter/applyFilters with priority ordering" },
        { "name": "Event emitter", "status": "supported", "sources": ["EventEmitter"], "notes": "on/off/emit for lifecycle events" },
        { "name": "Config export/import", "status": "supported", "sources": ["StreamGrid"], "notes": "exportConfig() returns JSON-safe snapshot for state persistence" },
        { "name": "Custom query builders", "status": "supported", "sources": ["queryBuilder"], "notes": "Override buildFilterParams/buildPaginationParams/buildSortParams" }
      ]
    },
    {
      "category": "Intentionally Out of Scope",
      "capabilities": [
        { "name": "TypeScript / .d.ts files", "status": "not-supported", "sources": [], "notes": "JSDoc is thorough. A build step breaks the zero-dep story" },
        { "name": "Framework bindings (React, Vue, Angular)", "status": "not-supported", "sources": [], "notes": "Web Component API works in any framework. No wrapper needed" },
        { "name": "CSS-in-JS / theming engine", "status": "not-supported", "sources": [], "notes": "Uses CSS custom properties. Bring your own theme" },
        { "name": "Charting / visualization", "status": "not-supported", "sources": [], "notes": "Data table only. Use a charting library alongside" },
        { "name": "ESLint / Prettier config", "status": "not-supported", "sources": [], "notes": "Tooling noise. Focus on features" }
      ]
    }
  ]
}
;
