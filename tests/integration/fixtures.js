/**
 * Custom Playwright fixtures for StreamGrid E2E tests.
 *
 * Each fixture navigates to test-page.html and waits for its grid to be
 * ready, then provides a page-object instance to the test.
 */
import { test as base } from '@playwright/test';
import { GridPage } from './pages/GridPage.js';
import { CacheGridPage } from './pages/CacheGridPage.js';
import { ExportGridPage } from './pages/ExportGridPage.js';

export const test = base.extend({
    /** Main grid (#grid) — ready to interact after navigation. */
    gridPage: async ({ page }, use) => {
        const grid = new GridPage(page);
        await grid.goto();
        await grid.waitForReady();
        await use(grid);
    },

    /** Cache demo grid (#cache-grid) — counters at miss:1, hit:0 after setup. */
    cacheGridPage: async ({ page }, use) => {
        const grid = new GridPage(page);
        await grid.goto();
        await grid.waitForReady();          // main grid settles first (mirrors original beforeEach)
        const cache = new CacheGridPage(page);
        await cache.waitForReady();
        await cache.waitForMiss(1);         // ensure the initial fetchData has fired
        await use(cache);
    },

    /** Export demo grid (#export-grid) — ready for export/restore interactions. */
    exportGridPage: async ({ page }, use) => {
        const grid = new GridPage(page);
        await grid.goto();
        await grid.waitForReady();          // main grid settles first
        const exp = new ExportGridPage(page);
        await exp.waitForReady();
        await use(exp);
    },
});

export { expect } from '@playwright/test';
