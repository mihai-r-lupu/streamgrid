// tests/integration/streamgrid.spec.js
//
// Enterprise-grade E2E suite — Page Object Model + custom fixtures.
// Selectors live in tests/integration/pages/, fixtures in fixtures.js.
import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';

// ── Core Grid ─────────────────────────────────────────────────────────────────

test.describe('Core Grid', () => {
  test('loads first page rows (real data) @smoke', async ({ gridPage }) => {
    const rows = await gridPage.rowCount();
    expect(rows).toBeLessThanOrEqual(10);
  });

  test('lazy loads more rows on infinite scroll @smoke', async ({ gridPage }) => {
    await gridPage.scrollToBottom();
    const rows = await gridPage.rowCount();
    expect(rows).toBeGreaterThan(10);
  });

  test('filters rows based on input text @smoke', async ({ gridPage }) => {
    await gridPage.filterBy('alice');
    const rows = await gridPage.rowCount();
    expect(rows).toBeLessThanOrEqual(10);
  });

  test('manual loadMoreRows API works', async ({ gridPage }) => {
    await gridPage.loadMoreRows();
    const rows = await gridPage.rowCount();
    expect(rows).toBeGreaterThan(10);
  });

  test('clicking cells and rows fires events @smoke', async ({ gridPage }) => {
    const { cellClicked, rowClicked } = await gridPage.clickFirstCell();
    expect(cellClicked).toBe(true);
    expect(rowClicked).toBe(true);
  });

  test('pagination buttons navigate correctly', async ({ gridPage }) => {
    await gridPage.waitForPaginationReady();
    await gridPage.clickPaginationNext();
    const rows = await gridPage.paginationRowCount();
    expect(rows).toBeLessThanOrEqual(15);
  });

  test('filtering mode respects explicit StreamGrid settings', async ({ gridPage }) => {
    await gridPage.goto({ filterMode: 'client' });
    await gridPage.waitForReady();
    await gridPage.filterBy('alice');
    const rowsClient = await gridPage.rowCount();

    await gridPage.goto({ filterMode: 'server' });
    await gridPage.waitForReady();
    await gridPage.filterBy('alice');
    const rowsServer = await gridPage.rowCount();

    expect(rowsClient).toBe(rowsServer);
  });
});

// ── CacheAdapter ──────────────────────────────────────────────────────────────
//
// Architecture note:
//   Only init() → loadData() → fetchData() goes through the CacheAdapter.
//   goToPage(N) is a pure re-render of the existing in-memory dataSet and
//   never calls fetchData, so it never registers a hit or a miss.
//
// Each test uses the cacheGridPage fixture which navigates to test-page.html
// and waits for #cache-grid rows.  At that point counters are miss:1, hit:0.

test.describe('CacheAdapter: init() is the only path that calls fetchData', () => {
  test('initial page load registers exactly one miss and zero hits @smoke', async ({ cacheGridPage: cache }) => {
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(0);
  });

  test('first reload after initial load is a cache hit', async ({ cacheGridPage: cache }) => {
    await cache.reload();
    await cache.waitForHit(1);
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(1);
  });

  test('five consecutive reloads are all cache hits (miss count stays at 1)', async ({ cacheGridPage: cache }) => {
    for (let i = 1; i <= 5; i++) {
      await cache.reload();
      await cache.waitForHit(i);
    }
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(5);
  });

  test('hits + misses equals total fetchData calls across the session', async ({ cacheGridPage: cache }) => {
    for (let i = 1; i <= 3; i++) {
      await cache.reload();
      await cache.waitForHit(i);
    }
    const hits = await cache.hitCount();
    const misses = await cache.missCount();
    expect(hits + misses).toBe(4);
    expect(hits).toBe(3);
    expect(misses).toBe(1);
  });
});

