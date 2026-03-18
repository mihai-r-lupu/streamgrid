// Built-in sort comparator functions keyed by sorter type string.

/**
 * Maps sorter type names to their comparator functions.
 * Each comparator receives two non-null, non-undefined values and returns
 * a negative number, zero, or positive number (standard Array.sort contract).
 *
 * Custom column sorters (functions) bypass this map entirely.
 */
export const SORT_COMPARATORS = {
    string: (a, b) => String(a).localeCompare(String(b)),
    number: (a, b) => Number(a) - Number(b),
    date: (a, b) => Date.parse(String(a)) - Date.parse(String(b)),
};
