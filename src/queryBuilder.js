// Pure functions that serialise filter, pagination, and sort state into URL query strings.

/**
 * Serialises filter criteria into a URLSearchParams string.
 * @param {string[]} fields - Array of field names to filter on.
 * @param {string} query - The search query string.
 * @param {Object} [options] - Additional filter options.
 * @param {boolean} [options.exactMatch=false] - If true, requires exact value matching.
 * @param {boolean} [options.exactCase=false] - If true, matching is case-sensitive.
 * @param {Object} [options.extra] - Any extra custom parameters to include.
 * @returns {string} - URL-encoded query string (without leading '?').
 */
export function buildFilterParams(fields, query, options = {}) {
  const { exactMatch = false, exactCase = false, extra = {} } = options;
  const params = new URLSearchParams();

  // Add free-text query
  if (query && query.trim()) {
    params.set('q', query);
  }

  // Add fields to search against
  if (Array.isArray(fields) && fields.length > 0) {
    params.set('fields', fields.join(','));
  }

  // Add boolean flags
  if (exactMatch) {
    params.set('exactMatch', 'true');
  }
  if (exactCase) {
    params.set('exactCase', 'true');
  }

  // Include any extra parameters
  Object.entries(extra).forEach(([key, value]) => {
    if (value != null) {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

/**
 * Serialises pagination parameters into URLSearchParams.
 * @param {number} page - Current page number (1-based).
 * @param {number} pageSize - Number of items per page.
 * @returns {string}
 */
export function buildPaginationParams(page = 1, pageSize = 50) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return params.toString();
}

/**
 * Serialises sort criteria into URLSearchParams.
 * @param {string[]} sortFields - Array of fields to sort by.
 * @param {string[]} sortOrders - Array of sort orders ('asc' or 'desc'), parallel to sortFields.
 * @returns {string}
 */
export function buildSortParams(sortFields = [], sortOrders = []) {
  const params = new URLSearchParams();
  if (sortFields.length > 0) {
    params.set('sortBy', sortFields.join(','));
    if (sortOrders.length > 0) {
      params.set('sortOrder', sortOrders.join(','));
    }
  }
  return params.toString();
}

/**
 * Combines base URL with various parameter builders into a full URL.
 * @param {string} baseUrl - The API endpoint (e.g. '/api/users').
 * @param {Object} config - Configuration for query building.
 * @param {string[]} config.fields
 * @param {string} config.query
 * @param {Object} [config.filterOptions]
 * @param {number} [config.page]
 * @param {number} [config.pageSize]
 * @param {string[]} [config.sortFields]
 * @param {string[]} [config.sortOrders]
 * @param {Object} [config.extra]
 * @returns {string} - Full URL with encoded query string.
 */
export function buildUrl(baseUrl, config = {}) {
  const parts = [];
  const filterParams = buildFilterParams(config.fields || [], config.query || '', {
    exactMatch: config.filterOptions?.exactMatch,
    exactCase: config.filterOptions?.exactCase,
    extra: config.extra,
  });
  if (filterParams) parts.push(filterParams);

  if (config.page != null || config.pageSize != null) {
    parts.push(buildPaginationParams(config.page, config.pageSize));
  }

  if (config.sortFields) {
    parts.push(buildSortParams(config.sortFields, config.sortOrders || []));
  }

  const queryString = parts.filter(Boolean).join('&');
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
