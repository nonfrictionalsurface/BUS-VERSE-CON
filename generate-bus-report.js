#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/*
 * BusBooking — generate-bus-report.js
 * Builds a single self-contained HTML report of the whole bus-booking project.
 *
 * Usage:
 *   node generate-bus-report.js [ROOT] [OUT] [--include-env]
 *
 * Defaults:
 *   ROOT = process.cwd()
 *   OUT  = <ROOT>/bus-report.html
 */

const argv       = process.argv.slice(2);
const positional = argv.filter(a => !a.startsWith('--'));
const ROOT       = path.resolve(positional[0] || process.cwd());
const OUT        = path.resolve(positional[1] || path.join(ROOT, 'bus-report.html'));
const INCLUDE_ENV = argv.includes('--include-env');

if (!fs.existsSync(ROOT)) {
  console.error('Directory not found: ' + ROOT);
  process.exit(1);
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.expo', 'dist', 'web-build', '.next', 'build',
  '__pycache__', '.venv', 'venv', '.pnpm-store', '.turbo', '.cache',
  'coverage', 'example', '.pytest_cache', '.mypy_cache', '.ruff_cache',
  '.parcel-cache', '.idea', '.vscode', '.DS_Store', 'out', 'tmp', 'logs',
  'vendor', 'storage'
]);

const SKIP_EXTS = new Set([
  '.png','.jpg','.jpeg','.gif','.webp','.bmp','.tiff','.ico','.icns',
  '.pdf','.zip','.tar','.gz','.tgz','.7z','.rar','.bz2',
  '.mp3','.mp4','.mov','.avi','.mkv','.wav','.flac','.ogg',
  '.woff','.woff2','.ttf','.otf','.eot',
  '.db','.sqlite','.sqlite3','.mdb',
  '.pyc','.pyo','.class','.o','.a','.so','.dll','.dylib','.exe','.bin','.node',
  '.lock','.pdb','.map'
]);

const MAX_FILE_BYTES = 300 * 1024;

const escapeHtml = (s) => String(s)
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;');

const fmtSize = (b) =>
  b < 1024      ? b + ' B'
: b < 1048576   ? (b/1024).toFixed(1) + ' KB'
                : (b/1048576).toFixed(2) + ' MB';

const getExt = (n) => {
  const l = n.toLowerCase();
  if (l.startsWith('.') && l.indexOf('.', 1) === -1) return l;
  const i = l.lastIndexOf('.');
  return i === -1 ? '(none)' : l.slice(i);
};

const allFiles = [];

function walk(dir, relBase) {
  relBase = relBase || '';
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return; }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const name = entry.name;
    const full = path.join(dir, name);
    const rel  = relBase ? relBase + '/' + name : name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, rel);
    } else if (entry.isFile()) {
      if (path.resolve(full) === OUT) continue;

      const isEnv = name === '.env'
        || (name.startsWith('.env.') && name !== '.env.example');
      if (isEnv && !INCLUDE_ENV) continue;

      const ext = path.extname(name).toLowerCase();
      if (SKIP_EXTS.has(ext)) continue;

      let stat;
      try { stat = fs.statSync(full); } catch (e) { continue; }

      allFiles.push({ rel, full, name, size: stat.size, ext: getExt(name) });
    }
  }
}

console.error('Walking ' + ROOT + ' ...');
walk(ROOT);
console.error('Found ' + allFiles.length + ' files.');

const totalSize  = allFiles.reduce((s, f) => s + f.size, 0);
const topFolders = new Set(
  allFiles.map(f => f.rel.includes('/') ? f.rel.split('/')[0] : '(root)')
).size;

const extStats = new Map();
for (const f of allFiles) {
  if (!extStats.has(f.ext)) extStats.set(f.ext, { count: 0, size: 0 });
  const e = extStats.get(f.ext);
  e.count++;
  e.size += f.size;
}
const extSorted = [...extStats.entries()].sort((a, b) => b[1].count - a[1].count);

