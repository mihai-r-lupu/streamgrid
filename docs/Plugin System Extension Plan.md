# Plugin System Extension Plan — Phase 2

Five architectural enhancements to the HookManager / plugin system, ordered by implementation priority.

---

## 1. Koa-style middleware (`next()`) — highest value

Replace the current linear value-chain filter with a middleware-stack model where each callback wraps the rest of the chain via `next()`. This unlocks timing, rollback, conditional short-circuit, and log-around patterns that are structurally impossible with the current design.

### API shape

```js
// New: middleware registration
grid.use('beforeRender', async (rows, next) => {
    console.time('render');
    const result = await next(rows);   // passes control + value down the chain
    console.timeEnd('render');
    return result;
});

// Short-circuit (skip remainder of chain)
grid.use('beforeFetch', (config, next) => {
    if (cache.has(config.table)) return cache.get(config.table); // never calls next
    return next(config);
});
```

### Implementation notes

- `use(hookName, fn, priority, nsOrOpts)` registers a middleware entry (separate list from `addFilter` for backward compatibility, or unified with a flag)
- Dispatch builds the chain by reducing the sorted list into nested `next` closures (Koa `compose` pattern), then calls the outermost
- Sync-safe: if no callback in the chain is async, the whole compose is sync (use `isPromise` detection to avoid forcing a Promise tick)
- Error boundary: wrap each segment so a throw in middleware N doesn't silently swallow middleware N+1
- Backward-compatible: `addFilter` callbacks are auto-wrapped as `(value, next) => next(callback(value))`

### Koa `compose` reference

```js
function compose(middlewares) {
    return function dispatch(i, value) {
        const fn = middlewares[i];
        if (!fn) return value;
        return fn(value, (nextValue) => dispatch(i + 1, nextValue ?? value));
    };
}
```

### Impact

Changes what is *expressible* by plugins — not just "transform a value" but "wrap a lifecycle point". The gap between toy hook systems and production ones (Koa, Hapi, Fastify, VS Code extension host).

---

## 2. Plugin dependency graph (topological init order)

Plugins declare static dependencies by name. The system resolves init order via topological sort and throws a descriptive error on cycles or missing deps.

### API shape

```js
class ChartPlugin {
    static pluginName = 'ChartPlugin';
    static dependencies = ['ExportPlugin', 'FilterPlugin'];

    init(grid) {
        // Guaranteed to run after ExportPlugin.init and FilterPlugin.init
    }
}
```

### Implementation notes

- `StreamGrid` reads `plugin.constructor.dependencies ?? []` for each plugin before calling any `init`
- Topological sort (Kahn's algorithm — iterative, no recursion limit risk):
  1. Build adjacency list and in-degree map from declared deps
  2. Queue all zero-in-degree plugins
  3. Drain queue: init each, decrement dependents' in-degree, enqueue newly zero ones
  4. If queue empties before all plugins inited → cycle detected → throw with the cycle path
- Missing dep (declared but not in `plugins: []` array) → throw at sort time, before any `init` runs
- `pluginName` can fall back to `constructor.name` for zero-boilerplate plugins that have no deps

### Error messages (must be good)

```
PluginDependencyError: ChartPlugin depends on "ExportPlugin" which is not in the plugins array.
PluginDependencyError: Cycle detected in plugin dependencies: ChartPlugin → FilterPlugin → ChartPlugin
```

### Impact

Enables safe plugin composition past ~5 plugins. Without this, plugin arrays are order-sensitive and silently break when consumers reorder them.

---

## 3. Automatic sync→async promotion

A single dispatch path that detects if any callback returned a `Promise` and automatically promotes the whole chain — callers never need to choose between `doAction` and `doActionAsync`.

### API shape

```js
// Caller remains the same regardless of whether plugins are sync or async
const result = grid.hooks.applyFilters('beforeRender', rows);
// If all callbacks sync  → returns rows directly (no Promise overhead, no microtask)
// If any callback async  → returns Promise<rows> automatically
```

### Implementation notes

- After each callback invocation, check `returned instanceof Promise` (or `typeof returned?.then === 'function'`)
- If a Promise is detected mid-chain, switch to an async reduce for the remainder and return a Promise from the overall call
- `doAction`/`doActionAsync` and `applyFilters`/`applyFiltersAsync` pairs collapse into single methods; old async variants kept as aliases for backward compat
- The fast path (all sync, no Promise detected) has zero overhead over the current implementation
- At each `applyFilters` call site where a hook modifies a value (`beforeRender`, `beforeFetch`, `afterFetch`, `beforeDataLoad`, `beforeFilter`, `beforeSort`), add an `Object.is` reference check before doing downstream work — if the returned value is the same reference, skip the render/sort/fetch. This is a one-liner per call site, not a separate batch.

### Why this matters

Currently a sync callsite receiving an async plugin callback silently drops the return value — the mutation never applies. This is a class of bug that produces no error and is very hard to diagnose. Auto-promotion eliminates it entirely.

---

## 4. WeakRef-based plugin registration (zero-leak isolation)

Plugins hold strong references via closures into the hook registry. When a plugin is replaced (hot reload, SPA navigation, test teardown), those closures stay alive — a memory and stale-execution leak. WeakRef fixes it.

### API shape

```js
class MyPlugin {
    init(grid) {
        // Register with `owner: this` — the hook system holds a WeakRef to `this`
        grid.addFilter('cellRender', this._onCellRender, 10, { namespace: 'my-plugin', owner: this });
    }
    _onCellRender(ctx) { /* ... */ }
}

// When the plugin instance is GC'd, its hooks are lazily pruned at next dispatch
```

### Implementation notes

- `addAction`/`addFilter` accept `owner` in the options object; if present, store it as `new WeakRef(owner)` in the entry
- At dispatch time, before executing an entry, check `entry.ownerRef?.deref()` — if it returns `undefined`, skip and mark for removal
- `_removeIndices` call at end of dispatch cleans up dead entries
- `owner` is optional — existing registrations without an owner work exactly as before
- Polyfill note: `WeakRef` is available in all targets (Chrome 84+, Node 14.6+); no polyfill needed

### Impact

Eliminates an entire category of memory leaks and stale-callback bugs in SPA environments where grids are mounted/unmounted frequently. Makes the plugin system safe for hot-module-replacement workflows.

---

## Implementation Order

| # | Feature | Effort | Risk | Recommended batch |
|---|---|---|---|---|
| 3 | Auto async promotion | Low | Low | Batch A |
| 2 | Dependency graph | Medium | Low | Batch B |
| 4 | WeakRef registration | Medium | Low | Batch B |
| 1 | Middleware (`next()`) | Medium-High | Medium | Batch C |

Batches A and B are purely additive and backward-compatible. Batch C (middleware) is the most impactful but requires the most careful backward-compat design for existing `addFilter` registrations.

---

## Backward Compatibility Constraints

- All existing `addAction` / `addFilter` / `doAction` / `applyFilters` call sites must continue to work unchanged
- `doActionAsync` / `applyFiltersAsync` remain as explicit aliases after auto-promotion is added
- Middleware `use()` is a new method — no collision with existing API surface
- `pluginName` / `dependencies` on plugin classes are opt-in static fields — existing plugins without them continue to work (init order = array order)
