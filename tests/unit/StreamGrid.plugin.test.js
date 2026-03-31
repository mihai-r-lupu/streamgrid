import { expect } from 'chai';
import sinon from 'sinon';
import { StreamGrid } from '../../src/StreamGrid.js';
import { JSDOM } from 'jsdom';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeDummyAdapter(rows = [{ name: 'Alice' }, { name: 'Bob' }]) {
    return {
        async getColumns() { return ['name']; },
        async fetchData() { return rows; },
        async insertRow(table, data) { return data; },
        async updateRow(table, id, data) { return data; },
        async deleteRow(table, id) { return true; }
    };
}

function makeGrid(extraOpts = {}) {
    return new StreamGrid('#grid', {
        dataAdapter: makeDummyAdapter(extraOpts._rows),
        table: 'users',
        columns: extraOpts.columns || ['name'],
        filters: extraOpts.filters || [],
        plugins: extraOpts.plugins || [],
        pagination: extraOpts.pagination ?? true,
        pageSize: extraOpts.pageSize || 10,
        ...extraOpts
    });
}

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

    // ── Existing test (backward compatibility) ─────────────────────────────────

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

    // ── Plugin lifecycle ───────────────────────────────────────────────────────

    describe('plugin lifecycle', () => {
        it('destroy() calls plugin.destroy(grid)', async () => {
            const destroySpy = sinon.spy();
            const plugin = { init() { }, destroy: destroySpy };
            const grid = makeGrid({ plugins: [plugin] });
            await grid.init();

            grid.destroy();

            expect(destroySpy.calledOnce).to.be.true;
            expect(destroySpy.firstCall.args[0]).to.equal(grid);
        });

        it('destroy() fires beforeDestroy action', async () => {
            const spy = sinon.spy();
            const grid = makeGrid();
            await grid.init();
            grid.addAction('beforeDestroy', spy);

            grid.destroy();

            expect(spy.calledOnce).to.be.true;
            expect(spy.firstCall.args[0]).to.equal(grid);
        });

        it('destroy() clears the container innerHTML', async () => {
            const grid = makeGrid();
            await grid.init();
            expect(container.innerHTML).to.not.equal('');

            grid.destroy();
            expect(container.innerHTML).to.equal('');
        });

        it('onDestroy() is a shorthand for addAction("beforeDestroy", cb)', async () => {
            const spy = sinon.spy();
            const grid = makeGrid();
            await grid.init();
            grid.onDestroy(spy);

            grid.destroy();
            expect(spy.calledOnce).to.be.true;
        });
    });

    // ── Hook fire points ───────────────────────────────────────────────────────

    describe('hook fire points', () => {
        it('beforeRender filter can modify rows to show', async () => {
            const grid = makeGrid({ _rows: [{ name: 'Alice' }, { name: 'Bob' }] });
            await grid.init();

            // Filter out first row before render
            grid.addFilter('beforeRender', rows => rows.filter(r => r.name !== 'Alice'));
            grid._renderBody();

            const rows = container.querySelectorAll('tbody tr');
            expect(rows.length).to.equal(1);
            expect(rows[0].textContent).to.include('Bob');
        });

        it('afterRender action fires after render', async () => {
            const spy = sinon.spy();
            const grid = makeGrid();
            await grid.init();

            grid.addAction('afterRender', spy);
            grid._renderBody();

            expect(spy.calledOnce).to.be.true;
            expect(spy.firstCall.args[0]).to.equal(grid);
        });

        it('rowClass filter can add class names to rows', async () => {
            const grid = makeGrid({ _rows: [{ name: 'Alice' }, { name: 'Bob' }] });
            await grid.init();

            grid.addFilter('rowClass', (info) => {
                return { ...info, className: info.index === 0 ? 'highlight' : '' };
            });
            grid._renderBody();

            const rows = container.querySelectorAll('tbody tr');
            expect(rows[0].className).to.equal('highlight');
            expect(rows[1].className).to.equal('');
        });

        it('cellRender filter can modify cell element', async () => {
            const grid = makeGrid({ _rows: [{ name: 'Test' }] });
            await grid.init();

            grid.addFilter('cellRender', (info) => {
                info.element.setAttribute('data-custom', 'yes');
                return info;
            });
            grid._renderBody();

            const td = container.querySelector('tbody td');
            expect(td.getAttribute('data-custom')).to.equal('yes');
        });

        it('beforeFetch filter can modify fetch config', async () => {
            let receivedConfig;
            const adapter = {
                async getColumns() { return ['name']; },
                async fetchData(table, config) { receivedConfig = config; return [{ name: 'X' }]; },
                async insertRow(t, d) { return d; },
                async updateRow(t, i, d) { return d; },
                async deleteRow(t, i) { return true; }
            };

            const grid = new StreamGrid('#grid', {
                dataAdapter: adapter,
                table: 'users',
                columns: ['name']
            });
            grid.addFilter('beforeFetch', config => {
                config.customParam = 'injected';
                return config;
            });

            await grid.init();

            expect(receivedConfig).to.have.property('customParam', 'injected');
        });

        it('afterFetch filter can transform rows', async () => {
            const grid = makeGrid({ _rows: [{ name: 'raw' }] });
            grid.addFilter('afterFetch', data => data.map(r => ({ ...r, name: r.name.toUpperCase() })));

            await grid.init();

            const td = container.querySelector('tbody td');
            expect(td.textContent).to.equal('RAW');
        });

        it('beforeFilter filter can modify filter text', async () => {
            const grid = makeGrid({ _rows: [{ name: 'Alice' }, { name: 'Bob' }], filters: ['name'] });
            await grid.init();

            grid.addFilter('beforeFilter', config => {
                config.filterText = 'forcedtext';
                return config;
            });

            // Simulate filter input
            grid.filterInput.value = 'ignored';
            await grid._onFilter();

            expect(grid.currentFilterText).to.equal('forcedtext');
        });

        it('beforeSort filter can modify sort stack', async () => {
            const grid = makeGrid({
                columns: [{ field: 'name', label: 'Name', sortable: true }],
                _rows: [{ name: 'B' }, { name: 'A' }]
            });
            await grid.init();

            grid.addFilter('beforeSort', () => {
                return [{ field: 'name', direction: 'desc' }];
            });

            // Simulate a sort click — _onHeaderSortClick(th, event)
            const th = container.querySelector('th');
            await grid._onHeaderSortClick(th, { shiftKey: false });

            expect(grid.sortStack[0].direction).to.equal('desc');
        });

        it('afterSort action fires after sorting', async () => {
            const spy = sinon.spy();
            const grid = makeGrid({
                columns: [{ field: 'name', label: 'Name', sortable: true }],
                _rows: [{ name: 'B' }, { name: 'A' }]
            });
            await grid.init();

            grid.addAction('afterSort', spy);

            const th = container.querySelector('th');
            await grid._onHeaderSortClick(th, { shiftKey: false });

            expect(spy.calledOnce).to.be.true;
            expect(spy.firstCall.args[0]).to.have.property('sortStack');
        });

        it('beforePageChange filter can cancel page navigation', async () => {
            const rows = Array.from({ length: 25 }, (_, i) => ({ name: `r${i}` }));
            const grid = makeGrid({ _rows: rows, pageSize: 10 });
            await grid.init();

            grid.addFilter('beforePageChange', info => {
                return { ...info, targetPage: null }; // cancel
            });

            grid.goToPage(2);
            expect(grid.currentPage).to.equal(1); // stayed on page 1
        });

        it('beforePageChange filter can redirect to a different page', async () => {
            const rows = Array.from({ length: 30 }, (_, i) => ({ name: `r${i}` }));
            const grid = makeGrid({ _rows: rows, pageSize: 10 });
            await grid.init();

            grid.addFilter('beforePageChange', info => {
                return { ...info, targetPage: 3 }; // redirect
            });

            grid.goToPage(2);
            expect(grid.currentPage).to.equal(3);
        });

        describe('Batch 1 render hooks', () => {
            it('headerCellRender fires for each column', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }] });
                await grid.init();

                grid.addFilter('headerCellRender', ({ column, element }) => {
                    element.setAttribute('data-custom', 'yes');
                    return { column, element };
                });
                grid._rebuildHeader();

                const ths = container.querySelectorAll('thead th');
                ths.forEach(th => expect(th.getAttribute('data-custom')).to.equal('yes'));
            });

            it('headerCellRender can replace the th element', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }] });
                await grid.init();

                grid.addFilter('headerCellRender', ({ column }) => {
                    const newTh = document.createElement('th');
                    newTh.className = 'replaced';
                    return { column, element: newTh };
                });
                grid._rebuildHeader();

                const ths = container.querySelectorAll('thead th');
                ths.forEach(th => expect(th.className).to.equal('replaced'));
            });

            it('headerCellRender does not fire when no filter registered', async () => {
                const grid = makeGrid({
                    columns: [{ field: 'name', label: 'Name' }],
                    _rows: [{ name: 'Alice' }]
                });
                await grid.init();

                grid._rebuildHeader();

                const ths = container.querySelectorAll('thead th');
                expect(ths.length).to.equal(1);
                expect(ths[0].textContent).to.equal('Name');
            });

            it('headerRowRender fires with the header tr', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }] });
                await grid.init();

                grid.addFilter('headerRowRender', ({ element }) => {
                    element.setAttribute('data-row-custom', 'yes');
                    return { element };
                });
                grid._rebuildHeader();

                const tr = container.querySelector('thead tr');
                expect(tr.getAttribute('data-row-custom')).to.equal('yes');
            });

            it('headerRowRender can replace the tr element', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }] });
                await grid.init();

                grid.addFilter('headerRowRender', () => {
                    const newTr = document.createElement('tr');
                    const newTh = document.createElement('th');
                    newTh.className = 'new-row';
                    newTr.appendChild(newTh);
                    return { element: newTr };
                });
                grid._rebuildHeader();

                const firstChild = grid.theadElement.firstElementChild;
                expect(firstChild.querySelector('.new-row')).to.not.be.null;
            });

            it('rowRender fires for each rendered row', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }, { name: 'Bob' }] });
                await grid.init();

                grid.addFilter('rowRender', (info) => {
                    info.element.setAttribute('data-custom', 'yes');
                    return info;
                });
                grid._renderBody();

                const trs = container.querySelectorAll('tbody tr');
                trs.forEach(tr => expect(tr.getAttribute('data-custom')).to.equal('yes'));
            });

            it('rowRender can replace the tr element', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }, { name: 'Bob' }] });
                await grid.init();

                grid.addFilter('rowRender', ({ row, index }) => {
                    const newTr = document.createElement('tr');
                    newTr.className = 'replaced-row';
                    return { row, index, element: newTr };
                });
                grid._renderBody();

                const trs = container.querySelectorAll('tbody tr');
                trs.forEach(tr => expect(tr.className).to.equal('replaced-row'));
            });

            it('rowRender receives correct row and index arguments', async () => {
                const rows = [{ name: 'Alice' }, { name: 'Bob' }];
                const grid = makeGrid({ _rows: rows });
                await grid.init();

                const spy = sinon.spy((info) => info);
                grid.addFilter('rowRender', spy);
                grid._renderBody();

                expect(spy.callCount).to.equal(2);
                expect(spy.firstCall.args[0].index).to.equal(0);
                expect(spy.firstCall.args[0].row.name).to.equal('Alice');
                expect(spy.secondCall.args[0].index).to.equal(1);
                expect(spy.secondCall.args[0].row.name).to.equal('Bob');
            });

            it('rowRender does not fire when no filter registered', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }, { name: 'Bob' }] });
                await grid.init();

                grid._renderBody();

                const trs = container.querySelectorAll('tbody tr');
                expect(trs.length).to.equal(2);
                expect(trs[0].textContent).to.include('Alice');
            });
        });

        describe('Batch 4 — plugin-convention editing hooks', () => {
            it('commitCellEdit action can be registered and fired by a plugin', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }] });
                await grid.init();

                const spy = sinon.spy();
                grid.addAction('commitCellEdit', spy);

                const dataRow = grid.dataSet.data[0];
                grid.doAction('commitCellEdit', {
                    row: dataRow, column: 'name', oldValue: 'Alice', newValue: 'Bob'
                });

                expect(spy.calledOnce).to.be.true;
                expect(spy.firstCall.args[0].oldValue).to.equal('Alice');
                expect(spy.firstCall.args[0].newValue).to.equal('Bob');
            });

            it('commitCellEdit write-back updates dataSet via updateRow', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }, { name: 'Bob' }] });
                await grid.init();

                const firstRow = grid.dataSet.data[0];

                grid.addAction('commitCellEdit', ({ row, column, newValue }) => {
                    grid.dataSet.updateRow(row, { [column]: newValue });
                });

                grid.doAction('commitCellEdit', {
                    row: firstRow, column: 'name', oldValue: 'Alice', newValue: 'Updated'
                });

                expect(grid.dataSet.data[0].name).to.equal('Updated');
                expect(grid.dataSet.data[1].name).to.equal('Bob');
            });

            it('cancelCellEdit action can be registered and fires with correct args', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }] });
                await grid.init();

                const spy = sinon.spy();
                grid.addAction('cancelCellEdit', spy);

                grid.doAction('cancelCellEdit', { row: {}, column: 'name' });

                expect(spy.calledOnce).to.be.true;
                expect(spy.firstCall.args[0].column).to.equal('name');
            });

            it('beforeCellEdit filter can replace the editor element', async () => {
                const grid = makeGrid({ _rows: [{ name: 'Alice' }] });
                await grid.init();

                grid.addFilter('beforeCellEdit', ({ row, column }) => {
                    const input = document.createElement('input');
                    input.className = 'custom-input';
                    return { row, column, element: input };
                });

                const result = grid.applyFilters('beforeCellEdit', {
                    row: {}, column: 'name', element: document.createElement('td')
                });

                expect(result.element.tagName).to.equal('INPUT');
                expect(result.element.className).to.equal('custom-input');
            });
        });
    });

    // ── Grid-level public API pass-through ─────────────────────────────────────

    describe('grid-level hook API', () => {
        it('grid.addAction / grid.doAction pass through to hooks', async () => {
            const grid = makeGrid();
            await grid.init();
            const spy = sinon.spy();

            grid.addAction('custom', spy);
            grid.doAction('custom', 'arg1');

            expect(spy.calledWith('arg1')).to.be.true;
        });

        it('grid.addFilter / grid.applyFilters pass through to hooks', async () => {
            const grid = makeGrid();
            await grid.init();

            grid.addFilter('upper', v => v.toUpperCase());
            expect(grid.applyFilters('upper', 'hello')).to.equal('HELLO');
        });

        it('grid.removeAction removes a hook', async () => {
            const grid = makeGrid();
            await grid.init();
            const spy = sinon.spy();

            grid.addAction('test', spy);
            grid.removeAction('test', spy);
            grid.doAction('test');

            expect(spy.called).to.be.false;
        });

        it('grid.hasAction / grid.hasFilter work', async () => {
            const grid = makeGrid();
            await grid.init();

            expect(grid.hasAction('test')).to.be.false;
            grid.addAction('test', () => { });
            expect(grid.hasAction('test')).to.be.true;

            expect(grid.hasFilter('test')).to.be.false;
            grid.addFilter('test', v => v);
            expect(grid.hasFilter('test')).to.be.true;
        });

        it('grid.removeAllHooks removes by namespace', async () => {
            const grid = makeGrid();
            await grid.init();
            const spy = sinon.spy();

            grid.addAction('test', spy, 10, 'my-plugin');
            grid.removeAllHooks('my-plugin');
            grid.doAction('test');

            expect(spy.called).to.be.false;
        });

        it('grid.registerCommand / grid.executeCommand round-trip', async () => {
            const grid = makeGrid();
            await grid.init();

            grid.registerCommand('ping', () => 'pong');
            expect(grid.executeCommand('ping')).to.equal('pong');
        });

        it('grid.removeFilter removes a filter hook', async () => {
            const grid = makeGrid();
            await grid.init();
            const cb = v => v + '-extra';

            grid.addFilter('test', cb);
            grid.removeFilter('test', cb);

            expect(grid.applyFilters('test', 'val')).to.equal('val');
        });
    });

    // ── Additional edge cases ──────────────────────────────────────────────────

    describe('additional edge cases', () => {
        it('plugin without destroy method does not throw on grid.destroy()', async () => {
            const plugin = { init() { } }; // no destroy method
            const grid = makeGrid({ plugins: [plugin] });
            await grid.init();

            expect(() => grid.destroy()).to.not.throw();
        });

        it('multiple plugins init in registration order', async () => {
            const order = [];
            const p1 = { init() { order.push('first'); } };
            const p2 = { init() { order.push('second'); } };
            const p3 = { init() { order.push('third'); } };

            // Constructor calls init() automatically; await the returned promise
            const grid = makeGrid({ plugins: [p1, p2, p3] });
            await grid.init();

            // init() runs twice (constructor + explicit call), verify order within each cycle
            expect(order.slice(0, 3)).to.deep.equal(['first', 'second', 'third']);
            expect(order.slice(3, 6)).to.deep.equal(['first', 'second', 'third']);
        });

        it('cellRender can replace the td element entirely', async () => {
            const grid = makeGrid({ _rows: [{ name: 'Test' }] });
            await grid.init();

            grid.addFilter('cellRender', (info) => {
                const newTd = document.createElement('td');
                newTd.textContent = 'replaced';
                newTd.className = 'custom-cell';
                return { ...info, element: newTd };
            });
            grid._renderBody();

            const td = container.querySelector('tbody td');
            expect(td.textContent).to.equal('replaced');
            expect(td.className).to.equal('custom-cell');
        });

        it('destroy clears the dataSet', async () => {
            const grid = makeGrid({ _rows: [{ name: 'Alice' }] });
            await grid.init();
            expect(grid.dataSet.data.length).to.be.greaterThan(0);

            grid.destroy();
            expect(grid.dataSet.data.length).to.equal(0);
        });
    });
});
