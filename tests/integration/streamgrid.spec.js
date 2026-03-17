// tests/streamgrid.spec.js
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
// – should serve both your JSON‐Server at /users and your test‐page.html

test.describe('StreamGrid E2E', () => {
  test.beforeEach(async ({ page }) => {
    // navigate to your test page
    await page.goto(`${BASE_URL}/test-page.html`);
    // Wait for the first data row, not just the table element.
    // buildStaticLayout() creates <table> synchronously, but rows only appear
    // after init() (async data fetch) completes, so this guarantees data is ready.
    await page.waitForSelector('#grid tbody tr');
  });

  test('loads first page rows (real data)', async ({ page }) => {
    const rows = await page.$$eval('#grid tbody tr', els => els.length);
    expect(rows).toBeLessThanOrEqual(10);
  });

  test('lazy loads more rows on infinite scroll', async ({ page }) => {
    // Set scrollTop then dispatch a synthetic scroll event so onScroll() fires
    // regardless of whether the content overflows the container in headless mode.
    await page.$eval('#grid .sg-table-wrapper', el => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(1000);
    const rows = await page.$$eval('#grid tbody tr', els => els.length);
    expect(rows).toBeGreaterThan(10);
  });

  test('filters rows based on input text', async ({ page }) => {
    const input = await page.$('#grid input[type="text"]');
    await input.fill('alice');
    // give debounce + re-render
    await page.waitForTimeout(500);
    const rows = await page.$$eval('#grid tbody tr', els => els.length);
    // Server filtering returns 400 alice rows; infinite mode shows the first
    // page (infiniteScrollPageSize=10), so rows will be exactly 10.
    expect(rows).toBeLessThanOrEqual(10);
  });

  test('manual loadMoreRows API works', async ({ page }) => {
    // call window.grid.loadMoreRows()
    await page.evaluate(() => window.grid.loadMoreRows());
    await page.waitForTimeout(500);
    const rows = await page.$$eval('#grid tbody tr', els => els.length);
    expect(rows).toBeGreaterThan(10);
  });

  test('clicking cells and rows fires events', async ({ page }) => {
    // capture console logs or use page.on('console')
    let cellClicked = false, rowClicked = false;
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Event] cellClicked')) cellClicked = true;
      if (text.includes('[Event] dataRowClicked')) rowClicked = true;
    });
    // click first cell
    await page.click('#grid tbody td');
    expect(cellClicked).toBe(true);
    expect(rowClicked).toBe(true);
  });

  test('pagination buttons navigate correctly', async ({ page }) => {
    // #pagination-grid uses paginationMode: 'pages' — it has Prev / Next buttons.
    // #grid uses paginationMode: 'infinite' and has no such buttons.
    await page.waitForSelector('#pagination-grid tbody tr');
    await page.click('#pagination-grid .pagination-controls button:text("Next")');
    await page.waitForTimeout(500);
    const rows = await page.$$eval('#pagination-grid tbody tr', els => els.length);
    expect(rows).toBeLessThanOrEqual(15);
  });

  test('filtering mode respects explicit StreamGrid settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/test-page.html?filterMode=client`);
    await page.fill('#grid input[type="text"]', 'alice');
    await page.waitForTimeout(500);
    const rowsClient = await page.$$eval('#grid tbody tr', els => els.length);

    await page.goto(`${BASE_URL}/test-page.html?filterMode=server`);
    await page.fill('#grid input[type="text"]', 'alice');
    await page.waitForTimeout(500);
    const rowsServer = await page.$$eval('#grid tbody tr', els => els.length);

    expect(rowsClient).toBe(rowsServer); // Results should match between client/server
  });

  // ── CacheAdapter demo (#cache-grid) ─────────────────────────────────────────

  test('CacheAdapter: first load is a miss, same-page reload is a hit', async ({ page }) => {
    // Wait for the cache-grid to render its first data row
    await page.waitForSelector('#cache-grid tbody tr');

    // After initial load miss counter should be 1, hit counter should be 0
    const missAfterLoad = await page.textContent('#cache-miss-count');
    const hitAfterLoad = await page.textContent('#cache-hit-count');
    expect(Number(missAfterLoad)).toBe(1);
    expect(Number(hitAfterLoad)).toBe(0);

    // Clicking "Reload page" requests the same data — should be a cache hit
    await page.click('#cache-reload-btn');
    await page.waitForSelector('#cache-grid tbody tr');

    const missAfterReload = await page.textContent('#cache-miss-count');
    const hitAfterReload = await page.textContent('#cache-hit-count');
    expect(Number(missAfterReload)).toBe(1); // no new miss
    expect(Number(hitAfterReload)).toBe(1);  // one hit registered
  });

  test('CacheAdapter: navigating to an unseen page is a miss; revisiting is a hit', async ({ page }) => {
    await page.waitForSelector('#cache-grid tbody tr');
    const missBaseline = Number(await page.textContent('#cache-miss-count'));

    // Go to page 2 — first visit, must be a miss
    await page.click('#cache-page2-btn');
    await page.waitForSelector('#cache-grid tbody tr');
    const missAfterPage2 = Number(await page.textContent('#cache-miss-count'));
    const hitAfterPage2 = Number(await page.textContent('#cache-hit-count'));
    expect(missAfterPage2).toBe(missBaseline + 1);

    // Go to page 2 again — now cached, must be a hit
    await page.click('#cache-page2-btn');
    await page.waitForSelector('#cache-grid tbody tr');
    const hitAfterSecondPage2 = Number(await page.textContent('#cache-hit-count'));
    expect(hitAfterSecondPage2).toBe(hitAfterPage2 + 1);
  });

  test('CacheAdapter: clearing cache forces a miss on next load', async ({ page }) => {
    await page.waitForSelector('#cache-grid tbody tr');

    // Warm the cache with a reload so we know page 1 is cached
    await page.click('#cache-reload-btn');
    await page.waitForSelector('#cache-grid tbody tr');
    const hitBeforeClear = Number(await page.textContent('#cache-hit-count'));
    expect(hitBeforeClear).toBeGreaterThanOrEqual(1);

    // Clear the cache
    await page.click('#cache-clear-btn');

    // Reload — cache is empty so this must be a miss
    const missBefore = Number(await page.textContent('#cache-miss-count'));
    await page.click('#cache-reload-btn');
    await page.waitForSelector('#cache-grid tbody tr');
    const missAfter = Number(await page.textContent('#cache-miss-count'));
    // Hit count must not have increased (it was a miss, not a hit)
    const hitAfterClear = Number(await page.textContent('#cache-hit-count'));
    expect(missAfter).toBe(missBefore + 1);
    expect(hitAfterClear).toBe(hitBeforeClear); // unchanged
  });

  test('CacheAdapter: grid renders correct rows', async ({ page }) => {
    await page.waitForSelector('#cache-grid tbody tr');
    const rows = await page.$$eval('#cache-grid tbody tr', els => els.length);
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(10);
  });

  // ── exportConfig demo (#export-grid) ────────────────────────────────────────

  test('exportConfig: Export button produces a valid JSON snapshot', async ({ page }) => {
    await page.waitForSelector('#export-grid tbody tr');

    await page.click('#export-btn');

    const json = await page.inputValue('#snapshot-output');
    expect(json.trim()).not.toBe('');

    const snapshot = JSON.parse(json); // throws if invalid JSON
    expect(snapshot.version).toBe(1);
    expect(snapshot.currentPage).toBe(1);
    expect(typeof snapshot.paginationMode).toBe('string');
    expect(Array.isArray(snapshot.columns)).toBe(true);
  });

  test('exportConfig: snapshot captures current page number', async ({ page }) => {
    await page.waitForSelector('#export-grid tbody tr');

    // Navigate to page 2 before exporting
    await page.click('#export-grid .pagination-controls button:text("Next")');
    await page.waitForTimeout(400);

    await page.click('#export-btn');

    const json = await page.inputValue('#snapshot-output');
    const snapshot = JSON.parse(json);
    expect(snapshot.currentPage).toBe(2);
  });

  test('exportConfig: Restore button re-renders grid on the saved page', async ({ page }) => {
    await page.waitForSelector('#export-grid tbody tr');

    // Go to page 2, export, then restore
    await page.click('#export-grid .pagination-controls button:text("Next")');
    await page.waitForTimeout(400);
    await page.click('#export-btn');

    // Capture first cell text on page 2 before restore
    const firstCellBefore = await page.textContent('#export-grid tbody tr:first-child td:first-child');

    // Restore wipes and rebuilds the grid
    await page.click('#restore-btn');
    await page.waitForSelector('#export-grid tbody tr');

    // Grid should still show page 2's data — first cell text unchanged
    const firstCellAfter = await page.textContent('#export-grid tbody tr:first-child td:first-child');
    expect(firstCellAfter).toBe(firstCellBefore);

    // Status message should confirm the restored page
    const status = await page.textContent('#export-status');
    expect(status).toContain('page 2');
  });

  test('exportConfig: snapshot captures filter text and Restore re-applies it', async ({ page }) => {
    await page.waitForSelector('#export-grid tbody tr');

    // Type a filter
    await page.fill('#export-grid input[type="text"]', 'alice');
    await page.waitForTimeout(400);

    await page.click('#export-btn');
    const json = await page.inputValue('#snapshot-output');
    const snapshot = JSON.parse(json);
    expect(snapshot.currentFilterText).toBe('alice');

    // Restore and verify the filter input is pre-filled
    await page.click('#restore-btn');
    await page.waitForSelector('#export-grid tbody tr');
    const filterValue = await page.inputValue('#export-grid input[type="text"]');
    expect(filterValue).toBe('alice');
  });

});
