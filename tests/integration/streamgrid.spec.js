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

  test.describe('CacheAdapter: init() is the only path that calls fetchData', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForSelector('#cache-grid tbody tr');
    });

    test('initial page load registers exactly one miss and zero hits', async ({ page }) => {
      const misses = Number(await page.textContent('#cache-miss-count'));
      const hits   = Number(await page.textContent('#cache-hit-count'));
      expect(misses).toBe(1);
      expect(hits).toBe(0);
    });

    test('first reload after initial load is a cache hit', async ({ page }) => {
      await page.click('#cache-reload-btn');
      await page.waitForTimeout(400);
      const misses = Number(await page.textContent('#cache-miss-count'));
      const hits   = Number(await page.textContent('#cache-hit-count'));
      expect(misses).toBe(1); // no new miss — same key served from cache
      expect(hits).toBe(1);
    });

    test('five consecutive reloads are all cache hits (miss count stays at 1)', async ({ page }) => {
      for (let i = 0; i < 5; i++) {
        await page.click('#cache-reload-btn');
        await page.waitForTimeout(400);
      }
      const misses = Number(await page.textContent('#cache-miss-count'));
      const hits   = Number(await page.textContent('#cache-hit-count'));
      expect(misses).toBe(1);
      expect(hits).toBe(5);
    });

    test('hits + misses equals totalfetchData calls across the session', async ({ page }) => {
      // 3 reloads → 3 hits + 1 initial miss = 4 total calls
      for (let i = 0; i < 3; i++) {
        await page.click('#cache-reload-btn');
        await page.waitForTimeout(400);
      }
      const hits   = Number(await page.textContent('#cache-hit-count'));
      const misses = Number(await page.textContent('#cache-miss-count'));
      // Every fetchData call is exactly one hit OR one miss, never both
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
      const hitBefore  = Number(await page.textContent('#cache-hit-count'));

      await page.click('#cache-page2-btn');
      await page.waitForTimeout(200);

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missBefore);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(hitBefore);
    });

    test('repeated goToPage calls (P2 → P1 → P2 → P1) never add misses or hits', async ({ page }) => {
      const missBefore = Number(await page.textContent('#cache-miss-count'));

      await page.click('#cache-page2-btn');
      await page.waitForTimeout(150);
      // go back to page 1 via the built-in First button
      await page.click('#cache-grid .sg-pagination button:text("First")');
      await page.waitForTimeout(150);
      await page.click('#cache-page2-btn');
      await page.waitForTimeout(150);
      await page.click('#cache-grid .sg-pagination button:text("First")');
      await page.waitForTimeout(150);

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missBefore);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(0); // still no hits
    });

    test('after goToPage, a subsequent reload is still a cache hit', async ({ page }) => {
      await page.click('#cache-page2-btn');
      await page.waitForTimeout(150);

      await page.click('#cache-reload-btn'); // init() → loadData() → cache HIT
      await page.waitForTimeout(400);

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);
    });

    test('page 1 and page 2 render different row content', async ({ page }) => {
      const firstCellPage1 = await page.textContent('#cache-grid tbody tr:first-child td:first-child');

      await page.click('#cache-page2-btn');
      await page.waitForTimeout(150);

      const firstCellPage2 = await page.textContent('#cache-grid tbody tr:first-child td:first-child');
      expect(firstCellPage1).not.toBe(firstCellPage2);
    });

    test('a single fetch loads enough data for at least two pages of navigation', async ({ page }) => {
      const missBefore = Number(await page.textContent('#cache-miss-count'));

      await page.click('#cache-page2-btn');
      await page.waitForTimeout(150);
      const rowsPage2 = await page.$$eval('#cache-grid tbody tr', els => els.length);
      // Navigation required no new fetch
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missBefore);
      // And page 2 actually has rows (data was loaded in one shot)
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

      await page.click('#cache-reload-btn'); // hit
      await page.waitForTimeout(400);

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

      for (let i = 0; i < 3; i++) {
        await page.click('#cache-reload-btn');
        await page.waitForTimeout(400);
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
      // warm the cache first
      await page.click('#cache-reload-btn');
      await page.waitForTimeout(400);
      const hitBeforeClear = Number(await page.textContent('#cache-hit-count'));
      expect(hitBeforeClear).toBe(1);

      await page.click('#cache-clear-btn');

      const missBefore = Number(await page.textContent('#cache-miss-count'));
      await page.click('#cache-reload-btn'); // cache empty → real network fetch
      await page.waitForTimeout(1000);

      const missAfter = Number(await page.textContent('#cache-miss-count'));
      const hitAfter  = Number(await page.textContent('#cache-hit-count'));
      expect(missAfter).toBe(missBefore + 1); // one new miss
      expect(hitAfter).toBe(hitBeforeClear);   // no new hit
    });

    test('after clearCache(), the second init() is a hit again', async ({ page }) => {
      await page.click('#cache-clear-btn');

      // first init after clear → miss
      await page.click('#cache-reload-btn');
      await page.waitForTimeout(1000);
      const missAfterFirstReload = Number(await page.textContent('#cache-miss-count'));

      // second init after clear → hit (cache warm again)
      await page.click('#cache-reload-btn');
      await page.waitForTimeout(400);

      const missAfterSecond = Number(await page.textContent('#cache-miss-count'));
      const hitAfterSecond  = Number(await page.textContent('#cache-hit-count'));
      expect(missAfterSecond).toBe(missAfterFirstReload); // no additional miss
      expect(hitAfterSecond).toBeGreaterThanOrEqual(1);
    });

    test('clearCache() preserves cumulative counters (does not reset to zero)', async ({ page }) => {
      await page.click('#cache-reload-btn'); // hit 1
      await page.waitForTimeout(400);
      await page.click('#cache-reload-btn'); // hit 2
      await page.waitForTimeout(400);

      const hitBeforeClear  = Number(await page.textContent('#cache-hit-count'));
      const missBeforeClear = Number(await page.textContent('#cache-miss-count'));
      expect(hitBeforeClear).toBe(2);
      expect(missBeforeClear).toBe(1);

      await page.click('#cache-clear-btn');

      // counters are still visible and unchanged after cache clear
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(hitBeforeClear);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missBeforeClear);
    });

    test('goToPage() after clearCache() does not add a miss (dataSet still in memory)', async ({ page }) => {
      await page.click('#cache-clear-btn');

      const missBefore = Number(await page.textContent('#cache-miss-count'));
      // dataSet still has all rows in StreamGrid — goToPage re-renders without fetching
      await page.click('#cache-page2-btn');
      await page.waitForTimeout(200);

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(missBefore);
    });

    test('multiple clearCache() cycles accumulate misses and hits correctly', async ({ page }) => {
      // 1st cycle: miss(1) → hit(1) → hit(2) → clear
      await page.click('#cache-reload-btn'); await page.waitForTimeout(400); // hit
      await page.click('#cache-reload-btn'); await page.waitForTimeout(400); // hit
      await page.click('#cache-clear-btn');

      // 2nd cycle: miss(2) → hit(3) → hit(4) → clear
      await page.click('#cache-reload-btn'); await page.waitForTimeout(1000); // miss
      await page.click('#cache-reload-btn'); await page.waitForTimeout(400);  // hit
      await page.click('#cache-reload-btn'); await page.waitForTimeout(400);  // hit
      await page.click('#cache-clear-btn');

      // 3rd cycle: miss(3)
      await page.click('#cache-reload-btn'); await page.waitForTimeout(1000); // miss

      expect(Number(await page.textContent('#cache-miss-count'))).toBe(3);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(4);
    });
  });

  test.describe('CacheAdapter: full lifecycle sequences', () => {
    test.beforeEach(async ({ page }) => {
      await page.waitForSelector('#cache-grid tbody tr');
    });

    test('full lifecycle: miss → 3 hits → clear → miss → 3 hits', async ({ page }) => {
      // initial miss already happened in beforeEach
      for (let i = 0; i < 3; i++) {
        await page.click('#cache-reload-btn');
        await page.waitForTimeout(400);
      }
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(3);

      await page.click('#cache-clear-btn');

      await page.click('#cache-reload-btn'); // miss after clear
      await page.waitForTimeout(1000);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(2);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(3); // unchanged

      for (let i = 0; i < 3; i++) {
        await page.click('#cache-reload-btn');
        await page.waitForTimeout(400);
      }
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(6);  // 3 + 3
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(2); // 1 initial + 1 after clear
    });

    test('interleaved navigate + reload + clear: counters stay correct throughout', async ({ page }) => {
      // Start: miss:1 hit:0
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(0);

      // goToPage(2) — no fetch
      await page.click('#cache-page2-btn');
      await page.waitForTimeout(150);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(0);

      // reload — hit (cache warm)
      await page.click('#cache-reload-btn');
      await page.waitForTimeout(400);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      // goToPage(2) again — still no fetch
      await page.click('#cache-page2-btn');
      await page.waitForTimeout(150);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      // clear — counters preserved
      await page.click('#cache-clear-btn');
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      // goToPage after clear — dataSet still in memory, no fetch
      await page.click('#cache-page2-btn');
      await page.waitForTimeout(150);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(1);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1);

      // reload after clear — cache empty → miss
      await page.click('#cache-reload-btn');
      await page.waitForTimeout(1000);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(2);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(1); // no new hit

      // reload again — cache warm → hit
      await page.click('#cache-reload-btn');
      await page.waitForTimeout(400);
      expect(Number(await page.textContent('#cache-miss-count'))).toBe(2);
      expect(Number(await page.textContent('#cache-hit-count'))).toBe(2);
    });

    test('rapid reload storm: 10 reloads = 10 hits, 0 additional misses', async ({ page }) => {
      // Initial miss already in beforeEach; storm of 10 rapid reloads
      for (let i = 0; i < 10; i++) {
        await page.click('#cache-reload-btn');
        await page.waitForTimeout(300);
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
