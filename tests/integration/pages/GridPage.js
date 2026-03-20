/**
 * Page Object for the main StreamGrid (#grid) and pagination grid (#pagination-grid).
 */
export class GridPage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    static SELECTORS = {
        ROW: '#grid tbody tr',
        CELL: '#grid tbody td',
        FILTER_INPUT: '#grid input[type="text"]',
        SCROLL_WRAPPER: '#grid .sg-table-wrapper',
        PAGINATION_ROW: '#pagination-grid tbody tr',
        PAGINATION_NEXT: '#pagination-grid .pagination-controls button:text("Next")',
    };

    /** Navigate to test page, optionally with query params (e.g. { filterMode: 'client' }). */
    async goto(params = {}) {
        const qs = new URLSearchParams(params).toString();
        await this.page.goto(qs ? `/test-page.html?${qs}` : '/test-page.html');
    }

    /** Wait until the main grid has fully loaded (rows rendered + network idle). */
    async waitForReady() {
        await this.page.waitForSelector(GridPage.SELECTORS.ROW);
        await this.page.waitForLoadState('networkidle');
    }

    async rowCount() {
        return this.page.$$eval(GridPage.SELECTORS.ROW, els => els.length);
    }

    /** Scroll the grid wrapper to the bottom and wait for new rows to appear. */
    async scrollToBottom() {
        await this.page.$eval(GridPage.SELECTORS.SCROLL_WRAPPER, el => {
            el.scrollTop = el.scrollHeight;
            el.dispatchEvent(new Event('scroll'));
        });
        // Wait for the async data fetch + render cycle to settle.
        await this.page.waitForTimeout(1000);
    }

    async filterBy(text) {
        await this.page.fill(GridPage.SELECTORS.FILTER_INPUT, text);
        // Debounce + re-render settle time (centralized for easy replacement)
        await this.page.waitForTimeout(500);
    }

    async loadMoreRows() {
        await this.page.evaluate(() => window.grid.loadMoreRows());
        await this.page.waitForTimeout(500);
    }

    /**
     * Click the first cell and return which events fired via console.
     * @returns {Promise<{cellClicked: boolean, rowClicked: boolean}>}
     */
    async clickFirstCell() {
        let cellClicked = false, rowClicked = false;
        const handler = msg => {
            const text = msg.text();
            if (text.includes('[Event] cellClicked')) cellClicked = true;
            if (text.includes('[Event] dataRowClicked')) rowClicked = true;
        };
        this.page.on('console', handler);
        await this.page.click(GridPage.SELECTORS.CELL);
        this.page.off('console', handler);
        return { cellClicked, rowClicked };
    }

    // ── Pagination grid helpers ──────────────────────────────────────────────

    async waitForPaginationReady() {
        await this.page.waitForSelector(GridPage.SELECTORS.PAGINATION_ROW);
    }

    async clickPaginationNext() {
        await this.page.click(GridPage.SELECTORS.PAGINATION_NEXT);
        await this.page.waitForTimeout(500);
    }

    async paginationRowCount() {
        return this.page.$$eval(GridPage.SELECTORS.PAGINATION_ROW, els => els.length);
    }
}
