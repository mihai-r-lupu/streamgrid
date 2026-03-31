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

    describe('updateRow()', () => {
        it('updates a row by reference identity', () => {
            const row = { id: 1, name: 'Alice' };
            const ds = new DataSet([row, { id: 2, name: 'Bob' }]);
            ds.updateRow(row, { name: 'Updated' });
            expect(ds.data[0].name).to.equal('Updated');
            expect(ds.data[1].name).to.equal('Bob');
        });

        it('merges updates without replacing the whole row', () => {
            const row = { id: 1, name: 'Alice', age: 30 };
            const ds = new DataSet([row]);
            ds.updateRow(row, { age: 31 });
            expect(ds.data[0].name).to.equal('Alice');
            expect(ds.data[0].age).to.equal(31);
        });

        it('is a no-op when the row reference is not in the dataset', () => {
            const row = { id: 99, name: 'Ghost' };
            const ds = new DataSet([{ id: 1, name: 'Alice' }]);
            ds.updateRow(row, { name: 'Changed' });
            expect(ds.data[0].name).to.equal('Alice');
            expect(ds.data.length).to.equal(1);
        });

        it('creates a new object reference for the updated row', () => {
            const row = { id: 1, name: 'Alice' };
            const ds = new DataSet([row]);
            ds.updateRow(row, { name: 'Updated' });
            expect(ds.data[0]).to.not.equal(row);
            expect(ds.data[0].name).to.equal('Updated');
        });
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