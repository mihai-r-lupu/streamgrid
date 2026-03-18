import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';
import sinon from 'sinon';

// ---------------------------------------------------------------------------
// Shared test setup
// ---------------------------------------------------------------------------

describe('StreamGrid — Sorting', () => {
    let container;

    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><div id="grid"></div></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
        container = document.getElementById('grid');
    });

    afterEach(() => {
        sinon.restore();
        global.window.close();
        delete global.window;
        delete global.document;
    });

    // -------------------------------------------------------------------------
    // Shared mock adapter + helper
    // -------------------------------------------------------------------------

    const ROWS = [
        { id: 1, name: 'Charlie', age: 30, dob: '1994-03-15', score: 85 },
        { id: 2, name: 'alice',   age: 25, dob: '1999-07-01', score: 92 },
        { id: 3, name: 'Bob',     age: 35, dob: '1989-11-20', score: 78 },
        { id: 4, name: 'Dave',    age: 25, dob: '1999-01-10', score: 95 },
        { id: 5, name: 'Eve',     age: 40, dob: '1984-06-05', score: 60 },
    ];

    function makeAdapter(rows = ROWS) {
        return {
            async getColumns() { return ['id', 'name', 'age', 'dob', 'score']; },
            async fetchData()  { return rows; },
            async insertRow()  {},
            async updateRow()  {},
            async deleteRow()  {},
        };
    }

    async function makeGrid(opts = {}) {
        const grid = new StreamGrid('#grid', {
            dataAdapter: makeAdapter(opts.adapterRows ?? ROWS),
            table: 'test',
            columns: opts.columns ?? ['id', 'name', 'age', 'dob', 'score'],
            ...opts,
        });
        await new Promise(resolve => grid.on('tableRendered', resolve));
        return grid;
    }

    function clickTh(grid, fieldOrIndex, shiftKey = false) {
        const ths = [...grid.theadElement.querySelectorAll('th')];
        const th = typeof fieldOrIndex === 'number'
            ? ths[fieldOrIndex]
            : ths.find(t => t.dataset.field === fieldOrIndex);
        // _onHeaderSortClick only reads event.shiftKey — a plain object suffices here.
        const event = { shiftKey };
        return grid._onHeaderSortClick(th, event);
    }

    // =========================================================================
    // _buildComparator()
    // =========================================================================

    describe('_buildComparator()', () => {
        it('sorts strings ascending', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            const sorted = [...ROWS].sort(grid._buildComparator());
            expect(sorted.map(r => r.name)).to.deep.equal(['alice', 'Bob', 'Charlie', 'Dave', 'Eve']);
        });

        it('sorts strings descending', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'desc' }] });
            const sorted = [...ROWS].sort(grid._buildComparator());
            expect(sorted.map(r => r.name)).to.deep.equal(['Eve', 'Dave', 'Charlie', 'Bob', 'alice']);
        });

        it('sorts numbers ascending', async () => {
            const grid = await makeGrid({
                sortStack: [{ field: 'age', direction: 'asc' }],
                columns: [{ field: 'age', label: 'Age', sorter: 'number' }],
            });
            const sorted = [...ROWS].sort(grid._buildComparator());
            expect(sorted.map(r => r.age)).to.deep.equal([25, 25, 30, 35, 40]);
        });

        it('sorts numbers descending', async () => {
            const grid = await makeGrid({
                sortStack: [{ field: 'age', direction: 'desc' }],
                columns: [{ field: 'age', label: 'Age', sorter: 'number' }],
            });
            const sorted = [...ROWS].sort(grid._buildComparator());
            expect(sorted.map(r => r.age)).to.deep.equal([40, 35, 30, 25, 25]);
        });

        it('sorts dates ascending (ISO strings)', async () => {
            const grid = await makeGrid({
                sortStack: [{ field: 'dob', direction: 'asc' }],
                columns: [{ field: 'dob', label: 'DOB', sorter: 'date' }],
            });
            const sorted = [...ROWS].sort(grid._buildComparator());
            expect(sorted.map(r => r.dob)).to.deep.equal([
                '1984-06-05', '1989-11-20', '1994-03-15', '1999-01-10', '1999-07-01',
            ]);
        });

        it('sorts dates descending', async () => {
            const grid = await makeGrid({
                sortStack: [{ field: 'dob', direction: 'desc' }],
                columns: [{ field: 'dob', label: 'DOB', sorter: 'date' }],
            });
            const sorted = [...ROWS].sort(grid._buildComparator());
            expect(sorted.map(r => r.dob)).to.deep.equal([
                '1999-07-01', '1999-01-10', '1994-03-15', '1989-11-20', '1984-06-05',
            ]);
        });

        it('uses custom sorter function from column definition', async () => {
            // Sort by score modulo 10 ascending (last digit)
            const customSort = (a, b) => (a % 10) - (b % 10);
            const grid = await makeGrid({
                sortStack: [{ field: 'score', direction: 'asc' }],
                columns: [{ field: 'score', label: 'Score', sorter: customSort }],
            });
            const sorted = [...ROWS].sort(grid._buildComparator());
            // 60→0, 78→8, 85→5, 92→2, 95→5  ⇒ 60, 92, 85, 95, 78
            expect(sorted.map(r => r.score % 10)).to.deep.equal([0, 2, 5, 5, 8]);
        });

        it('falls back to string sorter for unknown sorter type', async () => {
            const grid = await makeGrid({
                sortStack: [{ field: 'id', direction: 'asc' }],
                columns: [{ field: 'id', label: 'ID', sorter: 'unknownType' }],
            });
            // String sort on id: '1' < '2' ... same as natural order for single digits
            const sorted = [...ROWS].sort(grid._buildComparator());
            expect(sorted.map(r => r.id)).to.deep.equal([1, 2, 3, 4, 5]);
        });

        it('places nulls last by default (sortNullsFirst: false)', async () => {
            const rows = [
                { id: 1, name: 'Bob' },
                { id: 2, name: null },
                { id: 3, name: 'Alice' },
            ];
            const grid = await makeGrid({
                adapterRows: rows,
                columns: ['id', 'name'],
                sortStack: [{ field: 'name', direction: 'asc' }],
            });
            const sorted = [...rows].sort(grid._buildComparator());
            expect(sorted.map(r => r.name)).to.deep.equal(['Alice', 'Bob', null]);
        });

        it('places nulls first when sortNullsFirst: true', async () => {
            const rows = [
                { id: 1, name: 'Bob' },
                { id: 2, name: null },
                { id: 3, name: 'Alice' },
            ];
            const grid = await makeGrid({
                adapterRows: rows,
                columns: ['id', 'name'],
                sortStack: [{ field: 'name', direction: 'asc' }],
                sortNullsFirst: true,
            });
            const sorted = [...rows].sort(grid._buildComparator());
            expect(sorted.map(r => r.name)).to.deep.equal([null, 'Alice', 'Bob']);
        });

        it('null === undefined for sort purposes (both treated as absent)', async () => {
            const rows = [
                { id: 1, name: 'Bob' },
                { id: 2, name: undefined },
                { id: 3, name: null },
                { id: 4, name: 'Alice' },
            ];
            const grid = await makeGrid({
                adapterRows: rows,
                columns: ['id', 'name'],
                sortStack: [{ field: 'name', direction: 'asc' }],
            });
            const sorted = [...rows].sort(grid._buildComparator());
            // Both null and undefined go last
            expect(sorted[0].name).to.equal('Alice');
            expect(sorted[1].name).to.equal('Bob');
            expect(sorted[2].name == null).to.be.true;
            expect(sorted[3].name == null).to.be.true;
        });

        it('multi-column: primary sort field used first', async () => {
            const grid = await makeGrid({
                columns: [
                    { field: 'age', label: 'Age', sorter: 'number' },
                    { field: 'name', label: 'Name' },
                ],
                sortStack: [
                    { field: 'age', direction: 'asc' },
                    { field: 'name', direction: 'asc' },
                ],
            });
            const sorted = [...ROWS].sort(grid._buildComparator());
            // Primary: age asc → [25,25,30,35,40]
            expect(sorted[0].age).to.equal(25);
            expect(sorted[4].age).to.equal(40);
        });

        it('multi-column: secondary field used as tiebreaker', async () => {
            const grid = await makeGrid({
                columns: [
                    { field: 'age', label: 'Age', sorter: 'number' },
                    { field: 'name', label: 'Name' },
                ],
                sortStack: [
                    { field: 'age', direction: 'asc' },
                    { field: 'name', direction: 'asc' },
                ],
            });
            const sorted = [...ROWS].sort(grid._buildComparator());
            // Two rows with age=25: alice (id=2) and Dave (id=4). 'alice' < 'Dave' by localeCompare
            const ageTwentyFive = sorted.filter(r => r.age === 25);
            expect(ageTwentyFive[0].name).to.equal('alice');
            expect(ageTwentyFive[1].name).to.equal('Dave');
        });

        it('multi-column: tertiary field used when primary and secondary tie', async () => {
            const rows = [
                { id: 1, a: 1, b: 1, c: 3 },
                { id: 2, a: 1, b: 1, c: 1 },
                { id: 3, a: 1, b: 1, c: 2 },
            ];
            const grid = await makeGrid({
                adapterRows: rows,
                columns: [
                    { field: 'a', label: 'A', sorter: 'number' },
                    { field: 'b', label: 'B', sorter: 'number' },
                    { field: 'c', label: 'C', sorter: 'number' },
                ],
                sortStack: [
                    { field: 'a', direction: 'asc' },
                    { field: 'b', direction: 'asc' },
                    { field: 'c', direction: 'asc' },
                ],
            });
            const sorted = [...rows].sort(grid._buildComparator());
            expect(sorted.map(r => r.c)).to.deep.equal([1, 2, 3]);
        });
    });

    // =========================================================================
    // getSortedRows()
    // =========================================================================

    describe('getSortedRows()', () => {
        it('returns input array unchanged when sortStack is empty', async () => {
            const grid = await makeGrid();
            const rows = [...ROWS];
            const result = grid.getSortedRows(rows);
            expect(result).to.equal(rows);
        });

        it('returns input array unchanged when shouldUseServerSort() is true', async () => {
            const grid = await makeGrid({ sortMode: 'server', sortStack: [{ field: 'name', direction: 'asc' }] });
            const rows = [...ROWS];
            const result = grid.getSortedRows(rows);
            expect(result).to.equal(rows);
        });

        it('does not mutate DataSet.data', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            const before = [...grid.dataSet.data];
            grid.getSortedRows(grid.dataSet.data);
            expect(grid.dataSet.data.map(r => r.id)).to.deep.equal(before.map(r => r.id));
        });

        it('returns a new array (not the same reference)', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            const rows = [...ROWS];
            const result = grid.getSortedRows(rows);
            expect(result).to.not.equal(rows);
        });

        it('sorts correctly for a non-empty stack', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            const sorted = grid.getSortedRows([...ROWS]);
            expect(sorted[0].name).to.equal('alice');
        });
    });

    // =========================================================================
    // _onHeaderSortClick() — plain click
    // =========================================================================

    describe('_onHeaderSortClick() — plain click', () => {
        it('first click on unsorted column: sets asc', async () => {
            const grid = await makeGrid();
            await clickTh(grid, 'name');
            expect(grid.sortStack).to.deep.equal([{ field: 'name', direction: 'asc' }]);
        });

        it('second click on asc column: sets desc', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            await clickTh(grid, 'name');
            expect(grid.sortStack).to.deep.equal([{ field: 'name', direction: 'desc' }]);
        });

        it('third click on desc column: clears stack', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'desc' }] });
            await clickTh(grid, 'name');
            expect(grid.sortStack).to.deep.equal([]);
        });

        it('plain click replaces entire stack (wipes multi-sort)', async () => {
            const grid = await makeGrid({
                sortStack: [
                    { field: 'name', direction: 'asc' },
                    { field: 'age', direction: 'desc' },
                ],
            });
            await clickTh(grid, 'name');
            expect(grid.sortStack).to.deep.equal([{ field: 'name', direction: 'desc' }]);
        });

        it('resets currentPage to 1 on sort change', async () => {
            const grid = await makeGrid({ currentPage: 3 });
            await clickTh(grid, 'name');
            expect(grid.currentPage).to.equal(1);
        });

        it('emits sortChanged with correct sortStack snapshot', async () => {
            const grid = await makeGrid();
            const events = [];
            grid.on('sortChanged', payload => events.push(payload));
            await clickTh(grid, 'name');
            expect(events).to.have.length(1);
            expect(events[0].sortStack).to.deep.equal([{ field: 'name', direction: 'asc' }]);
        });
    });

    // =========================================================================
    // _onHeaderSortClick() — shift+click
    // =========================================================================

    describe('_onHeaderSortClick() — shift+click', () => {
        it('first shift+click on unsorted column: pushes asc to stack', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'age', direction: 'asc' }] });
            await clickTh(grid, 'name', true);
            expect(grid.sortStack).to.deep.equal([
                { field: 'age', direction: 'asc' },
                { field: 'name', direction: 'asc' },
            ]);
        });

        it('shift+click on asc column in stack: sets to desc', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            await clickTh(grid, 'name', true);
            expect(grid.sortStack).to.deep.equal([{ field: 'name', direction: 'desc' }]);
        });

        it('shift+click on desc column in stack: removes from stack', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'desc' }] });
            await clickTh(grid, 'name', true);
            expect(grid.sortStack).to.deep.equal([]);
        });

        it('shift+click does not replace other columns in the stack', async () => {
            const grid = await makeGrid({
                sortStack: [
                    { field: 'age', direction: 'asc' },
                    { field: 'name', direction: 'asc' },
                ],
            });
            await clickTh(grid, 'name', true);
            // name toggled to desc, age unchanged
            expect(grid.sortStack).to.deep.equal([
                { field: 'age', direction: 'asc' },
                { field: 'name', direction: 'desc' },
            ]);
        });

        it('removing last column via shift+click yields empty stack', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'desc' }] });
            await clickTh(grid, 'name', true);
            expect(grid.sortStack).to.deep.equal([]);
        });
    });

    // =========================================================================
    // _updateSortIndicators()
    // =========================================================================

    describe('_updateSortIndicators()', () => {
        it('sets data-sort-dir attribute on active header', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            grid._updateSortIndicators();
            const th = [...grid.theadElement.querySelectorAll('th')].find(t => t.dataset.field === 'name');
            expect(th.getAttribute('data-sort-dir')).to.equal('asc');
        });

        it('removes data-sort-dir when column not in stack', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            grid._updateSortIndicators();
            const th = [...grid.theadElement.querySelectorAll('th')].find(t => t.dataset.field === 'age');
            expect(th.getAttribute('data-sort-dir')).to.be.null;
        });

        it('sets data-sort-priority when two or more columns are sorted', async () => {
            const grid = await makeGrid({
                sortStack: [
                    { field: 'name', direction: 'asc' },
                    { field: 'age', direction: 'desc' },
                ],
            });
            grid._updateSortIndicators();
            const nameTh = [...grid.theadElement.querySelectorAll('th')].find(t => t.dataset.field === 'name');
            const ageTh  = [...grid.theadElement.querySelectorAll('th')].find(t => t.dataset.field === 'age');
            expect(nameTh.getAttribute('data-sort-priority')).to.equal('1');
            expect(ageTh.getAttribute('data-sort-priority')).to.equal('2');
        });

        it('removes data-sort-priority when only one column is sorted', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            grid._updateSortIndicators();
            const th = [...grid.theadElement.querySelectorAll('th')].find(t => t.dataset.field === 'name');
            expect(th.getAttribute('data-sort-priority')).to.be.null;
        });

        it('does not touch non-sortable headers (no data-field attribute)', async () => {
            const grid = await makeGrid({
                columns: [
                    { field: 'name', label: 'Name' },
                    { field: 'id',   label: 'ID', sortable: false },
                ],
                sortStack: [{ field: 'name', direction: 'asc' }],
            });
            grid._updateSortIndicators();
            const ths = [...grid.theadElement.querySelectorAll('th')];
            const idTh = ths.find(t => t.textContent === 'ID');
            expect(idTh.hasAttribute('data-sort-dir')).to.be.false;
        });
    });

    // =========================================================================
    // renderBody() integration
    // =========================================================================

    describe('renderBody() integration', () => {
        it('rendered rows are in the correct sort order (single column, asc)', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            const cells = [...container.querySelectorAll('tbody tr')].map(tr => tr.cells[1].textContent);
            expect(cells[0]).to.equal('alice');
            expect(cells[4]).to.equal('Eve');
        });

        it('rendered rows are in the correct sort order (single column, desc)', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'desc' }] });
            const cells = [...container.querySelectorAll('tbody tr')].map(tr => tr.cells[1].textContent);
            expect(cells[0]).to.equal('Eve');
        });

        it('rendered rows are in the correct sort order (multi-column)', async () => {
            const grid = await makeGrid({
                columns: [
                    { field: 'age', label: 'Age', sorter: 'number' },
                    { field: 'name', label: 'Name' },
                ],
                sortStack: [
                    { field: 'age', direction: 'asc' },
                    { field: 'name', direction: 'asc' },
                ],
            });
            // age=25 tie: alice before Dave
            const rows = [...container.querySelectorAll('tbody tr')];
            expect(rows[0].cells[1].textContent).to.equal('alice');
            expect(rows[1].cells[1].textContent).to.equal('Dave');
        });
    });

    // =========================================================================
    // exportConfig() / constructor round-trip
    // =========================================================================

    describe('exportConfig() / constructor round-trip', () => {
        it('exportConfig() includes sortStack, sortMode, clientSortThreshold, sortNullsFirst', async () => {
            const grid = await makeGrid({
                sortStack: [{ field: 'name', direction: 'asc' }],
                sortMode: 'client',
                clientSortThreshold: 500,
                sortNullsFirst: true,
            });
            const cfg = grid.exportConfig();
            expect(cfg.sortStack).to.deep.equal([{ field: 'name', direction: 'asc' }]);
            expect(cfg.sortMode).to.equal('client');
            expect(cfg.clientSortThreshold).to.equal(500);
            expect(cfg.sortNullsFirst).to.equal(true);
        });

        it('sortStack entries are deep copies (mutations after export do not affect grid state)', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            const cfg = grid.exportConfig();
            cfg.sortStack[0].direction = 'desc';
            expect(grid.sortStack[0].direction).to.equal('asc');
        });

        it('restoring from exportConfig() preserves sortStack', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'desc' }] });
            const cfg = grid.exportConfig();

            // Mount a second grid in the same container via a fresh DOM element
            const dom2 = new JSDOM('<!doctype html><html><body><div id="grid2"></div></body></html>');
            const prevDoc = global.document;
            global.document = dom2.window.document;
            global.window = dom2.window;

            const grid2 = new StreamGrid('#grid2', { ...cfg, dataAdapter: makeAdapter() });
            await new Promise(resolve => grid2.on('tableRendered', resolve));

            expect(grid2.sortStack).to.deep.equal([{ field: 'name', direction: 'desc' }]);

            dom2.window.close();
            global.document = prevDoc;
        });

        it('init() preserves sortStack (does not reset it)', async () => {
            const grid = await makeGrid({ sortStack: [{ field: 'name', direction: 'asc' }] });
            await grid.init();
            expect(grid.sortStack).to.deep.equal([{ field: 'name', direction: 'asc' }]);
        });
    });

    // =========================================================================
    // shouldUseServerSort()
    // =========================================================================

    describe('shouldUseServerSort()', () => {
        it('returns true when sortMode is "server"', async () => {
            const grid = await makeGrid({ sortMode: 'server' });
            expect(grid.shouldUseServerSort()).to.be.true;
        });

        it('returns false when sortMode is "client"', async () => {
            const grid = await makeGrid({ sortMode: 'client' });
            expect(grid.shouldUseServerSort()).to.be.false;
        });

        it('returns false in auto mode when row count <= clientSortThreshold', async () => {
            const grid = await makeGrid({ sortMode: 'auto', clientSortThreshold: 100 });
            expect(grid.shouldUseServerSort()).to.be.false;
        });

        it('returns true in auto mode when row count > clientSortThreshold', async () => {
            const grid = await makeGrid({ sortMode: 'auto', clientSortThreshold: 2 });
            expect(grid.shouldUseServerSort()).to.be.true;
        });
    });
});
