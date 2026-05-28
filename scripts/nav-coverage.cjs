const fs = require('fs');
const path = require('path');

const sb = fs.readFileSync('./src/components/shell/sidebar.tsx', 'utf8');
const mbn = fs.readFileSync('./src/components/shell/mobile-bottom-nav.tsx', 'utf8');
const moat = fs.readFileSync('./src/components/shell/moat-cards.tsx', 'utf8');

const hrefRe = /href:\s*"([^"#]+)"/g;
const allHrefs = new Set();
for (const m of sb.matchAll(hrefRe)) allHrefs.add(m[1]);
for (const m of mbn.matchAll(hrefRe)) allHrefs.add(m[1]);
for (const m of moat.matchAll(hrefRe)) allHrefs.add(m[1]);

const dashHrefRe = /href=\{`\/\$\{locale\}([^`]+)`\}/g;
for (const f of [
  './src/app/[locale]/(app)/admin/page.tsx',
  './src/app/[locale]/(app)/teacher/page.tsx',
  './src/app/[locale]/(app)/student/page.tsx',
  './src/app/[locale]/(app)/parent/page.tsx',
]) {
  const c = fs.readFileSync(f, 'utf8');
  for (const m of c.matchAll(dashHrefRe)) {
    const href = m[1].split('?')[0];
    allHrefs.add(href);
  }
}

function walk(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'page.tsx') out.push(p);
  }
  return out;
}

function pageToRoute(p) {
  let s = p.replace(/\\/g, '/');
  const ix = s.indexOf('src/app/');
  if (ix >= 0) s = s.slice(ix + 'src/app'.length);
  s = s.replace(/\/page\.tsx$/, '');
  s = s.replace(/^\/\[locale\]/, '');
  s = s.replace(/^\/\(app\)/, '');
  if (s.startsWith('/(auth)')) return '__AUTH__' + s.slice(7);
  if (s.startsWith('/(public)')) return '__PUBLIC__' + s.slice(9);
  if (s === '') s = '/';
  return s;
}

const pages = walk('./src/app');
const routes = pages.map(pageToRoute);

const inApp = routes.filter(r =>
  !r.startsWith('__AUTH__') &&
  !r.startsWith('__PUBLIC__') &&
  r !== '/' &&
  !r.startsWith('/classroom/')
);

let reachable = 0, hubChildren = 0, orphan = [];
for (const r of inApp) {
  const isDynamic = r.includes('[') && r.includes(']');
  let hit = false;
  for (const h of allHrefs) {
    if (r === h || r.startsWith(h + '/')) { hit = true; break; }
  }
  if (hit) reachable++;
  else if (isDynamic) hubChildren++;
  else orphan.push(r);
}

console.log('Unique nav hrefs:', allHrefs.size);
console.log('In-app pages:', inApp.length);
console.log('  Directly nav-reachable:', reachable);
console.log('  Hub-children (dynamic):', hubChildren);
console.log('  Still-orphan:', orphan.length);
const coverage = ((reachable + hubChildren) / inApp.length * 100).toFixed(1);
console.log('Total coverage:', coverage + '%');
if (orphan.length) {
  console.log('\nOrphans:');
  for (const o of orphan) console.log('  ' + o);
}
