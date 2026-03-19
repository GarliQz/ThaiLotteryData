/**
 * generate-static.ts
 * Reads data/all.csv and generates heatmap-static.html — a fully self-contained
 * heatmap visualization that works by opening directly in any browser (no server needed).
 *
 * Usage:
 *   ./generate-static.sh
 *   — or —
 *   npx tsx generate-static.ts
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Paths ────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const CSV_PATH = join(__dir, 'data', 'all.csv');
const OUTPUT_PATH = join(__dir, 'heatmap-static.html');

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  }).filter(r => r['date']);
}

function parseNums(val: string): string[] {
  if (!val) return [];
  return val.split('|').map(s => s.trim()).filter(Boolean);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface NumberEntry { dates: string[]; }
interface TypeData { [num: string]: NumberEntry; }
interface LotteryDataset {
  last3f: TypeData;
  last3b: TypeData;
  last2: TypeData;
  allDates: string[];
}

// ─── Build dataset ────────────────────────────────────────────────────────────
function buildDataset(rows: Record<string, string>[]): LotteryDataset {
  const ds: LotteryDataset = { last3f: {}, last3b: {}, last2: {}, allDates: [] };
  const dateSet = new Set<string>();

  const TYPES = [
    { field: 'last3f-value', key: 'last3f' as const, pad: 3 },
    { field: 'last3b-value', key: 'last3b' as const, pad: 3 },
    { field: 'last2-value', key: 'last2' as const, pad: 2 },
  ] as const;

  for (const row of rows) {
    const date = row['date'];
    if (!date) continue;
    dateSet.add(date);

    for (const { field, key, pad } of TYPES) {
      for (const n of parseNums(row[field])) {
        const num = n.padStart(pad, '0');
        if (!ds[key][num]) ds[key][num] = { dates: [] };
        ds[key][num].dates.push(date);
      }
    }
  }

  ds.allDates = Array.from(dateSet).sort();
  return ds;
}

// ─── HTML ─────────────────────────────────────────────────────────────────────
function buildHTML(ds: LotteryDataset): string {
  const dataJson = JSON.stringify(ds);
  const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const drawCount = ds.allDates.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Thai Lottery Heatmap</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    /* ── Design tokens — dark (default) ── */
    :root {
      --bg:      #0d1117;
      --surface: #161b22;
      --surface2:#21262d;
      --border:  #30363d;
      --text:    #e6edf3;
      --muted:   #7d8590;
      --accent:  #f78166;
      --green:   #56d364;
      --blue:    #58a6ff;
      --purple:  #bc8cff;
      --radius:  12px;
      --max-w:   1400px;
      /* nb hover/active hard-coded colours become variables */
      --nb-hover-bg: #1a2942;
      --nb-hover-border: var(--blue);
      --nb-active-bg: #2d1a1a;
      --row-hover-bg: #1a2942;
      --row-hl-bg: #2d1a1a;
      --tip-bg: #1c2128;
      --close-hover-bg: #2d1a1a;
      color-scheme: dark;
    }

    /* ── Light theme ── */
    :root[data-theme="light"] {
      --bg:      #f6f8fa;
      --surface: #ffffff;
      --surface2:#f0f3f6;
      --border:  #d0d7de;
      --text:    #1f2328;
      --muted:   #57606a;
      --accent:  #cf222e;
      --green:   #1a7f37;
      --blue:    #0969da;
      --purple:  #8250df;
      --nb-hover-bg: #dbeafe;
      --nb-hover-border: var(--blue);
      --nb-active-bg: #fde8ea;
      --row-hover-bg: #dbeafe;
      --row-hl-bg: #fde8ea;
      --tip-bg: #ffffff;
      --close-hover-bg: #fde8ea;
      color-scheme: light;
    }

    /* ── System theme: respect OS preference when theme=system ── */
    @media (prefers-color-scheme: light) {
      :root[data-theme="system"] {
        --bg:      #f6f8fa;
        --surface: #ffffff;
        --surface2:#f0f3f6;
        --border:  #d0d7de;
        --text:    #1f2328;
        --muted:   #57606a;
        --accent:  #cf222e;
        --green:   #1a7f37;
        --blue:    #0969da;
        --purple:  #8250df;
        --nb-hover-bg: #dbeafe;
        --nb-hover-border: var(--blue);
        --nb-active-bg: #fde8ea;
        --row-hover-bg: #dbeafe;
        --row-hl-bg: #fde8ea;
        --tip-bg: #ffffff;
        --close-hover-bg: #fde8ea;
        color-scheme: light;
      }
    }

    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 0 16px 32px;
    }

    /* ── Centered container ── */
    .container {
      max-width: var(--max-w);
      margin: 0 auto;
      width: 100%;
    }

    /* ── Header ── */
    header {
      padding: 20px 0 16px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    header h1 {
      font-size: clamp(18px, 3vw, 26px);
      font-weight: 700;
      background: linear-gradient(135deg, #f78166, #bc8cff, #58a6ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -.5px;
    }
    .gen-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
    }
    .gen-badge b { color: var(--green); font-weight: 600; }

    /* ── Controls ── */
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 16px;
    }

    .tabs, .view-toggle {
      display: flex;
      gap: 3px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 3px;
      flex-shrink: 0;
    }
    .tab, .vtab {
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all .18s;
      white-space: nowrap;
      padding: 5px 13px;
    }
    .tab.active  { background: var(--accent); color: #fff; }
    .vtab.active { background: var(--blue);   color: #fff; }
    .tab:hover:not(.active),
    .vtab:hover:not(.active) { background: var(--surface2); color: var(--text); }

    .filter-group { display: flex; align-items: center; gap: 6px; }
    label { font-size: 12px; color: var(--muted); white-space: nowrap; }
    select, input[type=text] {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      transition: border-color .18s;
    }
    select:focus, input[type=text]:focus { border-color: var(--blue); }

    /* ── Stats bar ── */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 16px;
    }
    .stat-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; }
    .stat-value { font-size: 22px; font-weight: 700; margin-top: 2px; line-height: 1.1; }

    /* ── Main layout: side-by-side on wide, stacked on mobile ── */
    .main-layout {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: 12px;
      align-items: start;
    }

    /* ── Number list panel ── */
    .num-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .num-panel-head {
      padding: 9px 13px;
      border-bottom: 1px solid var(--border);
      background: var(--surface2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .num-panel-head h3 { font-size: 11px; font-weight: 600; color: var(--text); }
    .num-panel-toggle {
      display: none; /* shown on mobile */
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0 2px;
    }
    .panel-search-wrap { padding: 6px 6px 0; }
    .panel-search {
      width: 100%;
      padding: 5px 9px;
      font-size: 11px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      outline: none;
      font-family: inherit;
    }
    .panel-search:focus { border-color: var(--blue); }
    .num-panel-body {
      overflow-y: auto;
      max-height: calc(100vh - 320px);
      min-height: 120px;
      padding: 6px;
      transition: max-height .25s ease;
    }
    .num-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3px;
    }
    .nb {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5px 2px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: var(--surface2);
      cursor: pointer;
      font-family: inherit;
      transition: all .13s;
      min-width: 0;
    }
    .nb:hover  { border-color: var(--nb-hover-border); background: var(--nb-hover-bg); }
    .nb.active { border-color: var(--accent); background: var(--nb-active-bg); }
    .nb-n { font-size: 10px; font-weight: 600; color: var(--text); line-height: 1; }
    .nb-c { font-size: 9px;  color: var(--muted); margin-top: 2px; line-height: 1; }
    .nb.hot  .nb-n { color: var(--green); }
    .nb.warm .nb-n { color: var(--accent); }

    /* ── Heatmap ── */
    .heatmap-wrap {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      min-width: 0;
    }
    .heatmap-scroll { overflow: auto; max-height: calc(100vh - 310px); }
    table { border-collapse: separate; border-spacing: 0; font-size: 11px; min-width: max-content; }
    table thead { position: sticky; top: 0; z-index: 10; }
    table thead th {
      background: var(--surface2);
      padding: 6px 8px;
      text-align: center;
      color: var(--muted);
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    table thead th:first-child {
      min-width: 52px;
      position: sticky;
      left: 0;
      z-index: 20;
      border-right: 1px solid var(--border);
    }
    table tbody tr th {
      position: sticky;
      left: 0;
      z-index: 5;
      background: var(--surface);
      padding: 2px 8px;
      text-align: center;
      color: var(--muted);
      font-weight: 500;
      border-right: 1px solid var(--border);
      white-space: nowrap;
      min-width: 52px;
      cursor: pointer;
      transition: background .13s, color .13s;
    }
    table tbody tr th:hover              { color: var(--blue); background: var(--row-hover-bg); }
    table tbody tr.hl th                 { color: var(--accent); background: var(--row-hl-bg) !important; }
    table tbody td {
      width: 26px; height: 18px;
      cursor: pointer;
      transition: transform .1s, outline .1s;
      position: relative;
    }
    table tbody td:hover { outline: 2px solid rgba(128,128,128,.3); outline-offset: -1px; transform: scale(1.25); z-index: 2; }
    table tbody td.z { background: var(--surface); }
    table tbody tr.hl td { filter: brightness(1.35); }

    /* ── Legend ── */
    .legend {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-top: 1px solid var(--border);
      font-size: 11px;
      color: var(--muted);
    }
    .l-scale { display: flex; gap: 3px; }
    .l-sw { width: 15px; height: 11px; border-radius: 2px; }

    /* ── Tooltip ── */
    #tip {
      position: fixed;
      pointer-events: none;
      background: var(--tip-bg);
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 9px 13px;
      font-size: 12px;
      z-index: 1000;
      display: none;
      box-shadow: 0 8px 24px rgba(0,0,0,.5);
      max-width: 200px;
    }
    #tip strong { color: var(--text); display: block; font-size: 13px; margin-bottom: 3px; }
    .tr { display: flex; justify-content: space-between; gap: 12px; color: var(--muted); margin-top: 2px; }
    .tr span:last-child { color: var(--text); font-weight: 600; }

    /* ── Modal ── */
    #overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.65);
      z-index: 500;
      backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    #overlay.open { display: flex; }
    #modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      width: min(620px, 100%);
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,.75);
      animation: up .2s ease;
    }
    @keyframes up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    .m-head {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;
    }
    .m-title { display: flex; align-items: center; gap: 12px; }
    .m-num { font-size: 28px; font-weight: 800; color: var(--green); letter-spacing: -1px; }
    .m-meta { font-size: 12px; color: var(--muted); line-height: 1.7; }
    .m-meta strong { color: var(--text); }
    .m-close {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      width: 32px; height: 32px;
      cursor: pointer;
      color: var(--muted);
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .15s;
      flex-shrink: 0;
    }
    .m-close:hover { background: var(--close-hover-bg); border-color: var(--accent); color: var(--accent); }
    .m-body { overflow-y: auto; padding: 16px 20px; flex: 1; }
    .yr-group { margin-bottom: 18px; }
    .yr-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .8px;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid var(--border);
    }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px;
      color: var(--text);
      cursor: default;
      transition: all .13s;
    }
    .chip:hover { border-color: var(--green); color: var(--green); }
    .m-empty { text-align: center; color: var(--muted); padding: 40px 20px; font-size: 13px; }

    /* ── Responsive breakpoints ── */

    /* Tablet: collapse number panel to compact grid */
    @media (max-width: 900px) {
      .main-layout {
        grid-template-columns: 1fr;
      }
      .num-panel {
        order: 2;
      }
      .heatmap-wrap {
        order: 1;
      }
      .num-panel-toggle { display: flex; }
      .num-panel-body.collapsed {
        max-height: 0 !important;
        overflow: hidden;
        padding: 0 6px;
      }
      .num-panel-body { max-height: 220px; }
      .heatmap-scroll { max-height: 55vh; }
    }

    /* Mobile: tighter padding and font sizes */
    @media (max-width: 600px) {
      body { padding: 0 10px 24px; }
      .stat-value { font-size: 18px; }
      .tab, .vtab { padding: 5px 9px; font-size: 11px; }
      .controls { gap: 6px; }
      header h1 { font-size: 18px; }
    }

    /* ── Theme toggle ── */
    .theme-toggle {
      display: flex;
      gap: 2px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 3px;
      flex-shrink: 0;
    }
    .theme-btn {
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all .18s;
      white-space: nowrap;
      padding: 4px 10px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .theme-btn.active { background: var(--surface2); color: var(--text); }
    .theme-btn:hover:not(.active) { background: var(--surface2); color: var(--text); opacity: .8; }
  </style>
</head>
<body>
  <div class="container">

    <header>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h1>🎰 Thai Lottery Heatmap</h1>
        <span class="gen-badge">⚡ Static &nbsp;·&nbsp; <b>${drawCount} draws · ${genDate}</b></span>
      </div>
      <div class="theme-toggle" role="group" aria-label="Color theme">
        <button class="theme-btn" id="theme-dark"   onclick="setTheme('dark')">🌙 Dark</button>
        <button class="theme-btn" id="theme-light"  onclick="setTheme('light')">☀️ Light</button>
        <button class="theme-btn" id="theme-system" onclick="setTheme('system')">🖥 System</button>
      </div>
    </header>

    <div class="controls">
      <div class="tabs" role="tablist">
        <button class="tab active" onclick="switchType('last3f')" id="tab-last3f">3 ตัวหน้า</button>
        <button class="tab" onclick="switchType('last3b')" id="tab-last3b">3 ตัวหลัง</button>
        <button class="tab" onclick="switchType('last2')"  id="tab-last2">2 ตัวท้าย</button>
      </div>
      <div class="view-toggle">
        <button class="vtab active" id="vtab-month" onclick="switchView('month')">By Month</button>
        <button class="vtab"        id="vtab-year"  onclick="switchView('year')">By Year</button>
      </div>
      <div class="filter-group">
        <label>Year</label>
        <select id="year-filter" onchange="render()"><option value="all">All Years</option></select>
      </div>
      <div class="filter-group">
        <label>Search</label>
        <input type="text" id="number-search" placeholder="e.g. 123" oninput="renderList();render()" maxlength="3" style="width:100px"/>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-card"><div class="stat-label">Total Draws</div><div class="stat-value" id="s-draws" style="color:var(--blue)">—</div></div>
      <div class="stat-card"><div class="stat-label">Total Numbers</div><div class="stat-value" id="s-nums" style="color:var(--purple)">—</div></div>
      <div class="stat-card"><div class="stat-label">Hottest Number</div><div class="stat-value" id="s-hot" style="color:var(--accent)">—</div></div>
      <div class="stat-card"><div class="stat-label">Max Appearances</div><div class="stat-value" id="s-max" style="color:var(--green)">—</div></div>
    </div>

    <div class="main-layout">

      <!-- Number list panel -->
      <div class="num-panel" id="num-panel">
        <div class="num-panel-head">
          <h3 id="list-title">Numbers (000–999)</h3>
          <button class="num-panel-toggle" id="panel-toggle" onclick="togglePanel()" title="Toggle list">▾</button>
        </div>
        <div class="panel-search-wrap">
          <input class="panel-search" id="list-search" type="text" placeholder="Filter numbers…" maxlength="3" oninput="renderList()"/>
        </div>
        <div class="num-panel-body" id="num-body">
          <div class="num-grid" id="num-grid"></div>
        </div>
      </div>

      <!-- Heatmap -->
      <div class="heatmap-wrap">
        <div class="heatmap-scroll" id="heatmap-scroll">
          <div id="heatmap"></div>
        </div>
        <div class="legend">
          <span>Less</span>
          <div class="l-scale" id="legend"></div>
          <span>More</span>
          <span style="margin-left:8px;font-size:10px">Click row or number for dates</span>
        </div>
      </div>

    </div><!-- /main-layout -->
  </div><!-- /container -->

  <div id="tip"></div>

  <div id="overlay" onclick="if(event.target===this)closeModal()">
    <div id="modal">
      <div class="m-head">
        <div class="m-title">
          <div class="m-num" id="m-num">—</div>
          <div class="m-meta" id="m-meta"></div>
        </div>
        <button class="m-close" onclick="closeModal()">✕</button>
      </div>
      <div class="m-body" id="m-body"></div>
    </div>
  </div>

  <script>
    const D  = ${dataJson};
    const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const CL = ['#0d1117','#0a2e1a','#0e4429','#006d32','#26a641','#39d353','#7ee787','#aff5b4','#d4f5a6','#f0f9c4'];

    let type='last3f', view='month', selNum=null, freq={}, dmap={}, gmax=0;

    const hc  = (v,m) => !v||!m ? CL[0] : CL[Math.min(Math.ceil(v/m*(CL.length-1)),CL.length-1)];
    const axK = d => view==='month' ? d.split('-')[1] : d.split('-')[0];
    const axL = k => view==='month' ? (MN[parseInt(k)-1]||k) : k;

    /* ── toggle panel on mobile ── */
    let panelOpen = true;
    function togglePanel(){
      panelOpen = !panelOpen;
      const body = document.getElementById('num-body');
      const btn  = document.getElementById('panel-toggle');
      body.classList.toggle('collapsed', !panelOpen);
      btn.textContent = panelOpen ? '▾' : '▸';
    }

    /* ── build data ── */
    function getData(){
      const td=D[type], yf=document.getElementById('year-filter').value;
      const ns=document.getElementById('number-search').value.trim();
      const isL2=type==='last2', maxN=isL2?100:1000, pad=isL2?2:3;
      const mx={},dm={},fm={},ak=new Set(),ds=new Set();
      for(const [n,e] of Object.entries(td)){
        const fd=yf==='all'?e.dates:e.dates.filter(d=>d.startsWith(yf));
        if(!fd.length) continue;
        dm[n]=fd; fm[n]=fd.length; mx[n]={};
        for(const d of fd){ds.add(d);const k=axK(d);ak.add(k);mx[n][k]=(mx[n][k]||0)+1;}
      }
      let nl=[];
      for(let i=0;i<maxN;i++) nl.push(i.toString().padStart(pad,'0'));
      if(ns) nl=nl.filter(n=>n.includes(ns));
      return{mx,dm,fm,nl,ak:Array.from(ak).sort(),draws:ds.size};
    }

    /* ── render heatmap ── */
    function render(){
      const{mx,dm,fm,nl,ak,draws}=getData();
      freq=fm; dmap=dm; gmax=0; let hot='—';
      for(const[n,c] of Object.entries(fm)) if(c>gmax){gmax=c;hot=n;}
      document.getElementById('s-draws').textContent=draws;
      document.getElementById('s-nums').textContent=nl.length;
      document.getElementById('s-hot').textContent=hot;
      document.getElementById('s-max').textContent=gmax;
      buildLegend();

      const tbl=document.createElement('table');
      const hr=tbl.createTHead().insertRow();
      const h0=document.createElement('th'); h0.textContent='#'; hr.appendChild(h0);
      for(const k of ak){const th=document.createElement('th');th.textContent=axL(k);hr.appendChild(th);}

      const tb=tbl.createTBody();
      for(const n of nl){
        const row=tb.insertRow();
        if(n===selNum) row.classList.add('hl');
        const th=document.createElement('th');
        th.textContent=n; th.scope='row'; th.title='Click for dates';
        th.addEventListener('click',()=>openModal(n));
        row.appendChild(th);
        for(const k of ak){
          const c=(mx[n]&&mx[n][k])||0;
          const td=row.insertCell();
          td.style.background=hc(c,gmax);
          if(!c) td.classList.add('z');
          td.dataset.n=n; td.dataset.k=k; td.dataset.c=c;
        }
      }
      const el=document.getElementById('heatmap');
      el.innerHTML=''; el.appendChild(tbl);
      tooltips(tbl,ak); renderList();
    }

    /* ── number list ── */
    function renderList(){
      const isL2=type==='last2', maxN=isL2?100:1000, pad=isL2?2:3;
      const s=(document.getElementById('list-search').value||'').trim();
      const max=gmax||1;
      document.getElementById('list-title').textContent=isL2?'Numbers (00\u201399)':'Numbers (000\u2013999)';
      const grid=document.getElementById('num-grid');
      grid.style.gridTemplateColumns='repeat('+(isL2?4:5)+',1fr)';
      let h='';
      for(let i=0;i<maxN;i++){
        const n=i.toString().padStart(pad,'0');
        if(s&&!n.includes(s)) continue;
        const c=freq[n]||0;
        const cls=(c>=max*.7?' hot':c>=max*.35?' warm':'')+(n===selNum?' active':'');
        h+='<button class="nb'+cls+'" data-n="'+n+'" title="'+n+': '+c+'">'
          +'<span class="nb-n">'+n+'</span><span class="nb-c">'+c+'</span></button>';
      }
      grid.innerHTML=h;
      grid.onclick=function(e){
        const btn=e.target.closest('[data-n]');
        if(!btn) return;
        const n=btn.dataset.n;
        selNum=n; openModal(n);
        document.querySelectorAll('#heatmap tbody tr').forEach(r=>{
          const th=r.querySelector('th');
          if(th) r.classList.toggle('hl',th.textContent===n);
        });
        renderList();
      };
    }

    /* ── date modal ── */
    function openModal(n){
      selNum=n; renderList();
      const dates=(dmap[n]||[]).slice().sort(), total=dates.length;
      const lbl=type==='last2'?'Last 2':type==='last3f'?'Last 3 Front':'Last 3 Back';
      document.getElementById('m-num').textContent=n;
      document.getElementById('m-meta').innerHTML='<strong>'+lbl+'</strong><br/>'+total+' appearance'+(total!==1?'s':'')+' in current filter';
      const body=document.getElementById('m-body');
      if(!total){body.innerHTML='<div class="m-empty">No appearances for <strong>'+n+'</strong>.</div>';
        document.getElementById('overlay').classList.add('open'); return;}
      const by={};
      for(const d of dates){const y=d.split('-')[0];if(!by[y])by[y]=[];by[y].push(d);}
      let h='';
      for(const y of Object.keys(by).sort()){
        const yd=by[y];
        const ch=yd.map(d=>{const p=d.split('-');return'<span class="chip" title="'+d+'">'+p[2]+' '+MN[parseInt(p[1])-1]+' '+p[0]+'</span>';}).join('');
        h+='<div class="yr-group"><div class="yr-title">'+y+' \u2014 '+yd.length+' draw'+(yd.length!==1?'s':'')+'</div><div class="chips">'+ch+'</div></div>';
      }
      body.innerHTML=h;
      document.getElementById('overlay').classList.add('open');
    }
    function closeModal(){ document.getElementById('overlay').classList.remove('open'); }
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

    /* ── legend ── */
    function buildLegend(){
      const sc=document.getElementById('legend'); sc.innerHTML='';
      CL.forEach((c,i)=>{const sw=document.createElement('div');sw.className='l-sw';sw.style.background=c;sw.title=Math.round(i/(CL.length-1)*gmax)+' appearances';sc.appendChild(sw);});
    }

    /* ── tooltips ── */
    function tooltips(tbl,ak){
      const tip=document.getElementById('tip');
      tbl.addEventListener('mousemove',e=>{
        const td=e.target.closest('td');
        if(!td||!td.dataset.n){tip.style.display='none';return;}
        const n=td.dataset.n,c=+td.dataset.c,t=freq[n]||0,avg=t>0?(t/ak.length).toFixed(2):'0';
        tip.innerHTML='<strong>'+n+'</strong>'
          +'<div class="tr"><span>'+(view==='month'?'Month':'Year')+'</span><span>'+axL(td.dataset.k)+'</span></div>'
          +'<div class="tr"><span>Appearances</span><span>'+c+'</span></div>'
          +'<div class="tr"><span>Total</span><span>'+t+'</span></div>'
          +'<div class="tr"><span>Avg/period</span><span>'+avg+'</span></div>'
          +'<div style="margin-top:5px;font-size:10px;color:var(--muted)">Click row to see all dates</div>';
        tip.style.display='block';
        tip.style.left=(e.clientX+14)+'px';
        tip.style.top=(e.clientY-10)+'px';
      });
      tbl.addEventListener('mouseleave',()=>{ tip.style.display='none'; });
    }

    /* ── tab switches ── */
    function switchType(t){
      type=t; selNum=null;
      ['last3f','last3b','last2'].forEach(x=>document.getElementById('tab-'+x).classList.toggle('active',x===t));
      render();
    }
    function switchView(v){
      view=v;
      ['month','year'].forEach(x=>document.getElementById('vtab-'+x).classList.toggle('active',x===v));
      render();
    }

    /* ── theme ── */
    function setTheme(t){
      document.documentElement.dataset.theme=t;
      localStorage.setItem('hm-theme',t);
      ['dark','light','system'].forEach(x=>{
        document.getElementById('theme-'+x).classList.toggle('active',x===t);
      });
    }
    function initTheme(){
      const saved=localStorage.getItem('hm-theme')||'dark';
      setTheme(saved);
    }

    /* ── init ── */
    (function(){
      initTheme();
      const years=new Set(D.allDates.map(d=>d.split('-')[0]));
      const sel=document.getElementById('year-filter');
      Array.from(years).sort().forEach(y=>{const o=document.createElement('option');o.value=y;o.textContent=y;sel.appendChild(o);});
      render();
    })();
  </script>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('📖 Reading:', CSV_PATH);
  const rows = parseCSV(readFileSync(CSV_PATH, 'utf-8'));
  console.log(`✅ Parsed ${rows.length} rows`);

  const ds = buildDataset(rows);
  console.log(`   last3f: ${Object.keys(ds.last3f).length} numbers`);
  console.log(`   last3b: ${Object.keys(ds.last3b).length} numbers`);
  console.log(`   last2:  ${Object.keys(ds.last2).length} numbers`);
  console.log(`   draws:  ${ds.allDates.length}`);

  const html = buildHTML(ds);
  writeFileSync(OUTPUT_PATH, html, 'utf-8');
  const kb = (statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`✅ Written: ${OUTPUT_PATH} (${kb} KB)`);
  console.log('   Open heatmap-static.html directly in any browser — no server needed!');
}

main();
