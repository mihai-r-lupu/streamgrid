import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

describe('StreamGrid - Plugin System', () => {
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

    it('should initialize plugins on grid init', async () => {
        let pluginCalled = false;

        const dummyPlugin = {
            init(gridInstance) {
                pluginCalled = true;
                expect(gridInstance).to.be.an.instanceof(StreamGrid);
            }
        };

        const grid = new StreamGrid('#grid', {
            dataAdapter: {
                async getColumns() { return ['name']; },
                async fetchData() { return [{ name: 'Test' }]; },
                async insertRow(table, data) { return data; },
                async updateRow(table, id, data) { return data; },
                async deleteRow(table, id) { return true; }
            },
            table: 'users',
            columns: ['name'],
            plugins: [dummyPlugin]
        });

        await grid.init();

        expect(pluginCalled).to.be.true;
    });
});
