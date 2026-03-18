// REST API adapter: connects StreamGrid to any standard JSON REST backend.

import { BaseDataAdapter } from './BaseDataAdapter.js';
import { buildUrl } from '../queryBuilder.js';
/**
 * Data adapter for REST API backends.
 * Serialises filter, pagination, and sort state into URL query parameters via
 * the query builder, then delegates to the native `fetch` API.
 *
 * Column discovery fetches a single row via `?_limit=1` and infers column
 * names from its keys.  No dedicated `/columns` endpoint is required.
 */
export class RestApiAdapter extends BaseDataAdapter {
    /**
     * @param {{ baseUrl: string }} options
     */
    constructor({ baseUrl }) {
        super();
        this.baseUrl = baseUrl;
    }

    async fetchData(table, config = {}) {
        const url = buildUrl(`${this.baseUrl}/${table}`, config);
        const response = await fetch(url);
        return await response.json();
    }

    async getColumns(table) {
        try {
            const sampleResponse = await fetch(`${this.baseUrl}/${table}?_limit=1`);
            if (!sampleResponse.ok) throw new Error('Failed fetching sample row');

            const data = await sampleResponse.json();
            if (!Array.isArray(data) || data.length === 0) {
                console.error(`No rows returned from /${table} to infer columns.`);
                return [];
            }

            return Object.keys(data[0]);
        } catch (error) {
            console.error(`getColumns() failed for table '${table}': ${error.message}`);
            return [];
        }
    }

    async insertRow(table, data) {
        const response = await fetch(`${this.baseUrl}/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async updateRow(table, id, data) {
        const response = await fetch(`${this.baseUrl}/${table}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async deleteRow(table, id) {
        const response = await fetch(`${this.baseUrl}/${table}/${id}`, {
            method: 'DELETE'
        });
        return response.ok;
    }
}