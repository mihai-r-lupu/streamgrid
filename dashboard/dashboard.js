/* ============================================================
   StreamGrid — Product Dashboard Rendering Engine
   ============================================================
   Reads JSON data files and renders all dashboard sections.
   No external dependencies — pure vanilla JS.
   ============================================================ */

(function () {
  'use strict';

  const DATA_BASE = 'data/';
  const FILES = {
    meta: 'plugin-meta.json',
    components: 'components.json',
    features: 'features.json',
    milestones: 'milestones.json',
    pricing: 'pricing-tiers.json',
    competitive: 'competitive-analysis.json',
  };

  let DATA = {};

  // ---- Data loading ----
  // Prefers data-bundle.js (works with file://), falls back to fetch (web server)
  async function loadData() {
    if (window.STREAMGRID_DATA) {
      return window.STREAMGRID_DATA;
    }
    // Fallback: fetch individual JSON files (requires HTTP server)
    const entries = Object.entries(FILES);
    const results = await Promise.all(
      entries.map(([key, file]) =>
        fetch(DATA_BASE + file).then(r => {
          if (!r.ok) throw new Error(`Failed to load ${file}: ${r.status}`);
          return r.json();
        }).then(json => [key, json])
      )
    );
    const data = {};
    results.forEach(([key, json]) => { data[key] = json; });
    return data;
  }

  // ---- Bootstrap ----
  async function init() {
    try {
      DATA = await loadData();

      renderHeader();
      renderOverview();
      renderFeatures();
      renderComponents();
      renderCapabilities();
      renderMilestones();
      renderCompetitiveAnalysis();
      renderPricing();
      setupNav();
      setupFilters();

      document.getElementById('footer-date').textContent = new Date().toISOString().slice(0, 10);
    } catch (err) {
      document.body.innerHTML = `<div style="padding:3rem;color:#ef4444;font-family:monospace;">
        <h1>Dashboard Load Error</h1><pre>${err.message}\n${err.stack}</pre>
      </div>`;
    }
  }

  // ---- Helpers ----
  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') e.className = v;
        else if (k === 'innerHTML') e.innerHTML = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
        else e.setAttribute(k, v);
      });
    }
    children.forEach(c => {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  function badge(label, type) {
    return el('span', { className: `badge badge-${type || label}` }, label);
  }

  function statusBadge(status) {
    const map = { done: 'done', completed: 'done', planned: 'planned', deferred: 'deferred', blocked: 'blocked', 'in-progress': 'in-progress' };
    return badge(status, map[status] || 'planned');
  }

  function tierBadge(tier) {
    return badge(tier, tier);
  }

  // ---- Scoring helpers ----
  function symbolScore(sym) {
    if (sym === '✓') return 1;
    if (sym === '△') return 0.5;
    return 0;
  }

  function sgScore(status) {
    if (status === 'done') return 1;
    if (status === 'partial') return 0.5;
    return 0;
  }

  function buildStarRating(earned, total) {
    var ratio = total > 0 ? earned / total : 0;
    var score5 = Math.round(ratio * 5 * 2) / 2; // nearest 0.5
    var container = el('div', { className: 'comp-score-display' });
    var starsSpan = el('span', { className: 'comp-stars' });
    for (var i = 1; i <= 5; i++) {
      if (i <= Math.floor(score5)) {
        starsSpan.appendChild(el('span', { className: 'star star-full' }, '★'));
      } else if (i === Math.ceil(score5) && score5 % 1 !== 0) {
        starsSpan.appendChild(el('span', { className: 'star star-half' }, '★'));
      } else {
        starsSpan.appendChild(el('span', { className: 'star star-empty' }, '★'));
      }
    }
    container.appendChild(starsSpan);
    container.appendChild(el('span', { className: 'comp-score-num' }, score5.toFixed(1)));
    return container;
  }

  // ---- Header ----
  function renderHeader() {
    const m = DATA.meta;
    document.getElementById('plugin-name').textContent = m.name;
    document.getElementById('plugin-version').textContent = 'v' + m.version;
    document.getElementById('plugin-status').textContent = m.status.replace(/-/g, ' ');
    document.getElementById('plugin-status').className = `badge badge-${m.status}`;
    if (m.distribution) {
      document.getElementById('plugin-distribution').textContent = m.distribution.replace(/-/g, ' ');
      document.getElementById('plugin-distribution').className = `badge badge-${m.distribution}`;
    }
    if (m.company) document.getElementById('plugin-company').textContent = m.company;
    document.getElementById('plugin-license').textContent = m.license;
    document.getElementById('plugin-updated').textContent = `Updated ${m.lastUpdated}`;
    document.getElementById('plugin-positioning').textContent = m.positioning;
    document.getElementById('plugin-description').textContent = m.description;
    if (m.pipeline) document.getElementById('plugin-pipeline').textContent = m.pipeline;
  }

  // ---- Overview ----
  function renderOverview() {
    const m = DATA.meta;
    const features = DATA.features.features;
    const components = DATA.components;

    const done = features.filter(f => f.status === 'done').length;
    const planned = features.filter(f => f.status === 'planned').length;
    const deferred = features.filter(f => f.status === 'deferred').length;
    const total = features.length;
    const milestonesCompleted = DATA.milestones.filter(ms => ms.status === 'completed').length;
    const milestonesTotal = DATA.milestones.length;

    const statsGrid = document.getElementById('stats-grid');
    const stats = [
      { value: total, label: 'Total Features', color: '' },
      { value: done, label: 'Implemented', color: 'green' },
      { value: deferred, label: 'Deferred', color: 'yellow' },
      { value: planned, label: 'Planned', color: 'blue' },
      { value: components.length, label: 'Components', color: 'purple' },
      { value: `${milestonesCompleted}/${milestonesTotal}`, label: 'Milestones', color: 'green' },
    ];
    stats.forEach(s => {
      const card = el('div', { className: 'stat-card' },
        el('div', { className: `stat-value ${s.color}` }, String(s.value)),
        el('div', { className: 'stat-label' }, s.label)
      );
      statsGrid.appendChild(card);
    });

    // Scope
    const scopeIn = document.getElementById('scope-in');
    m.scope.inScope.forEach(item => scopeIn.appendChild(el('li', null, item)));
    const scopeOut = document.getElementById('scope-out');
    m.scope.outOfScope.forEach(item => scopeOut.appendChild(el('li', null, item)));
    const audience = document.getElementById('audience-list');
    m.audience.forEach(item => audience.appendChild(el('li', null, item)));
  }

  // ---- Features ----
  function renderFeatures() {
    const container = document.getElementById('features-container');
    const categories = DATA.features.categories;
    const features = DATA.features.features;

    categories.forEach(cat => {
      const catFeatures = features.filter(f => f.category === cat.id);
      if (catFeatures.length === 0) return;

      const catDiv = el('div', { className: 'feature-category', 'data-category': cat.id });

      const headerDiv = el('div', { className: 'feature-category-header' });
      headerDiv.appendChild(el('span', { className: 'toggle-icon' }, '▼'));
      headerDiv.appendChild(el('h3', null, cat.name));
      headerDiv.appendChild(el('span', { className: 'cat-count' }, `${catFeatures.length} features`));
      headerDiv.addEventListener('click', () => catDiv.classList.toggle('collapsed'));
      catDiv.appendChild(headerDiv);

      if (cat.description) {
        catDiv.appendChild(el('p', { className: 'section-desc', style: 'margin-bottom:0.5rem;margin-left:1.5rem;' }, cat.description));
      }

      const listDiv = el('div', { className: 'feature-list' });
      catFeatures.forEach(f => {
        const card = createFeatureCard(f);
        listDiv.appendChild(card);
      });
      catDiv.appendChild(listDiv);
      container.appendChild(catDiv);
    });
  }

  function createFeatureCard(f) {
    const card = el('div', {
      className: 'feature-card',
      'data-status': f.status,
      'data-tier': f.tier,
      'data-search': `${f.name} ${f.description} ${f.id}`.toLowerCase(),
    });

    const header = el('div', { className: 'feature-card-header' });
    header.appendChild(el('span', { className: 'feature-name' }, f.name));
    const badges = el('span', { className: 'feature-badges' });
    badges.appendChild(statusBadge(f.status));
    badges.appendChild(tierBadge(f.tier));
    if (f.milestone) {
      badges.appendChild(badge(f.milestone, 'version'));
    }
    header.appendChild(badges);
    card.appendChild(header);

    // Body (expandable)
    const body = el('div', { className: 'feature-card-body' });

    if (f.description) {
      body.appendChild(featureDetail('Description', f.description));
    }
    if (f.implementation) {
      body.appendChild(featureDetail('Implementation', f.implementation));
    }
    if (f.benefit) {
      body.appendChild(featureDetail('Benefit', f.benefit));
    }
    if (f.deferredReason) {
      body.appendChild(featureDetail('Why Deferred', f.deferredReason, true));
    }
    if (f.prerequisites && f.prerequisites.length) {
      body.appendChild(featureDetail('Prerequisites', f.prerequisites.join(', ')));
    }
    if (f.components && f.components.length) {
      const compDiv = el('div', { className: 'feature-components' });
      f.components.forEach(c => {
        compDiv.appendChild(el('span', { className: 'component-tag' }, c));
      });
      body.appendChild(el('div', { className: 'feature-detail' },
        el('div', { className: 'feature-detail-label' }, 'Components'),
        compDiv
      ));
    }

    card.appendChild(body);

    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      card.classList.toggle('expanded');
    });

    return card;
  }

  function featureDetail(label, value, isDeferred) {
    return el('div', { className: 'feature-detail' },
      el('div', { className: 'feature-detail-label' }, label),
      el('div', { className: `feature-detail-value ${isDeferred ? 'deferred' : ''}` }, value)
    );
  }

  function setupFilters() {
    const statusFilter = document.getElementById('filter-status');
    const tierFilter = document.getElementById('filter-tier');
    const searchFilter = document.getElementById('filter-search');

    function applyFilters() {
      const status = statusFilter.value;
      const tier = tierFilter.value;
      const search = searchFilter.value.toLowerCase().trim();

      document.querySelectorAll('.feature-card').forEach(card => {
        const matchStatus = status === 'all' || card.dataset.status === status;
        const matchTier = tier === 'all' || card.dataset.tier === tier;
        const matchSearch = !search || card.dataset.search.includes(search);
        card.classList.toggle('hidden', !(matchStatus && matchTier && matchSearch));
      });

      // Hide empty categories
      document.querySelectorAll('.feature-category').forEach(cat => {
        const visible = cat.querySelectorAll('.feature-card:not(.hidden)').length;
        cat.classList.toggle('hidden', visible === 0);
      });
    }

    statusFilter.addEventListener('change', applyFilters);
    tierFilter.addEventListener('change', applyFilters);
    searchFilter.addEventListener('input', applyFilters);
  }

  // ---- Components ----
  function renderComponents() {
    const container = document.getElementById('components-container');
    const grid = el('div', { className: 'components-grid' });

    // Group by namespace
    const groups = {};
    DATA.components.forEach(c => {
      const ns = normalizeNs(c.namespace);
      if (!groups[ns]) groups[ns] = [];
      groups[ns].push(c);
    });

    const nsOrder = ['Core', 'DataAdapter', 'Events', 'Hooks', 'Utils', 'WebComponent', 'Styles', 'Controller', 'Providers', 'UI', 'Diagnostics', 'SavedViews', 'Support', 'root'];
    nsOrder.forEach(ns => {
      if (!groups[ns]) return;
      groups[ns].forEach(c => {
        grid.appendChild(createComponentCard(c));
      });
    });
    // Render any remaining namespaces not in nsOrder
    Object.keys(groups).forEach(ns => {
      if (nsOrder.includes(ns)) return;
      groups[ns].forEach(c => {
        grid.appendChild(createComponentCard(c));
      });
    });

    container.appendChild(grid);
  }

  function normalizeNs(ns) {
    if (ns.startsWith('Core')) return 'Core';
    if (ns.startsWith('Providers')) return 'Providers';
    return ns;
  }

  function nsClass(ns) {
    const map = {
      'Controller': 'ns-controller',
      'Core': 'ns-core',
      'DataAdapter': 'ns-core',
      'Events': 'ns-core',
      'Hooks': 'ns-core',
      'Utils': 'ns-support',
      'WebComponent': 'ns-ui',
      'Styles': 'ns-ui',
      'Providers': 'ns-providers',
      'UI': 'ns-ui',
      'Diagnostics': 'ns-diagnostics',
      'SavedViews': 'ns-savedviews',
      'Support': 'ns-support',
      'root': 'ns-root',
    };
    return map[normalizeNs(ns)] || '';
  }

  function createComponentCard(c) {
    const card = el('div', { className: `component-card ${nsClass(c.namespace)}` });

    const header = el('div', { className: 'component-card-header' });
    header.appendChild(el('span', { className: 'component-name' }, c.class));
    header.appendChild(el('span', { className: 'component-ns' }, c.namespace));
    card.appendChild(header);

    card.appendChild(el('p', { className: 'component-desc' }, c.description));

    // Details (expandable)
    const details = el('div', { className: 'component-details' });
    if (c.responsibility) {
      details.appendChild(el('div', null,
        el('strong', null, 'Responsibility: '),
        document.createTextNode(c.responsibility)
      ));
    }
    if (c.files && c.files.length) {
      const filesDiv = el('div', { className: 'component-files' });
      c.files.forEach(f => {
        filesDiv.appendChild(el('div', null, f));
      });
      details.appendChild(filesDiv);
    }
    if (c.dependencies && c.dependencies.length) {
      const depsDiv = el('div', { className: 'component-deps' });
      c.dependencies.forEach(d => {
        depsDiv.appendChild(el('span', { className: 'component-tag' }, d));
      });
      details.appendChild(el('div', { style: 'margin-top:0.4rem;' },
        el('strong', null, 'Dependencies: '),
        depsDiv
      ));
    }
    if (c.notes) {
      details.appendChild(el('div', { style: 'margin-top:0.4rem;color:var(--yellow);' }, c.notes));
    }
    card.appendChild(details);

    card.addEventListener('click', () => card.classList.toggle('expanded'));
    return card;
  }

  // ---- Capabilities (reads from unified competitive data) ----
  function renderCapabilities() {
    const container = document.getElementById('capabilities-container');
    const cats = DATA.competitive.categories;
    if (!cats) return;

    cats.forEach(cat => {
      const catDiv = el('div', { className: 'capability-category' });
      catDiv.appendChild(el('h3', null, cat.name));

      const table = el('table', { className: 'capability-table' });
      const thead = el('thead');
      const headerRow = el('tr');
      ['Capability', 'Status', 'Sources', 'Notes'].forEach(h => {
        headerRow.appendChild(el('th', null, h));
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      cat.features.forEach(f => {
        const sg = f.sg || {};
        const row = el('tr');

        row.appendChild(el('td', null, f.feature));

        const statusCell = el('td');
        const isImpl = ['done', 'partial'].includes(sg.status);
        statusCell.appendChild(badge(
          isImpl ? (sg.status === 'partial' ? '△ Partial' : '✓ Supported') : '✕ Not Supported',
          isImpl ? 'supported' : 'not-supported'
        ));
        row.appendChild(statusCell);

        const sourceCell = el('td');
        if (sg.sources && sg.sources.length) {
          const tags = el('div', { className: 'source-tags' });
          sg.sources.forEach(s => {
            tags.appendChild(el('span', { className: 'source-tag' }, s));
          });
          sourceCell.appendChild(tags);
        } else {
          sourceCell.appendChild(document.createTextNode('—'));
        }
        row.appendChild(sourceCell);

        row.appendChild(el('td', { className: 'text-muted', style: 'color:var(--text-dim);font-size:0.775rem;' }, sg.note || ''));

        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      catDiv.appendChild(table);
      container.appendChild(catDiv);
    });
  }

  // ---- Competitive Analysis (unified presence-based rendering) ----
  function renderCompetitiveAnalysis() {
    const comp = DATA.competitive;
    if (!comp) return;

    const container = document.getElementById('competitive-container');

    // Legend
    const legendDiv = document.getElementById('comp-legend');
    const symbols = comp.legend.symbols;
    Object.entries(symbols).forEach(([sym, label]) => {
      const item = el('span', { className: 'comp-legend-item' },
        el('span', { className: `comp-sym comp-sym-${sym === '✓' ? 'yes' : sym === '△' ? 'partial' : 'no'}` }, sym),
        document.createTextNode(' ' + label)
      );
      legendDiv.appendChild(item);
    });
    Object.entries(comp.legend.sgStatus).forEach(([key, label]) => {
      const item = el('span', { className: 'comp-legend-item' },
        el('span', { className: `badge badge-sg-${key}` }, key),
        document.createTextNode(' ' + label)
      );
      legendDiv.appendChild(item);
    });

    // Build tier categories by filtering features with the given key
    function buildTierCategories(tierKey) {
      return comp.categories
        .map(cat => ({
          name: cat.name,
          features: cat.features.filter(f => f[tierKey])
        }))
        .filter(cat => cat.features.length > 0);
    }

    // Collect differentiator features
    function collectDifferentiators() {
      const rows = [];
      comp.categories.forEach(cat => {
        cat.features.forEach(f => {
          if (f.differentiator) rows.push(f);
        });
      });
      return rows;
    }

    // Tier tabs
    const tabsDiv = document.getElementById('comp-tier-tabs');
    const tabs = [
      { id: 'free', label: 'Free Tier' },
      { id: 'paid', label: 'Paid Tier' },
      { id: 'diff', label: 'StreamGrid Exclusive' },
    ];
    tabs.forEach((t, i) => {
      const btn = el('button', {
        className: `comp-tab${i === 0 ? ' active' : ''}`,
        'data-tier': t.id,
      }, t.label);
      btn.addEventListener('click', () => {
        tabsDiv.querySelectorAll('.comp-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        container.querySelectorAll('.comp-tier-panel').forEach(p => p.classList.remove('active'));
        container.querySelector(`.comp-tier-panel[data-tier="${t.id}"]`).classList.add('active');
      });
      tabsDiv.appendChild(btn);
    });

    // Free tier panel
    const freePanel = el('div', { className: 'comp-tier-panel active', 'data-tier': 'free' });
    renderCompTierTable(freePanel, buildTierCategories('free'), comp.competitors.free, 'free');
    container.appendChild(freePanel);

    // Paid tier panel
    const paidPanel = el('div', { className: 'comp-tier-panel', 'data-tier': 'paid' });
    renderCompPricing(paidPanel, comp.pricing, comp.competitors.paid);
    renderCompTierTable(paidPanel, buildTierCategories('paid'), comp.competitors.paid, 'paid');
    container.appendChild(paidPanel);

    // Differentiators panel
    const diffPanel = el('div', { className: 'comp-tier-panel', 'data-tier': 'diff' });
    renderDifferentiators(diffPanel, {
      title: comp.differentiators.title,
      description: comp.differentiators.description,
      rows: collectDifferentiators()
    });
    container.appendChild(diffPanel);
  }

  function renderCompTierTable(panel, categories, competitors, tierKey) {
    var allCatScores = []; // collect for overall rating

    categories.forEach(cat => {
      const catDiv = el('div', { className: 'comp-category' });
      catDiv.appendChild(el('h3', { className: 'comp-cat-title' }, cat.name));

      const table = el('table', { className: 'comp-table' });

      // Header row
      const thead = el('thead');
      const hr = el('tr');
      hr.appendChild(el('th', { className: 'comp-th-feature' }, 'Feature'));
      competitors.forEach(c => {
        hr.appendChild(el('th', { className: 'comp-th-competitor' }, c.name));
      });
      hr.appendChild(el('th', { className: 'comp-th-sg' }, 'StreamGrid'));
      thead.appendChild(hr);
      table.appendChild(thead);

      // Score accumulators for this category
      var catScores = {};
      competitors.forEach(c => { catScores[c.id] = { earned: 0, total: 0 }; });
      catScores._sg = { earned: 0, total: 0 };

      // Body rows
      const tbody = el('tbody');
      cat.features.forEach(f => {
        const mainRow = el('tr', { className: 'comp-row' });

        // Feature name cell
        mainRow.appendChild(el('td', { className: 'comp-td-feature' }, f.feature));

        // Competitor cells — read from f[tierKey][compId]
        const tierData = f[tierKey] || {};
        competitors.forEach(comp => {
          catScores[comp.id].total++;
          const cell = tierData[comp.id];
          if (!cell) {
            mainRow.appendChild(el('td', { className: 'comp-td-cell' }, '—'));
            return;
          }
          catScores[comp.id].earned += symbolScore(cell.symbol);
          const td = el('td', { className: 'comp-td-cell' });
          const symClass = cell.symbol === '✓' ? 'comp-sym-yes' : cell.symbol === '△' ? 'comp-sym-partial' : 'comp-sym-no';
          const symSpan = el('span', { className: `comp-sym ${symClass}` }, cell.symbol);
          if (cell.detail) {
            symSpan.setAttribute('title', cell.detail);
            symSpan.classList.add('has-tooltip');
          }
          td.appendChild(symSpan);
          mainRow.appendChild(td);
        });

        // StreamGrid cell + score
        catScores._sg.total++;
        if (f.sg) catScores._sg.earned += sgScore(f.sg.status);
        const sgTd = el('td', { className: 'comp-td-sg' });
        if (f.sg) {
          const sgBadge = el('span', { className: `badge badge-sg-${f.sg.status}` }, f.sg.status);
          if (f.sg.note) sgBadge.setAttribute('title', f.sg.note);
          sgTd.appendChild(sgBadge);
        } else {
          sgTd.appendChild(document.createTextNode('—'));
        }
        mainRow.appendChild(sgTd);

        tbody.appendChild(mainRow);

        // Expandable detail row (only if any competitor has detail or sg has note)
        const hasDetails = competitors.some(c => tierData[c.id] && tierData[c.id].detail) || (f.sg && f.sg.note);
        if (hasDetails) {
          mainRow.classList.add('comp-expandable');
          mainRow.addEventListener('click', () => {
            const detailRow = mainRow.nextElementSibling;
            if (detailRow && detailRow.classList.contains('comp-detail-row')) {
              detailRow.classList.toggle('expanded');
              mainRow.classList.toggle('expanded');
            }
          });

          const detailRow = el('tr', { className: 'comp-detail-row' });
          const detailTd = el('td', { colspan: String(competitors.length + 2), className: 'comp-detail-cell' });
          const detailGrid = el('div', { className: 'comp-detail-grid' });

          competitors.forEach(comp => {
            const cell = tierData[comp.id];
            if (cell && cell.detail) {
              detailGrid.appendChild(el('div', { className: 'comp-detail-item' },
                el('span', { className: 'comp-detail-label' }, comp.name),
                el('span', { className: 'comp-detail-text' }, cell.detail)
              ));
            }
          });
          if (f.sg && f.sg.note) {
            detailGrid.appendChild(el('div', { className: 'comp-detail-item comp-detail-sg' },
              el('span', { className: 'comp-detail-label' }, 'StreamGrid'),
              el('span', { className: 'comp-detail-text' }, f.sg.note)
            ));
          }
          detailTd.appendChild(detailGrid);
          detailRow.appendChild(detailTd);
          tbody.appendChild(detailRow);
        }
      });

      // Category score row
      var scoreRow = el('tr', { className: 'comp-score-row' });
      scoreRow.appendChild(el('td', { className: 'comp-td-feature comp-score-label' }, 'Category Score'));
      competitors.forEach(c => {
        var td = el('td', { className: 'comp-td-cell comp-score-cell' });
        td.appendChild(buildStarRating(catScores[c.id].earned, catScores[c.id].total));
        scoreRow.appendChild(td);
      });
      var sgScoreTd = el('td', { className: 'comp-td-sg comp-score-cell' });
      sgScoreTd.appendChild(buildStarRating(catScores._sg.earned, catScores._sg.total));
      scoreRow.appendChild(sgScoreTd);
      tbody.appendChild(scoreRow);

      allCatScores.push(catScores);

      table.appendChild(tbody);
      catDiv.appendChild(table);
      panel.appendChild(catDiv);
    });

    // Overall Rating section
    if (allCatScores.length > 0) {
      var overallDiv = el('div', { className: 'comp-category comp-overall-rating' });
      overallDiv.appendChild(el('h3', { className: 'comp-cat-title comp-overall-title' }, 'Overall Rating'));
      var overallTable = el('table', { className: 'comp-table' });

      var oHead = el('thead');
      var oHr = el('tr');
      oHr.appendChild(el('th', { className: 'comp-th-feature' }, ''));
      competitors.forEach(c => {
        oHr.appendChild(el('th', { className: 'comp-th-competitor' }, c.name));
      });
      oHr.appendChild(el('th', { className: 'comp-th-sg' }, 'StreamGrid'));
      oHead.appendChild(oHr);
      overallTable.appendChild(oHead);

      var oBody = el('tbody');
      var oRow = el('tr', { className: 'comp-score-row comp-overall-row' });
      oRow.appendChild(el('td', { className: 'comp-td-feature comp-score-label' }, 'Overall'));

      // Compute overall: average of category ratios → 5-star scale
      competitors.forEach(c => {
        var sumRatio = 0;
        allCatScores.forEach(cs => {
          sumRatio += cs[c.id].total > 0 ? cs[c.id].earned / cs[c.id].total : 0;
        });
        var avgRatio = sumRatio / allCatScores.length;
        var td = el('td', { className: 'comp-td-cell comp-score-cell' });
        td.appendChild(buildStarRating(avgRatio, 1));
        oRow.appendChild(td);
      });

      var sumSg = 0;
      allCatScores.forEach(cs => {
        sumSg += cs._sg.total > 0 ? cs._sg.earned / cs._sg.total : 0;
      });
      var avgSg = sumSg / allCatScores.length;
      var oSg = el('td', { className: 'comp-td-sg comp-score-cell' });
      oSg.appendChild(buildStarRating(avgSg, 1));
      oRow.appendChild(oSg);
      oBody.appendChild(oRow);
      overallTable.appendChild(oBody);
      overallDiv.appendChild(overallTable);
      panel.appendChild(overallDiv);
    }
  }

  function renderCompPricing(panel, pricing, competitors) {
    if (!pricing || !pricing.length) return;

    const catDiv = el('div', { className: 'comp-category comp-pricing-category' });
    catDiv.appendChild(el('h3', { className: 'comp-cat-title' }, 'Pricing'));

    const table = el('table', { className: 'comp-table comp-pricing-table' });
    const thead = el('thead');
    const hr = el('tr');
    hr.appendChild(el('th', { className: 'comp-th-feature' }, ''));
    competitors.forEach(c => {
      hr.appendChild(el('th', { className: 'comp-th-competitor' }, c.name));
    });
    hr.appendChild(el('th', { className: 'comp-th-sg' }, 'StreamGrid'));
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = el('tbody');
    const compKeys = competitors.map(c => c.id);

    pricing.forEach(p => {
      const row = el('tr', { className: 'comp-pricing-row' });
      row.appendChild(el('td', { className: 'comp-td-feature comp-pricing-label' }, p.label));

      compKeys.forEach(key => {
        const val = p[key];
        const td = el('td', { className: 'comp-td-cell comp-pricing-value' });
        if (typeof val === 'string') {
          td.appendChild(document.createTextNode(val));
        } else if (val && val.symbol) {
          const symClass = val.symbol === '✓' ? 'comp-sym-yes' : 'comp-sym-no';
          td.appendChild(el('span', { className: `comp-sym ${symClass}` }, val.symbol));
        } else {
          td.appendChild(document.createTextNode('—'));
        }
        row.appendChild(td);
      });

      // StreamGrid column: free / core vs plugin
      const sgTd = el('td', { className: 'comp-td-sg comp-pricing-value' });
      sgTd.appendChild(el('span', { className: 'comp-sg-free-label' }, 'Free'));
      row.appendChild(sgTd);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    catDiv.appendChild(table);
    panel.appendChild(catDiv);
  }

  function renderDifferentiators(panel, diff) {
    if (!diff) return;

    const intro = el('div', { className: 'comp-diff-intro' });
    intro.appendChild(el('p', { className: 'section-desc' }, diff.description));
    panel.appendChild(intro);

    const grid = el('div', { className: 'comp-diff-grid' });
    diff.rows.forEach(f => {
      const d = f.differentiator;
      const card = el('div', { className: `comp-diff-card comp-diff-${f.sg.status}` });

      const header = el('div', { className: 'comp-diff-header' });
      header.appendChild(el('span', { className: 'comp-diff-name' }, f.feature));
      header.appendChild(el('span', { className: `badge badge-sg-${f.sg.status}` }, f.sg.status));
      card.appendChild(header);

      card.appendChild(el('p', { className: 'comp-diff-detail' }, d.detail));

      if (f.sg.note) {
        card.appendChild(el('div', { className: 'comp-diff-note' },
          el('span', { className: 'comp-diff-note-label' }, 'Implementation: '),
          document.createTextNode(f.sg.note)
        ));
      }

      if (d.competitors) {
        card.appendChild(el('div', { className: 'comp-diff-competitors' },
          el('span', { className: 'comp-diff-note-label' }, 'Competitors: '),
          document.createTextNode(d.competitors)
        ));
      }

      grid.appendChild(card);
    });
    panel.appendChild(grid);
  }

  // ---- Milestones ----
  function renderMilestones() {
    const container = document.getElementById('milestones-container');
    const timeline = el('div', { className: 'milestone-timeline' });

    DATA.milestones.forEach(ms => {
      const item = el('div', { className: `milestone-item ${ms.status}` });

      const header = el('div', { className: 'milestone-header' });
      header.appendChild(el('span', { className: 'milestone-name' }, ms.name));
      header.appendChild(statusBadge(ms.status));
      if (ms.completedDate) {
        header.appendChild(el('span', { className: 'milestone-date' }, ms.completedDate));
      }
      item.appendChild(header);
      item.appendChild(el('p', { className: 'milestone-desc' }, ms.description));

      timeline.appendChild(item);
    });

    container.appendChild(timeline);
  }

  // ---- Pricing ----
  function renderPricing() {
    const container = document.getElementById('pricing-container');
    const pricing = DATA.pricing;
    const features = DATA.features.features;

    document.getElementById('pricing-notes').textContent = pricing.notes;

    // Render all tiers (Core, Plugin, Adapter)
    pricing.tiers.forEach(tierDef => {
      const tierId = tierDef.id;

      const allocation = pricing.allocation[tierId] || [];

      const tierDiv = el('div', { className: 'pricing-tier' });

      const headerDiv = el('div', { className: 'pricing-tier-header', style: `border-left: 4px solid ${tierDef.color};` });
      headerDiv.appendChild(el('h3', { style: `color: ${tierDef.color};` }, tierDef.name));
      headerDiv.appendChild(el('p', { className: 'tier-desc' }, tierDef.description));
      const countDone = allocation.filter(a => {
        const ft = features.find(f => f.id === a.featureId);
        return ft && ft.status === 'done';
      }).length;
      headerDiv.appendChild(el('p', { className: 'tier-desc', style: 'margin-top:0.35rem;' },
        `${countDone} implemented / ${allocation.length} total`
      ));
      tierDiv.appendChild(headerDiv);

      const bodyDiv = el('div', { className: 'pricing-tier-body' });
      const list = el('ul', { className: 'pricing-feature-list' });

      allocation.forEach(a => {
        const ft = features.find(f => f.id === a.featureId);
        if (!ft) return;

        const item = el('li', {
          className: `pricing-feature-item ${ft.status === 'deferred' ? 'status-deferred' : ''}`,
        });

        const isDone = ft.status === 'done';
        item.appendChild(el('span', {
          className: `check ${isDone ? 'done' : 'future'}`,
        }, isDone ? '●' : '○'));

        const nameSpan = el('span', { className: 'pf-name' }, ft.name);
        item.appendChild(nameSpan);

        if (a.notes) {
          item.appendChild(el('span', { className: 'pf-notes' }, `(${a.notes})`));
        }

        list.appendChild(item);
      });

      bodyDiv.appendChild(list);
      tierDiv.appendChild(bodyDiv);
      container.appendChild(tierDiv);
    });
  }

  // ---- Navigation ----
  function setupNav() {
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    // Intersection observer for active section
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const target = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          if (target) target.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    sections.forEach(s => observer.observe(s));

    // Smooth scroll
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ---- Go ----
  document.addEventListener('DOMContentLoaded', init);
})();
