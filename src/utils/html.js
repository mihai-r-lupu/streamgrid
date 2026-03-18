// XSS-safe tagged template literal helper for use in column render() callbacks.
// Zero dependencies. Does not import from StreamGrid or any other project file.

/**
 * Escapes a value for safe inclusion in HTML.
 * Converts the value to a string first (`null`/`undefined` become `''`).
 * Replaces `&`, `<`, `>`, `"`, and `'` with their HTML entities in that order.
 *
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Tagged template literal that HTML-escapes every interpolated value.
 * Static string parts are emitted verbatim; only interpolated values go
 * through `escapeHtml`. Returns a plain string.
 *
 * ```js
 * import { html } from 'stream-grid/utils';
 *
 * render: (value, row) => html`<span class="badge badge-${row.status}">${value}</span>`
 * // value="<script>" → "<span class="badge badge-active">&lt;script&gt;</span>"
 * ```
 *
 * **Note:** All interpolated values are escaped unconditionally. If you need to
 * pass a trusted HTML fragment through unescaped, assign it via `td.innerHTML`
 * directly in the render callback rather than using this helper.
 *
 * @param {TemplateStringsArray} strings
 * @param {...*} values
 * @returns {string}
 */
export function html(strings, ...values) {
    let result = '';
    strings.forEach((str, i) => {
        result += str;
        if (i < values.length) {
            result += escapeHtml(values[i]);
        }
    });
    return result;
}
