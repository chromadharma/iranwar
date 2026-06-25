/**
 * app.js — The 2026 Iran War: A Geoeconomic Autopsy
 * Stepwell Centre for Asian Futures · Ahmedabad University
 * Author: Sahasrik Ragani
 *
 * Sections:
 *   1. Constants & Helpers
 *   2. Progress Bar
 *   3. Phase Legend
 *   4. Scrollytelling Map (Leaflet)
 *   5. Scroll Steps — Build & Observe
 *   6. Sandbox Map (Leaflet)
 *   7. Timeline Slider
 *   8. Sankey Drawing Engine (Custom SVG)
 *   9. Sankey Renders — India & Global
 *  10. Chart.js Charts (13 charts)
 *  11. Geopolitical Cost Table
 *  12. Main Init
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. CONSTANTS & HELPERS
═══════════════════════════════════════════════════════════════ */

const V = {
  v0:'#440154', v1:'#482878', v2:'#3e4989', v3:'#31688e',
  v4:'#26828e', v5:'#1f9e89', v6:'#35b779', v7:'#6ece58',
  v8:'#b5de2b', v9:'#fde725'
};

const PC = {
  outbreak:'#482878', closure:'#3e4989', escalation:'#31688e',
  peak:'#fde725',     stalemate:'#26828e', ceasefire1:'#1f9e89',
  collapse:'#b5de2b', blockade:'#6ece58', relapse:'#b5de2b',
  resolution:'#35b779', recovery:'#1f9e89'
};

/* Day offset from Feb 28 = day 0 (2026 is not a leap year) */
const M_OFF = { Jan:-31, Feb:-28, Mar:0, Apr:31, May:61, Jun:92 };

function dayOf(str) {
  if (!str) return 0;
  const p = str.trim().split(/[\s,]+/);
  const mon = (p[0] || '').substring(0, 3);
  const d   = parseInt(p[1]) || 0;
  return (M_OFF[mon] ?? 0) + d;
}

function getHormuzStatus(day) {
  if (day <= 1)               return 'open';
  if (day <= 37)              return 'closed';
  if (day <= 43)              return 'open';       // Pakistan ceasefire
  if (day <= 101)             return 'blockaded';  // US naval blockade
  if (day <= 103)             return 'closed';     // Jun 10 relapse
  if (day <= 109)             return 'opening';    // diplomacy
  return 'open';                                   // post-MoU
}

/* Chart.js global dark defaults */
Chart.defaults.color          = '#555';
Chart.defaults.borderColor    = '#1e1e1e';
Chart.defaults.font.family    = "'Space Mono', monospace";
Chart.defaults.font.size      = 10;

const TIP = {
  backgroundColor:'#161616', borderColor:'#2a2a2a', borderWidth:1,
  titleColor:'#f0f0f0', bodyColor:'#999', padding:12,
  titleFont:{ family:"'Space Grotesk',sans-serif", weight:'700', size:12 },
  bodyFont:{ family:"'Space Mono',monospace", size:10 }
};

function mkScale(overrides = {}) {
  return {
    grid:  { color:'#1a1a1a' },
    ticks: { color:'#555', font:{ family:"'Space Mono',monospace", size:10 } },
    ...overrides
  };
}

