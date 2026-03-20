/**
 * Page Object for the CacheAdapter demo grid (#cache-grid).
 *
 * Counter semantics (defined in test-page.html):
 *   cacheMisses — incremented when rawAdapter.fetchData is called (real network fetch)
 *   cacheHits   — incremented when cachedAdapter.fetchData is called AND rawAdapter
 *                 was NOT invoked (data served from the LRU cache)
 */
export class CacheGridPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  static SELECTORS = {
    ROW:        '#cache-grid tbody tr',
    FIRST_CELL: '#cache-grid tbody tr:first-child td:first-child',
    HIT_COUNT:  '#cache-hit-count',
    MISS_COUNT: '#cache-miss-count',
    RELOAD_BTN: '#cache-reload-btn',
    CLEAR_BTN:  '#cache-clear-btn',
  };

  async waitForReady() {
    await this.page.waitForSelector(CacheGridPage.SELECTORS.ROW);
    // Ensure data has rendered (not just empty/loading rows)
    await this.page.waitForFunction(
      sel => (document.querySelector(sel) || {}).textContent?.trim().length > 0,
      CacheGridPage.SELECTORS.FIRST_CELL,
    );
  }

  async hitCount() {
    return Number(await this.page.textContent(CacheGridPage.SELECTORS.HIT_COUNT));
  }

  async missCount() {
    return Number(await this.page.textContent(CacheGridPage.SELECTORS.MISS_COUNT));
  }

  async reload() {
    await this.page.click(CacheGridPage.SELECTORS.RELOAD_BTN);
  }

  async clearCache() {
    await this.page.click(CacheGridPage.SELECTORS.CLEAR_BTN);
  }

  async goToPage(n) {
    await this.page.evaluate(n => window.cacheGrid.goToPage(n), n);
  }

  /** Poll until the hit counter reaches at least `n`. */
  async waitForHit(n) {
    await this.page.waitForFunction(
      n => Number(document.getElementById('cache-hit-count').textContent) >= n, n,
    );
  }

  /** Poll until the miss counter reaches at least `n`. */
  async waitForMiss(n) {
    await this.page.waitForFunction(
      n => Number(document.getElementById('cache-miss-count').textContent) >= n, n,
    );
  }

  async firstCellText() {
    return this.page.textContent(CacheGridPage.SELECTORS.FIRST_CELL);
  }

  async rowCount() {
    return this.page.$$eval(CacheGridPage.SELECTORS.ROW, els => els.length);
  }
}
