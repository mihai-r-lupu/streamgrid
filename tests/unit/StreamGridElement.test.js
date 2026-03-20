/**
 * Unit tests for StreamGridElement (<stream-grid>) and StreamGridColumn (<stream-grid-column>).
 *
 * ES module imports are hoisted and evaluated before any test code runs. Because
 * StreamGridElement.js and StreamGridColumn.js reference the browser globals
 * `HTMLElement` and `customElements` at class-definition / module-evaluation time,
 * they cannot be statically imported here without those globals being present first.
 *
 * Solution: a top-level Mocha `before()` hook that:
 *   1. Creates a JSDOM window and sets the required globals
 *   2. Dynamically imports the element source files (module body runs at that point)
 *      so customElements.define() succeeds against the live JSDOM registry
 */
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import sinon from 'sinon';
import { StreamGrid } from '../../src/StreamGrid.js';
import { RestApiAdapter } from '../../src/dataAdapter/RestApiAdapter.js';

// ── Module-level state ───────────────────────────────────────────────────────────
let StreamGridElement;
let StreamGridColumn;
let dom;        // single persistent JSDOM for this suite
let _savedFetch; // saves global.fetch from other test files so we can restore it

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a <stream-grid> element with given attributes, appended to a fixture
 * div inside document.body. Returns { el, fixture } for teardown.
 */
function makeHost(attrs = {}) {
    const fixture = document.createElement('div');
    const el = document.createElement('stream-grid');
    for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, v);
    }
    fixture.appendChild(el);
    document.body.appendChild(fixture);
    return { el, fixture };
}

/**
 * Flush the microtask queue. After awaiting this, all queueMicrotask() callbacks
 * that were scheduled synchronously before this call will have run.
 */
function flushMicrotasks() {
    return new Promise(r => queueMicrotask(r));
}

// ─────────────────────────────────────────────────────────────────────────────
// All hooks and describe blocks are wrapped in a single outer describe so that
// before/beforeEach/afterEach/after are scoped to this suite only and do not
// pollute the root Mocha suite shared with the 181 existing tests.
// ─────────────────────────────────────────────────────────────────────────────

