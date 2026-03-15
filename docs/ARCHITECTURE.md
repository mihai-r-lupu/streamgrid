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

- **No sorting UI.** The adapter pattern means consumers can pass pre-sorted data from the server, or add sort parameters to their adapter's query config. A built-in sort UI would expand scope without demonstrating a new concept.

- **No virtual scrolling.** Pagination and infinite scroll cover the same performance use case more simply. Virtual scrolling adds DOM recycling complexity that is only justified at 100K+ row counts — a tier that should use server-side pagination anyway.