function buildTree(files) {
  const root = { name: '', type: 'dir', children: new Map() };
  for (const f of files) {
    const parts = f.rel.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!node.children.has(p))
        node.children.set(p, { name: p, type: 'dir', children: new Map() });
      node = node.children.get(p);
    }
    node.children.set(parts[parts.length - 1],
      { name: parts[parts.length - 1], type: 'file' });
  }
  return root;
}

function renderTreeLines(node, prefix) {
  prefix = prefix || '';
  const lines = [];
  const entries = [...node.children.values()].sort((a, b) =>
    a.type !== b.type ? (a.type === 'dir' ? -1 : 1)
                      : a.name.localeCompare(b.name));
  entries.forEach((child, idx) => {
    const isLast    = idx === entries.length - 1;
    const connector = isLast ? '+-- ' : '+-- ';
    const next      = prefix + (isLast ? '    ' : '¦   ');
    if (child.type === 'dir') {
      lines.push({ text: prefix + connector + child.name + '/', type: 'dir' });
      lines.push(...renderTreeLines(child, next));
    } else {
      lines.push({ text: prefix + connector + child.name, type: 'file' });
    }
  });
  return lines;
}

const treeRoot  = buildTree(allFiles);
const treeLines = renderTreeLines(treeRoot);

function groupByTop(files) {
  const groups = new Map();
  for (const f of files) {
    const top = f.rel.includes('/') ? f.rel.split('/')[0] : '(root)';
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top).push(f);
  }
  return [...groups.entries()].sort((a, b) =>
    a[0] === '(root)' ? -1 :
    b[0] === '(root)' ?  1 :
    a[0].localeCompare(b[0]));
}
const groups = groupByTop(allFiles);

function buildFileCard(file) {
  let content = '';
  let note    = '';
  try {
    const buf = fs.readFileSync(file.full);
    let isBinary = false;
    for (let i = 0; i < Math.min(buf.length, 8192); i++) {
      if (buf[i] === 0) { isBinary = true; break; }
    }
    if (isBinary) {
      return '<details class="file-card"><summary>'
        + '<span class=\'chev\'>▸</span>'
        + '<span class=\'file-path\'>' + escapeHtml(file.rel) + '</span>'
        + '<span class=\'file-size\'>' + fmtSize(file.size) + ' · binary</span>'
        + '</summary><pre class=\'code\'>[binary file — contents not shown]</pre></details>';
    }
    if (buf.length > MAX_FILE_BYTES) {
      content = buf.slice(0, MAX_FILE_BYTES).toString('utf8');
      note = '\n\n… [truncated — full file is ' + fmtSize(file.size)
           + ', showing first ' + fmtSize(MAX_FILE_BYTES) + ']';
    } else {
      content = buf.toString('utf8');
    }
  } catch (err) {
    content = '[error reading file: ' + err.message + ']';
  }
  return '<details class="file-card"><summary>'
    + '<span class=\'chev\'>▸</span>'
    + '<span class=\'file-path\'>' + escapeHtml(file.rel) + '</span>'
    + '<span class=\'file-size\'>' + fmtSize(file.size) + '</span>'
    + '</summary><pre class=\'code\'>'
    + escapeHtml(content + note)
    + '</pre></details>';
}

const now      = new Date();
const dateStr  = now.toISOString().slice(0, 10);
const timeStr  = now.toISOString().slice(11, 16);

const treeHtml = treeLines
  .map(l => '<span class=\'' + l.type + '\'>' + escapeHtml(l.text) + '</span>')
  .join('\n');

const extHtml = extSorted.slice(0, 20).map(([ext, s]) =>
  '<div class=\'ext\'>'
  + '<div class=\'code\'>'   + escapeHtml(ext)  + '</div>'
  + '<div class=\'count\'>'  + s.count          + '</div>'
  + '<div class=\'size\'>'   + fmtSize(s.size)  + '</div>'
  + '</div>'
).join('\n');

