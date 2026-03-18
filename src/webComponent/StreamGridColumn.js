/**
 * <stream-grid-column> — passive data carrier for declarative column configuration.
 *
 * This element performs no rendering. Its attributes are read once by the parent
 * <stream-grid> element during connectedCallback and converted into a StreamGrid
 * columns array. Dynamic mutation of these attributes after the parent has
 * initialised is not observed (read-once policy, v1).
 *
 * Supported attributes (all optional):
 *   field    — maps to column.field (required for data-bound columns)
 *   label    — maps to column.label (falls back to field name if absent)
 *   sortable — "false" disables sorting for this column; anything else = sortable
 *   width    — maps to column.width (CSS value string, e.g. "120px")
 */
export class StreamGridColumn extends HTMLElement { }

if (typeof customElements !== 'undefined') {
    customElements.define('stream-grid-column', StreamGridColumn);
}
