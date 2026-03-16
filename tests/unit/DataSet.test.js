import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { DataSet } from '../../src/DataSet.js';
import { StreamGrid } from '../../src/StreamGrid.js';

const MOCK_ADAPTER = {
    getColumns: async () => [],
    fetchData: async () => [],
    insertRow: async () => ({}),
    updateRow: async () => ({}),
    deleteRow: async () => true
};

describe('DataSet', () => {

    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><div id="dummy"></div></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
    });

    afterEach(() => {
        global.window.close();
        delete global.window;
        delete global.document;
    });

    it('should insert a row', () => {
        const ds = new DataSet();
        ds.insert({ id: 1, name: 'John' });
        expect(ds.select()).to.have.lengthOf(1);
    });

    it('should select rows', () => {
        const ds = new DataSet([{ id: 1 }, { id: 2 }]);
        expect(ds.select()).to.have.lengthOf(2);
    });

    it('should update a row', () => {
        const ds = new DataSet([{ id: 1, name: 'John' }]);
        ds.update(1, { name: 'Jane' });
        expect(ds.select()[0].name).to.equal('Jane');
    });

    it('should delete a row', () => {
        const ds = new DataSet([{ id: 1 }, { id: 2 }]);
        ds.delete(1);
        expect(ds.select()).to.have.lengthOf(1);
        expect(ds.select()[0].id).to.equal(2);
    });

    it('should sort rows', () => {
        const ds = new DataSet([{ id: 2 }, { id: 1 }]);
        ds.sort((a, b) => a.id - b.id);
        expect(ds.select()[0].id).to.equal(1);
    });

    it('correctly determines server-side filtering mode based on settings', () => {
        const grid = new StreamGrid('#dummy', {
            filterMode: 'auto',
            clientFilterThreshold: 2,
            dataAdapter: MOCK_ADAPTER,
            table: 'dummy',
            columns: []
        });
        grid.dataSet.data = [{}, {}, {}];
        expect(grid.shouldUseServerFiltering()).to.be.true;

        grid.filterMode = 'client';
        expect(grid.shouldUseServerFiltering()).to.be.false;

        grid.filterMode = 'server';
        expect(grid.shouldUseServerFiltering()).to.be.true;
    });

});