describe('StreamGrid Web Component', function () {

    // ── Suite setup ───────────────────────────────────────────────────────────────

    before(async function () {
        this.timeout(5000);

        // Prevent unhandled-rejection noise from StreamGrid.init() during tests that
        // construct real StreamGrid instances. Save and restore around this suite so
        // other test files' fetch mocks (e.g. RestApiAdapter.test.js) remain intact.
        _savedFetch = global.fetch;
        global.fetch = async () => ({ ok: true, json: async () => [{ id: 1, name: 'test' }] });

        // 1. Create a JSDOM window and promote browser globals.
        dom = new JSDOM('<!doctype html><html><body></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
        global.HTMLElement = dom.window.HTMLElement;
        global.customElements = dom.window.customElements;

        // 2. Dynamically import element source files AFTER globals are live.
        //    class-level `extends HTMLElement` and `customElements.define()` both
        //    run here, against the correct JSDOM context.
        const colMod = await import('../../src/webComponent/StreamGridColumn.js');
        const elMod = await import('../../src/webComponent/StreamGridElement.js');
        StreamGridColumn = colMod.StreamGridColumn;
        StreamGridElement = elMod.StreamGridElement;
    });

    after(function () {
        if (dom) dom.window.close();
        global.fetch = _savedFetch;
        delete global.HTMLElement;
        delete global.customElements;
        delete global.window;
        delete global.document;
    });

    beforeEach(function () {
        document.body.innerHTML = '';
    });

    afterEach(function () {
        sinon.restore();
        document.body.innerHTML = '';
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridColumn
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridColumn', () => {
        it('is a valid HTMLElement subclass', () => {
            const el = document.createElement('stream-grid-column');
            expect(el).to.be.instanceof(HTMLElement);
        });

        it("registers as 'stream-grid-column' custom element", () => {
            const ctor = customElements.get('stream-grid-column');
            expect(ctor).to.equal(StreamGridColumn);
        });

        it('notifies closest <stream-grid> parent on connect and disconnect', async () => {
            // Build a connected parent so closest() can find it
            const { el } = makeHost({ src: 'http://api.test/data', table: 'items' });
            await flushMicrotasks();
            const spy = sinon.spy(el, '_reinit');

            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'email');
            el.appendChild(col);           // connectedCallback → _scheduleReinit → _reinit
            await flushMicrotasks();

            el.removeChild(col);           // disconnectedCallback → _scheduleReinit → _reinit
            await flushMicrotasks();

            expect(spy.callCount).to.equal(2);
        });

        it('attribute change on a connected column notifies the parent <stream-grid>', async () => {
            const { el } = makeHost({ src: 'http://api.test/data', table: 'items' });
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'name');
            el.appendChild(col);
            await flushMicrotasks();

            const spy = sinon.spy(el, '_reinit');
            col.setAttribute('label', 'Full Name');   // attributeChangedCallback → _scheduleReinit → _reinit
            await flushMicrotasks();

            expect(spy.callCount).to.equal(1);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — registration and basics
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — registration and basics', () => {
        it("registers as 'stream-grid' custom element", () => {
            const ctor = customElements.get('stream-grid');
            expect(ctor).to.equal(StreamGridElement);
        });

        it('element.grid is null before connection', () => {
            const el = document.createElement('stream-grid');
            expect(el.grid).to.be.null;
        });

        it('static observedAttributes includes all seven mapped attributes', () => {
            const attrs = StreamGridElement.observedAttributes;
            expect(attrs).to.include('src');
            expect(attrs).to.include('table');
            expect(attrs).to.include('page-size');
            expect(attrs).to.include('pagination-mode');
            expect(attrs).to.include('filter-mode');
            expect(attrs).to.include('filter-debounce');
            expect(attrs).to.include('sort-mode');
            expect(attrs).to.have.length(7);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — connectedCallback
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — connectedCallback', () => {
        it('assigns a unique id if none is set', () => {
            const { el } = makeHost({ src: 'http://api.test/data', table: 'items' });
            expect(el.id).to.match(/^sg-host-\d+$/);
        });

        it('preserves an existing id attribute', () => {
            const fixture = document.createElement('div');
            const el = document.createElement('stream-grid');
            el.setAttribute('id', 'my-custom-id');
            el.setAttribute('src', 'http://api.test/data');
            el.setAttribute('table', 'items');
            fixture.appendChild(el);
            document.body.appendChild(fixture);
            expect(el.id).to.equal('my-custom-id');
        });

        it('element.grid is a StreamGrid instance after connection (with src)', async () => {
            const { el } = makeHost({ src: 'http://api.test/data', table: 'items' });
            await flushMicrotasks();
            expect(el.grid).to.be.instanceof(StreamGrid);
        });

        it('element.grid is null after connection with no src (fallback)', async () => {
            const warnStub = sinon.stub(console, 'warn');
            const { el } = makeHost({});
            await flushMicrotasks();
            warnStub.restore();
            expect(el.grid).to.be.null;
        });

        it('console.warn is called when no src is provided', async () => {
            const warnStub = sinon.stub(console, 'warn');
            makeHost({});
            await flushMicrotasks();
            expect(warnStub.calledOnce).to.be.true;
            expect(warnStub.firstCall.args[0]).to.include('no data source');
            warnStub.restore();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — _parseAttributes()
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — _parseAttributes()', () => {
        it('src attribute creates a RestApiAdapter with the correct baseUrl', () => {
            const el = document.createElement('stream-grid');
            el.setAttribute('src', 'https://api.example.com/');
            const opts = el._parseAttributes();
            expect(opts.dataAdapter).to.be.instanceof(RestApiAdapter);
            expect(opts.dataAdapter.baseUrl).to.equal('https://api.example.com/');
        });

        it('table attribute maps to options.table', () => {
            const el = document.createElement('stream-grid');
            el.setAttribute('table', 'users');
            const opts = el._parseAttributes();
            expect(opts.table).to.equal('users');
        });

        it('page-size attribute maps to options.pageSize as a Number', () => {
            const el = document.createElement('stream-grid');
            el.setAttribute('page-size', '25');
            const opts = el._parseAttributes();
            expect(opts.pageSize).to.equal(25);
            expect(opts.pageSize).to.be.a('number');
        });

        it('pagination-mode attribute maps to options.paginationMode', () => {
            const el = document.createElement('stream-grid');
            el.setAttribute('pagination-mode', 'infinite');
            const opts = el._parseAttributes();
            expect(opts.paginationMode).to.equal('infinite');
        });

        it('filter-mode attribute maps to options.filterMode', () => {
            const el = document.createElement('stream-grid');
            el.setAttribute('filter-mode', 'server');
            const opts = el._parseAttributes();
            expect(opts.filterMode).to.equal('server');
        });

        it('filter-debounce attribute maps to options.filterDebounceTime as a Number', () => {
            const el = document.createElement('stream-grid');
            el.setAttribute('filter-debounce', '500');
            const opts = el._parseAttributes();
            expect(opts.filterDebounceTime).to.equal(500);
            expect(opts.filterDebounceTime).to.be.a('number');
        });

        it('sort-mode attribute maps to options.sortMode', () => {
            const el = document.createElement('stream-grid');
            el.setAttribute('sort-mode', 'client');
            const opts = el._parseAttributes();
            expect(opts.sortMode).to.equal('client');
        });

        it('absent optional attributes are omitted from options (not present as undefined)', () => {
            const el = document.createElement('stream-grid');
            const opts = el._parseAttributes();
            expect(opts).to.not.have.property('dataAdapter');
            expect(opts).to.not.have.property('table');
            expect(opts).to.not.have.property('pageSize');
            expect(opts).to.not.have.property('paginationMode');
            expect(opts).to.not.have.property('filterMode');
            expect(opts).to.not.have.property('filterDebounceTime');
            expect(opts).to.not.have.property('sortMode');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — column children (_parseColumns)
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — column children (_parseColumns)', () => {
        it('no column children produces an empty columns array', () => {
            const el = document.createElement('stream-grid');
            expect(el._parseColumns()).to.deep.equal([]);
        });

        it('field attribute maps to column.field', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'name');
            el.appendChild(col);
            const cols = el._parseColumns();
            expect(cols[0].field).to.equal('name');
        });

        it('label attribute maps to column.label', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'name');
            col.setAttribute('label', 'Full Name');
            el.appendChild(col);
            const cols = el._parseColumns();
            expect(cols[0].label).to.equal('Full Name');
        });

        it('sortable="false" maps to column.sortable = false', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'price');
            col.setAttribute('sortable', 'false');
            el.appendChild(col);
            const cols = el._parseColumns();
            expect(cols[0].sortable).to.be.false;
        });

        it('width attribute maps to column.width', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'sku');
            col.setAttribute('width', '100px');
            el.appendChild(col);
            const cols = el._parseColumns();
            expect(cols[0].width).to.equal('100px');
        });

        it('multiple column children produce multiple entries in the correct order', () => {
            const el = document.createElement('stream-grid');
            ['id', 'name', 'email'].forEach(f => {
                const col = document.createElement('stream-grid-column');
                col.setAttribute('field', f);
                el.appendChild(col);
            });
            const cols = el._parseColumns();
            expect(cols).to.have.length(3);
            expect(cols[0].field).to.equal('id');
            expect(cols[1].field).to.equal('name');
            expect(cols[2].field).to.equal('email');
        });

        it('column children deeper than direct children are not selected', () => {
            const el = document.createElement('stream-grid');
            const wrapper = document.createElement('div');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'hidden');
            wrapper.appendChild(col);
            el.appendChild(wrapper);
            const cols = el._parseColumns();
            expect(cols).to.have.length(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — attributeChangedCallback batching
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — attributeChangedCallback batching', () => {
        it('single attribute change triggers exactly one _reinit() call', async () => {
            const { el } = makeHost({ src: 'http://api.test/v1', table: 'items' });
            await flushMicrotasks(); // let the initial connectedCallback reinit settle
            const spy = sinon.spy(el, '_reinit');
            el.setAttribute('page-size', '20');
            await flushMicrotasks();
            expect(spy.callCount).to.equal(1);
        });

        it('two synchronous attribute changes trigger exactly one _reinit() call', async () => {
            const { el } = makeHost({ src: 'http://api.test/v1', table: 'items' });
            await flushMicrotasks();
            const spy = sinon.spy(el, '_reinit');
            el.setAttribute('page-size', '20');
            el.setAttribute('sort-mode', 'client');
            await flushMicrotasks();
            expect(spy.callCount).to.equal(1);
        });

        it('five synchronous attribute changes trigger exactly one _reinit() call', async () => {
            const { el } = makeHost({ src: 'http://api.test/v1', table: 'items' });
            await flushMicrotasks();
            const spy = sinon.spy(el, '_reinit');
            el.setAttribute('page-size', '5');
            el.setAttribute('sort-mode', 'server');
            el.setAttribute('filter-mode', 'server');
            el.setAttribute('pagination-mode', 'infinite');
            el.setAttribute('filter-debounce', '200');
            await flushMicrotasks();
            expect(spy.callCount).to.equal(1);
        });

        it('attributeChangedCallback with identical old/new values is a no-op', async () => {
            const { el } = makeHost({ src: 'http://api.test/v1', 'page-size': '10', table: 'items' });
            await flushMicrotasks();
            const spy = sinon.spy(el, '_reinit');
            // Setting the same value triggers attributeChangedCallback(old === new) which returns early
            el.setAttribute('page-size', '10');
            await flushMicrotasks();
            expect(spy.callCount).to.equal(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — src swap semantics
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — src swap semantics', () => {
        it('changing src replaces element.grid with a new StreamGrid instance', async () => {
            const { el } = makeHost({ src: 'http://api.test/v1', table: 'items' });
            await flushMicrotasks();
            const oldGrid = el.grid;
            el.setAttribute('src', 'http://api.test/v2');
            await flushMicrotasks();
            expect(el.grid).to.be.instanceof(StreamGrid);
            expect(el.grid).to.not.equal(oldGrid);
        });

        it('the new instance is not the same reference as the old one', async () => {
            const { el } = makeHost({ src: 'http://api.test/v1', table: 'a' });
            await flushMicrotasks();
            const first = el.grid;
            el.setAttribute('src', 'http://api.test/v2');
            await flushMicrotasks();
            const second = el.grid;
            expect(second).to.not.equal(first);
        });

        it('container innerHTML is cleared before the new instance is constructed', async () => {
            const { el } = makeHost({ src: 'http://api.test/v1', table: 'items' });
            // Add a sentinel element inside the host to verify it is cleared by _reinit()
            const sentinel = document.createElement('span');
            sentinel.className = 'old-content';
            el.appendChild(sentinel);
            el.setAttribute('src', 'http://api.test/v2');
            await flushMicrotasks();
            // _reinit() calls this.innerHTML = '' before constructing the new instance
            expect(el.querySelector('.old-content')).to.be.null;
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — disconnectedCallback
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — disconnectedCallback', () => {
        it('element.grid is null after element is removed from the DOM', async () => {
            const { el, fixture } = makeHost({ src: 'http://api.test/data', table: 'items' });
            await flushMicrotasks();
            expect(el.grid).to.be.instanceof(StreamGrid);
            fixture.removeChild(el);
            expect(el.grid).to.be.null;
        });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — dynamic column mutation
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — dynamic column mutation', () => {
        it('dynamically adding a <stream-grid-column> triggers a reinit with the new column', async () => {
            const { el } = makeHost({ src: 'http://api.test/data', table: 'items' });
            await flushMicrotasks();

            const spy = sinon.spy(el, '_reinit');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'email');
            el.appendChild(col);
            await flushMicrotasks();

            expect(spy.callCount).to.equal(1);
            expect(el._parseColumns().some(c => c.field === 'email')).to.be.true;
        });

        it('dynamically removing a <stream-grid-column> triggers a reinit without that column', async () => {
            const { el } = makeHost({ src: 'http://api.test/data', table: 'items' });
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'email');
            el.appendChild(col);
            await flushMicrotasks();

            const spy = sinon.spy(el, '_reinit');
            el.removeChild(col);
            await flushMicrotasks();

            expect(spy.callCount).to.equal(1);
            expect(el._parseColumns().some(c => c.field === 'email')).to.be.false;
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // StreamGridElement — Phase A: sorter and filter attributes
    // ─────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — Phase A: sorter and filter attributes', () => {

        it('passes sorter attribute on <stream-grid-column> to column definition', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'name');
            col.setAttribute('sorter', 'string');
            el.appendChild(col);
            const opts = el._buildOptions();
            expect(opts.columns[0].sorter).to.equal('string');
        });

        it('passes sorter="number" to the columns array', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'age');
            col.setAttribute('sorter', 'number');
            el.appendChild(col);
            const opts = el._buildOptions();
            expect(opts.columns[0].sorter).to.equal('number');
        });

        it('passes sorter="date" to the columns array', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'joined');
            col.setAttribute('sorter', 'date');
            el.appendChild(col);
            const opts = el._buildOptions();
            expect(opts.columns[0].sorter).to.equal('date');
        });

        it('filter attribute on <stream-grid-column> adds field to options.filters', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'email');
            col.setAttribute('filter', '');
            el.appendChild(col);
            const opts = el._buildOptions();
            expect(opts.filters).to.deep.equal(['email']);
        });

        it('filter attribute on multiple columns builds a filters array with all fields', () => {
            const el = document.createElement('stream-grid');
            const fields = ['name', 'email', 'status'];
            fields.forEach(f => {
                const col = document.createElement('stream-grid-column');
                col.setAttribute('field', f);
                col.setAttribute('filter', '');
                el.appendChild(col);
            });
            const opts = el._buildOptions();
            expect(opts.filters).to.deep.equal(['name', 'email', 'status']);
        });

        it('columns without filter attribute are not added to filters array', () => {
            const el = document.createElement('stream-grid');
            const withFilter = document.createElement('stream-grid-column');
            withFilter.setAttribute('field', 'email');
            withFilter.setAttribute('filter', '');
            const withoutFilter = document.createElement('stream-grid-column');
            withoutFilter.setAttribute('field', 'name');
            el.appendChild(withFilter);
            el.appendChild(withoutFilter);
            const opts = el._buildOptions();
            expect(opts.filters).to.deep.equal(['email']);
        });

        it('filters array is absent from options when no column has filter attribute', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'name');
            el.appendChild(col);
            const opts = el._buildOptions();
            expect(opts).to.not.have.property('filters');
        });

        it('_filter flag is not present on column definitions passed to StreamGrid', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'email');
            col.setAttribute('filter', '');
            el.appendChild(col);
            const opts = el._buildOptions();
            expect(opts.columns[0]).to.not.have.property('_filter');
        });

    });

    // ─────────────────────────────────────────────────────────────────────────────
    // StreamGridElement — declarative template rendering
    // ─────────────────────────────────────────────────────────────────────────────

    describe('StreamGridElement — declarative template rendering', () => {

        it('template attribute synthesises a render function on the column definition', () => {
            const tpl = document.createElement('template');
            tpl.id = 'test-tpl';
            tpl.innerHTML = '<span>{{value}}</span>';
            document.body.appendChild(tpl);

            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'status');
            col.setAttribute('template', 'test-tpl');
            el.appendChild(col);

            const cols = el._parseColumns();
            expect(cols[0]).to.have.property('render');
            expect(cols[0].render).to.be.a('function');
        });

        it('render function escapes interpolated values (XSS safe)', () => {
            const tpl = document.createElement('template');
            tpl.id = 'xss-tpl';
            tpl.innerHTML = '<span class="badge">{{value}}</span>';
            document.body.appendChild(tpl);

            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'status');
            col.setAttribute('template', 'xss-tpl');
            el.appendChild(col);

            const cols = el._parseColumns();
            const result = cols[0].render('<script>alert("xss")</script>', {});
            expect(result).to.equal('<span class="badge">&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</span>');
            expect(result).to.not.contain('<script>');
        });

        it('render function substitutes {{row.field}} tokens with escaped values', () => {
            const tpl = document.createElement('template');
            tpl.id = 'row-tpl';
            tpl.innerHTML = '<a href="/users/{{row.id}}">{{value}}</a>';
            document.body.appendChild(tpl);

            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'name');
            col.setAttribute('template', 'row-tpl');
            el.appendChild(col);

            const cols = el._parseColumns();
            const result = cols[0].render('Alice', { id: 42, name: 'Alice' });
            expect(result).to.equal('<a href="/users/42">Alice</a>');
        });

        it('missing template ID falls back to plain value display (no render function)', () => {
            const warnStub = sinon.stub(console, 'warn');

            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'status');
            col.setAttribute('template', 'nonexistent-tpl');
            el.appendChild(col);

            const cols = el._parseColumns();
            expect(cols[0]).to.not.have.property('render');
            expect(warnStub.calledOnce).to.be.true;
            expect(warnStub.firstCall.args[0]).to.include('nonexistent-tpl');

            warnStub.restore();
        });

        it('column without template attribute has no render function', () => {
            const el = document.createElement('stream-grid');
            const col = document.createElement('stream-grid-column');
            col.setAttribute('field', 'name');
            el.appendChild(col);

            const cols = el._parseColumns();
            expect(cols[0]).to.not.have.property('render');
        });
    });

}); // describe('StreamGrid Web Component')
