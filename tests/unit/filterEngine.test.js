import { expect } from 'chai';
import { filterRows } from '../../src/core/filtering/filterEngine.js';

describe('filterEngine', () => {

    const sampleData = [
        { name: 'Alice', email: 'alice@example.com', status: 'active' },
        { name: 'Bob', email: 'bob@example.com', status: 'inactive' },
        { name: 'Charlie', email: 'charlie@example.com', status: 'active' },
    ];

    it('returns the full dataset when query is empty string', () => {
        const result = filterRows(sampleData, ['name'], '');
        expect(result).to.have.lengthOf(3);
    });

    it('returns the full dataset when query is null or undefined', () => {
        expect(filterRows(sampleData, ['name'], null)).to.have.lengthOf(3);
        expect(filterRows(sampleData, ['name'], undefined)).to.have.lengthOf(3);
    });

    it('filters by partial match across specified fields', () => {
        const result = filterRows(sampleData, ['name', 'email'], 'ali');
        expect(result).to.have.lengthOf(1);
        expect(result[0].name).to.equal('Alice');
    });

    it('does not crash when a row has null or undefined field values', () => {
        const data = [
            { name: null, email: 'a@b.com' },
            { name: undefined, email: 'c@d.com' },
            { name: 'Alice', email: 'alice@example.com' },
        ];
        const result = filterRows(data, ['name'], 'alice');
        expect(result).to.have.lengthOf(1);
        expect(result[0].name).to.equal('Alice');
    });

    it('does not crash when a field key is missing from a row entirely', () => {
        const data = [
            { email: 'a@b.com' },          // no 'name' key at all
            { name: 'Bob', email: 'bob@example.com' },
        ];
        const result = filterRows(data, ['name'], 'bob');
        expect(result).to.have.lengthOf(1);
        expect(result[0].name).to.equal('Bob');
    });

    it('respects exactMatch option when true', () => {
        const result = filterRows(sampleData, ['name'], 'Alice', { exactMatch: true });
        expect(result).to.have.lengthOf(1);
        expect(result[0].name).to.equal('Alice');

        const noMatch = filterRows(sampleData, ['name'], 'Ali', { exactMatch: true });
        expect(noMatch).to.have.lengthOf(0);
    });

    it('respects exactCase option when true', () => {
        const result = filterRows(sampleData, ['name'], 'alice', { exactCase: true });
        expect(result).to.have.lengthOf(0);

        const match = filterRows(sampleData, ['name'], 'Alice', { exactCase: true });
        expect(match).to.have.lengthOf(1);
    });

    it('filters 10,000 rows in under 50ms', () => {
        const rows = Array.from({ length: 10000 }, (_, i) => ({
            name: `User ${i}`,
            email: `user${i}@example.com`
        }));
        const start = Date.now();
        const result = filterRows(rows, ['name', 'email'], 'User 50');
        const elapsed = Date.now() - start;
        expect(elapsed).to.be.lessThan(50);
        expect(result.length).to.be.greaterThan(0);
    });

});