test.describe('CacheAdapter: goToPage() never calls fetchData', () => {
  test('goToPage(2) leaves hit and miss counters unchanged', async ({ cacheGridPage: cache }) => {
    const missBefore = await cache.missCount();
    const hitBefore = await cache.hitCount();

    await cache.goToPage(2);

    expect(await cache.missCount()).toBe(missBefore);
    expect(await cache.hitCount()).toBe(hitBefore);
  });

  test('repeated goToPage calls (P2 → P1 → P2 → P1) never add misses or hits', async ({ cacheGridPage: cache }) => {
    const missBefore = await cache.missCount();

    await cache.goToPage(2);
    await cache.goToPage(1);
    await cache.goToPage(2);
    await cache.goToPage(1);

    expect(await cache.missCount()).toBe(missBefore);
    expect(await cache.hitCount()).toBe(0);
  });

  test('after goToPage, a subsequent reload is still a cache hit', async ({ cacheGridPage: cache }) => {
    await cache.goToPage(2);

    await cache.reload();
    await cache.waitForHit(1);

    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(1);
  });

  test('page 1 and page 2 render different row content', async ({ cacheGridPage: cache }) => {
    const firstCellPage1 = await cache.firstCellText();
    await cache.goToPage(2);
    const firstCellPage2 = await cache.firstCellText();
    expect(firstCellPage1).not.toBe(firstCellPage2);
  });

  test('a single fetch loads enough data for at least two pages of navigation', async ({ cacheGridPage: cache }) => {
    const missBefore = await cache.missCount();

    await cache.goToPage(2);
    const rowsPage2 = await cache.rowCount();

    expect(await cache.missCount()).toBe(missBefore);
    expect(rowsPage2).toBeGreaterThan(0);
    expect(rowsPage2).toBeLessThanOrEqual(10);
  });
});

test.describe('CacheAdapter: data integrity', () => {
  test('a cache hit returns identical row data to the original miss fetch', async ({ cacheGridPage: cache }) => {
    const firstCellOnMiss = await cache.firstCellText();

    await cache.reload();
    await cache.waitForHit(1);

    const firstCellOnHit = await cache.firstCellText();
    expect(firstCellOnHit).toBe(firstCellOnMiss);
  });

  test('grid renders at most pageSize (10) rows per page', async ({ cacheGridPage: cache }) => {
    const rows = await cache.rowCount();
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(10);
  });

  test('cached data is correct after three reloads', async ({ cacheGridPage: cache }) => {
    const firstCellOriginal = await cache.firstCellText();

    for (let i = 1; i <= 3; i++) {
      await cache.reload();
      await cache.waitForHit(i);
    }

    const firstCellAfter3 = await cache.firstCellText();
    expect(firstCellAfter3).toBe(firstCellOriginal);
  });
});

test.describe('CacheAdapter: clearCache() invalidation', () => {
  test('clearCache() forces a miss on the next init()', async ({ cacheGridPage: cache }) => {
    await cache.reload();
    await cache.waitForHit(1);
    expect(await cache.hitCount()).toBe(1);

    await cache.clearCache();

    await cache.reload();
    await cache.waitForMiss(2);

    expect(await cache.missCount()).toBe(2);
    expect(await cache.hitCount()).toBe(1);
  });

  test('after clearCache(), the second init() is a hit again', async ({ cacheGridPage: cache }) => {
    await cache.clearCache();

    await cache.reload();
    await cache.waitForMiss(2);
    const missAfterFirstReload = await cache.missCount();

    await cache.reload();
    await cache.waitForHit(1);

    expect(await cache.missCount()).toBe(missAfterFirstReload);
    expect(await cache.hitCount()).toBeGreaterThanOrEqual(1);
  });

  test('clearCache() preserves cumulative counters (does not reset to zero)', async ({ cacheGridPage: cache }) => {
    await cache.reload();
    await cache.waitForHit(1);
    await cache.reload();
    await cache.waitForHit(2);

    expect(await cache.hitCount()).toBe(2);
    expect(await cache.missCount()).toBe(1);

    await cache.clearCache();

    expect(await cache.hitCount()).toBe(2);
    expect(await cache.missCount()).toBe(1);
  });

  test('multiple clearCache() cycles accumulate misses and hits correctly', async ({ cacheGridPage: cache }) => {
    // 1st cycle: miss(1) → hit(1) → hit(2) → clear
    await cache.reload(); await cache.waitForHit(1);
    await cache.reload(); await cache.waitForHit(2);
    await cache.clearCache();

    // 2nd cycle: miss(2) → hit(3) → hit(4) → clear
    await cache.reload(); await cache.waitForMiss(2);
    await cache.reload(); await cache.waitForHit(3);
    await cache.reload(); await cache.waitForHit(4);
    await cache.clearCache();

    // 3rd cycle: miss(3)
    await cache.reload(); await cache.waitForMiss(3);

    expect(await cache.missCount()).toBe(3);
    expect(await cache.hitCount()).toBe(4);
  });
});

