// StreamGridElement — custom element <stream-grid> that wraps StreamGrid for declarative HTML-first usage.

import { StreamGrid } from '../StreamGrid.js';
import { RestApiAdapter } from '../dataAdapter/RestApiAdapter.js';

// Deterministic counter for host element IDs. Not Math.random() — tests need
// stable, predictable IDs.
let _idCounter = 0;

/**
 * Custom element `<stream-grid>` — configuration-first wrapper around {@link StreamGrid}.
 * Reads data source, pagination, and filter settings from HTML attributes; reads column
 * definitions from `<stream-grid-column>` children. Creates and replaces the inner
 * StreamGrid instance as the element connects, disconnects, or its attributes change.
 */
export class StreamGridElement extends HTMLElement {
    /**
     * Attribute names that trigger `attributeChangedCallback` when modified.
     * @type {string[]}
     */
    static get observedAttributes() {
        return [
            'src',
            'table',
            'page-size',
            'pagination-mode',
            'filter-mode',
            'filter-debounce',
            'sort-mode',
        ];
    }

    /**
     * Initialises internal state. The StreamGrid instance is deferred to
     * `connectedCallback` so that child `<stream-grid-column>` elements are already
     * in the parsed DOM when column discovery runs.
     */
    constructor() {
        super();
        this._grid = null;
        this._dirty = false;
        this._generation = 0;
    }

    /**
     * Called when the element is inserted into the document.
     * Assigns a stable host id if none is present, then triggers a full grid initialisation.
     * @returns {void}
     */
    connectedCallback() {
        if (!this.id) {
            this.id = 'sg-host-' + (++_idCounter);
        }
        this._scheduleReinit();
    }

    /**
     * Called when the element is removed from the document.
     * Releases the reference to the inner StreamGrid instance.
     * @returns {void}
     */
    disconnectedCallback() {
        this._grid = null;
    }

    /**
     * Called when an observed attribute is added, changed, or removed.
     * Schedules a re-initialisation via microtask to coalesce rapid successive changes
     * (e.g. multiple attributes set in the same script tick).
     * @param {string}      name     - Attribute name.
     * @param {string|null} oldValue - Previous attribute value.
     * @param {string|null} newValue - New attribute value.
     * @returns {void}
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this._scheduleReinit();
    }

    /**
     * The underlying StreamGrid instance, or `null` before the first connection or
     * when no valid data source is configured.
     * @type {StreamGrid|null}
     */
    get grid() {
        return this._grid;
    }

    // ── Private ────────────────────────────────────────────────────────────────

    /**
     * Schedules a debounced reinitialisation via microtask. Multiple calls within
     * the same synchronous tick coalesce into a single `_reinit()` call, which
     * prevents a burst of child connect/disconnect/attribute callbacks (e.g. during
     * initial HTML parse) from triggering redundant reinits.
     *
     * The `!this.isConnected` guard makes the method a no-op when the parent is not
     * in the document — this prevents the cascade-removal crash where each column's
     * disconnectedCallback notifies a detached parent and triggers a reinit against
     * a container that no longer exists in the DOM.
     * @returns {void}
     */
    _scheduleReinit() {
        if (!this.isConnected) return;
        if (this._reiniting) return;
        this._dirty = true;
        queueMicrotask(() => {
            if (this._dirty) {
                this._dirty = false;
                this._reinit();
            }
        });
    }

    /**
     * Tears down any existing grid DOM, builds a fresh options object from current
     * attribute and child state, and constructs a new StreamGrid instance. Includes
     * a generation counter so that stale calls are discarded if a newer reinit fires
     * before async work completes.
     * @returns {void}
     */
    _reinit() {
        const gen = ++this._generation;
        const options = this._buildOptions();

        // Save <stream-grid-column> children before clearing: innerHTML = ''
        // and StreamGrid._buildStaticLayout() both destroy all child nodes.
        // Re-appending after construction keeps columns alive for future
        // attribute changes and dynamic add/remove.
        const columnEls = Array.from(this.children)
            .filter(el => el.matches('stream-grid-column'));
        this._reiniting = true;
        this.innerHTML = '';
        this._grid = null;

        if (!options.dataAdapter) {
            columnEls.forEach(col => this.appendChild(col));
            this._reiniting = false;
            console.warn(
                'StreamGrid: no data source provided. Set a src attribute or pass a dataAdapter.'
            );
            return;
        }

        if (gen !== this._generation) {
            columnEls.forEach(col => this.appendChild(col));
            this._reiniting = false;
            return;
        }

        this._grid = new StreamGrid('#' + this.id, options);
        columnEls.forEach(col => this.appendChild(col));
        this._reiniting = false;
    }

    /**
     * Assembles the full StreamGrid options object from parsed attributes and column
     * children. Extracts the `filters` array from columns carrying the internal
     * `_filter` flag, then strips that flag before passing columns to StreamGrid.
     * @returns {object} Options object suitable for the StreamGrid constructor.
     */
    _buildOptions() {
        const columns = this._parseColumns();
        const filters = columns
            .filter(col => col._filter)
            .map(col => col.field);

        // _filter is an internal flag used during parsing — strip it before
        // passing to StreamGrid, which does not know about it.
        columns.forEach(col => delete col._filter);

        return {
            ...this._parseAttributes(),
            columns,
            ...(filters.length ? { filters } : {}),
        };
    }

    /**
     * Reads HTML attributes and converts them to StreamGrid constructor option
     * properties. Only attributes present on the element are included.
     * @returns {object} Partial StreamGrid options derived from element attributes.
     */
    _parseAttributes() {
        const opts = {};

        const src = this.getAttribute('src');
        if (src != null) opts.dataAdapter = new RestApiAdapter({ baseUrl: src });

        const table = this.getAttribute('table');
        if (table != null) opts.table = table;

        const pageSize = this.getAttribute('page-size');
        if (pageSize != null) opts.pageSize = Number(pageSize);

        const paginationMode = this.getAttribute('pagination-mode');
        if (paginationMode != null) opts.paginationMode = paginationMode;

        const filterMode = this.getAttribute('filter-mode');
        if (filterMode != null) opts.filterMode = filterMode;

        const filterDebounce = this.getAttribute('filter-debounce');
        if (filterDebounce != null) opts.filterDebounceTime = Number(filterDebounce);

        const sortMode = this.getAttribute('sort-mode');
        if (sortMode != null) opts.sortMode = sortMode;

        return opts;
    }

    /**
     * Reads direct `<stream-grid-column>` children and converts their attributes to
     * StreamGrid column definition objects. Sets the internal `_filter` flag on any
     * column whose element carries the boolean `filter` attribute; that flag is
     * consumed and stripped by `_buildOptions()` before columns reach StreamGrid.
     * @returns {Array<object>} Column definition objects; may include `_filter: true`.
     */
    _parseColumns() {
        return Array.from(this.children)
            .filter(el => el.matches('stream-grid-column'))
            .map(col => {
                const def = {};

                const field = col.getAttribute('field');
                if (field != null) def.field = field;

                const label = col.getAttribute('label');
                if (label != null) def.label = label;

                const sortable = col.getAttribute('sortable');
                if (sortable === 'false') def.sortable = false;

                const width = col.getAttribute('width');
                if (width != null) def.width = width;

                const sorter = col.getAttribute('sorter');
                if (sorter != null) def.sorter = sorter;

                // _filter is a temporary flag consumed and stripped by _buildOptions().
                if (col.hasAttribute('filter')) def._filter = true;

                return def;
            });
    }
}

if (typeof customElements !== 'undefined') {
    customElements.define('stream-grid', StreamGridElement);
}
