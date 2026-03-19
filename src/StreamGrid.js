// StreamGrid — main class that orchestrates data loading, DOM rendering, filtering, and pagination.

import { DataSet } from './DataSet.js';
import { HookManager } from './hooks/HookManager.js';
import { EventEmitter } from './events/EventEmitter.js';
import { page, infinite } from './core/pagination/paginator.js';
import { renderNumberedPagination } from './core/pagination/paginationHelpers.js';
import { SORT_COMPARATORS } from './core/sorting/sortComparators.js';

/**
 * Renders a dynamic HTML data table: fetches data through a pluggable adapter,
 * supports client/server/auto filtering, three pagination modes, a hook system,
 * and an init-time plugin API.
 *
 * @param {string} containerSelector - CSS selector for the container element.
 * @param {object} options - Configuration options.
 * @param {import('./dataAdapter/BaseDataAdapter.js').BaseDataAdapter} options.dataAdapter - Data source adapter.
 * @param {string} options.table - Table/resource name passed to the adapter.
 * @param {string[]|Array<{field:string, label:string, render?:Function, sortable?:boolean, sorter?:'string'|'number'|'date'|Function}>} [options.columns=[]] - Column definitions. Each column may include a render(value, row, context) callback, sortable (default true), and a sorter type or custom comparator function.
 * @param {string[]} [options.filters=[]] - Fields to enable text filtering on. Omit to hide the filter input.
 * @param {object[]} [options.plugins=[]] - Plugin objects with an optional `init(grid)` method.
 * @param {Array<{selector:string, callback:Function}>} [options.customClickHandlers=[]] - Delegated click handlers.
 * @param {boolean} [options.pagination=true] - Enable pagination controls.
 * @param {'pages'|'numbers'|'infinite'} [options.paginationMode='pages'] - Pagination display mode.
 * @param {number} [options.pageSize=10] - Rows per page.
 * @param {boolean} [options.paginationFirstLastButtons=true] - Show First/Last buttons.
 * @param {{prev:string, next:string}} [options.paginationPrevNextText] - Prev/Next button labels.
 * @param {{first:string, last:string}} [options.paginationFirstLastText] - First/Last button labels.
 * @param {object} [options.paginationOptions={}] - Advanced pagination options (maxPageButtons, showEllipses, jumpOffset, showPageInput, groupSize).
 * @param {string} [options.scrollContainer] - CSS selector for the scroll container (infinite mode).
 * @param {number} [options.infiniteScrollTriggerDistance=100] - Pixels from bottom to trigger loading more rows.
 * @param {number} [options.infiniteScrollPageSize] - Rows to append per scroll trigger.
 * @param {number} [options.infiniteScrollTotalLimit] - Hard cap on total rows loaded in infinite mode.
 * @param {number} [options.filterDebounceTime=300] - Milliseconds to debounce the filter input.
 * @param {boolean} [options.filterCaseSensitive=false] - Enable case-sensitive filtering.
 * @param {'auto'|'client'|'server'} [options.filterMode='auto'] - Filtering mode.
 * @param {number} [options.clientFilterThreshold=1000] - Row count above which auto mode switches to server filtering.
 * @param {'auto'|'client'|'server'} [options.sortMode='auto'] - Sorting mode. 'auto' uses client sort below clientSortThreshold rows, server sort above.
 * @param {number} [options.clientSortThreshold] - Row count above which auto mode delegates sort to the server. Defaults to clientFilterThreshold.
 * @param {Array<{field:string,direction:'asc'|'desc'}>} [options.sortStack=[]] - Initial sort state. Restored on exportConfig()/re-init round-trips.
 * @param {boolean} [options.sortNullsFirst=false] - When true, null/undefined values sort before non-null values. Default is nulls-last.
 * @param {boolean} [options.loadDefaultCss=true] - Auto-inject the bundled `streamgrid.css`.
 * @param {string|Function} [options.loadingText='Loading\u2026'] - Text or `() => string | HTMLElement` shown while data is loading.
 * @param {string|Function} [options.emptyText='No results'] - Text or `() => string | HTMLElement` shown when the filtered result set is empty.
 * @param {Function} [options.onRenderError] - Called when a column render() throws or returns an unexpected type. Receives (err, { field, value, row }).
 */
