// Deterministic serialisation utility — produces identical strings regardless of
// key insertion order. Used by CacheAdapter to build stable cache keys.

/**
 * Serialises a value to a deterministic string.
 * - Primitives and null: delegated to JSON.stringify
 * - Arrays: elements serialised in their original order
 * - Plain objects: keys are sorted before serialisation (recursively)
 *
 * @param {*} value
 * @returns {string}
 */
export function stableSerialise(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return '[' + value.map(stableSerialise).join(',') + ']';
    }
    const sorted = Object.keys(value).sort();
    return '{' + sorted.map(k => JSON.stringify(k) + ':' + stableSerialise(value[k])).join(',') + '}';
}
