import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

describe('StreamGrid - Auto Filter Mode Switching', () => {
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

    it('auto mode delegates to server (calls fetchData) when row count exceeds threshold', async () => {
        let fetchDataCallCount = 0;
        const adapter = {
            async getColumns() { return ['name']; },
            async fetchData() {
                fetchDataCallCount++;
                return Array.from({ length: 4 }, (_, i) => ({ name: `User ${i}` }));
            },
            async insertRow(table, data) { return data; },
            async updateRow(table, id, data) { return data; },
            async deleteRow(table, id) { return true; }
        };

        const grid = new StreamGrid('#grid', {
            dataAdapter: adapter,
            table: 'users',
            columns: ['name'],
            filters: ['name'],
            filterMode: 'auto',
            clientFilterThreshold: 3,
            filterDebounceTime: 0
        });

        await grid.init(); // loads 4 rows, exceeds threshold of 3
        fetchDataCallCount = 0; // reset after init

        grid.filterInput.value = 'user';
        await grid._onFilter(); // should hit server because 4 > 3
        expect(fetchDataCallCount).to.equal(1);
    });

    it('auto mode filters locally (does not call fetchData) when row count is at or below threshold', async () => {
        let fetchDataCallCount = 0;
        const adapter = {
            async getColumns() { return ['name']; },
            async fetchData() {
                fetchDataCallCount++;
                return Array.from({ length: 3 }, (_, i) => ({ name: `User ${i}` }));
            },
            async insertRow(table, data) { return data; },
            async updateRow(table, id, data) { return data; },
            async deleteRow(table, id) { return true; }
        };

        const grid = new StreamGrid('#grid', {
            dataAdapter: adapter,
            table: 'users',
            columns: ['name'],
            filters: ['name'],
            filterMode: 'auto',
            clientFilterThreshold: 3,
            filterDebounceTime: 0
        });

        await grid.init(); // loads 3 rows, at threshold (not above)
        fetchDataCallCount = 0; // reset after init

        grid.filterInput.value = 'user';
        await grid._onFilter(); // should NOT hit server because 3 is not > 3
        expect(fetchDataCallCount).to.equal(0);
    });
});