export class StreamGrid {
    constructor(containerSelector, options) {
        // Locate grid container or throw if not found
        this.container = document.querySelector(containerSelector);
        if (!this.container) throw new Error('Invalid container selector');

        // Reject snapshots from future versions before any side effects
        if (options.version != null && options.version > 1) {
            throw new Error(`Config snapshot version ${options.version} is not supported by this version of StreamGrid (max: 1).`);
        }

        // Core configuration
        this.dataAdapter = options.dataAdapter;
        this._validateAdapter(this.dataAdapter);
        this.table = options.table;
        this.columns = (options.columns === 'dom' || !options.columns) ? [] : options.columns;
        this.filters = options.filters || [];
        this.plugins = options.plugins || [];
        this.customClickHandlers = options.customClickHandlers || [];

        // Pagination settings
        this.pagination = options.pagination ?? true;
        this.paginationMode = options.paginationMode || 'pages';
        this.pageSize = options.pageSize || 10;
        this.paginationFirstLastButtons = options.paginationFirstLastButtons ?? true;
        this.paginationPrevNextText = options.paginationPrevNextText || { prev: 'Previous', next: 'Next' };
        this.paginationFirstLastText = options.paginationFirstLastText || { first: 'First', last: 'Last' };
        this.paginationOptions = options.paginationOptions || {};

        // Infinite scroll settings
        this.scrollContainer = options.scrollContainer ? document.querySelector(options.scrollContainer) : null;
        this._scrollContainerSelector = options.scrollContainer || null;
        this.infiniteScrollTriggerDistance = options.infiniteScrollTriggerDistance || 100;
        this.infiniteScrollPageSize = options.infiniteScrollPageSize || this.pageSize;
        this.infiniteScrollTotalLimit = options.infiniteScrollTotalLimit;

        // Filtering state
        this.filterDebounceTime = options.filterDebounceTime ?? 300;
        this.filterCaseSensitive = options.filterCaseSensitive || false;
        this.currentFilterText = options.currentFilterText || '';
        this.filterMode = options.filterMode || 'auto'; // 'auto' | 'client' | 'server'
        this.clientFilterThreshold = options.clientFilterThreshold || 1000;

        // Sorting state
        this.sortStack = options.sortStack || [];              // [{ field, direction }]
        this.sortMode = options.sortMode || 'auto';          // 'auto' | 'client' | 'server'
        this.clientSortThreshold = options.clientSortThreshold ?? this.clientFilterThreshold;
        this.sortNullsFirst = options.sortNullsFirst ?? false;

        // State for paging
        this.currentPage = options.currentPage || 1;
        this.totalLoadedRows = 0;

        // Loading and empty state text (string or () => string | HTMLElement)
        this.loadingText = options.loadingText ?? 'Loading…';
        this.emptyText = options.emptyText ?? 'No results';

        // Render error handler — called when a column render() callback throws or
        // returns an unexpected type. Default: console.warn with full context.
        this.onRenderError = options.onRenderError ?? ((err, ctx) => {
            console.warn(`[StreamGrid] render error in column "${ctx.field}":`, err);
        });

        // Hooks and events
        this.hooks = new HookManager();
        this.events = new EventEmitter();
        this.dataSet = new DataSet();

        // Optionally inject default CSS
        this.loadDefaultCss = options.loadDefaultCss ?? true;
        if (this.loadDefaultCss) this._loadDefaultCssFile();

        // Build DOM structure and bind UI events
        if (options.columns === 'dom') this._parseColumnsFromDOM();
        this._buildStaticLayout();
        if (!this.scrollContainer) this.scrollContainer = this.tableWrapper;
        if (this.sortStack.length) this._updateSortIndicators();
        this._bindEvents();

        // Initialize data and render
        this.init();
    }

    /**
     * Loads columns and data, initialises plugins, then performs the first render.
     * Called automatically in the constructor; can be called again to hard-refresh.
     * @returns {Promise<void>}
     */
    async init() {
        this.emit('loading');
        this.showLoading();
        const wasEmpty = this.columns.length === 0;
        await this._loadColumns();
        if (wasEmpty && this.columns.length > 0) this._rebuildHeader();
        await this._loadData();
        this.plugins.forEach(plugin => plugin.init?.(this));
        this._renderBody();
    }

    /**
     * Fetches column definitions from the adapter and stores them when none were provided.
     * A no-op if columns were already supplied at construction time.
     * @returns {Promise<void>}
     */
    async _loadColumns() {
        const cols = await this.dataAdapter.getColumns(this.table);
        if (!this.columns.length) this.columns = cols;
    }

