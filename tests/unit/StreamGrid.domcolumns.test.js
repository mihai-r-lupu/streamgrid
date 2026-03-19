import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';
import sinon from 'sinon';

// ─────────────────────────────────────────────────────────────────────────────
// StreamGrid — columns: 'dom'
// ─────────────────────────────────────────────────────────────────────────────

describe('StreamGrid — columns: "dom"', () => {
    let dom;
    let container;

    beforeEach(() => {
        dom = new JSDOM('<!doctype html><html><body></body></html>');
        global.window   = dom.window;
        global.document = dom.window.document;
    });

    afterEach(() => {
        sinon.restore();
        dom.window.close();
        delete global.window;
        delete global.document;
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Returns a minimal mock adapter with optional row data.
     * fetchData resolves synchronously (via Promise.resolve) for test speed.
     */
    function makeAdapter(rows = [], columns = []) {
        return {
            getColumns: async () => columns,
            fetchData:  async () => rows,
            insertRow:  async () => ({}),
            updateRow:  async () => ({}),
            deleteRow:  async () => true,
        };
    }

    /**
     * Builds a container div with an optional hand-authored <table> inside,
     * appends it to document.body, and returns it.
     * The innerHTML argument is the raw markup to put inside the div.
     */
    function makeContainer(innerHTML = '') {
        const div = document.createElement('div');
        div.id = 'sg-test';
        if (innerHTML) div.innerHTML = innerHTML;
        document.body.appendChild(div);
        return div;
    }

    /**
     * Constructs a StreamGrid with `columns: 'dom'` using the given container HTML.
     * Returns the grid instance; init() has NOT been awaited unless you need it.
     */
    function makeGrid(tableHtml, adapterOpts = {}) {
        const rows    = adapterOpts.rows    || [];
        const cols    = adapterOpts.cols    || [];
        const options = adapterOpts.options || {};

        makeContainer(tableHtml);
        return new StreamGrid('#sg-test', {
            dataAdapter: makeAdapter(rows, cols),
            table: 'items',
            columns: 'dom',
            ...options,
        });
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    it('reads field and label from <th> elements', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="name">Full Name</th>
                <th data-field="email">Email</th>
            </tr></thead></table>
        `);
        expect(grid.columns[0]).to.deep.include({ field: 'name', label: 'Full Name' });
        expect(grid.columns[1]).to.deep.include({ field: 'email', label: 'Email' });
    });

    it('uses th.textContent.trim() as label when data-sg-label is absent', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="status">  Status  </th>
            </tr></thead></table>
        `);
        expect(grid.columns[0].label).to.equal('Status');
    });

    it('prefers data-sg-label over th.textContent when both are present', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="joined" data-sg-label="Date Joined">Joined</th>
            </tr></thead></table>
        `);
        expect(grid.columns[0].label).to.equal('Date Joined');
    });

    it('falls back to data-field as label when both data-sg-label and textContent are absent/empty', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="sku"></th>
            </tr></thead></table>
        `);
        expect(grid.columns[0].label).to.equal('sku');
    });

    it('reads data-sg-sortable="false" and sets sortable: false on column', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="status" data-sg-sortable="false">Status</th>
            </tr></thead></table>
        `);
        expect(grid.columns[0].sortable).to.be.false;
    });

    it('does not set sortable property when data-sg-sortable is absent', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="name">Name</th>
            </tr></thead></table>
        `);
        expect(grid.columns[0]).to.not.have.property('sortable');
    });

    it('reads data-sg-sorter and passes it through to column definition', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="age" data-sg-sorter="number">Age</th>
            </tr></thead></table>
        `);
        expect(grid.columns[0].sorter).to.equal('number');
    });

    it('reads data-sg-filter and adds field to this.filters', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="email" data-sg-filter>Email</th>
            </tr></thead></table>
        `);
        expect(grid.filters).to.include('email');
    });

    it('reads data-sg-width and adds it to column definition', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="sku" data-sg-width="120px">SKU</th>
            </tr></thead></table>
        `);
        expect(grid.columns[0].width).to.equal('120px');
    });

    it('builds filters array only from columns that have data-sg-filter', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="name">Name</th>
                <th data-field="email" data-sg-filter>Email</th>
                <th data-field="status">Status</th>
                <th data-field="city" data-sg-filter>City</th>
            </tr></thead></table>
        `);
        expect(grid.filters).to.deep.equal(['email', 'city']);
    });

    it('does not overwrite existing options.filters when no data-sg-filter attributes present', () => {
        makeContainer(`
            <table><thead><tr>
                <th data-field="name">Name</th>
            </tr></thead></table>
        `);
        const grid = new StreamGrid('#sg-test', {
            dataAdapter: makeAdapter(),
            table: 'items',
            columns: 'dom',
            filters: ['name'],
        });
        // No data-sg-filter on any <th>, so _parseColumnsFromDOM should not overwrite
        expect(grid.filters).to.deep.equal(['name']);
    });

    it('multiple columns: correctly builds both columns array and filters array', () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="id">ID</th>
                <th data-field="name" data-sg-filter>Full Name</th>
                <th data-field="age"  data-sg-sorter="number">Age</th>
                <th data-field="email" data-sg-filter data-sg-sortable="false">Email</th>
                <th data-field="status" data-sg-width="80px">Status</th>
            </tr></thead></table>
        `);
        expect(grid.columns).to.have.length(5);
        expect(grid.columns[0]).to.deep.include({ field: 'id',    label: 'ID' });
        expect(grid.columns[1]).to.deep.include({ field: 'name',  label: 'Full Name' });
        expect(grid.columns[2]).to.deep.include({ field: 'age',   label: 'Age', sorter: 'number' });
        expect(grid.columns[3].sortable).to.be.false;
        expect(grid.columns[4].width).to.equal('80px');
        expect(grid.filters).to.deep.equal(['name', 'email']);
    });

    // ── Fallback / empty ──────────────────────────────────────────────────────

    it('warns and leaves this.columns empty when no <thead> found', () => {
        const warnStub = sinon.stub(console, 'warn');
        const grid = makeGrid('<table></table>');
        expect(warnStub.calledWithMatch(/no <th> elements/)).to.be.true;
        expect(grid.columns).to.deep.equal([]);
        warnStub.restore();
    });

    it('warns and leaves this.columns empty when <thead> has no <th> elements', () => {
        const warnStub = sinon.stub(console, 'warn');
        const grid = makeGrid('<table><thead><tr></tr></thead></table>');
        expect(warnStub.calledWithMatch(/no <th> elements/)).to.be.true;
        expect(grid.columns).to.deep.equal([]);
        warnStub.restore();
    });

    it('falling back to empty columns proceeds to adapter auto-discovery in init()', async () => {
        // When no <th>s are found, columns remains []; init() will call getColumns().
        const getColumnsStub = sinon.stub().resolves(['name', 'email']);
        sinon.stub(console, 'warn'); // suppress the expected warning
        makeContainer('<table></table>');
        const adapter = {
            getColumns: getColumnsStub,
            fetchData:  async () => [],
            insertRow:  async () => ({}),
            updateRow:  async () => ({}),
            deleteRow:  async () => true,
        };
        const grid = new StreamGrid('#sg-test', {
            dataAdapter: adapter,
            table: 'items',
            columns: 'dom',
        });
        await new Promise(r => setTimeout(r, 50)); // let init() async settle
        expect(getColumnsStub.calledOnce).to.be.true;
    });

    // ── Validation / error ────────────────────────────────────────────────────

    it('throws before clearing container when a <th> is missing data-field', () => {
        makeContainer(`
            <table><thead><tr>
                <th data-field="name">Name</th>
                <th>No field here</th>
            </tr></thead></table>
        `);
        expect(() => {
            new StreamGrid('#sg-test', {
                dataAdapter: makeAdapter(),
                table: 'items',
                columns: 'dom',
            });
        }).to.throw(Error, /data-field/);
    });

    it('error message includes the 0-based index of the offending <th>', () => {
        makeContainer(`
            <table><thead><tr>
                <th data-field="id">ID</th>
                <th data-field="name">Name</th>
                <th>Missing field</th>
            </tr></thead></table>
        `);
        let caught;
        try {
            new StreamGrid('#sg-test', {
                dataAdapter: makeAdapter(),
                table: 'items',
                columns: 'dom',
            });
        } catch (e) {
            caught = e;
        }
        expect(caught).to.exist;
        expect(caught.message).to.include('index 2');
    });

    it('container DOM is preserved when the throw occurs (not cleared)', () => {
        makeContainer(`
            <table><thead><tr>
                <th data-field="name">Name</th>
                <th>Bad</th>
            </tr></thead></table>
        `);
        const containerEl = document.getElementById('sg-test');
        let threw = false;
        try {
            new StreamGrid('#sg-test', {
                dataAdapter: makeAdapter(),
                table: 'items',
                columns: 'dom',
            });
        } catch {
            threw = true;
        }
        expect(threw).to.be.true;
        // The <table> should still be present — container was not cleared
        expect(containerEl.querySelector('table')).to.not.be.null;
    });

    // ── Integration ───────────────────────────────────────────────────────────

    it('full round-trip: columns: "dom" grid renders correct column headers', async () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="name">Full Name</th>
                <th data-field="age"  data-sg-sorter="number">Age</th>
            </tr></thead></table>
        `, { rows: [{ name: 'Alice', age: 30 }] });
        await new Promise(r => setTimeout(r, 50));
        const ths = [...grid.theadElement.querySelectorAll('th')];
        expect(ths.map(th => th.textContent.trim())).to.deep.equal(['Full Name', 'Age']);
    });

    it('full round-trip: columns: "dom" grid renders data rows in correct columns', async () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="name">Name</th>
                <th data-field="city">City</th>
            </tr></thead></table>
        `, { rows: [{ name: 'Alice', city: 'London' }] });
        await new Promise(r => setTimeout(r, 50));
        const tds = [...grid.tbodyElement.querySelectorAll('tr td')];
        expect(tds[0].textContent.trim()).to.equal('Alice');
        expect(tds[1].textContent.trim()).to.equal('London');
    });

    it('columns: "dom" with data-sg-filter renders filter input for those fields', async () => {
        const grid = makeGrid(`
            <table><thead><tr>
                <th data-field="name" data-sg-filter>Name</th>
                <th data-field="email">Email</th>
            </tr></thead></table>
        `);
        await new Promise(r => setTimeout(r, 50));
        expect(grid.filterInput).to.not.be.null;
    });

    it('columns: "dom" does not interfere with existing columns: [...] path', () => {
        makeContainer('<div id="sg-test2"></div>');
        const container2 = document.getElementById('sg-test2');
        // This should work exactly as before — no DOM parsing when columns is an array
        const grid = new StreamGrid('#sg-test2', {
            dataAdapter: makeAdapter(),
            table: 'items',
            columns: [{ field: 'name', label: 'Name' }],
        });
        expect(grid.columns).to.deep.equal([{ field: 'name', label: 'Name' }]);
    });
});
