import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

// ── Shared mock adapter factory ───────────────────────────────────────────────

/**
 * Returns a fresh mock adapter backed by 30 predictable rows: { id: 1..30 }.
 * getColumns returns [{ field: 'id', label: 'ID' }] by default.
 */
function makeMockAdapter(colOverride) {
    return {
        async getColumns() { return colOverride ?? [{ field: 'id', label: 'ID' }]; },
        async fetchData() {
            return Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));
        },
        async insertRow(table, data) { return data; },
        async updateRow(table, id, data) { return data; },
        async deleteRow() { return true; }
    };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('StreamGrid - exportConfig()', () => {
    let dom;

    beforeEach(() => {
        dom = new JSDOM('<!doctype html><html><body><div id="grid"></div><div id="scroll-el"></div></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
    });

    afterEach(() => {
        dom.window.close();
        delete global.window;
        delete global.document;
    });

    // 1. exportConfig() returns a plain object
    it('returns a plain object', async () => {
        const grid = new StreamGrid('#grid', { dataAdapter: makeMockAdapter(), table: 'users', loadDefaultCss: false });
        await grid.init();
        const result = grid.exportConfig();
        expect(result).to.be.an('object');
        expect(result).to.not.be.null;
        expect(result).to.not.be.instanceof(StreamGrid);
    });

    // 2. Round-trip: clean through JSON.stringify
    it('round-trips cleanly through JSON.stringify (no undefined, no functions, no circular refs)', async () => {
        const grid = new StreamGrid('#grid', { dataAdapter: makeMockAdapter(), table: 'users', loadDefaultCss: false });
        await grid.init();
        const result = grid.exportConfig();
        const rt = JSON.parse(JSON.stringify(result));
        expect(rt).to.deep.equal(result);
    });

    // 3. version is 1
    it('exports version: 1', async () => {
        const grid = new StreamGrid('#grid', { dataAdapter: makeMockAdapter(), table: 'users', loadDefaultCss: false });
        await grid.init();
        expect(grid.exportConfig().version).to.equal(1);
    });

    // 4. table matches constructor option
    it('exports the correct table name', async () => {
        const grid = new StreamGrid('#grid', { dataAdapter: makeMockAdapter(), table: 'orders', loadDefaultCss: false });
        await grid.init();
        expect(grid.exportConfig().table).to.equal('orders');
    });

    // 5. Resolved columns are exported (not empty array)
    it('exports resolved columns after init', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: makeMockAdapter([{ field: 'id', label: 'ID' }]),
            table: 'users',
            loadDefaultCss: false
        });
        await grid.init();
        const result = grid.exportConfig();
        expect(result.columns).to.have.length(1);
        expect(result.columns[0].field).to.equal('id');
    });

    // 6. Column render functions are stripped
    it('strips render functions from exported columns', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: makeMockAdapter(),
            table: 'users',
            columns: [{ field: 'name', label: 'Name', render: () => '<b>x</b>' }],
            loadDefaultCss: false
        });
        await grid.init();
        const result = grid.exportConfig();
        expect('render' in result.columns[0]).to.be.false;
    });

    // 7. Non-function column properties survive stripping
    it('preserves non-function column properties after stripping', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: makeMockAdapter(),
            table: 'users',
            columns: [{ field: 'name', label: 'Name', render: () => '<b>x</b>' }],
            loadDefaultCss: false
        });
        await grid.init();
        const result = grid.exportConfig();
        expect(result.columns[0].field).to.equal('name');
        expect(result.columns[0].label).to.equal('Name');
    });

    // 8. currentPage defaults to 1
    it('exports currentPage as 1 on a freshly constructed grid', async () => {
        const grid = new StreamGrid('#grid', { dataAdapter: makeMockAdapter(), table: 'users', loadDefaultCss: false });
        await grid.init();
        expect(grid.exportConfig().currentPage).to.equal(1);
    });

    // 9. currentPage reflects navigation
    it('exports currentPage reflecting a goToPage() call', async () => {
        const grid = new StreamGrid('#grid', { dataAdapter: makeMockAdapter(), table: 'users', loadDefaultCss: false });
        await grid.init();
        grid.goToPage(3);
        expect(grid.exportConfig().currentPage).to.equal(3);
    });

    // 10. currentFilterText defaults to ''
    it('exports currentFilterText as empty string by default', async () => {
        const grid = new StreamGrid('#grid', { dataAdapter: makeMockAdapter(), table: 'users', loadDefaultCss: false });
        await grid.init();
        expect(grid.exportConfig().currentFilterText).to.equal('');
    });

    // 11. scrollContainer exports the selector string
    it('exports scrollContainer as the original selector string', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: makeMockAdapter(),
            table: 'users',
            scrollContainer: '#scroll-el',
            loadDefaultCss: false
        });
        await grid.init();
        const result = grid.exportConfig();
        expect(result.scrollContainer).to.equal('#scroll-el');
        expect(typeof result.scrollContainer).to.equal('string');
    });

    // 12. infiniteScrollTotalLimit is null when not set
    it('exports infiniteScrollTotalLimit as null when not configured', async () => {
        const grid = new StreamGrid('#grid', { dataAdapter: makeMockAdapter(), table: 'users', loadDefaultCss: false });
        await grid.init();
        expect(grid.exportConfig().infiniteScrollTotalLimit).to.equal(null);
    });

    // 13. Round-trip restores currentPage and renders correct rows
    it('restores currentPage from snapshot and renderBody() uses that page', async () => {
        const adapter = makeMockAdapter(['id']);
        const grid1 = new StreamGrid('#grid', {
            dataAdapter: adapter,
            table: 'users',
            columns: ['id'],
            pageSize: 10,
            loadDefaultCss: false
        });
        await grid1.init();
        grid1.goToPage(3);

        const snapshot = grid1.exportConfig();

        // Build a fresh DOM node for grid2
        const container2 = document.createElement('div');
        container2.id = 'grid2';
        document.body.appendChild(container2);

        const grid2 = new StreamGrid('#grid2', { ...snapshot, dataAdapter: adapter, loadDefaultCss: false });
        await grid2.init();

        expect(grid2.currentPage).to.equal(3);
        // Page 3 with pageSize 10 starts at index 20 → first row id = 21
        const firstCellText = grid2.tbodyElement.rows[0].cells[0].textContent;
        expect(firstCellText).to.equal('21');
    });

    // 14. Version mismatch throws with correct message
    it('throws when snapshot version is higher than supported', () => {
        const throwingFn = () => new StreamGrid('#grid', {
            dataAdapter: makeMockAdapter(),
            table: 'users',
            version: 2,
            loadDefaultCss: false
        });
        expect(throwingFn).to.throw(/version 2/);
        expect(throwingFn).to.throw(/max: 1/);
    });

    // 15. Full round-trip: all non-default options survive export → reconstruct → re-export
    it('full round-trip: snap1 and snap2 are identical when all options are set', async () => {
        const adapter = makeMockAdapter();
        const opts = {
            dataAdapter: adapter,
            table: 'products',
            columns: [{ field: 'id', label: 'ID' }],
            filters: ['id'],
            pagination: true,
            paginationMode: 'numbers',
            pageSize: 5,
            paginationFirstLastButtons: false,
            paginationPrevNextText: { prev: 'Prev', next: 'Next' },
            paginationFirstLastText: { first: 'First', last: 'Last' },
            paginationOptions: { maxPageButtons: 3 },
            filterDebounceTime: 500,
            filterCaseSensitive: true,
            filterMode: 'client',
            clientFilterThreshold: 500,
            loadDefaultCss: false
        };

        const grid1 = new StreamGrid('#grid', opts);
        await grid1.init();
        const snap1 = grid1.exportConfig();

        // Reconstruct in a fresh element
        const el2 = document.createElement('div');
        el2.id = 'grid-rt';
        document.body.appendChild(el2);

        const grid2 = new StreamGrid('#grid-rt', { ...snap1, dataAdapter: adapter });
        await grid2.init();
        const snap2 = grid2.exportConfig();

        expect(JSON.stringify(snap1)).to.equal(JSON.stringify(snap2));
    });
});