const sourceHtml = groups.map(([groupName, files]) => {
  const cards = files
    .sort((a, b) => a.rel.localeCompare(b.rel))
    .map(buildFileCard)
    .join('\n');
  return '<div class="group">'
    + '<div class=\'group-header\'>'
    + '<span class=\'group-name\'>'  + escapeHtml(groupName) + '</span>'
    + '<span class=\'group-count\'>' + files.length
      + ' file' + (files.length === 1 ? '' : 's') + '</span>'
    + '</div>'
    + cards
    + '</div>';
}).join('\n');

const html = '<!DOCTYPE html><html lang="en"><head>'
+ '<meta charset="utf-8">'
+ '<meta name="viewport" content="width=device-width,initial-scale=1">'
+ '<title>BusBooking — Complete Source Code Report</title>'
+ '<style>'
+ ':root{--navy:#0A4577;--teal:#08A3B2;--bg:#F2F7FB;--card:#FFF;--text:#1A2E45;--text-2:#5A6B7A;--text-3:#8A99A8;--border-subtle:#E8EEF5;--code-bg:#0A2540;--code-fg:#E6EDF3}'
+ '*{box-sizing:border-box}'
+ 'body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,-apple-system,sans-serif;font-size:15px;line-height:1.55}'
+ '.hero{background:linear-gradient(135deg,#073357 0%,#0A4577 55%,#0B7FA0 100%);color:#fff;padding:64px 32px 56px;border-bottom:6px solid var(--teal)}'
+ '.hero-inner{max-width:1100px;margin:0 auto}'
+ '.hero h1{margin:0 0 8px;font-size:38px;font-weight:700}'
+ '.hero h1 .teal{color:#2FC4D6}'
+ '.hero p{margin:0;font-size:16px;color:#A9BECE}'
+ '.hero .kicker{display:inline-block;margin-bottom:16px;padding:6px 12px;border-radius:999px;background:rgba(47,196,214,0.15);color:#7FE3F0;font-size:12px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase}'
+ '.hero .path{margin-top:12px;font-family:monospace;font-size:12.5px;color:#7FE3F0;word-break:break-all}'
+ '.container{max-width:1100px;margin:0 auto;padding:0 32px 80px}'
+ '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-top:-36px;position:relative;z-index:2}'
+ '.stat{background:var(--card);border-radius:16px;padding:20px 22px;box-shadow:0 8px 24px rgba(6,43,75,0.08)}'
+ '.stat .label{font-size:11px;font-weight:600;color:var(--text-3);letter-spacing:0.6px;text-transform:uppercase}'
+ '.stat .value{margin-top:6px;font-size:28px;font-weight:700;color:var(--navy)}'
+ '.stat .sub{margin-top:2px;font-size:12px;color:var(--text-3)}'
+ 'section{margin-top:56px}'
+ 'h2.section-title{font-size:22px;font-weight:600;color:var(--navy);margin:0 0 4px}'
+ '.section-sub{color:var(--text-2);font-size:14px;margin:0 0 20px}'
+ '.tree{background:var(--card);border-radius:16px;padding:24px;box-shadow:0 4px 12px rgba(6,43,75,0.06);font-family:monospace;font-size:13px;white-space:pre;overflow-x:auto;line-height:1.7}'
+ '.tree .dir{color:var(--navy);font-weight:600}'
+ '.ext-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}'
+ '.ext{background:var(--card);border-radius:12px;padding:14px 16px;border:1px solid var(--border-subtle)}'
+ '.ext .code{font-family:monospace;font-size:13px;font-weight:600;color:var(--navy)}'
+ '.ext .count{margin-top:4px;font-size:22px;font-weight:700}'
+ '.ext .size{margin-top:2px;font-size:11px;color:var(--text-3)}'
+ 'details.file-card{background:var(--card);border-radius:14px;margin-bottom:14px;box-shadow:0 4px 12px rgba(6,43,75,0.05);border:1px solid var(--border-subtle);overflow:hidden}'
+ 'details.file-card>summary{cursor:pointer;list-style:none;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#F6F8FC;border-bottom:1px solid var(--border-subtle);font-family:monospace;font-size:13px}'
+ 'details.file-card[open]>summary{border-bottom:1px solid #D9E2EC}'
+ '.file-path{color:var(--navy);font-weight:600;word-break:break-all}'
+ '.file-size{flex-shrink:0;color:var(--text-3);font-size:11px;padding:3px 8px;background:#fff;border-radius:99px;border:1px solid var(--border-subtle)}'
+ '.chev{color:var(--text-3);font-size:12px;flex-shrink:0;transition:transform .15s}'
+ 'details.file-card[open] .chev{transform:rotate(90deg)}'
+ 'pre.code{margin:0;padding:20px 22px;background:var(--code-bg);color:var(--code-fg);font-family:monospace;font-size:12.5px;line-height:1.65;overflow-x:auto;white-space:pre}'
+ '.group{margin-top:36px}'
+ '.group-header{display:flex;align-items:baseline;gap:12px;padding:8px 0 12px;border-bottom:2px solid #D9E2EC;margin-bottom:16px}'
+ '.group-name{font-size:18px;font-weight:600;color:var(--navy);font-family:monospace}'
+ '.group-count{font-size:12px;color:var(--text-3);padding:2px 8px;background:#F6F8FC;border-radius:99px}'
+ 'footer{border-top:1px solid var(--border-subtle);padding:32px;text-align:center;color:var(--text-3);font-size:12px}'
+ 'footer .brand{color:var(--navy);font-weight:600}'
+ 'footer .brand-2{color:var(--teal);font-weight:600}'
+ '</style></head><body>'
+ '<div class="hero"><div class="hero-inner">'
+ '<div class="kicker">BusBooking · Project Report</div>'
+ '<h1><span style="color:#F2F7FB">BUS</span><span class="teal">BOOKING</span></h1>'
+ '<p>Full project report — architecture, file tree, and source code.</p>'
+ '<div class="path">' + escapeHtml(ROOT) + '</div>'
+ '</div></div>'
+ '<div class="container">'
+ '<div class="stats">'
+ '<div class="stat"><div class="label">Total files</div><div class="value">' + allFiles.length + '</div><div class="sub">excl. binaries</div></div>'
+ '<div class="stat"><div class="label">Total size</div><div class="value">' + fmtSize(totalSize) + '</div><div class="sub">source only</div></div>'
+ '<div class="stat"><div class="label">Top folders</div><div class="value">' + topFolders + '</div><div class="sub">root groups</div></div>'
+ '<div class="stat"><div class="label">Generated</div><div class="value" style="font-size:18px">' + dateStr + '</div><div class="sub">' + timeStr + ' UTC</div></div>'
+ '</div>'
+ '<section><h2 class="section-title">File Tree</h2><p class="section-sub">Every file tracked by the report.</p><div class="tree">' + treeHtml + '</div></section>'
+ '<section><h2 class="section-title">By File Type</h2><div class="ext-grid">' + extHtml + '</div></section>'
+ '<section><h2 class="section-title">Source Code</h2><p class="section-sub">Click any file to expand.</p>' + sourceHtml + '</section>'
+ '</div>'
+ '<footer><span class="brand">BUS</span><span class="brand-2">BOOKING</span> — Project Report · Generated ' + dateStr + ' ' + timeStr + ' UTC</footer>'
+ '</body></html>';

fs.writeFileSync(OUT, html, 'utf8');

console.error('');
console.error('Report written to: ' + OUT);
console.error('  Files: ' + allFiles.length);
console.error('  Size:  ' + fmtSize(totalSize));
