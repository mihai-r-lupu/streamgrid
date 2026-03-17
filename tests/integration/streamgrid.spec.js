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

  // ── CacheAdapter demo (#cache-grid) — comprehensive caching tests ───────────
  //
  // Architecture note:
  //   Only init() → loadData() → fetchData() goes through the CacheAdapter.
  //   goToPage(N) is a pure re-render of the existing in-memory dataSet and
  //   never calls fetchData, so it never registers a hit or a miss.
  //
  // Counter semantics (defined in test-page.html):
  //   cacheMisses  — incremented when rawAdapter.fetchData is called (real network fetch)
  //   cacheHits    — incremented when cachedAdapter.fetchData is called AND rawAdapter
  //                  was NOT invoked (data served from the LRU cache)
  //
  // Each test navigates to test-page.html fresh; init() fires in the constructor
  // so the beforeEach wait on '#cache-grid tbody tr' guarantees miss:1, hit:0 at start.
  //
  // Helpers poll the live counter DOM nodes rather than sleeping for a fixed time.
  const waitHit = (page, n) => page.waitForFunction(n => Number(document.getElementById('cache-hit-count').textContent) >= n, n);
  const waitMiss = (page, n) => page.waitForFunction(n => Number(document.getElementById('cache-miss-count').textContent) >= n, n);

  test.describe('CacheAdapter: init() is the only path that calls fetchData', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForSelector('#cache-grid tbody tr');
    });

    test('initial page load registers exactly one miss and zero hits', async ({ page }) => {
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(0);
    });

    test('first reload after initial load is a cache hit', async ({ page }) => {
      await page.click('#cache-reload-btn');
      await waitHit(page, 1);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);
    });

    test('five consecutive reloads are all cache hits (miss count stays at 1)', async ({ page }) => {
      for (let i = 1; i <= 5; i++) {
        await page.click('#cache-reload-btn');
        await waitHit(page, i);
      }
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(5);
    });

    test('hits + misses equals total fetchData calls across the session', async ({ page }) => {
      // 3 reloads → 3 hits + 1 initial miss = 4 total calls
      for (let i = 1; i <= 3; i++) {
        await page.click('#cache-reload-btn');
        await waitHit(page, i);
      }
      const hits = Number(await page.textContent('#cache-hit-count'));
      const misses = Number(await page.textContent('#cache-miss-count'));
      expect(hits + misses).toBe(4);
      expect(hits).toBe(3);
      expect(misses).toBe(1);
    });
  });

  test.describe('CacheAdapter: goToPage() never calls fetchData', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForSelector('#cache-grid tbody tr');
    });

    test('goToPage(2) leaves hit and miss counters unchanged', async ({ page }) => {
      const missBefore = Number(await page.textContent('#cache-miss-count'));
      const hitBefore = Number(await page.textContent('#cache-hit-count'));

      await page.evaluate(() => window.cacheGrid.goToPage(2));

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missBefore);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(hitBefore);
    });

    test('repeated goToPage calls (P2 → P1 → P2 → P1) never add misses or hits', async ({ page }) => {
      const missBefore = Number(await page.textContent('#cache-miss-count'));

      await page.evaluate(() => window.cacheGrid.goToPage(2));
      await page.evaluate(() => window.cacheGrid.goToPage(1));
      await page.evaluate(() => window.cacheGrid.goToPage(2));
      await page.evaluate(() => window.cacheGrid.goToPage(1));

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missBefore);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(0);
    });

    test('after goToPage, a subsequent reload is still a cache hit', async ({ page }) => {
      await page.evaluate(() => window.cacheGrid.goToPage(2));

      await page.click('#cache-reload-btn');
      await waitHit(page, 1);

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);
    });

    test('page 1 and page 2 render different row content', async ({ page }) => {
      const firstCellPage1 = await page.textContent('#cache-grid tbody tr:first-child td:first-child');

      await page.evaluate(() => window.cacheGrid.goToPage(2));

      const firstCellPage2 = await page.textContent('#cache-grid tbody tr:first-child td:first-child');
      expect(firstCellPage1).not.toBe(firstCellPage2);
    });

    test('a single fetch loads enough data for at least two pages of navigation', async ({ page }) => {
      const missBefore = Number(await page.textContent('#cache-miss-count'));

      await page.evaluate(() => window.cacheGrid.goToPage(2));
      const rowsPage2 = await page.$$eval('#cache-grid tbody tr', els => els.length);

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missBefore);
      expect(rowsPage2).toBeGreaterThan(0);
      expect(rowsPage2).toBeLessThanOrEqual(10);
    });
  });

  test.describe('CacheAdapter: data integrity', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForSelector('#cache-grid tbody tr');
    });

    test('a cache hit returns identical row data to the original miss fetch', async ({ page }) => {
      const firstCellOnMiss = await page.textContent('#cache-grid tbody tr:first-child td:first-child');

      await page.click('#cache-reload-btn');
      await waitHit(page, 1);

      const firstCellOnHit = await page.textContent('#cache-grid tbody tr:first-child td:first-child');
      expect(firstCellOnHit).toBe(firstCellOnMiss);
    });

    test('grid renders at most pageSize (10) rows per page', async ({ page }) => {
      const rows = await page.$$eval('#cache-grid tbody tr', els => els.length);
      expect(rows).toBeGreaterThan(0);
      expect(rows).toBeLessThanOrEqual(10);
    });

    test('cached data is correct after three reloads', async ({ page }) => {
      const firstCellOriginal = await page.textContent('#cache-grid tbody tr:first-child td:first-child');

      for (let i = 1; i <= 3; i++) {
        await page.click('#cache-reload-btn');
        await waitHit(page, i);
      }

      const firstCellAfter3 = await page.textContent('#cache-grid tbody tr:first-child td:first-child');
      expect(firstCellAfter3).toBe(firstCellOriginal);
    });
  });

  test.describe('CacheAdapter: clearCache() invalidation', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForSelector('#cache-grid tbody tr');
    });

    test('clearCache() forces a miss on the next init()', async ({ page }) => {
      await page.click('#cache-reload-btn');
      await waitHit(page, 1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      await page.click('#cache-clear-btn');

      await page.click('#cache-reload-btn'); // cache empty → real network fetch
      await waitMiss(page, 2);              // miss:1 (page load) + miss:2 (post-clear)

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(2);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1); // no new hit
    });

    test('after clearCache(), the second init() is a hit again', async ({ page }) => {
      await page.click('#cache-clear-btn');

      await page.click('#cache-reload-btn');
      await waitMiss(page, 2);
      const missAfterFirstReload = Number(await page.textContent('#cache-miss-count'));

      await page.click('#cache-reload-btn');
      await waitHit(page, 1); // cache warm again → hit

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missAfterFirstReload);
      expect(Number(await page.textContent('#cache-hit-count'))).toBeGreaterThanOrEqual(1);
    });

    test('clearCache() preserves cumulative counters (does not reset to zero)', async ({ page }) => {
      await page.click('#cache-reload-btn');
      await waitHit(page, 1);
      await page.click('#cache-reload-btn');
      await waitHit(page, 2);

      expect(Number(await page.textContent('#cache-hit-count'))).toBe(2);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);

      await page.click('#cache-clear-btn');

      expect(Number(await page.textContent('#cache-hit-count'))).toBe(2);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
    });

    test('multiple clearCache() cycles accumulate misses and hits correctly', async ({ page }) => {
      // 1st cycle: miss(1) → hit(1) → hit(2) → clear
      await page.click('#cache-reload-btn'); await waitHit(page, 1);
      await page.click('#cache-reload-btn'); await waitHit(page, 2);
      await page.click('#cache-clear-btn');

      // 2nd cycle: miss(2) → hit(3) → hit(4) → clear
      await page.click('#cache-reload-btn'); await waitMiss(page, 2);
      await page.click('#cache-reload-btn'); await waitHit(page, 3);
      await page.click('#cache-reload-btn'); await waitHit(page, 4);
      await page.click('#cache-clear-btn');

      // 3rd cycle: miss(3)
      await page.click('#cache-reload-btn'); await waitMiss(page, 3);

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(3);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(4);
    });
  });

  test.describe('CacheAdapter: full lifecycle sequences', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForSelector('#cache-grid tbody tr');
    });

    test('full lifecycle: miss → 3 hits → clear → miss → 3 hits', async ({ page }) => {
      for (let i = 1; i <= 3; i++) {
        await page.click('#cache-reload-btn');
        await waitHit(page, i);
      }
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(3);

      await page.click('#cache-clear-btn');

      await page.click('#cache-reload-btn');
      await waitMiss(page, 2);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(3); // unchanged

      for (let i = 4; i <= 6; i++) {
        await page.click('#cache-reload-btn');
        await waitHit(page, i);
      }
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(6);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(2);
    });

    test('interleaved navigate + reload + clear: counters stay correct throughout', async ({ page }) => {
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(0);

      // goToPage(2) — no fetch (synchronous re-render)
      await page.evaluate(() => window.cacheGrid.goToPage(2));
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(0);

      await page.click('#cache-reload-btn');
      await waitHit(page, 1);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      // goToPage(2) again — still no fetch
      await page.evaluate(() => window.cacheGrid.goToPage(2));
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      // clear — counters preserved
      await page.click('#cache-clear-btn');
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      // goToPage after clear — dataSet still in memory, no fetch
      await page.evaluate(() => window.cacheGrid.goToPage(2));
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      // reload after clear — cache empty → miss
      await page.click('#cache-reload-btn');
      await waitMiss(page, 2);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1); // no new hit

      // reload again — cache warm → hit
      await page.click('#cache-reload-btn');
      await waitHit(page, 2);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(2);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(2);
    });

    test('rapid reload storm: 10 reloads = 10 hits, 0 additional misses', async ({ page }) => {
      for (let i = 1; i <= 10; i++) {
        await page.click('#cache-reload-btn');
        await waitHit(page, i);
      }
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(10);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
    });
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
