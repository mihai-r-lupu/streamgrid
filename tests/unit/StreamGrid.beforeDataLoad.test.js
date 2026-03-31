import { expect } from 'chai';
import sinon from 'sinon';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeMockAdapter(rows) {
    const data = rows ?? [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Carol' }
    ];
    return {
        async getColumns() { return [{ field: 'id', label: 'ID' }, { field: 'name', label: 'Name' }]; },
        async fetchData() { return data; },
        async insertRow(t, d) { return d; },
        async updateRow(t, id, d) { return d; },
        async deleteRow() { return true; }
    };
}

function makeGrid(extraOpts = {}) {
    return new StreamGrid('#grid', {
        dataAdapter: extraOpts.dataAdapter || makeMockAdapter(extraOpts._rows),
        table: 'users',
        columns: extraOpts.columns || ['id', 'name'],
        filters: extraOpts.filters || [],
        pagination: extraOpts.pagination ?? true,
        pageSize: extraOpts.pageSize || 10,
        ...extraOpts
    });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('StreamGrid — beforeDataLoad hook', () => {
    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><div id="grid"></div></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
    });

    afterEach(() => {
        global.window.close();
        delete global.window;
        delete global.document;
    });

    it('beforeDataLoad filter fires during init', async () => {
        const grid = makeGrid();
        const spy = sinon.spy(({ incoming, current }) => ({ incoming, current }));
        grid.addFilter('beforeDataLoad', spy);

        await grid.init();

        expect(spy.called).to.be.true;
        const call = spy.lastCall;
        expect(call.args[0]).to.have.property('incoming').that.is.an('array');
        expect(call.args[0]).to.have.property('current').that.is.an('array');
    });

    it('beforeDataLoad filter can transform incoming rows', async () => {
        const grid = makeGrid();
        grid.addFilter('beforeDataLoad', ({ incoming, current }) => {
            const transformed = incoming.map(r => ({ ...r, _tagged: true }));
            return { incoming: transformed, current };
        });

        await grid.init();

        grid.dataSet.data.forEach(row => {
            expect(row._tagged).to.be.true;
        });
    });

    it('beforeDataLoad filter can merge incoming with current rows', async () => {
        let callCount = 0;
        const adapter = {
            async getColumns() { return [{ field: 'id', label: 'ID' }, { field: 'name', label: 'Name' }]; },
            async fetchData() {
                callCount++;
                if (callCount <= 2) return [{ id: 1, name: 'Alice' }];
                return [{ id: 1, name: 'Alice Updated' }, { id: 2, name: 'Bob' }];
            },
            async insertRow(t, d) { return d; },
            async updateRow(t, id, d) { return d; },
            async deleteRow() { return true; }
        };

        const grid = makeGrid({ dataAdapter: adapter });
        await grid.init();

        // Register merge filter after init so we control exactly when it fires
        grid.addFilter('beforeDataLoad', ({ incoming, current }) => {
            const map = new Map(current.map(r => [r.id, r]));
            for (const row of incoming) map.set(row.id, { ...map.get(row.id), ...row });
            return { incoming: [...map.values()], current };
        });

        expect(grid.dataSet.data).to.have.lengthOf(1);

        await grid._loadData();
        expect(grid.dataSet.data).to.have.lengthOf(2);
        expect(grid.dataSet.data[0].name).to.equal('Alice Updated');
    });

    it('beforeDataLoad receives the pre-load dataSet snapshot as current', async () => {
        const grid = makeGrid();
        await grid.init();

        const sentinel = { id: 999, name: 'Sentinel' };
        grid.dataSet.data.push(sentinel);

        let captured;
        grid.addFilter('beforeDataLoad', (info) => {
            captured = info.current;
            return info;
        });

        await grid._loadData();

        expect(captured.some(r => r.id === 999 && r.name === 'Sentinel')).to.be.true;
    });

    it('dataSet is populated normally when no beforeDataLoad filter is registered', async () => {
        const grid = makeGrid();
        await grid.init();

        expect(grid.dataSet.data).to.have.lengthOf(3);
        expect(grid.dataSet.data[0].name).to.equal('Alice');
        expect(grid.dataSet.data[1].name).to.equal('Bob');
        expect(grid.dataSet.data[2].name).to.equal('Carol');
    });

    it('dataLoaded event receives the transformed incoming data', async () => {
        const grid = makeGrid();
        grid.addFilter('beforeDataLoad', ({ incoming, current }) => {
            return { incoming: [...incoming, { id: 4, name: 'Extra' }], current };
        });

        const spy = sinon.spy();
        grid.on('dataLoaded', spy);

        await grid.init();

        expect(spy.called).to.be.true;
        const payload = spy.lastCall.args[0];
        expect(payload).to.have.lengthOf(4);
        expect(payload[3].name).to.equal('Extra');
    });
});
