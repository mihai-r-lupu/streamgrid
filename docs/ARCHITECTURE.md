# Architecture

This document explains the key design decisions behind StreamGrid: why specific patterns were chosen, what trade-offs they involve, and what was deliberately left out.

---

## Why StreamGrid Exists

Most data grid libraries are tightly coupled to a framework (React, Vue, Angular) or ship as heavyweight bundles with dozens of transitive dependencies. StreamGrid is a vanilla JavaScript data grid. It loads as a single ES module with zero runtime dependencies and no build step — `<script type="module">` and a `<div>`.

---

## The Adapter Pattern

Data fetching is abstracted behind `BaseDataAdapter`, an abstract base class whose five methods (`getColumns`, `fetchData`, `insertRow`, `updateRow`, `deleteRow`) define the contract every data source must implement.

You can swap REST for GraphQL, IndexedDB, static arrays, or WebSocket feeds without changing grid code. It also makes the grid easy to test: every unit test uses an inline `MemoryAdapter` that returns a hardcoded array — no network, no mocking frameworks, no flaky fixtures.

The built-in `RestApiAdapter` serialises filter, pagination, and sort state into URL query parameters via `queryBuilder.js`, then delegates to the native `fetch` API.

---

## Auto-Switching Filter Mode

StreamGrid's filtering system faces a fundamental trade-off:

**Client-side filtering** is instant for small datasets — the data is already in memory, and JavaScript can scan thousands of rows in single-digit milliseconds. But at 50,000+ rows, serialising that much JSON into the browser, holding it in memory, and scanning it on every keystroke becomes a problem.

**Server-side filtering** avoids the payload problem by sending only the matching subset over the network. But for a 20-row dataset, each keystroke now incurs a network round-trip that is visibly slower than filtering locally.

`auto` mode compares the loaded row count against a configurable `clientFilterThreshold` (default: 1,000). Below the threshold, filtering runs entirely in memory via the pure `filterEngine.js` function. Above it, the grid re-invokes the adapter's `fetchData()` with filter parameters, delegating the work to the server. The decision happens at filter time, not init time, so a grid that starts small and grows (e.g., after a bulk import) switches transparently.

---

## Hooks vs Events

StreamGrid exposes both a hook system and an event emitter. They serve different purposes:

**Hooks** (`addFilter` / `addAction`) transform data in the pipeline — they change behaviour. A filter hook receives a value and returns a modified version; an action hook fires side effects at a specific point in the lifecycle. Multiple callbacks chain in registration order. This follows the WordPress `add_filter` / `add_action` mental model.

**Events** (`on` / `off` / `emit`) notify observers after something has already happened. They don't change the grid's behaviour — they report on it. Events are the right tool for logging, analytics, or updating external UI in response to grid state changes.

Both are needed. Hooks let plugins modify the grid's internal pipeline; events let consumers react to the result.

---

## What Was Deliberately NOT Built

- **No bundler or build step.** A zero-dependency library should not require build tooling to consume. Every source file is a standard ES module that works directly in modern browsers and Node.js.

- **No TypeScript.** JSDoc annotations on the constructor, every public method, and the base adapter class provide equivalent type information without requiring a compilation step. This is a deliberate trade-off: simpler contribution and consumption at the cost of IDE inference being slightly less precise.

- **No sorting UI.** ~~The adapter pattern means consumers can pass pre-sorted data from the server.~~ *Update:* StreamGrid now includes a full sorting UI. Column headers are clickable (click to cycle asc → desc → clear, Shift+click for multi-column stacking). Sort mode follows the same `'auto'` / `'client'` / `'server'` pattern as filtering, with a configurable `clientSortThreshold`. Built-in `sorter` types (`'string'`, `'number'`, `'date'`) cover common cases; a custom `(a, b) => number` comparator covers the rest.

- **No virtual scrolling.** Pagination and infinite scroll cover the same performance use case more simply. Virtual scrolling adds DOM recycling complexity that is only justified at 100K+ row counts — a tier that should use server-side pagination anyway.

---

## CacheAdapter — Transparent LRU Caching

`CacheAdapter` is a decorator that wraps any adapter implementing the `BaseDataAdapter` contract. It adds an LRU cache with configurable TTL and max entries, in-flight request deduplication, and automatic cache invalidation on writes (`insertRow`, `updateRow`, `deleteRow`).

The design follows the Decorator Pattern: `CacheAdapter` implements the same five-method interface, so the grid — and any code that depends on the adapter contract — sees no difference. Caching is a cross-cutting concern layered on top, not baked into the adapter or the grid.

