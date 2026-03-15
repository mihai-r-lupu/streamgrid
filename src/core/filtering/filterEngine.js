// Pure filter function. Called by DataSet when row count is below clientFilterThreshold.
// Above the threshold, StreamGrid delegates filtering to the server via the DataAdapter.
//
// Standalone filter engine: multi-field text filtering with optional case sensitivity.

/**
 * Filters an array of data objects by specified fields and query string.
 * @param {Object[]} data - The array of row objects to filter.
 * @param {string[]} fields - The keys in each object to search within.
 * @param {string} query - The text to match against field values.
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.exactCase=false] - Whether matching is case-sensitive.
 * @param {boolean} [options.exactMatch=false] - Whether to match whole field values exactly.
 * @returns {Object[]} Filtered subset of the original data.
 */
export function filterRows(data, fields, query, options = {}) {
  if (!query || !query.trim()) return data;

  const { exactCase = false, exactMatch = false } = options;
  const normalizedQuery = exactCase ? query : query.toLowerCase();

  return data.filter(row => {
    return fields.some(field => {
      let value = row[field];
      if (value == null) return false;
      value = String(value);
      const hay = exactCase ? value : value.toLowerCase();
      if (exactMatch) {
        return hay === normalizedQuery;
      } else {
        return hay.includes(normalizedQuery);
      }
    });
  });
}