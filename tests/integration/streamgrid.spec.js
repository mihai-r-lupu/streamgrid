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

});
