// Abstract base class that defines the contract every data adapter must implement.

/**
 * Abstract base class for StreamGrid data adapters.
 * Extend this class and implement all methods to connect StreamGrid to any data source.
 */
export class BaseDataAdapter {
    /**
     * Return an array of column names for the given table.
     * @param {string} table
     * @returns {Promise<string[]>}
     */
    async getColumns(table) {
        throw new Error(`getColumns() not implemented for table: ${table}`);
    }

    /**
     * Return an array of row objects for the given table.
     * @param {string} table
     * @param {object} [options]
     * @returns {Promise<object[]>}
     */
    async fetchData(table, options = {}) {
        throw new Error(`fetchData() not implemented for table: ${table}`);
    }

    /**
     * Insert a new row into the given table.
     * @param {string} table
     * @param {object} data
     * @returns {Promise<object>}
     */
    async insertRow(table, data) {
        throw new Error(`insertRow() not implemented for table: ${table}`);
    }

    /**
     * Update an existing row by ID.
     * @param {string} table
     * @param {number|string} id
     * @param {object} data
     * @returns {Promise<object>}
     */
    async updateRow(table, id, data) {
        throw new Error(`updateRow() not implemented for table: ${table}`);
    }

    /**
     * Delete a row by ID.
     * @param {string} table
     * @param {number|string} id
     * @returns {Promise<boolean>}
     */
    async deleteRow(table, id) {
        throw new Error(`deleteRow() not implemented for table: ${table}`);
    }
}
