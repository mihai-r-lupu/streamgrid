import { StreamGrid } from '../StreamGrid.js';
import { RestApiAdapter } from '../dataAdapter/RestApiAdapter.js';

// Deterministic counter for host element IDs. Not Math.random() — tests need
// stable, predictable IDs.
let _idCounter = 0;

export class StreamGridElement extends HTMLElement {
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

    constructor() {
        super();
        this._grid = null;
        this._dirty = false;
        this._generation = 0;
    }

    connectedCallback() {
        if (!this.id) {
            this.id = 'sg-host-' + (++_idCounter);
        }
        this._reinit();
    }

    disconnectedCallback() {
        this._grid = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (!this.isConnected) return;
        this._dirty = true;
        queueMicrotask(() => {
            if (this._dirty) {
                this._dirty = false;
                this._reinit();
            }
        });
    }

    get grid() {
        return this._grid;
    }

    // ── Private ────────────────────────────────────────────────────────────────

    _reinit() {
        const gen = ++this._generation;
        const options = this._buildOptions();
        this.innerHTML = '';
        this._grid = null;

        if (!options.dataAdapter) {
            console.warn(
                'StreamGrid: no data source provided. Set a src attribute or pass a dataAdapter.'
            );
            return;
        }

        if (gen !== this._generation) return;

        this._grid = new StreamGrid('#' + this.id, options);
    }

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

    _parseColumns() {
        return Array.from(this.querySelectorAll(':scope > stream-grid-column')).map(col => {
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
