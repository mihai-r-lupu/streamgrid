import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

describe('StreamGrid - Core Events', () => {
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
                { name: 'Bob', email: 'bob@example.com', status: 'inactive' }
            ];
        }
    }

    it('should fire tableRendered and dataLoaded events after init', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true
        });

        let tableRenderedCalled = false;
        let dataLoadedCalled = false;

        grid.on('tableRendered', () => { tableRenderedCalled = true; });
        grid.on('dataLoaded', (data) => {
            dataLoadedCalled = true;
            expect(data.length).to.equal(2);
        });

        await grid.init();

        expect(tableRenderedCalled).to.be.true;
        expect(dataLoadedCalled).to.be.true;
    });

    it('should fire dataRowClicked event when clicking a tbody row', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true
        });

        let rowClicked = false;

        grid.on('dataRowClicked', (rowData) => {
            rowClicked = true;
            expect(rowData).to.have.property('name');
        });

        await grid.init();

        const firstRow = container.querySelector('tbody tr');
        firstRow.dispatchEvent(new window.Event('click', { bubbles: true }));

        expect(rowClicked).to.be.true;
    });

    it('should fire cellClicked event when clicking a tbody cell', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true
        });

        let cellClicked = false;

        grid.on('cellClicked', (payload) => {
            cellClicked = true;
            expect(payload.rowData).to.have.property('name');
            expect(payload.columnField).to.exist;
        });

        await grid.init();

        const firstCell = container.querySelector('tbody td');
        firstCell.dispatchEvent(new window.Event('click', { bubbles: true }));

        expect(cellClicked).to.be.true;
    });

    it('should fire headerRowClicked event when clicking a thead row', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true
        });

        let headerRowClicked = false;

        grid.on('headerRowClicked', () => {
            headerRowClicked = true;
        });

        await grid.init();

        const headerRow = container.querySelector('thead tr');
        headerRow.dispatchEvent(new window.Event('click', { bubbles: true }));

        expect(headerRowClicked).to.be.true;
    });

    it('should fire headerClicked event when clicking a header cell', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true
        });

        let headerClicked = false;

        grid.on('headerClicked', (payload) => {
            headerClicked = true;
            expect(payload.columnField).to.exist;
        });

        await grid.init();

        const firstHeaderCell = container.querySelector('thead th');
        firstHeaderCell.dispatchEvent(new window.Event('click', { bubbles: true }));

        expect(headerClicked).to.be.true;
    });

    it('should fire tableClicked event when clicking anywhere on table', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true
        });

        let tableClicked = false;

        grid.on('tableClicked', (event) => {
            tableClicked = true;
            expect(event).to.exist;
        });

        await grid.init();

        const table = container.querySelector('table');
        table.dispatchEvent(new window.Event('click', { bubbles: true }));

        expect(tableClicked).to.be.true;
    });

    it('should call customClickHandlers when matching', async () => {
        const grid = new StreamGrid('#grid', {
            dataAdapter: new MemoryAdapter(),
            table: 'users',
            columns: ['name', 'email', 'status'],
            pagination: true,
            customClickHandlers: [
                {
                    selector: 'td',
                    callback: (event, grid, rowData, field) => {
                        expect(rowData).to.have.property('name');
                        expect(field).to.exist;
                    }
                }
            ]
        });

        await grid.init();

        const firstCell = container.querySelector('tbody td');
        firstCell.dispatchEvent(new window.Event('click', { bubbles: true }));
    });
});
