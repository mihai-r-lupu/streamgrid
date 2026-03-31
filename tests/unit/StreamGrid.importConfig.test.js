import { expect } from 'chai';
import sinon from 'sinon';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

function makeMockAdapter() {
    return {
        async getColumns() { return [{ field: 'id', label: 'ID' }]; },
        async fetchData() {
            return Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));
        },
        async insertRow(table, data) { return data; },
        async updateRow(table, id, data) { return data; },
        async deleteRow() { return true; }
    };
}

function makeGrid(extraOpts = {}) {
    return new StreamGrid('#grid', {
        dataAdapter: makeMockAdapter(),
        table: 'users',
        columns: [{ field: 'id', label: 'ID' }],
        pageSize: 10,
        ...extraOpts
    });
}

describe('StreamGrid — getState hook', () => {
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

    it('getState filter fires and can add a plugin key to the snapshot', async () => {
        const grid = makeGrid();
        await grid.init();

        grid.addFilter('getState', state => ({ ...state, myPlugin: 'hello' }));
        const result = grid.exportConfig();

        expect(result.myPlugin).to.equal('hello');
    });

    it('getState does not alter existing keys', async () => {
        const grid = makeGrid();
        await grid.init();

        grid.addFilter('getState', state => ({ ...state, extra: true }));
        const result = grid.exportConfig();

        expect(result.version).to.equal(1);
        expect(result.table).to.equal('users');
    });

    it('getState chains across multiple plugins (priority order)', async () => {
        const grid = makeGrid();
        await grid.init();

        grid.addFilter('getState', state => ({ ...state, pluginA: 'a' }), 5);
        grid.addFilter('getState', state => ({ ...state, pluginB: 'b' }), 10);
        const result = grid.exportConfig();

        expect(result.pluginA).to.equal('a');
        expect(result.pluginB).to.equal('b');
    });

    it('getState result survives JSON round-trip', async () => {
        const grid = makeGrid();
        await grid.init();

        grid.addFilter('getState', state => ({ ...state, columnWidths: { id: 120 } }));
        const result = grid.exportConfig();
        const rt = JSON.parse(JSON.stringify(result));

        expect(rt.columnWidths.id).to.equal(120);
    });

    it('getState does not fire when no filter is registered', async () => {
        const grid = makeGrid();
        await grid.init();

        const result = grid.exportConfig();

        expect(result).to.not.have.property('pluginA');
        expect(result).to.not.have.property('myPlugin');
        expect(result).to.have.property('version', 1);
    });
});

describe('StreamGrid — importConfig() + setState hook', () => {
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

    it('importConfig restores currentPage', async () => {
        const grid = makeGrid();
        await grid.init();
        grid.goToPage(3);
        expect(grid.currentPage).to.equal(3);

        await grid.importConfig({ currentPage: 2 });

        expect(grid.currentPage).to.equal(2);
    });

    it('importConfig restores currentFilterText', async () => {
        const grid = makeGrid();
        await grid.init();

        await grid.importConfig({ currentFilterText: 'alice' });

        expect(grid.currentFilterText).to.equal('alice');
    });

    it('importConfig restores sortStack', async () => {
        const grid = makeGrid();
        await grid.init();

        await grid.importConfig({ sortStack: [{ field: 'id', direction: 'desc' }] });

        expect(grid.sortStack).to.have.length(1);
        expect(grid.sortStack[0].direction).to.equal('desc');
    });

    it('importConfig uses defaults for missing keys', async () => {
        const grid = makeGrid();
        await grid.init();

        await grid.importConfig({});

        expect(grid.currentPage).to.equal(1);
        expect(grid.currentFilterText).to.equal('');
        expect(grid.sortStack).to.deep.equal([]);
    });

    it('setState fires with the full snapshot', async () => {
        const grid = makeGrid();
        await grid.init();

        const spy = sinon.spy();
        grid.addAction('setState', spy);

        await grid.importConfig({ currentPage: 2, myPlugin: 'hello' });

        expect(spy.calledOnce).to.be.true;
        expect(spy.firstCall.args[0]).to.have.property('myPlugin', 'hello');
    });

    it('setState fires BEFORE init() re-renders', async () => {
        const grid = makeGrid();
        await grid.init();

        let capturedPage = null;
        grid.addAction('setState', snapshot => {
            capturedPage = snapshot.currentPage;
        });

        await grid.importConfig({ currentPage: 4 });

        expect(capturedPage).to.equal(4);
    });

    it('importConfig returns a Promise', async () => {
        const grid = makeGrid();
        await grid.init();

        const result = grid.importConfig({});

        expect(typeof result.then).to.equal('function');
        await result;
    });

    it('exportConfig → importConfig round-trip preserves page state', async () => {
        const grid = makeGrid();
        await grid.init();
        grid.goToPage(3);

        const snapshot = grid.exportConfig();
        await grid.importConfig(snapshot);

        expect(grid.currentPage).to.equal(3);
    });

    it('plugin state survives a full getState/setState round-trip', async () => {
        const grid = makeGrid();

        let restoredValue = null;
        grid.addFilter('getState', state => ({ ...state, pluginData: 42 }));
        grid.addAction('setState', snapshot => {
            restoredValue = snapshot.pluginData;
        });

        await grid.init();

        const snapshot = grid.exportConfig();
        await grid.importConfig(snapshot);

        expect(restoredValue).to.equal(42);
    });
});
