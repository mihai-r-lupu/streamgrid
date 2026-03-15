import { expect } from 'chai';
import { HookManager } from '../../src/hooks/HookManager.js';

describe('HookManager', () => {
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
});
