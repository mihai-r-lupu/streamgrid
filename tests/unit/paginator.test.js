import { expect } from 'chai';
import { page, infinite } from '../../src/core/pagination/paginator.js';
import { getPageWindow } from '../../src/core/pagination/paginationHelpers.js';

// ── paginator.page() ────────────────────────────────────────────────────────

describe('paginator — page()', () => {

    const data = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

    it('returns the first page of items', () => {
        const result = page(data, 1, 10);
        expect(result).to.have.lengthOf(10);
        expect(result[0].id).to.equal(1);
        expect(result[9].id).to.equal(10);
    });

    it('returns the correct middle page', () => {
        const result = page(data, 3, 10);
        expect(result).to.have.lengthOf(10);
        expect(result[0].id).to.equal(21);
        expect(result[9].id).to.equal(30);
    });

    it('returns a partial last page when data does not divide evenly', () => {
        const result = page(data, 6, 10); // 50 items, page 6 = items 51-60, only 0 exist
        expect(result).to.have.lengthOf(0);

        const partial = page(data, 5, 12); // 50 items, page 5 of 12 = items 49-60, only 2 exist
        expect(partial).to.have.lengthOf(2);
        expect(partial[0].id).to.equal(49);
        expect(partial[1].id).to.equal(50);
    });

    it('returns an empty array for an empty dataset', () => {
        expect(page([], 1, 10)).to.have.lengthOf(0);
    });

    it('defaults to page 1 and pageSize 10', () => {
        const result = page(data);
        expect(result).to.have.lengthOf(10);
        expect(result[0].id).to.equal(1);
    });

    it('returns empty array for page 0 or negative page', () => {
        // page 0: start = -10, slice(-10, 0) returns empty on most data
        const result = page(data, 0, 10);
        expect(result).to.have.lengthOf(0);
    });
});

// ── paginator.infinite() ────────────────────────────────────────────────────

describe('paginator — infinite()', () => {

    const data = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));

    it('returns initialSize rows on first load (loadedCount = 0)', () => {
        const { rows, nextCount } = infinite(data, 0, 20);
        expect(rows).to.have.lengthOf(20);
        expect(rows[0].id).to.equal(1);
        expect(nextCount).to.equal(20);
    });

    it('returns loadedCount rows on subsequent loads', () => {
        const { rows, nextCount } = infinite(data, 40, 20);
        expect(rows).to.have.lengthOf(40);
        expect(nextCount).to.equal(40);
    });

    it('enforces totalLimit when set', () => {
        const { rows, nextCount } = infinite(data, 80, 20, 50);
        expect(rows).to.have.lengthOf(50);
        expect(nextCount).to.equal(50);
    });

    it('totalLimit does not increase rows beyond loadedCount', () => {
        const { rows, nextCount } = infinite(data, 30, 20, 500);
        expect(rows).to.have.lengthOf(30);
        expect(nextCount).to.equal(30);
    });

    it('handles empty dataset', () => {
        const { rows, nextCount } = infinite([], 0, 10);
        expect(rows).to.have.lengthOf(0);
        expect(nextCount).to.equal(10);
    });
});

// ── paginationHelpers.getPageWindow() ───────────────────────────────────────

describe('paginationHelpers — getPageWindow()', () => {

    it('returns full range when totalPages <= maxButtons', () => {
        const { startPage, endPage } = getPageWindow(5, 3, 7);
        expect(startPage).to.equal(1);
        expect(endPage).to.equal(5);
    });

    it('returns full range when totalPages equals maxButtons', () => {
        const { startPage, endPage } = getPageWindow(7, 4, 7);
        expect(startPage).to.equal(1);
        expect(endPage).to.equal(7);
    });

    it('anchors to start when currentPage is near the beginning', () => {
        const { startPage, endPage } = getPageWindow(100, 1, 7);
        expect(startPage).to.equal(1);
        expect(endPage).to.equal(7);
    });

    it('anchors to start at page 2', () => {
        const { startPage, endPage } = getPageWindow(100, 2, 7);
        expect(startPage).to.equal(1);
        expect(endPage).to.equal(7);
    });

    it('anchors to end when currentPage is near the last page', () => {
        const { startPage, endPage } = getPageWindow(100, 100, 7);
        expect(startPage).to.equal(94);
        expect(endPage).to.equal(100);
    });

    it('anchors to end at second-to-last page', () => {
        const { startPage, endPage } = getPageWindow(100, 99, 7);
        expect(startPage).to.equal(94);
        expect(endPage).to.equal(100);
    });

    it('centers the window in the middle of a large range', () => {
        const { startPage, endPage } = getPageWindow(100, 50, 7);
        expect(startPage).to.equal(47);
        expect(endPage).to.equal(53);
        expect(endPage - startPage + 1).to.equal(7);
    });

    it('handles single page', () => {
        const { startPage, endPage } = getPageWindow(1, 1, 7);
        expect(startPage).to.equal(1);
        expect(endPage).to.equal(1);
    });

    it('window size never exceeds maxButtons', () => {
        for (const cp of [1, 25, 50, 75, 100]) {
            const { startPage, endPage } = getPageWindow(100, cp, 7);
            expect(endPage - startPage + 1).to.be.at.most(7);
        }
    });

    it('window always contains the current page', () => {
        for (const cp of [1, 2, 10, 50, 99, 100]) {
            const { startPage, endPage } = getPageWindow(100, cp, 7);
            expect(cp).to.be.at.least(startPage);
            expect(cp).to.be.at.most(endPage);
        }
    });

    it('startPage is never less than 1', () => {
        for (const cp of [1, 2, 3]) {
            const { startPage } = getPageWindow(100, cp, 7);
            expect(startPage).to.be.at.least(1);
        }
    });

    it('endPage is never greater than totalPages', () => {
        for (const cp of [98, 99, 100]) {
            const { endPage } = getPageWindow(100, cp, 7);
            expect(endPage).to.be.at.most(100);
        }
    });
});
