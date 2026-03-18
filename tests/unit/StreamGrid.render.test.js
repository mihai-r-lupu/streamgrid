import { expect } from 'chai';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';
import sinon from 'sinon';

describe('StreamGrid - Column Render Callbacks', () => {
    let container;

    beforeEach(() => {
        const dom = new JSDOM('<!doctype html><html><body><div id="grid"></div></body></html>');
        global.window = dom.window;
        global.document = dom.window.document;
        container = document.getElementById('grid');
    });

    afterEach(() => {
        sinon.restore();
        global.window.close();
        delete global.window;
        delete global.document;
    });

    function makeAdapter(rows) {
        return {
            async getColumns() { return ['id', 'name']; },
            async fetchData() { return rows; },
            async insertRow() { },
            async updateRow() { },
            async deleteRow() { },
        };
    }

    async function makeGrid(columns, opts = {}) {
        const rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
        const grid = new StreamGrid('#grid', {
            dataAdapter: makeAdapter(rows),
            table: 'test',
            columns,
            ...opts,
        });
        // Wait for the constructor-triggered init to complete rather than calling
        // init() a second time, which would inflate render-count assertions.
        await new Promise(resolve => grid.on('tableRendered', resolve));
        return grid;
    }

    // ---- string return ---------------------------------------------------

    it('renders a string return value via innerHTML', async () => {
        await makeGrid([
            { field: 'name', label: 'Name', render: (v) => `<strong>${v}</strong>` },
        ]);
        const cells = container.querySelectorAll('tbody td');
        expect(cells[0].querySelector('strong')).to.not.be.null;
        expect(cells[0].querySelector('strong').textContent).to.equal('Alice');
    });

    it('does not double-escape safe HTML returned by render', async () => {
        await makeGrid([
            { field: 'name', label: 'Name', render: () => '<em>ok</em>' },
        ]);
        const cell = container.querySelector('tbody td');
        expect(cell.innerHTML).to.equal('<em>ok</em>');
    });

    // ---- DOM Node return -------------------------------------------------

    it('appends a DOM Node returned by render', async () => {
        await makeGrid([
            {
                field: 'name', label: 'Name', render: (v) => {
                    const span = document.createElement('span');
                    span.className = 'badge';
                    span.textContent = v;
                    return span;
                },
            },
        ]);
        const cell = container.querySelector('tbody td');
        expect(cell.querySelector('.badge')).to.not.be.null;
        expect(cell.querySelector('.badge').textContent).to.equal('Alice');
    });

    // ---- null / undefined return -----------------------------------------

    it('falls back to textContent when render returns null', async () => {
        await makeGrid([
            { field: 'name', label: 'Name', render: () => null },
        ]);
        const cell = container.querySelector('tbody td');
        expect(cell.textContent).to.equal('Alice');
    });

    it('falls back to textContent when render returns undefined', async () => {
        await makeGrid([
            { field: 'name', label: 'Name', render: () => undefined },
        ]);
        const cell = container.querySelector('tbody td');
        expect(cell.textContent).to.equal('Alice');
    });

    // ---- unexpected return type ------------------------------------------

    it('calls onRenderError when render returns a number', async () => {
        const errors = [];
        await makeGrid(
            [{ field: 'name', label: 'Name', render: () => 42 }],
            { onRenderError: (err, ctx) => errors.push({ err, ctx }) }
        );
        expect(errors).to.have.length(2); // one per row
        expect(errors[0].err).to.be.instanceOf(TypeError);
        expect(errors[0].ctx.field).to.equal('name');
    });

    it('falls back to textContent when render returns an unexpected type', async () => {
        await makeGrid(
            [{ field: 'name', label: 'Name', render: () => 42 }],
            { onRenderError: () => { } }
        );
        const cells = container.querySelectorAll('tbody td');
        expect(cells[0].textContent).to.equal('Alice');
    });

    // ---- error handling --------------------------------------------------

    it('calls onRenderError when render() throws', async () => {
        const errors = [];
        await makeGrid(
            [{ field: 'name', label: 'Name', render: () => { throw new Error('boom'); } }],
            { onRenderError: (err, ctx) => errors.push({ err, ctx }) }
        );
        expect(errors).to.have.length(2);
        expect(errors[0].err.message).to.equal('boom');
    });

    it('leaves the td empty when render() throws', async () => {
        await makeGrid(
            [{ field: 'name', label: 'Name', render: () => { throw new Error('boom'); } }],
            { onRenderError: () => { } }
        );
        const cell = container.querySelector('tbody td');
        expect(cell.textContent).to.equal('');
    });

    it('default onRenderError calls console.warn', async () => {
        const warnSpy = sinon.stub(console, 'warn');
        await makeGrid([
            { field: 'name', label: 'Name', render: () => { throw new Error('oops'); } },
        ]);
        expect(warnSpy.called).to.be.true;
        const firstCall = warnSpy.firstCall.args[0];
        expect(firstCall).to.include('[StreamGrid]');
    });

    // ---- context argument ------------------------------------------------

    it('passes the correct context object to render()', async () => {
        const contexts = [];
        const col = { field: 'name', label: 'Name', render: (v, row, ctx) => { contexts.push(ctx); return v; } };
        await makeGrid([col]);
        expect(contexts).to.have.length(2);
        expect(contexts[0].type).to.equal('display');
        expect(contexts[0].field).to.equal('name');
        expect(contexts[0].col).to.equal(col);
    });

    it('passes the full row to render()', async () => {
        const rows = [];
        await makeGrid([
            { field: 'name', label: 'Name', render: (v, row) => { rows.push(row); return v; } },
        ]);
        expect(rows[0]).to.deep.equal({ id: 1, name: 'Alice' });
        expect(rows[1]).to.deep.equal({ id: 2, name: 'Bob' });
    });

    // ---- no render (plain column) ----------------------------------------

    it('renders plain string columns with textContent as before', async () => {
        await makeGrid(['id', 'name']);
        const cells = container.querySelectorAll('tbody tr:first-child td');
        expect(cells[0].textContent).to.equal('1');
        expect(cells[1].textContent).to.equal('Alice');
    });

    it('renders object columns without render fn using textContent', async () => {
        await makeGrid([{ field: 'name', label: 'Name' }]);
        const cell = container.querySelector('tbody td');
        expect(cell.textContent).to.equal('Alice');
    });
});
