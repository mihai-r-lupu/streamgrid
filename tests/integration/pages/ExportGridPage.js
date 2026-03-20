/**
 * Page Object for the exportConfig demo grid (#export-grid).
 */
export class ExportGridPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  static SELECTORS = {
    ROW:             '#export-grid tbody tr',
    FIRST_CELL:      '#export-grid tbody tr:first-child td:first-child',
    FILTER_INPUT:    '#export-grid input[type="text"]',
    NEXT_BTN:        '#export-grid .pagination-controls button:text("Next")',
    EXPORT_BTN:      '#export-btn',
    RESTORE_BTN:     '#restore-btn',
    SNAPSHOT_OUTPUT: '#snapshot-output',
    STATUS:          '#export-status',
  };

  async waitForReady() {
    await this.page.waitForSelector(ExportGridPage.SELECTORS.ROW);
    // Ensure data has rendered (not just empty/loading rows)
    await this.page.waitForFunction(
      sel => (document.querySelector(sel) || {}).textContent?.trim().length > 0,
      ExportGridPage.SELECTORS.FIRST_CELL,
    );
  }

  /** Click Export and return the parsed JSON snapshot. */
  async exportSnapshot() {
    await this.page.click(ExportGridPage.SELECTORS.EXPORT_BTN);
    const json = await this.page.inputValue(ExportGridPage.SELECTORS.SNAPSHOT_OUTPUT);
    return JSON.parse(json);
  }

  /** Click Export and return the raw JSON string. */
  async snapshotJson() {
    await this.page.click(ExportGridPage.SELECTORS.EXPORT_BTN);
    return this.page.inputValue(ExportGridPage.SELECTORS.SNAPSHOT_OUTPUT);
  }

  /** Click Restore and wait for the grid to re-render with data. */
  async restore() {
    await this.page.click(ExportGridPage.SELECTORS.RESTORE_BTN);
    await this.page.waitForSelector(ExportGridPage.SELECTORS.ROW);
    await this.page.waitForFunction(
      sel => (document.querySelector(sel) || {}).textContent?.trim().length > 0,
      ExportGridPage.SELECTORS.FIRST_CELL,
    );
  }

  async navigateNext() {
    await this.page.click(ExportGridPage.SELECTORS.NEXT_BTN);
    await this.page.waitForTimeout(400);
  }

  async filterBy(text) {
    await this.page.fill(ExportGridPage.SELECTORS.FILTER_INPUT, text);
    await this.page.waitForTimeout(400);
  }

  async filterValue() {
    return this.page.inputValue(ExportGridPage.SELECTORS.FILTER_INPUT);
  }

  async firstCellText() {
    return this.page.textContent(ExportGridPage.SELECTORS.FIRST_CELL);
  }

  async statusText() {
    return this.page.textContent(ExportGridPage.SELECTORS.STATUS);
  }
}
