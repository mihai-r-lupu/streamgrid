// Pagination UI helpers: sliding-window page-number calculation and control rendering.

/**
 * Computes the sliding window of page numbers around the current page.
 * Ensures at most `maxButtons` page numbers are shown, adjusting at edges.
 * @param {number} totalPages - Total number of pages.
 * @param {number} currentPage - 1-based current page index.
 * @param {number} maxButtons - Maximum number of page buttons to display.
 * @returns {{ startPage: number, endPage: number }} Inclusive start and end of the visible window.
 */
export function getPageWindow(totalPages, currentPage, maxButtons) {
    const clamped = Math.max(1, Math.min(maxButtons, totalPages));
    const half = Math.floor(clamped / 2);

    let start;
    let end;

    if (totalPages <= clamped) {
        start = 1;
        end = totalPages;
    } else if (currentPage <= half + 1) {
        // Near the start edge
        start = 1;
        end = clamped;
    } else if (currentPage + half >= totalPages) {
        // Near the end edge
        end = totalPages;
        start = totalPages - clamped + 1;
    } else {
        // Centered window
        start = currentPage - half;
        end = start + clamped - 1;
    }

    return { startPage: start, endPage: end };
}

/**
 * Clears and re-renders the pagination control bar.
 *
 * Handles three modes:
 *  - `pages`  — First / Prev / Next / Last buttons only.
 *  - `numbers` — First / Prev + sliding page-number buttons + Next / Last,
 *                plus optional jump, group-select, and go-to-page controls
 *                configured via `paginationOptions`.
 *  - `infinite` — No pagination controls rendered.
 *
 * @param {import('../../StreamGrid.js').StreamGrid} grid - The grid instance.
 * @param {number} totalRows - Total number of filtered rows.
 */
export function renderNumberedPagination(grid, totalRows) {
    // Always clear before re-rendering to prevent button accumulation across renders.
    grid.paginationElement.innerHTML = '';
    grid.paginationElement.classList.remove('sg-pagination-numbers');

    if (grid.paginationMode === 'infinite' || !grid.pagination) return;

    const totalPages = Math.ceil(totalRows / grid.pageSize);
    if (totalPages === 0) return;

    const { prev: prevText, next: nextText } = grid.paginationPrevNextText;
    const { first: firstText, last: lastText } = grid.paginationFirstLastText;

    if (grid.paginationMode === 'numbers') {
        grid.paginationElement.classList.add('sg-pagination-numbers');

        const navStart = document.createElement('div');
        navStart.className = 'sg-nav-start';
        const navPages = document.createElement('div');
        navPages.className = 'sg-nav-pages';
        const navEnd = document.createElement('div');
        navEnd.className = 'sg-nav-end';

        // Start: First + Prev
        if (grid.paginationFirstLastButtons) {
            appendNavButton(navStart, firstText, 1, grid.currentPage === 1, grid);
        }
        appendNavButton(navStart, prevText, grid.currentPage - 1, grid.currentPage === 1, grid);

        // Pages: jump/group/numbers/goto
        const options = grid.paginationOptions;
        const maxButtons = Math.max(1, Math.min(options.maxPageButtons || 5, totalPages));
        const showEllipses = options.showEllipses !== false;
        const jump = options.jumpOffset || 0;
        const groupSize = options.groupSize || 0;
        const inputJump = options.showPageInput;

        if (jump) appendPrevJump(navPages, grid, jump);
        if (groupSize) appendGroupSelect(navPages, grid, totalPages, groupSize);

        const { startPage: start, endPage: end } = getPageWindow(totalPages, grid.currentPage, maxButtons);
        appendPageButton(navPages, grid, 1);
        if (showEllipses && start > 2) appendEllipsis(navPages);
        for (let p = start; p <= end; p++) if (p !== 1 && p !== totalPages) appendPageButton(navPages, grid, p);
        if (showEllipses && end < totalPages - 1) appendEllipsis(navPages);
        if (totalPages > 1) appendPageButton(navPages, grid, totalPages);

        if (inputJump) appendGotoInput(navPages, grid, totalPages);
        if (jump) appendNextJump(navPages, grid, totalPages, jump);

        // End: Next + Last
        appendNavButton(navEnd, nextText, grid.currentPage + 1, grid.currentPage === totalPages, grid);
        if (grid.paginationFirstLastButtons) {
            appendNavButton(navEnd, lastText, totalPages, grid.currentPage === totalPages, grid);
        }

        grid.paginationElement.append(navStart, navPages, navEnd);
    } else {
        // Pages mode: flat layout
        if (grid.paginationFirstLastButtons) {
            appendNavButton(grid.paginationElement, firstText, 1, grid.currentPage === 1, grid);
        }
        appendNavButton(grid.paginationElement, prevText, grid.currentPage - 1, grid.currentPage === 1, grid);
        appendNavButton(grid.paginationElement, nextText, grid.currentPage + 1, grid.currentPage === totalPages, grid);
        if (grid.paginationFirstLastButtons) {
            appendNavButton(grid.paginationElement, lastText, totalPages, grid.currentPage === totalPages, grid);
        }
    }
}

