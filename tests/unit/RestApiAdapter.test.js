import { expect } from 'chai';
import { RestApiAdapter } from '../../src/dataAdapter/RestApiAdapter.js';

// Mock fetch globally for this test file
global.fetch = async (url, options) => {
    const urlStr = typeof url === 'string' ? url : url.href;

    if (options && options.method === 'POST') {
        return {
            ok: true,
            json: async () => ({ success: true })
        };
    }
    if (options && options.method === 'PUT') {
        return {
            ok: true,
            json: async () => ({ success: true })
        };
    }
    if (options && options.method === 'DELETE') {
        return {
            ok: true
        };
    }
    // Default fallback fetch sample
    return {
        ok: true,
        json: async () => ([{ id: 1, name: 'John' }])
    };
};



describe('RestApiAdapter', () => {
    const adapter = new RestApiAdapter({ baseUrl: 'http://localhost/api' });

    it('should fetch columns', async () => {
        const columns = await adapter.getColumns('users');
        expect(columns).to.deep.equal(['id', 'name']);
    });

    it('should fetch data', async () => {
        const data = await adapter.fetchData('users');
        expect(data).to.be.an('array');
        expect(data[0].id).to.equal(1);
    });

    it('should insert data', async () => {
        const result = await adapter.insertRow('users', { name: 'Alice' });
        expect(result.success).to.be.true;
    });

    it('should update data', async () => {
        const result = await adapter.updateRow('users', 1, { name: 'Alice' });
        expect(result.success).to.be.true;
    });

    it('should delete data', async () => {
        const result = await adapter.deleteRow('users', 1);
        expect(result).to.be.true;
    });
});