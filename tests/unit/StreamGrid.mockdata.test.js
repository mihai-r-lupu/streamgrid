import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';
import sinon from 'sinon';

describe('StreamGrid - Mock Data Filtering and Paging', () => {
    let container;

    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><div id="grid"></div></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
        container = document.getElementById('grid');
    });

    afterEach(() => {
        global.window.close();
        delete global.window;
        delete global.document;
    });

    class MemoryAdapter {
        async getColumns() {
            return ['name', 'email', 'status'];
        }
        async fetchData() {
            return [
                { name: 'Alice', email: 'alice@example.com', status: 'active' },
                { name: 'Bob', email: 'bob@example.com', status: 'inactive' },
                { name: 'Charlie', email: 'charlie@example.com', status: 'active' },
                { name: 'David', email: 'david@example.com', status: 'inactive' },
                { name: 'Eve', email: 'eve@example.com', status: 'active' }
            ];
        }
        async insertRow(table, data) { return data; }
        async updateRow(table, id, data) { return data; }
        async deleteRow(table, id) { return true; }
    }

    it('should render correct number of rows per page (pages mode)', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true,
            paginationMode: 'pages',
            pageSize: 2
        });

        await grid.init();

        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).to.equal(2);
    });

    it('should render number buttons (numbers mode)', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true,
            paginationMode: 'numbers',
            pageSize: 2
        });

        await grid.init();

        const buttons = container.querySelectorAll('.pagination-controls button');
        expect([...buttons].some(btn => btn.textContent === '2')).to.be.true;
    });

    it('should load more rows on scroll (infinite mode)', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true,
            paginationMode: 'infinite',
            pageSize: 2,
            infiniteScrollTriggerDistance: 5000,
            infiniteScrollPageSize: 2
        });

        await grid.init();

        // Manually simulate loading more rows
        grid.totalLoadedRows = 4; // 2 initial + 2 more
        grid._renderBody();

        const rows = container.querySelectorAll('tbody tr');
        expect(rows.length).to.equal(4);
    });

    it('should render First and Last buttons when enabled', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true,
            paginationMode: 'numbers',
            paginationFirstLastButtons: true,
            pageSize: 2
        });

        await grid.init();

        const buttons = container.querySelectorAll('.pagination-controls button');
        const buttonTexts = [...buttons].map(btn => btn.textContent);

        expect(buttonTexts).to.include('First');
        expect(buttonTexts).to.include('Last');
    });

    it('should use custom labels for Prev/Next/First/Last buttons', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true,
            paginationMode: 'numbers',
            paginationFirstLastButtons: true,
            paginationPrevNextText: { prev: '⬅️', next: '➡️' },
            paginationFirstLastText: { first: '⏮️', last: '⏭️' },
            pageSize: 2
        });

        await grid.init();

        const buttons = container.querySelectorAll('.pagination-controls button');
        const buttonTexts = [...buttons].map(btn => btn.textContent);

        expect(buttonTexts).to.include('⬅️');
        expect(buttonTexts).to.include('➡️');
        expect(buttonTexts).to.include('⏮️');
        expect(buttonTexts).to.include('⏭️');
    });

    it('should apply debounce when filtering', async () => {
        const clock = sinon.useFakeTimers(); // Use sinon.js fake timers

        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            filters: ['name'],
            filterDebounceTime: 300 // 300ms debounce
        });

        await grid.init();

        const input = grid.filterInput;
        input.value = 'bob';
        input.dispatchEvent(new window.Event('input'));

        // Wait zero time initially, filtering is NOT applied yet
        let rows = container.querySelectorAll('tbody tr');
        expect(rows.length).to.equal(5); // ✅ Still full 5 rows at this point

        clock.tick(300); // Fast-forward 300ms

        await Promise.resolve(); // Let the event loop flush after ticking

        rows = container.querySelectorAll('tbody tr');
        expect(rows.length).to.equal(1); // ✅ Now filtered properly

        clock.restore();
    });

    it('should respect case sensitivity in filtering', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            filters: ['name'],
            filterCaseSensitive: true,
            filterDebounceTime: 0 // Instant filtering
        });

        await grid.init();

        const input = grid.filterInput;
        input.value = 'Alice';
        input.dispatchEvent(new window.Event('input'));

        await new Promise(resolve => setTimeout(resolve, 50)); // longer timeout

        let rows = container.querySelectorAll('tbody tr');
        expect(rows.length).to.equal(1); // ✅ Exact match Alice

        // Test wrong casing
        input.value = 'alice';
        input.dispatchEvent(new window.Event('input'));

        await new Promise(resolve => setTimeout(resolve, 50)); // longer timeout

        rows = container.querySelectorAll('tbody tr:not(.sg-empty-row)');
        expect(rows.length).to.equal(0); // ✅ No match if case sensitive
    });

});