/** Append a navigation button to a parent element. */
function appendNavButton(parent, text, targetPage, isDisabled, grid) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.disabled = isDisabled;
    btn.addEventListener('click', () => grid.goToPage(targetPage));
    parent.appendChild(btn);
}

/** Append a numbered page button to a parent element. */
function appendPageButton(parent, grid, pageNum) {
    const btn = document.createElement('button');
    btn.textContent = `${pageNum}`;
    if (pageNum === grid.currentPage) btn.disabled = true;
    btn.addEventListener('click', () => grid.goToPage(pageNum));
    parent.appendChild(btn);
}

/** Append ellipsis to a parent element. */
function appendEllipsis(parent) {
    const span = document.createElement('span');
    span.textContent = '…';
    parent.appendChild(span);
}

/** Append Prev jump button to a parent element. */
function appendPrevJump(parent, grid, jump) {
    const btn = document.createElement('button');
    btn.textContent = `«${jump}`;
    btn.disabled = grid.currentPage - jump < 1;
    btn.addEventListener('click', () => grid.goToPage(Math.max(1, grid.currentPage - jump)));
    parent.appendChild(btn);
}

/** Append Next jump button to a parent element. */
function appendNextJump(parent, grid, totalPages, jump) {
    const btn = document.createElement('button');
    btn.textContent = `${jump}»`;
    btn.disabled = grid.currentPage + jump > totalPages;
    btn.addEventListener('click', () => grid.goToPage(Math.min(totalPages, grid.currentPage + jump)));
    parent.appendChild(btn);
}

/** Append group select dropdown to a parent element. */
function appendGroupSelect(parent, grid, totalPages, groupSize) {
    const groupCount = Math.ceil(totalPages / groupSize);
    const select = document.createElement('select');
    select.id = 'sg-group-select';
    select.className = 'sg-group-select';
    for (let g = 0; g < groupCount; g++) {
        const from = g * groupSize + 1;
        const to = Math.min(totalPages, (g + 1) * groupSize);
        const option = document.createElement('option');
        option.value = g;
        option.textContent = `${from}–${to}`;
        select.appendChild(option);
    }
    select.addEventListener('change', e => {
        const groupIndex = parseInt(e.target.value, 10);
        grid.goToPage(groupIndex * groupSize + 1);
    });
    parent.appendChild(select);
}

/** Append Go-to-page input and button to a parent element. */
function appendGotoInput(parent, grid, totalPages) {
    const wrapper = document.createElement('span');
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'sg-goto-page';
    input.min = '1';
    input.max = `${totalPages}`;
    input.value = `${grid.currentPage}`;
    const goButton = document.createElement('button');
    goButton.textContent = 'Go';
    goButton.addEventListener('click', () => {
        let pageNum = parseInt(input.value, 10);
        pageNum = Math.min(totalPages, Math.max(1, pageNum));
        grid.goToPage(pageNum);
    });
    wrapper.append(input, goButton);
    parent.appendChild(wrapper);
}
