import { expect } from 'chai';
import sinon from 'sinon';
import { HookManager } from '../../src/hooks/HookManager.js';

describe('HookManager', () => {

    // ── Existing tests (backward-compatibility) ────────────────────────────────

    it('should run added actions', () => {
        const hooks = new HookManager();
        let actionCalled = false;

        hooks.addAction('testAction', () => {
            actionCalled = true;
        });

        hooks.doAction('testAction');

        expect(actionCalled).to.be.true;
    });

    it('should apply filters to a value', () => {
        const hooks = new HookManager();
        hooks.addFilter('modifyValue', (value) => value + ' world');

        const result = hooks.applyFilters('modifyValue', 'Hello');

        expect(result).to.equal('Hello world');
    });

    it('should handle no actions or filters gracefully', () => {
        const hooks = new HookManager();
        hooks.doAction('nonexistentAction');
        const result = hooks.applyFilters('nonexistentFilter', 'Original');

        expect(result).to.equal('Original');
    });

    // ── Priority ordering ──────────────────────────────────────────────────────

    describe('priority ordering', () => {
        it('actions execute in ascending priority order', () => {
            const hooks = new HookManager();
            const order = [];

            hooks.addAction('test', () => order.push('default-10'), 10);
            hooks.addAction('test', () => order.push('early-5'), 5);
            hooks.addAction('test', () => order.push('late-20'), 20);

            hooks.doAction('test');
            expect(order).to.deep.equal(['early-5', 'default-10', 'late-20']);
        });

        it('same priority preserves insertion order (FIFO)', () => {
            const hooks = new HookManager();
            const order = [];

            hooks.addAction('test', () => order.push('first'), 10);
            hooks.addAction('test', () => order.push('second'), 10);
            hooks.addAction('test', () => order.push('third'), 10);

            hooks.doAction('test');
            expect(order).to.deep.equal(['first', 'second', 'third']);
        });

        it('filters chain in ascending priority order', () => {
            const hooks = new HookManager();

            hooks.addFilter('chain', v => v + '-late', 20);
            hooks.addFilter('chain', v => v + '-early', 5);
            hooks.addFilter('chain', v => v + '-default', 10);

            expect(hooks.applyFilters('chain', 'start')).to.equal('start-early-default-late');
        });

        it('default priority is 10 when omitted', () => {
            const hooks = new HookManager();
            const order = [];

            hooks.addAction('test', () => order.push('explicit-10'), 10);
            hooks.addAction('test', () => order.push('implicit'));

            hooks.doAction('test');
            expect(order).to.deep.equal(['explicit-10', 'implicit']);
        });
    });

    // ── removeAction / removeFilter ────────────────────────────────────────────

    describe('remove hooks', () => {
        it('removeAction removes a callback by reference', () => {
            const hooks = new HookManager();
            const cb = sinon.spy();

            hooks.addAction('test', cb);
            hooks.removeAction('test', cb);
            hooks.doAction('test');

            expect(cb.called).to.be.false;
        });

        it('removeFilter removes a callback by reference', () => {
            const hooks = new HookManager();
            const cb = v => v + ' removed';

            hooks.addFilter('test', cb);
            hooks.removeFilter('test', cb);

            expect(hooks.applyFilters('test', 'value')).to.equal('value');
        });

        it('removeAction on non-existent hook does not throw', () => {
            const hooks = new HookManager();
            expect(() => hooks.removeAction('nope', () => { })).to.not.throw();
        });

        it('removeFilter on non-existent hook does not throw', () => {
            const hooks = new HookManager();
            expect(() => hooks.removeFilter('nope', () => { })).to.not.throw();
        });
    });

    // ── hasAction / hasFilter ──────────────────────────────────────────────────

    describe('has hooks', () => {
        it('hasAction returns true when callbacks exist', () => {
            const hooks = new HookManager();
            hooks.addAction('test', () => { });
            expect(hooks.hasAction('test')).to.be.true;
        });

        it('hasAction returns false when no callbacks exist', () => {
            const hooks = new HookManager();
            expect(hooks.hasAction('test')).to.be.false;
        });

        it('hasFilter returns true when callbacks exist', () => {
            const hooks = new HookManager();
            hooks.addFilter('test', v => v);
            expect(hooks.hasFilter('test')).to.be.true;
        });

        it('hasFilter returns false when no callbacks exist', () => {
            const hooks = new HookManager();
            expect(hooks.hasFilter('test')).to.be.false;
        });

        it('hasAction returns false after all callbacks are removed', () => {
            const hooks = new HookManager();
            const cb = () => { };
            hooks.addAction('test', cb);
            hooks.removeAction('test', cb);
            expect(hooks.hasAction('test')).to.be.false;
        });
    });

    // ── Async execution ────────────────────────────────────────────────────────

    describe('async hooks', () => {
        it('doActionAsync awaits each callback sequentially', async () => {
            const hooks = new HookManager();
            const order = [];

            hooks.addAction('test', async () => {
                await new Promise(r => setTimeout(r, 10));
                order.push('slow');
            });
            hooks.addAction('test', () => { order.push('fast'); });

            await hooks.doActionAsync('test');
            expect(order).to.deep.equal(['slow', 'fast']);
        });

        it('applyFiltersAsync chains async filters', async () => {
            const hooks = new HookManager();

            hooks.addFilter('test', async (v) => {
                await new Promise(r => setTimeout(r, 5));
                return v + '-async';
            });
            hooks.addFilter('test', v => v + '-sync');

            const result = await hooks.applyFiltersAsync('test', 'start');
            expect(result).to.equal('start-async-sync');
        });

        it('doActionAsync returns immediately when no callbacks exist', async () => {
            const hooks = new HookManager();
            await hooks.doActionAsync('nope'); // should not throw
        });

        it('applyFiltersAsync returns original value when no callbacks exist', async () => {
            const hooks = new HookManager();
            const result = await hooks.applyFiltersAsync('nope', 42);
            expect(result).to.equal(42);
        });
    });

    // ── Command registry ───────────────────────────────────────────────────────

    describe('command registry', () => {
        it('registerCommand + executeCommand round-trip', () => {
            const hooks = new HookManager();
            hooks.registerCommand('greet', name => `Hello ${name}`);
            expect(hooks.executeCommand('greet', 'World')).to.equal('Hello World');
        });

        it('executeCommand throws for unregistered command', () => {
            const hooks = new HookManager();
            expect(() => hooks.executeCommand('nope')).to.throw(/not registered/);
        });

        it('registerCommand overwrites previous handler', () => {
            const hooks = new HookManager();
            hooks.registerCommand('cmd', () => 'v1');
            hooks.registerCommand('cmd', () => 'v2');
            expect(hooks.executeCommand('cmd')).to.equal('v2');
        });
    });

    // ── Namespace support ──────────────────────────────────────────────────────

    describe('namespace support', () => {
        it('removeAllHooks removes all hooks under a namespace', () => {
            const hooks = new HookManager();
            const actionSpy = sinon.spy();
            const filterCb = v => v + '-ns';

            hooks.addAction('render', actionSpy, 10, 'my-plugin');
            hooks.addFilter('data', filterCb, 10, 'my-plugin');
            hooks.addAction('render', () => { }, 10, 'other-plugin');

            hooks.removeAllHooks('my-plugin');

            hooks.doAction('render');
            expect(actionSpy.called).to.be.false;
            expect(hooks.applyFilters('data', 'val')).to.equal('val');

            // other-plugin's action was not removed
            expect(hooks.hasAction('render')).to.be.true;
        });

        it('namespace can be passed as string in 4th parameter', () => {
            const hooks = new HookManager();
            const cb = sinon.spy();
            hooks.addAction('test', cb, 10, 'ns1');
            hooks.removeAllHooks('ns1');
            hooks.doAction('test');
            expect(cb.called).to.be.false;
        });

        it('namespace can be passed in options object', () => {
            const hooks = new HookManager();
            const cb = sinon.spy();
            hooks.addAction('test', cb, 10, { namespace: 'ns2' });
            hooks.removeAllHooks('ns2');
            hooks.doAction('test');
            expect(cb.called).to.be.false;
        });
    });

    // ── Once registration ──────────────────────────────────────────────────────

    describe('once registration', () => {
        it('action with once: true runs once then is removed', () => {
            const hooks = new HookManager();
            const cb = sinon.spy();

            hooks.addAction('test', cb, 10, { once: true });
            hooks.doAction('test');
            hooks.doAction('test');

            expect(cb.callCount).to.equal(1);
        });

        it('filter with once: true runs once then is removed', () => {
            const hooks = new HookManager();
            hooks.addFilter('test', v => v + '-once', 10, { once: true });

            expect(hooks.applyFilters('test', 'a')).to.equal('a-once');
            expect(hooks.applyFilters('test', 'b')).to.equal('b');
        });
    });

    // ── Error isolation ────────────────────────────────────────────────────────

    describe('error isolation', () => {
        it('action callback throwing does not crash the chain', () => {
            const hooks = new HookManager();
            const order = [];
            const consoleStub = sinon.stub(console, 'error');

            hooks.addAction('test', () => { throw new Error('boom'); });
            hooks.addAction('test', () => order.push('second'));

            hooks.doAction('test');

            expect(order).to.deep.equal(['second']);
            expect(consoleStub.calledOnce).to.be.true;
            consoleStub.restore();
        });

        it('filter callback throwing does not crash the chain', () => {
            const hooks = new HookManager();
            const consoleStub = sinon.stub(console, 'error');

            hooks.addFilter('test', () => { throw new Error('boom'); });
            hooks.addFilter('test', v => v + '-ok');

            const result = hooks.applyFilters('test', 'start');
            expect(result).to.equal('start-ok');
            expect(consoleStub.calledOnce).to.be.true;
            consoleStub.restore();
        });

        it('async action callback throwing does not crash the chain', async () => {
            const hooks = new HookManager();
            const order = [];
            const consoleStub = sinon.stub(console, 'error');

            hooks.addAction('test', async () => { throw new Error('async-boom'); });
            hooks.addAction('test', () => order.push('survived'));

            await hooks.doActionAsync('test');

            expect(order).to.deep.equal(['survived']);
            consoleStub.restore();
        });

        it('async filter callback throwing does not crash the chain', async () => {
            const hooks = new HookManager();
            const consoleStub = sinon.stub(console, 'error');

            hooks.addFilter('test', async () => { throw new Error('async-boom'); });
            hooks.addFilter('test', v => v + '-ok');

            const result = await hooks.applyFiltersAsync('test', 'start');
            expect(result).to.equal('start-ok');
            consoleStub.restore();
        });
    });

    // ── Return value contract ──────────────────────────────────────────────────

    describe('return value contract', () => {
        it('filter returning undefined preserves the previous value', () => {
            const hooks = new HookManager();

            hooks.addFilter('test', () => undefined); // forgot to return
            hooks.addFilter('test', v => v + '-kept');

            expect(hooks.applyFilters('test', 'start')).to.equal('start-kept');
        });
    });

    // ── Debug mode ─────────────────────────────────────────────────────────────

    describe('debug mode', () => {
        let logStub;

        beforeEach(() => {
            logStub = sinon.stub(console, 'log');
        });

        afterEach(() => {
            logStub.restore();
        });

        it('logs hook calls when debug is true', () => {
            const hooks = new HookManager();
            hooks.debug = true;

            hooks.addAction('test', () => { });
            hooks.addFilter('f', v => v);
            hooks.doAction('test');
            hooks.applyFilters('f', 'val');

            expect(logStub.callCount).to.be.greaterThanOrEqual(2);
        });

        it('does not log when debug is false', () => {
            const hooks = new HookManager();

            hooks.addAction('test', () => { });
            hooks.doAction('test');

            expect(logStub.called).to.be.false;
        });
    });

    // ── Additional edge cases ──────────────────────────────────────────────────

    describe('additional edge cases', () => {
        it('hasFilter returns false after all callbacks are removed', () => {
            const hooks = new HookManager();
            const cb = v => v;
            hooks.addFilter('test', cb);
            hooks.removeFilter('test', cb);
            expect(hooks.hasFilter('test')).to.be.false;
        });

        it('once with custom priority still fires in correct order', () => {
            const hooks = new HookManager();
            const order = [];

            hooks.addAction('test', () => order.push('normal-10'), 10);
            hooks.addAction('test', () => order.push('once-5'), 5, { once: true });
            hooks.addAction('test', () => order.push('normal-20'), 20);

            hooks.doAction('test');
            expect(order).to.deep.equal(['once-5', 'normal-10', 'normal-20']);

            // Second call should skip the once callback
            order.length = 0;
            hooks.doAction('test');
            expect(order).to.deep.equal(['normal-10', 'normal-20']);
        });

        it('once and namespace can be combined in options object', () => {
            const hooks = new HookManager();
            const cb = sinon.spy();

            hooks.addAction('test', cb, 10, { once: true, namespace: 'my-ns' });
            hooks.doAction('test');
            hooks.doAction('test');

            expect(cb.callCount).to.equal(1);
        });

        it('doActionAsync respects priority ordering', async () => {
            const hooks = new HookManager();
            const order = [];

            hooks.addAction('test', () => order.push('late-20'), 20);
            hooks.addAction('test', () => order.push('early-5'), 5);
            hooks.addAction('test', () => order.push('default-10'), 10);

            await hooks.doActionAsync('test');
            expect(order).to.deep.equal(['early-5', 'default-10', 'late-20']);
        });

        it('applyFiltersAsync preserves value when filter returns undefined', async () => {
            const hooks = new HookManager();

            hooks.addFilter('test', async () => undefined);
            hooks.addFilter('test', v => v + '-kept');

            const result = await hooks.applyFiltersAsync('test', 'start');
            expect(result).to.equal('start-kept');
        });

        it('once action fires once then is removed in async execution', async () => {
            const hooks = new HookManager();
            const cb = sinon.spy();

            hooks.addAction('test', cb, 10, { once: true });
            await hooks.doActionAsync('test');
            await hooks.doActionAsync('test');

            expect(cb.callCount).to.equal(1);
        });

        it('once filter fires once then is removed in async execution', async () => {
            const hooks = new HookManager();
            hooks.addFilter('test', v => v + '-once', 10, { once: true });

            const r1 = await hooks.applyFiltersAsync('test', 'a');
            const r2 = await hooks.applyFiltersAsync('test', 'b');

            expect(r1).to.equal('a-once');
            expect(r2).to.equal('b');
        });

        it('removeAllHooks with non-matching namespace is a no-op', () => {
            const hooks = new HookManager();
            const cb = sinon.spy();

            hooks.addAction('test', cb, 10, 'existing-ns');
            hooks.removeAllHooks('non-existing-ns');
            hooks.doAction('test');

            expect(cb.calledOnce).to.be.true;
        });
    });
});