test.describe('CacheAdapter: full lifecycle sequences', () => {
  test('full lifecycle: miss → 3 hits → clear → miss → 3 hits', async ({ cacheGridPage: cache }) => {
    for (let i = 1; i <= 3; i++) {
      await cache.reload();
      await cache.waitForHit(i);
    }
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(3);

    await cache.clearCache();

    await cache.reload();
    await cache.waitForMiss(2);
    expect(await cache.hitCount()).toBe(3);

    for (let i = 4; i <= 6; i++) {
      await cache.reload();
      await cache.waitForHit(i);
    }
    expect(await cache.hitCount()).toBe(6);
    expect(await cache.missCount()).toBe(2);
  });

  test('interleaved navigate + reload + clear: counters stay correct throughout', async ({ cacheGridPage: cache }) => {
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(0);

    await cache.goToPage(2);
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(0);

    await cache.reload();
    await cache.waitForHit(1);
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(1);

    await cache.goToPage(2);
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(1);

    await cache.clearCache();
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(1);

    await cache.goToPage(2);
    expect(await cache.missCount()).toBe(1);
    expect(await cache.hitCount()).toBe(1);

    await cache.reload();
    await cache.waitForMiss(2);
    expect(await cache.hitCount()).toBe(1);

    await cache.reload();
    await cache.waitForHit(2);
    expect(await cache.missCount()).toBe(2);
    expect(await cache.hitCount()).toBe(2);
  });

  test('rapid reload storm: 10 reloads = 10 hits, 0 additional misses', async ({ cacheGridPage: cache }) => {
    for (let i = 1; i <= 10; i++) {
      await cache.reload();
      await cache.waitForHit(i);
    }
    expect(await cache.hitCount()).toBe(10);
    expect(await cache.missCount()).toBe(1);
  });
});

// ── exportConfig ──────────────────────────────────────────────────────────────

test.describe('exportConfig', () => {
  test('Export button produces a valid JSON snapshot @smoke', async ({ exportGridPage: exp }) => {
    const snapshot = await exp.exportSnapshot();
    expect(snapshot.version).toBe(1);
    expect(snapshot.currentPage).toBe(1);
    expect(typeof snapshot.paginationMode).toBe('string');
    expect(Array.isArray(snapshot.columns)).toBe(true);
  });

  test('snapshot captures current page number', async ({ exportGridPage: exp }) => {
    await exp.navigateNext();
    const snapshot = await exp.exportSnapshot();
    expect(snapshot.currentPage).toBe(2);
  });

  test('Restore button re-renders grid on the saved page', async ({ exportGridPage: exp }) => {
    await exp.navigateNext();
    await exp.exportSnapshot();
    const firstCellBefore = await exp.firstCellText();

    await exp.restore();

    const firstCellAfter = await exp.firstCellText();
    expect(firstCellAfter).toBe(firstCellBefore);
    const status = await exp.statusText();
    expect(status).toContain('page 2');
  });

  test('snapshot captures filter text and Restore re-applies it', async ({ exportGridPage: exp }) => {
    await exp.filterBy('alice');
    const snapshot = await exp.exportSnapshot();
    expect(snapshot.currentFilterText).toBe('alice');

    await exp.restore();
    const filterValue = await exp.filterValue();
    expect(filterValue).toBe('alice');
  });
});

// ── Accessibility (axe-core) ──────────────────────────────────────────────────

test.describe('Accessibility @regression', () => {
  test('main grid has no critical a11y violations @smoke', async ({ gridPage }) => {
    const results = await new AxeBuilder({ page: gridPage.page })
      .include('#grid')
      .analyze();
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
  });

  test('pagination grid has no critical a11y violations', async ({ gridPage }) => {
    await gridPage.waitForPaginationReady();
    const results = await new AxeBuilder({ page: gridPage.page })
      .include('#pagination-grid')
      .analyze();
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
  });

  test('cache grid has no critical a11y violations', async ({ cacheGridPage: cache }) => {
    const results = await new AxeBuilder({ page: cache.page })
      .include('#cache-grid')
      .analyze();
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
  });

  test('export grid has no critical a11y violations', async ({ exportGridPage: exp }) => {
    const results = await new AxeBuilder({ page: exp.page })
      .include('#export-grid')
      .analyze();
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
  });
});

// ── Visual Regression ─────────────────────────────────────────────────────────