/* ═══════════════════════════════════════════════════════════════
   2. PROGRESS BAR
═══════════════════════════════════════════════════════════════ */
function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const dH = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${dH > 0 ? Math.min(window.scrollY / dH, 1) : 0})`;
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════
   3. PHASE LEGEND
═══════════════════════════════════════════════════════════════ */
function buildPhaseLegend() {
  const c = document.getElementById('phase-pills-container');
  if (!c) return;
  Object.entries(PC).forEach(([phase, color]) => {
    const light = color === V.v8 || color === V.v9;
    const el = document.createElement('span');
    el.className = 'phase-pill';
    el.style.cssText = `background:${color};color:${light ? '#000' : '#fff'}`;
    el.innerHTML = `<span class="dot" style="background:${light ? '#000' : '#fff'}"></span>${phase.replace(/\d/g,'').toUpperCase()}`;
    c.appendChild(el);
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. SCROLLYTELLING MAP
═══════════════════════════════════════════════════════════════ */
let scrollMap     = null;
const scrollMkrs  = {};
let prevActiveId  = null;

function initScrollMap() {
  const el = document.getElementById('scroll-map-container');
  if (!el || typeof L === 'undefined') return;

  scrollMap = L.map('scroll-map-container', {
    center:[27, 50], zoom:5,
    zoomControl:false, scrollWheelZoom:false,
    dragging:false, touchZoom:false, doubleClickZoom:false, keyboard:false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:'&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
    subdomains:'abcd', maxZoom:14
  }).addTo(scrollMap);

  (crisisData.mapEvents || []).forEach(ev => {
    const color = PC[ev.phase] || V.v3;
    const m = L.circleMarker([ev.lat, ev.lng], {
      radius:5, fillColor:color,
      color:'rgba(255,255,255,0.35)', weight:1,
      fillOpacity:0.75, opacity:1
    }).bindPopup(
      `<div class="map-popup-date">${ev.date} · ${(ev.phase||'').toUpperCase()}</div>` +
      `<div class="map-popup-title">${ev.title}</div>` +
      `<div class="map-popup-body">${ev.body}</div>` +
      `<div class="map-popup-source">${ev.source}</div>`,
      { maxWidth:280 }
    ).addTo(scrollMap);
    scrollMkrs[ev.id] = { m, color };
  });
}

function activateMapStep(step) {
  if (!scrollMap) return;

  /* Reset previous */
  if (prevActiveId && scrollMkrs[prevActiveId]) {
    const p = scrollMkrs[prevActiveId];
    p.m.setRadius(5);
    p.m.setStyle({ fillOpacity:0.75, weight:1, color:'rgba(255,255,255,0.35)' });
  }

  /* Activate new */
  const ev = (crisisData.mapEvents || []).find(e => e.id === step.eventId);
  if (ev && scrollMkrs[ev.id]) {
    const cur = scrollMkrs[ev.id];
    cur.m.setRadius(12);
    cur.m.setStyle({ fillOpacity:1, weight:2.5, color:'#ffffff' });
    prevActiveId = ev.id;
  }

  /* Fly */
  if (step.flyTo && scrollMap) {
    scrollMap.flyTo(step.flyTo, step.zoom || 6, { animate:true, duration:1.1 });
  }
}

/* ═══════════════════════════════════════════════════════════════
   5. SCROLL STEPS — BUILD & OBSERVE
═══════════════════════════════════════════════════════════════ */
function buildScrollSteps() {
  const container = document.getElementById('scroll-steps-container');
  if (!container) return;

  (crisisData.scrollSteps || []).forEach((step, idx) => {
    const color = PC[step.phase] || V.v3;
    const isLight = color === V.v8 || color === V.v9;
    const el = document.createElement('div');
    el.className = 'scroll-step';
    el.dataset.idx = idx;
    el.style.borderLeftColor = color;
    el.innerHTML = `
      <div class="step-phase-date" style="color:${color}">
        ${step.date}&nbsp;&nbsp;·&nbsp;&nbsp;${(step.phase||'').toUpperCase()}
      </div>
      <h3 class="step-headline">${step.headline}</h3>
      <p class="step-narrative">${step.narrative}</p>
      <div class="step-metrics">
        <div class="step-metric-chip">🛢 Brent <strong>$${step.metric_brent}</strong>/bbl</div>
        <div class="step-metric-chip">🛢 Oman <strong>$${step.metric_oman}</strong>/bbl</div>
        ${step.metric_note ? `<div class="step-metric-chip"><em style="color:#888">${step.metric_note}</em></div>` : ''}
      </div>
      <p class="step-source">
        ${((crisisData.mapEvents||[]).find(e => e.id === step.eventId)||{}).source || ''}
      </p>`;
    container.appendChild(el);
  });
}

function initScrollytelling() {
  const steps = document.querySelectorAll('.scroll-step');
  if (!steps.length) return;

  const oDate     = document.getElementById('map-overlay-date');
  const oHeadline = document.getElementById('map-overlay-headline');
  const oBrent    = document.getElementById('map-overlay-brent');
  const oOman     = document.getElementById('map-overlay-oman');

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx  = +entry.target.dataset.idx;
      const step = (crisisData.scrollSteps || [])[idx];
      if (!step) return;

      steps.forEach(s => s.classList.remove('is-active'));
      entry.target.classList.add('is-active');
      activateMapStep(step);

      if (oDate)     oDate.textContent     = `${step.date} · ${(step.phase||'').toUpperCase()}`;
      if (oHeadline) oHeadline.textContent = step.headline;
      if (oBrent)    oBrent.textContent    = `$${step.metric_brent}`;
      if (oOman)     oOman.textContent     = `$${step.metric_oman}`;
    });
  }, { threshold:0.42, rootMargin:'-8% 0px -28% 0px' });

  steps.forEach(s => io.observe(s));
}

/* ═══════════════════════════════════════════════════════════════
   6. SANDBOX MAP
═══════════════════════════════════════════════════════════════ */
let sandboxMap       = null;
let hormuzMarker     = null;

function initSandboxMap() {
  const el = document.getElementById('sandbox-map-container');
  if (!el || typeof L === 'undefined') return;

  sandboxMap = L.map('sandbox-map-container', {
    center:[27, 53], zoom:5,
    zoomControl:true, scrollWheelZoom:false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:'&copy; <a href="https://openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
    subdomains:'abcd', maxZoom:14
  }).addTo(sandboxMap);

  /* All strike markers — always visible, always clickable */
  (crisisData.mapEvents || []).forEach(ev => {
    const color = PC[ev.phase] || V.v3;
    L.circleMarker([ev.lat, ev.lng], {
      radius:5, fillColor:color,
      color:'rgba(255,255,255,0.25)', weight:1, fillOpacity:0.7
    }).bindPopup(
      `<div class="map-popup-date">${ev.date} · ${(ev.phase||'').toUpperCase()}</div>` +
      `<div class="map-popup-title">${ev.title}</div>` +
      `<div class="map-popup-body">${ev.body}</div>`,
      { maxWidth:260 }
    ).addTo(sandboxMap);
  });

  /* Hormuz status indicator */
  hormuzMarker = L.circleMarker([26.34, 56.50], {
    radius:16, fillColor:V.v5,
    color:'#ffffff', weight:2, fillOpacity:0.85
  }).bindTooltip('Strait of Hormuz', { permanent:false, direction:'top' })
    .addTo(sandboxMap);
}

function updateSandboxMap(status) {
  if (!hormuzMarker) return;
  const c = { open:V.v5, closed:V.v9, blockaded:V.v2, threatened:V.v7, opening:V.v6 };
  hormuzMarker.setStyle({ fillColor: c[status] || V.v5 });
}

/* ═══════════════════════════════════════════════════════════════
   7. TIMELINE SLIDER
═══════════════════════════════════════════════════════════════ */
function closestByDay(arr, day, dateFn) {
  if (!arr || !arr.length) return null;
  return arr.reduce((best, cur) => {
    const bd = Math.abs(dateFn(best) - day);
    const cd = Math.abs(dateFn(cur)  - day);
    return cd < bd ? cur : best;
  });
}

function initSlider() {
  const slider = document.getElementById('crisis-slider');
  if (!slider) return;
  slider.addEventListener('input', () => updateSlider(+slider.value), { passive:true });
  updateSlider(0);
}

function updateSlider(day) {
  /* Derive data from closest data points */
  const oil = closestByDay(crisisData.oilPrices,       day, d => dayOf(d.date));
  const fx  = closestByDay(crisisData.fxReserves,      day, d => dayOf(d.date));
  const mar = closestByDay(crisisData.marinersStranded, day, d => dayOf(d.date));
  const ev  = (crisisData.events || []).filter(e => e.day <= day).slice(-1)[0]
           || (crisisData.events||[])[0];

  const status = getHormuzStatus(day);
  const label  = oil?.date || 'Feb 28';

  /* Date label + badge */
  const dEl = document.getElementById('slider-date-label');
  if (dEl) dEl.textContent = `📅 ${label} · Day ${day}`;

  const badge = document.getElementById('hormuz-badge');
  if (badge) {
    badge.textContent = `HORMUZ: ${status.toUpperCase()}`;
    badge.className   = `hormuz-badge ${['open','opening'].includes(status) ? 'open' : status === 'blockaded' ? 'blockaded' : 'closed'}`;
  }

  /* Stat cards */
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('stat-brent',   `$${(oil?.brent   ?? 74.2).toFixed(1)}`);
  set('stat-oman',    `$${(oil?.oman    ?? 73.8).toFixed(1)}`);
  set('stat-wti',     `$${(oil?.wti     ?? 70.1).toFixed(1)}`);
  set('stat-fx',      `$${(fx?.value    ?? 730).toFixed(1)}B`);
  set('stat-ships',   (mar?.ships    ?? 0).toLocaleString());
  set('stat-mariners',(mar?.mariners ?? 0).toLocaleString());

  /* Event card */
  const evH = document.getElementById('sandbox-event-headline');
  const evB = document.getElementById('sandbox-event-body');
  if (ev) {
    if (evH) evH.textContent = ev.headline || '—';
    if (evB) evB.textContent = ev.body || '—';
  }

  updateSandboxMap(status);
}

/* ═══════════════════════════════════════════════════════════════
   8. SANKEY DRAWING ENGINE (Custom SVG — no external lib)
═══════════════════════════════════════════════════════════════ */
function drawSankey(svgId, { nodes, links }, colHeaders = [], opts = {}) {
  const svgEl = document.getElementById(svgId);
  if (!svgEl) return;

  /* Dimensions */
  const W  = Math.max(svgEl.parentElement?.clientWidth || 0, 680);
  const H  = parseInt(svgEl.style.height) || 380;
  const PAD = { top:40, right:128, bottom:10, left:10 };
  const NW  = 14;   /* node width */
  const NG  = 9;    /* node gap */

  const numCols = Math.max(...nodes.map(n => n.col)) + 1;
  const iW = W - PAD.left - PAD.right;   /* inner width */
  const iH = H - PAD.top  - PAD.bottom;  /* inner height */
  const colSpan = iW / (numCols - 1);

  /* Compute incoming/outgoing totals per node */
  const nd = nodes.map((n, i) => ({ ...n, idx:i, inV:0, outV:0, val:0 }));
  links.forEach(lk => { nd[lk.source].outV += lk.value; nd[lk.target].inV += lk.value; });
  nd.forEach(n => {
    n.val = n.col === 0            ? n.outV
          : n.col === numCols - 1  ? n.inV
          : Math.max(n.inV, n.outV);
  });

  /* Group nodes by column, compute y-positions */
  const byCol = {};
  nd.forEach(n => (byCol[n.col] = byCol[n.col] || []).push(n));

  const pos = {};
  for (let c = 0; c < numCols; c++) {
    const cns  = byCol[c] || [];
    const tot  = cns.reduce((s, n) => s + n.val, 0) || 1;
    const usable = iH - NG * (cns.length - 1);
    const xBase  = c === numCols - 1
      ? PAD.left + iW - NW
      : PAD.left + c * colSpan;
    let y = PAD.top;
    cns.forEach(n => {
      const h = Math.max((n.val / tot) * usable, 8);
      pos[n.idx] = { x:xBase, y, h, midY: y + h / 2, color: n.color || '#555' };
      y += h + NG;
    });
  }

  /* Build SVG via DOM (ensures clean re-render) */
  const NS = 'http://www.w3.org/2000/svg';
  svgEl.innerHTML = '';
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.setAttribute('width', W);
  svgEl.setAttribute('height', H);

  /* Track stacking offsets per node */
  const srcOff = {}, tgtOff = {};
  nd.forEach(n => { srcOff[n.idx] = 0; tgtOff[n.idx] = 0; });

  /* ── LINKS ── */
  links.forEach(lk => {
    const s = pos[lk.source];
    const t = pos[lk.target];
    if (!s || !t) return;

    const sN  = nd[lk.source];
    const tN  = nd[lk.target];
    const sh  = (lk.value / (sN.outV || 1)) * s.h;
    const th  = (lk.value / (tN.inV  || 1)) * t.h;
    const x0  = s.x + NW;
    const y0  = s.y + srcOff[lk.source];
    const x1  = t.x;
    const y1  = t.y + tgtOff[lk.target];

    srcOff[lk.source] += sh;
    tgtOff[lk.target] += th;

    const cx = (x0 + x1) / 2;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d',
      `M${x0} ${y0} C${cx} ${y0},${cx} ${y1},${x1} ${y1}` +
      `L${x1} ${y1 + th} C${cx} ${y1 + th},${cx} ${y0 + sh},${x0} ${y0 + sh}Z`
    );
    path.setAttribute('fill', s.color);
    path.setAttribute('fill-opacity', '0.23');
    path.setAttribute('class', 'sankey-link');
    svgEl.appendChild(path);
  });

  /* ── NODES + LABELS ── */
  nodes.forEach((n, i) => {
    const p = pos[i];
    if (!p) return;

    /* Node rect */
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', p.x);   rect.setAttribute('y', p.y);
    rect.setAttribute('width', NW); rect.setAttribute('height', p.h);
    rect.setAttribute('fill', p.color); rect.setAttribute('rx', '2');
    svgEl.appendChild(rect);

    /* Label */
    const isLast = n.col === numCols - 1;
    const lx     = isLast ? p.x - 5 : p.x + NW + 5;
    const lines  = n.name.split('\n');
    const lh     = 11;
    const ly0    = p.midY - (lines.length - 1) * lh / 2 + 3;

    lines.forEach((line, li) => {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', lx);
      t.setAttribute('y', ly0 + li * lh);
      t.setAttribute('text-anchor', isLast ? 'end' : 'start');
      t.setAttribute('fill', '#aaaaaa');
      t.setAttribute('font-size', '9');
      t.setAttribute('font-family', "'Space Mono',monospace");
      t.textContent = line;
      svgEl.appendChild(t);
    });
  });

  /* ── COLUMN HEADERS ── */
  colHeaders.forEach((hdr, c) => {
    const isLast = c === numCols - 1;
    const xBase  = isLast
      ? PAD.left + iW - NW
      : PAD.left + c * colSpan;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', isLast ? xBase + NW : xBase);
    t.setAttribute('y', PAD.top - 14);
    t.setAttribute('text-anchor', isLast ? 'end' : 'start');
    t.setAttribute('fill', '#555555');
    t.setAttribute('font-size', '8.5');
    t.setAttribute('font-family', "'Space Mono',monospace");
    t.setAttribute('font-weight', '700');
    t.setAttribute('letter-spacing', '1');
    t.textContent = hdr.toUpperCase();
    svgEl.appendChild(t);
  });

  /* ── OPTIONAL BLOCKED LABEL (Global Sankey) ── */
  if (opts.blocked) {
    const bx = PAD.left + colSpan + 4;
    const by = PAD.top - 2;
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x', bx - 3); bg.setAttribute('y', by - 13);
    bg.setAttribute('width', 126); bg.setAttribute('height', 16);
    bg.setAttribute('fill', '#2a0808'); bg.setAttribute('rx', '2');
    svgEl.appendChild(bg);
    const bt = document.createElementNS(NS, 'text');
    bt.setAttribute('x', bx); bt.setAttribute('y', by);
    bt.setAttribute('fill', '#fde725'); bt.setAttribute('font-size', '8');
    bt.setAttribute('font-family', "'Space Mono',monospace");
    bt.setAttribute('font-weight', '700');
    bt.textContent = 'BLOCKED Mar 1 – present';
    svgEl.appendChild(bt);
  }
}

/* ═══════════════════════════════════════════════════════════════
   9. SANKEY RENDERS
═══════════════════════════════════════════════════════════════ */
let currentSankeyMode = 'normal';

function renderSankeyIndia(mode) {
  currentSankeyMode = mode;
  const d = crisisData.sankeyIndia;
  if (!d) return;

  let { nodes, links } = d;

  if (mode === 'crisis') {
    /* Crisis routing: Hormuz blocked, Russia/Non-Hormuz surges */
    links = d.links.map(lk => {
      const l = { ...lk };
      if (lk.target === 6) l.value = Math.max(Math.floor(lk.value * 0.35), 1); // Via Hormuz shrinks 65%
      if (lk.target === 7 && lk.source === 1) l.value = lk.value + 8;           // Russia surge
      if (lk.target === 7 && lk.source === 5) l.value = lk.value + 10;          // Other Non-Hormuz surge
      return l;
    });

    /* Update route node labels for crisis view */
    nodes = d.nodes.map(n => {
      if (n.name === 'Via Hormuz 56%') return { ...n, name:'Via Hormuz\n~20%', color:'#c0392b' };
      if (n.name === 'Non-Hormuz 44%') return { ...n, name:'Non-Hormuz\n~80%', color:'#2e86ab' };
      return n;
    });
  }

  drawSankey('sankey-india-svg', { nodes, links },
    ['SOURCE', 'ROUTE', 'COMMODITY', 'DESTINATION']);

  const nb = document.getElementById('sankey-india-normal-btn');
  const cb = document.getElementById('sankey-india-crisis-btn');
  if (nb) { nb.classList.toggle('active', mode === 'normal'); }
  if (cb) { cb.classList.toggle('active', mode === 'crisis'); }
}

function renderSankeyGlobal() {
  const d = crisisData.sankeyGlobal;
  if (!d) return;
  drawSankey('sankey-global-svg', d,
    ['ORIGIN', 'STRAIT / ROUTE', 'DESTINATION'],
    { blocked: true });
}

/* ═══════════════════════════════════════════════════════════════
   10. CHART.JS CHARTS
═══════════════════════════════════════════════════════════════ */

/* ── 1. Oil Prices — Full Timeline ── */
function initOilChart() {
  const ctx = document.getElementById('chart-oil-prices');
  if (!ctx) return;
  const D = crisisData.oilPrices;
  new Chart(ctx, {
    type:'line',
    data:{
      labels: D.map(d => d.date),
      datasets:[
        { label:'Brent', data:D.map(d=>d.brent), borderColor:V.v3, backgroundColor:'transparent',
          borderWidth:2.5, pointRadius:2, pointHoverRadius:5, tension:0.4 },
        { label:'WTI',   data:D.map(d=>d.wti),   borderColor:V.v5, backgroundColor:'transparent',
          borderWidth:2,   pointRadius:1, pointHoverRadius:4, tension:0.4 },
        { label:'Oman/DME', data:D.map(d=>d.oman), borderColor:V.v9, backgroundColor:V.v9+'12',
          fill:true, borderWidth:3, borderDash:[6,3], pointRadius:2, pointHoverRadius:5, tension:0.4 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{ label:c=>` ${c.dataset.label}: $${c.parsed.y.toFixed(2)}/bbl` }},
        legend:{ labels:{ color:'#666', boxWidth:22, padding:16 }}
      },
      scales:{
        x: mkScale({ ticks:{ color:'#444', maxRotation:50, font:{ size:9 }}}),
        y: mkScale({ min:60, max:180, title:{ display:true, text:'USD/bbl', color:'#444', font:{ size:10 }}})
      }
    }
  });
}

/* ── 2. Sandbox Oil Chart ── */
function initSandboxOilChart() {
  const ctx = document.getElementById('chart-sandbox-oil');
  if (!ctx) return;
  const D = crisisData.oilPrices;
  new Chart(ctx, {
    type:'line',
    data:{
      labels: D.map(d => d.date),
      datasets:[
        { label:'Brent', data:D.map(d=>d.brent), borderColor:V.v3, borderWidth:2, pointRadius:0, tension:0.4, backgroundColor:'transparent' },
        { label:'WTI',   data:D.map(d=>d.wti),   borderColor:V.v5, borderWidth:1.5, pointRadius:0, tension:0.4, backgroundColor:'transparent' },
        { label:'Oman',  data:D.map(d=>d.oman),  borderColor:V.v9, borderWidth:2.5, pointRadius:0, tension:0.4, backgroundColor:V.v9+'10', fill:true }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{ label:c=>` ${c.dataset.label}: $${c.parsed.y.toFixed(2)}` }},
        legend:{ labels:{ color:'#555', boxWidth:16, font:{ size:9 }}}
      },
      scales:{
        x: mkScale({ ticks:{ color:'#444', maxRotation:45, font:{ size:8 }}}),
        y: mkScale({ min:60, max:180 })
      }
    }
  });
}

/* ── 3. Hormuz Daily Transit Bar ── */
function initHormuzBar() {
  const ctx = document.getElementById('chart-hormuz-bar');
  if (!ctx) return;
  const D = crisisData.hormuzDailyBar;
  const COLOR = { baseline:V.v3, permitted:V.v5, restricted:V.v7, zero:V.v0 };
  new Chart(ctx, {
    type:'bar',
    data:{
      labels: D.map(d => d.label),
      datasets:[{
        label:'Tanker transits/day',
        data:  D.map(d => d.transits),
        backgroundColor: D.map(d => (COLOR[d.type] || V.v3) + 'dd'),
        borderColor:     D.map(d => COLOR[d.type] || V.v3),
        borderWidth:1, borderRadius:2, borderSkipped:false
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{
          title: c => `${D[c[0].dataIndex].date} (${D[c[0].dataIndex].type})`,
          label: c => ` ${c.parsed.y} transits/day`,
          afterLabel: c => `\n${D[c[0].dataIndex].note}`,
          footer: c => `Source: ${D[c[0].dataIndex].source}`
        }},
        legend:{ display:false }
      },
      scales:{
        x: mkScale({ ticks:{ color:'#444', font:{ size:9 }}}),
        y: mkScale({ min:0, max:90,
          title:{ display:true, text:'Transits/day', color:'#444', font:{ size:10 }},
          grid:{ color:'#1a1a1a' }
        })
      }
    }
  });
}

/* ── 4. FX Reserves ── */
function initFXReserves() {
  const ctx = document.getElementById('chart-fx-reserves');
  if (!ctx) return;
  const D = crisisData.fxReserves;
  const labels = D.map(d => d.date.replace(', 2026','').replace(', 2025',''));
  new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'FX Reserves (USD Bn)',
        data: D.map(d => d.value),
        borderColor:V.v2, backgroundColor:V.v2+'28',
        fill:true, borderWidth:2.5, pointRadius:4, pointHoverRadius:7, tension:0.3
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{
          label:c => ` $${c.parsed.y.toFixed(1)}B`,
          footer:c => D[c[0].dataIndex]?.note || ''
        }},
        legend:{ display:false }
      },
      scales:{
        x: mkScale({ ticks:{ maxRotation:45, font:{ size:9 }}}),
        y: mkScale({ min:690, max:735,
          title:{ display:true, text:'USD Billion', color:'#444', font:{ size:10 }}
        })
      }
    }
  });
}

/* ── 5. FX Rate (USD/INR) ── */
function initFXRate() {
  const ctx = document.getElementById('chart-fx-rate');
  if (!ctx) return;
  const D = crisisData.fxRates;
  new Chart(ctx, {
    type:'line',
    data:{
      labels: D.map(d => d.date),
      datasets:[{
        label:'USD/INR (₹ per $1)',
        data:  D.map(d => d.usdinr),
        borderColor:V.v8, backgroundColor:V.v8+'18',
        fill:true, borderWidth:2.5, pointRadius:4, tension:0.3
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{ label:c => ` ₹${c.parsed.y.toFixed(2)} per $1` }},
        legend:{ display:false }
      },
      scales:{
        x: mkScale({ ticks:{ maxRotation:45, font:{ size:9 }}}),
        y: mkScale({ min:85, max:95,
          title:{ display:true, text:'₹ per $1', color:'#444', font:{ size:10 }}
        })
      }
    }
  });
}

/* ── 6. CAD Sensitivity Bar Chart ── */
function initCAD() {
  const ctx = document.getElementById('chart-cad');
  if (!ctx) return;
  const D = crisisData.cadScenarios;
  new Chart(ctx, {
    type:'bar',
    data:{
      labels: D.map(d => d.label.split('\n')[0]),   /* first line only for axis */
      datasets:[{
        label:'Current Account Deficit (% of GDP)',
        data:  D.map(d => d.cad),
        backgroundColor: D.map(d => d.color + 'cc'),
        borderColor:     D.map(d => d.color),
        borderWidth:1.5, borderRadius:4, borderSkipped:false
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{
          title:  c => D[c[0].dataIndex].label.replace('\n',' '),
          label:  c => ` CAD: ${c.parsed.y.toFixed(1)}% of GDP`,
          footer: c => `Oil assumption: $${D[c[0].dataIndex].oil}/bbl\nGDP: ${D[c[0].dataIndex].gdp}%\n${D[c[0].dataIndex].note||''}`
        }},
        legend:{ display:false }
      },
      scales:{
        x: mkScale({ ticks:{ color:'#555', font:{ size:9 }, maxRotation:0 }}),
        y: mkScale({ min:-3.2, max:0.3,
          title:{ display:true, text:'% of GDP', color:'#444', font:{ size:10 }}
        })
      }
    }
  });
}

/* ── 7. War Risk Premium ── */
function initWarRisk() {
  const ctx = document.getElementById('chart-war-risk');
  if (!ctx) return;
  const D = crisisData.warRiskPremium;
  new Chart(ctx, {
    type:'line',
    data:{
      labels: D.map(d => d.date),
      datasets:[{
        label:'War Risk Premium (% vessel value/voyage)',
        data:  D.map(d => d.pct),
        borderColor:V.v9, backgroundColor:V.v9+'1a',
        fill:true, borderWidth:2.5, pointRadius:5, pointHoverRadius:8, tension:0.25
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{
          label:  c => ` ${c.parsed.y.toFixed(2)}% of vessel value`,
          footer: c => D[c[0].dataIndex]?.note || ''
        }},
        legend:{ display:false }
      },
      scales:{
        x: mkScale({ ticks:{ maxRotation:40, font:{ size:9 }}}),
        y: mkScale({ min:0, max:0.85,
          title:{ display:true, text:'% of vessel value', color:'#444', font:{ size:10 }}
        })
      }
    }
  });
}

/* ── 8. Mariners Stranded — Full Section ── */
function initMariners() {
  const ctx = document.getElementById('chart-mariners');
  if (!ctx) return;
  const D = crisisData.marinersStranded;
  new Chart(ctx, {
    type:'line',
    data:{
      labels: D.map(d => d.date),
      datasets:[
        { label:'Mariners Stranded', data:D.map(d=>d.mariners),
          borderColor:V.v9, backgroundColor:V.v9+'1e',
          fill:true, borderWidth:2.5, pointRadius:5, tension:0.3, yAxisID:'y' },
        { label:'Vessels Stranded', data:D.map(d=>d.ships),
          borderColor:V.v4, backgroundColor:'transparent',
          borderDash:[5,3], borderWidth:2, pointRadius:4, tension:0.3, yAxisID:'y1' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP },
        legend:{ labels:{ color:'#666', boxWidth:20 }}
      },
      scales:{
        x:  mkScale(),
        y:  mkScale({ min:0, max:25000, position:'left',
          title:{ display:true, text:'Mariners stranded', color:'#444', font:{ size:10 }}}),
        y1: mkScale({ min:0, max:2200,  position:'right',
          title:{ display:true, text:'Vessels stranded', color:'#444', font:{ size:10 }},
          grid:{ drawOnChartArea:false }})
      }
    }
  });
}

/* ── 8b. Mariners — Compact Sandbox ── */
function initMarinersSb() {
  const ctx = document.getElementById('chart-mariners-sb');
  if (!ctx) return;
  const D = crisisData.marinersStranded;
  new Chart(ctx, {
    type:'line',
    data:{
      labels: D.map(d => d.date),
      datasets:[
        { label:'Mariners', data:D.map(d=>d.mariners), borderColor:V.v9, backgroundColor:V.v9+'15', fill:true, borderWidth:2, pointRadius:0, tension:0.3 },
        { label:'Vessels',  data:D.map(d=>d.ships),    borderColor:V.v4, backgroundColor:'transparent', borderDash:[4,3], borderWidth:1.5, pointRadius:0, tension:0.3, yAxisID:'y1' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP },
        legend:{ labels:{ color:'#555', boxWidth:12, font:{ size:9 }}}
      },
      scales:{
        x:  mkScale({ ticks:{ font:{ size:8 }, maxRotation:30 }}),
        y:  mkScale({ min:0, max:25000 }),
        y1: mkScale({ min:0, max:2200, position:'right', grid:{ drawOnChartArea:false }})
      }
    }
  });
}

/* ── 9. CAD Widening — Horizontal Stacked Bar ── */
function initCADWidening() {
  const ctx = document.getElementById('chart-cad-widening');
  if (!ctx) return;
  const D = [...crisisData.embiExpanded].sort((a, b) => a.totalCAD - b.totalCAD);
  new Chart(ctx, {
    type:'bar',
    data:{
      labels: D.map(d => d.country),
      datasets:[
        { label:'Pre-conflict CAD (% GDP)',
          data:  D.map(d => d.preCAD),
          backgroundColor: V.v2+'bb', borderWidth:0, stack:'cad', borderRadius:2 },
        { label:'Additional oil shock',
          data:  D.map(d => Math.min(d.oilShock, 0)),
          backgroundColor: V.v8+'bb', borderWidth:0, stack:'cad', borderRadius:2 }
      ]
    },
    options:{
      indexAxis:'y',
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{
          label:  c => ` ${c.dataset.label}: ${c.parsed.x.toFixed(1)}% of GDP`,
          footer: c => `Rating: ${D[c[0].dataIndex].rating} | Source: ${D[c[0].dataIndex].source}`
        }},
        legend:{ labels:{ color:'#666', boxWidth:14 }}
      },
      scales:{
        x: mkScale({ min:-8, max:0.5,
          title:{ display:true, text:'% of GDP', color:'#444', font:{ size:10 }}}),
        y: mkScale({ ticks:{ font:{ size:10 }}})
      }
    }
  });
}

/* ── 10. EMBI Spreads — Grouped Bar ── */
function initEMBI() {
  const ctx = document.getElementById('chart-embi');
  if (!ctx) return;
  const D = [...crisisData.embiExpanded].sort((a, b) => b.embi_post - a.embi_post);
  new Chart(ctx, {
    type:'bar',
    data:{
      labels: D.map(d => d.country),
      datasets:[
        { label:'Pre-conflict spread',
          data:  D.map(d => d.embi_pre),
          backgroundColor: V.v3+'bb', borderRadius:2, borderSkipped:false },
        { label:'Post-shock estimate',
          data:  D.map(d => d.embi_post),
          backgroundColor: V.v9+'bb', borderRadius:2, borderSkipped:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{
          label:  c => ` ${c.dataset.label}: ${c.parsed.y} bps`,
          footer: c => `Rating: ${D[c[0].dataIndex].rating}`
        }},
        legend:{ labels:{ color:'#666', boxWidth:14 }}
      },
      scales:{
        x: mkScale({ ticks:{ maxRotation:40, font:{ size:9 }}}),
        y: mkScale({ min:0,
          title:{ display:true, text:'Basis points (bps)', color:'#444', font:{ size:10 }}
        })
      }
    }
  });
}

/* ── 11. State Remittances Bar ── */
function initStateBars() {
  const ctx = document.getElementById('chart-state-bars');
  if (!ctx) return;
  const D = crisisData.remittancesStateShare;
  new Chart(ctx, {
    type:'bar',
    data:{
      labels: D.map(d => d.state),
      datasets:[{
        label:'% of total India remittances',
        data:  D.map(d => d.pct),
        backgroundColor: D.map(d => d.color + 'cc'),
        borderColor:     D.map(d => d.color),
        borderWidth:1.5, borderRadius:3, borderSkipped:false
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{
          label:  c => ` ${c.parsed.y.toFixed(1)}% of total`,
          footer: c => `USD $${D[c[0].dataIndex].usd_bn?.toFixed(1) || '?'}B${D[c[0].dataIndex].note ? '\n'+D[c[0].dataIndex].note : ''}`
        }},
        legend:{ display:false }
      },
      scales:{
        x: mkScale({ ticks:{ maxRotation:45, font:{ size:9 }}}),
        y: mkScale({ min:0, max:24,
          title:{ display:true, text:'% of total', color:'#444', font:{ size:10 }}
        })
      }
    }
  });
}

/* ── 12. Remittances Trend Line ── */
function initRemittancesTrend() {
  const ctx = document.getElementById('chart-rem-trend');
  if (!ctx) return;
  const D = crisisData.remittancesTrend;
  new Chart(ctx, {
    type:'line',
    data:{
      labels: D.map(d => d.fy),
      datasets:[
        { label:'Total Remittances (USD Bn)',
          data:  D.map(d => d.total),
          borderColor:V.v5, backgroundColor:V.v5+'22',
          fill:true, borderWidth:2.5, pointRadius:5, tension:0.3 },
        { label:'GCC Share (USD Bn)',
          data:  D.map(d => d.gcc),
          borderColor:V.v9, backgroundColor:'transparent',
          borderDash:[5,3], borderWidth:2, pointRadius:5, tension:0.3 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        tooltip:{ ...TIP, callbacks:{
          label:  c => ` ${c.dataset.label}: $${c.parsed.y.toFixed(1)}B`,
          footer: c => D[c[0].dataIndex]?.note || ''
        }},
        legend:{ labels:{ color:'#666', boxWidth:20 }}
      },
      scales:{
        x: mkScale({ ticks:{ maxRotation:40, font:{ size:9 }}}),
        y: mkScale({ min:0, max:145,
          title:{ display:true, text:'USD Billion', color:'#444', font:{ size:10 }}
        })
      }
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   11. GEOPOLITICAL COST TABLE
═══════════════════════════════════════════════════════════════ */
const NET_CLS = {
  'Catastrophic':'net-catastrophic', 'Severe':'net-severe',
  'Tactical gain':'net-mixed',       'Net gain':'net-gain',
  'High exposure':'net-exposure',    'Mixed':'net-mixed',
  'Severe economic':'net-severe',    'Critical':'net-catastrophic',
  'Moderate':'net-moderate'
};

function buildGeoTable() {
  const tbody = document.getElementById('geo-table-body');
  if (!tbody) return;
  (crisisData.geopoliticalCosts || []).forEach(row => {
    const cls = NET_CLS[row.net] || 'net-moderate';
    const tr  = document.createElement('tr');
    tr.innerHTML =
      `<td class="country-cell">${row.country}</td>` +
      `<td><span class="role-badge">${row.role}</span></td>` +
      `<td style="max-width:420px;font-size:12px;color:#888;line-height:1.5">${row.cost}</td>` +
      `<td><span class="net-badge ${cls}">${row.net}</span></td>`;
    tbody.appendChild(tr);
  });
}

/* ═══════════════════════════════════════════════════════════════
   12. RESIZE — RE-RENDER SANKEYS ON WINDOW RESIZE
═══════════════════════════════════════════════════════════════ */
let _rsTimer;
window.addEventListener('resize', () => {
  clearTimeout(_rsTimer);
  _rsTimer = setTimeout(() => {
    renderSankeyIndia(currentSankeyMode);
    renderSankeyGlobal();
    if (scrollMap)  scrollMap.invalidateSize();
    if (sandboxMap) sandboxMap.invalidateSize();
  }, 220);
}, { passive:true });

/* ═══════════════════════════════════════════════════════════════
   MAIN INIT
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Core UI */
  initProgressBar();
  buildPhaseLegend();

  /* Maps */
  initScrollMap();
  initSandboxMap();

  /* Scrollytelling — build steps, then observe after layout */
  buildScrollSteps();
  requestAnimationFrame(() => requestAnimationFrame(initScrollytelling));

  /* Slider */
  initSlider();

  /* Sankey toggle buttons */
  document.getElementById('sankey-india-normal-btn')
    ?.addEventListener('click', () => renderSankeyIndia('normal'));
  document.getElementById('sankey-india-crisis-btn')
    ?.addEventListener('click', () => renderSankeyIndia('crisis'));

  /* Sankeys — small delay so container widths are computed */
  setTimeout(() => {
    renderSankeyIndia('normal');
    renderSankeyGlobal();
  }, 100);

  /* All Chart.js charts */
  initOilChart();
  initSandboxOilChart();
  initHormuzBar();
  initFXReserves();
  initFXRate();
  initCAD();
  initWarRisk();
  initMariners();
  initMarinersSb();
  initCADWidening();
  initEMBI();
  initStateBars();
  initRemittancesTrend();

  /* Table */
  buildGeoTable();

  /* Prime first scroll step */
  const firstStep = document.querySelector('.scroll-step');
  if (firstStep && crisisData.scrollSteps?.length) {
    firstStep.classList.add('is-active');
    activateMapStep(crisisData.scrollSteps[0]);
  }

});
