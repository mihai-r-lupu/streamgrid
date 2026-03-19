// StreamGridColumn — passive data carrier for <stream-grid-column>.
// Notifies its parent <stream-grid> when it connects, disconnects, or
// has a column-configuration attribute changed, triggering a grid reinit.

/**
 * `<stream-grid-column>` — declarative column configuration element.
 *
 * Performs no rendering itself. Its attributes are read by the parent
 * `<stream-grid>` element during each reinitialisation. Adding, removing,
 * or modifying a `<stream-grid-column>` child automatically triggers a
 * full reinit of the parent grid.
 *
 * Supported attributes (all optional):
 *   field    — maps to column.field (required for data-bound columns)
 *   label    — maps to column.label (falls back to field name if absent)
 *   sortable — "false" disables sorting; anything else = sortable
 *   width    — maps to column.width (CSS value, e.g. "120px")
 *   sorter   — "string" / "number" / "date"
 *   filter   — boolean attribute; present = add field to filters array
 */
export class StreamGridColumn extends HTMLElement {
    /**
     * Attribute names that cause the parent grid to reinitialise when changed.
     * Must mirror every attribute read by StreamGridElement._parseColumns().
     * @type {string[]}
     */
    static get observedAttributes() {
        return ['field', 'label', 'sortable', 'width', 'sorter', 'filter'];
    }

    /**
     * Caches the parent <stream-grid> reference and schedules a grid reinit.
     * The reference is cached here because closest() is unreliable inside
     * disconnectedCallback — by that point the element is already detached.
     * @returns {void}
     */
    connectedCallback() {
        this._parent = this.closest('stream-grid');
        this._parent?._scheduleReinit();
    }

    /**
     * Notifies the cached parent that a column attribute changed.
     * @returns {void}
     */
    attributeChangedCallback() {
        this._parent?._scheduleReinit();
    }

    /**
     * Notifies the cached parent that this column is being removed, then
     * releases the parent reference.
     * @returns {void}
     */
    disconnectedCallback() {
        this._parent?._scheduleReinit();
        this._parent = null;
    }
}

if (typeof customElements !== 'undefined') {
    customElements.define('stream-grid-column', StreamGridColumn);
}
