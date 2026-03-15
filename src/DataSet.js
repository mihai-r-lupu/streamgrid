// In-memory dataset: wraps a row array and exposes CRUD, sort, and filter operations.

import { filterRows } from './core/filtering/filterEngine.js';

/**
 * Handles local dataset operations: select, insert, update, delete, sort.
 */
export class DataSet {
    /**
     * @param {Array<object>} [data=[]]
     */
    constructor(data = []) {
        /** @type {Array<object>} */
        this.data = data;
    }

    /**
     * Selects rows, optionally filtering.
     * @param {Function|null} filterFn
     * @returns {Array<object>}
     */
    select(filterFn = null) {
        return filterFn ? this.data.filter(filterFn) : [...this.data];
    }

    /**
     * Inserts a new row.
     * @param {object} row
     */
    insert(row) {
        this.data.push(row);
    }

    /**
     * Updates a row by id.
     * @param {number|string} id
     * @param {object} updates
     * @param {string} [idField='id']
     */
    update(id, updates, idField = 'id') {
        const index = this.data.findIndex(item => item[idField] === id);
        if (index > -1) {
            this.data[index] = { ...this.data[index], ...updates };
        }
    }

    /**
     * Deletes a row by id.
     * @param {number|string} id
     * @param {string} [idField='id']
     */
    delete(id, idField = 'id') {
        this.data = this.data.filter(item => item[idField] !== id);
    }

    /**
     * Sorts rows using a comparator function.
     * @param {Function} compareFn
     */
    sort(compareFn) {
        this.data.sort(compareFn);
    }

    /**
     * Returns rows filtered by the given fields and query using filterRows.
     * @param {string[]} fields
     * @param {string} query
     * @param {Object} options
     */
    filterBy(fields, query, options) {
        const filteredRows = filterRows(this.data, fields, query, options);
        return { rows: filteredRows };
    }
}