test.describe('Visual Regression @regression', () => {
  test('main grid matches baseline screenshot', async ({ gridPage }) => {
    await expect(gridPage.page.locator('#grid')).toHaveScreenshot('grid-default.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('pagination grid matches baseline screenshot', async ({ gridPage }) => {
    await gridPage.waitForPaginationReady();
    await expect(gridPage.page.locator('#pagination-grid')).toHaveScreenshot('grid-pagination.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('filtered grid matches baseline screenshot', async ({ gridPage }) => {
    await gridPage.filterBy('alice');
    await expect(gridPage.page.locator('#grid')).toHaveScreenshot('grid-filtered.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('cache grid matches baseline screenshot', async ({ cacheGridPage: cache }) => {
    await expect(cache.page.locator('#cache-grid')).toHaveScreenshot('grid-cache.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

// ── API-Layer Validation ──────────────────────────────────────────────────────

test.describe('API Layer @regression', () => {
  test('GET /users returns 200 and valid JSON array @smoke', async ({ request }) => {
    const response = await request.get('/users');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test('user objects contain expected fields', async ({ request }) => {
    const response = await request.get('/users');
    const data = await response.json();
    const user = data[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('status');
  });

  test('API supports pagination via _page and _limit', async ({ request }) => {
    const response = await request.get('/users?_page=1&_limit=5');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.length).toBeLessThanOrEqual(5);
  });

  test('API supports querying by field (name_like)', async ({ request }) => {
    const response = await request.get('/users?name_like=alice');
    expect(response.status()).toBe(200);
    const data = await response.json();
    for (const user of data) {
      expect(user.name.toLowerCase()).toContain('alice');
    }
  });

  test('grid row count matches API total for page 1', async ({ gridPage, request }) => {
    const gridRows = await gridPage.rowCount();
    const response = await request.get('/users?_page=1&_limit=10');
    const apiData = await response.json();
    expect(gridRows).toBe(apiData.length);
  });
});

// ── Network Interception (resilience) ─────────────────────────────────────────

test.describe('Network Resilience @regression', () => {
  test('grid shows empty state when API returns no data', async ({ page }) => {
    await page.route('**/users*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    const { GridPage } = await import('./pages/GridPage.js');
    const grid = new GridPage(page);
    await grid.goto();
    // With empty data, the grid should render but have zero rows
    await page.waitForLoadState('networkidle');
    const rows = await page.$$eval('#grid tbody tr', els => els.length);
    expect(rows).toBeLessThanOrEqual(1); // 0 rows or 1 empty-state row
  });

  test('grid handles slow API responses gracefully', async ({ page }) => {
    await page.route('**/users*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    const { GridPage } = await import('./pages/GridPage.js');
    const grid = new GridPage(page);
    await grid.goto();
    // Grid should still eventually render after the delay
    await page.waitForSelector('#grid tbody tr', { timeout: 10000 });
    const rows = await page.$$eval('#grid tbody tr', els => els.length);
    expect(rows).toBeGreaterThan(0);
  });

  test('grid recovers after a failed request followed by a successful one', async ({ page }) => {
    let callCount = 0;
    await page.route('**/users*', route => {
      callCount++;
      if (callCount === 1) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Server Error"}' });
      }
      return route.continue();
    });
    const { GridPage } = await import('./pages/GridPage.js');
    const grid = new GridPage(page);
    await grid.goto();
    await page.waitForLoadState('networkidle');

    // Trigger a reload (second call succeeds)
    await page.evaluate(() => window.grid.init());
    await page.waitForSelector('#grid tbody tr', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    const rows = await page.$$eval('#grid tbody tr', els => els.length);
    expect(rows).toBeGreaterThan(0);
  });

  test('filtered request reaches server with correct query param', async ({ page }) => {
    let interceptedUrl = '';
    await page.route('**/users*', route => {
      interceptedUrl = route.request().url();
      return route.continue();
    });
    const { GridPage } = await import('./pages/GridPage.js');
    const grid = new GridPage(page);
    await grid.goto({ filterMode: 'server' });
    await grid.waitForReady();

    await grid.filterBy('alice');
    // Wait for the filter request to fire
    await page.waitForLoadState('networkidle');
    expect(interceptedUrl).toContain('alice');
  });
});

// ── Performance ───────────────────────────────────────────────────────────────

test.describe('Performance @regression', () => {
  test('initial grid render completes in under 3 seconds @smoke', async ({ page }) => {
    const start = Date.now();
    const { GridPage } = await import('./pages/GridPage.js');
    const grid = new GridPage(page);
    await grid.goto();
    await grid.waitForReady();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test('filter re-render completes in under 2 seconds', async ({ gridPage }) => {
    const start = Date.now();
    await gridPage.filterBy('alice');
    const elapsed = Date.now() - start;
    // Includes debounce (300ms) + fetch + render
    expect(elapsed).toBeLessThan(2000);
  });

  test('pagination navigation completes in under 1 second', async ({ gridPage }) => {
    await gridPage.waitForPaginationReady();
    const start = Date.now();
    await gridPage.clickPaginationNext();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  test('DOM node count stays reasonable after multiple operations', async ({ gridPage }) => {
    // Perform several operations
    await gridPage.filterBy('alice');
    await gridPage.filterBy('');
    await gridPage.scrollToBottom();

    const nodeCount = await gridPage.page.evaluate(
      () => document.querySelectorAll('*').length
    );
    // A well-structured grid shouldn't create an excessive DOM
    expect(nodeCount).toBeLessThan(5000);
  });
});