Cache keys are derived from the table name and the full options object (serialised via `JSON.stringify`), making each unique combination of pagination, filter, and sort parameters a separate cache entry.

---

## Column Render Callbacks

Each column definition accepts an optional `render(value, row, context)` function that controls cell content. The callback can return a string (set as `innerHTML`), a DOM node (appended via `appendChild`), or `null` to fall back to plain text.

The `html` tagged template literal (exported from `src/utils/html.js`) escapes all interpolated values, preventing XSS when building HTML strings from user data. Returning a DOM node is the alternative for cases that require event listeners or complex element trees.

An `onRenderError` option centralises error handling: if a render callback throws or returns an unexpected type, the handler is called and the cell falls back safely. This prevents a single broken column from crashing the entire table render.

---

## Web Component

StreamGrid ships as a pair of custom elements — `<stream-grid>` and `<stream-grid-column>` — that wrap the core grid in a declarative HTML-first API.

`StreamGridElement` (`<stream-grid>`) owns the lifecycle: `connectedCallback` reads attributes, constructs a `RestApiAdapter` from `src`, builds an options object, and instantiates a `StreamGrid` inside itself. Attribute changes trigger a debounced `_scheduleReinit()` via `queueMicrotask`, which coalesces multiple synchronous attribute sets (e.g. during HTML parse of several `<stream-grid-column>` children) into a single reconstruction.

`StreamGridColumn` (`<stream-grid-column>`) is a child element that notifies its closest `<stream-grid>` parent on connect, disconnect, and attribute change. The parent's `_scheduleReinit` re-reads all child columns and rebuilds the grid. A `_reiniting` guard prevents infinite loops during the column save/restore cycle that preserves children across `innerHTML = ''`.

The `template` attribute on `<stream-grid-column>` enables declarative cell rendering without JavaScript. It references a `<template>` element by ID; the template HTML is captured once at parse time and the synthesised `render` function replaces `{{value}}` and `{{row.field}}` tokens on every call. All interpolated values pass through `escapeHtml()` to prevent XSS. If the referenced template ID is not found at parse time, the column falls back to plain text display and a console warning is emitted.

The `element.grid` property exposes the underlying `StreamGrid` instance for programmatic control — event subscription, plugin registration, and render callback attachment — bridging declarative HTML setup with imperative JS when needed.

---

## Test Architecture

The test suite has two layers:

**Unit tests** (253 tests, Mocha + Chai + JSDOM + Sinon) run entirely in Node.js with no browser. They cover every public method, adapter, event emitter, hook manager, filter engine, paginator, and web component lifecycle. JSDOM provides enough DOM surface for custom elements, `connectedCallback`, and `attributeChangedCallback`.

**End-to-end tests** (51 tests, Playwright) run against a real browser with a live json-server backend. The suite uses Page Object Model: three page object classes (`GridPage`, `CacheGridPage`, `ExportGridPage`) centralise selectors and interaction methods, exposed via custom Playwright fixtures. Tests are tagged `@smoke` (9 critical-path tests, ~14s) and `@regression` for CI gating.

The E2E suite covers six categories beyond functional correctness: accessibility audits (axe-core WCAG scans), visual regression (pixel-diff baseline screenshots), API-layer validation (Playwright `request` context), network resilience (route interception for empty data, slow responses, 500 errors), performance budgets (render time and DOM node count thresholds), and cross-browser execution (Chromium, Firefox, WebKit via `playwright.config.js` projects).

---

## Serialisable Public API

`exportConfig()` returns a plain object that passes `JSON.stringify` cleanly and can be spread back into the `StreamGrid` constructor to reconstruct an identical grid. This is an intentional design constraint, not an afterthought: every constructor option is stored in a form that survives a JSON round-trip.

Two pairs of decisions enforce this:

1. `scrollContainer` stores both the resolved DOM element (`this.scrollContainer`) for runtime use and the original selector string (`this._scrollContainerSelector`) for export. Throwing away the original selector string would make full reconstruction impossible for infinite-scroll grids.

2. `exportConfig()` explicitly strips function-valued column properties (e.g. `render`) before the JSON round-trip, rather than letting `JSON.stringify` silently discard them. The omission is intentional and documented — consumers who use column render callbacks are expected to re-attach them by merging on `col.field` after restoration.

A `version` field (`1`) is included in every snapshot so that future schema changes can be detected at construction time and rejected with a descriptive error before any DOM side effects occur.