    /**
     * Rebuilds the thead row from `this.columns`.
     * Called from `init()` when columns were auto-discovered (empty at construction
     * then populated by `_loadColumns()`).
     * @returns {void}
     */
    _rebuildHeader() {
        const headerRow = this.theadElement.firstElementChild;
        headerRow.innerHTML = '';
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = typeof col === 'string' ? col : col.label;
            const field = typeof col === 'string' ? col : col.field;
            const isSortable = typeof col === 'object' ? col.sortable !== false : true;
            if (isSortable) {
                th.dataset.field = field;
                th.dataset.sortable = 'true';
                th.title = 'Click to sort. Shift+click to add to multi-sort.';
            }
            headerRow.appendChild(th);
        });
        if (this.sortStack.length) this._updateSortIndicators();
    }

    /**
     * Fetches fresh data from the adapter and updates the internal DataSet.
     * When server filtering is active the current filter text is included in the request.
     * Does NOT re-render — callers are responsible for calling `_renderBody()` afterward.
     * @returns {Promise<void>}
     */
    async _loadData() {
        const config = {};

        if (this.shouldUseServerFiltering()) {
            config.fields = this.filters;
            config.query = this.currentFilterText;
            config.filterOptions = { exactCase: this.filterCaseSensitive };
        }

        if (this.shouldUseServerSort() && this.sortStack.length) {
            config.sortFields = this.sortStack.map(s => s.field);
            config.sortOrders = this.sortStack.map(s => s.direction);
        }

        const data = await this.dataAdapter.fetchData(this.table, config);
        this.dataSet = new DataSet(data);
        this.emit('dataLoaded', data);
    }

    /**
     * Parses column definitions from hand-authored <th> elements inside the container.
     * Called when `options.columns === 'dom'`, before `_buildStaticLayout()` clears
     * the container. Populates `this.columns` and `this.filters` in place.
     *
     * Label resolution order: data-sg-label → th.textContent.trim() → data-field.
     * Throws if any <th> is missing a required data-field attribute.
     * Warns and falls through to adapter auto-discovery if no <th> elements are found.
     *
     * @returns {void}
     */
    _parseColumnsFromDOM() {
        const thead = this.container.querySelector('thead');
        const ths = thead ? [...thead.querySelectorAll('th')] : [];

        if (ths.length === 0) {
            console.warn(
                'StreamGrid: columns: \'dom\' \u2014 no <th> elements found in container. ' +
                'Falling back to adapter column discovery.'
            );
            return;
        }

        // Validate all <th> elements before mutating anything.
        ths.forEach((th, i) => {
            if (!th.dataset.field) {
                throw new Error(
                    `StreamGrid: columns: 'dom' \u2014 <th> at index ${i} is missing a required data-field attribute.`
                );
            }
        });

        const columns = [];
        const filters = [];

        ths.forEach(th => {
            const field = th.dataset.field;

            const label =
                th.dataset.sgLabel ||
                th.textContent.trim() ||
                field;

            const col = { field, label };

            if (th.dataset.sgSortable === 'false') col.sortable = false;
            if (th.dataset.sgSorter) col.sorter = th.dataset.sgSorter;
            if (th.dataset.sgWidth) col.width = th.dataset.sgWidth;
            if (th.hasAttribute('data-sg-filter')) filters.push(field);

            columns.push(col);
        });

        this.columns = columns;
        if (filters.length) this.filters = filters;
    }

    /**
     * Builds the static DOM skeleton (controls, table, pagination container) entirely
     * in memory before appending once to avoid intermediate reflows.
     */
    _buildStaticLayout() {
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'sg-controls';
        if (this.filters.length) {
            this.filterInput = document.createElement('input');
            this.filterInput.type = 'text';
            this.filterInput.placeholder = 'Filter...';
            if (this.currentFilterText) this.filterInput.value = this.currentFilterText;
            this.controlsContainer.appendChild(this.filterInput);
        }

        this.tableWrapper = document.createElement('div');
        this.tableWrapper.className = 'sg-table-wrapper';

        this.tableElement = document.createElement('table');
        this.theadElement = document.createElement('thead');
        const headerRow = document.createElement('tr');
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = typeof col === 'string' ? col : col.label;
            const field = typeof col === 'string' ? col : col.field;
            const isSortable = typeof col === 'object' ? col.sortable !== false : true;
            if (isSortable) {
                th.dataset.field = field;
                th.dataset.sortable = 'true';
                th.title = 'Click to sort. Shift+click to add to multi-sort.';
            }
            headerRow.appendChild(th);
        });
        this.theadElement.appendChild(headerRow);
        this.tbodyElement = document.createElement('tbody');
        this.tableElement.append(this.theadElement, this.tbodyElement);

        this.paginationElement = document.createElement('div');
        this.paginationElement.className = 'sg-pagination pagination-controls';

        this.tableWrapper.append(this.tableElement);
        this.container.append(this.controlsContainer, this.tableWrapper, this.paginationElement);
    }

    /** @private Attaches DOM event listeners for filter input, table clicks, and scroll. */
    _bindEvents() {
        if (this.filterInput) {
            let timer;
            this.filterInput.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(() => this._onFilter(), this.filterDebounceTime);
            });
        }
        this.tableElement.addEventListener('click', e => this._onTableClick(e));
        this.scrollContainer.addEventListener('scroll', () => this._onScroll());
    }

    /**
     * Handles filter input changes: fetches fresh data for server filtering or
     * resets pagination and re-renders for client filtering, then emits `filterApplied`.
     * Made async so the `filterApplied` event always fires after data is ready.
     * @returns {Promise<void>}
     */
    async _onFilter() {
        const raw = this.filterInput.value.trim();
        this.currentFilterText = this.filterCaseSensitive ? raw : raw.toLowerCase();

        if (this.shouldUseServerFiltering()) {
            await this._loadData();
        } else {
            this.currentPage = 1;
            this.totalLoadedRows = 0;
        }

        this._renderBody();
        this.emit('filterApplied', {
            filterText: this.currentFilterText,
            totalFilteredRows: this.getFilteredRows().length
        });
    }

    /** @private Triggers infinite-scroll row loading when the scroll container nears the bottom. */
    _onScroll() {
        if (this.pagination && this.paginationMode === 'infinite' && this.isAtBottom()) {
            this.loadMoreRows();
        }
    }

    /**
     * Unified click handler for the table element — dispatches to custom handlers
     * and emits built-in events (cellClicked, dataRowClicked, headerClicked, etc.).
     * @param {MouseEvent} event
     */
    _onTableClick(event) {
        const target = event.target;
        const tr = target.closest('tr');
        const th = target.closest('th');
        const td = target.closest('td');

        // Synthetic rows carry no data — skip all data-event logic
        if (tr?.classList.contains('sg-empty-row') || tr?.classList.contains('sg-loading-row')) return;

        // Custom selectors first
        this.customClickHandlers.forEach(handler => {
            if (target.closest(handler.selector)) {
                let rowData = null;
                let field = null;
                if (tr?.parentElement.tagName === 'TBODY' && td) {
                    const idx = [...this.tbodyElement.children].indexOf(tr);
                    rowData = this.getFilteredRows()[idx];
                    field = this.columns[td.cellIndex];
                }
                handler.callback(event, this, rowData, field);
            }
        });

        // Built-in cell click
        if (td?.parentElement.parentElement.tagName === 'TBODY') {
            const idx = [...this.tbodyElement.children].indexOf(td.parentElement);
            this.emit('cellClicked', { rowData: this.getFilteredRows()[idx], columnField: this.columns[td.cellIndex] });
        }
        // Header click
        if (th?.parentElement.parentElement.tagName === 'THEAD') {
            this.emit('headerClicked', { columnField: this.columns[th.cellIndex] });
            if (th.dataset.sortable === 'true') this._onHeaderSortClick(th, event);
        }
        // Row click
        if (tr?.parentElement.tagName === 'TBODY') {
            const idx = [...this.tbodyElement.children].indexOf(tr);
            this.emit('dataRowClicked', this.getFilteredRows()[idx]);
        }
        if (tr?.parentElement.tagName === 'THEAD') this.emit('headerRowClicked');
        this.emit('tableClicked', event);
    }

    /**
     * Renders shimmer skeleton rows into the table body to indicate a loading state.
     * Uses `colspan="999"` when column count is not yet known so the placeholder cell
     * always fills the full table width regardless of the final column count.
     * Called automatically at the start of `init()`; may also be called externally
     * to signal a pending refresh.
     */
    showLoading() {
        const colCount = this.columns.length || 999;
        const rowCount = Math.min(this.pageSize, 5);
        this.tbodyElement.setAttribute('data-sg-state', 'loading');
        this.tbodyElement.innerHTML = '';
        for (let i = 0; i < rowCount; i++) {
            const tr = document.createElement('tr');
            tr.className = 'sg-loading-row';
            const td = document.createElement('td');
            td.colSpan = colCount;
            td.style.setProperty('--shimmer-delay', `${i * 0.15}s`);
            tr.appendChild(td);
            this.tbodyElement.appendChild(tr);
        }
    }

    /**
     * Renders the empty state row. Useful for programmatically displaying the
     * "no data" message without triggering a filter or data reload.
     */
    showEmpty() {
        this.tbodyElement.removeAttribute('data-sg-state');
        this.tbodyElement.innerHTML = '';
        const tr = document.createElement('tr');
        tr.className = 'sg-empty-row';
        const td = document.createElement('td');
        td.colSpan = this.columns.length || 1;
        if (typeof this.emptyText === 'function') {
            const content = this.emptyText();
            typeof content === 'string' ? (td.innerHTML = content) : td.appendChild(content);
        } else {
            td.textContent = this.emptyText;
        }
        tr.appendChild(td);
        this.tbodyElement.appendChild(tr);
    }

    /** @private Re-renders the table body and pagination controls for the current page/filter state. */
    _renderBody() {
        const filteredRows = this.getFilteredRows();
        const allRows = this.getSortedRows(filteredRows);
        const rowsToShow = this.paginationMode === 'infinite'
            ? infinite(allRows, this.totalLoadedRows, this.infiniteScrollPageSize, this.infiniteScrollTotalLimit).rows
            : page(allRows, this.currentPage, this.pageSize);

        // Preserve scroll position in infinite mode so re-rendering more rows
        // doesn't jump the user back to the top of the container.
        const savedScrollTop = this.paginationMode === 'infinite'
            ? this.scrollContainer.scrollTop
            : 0;

        this.tbodyElement.removeAttribute('data-sg-state');
        this.tbodyElement.innerHTML = '';

        if (rowsToShow.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'sg-empty-row';
            const td = document.createElement('td');
            td.colSpan = this.columns.length || 1;
            if (typeof this.emptyText === 'function') {
                const content = this.emptyText();
                typeof content === 'string' ? (td.innerHTML = content) : td.appendChild(content);
            } else {
                td.textContent = this.emptyText;
            }
            tr.appendChild(td);
            this.tbodyElement.appendChild(tr);
            this._renderPagination(0);
            this.emit('tableRendered', this);
            return;
        }

        rowsToShow.forEach(row => {
            const tr = document.createElement('tr');
            this.columns.forEach(col => {
                const td = document.createElement('td');
                const field = typeof col === 'string' ? col : col.field;
                const value = row[field] ?? '';
                const renderFn = typeof col === 'object' ? col.render : undefined;

                if (renderFn) {
                    let result;
                    try {
                        result = renderFn(value, row, { type: 'display', field, col });
                    } catch (err) {
                        this.onRenderError(err, { field, value, row });
                        tr.appendChild(td);
                        return;
                    }

                    if (result === null || result === undefined) {
                        // Intentional: render returned nothing — fall back to textContent
                        td.textContent = String(value);
                    } else if (typeof result === 'string') {
                        td.innerHTML = result;
                    } else if (result !== null && typeof result === 'object' && typeof result.nodeType === 'number') {
                        // Duck-type DOM node check: `instanceof Node` is not available in all
                        // environments (e.g. JSDOM without global.Node). Any real DOM node has a
                        // numeric nodeType. If appendChild throws (non-node object with nodeType),
                        // that is a developer error in the render callback — onRenderError fires.
                        try {
                            td.appendChild(result);
                        } catch (err) {
                            this.onRenderError(err, { field, value, row });
                            td.textContent = String(value);
                        }
                    } else {
                        // Unexpected return type
                        this.onRenderError(
                            new TypeError(`render() for column "${field}" returned ${typeof result} — expected string, Node, null, or undefined`),
                            { field, value, row }
                        );
                        td.textContent = String(value);
                    }
                } else {
                    td.textContent = String(value);
                }

                tr.appendChild(td);
            });
            this.tbodyElement.appendChild(tr);
        });

        if (this.paginationMode === 'infinite') {
            this.scrollContainer.scrollTop = savedScrollTop;
        }

        this._renderPagination(allRows.length);
        this.emit('tableRendered', this);
    }

    /**
     * Delegates pagination rendering to the helper module.
     * @param {number} totalRows - Total number of filtered rows.
     */
    _renderPagination(totalRows) {
        renderNumberedPagination(this, totalRows);
    }

    /**
     * Returns true when the current filter operation should be delegated to the server.
     * In `auto` mode the decision is based on whether the loaded row count exceeds
     * `clientFilterThreshold` — keeping small datasets fast without extra requests.
     * @returns {boolean}
     */
    shouldUseServerFiltering() {
        if (this.filterMode === 'server') return true;
        if (this.filterMode === 'client') return false;
        return this.dataSet.data.length > this.clientFilterThreshold;
    }

    /**
     * Returns true when the current sort operation should be delegated to the server.
     * Mirrors the structure of shouldUseServerFiltering() exactly.
     * @returns {boolean}
     */
    shouldUseServerSort() {
        if (this.sortMode === 'server') return true;
        if (this.sortMode === 'client') return false;
        return this.dataSet.data.length > this.clientSortThreshold;
    }

    /**
     * Returns a sorted copy of the given rows according to the current sortStack.
     * Returns the input array unchanged if the stack is empty or if server sort is active
     * (in which case the server has already sorted the data).
     * Never mutates DataSet.data.
     * @param {object[]} rows
     * @returns {object[]}
     */
    getSortedRows(rows) {
        if (!this.sortStack.length || this.shouldUseServerSort()) return rows;
        return [...rows].sort(this._buildComparator());
    }

    /**
     * Builds a multi-column comparator function from the current sortStack.
     * Sorter functions are resolved once in the outer closure — not on every comparison call.
     * Custom sorter functions and null guards are applied before built-in comparators.
     * @returns {Function}
     */
    _buildComparator() {
        const resolvedStack = this.sortStack.map(({ field, direction }) => {
            const col = this.columns.find(c => (typeof c === 'string' ? c : c.field) === field);
            const sorterSpec = (typeof col === 'object' && col?.sorter) || 'string';
            const compareFn = typeof sorterSpec === 'function'
                ? sorterSpec
                : (SORT_COMPARATORS[sorterSpec] ?? SORT_COMPARATORS.string);
            return { field, direction, compareFn };
        });

        return (a, b) => {
            for (const { field, direction, compareFn } of resolvedStack) {
                const aVal = a[field] ?? undefined;
                const bVal = b[field] ?? undefined;
                if (aVal == null && bVal == null) continue;
                if (aVal == null) return this.sortNullsFirst ? -1 : 1;
                if (bVal == null) return this.sortNullsFirst ? 1 : -1;
                const result = compareFn(aVal, bVal);
                if (result !== 0) return direction === 'asc' ? result : -result;
            }
            return 0;
        };
    }

    /**
     * Handles a click on a sortable column header.
     * Plain click replaces the entire sort stack with a single entry (asc → desc → clear).
     * Shift+click adds, toggles, or removes an individual entry from the stack.
     * After mutating the stack: resets to page 1, reloads data if server sort is active,
     * re-renders, updates sort indicators, and emits 'sortChanged'.
     * @param {HTMLElement} th - The clicked <th> element.
     * @param {MouseEvent} event - The original click event.
     */
    async _onHeaderSortClick(th, event) {
        const field = th.dataset.field;
        const existing = this.sortStack.find(s => s.field === field);

        if (event.shiftKey) {
            // Shift+click: add, toggle, or remove this field from the stack
            if (!existing) {
                this.sortStack.push({ field, direction: 'asc' });
            } else if (existing.direction === 'asc') {
                existing.direction = 'desc';
            } else {
                this.sortStack = this.sortStack.filter(s => s.field !== field);
            }
        } else {
            // Plain click: clear stack and start fresh with this single column
            if (!existing) {
                this.sortStack = [{ field, direction: 'asc' }];
            } else if (existing.direction === 'asc') {
                this.sortStack = [{ field, direction: 'desc' }];
            } else {
                this.sortStack = [];
            }
        }

        this.currentPage = 1;

        if (this.shouldUseServerSort() && this.sortStack.length) {
            await this._loadData();
        }

        this._renderBody();
        this._updateSortIndicators();
        this.emit('sortChanged', { sortStack: this.sortStack.map(s => ({ ...s })) });
    }

    /**
     * Updates data-sort-dir and data-sort-priority attributes on all <th> elements
     * to reflect the current sortStack. Also updates title attributes to hint
     * Shift+click behaviour when multi-sort is active.
     * Uses only attribute mutations — no DOM nodes are added or removed.
     */
    _updateSortIndicators() {
        const ths = [...this.theadElement.querySelectorAll('th')];
        const isMultiSort = this.sortStack.length > 1;

        ths.forEach((th) => {
            const field = th.dataset.field;
            if (!field) return;
            const entry = this.sortStack.find(s => s.field === field);
            if (entry) {
                th.setAttribute('data-sort-dir', entry.direction);
                if (isMultiSort) {
                    th.setAttribute('data-sort-priority', this.sortStack.indexOf(entry) + 1);
                    th.title = 'Click to sort by this column only. Shift+click to remove from multi-sort.';
                } else {
                    th.removeAttribute('data-sort-priority');
                    th.title = 'Click to sort. Shift+click to add to multi-sort.';
                }
            } else {
                th.removeAttribute('data-sort-dir');
                th.removeAttribute('data-sort-priority');
                th.title = isMultiSort
                    ? 'Shift+click to add to multi-sort.'
                    : 'Click to sort. Shift+click to add to multi-sort.';
            }
        });
    }

    /**
     * Returns the current filtered row set from the DataSet.
     * @returns {object[]}
     */
    getFilteredRows() {
        return this.dataSet.filterBy(this.filters, this.currentFilterText, {
            exactCase: this.filterCaseSensitive,
            exactMatch: false
        }).rows;
    }

    /**
     * Navigates to a specific page number and re-renders.
     * @param {number} pageNum - 1-based page number to go to.
     */
    goToPage(pageNum) {
        this.currentPage = pageNum;
        this._renderBody();
        this.emit('paginationChanged', { currentPage: this.currentPage, totalRows: this.getFilteredRows().length });
    }

    /**
     * Returns a plain serialisable snapshot of the current grid configuration and
     * live state. Suitable for `JSON.stringify`, `localStorage`, and session restore.
     *
     * The returned object can be spread into the `StreamGrid` constructor to
     * reconstruct an equivalent grid — the caller must re-supply `dataAdapter`
     * since adapter instances are not serialisable.
     *
     * Column `render` callbacks are stripped from the exported column objects
     * (functions are not serialisable). See the `exportConfig()` JSDoc and
     * GettingStarted.md for how to re-attach render functions on restore.
     * To restore them, merge the snapshot columns with your column definitions:
     *
     * ```js
     * const snapshot = grid.exportConfig();
     * const restoredColumns = snapshot.columns.map(col => ({
     *     ...col,
     *     ...myColumnRenders[col.field]   // re-attach render functions by field name
     * }));
     * new StreamGrid(el, { ...snapshot, dataAdapter: myAdapter, columns: restoredColumns });
     * ```
     *
     * @returns {{version:number, table:string, columns:object[], filters:string[],
     *   pagination:boolean, paginationMode:string, pageSize:number,
     *   paginationFirstLastButtons:boolean, paginationPrevNextText:object,
     *   paginationFirstLastText:object, paginationOptions:object,
     *   scrollContainer:string|null, infiniteScrollTriggerDistance:number,
     *   infiniteScrollPageSize:number, infiniteScrollTotalLimit:number|null,
     *   filterDebounceTime:number, filterCaseSensitive:boolean, filterMode:string,
     *   clientFilterThreshold:number, loadDefaultCss:boolean,
     *   currentPage:number, currentFilterText:string,
     *   sortStack:Array<{field:string,direction:string}>, sortMode:string,
     *   clientSortThreshold:number, sortNullsFirst:boolean}}
     */
    exportConfig() {
        const result = {
            version: 1,
            table: this.table,
            columns: this.columns.map(col =>
                typeof col === 'string'
                    ? col
                    : Object.fromEntries(Object.entries(col).filter(([, v]) => typeof v !== 'function'))
            ),
            filters: [...this.filters],
            pagination: this.pagination,
            paginationMode: this.paginationMode,
            pageSize: this.pageSize,
            paginationFirstLastButtons: this.paginationFirstLastButtons,
            paginationPrevNextText: this.paginationPrevNextText,
            paginationFirstLastText: this.paginationFirstLastText,
            paginationOptions: this.paginationOptions,
            scrollContainer: this._scrollContainerSelector,
            infiniteScrollTriggerDistance: this.infiniteScrollTriggerDistance,
            infiniteScrollPageSize: this.infiniteScrollPageSize,
            infiniteScrollTotalLimit: this.infiniteScrollTotalLimit ?? null,
            filterDebounceTime: this.filterDebounceTime,
            filterCaseSensitive: this.filterCaseSensitive,
            filterMode: this.filterMode,
            clientFilterThreshold: this.clientFilterThreshold,
            loadDefaultCss: this.loadDefaultCss,
            currentPage: this.currentPage,
            currentFilterText: this.currentFilterText,
            sortStack: this.sortStack.map(s => ({ ...s })),
            sortMode: this.sortMode,
            clientSortThreshold: this.clientSortThreshold,
            sortNullsFirst: this.sortNullsFirst,
            loadingText: typeof this.loadingText === 'function' ? undefined : this.loadingText,
            emptyText: typeof this.emptyText === 'function' ? undefined : this.emptyText,
        };
        return JSON.parse(JSON.stringify(result));
    }

    /**
     * Returns true when the scroll container is within `infiniteScrollTriggerDistance`
     * pixels of its bottom.
     * @returns {boolean}
     */
    isAtBottom() {
        const { scrollTop, scrollHeight, clientHeight } = this.scrollContainer;
        return scrollTop + clientHeight >= scrollHeight - this.infiniteScrollTriggerDistance;
    }

    /**
     * Appends the next batch of rows in infinite-scroll mode and re-renders.
     * Does nothing when the total limit or full dataset has already been loaded.
     */
    loadMoreRows() {
        const total = this.getFilteredRows().length;
        // After the initial render, totalLoadedRows is still 0 but the grid
        // already shows `infiniteScrollPageSize` rows (via initialSize in infinite()).
        // Base the next batch on the actual currently-visible count.
        const currentShown = this.totalLoadedRows > 0 ? this.totalLoadedRows : this.infiniteScrollPageSize;
        const next = currentShown + this.infiniteScrollPageSize;
        if ((this.infiniteScrollTotalLimit && next > this.infiniteScrollTotalLimit) || next > total) return;
        this.totalLoadedRows = next;
        this._renderBody();
    }

    /** @private Injects the bundled streamgrid.css stylesheet into the document head. */
    _loadDefaultCssFile() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('./streamgrid.css', import.meta.url).href;
        document.head.appendChild(link);
    }

    // ── EventEmitter public API ────────────────────────────────────────────────

    /**
     * Subscribe to a grid lifecycle event.
     * @param {string} eventName
     * @param {Function} callback
     */
    on(eventName, callback) { this.events.on(eventName, callback); }

    /**
     * Unsubscribe a previously registered event listener.
     * @param {string} eventName
     * @param {Function} callback
     */
    off(eventName, callback) { this.events.off(eventName, callback); }

    /**
     * Emit a grid event.
     * @param {string} eventName
     * @param {...*} args
     */
    emit(eventName, ...args) { this.events.emit(eventName, ...args); }

    // ── Hook public API ────────────────────────────────────────────────────────

    /**
     * Register an action hook callback.
     * @param {string} name
     * @param {Function} callback
     */
    addAction(name, callback) { this.hooks.addAction(name, callback); }

    /**
     * Execute all callbacks registered for an action hook.
     * @param {string} name
     * @param {...*} args
     */
    doAction(name, ...args) { this.hooks.doAction(name, ...args); }

    /**
     * Register a filter hook callback.
     * @param {string} name
     * @param {Function} callback
     */
    addFilter(name, callback) { this.hooks.addFilter(name, callback); }

    /**
     * Run a value through all filter hook callbacks registered for a name.
     * @param {string} name
     * @param {*} value
     * @param {...*} args
     * @returns {*} The transformed value.
     */
    applyFilters(name, value, ...args) { return this.hooks.applyFilters(name, value, ...args); }

    /**
     * Validates that the provided adapter implements all required methods.
     * Throws a descriptive Error on failure. Called once at construction time.
     * @param {object} adapter
     */
    _validateAdapter(adapter) {
        const required = ['getColumns', 'fetchData', 'insertRow', 'updateRow', 'deleteRow'];
        for (const method of required) {
            if (typeof adapter[method] !== 'function') {
                throw new Error(
                    `StreamGrid: dataAdapter is missing required method "${method}".\n` +
                    `Adapters must implement: getColumns, fetchData, insertRow, updateRow, deleteRow.`
                );
            }
        }
    }
}
