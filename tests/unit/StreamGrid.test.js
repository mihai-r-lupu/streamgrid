import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

const MOCK_ADAPTER = {
    getColumns: async () => [],
    fetchData: async () => [],
    insertRow: async () => ({}),
    updateRow: async () => ({}),
    deleteRow: async () => true
};

describe('StreamGrid - Core Options', () => {
    let container;

    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><div id="dummy"></div></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
        container = document.getElementById('dummy');
    });

    afterEach(() => {
        global.window.close();
        delete global.window;
        delete global.document;
    });

    it('should default pagination to true', () => {
        const grid = new StreamGrid('#dummy', { dataAdapter: MOCK_ADAPTER, table: 'dummy', columns: [] });
        expect(grid.pagination).to.be.true;
    });

    it('should default paginationMode to pages', () => {
        const grid = new StreamGrid('#dummy', { dataAdapter: MOCK_ADAPTER, table: 'dummy', columns: [] });
        expect(grid.paginationMode).to.equal('pages');
    });

    it('should accept paginationMode numbers', () => {
        const grid = new StreamGrid('#dummy', {
            dataAdapter: MOCK_ADAPTER,
            table: 'dummy',
            columns: [],
            paginationMode: 'numbers'
        });
        expect(grid.paginationMode).to.equal('numbers');
    });

    it('should accept paginationMode infinite', () => {
        const grid = new StreamGrid('#dummy', {
            dataAdapter: MOCK_ADAPTER,
            table: 'dummy',
            columns: [],
            paginationMode: 'infinite'
        });
        expect(grid.paginationMode).to.equal('infinite');
    });
});
