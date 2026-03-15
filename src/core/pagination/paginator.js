// Pure pagination slice functions used by StreamGrid.renderBody().

// src/utils/Paginator.js

/**
 * Returns a slice of data for classic pagination (1-based pages).
 * @param {Array} data - Full array of items.
 * @param {number} currentPage - The current page number (1-based).
 * @param {number} pageSize - Number of items per page.
 * @returns {Array} - Items for the requested page.
 */
export function page(data, currentPage = 1, pageSize = 10) {
  const start = (currentPage - 1) * pageSize;
  return data.slice(start, start + pageSize);
}

/**
 * Returns a growing slice of data for infinite scroll.
 * @param {Array} data - Full array of items.
 * @param {number} loadedCount - Number of items currently loaded.
 * @param {number} initialSize - Number of items to load initially.
 * @param {number} [totalLimit] - Optional cap on maximum items.
 * @returns {{ rows: Array, nextCount: number }} 
 *   - rows: items to render,
 *   - nextCount: number to use for next load.
 */
export function infinite(data, loadedCount = 0, initialSize = 10, totalLimit) {
  // On first load, use initialSize; thereafter use loadedCount
  const count = loadedCount > 0 ? loadedCount : initialSize;
  // Enforce totalLimit if provided
  const limit = totalLimit != null ? Math.min(count, totalLimit) : count;
  return {
    rows: data.slice(0, limit),
    nextCount: limit
  };
}
