import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

describe('StreamGrid - Adapter Usage', () => {
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

    it('should call getColumns() and fetchData() on adapter', async () => {
        const mockAdapter = {
            columnsCalled: false,
            dataCalled: false,

            async getColumns(table) {
                this.columnsCalled = true;
                return ['name'];
            },
            async fetchData(table) {
                this.dataCalled = true;
                return [{ name: 'Test' }];
            },
            async insertRow(table, data) { return data; },
            async updateRow(table, id, data) { return data; },
            async deleteRow(table, id) { return true; }
        };

        const grid = new StreamGrid('#grid', {
            dataAdapter: mockAdapter,
            table: 'users',
            columns: []
        });

        await grid.init();

        expect(mockAdapter.columnsCalled).to.be.true;
        expect(mockAdapter.dataCalled).to.be.true;
    });

});
