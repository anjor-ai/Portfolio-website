#!/usr/bin/env node
/*
  Small helper for this static site. No dependencies; needs Node 16+.

    node tools/site.js check              verify the deploy files agree with each other (run before every deploy)
    node tools/site.js csp                refresh the script fingerprints in vercel.json after ANY edit to index.html
    node tools/site.js domain <address>   change the site address everywhere, e.g. node tools/site.js domain https://www.example.com

  Why "csp" exists: the Content-Security-Policy in vercel.json only lets the page run inline scripts whose
  SHA-256 fingerprint it lists. That is what stops injected scripts from running. It also means editing the
  inline script in index.html changes the fingerprint, and the page will stay blank until it is refreshed.
*/
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..'), P = f => path.join(root, f);
const read = f => fs.readFileSync(P(f), 'utf8'), write = (f, t) => fs.writeFileSync(P(f), t);

function inlineScripts(html) {                       // scripts the browser will execute (JSON-LD is data, not code)
  const out = [], re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) { if (/type\s*=\s*["']?(application\/ld\+json|application\/json)/i.test(m[1] || '')) continue; out.push(m[2]); }
  return out;
}
const fingerprint = t => "'sha256-" + crypto.createHash('sha256').update(t, 'utf8').digest('base64') + "'";
const wanted = () => inlineScripts(read('index.html')).map(fingerprint);
function cspOf(cfg) { for (const g of cfg.headers) for (const h of g.headers) if (h.key === 'Content-Security-Policy') return h; return null; }
const scriptSrc = v => (v.match(/script-src ([^;]*)/) || [])[1] || '';
const origin = () => (read('index.html').match(/<link rel="canonical" href="(https?:\/\/[^/"]+)\/?"/) || [])[1];

function csp() {
  const cfg = JSON.parse(read('vercel.json')), h = cspOf(cfg); if (!h) throw new Error('No Content-Security-Policy header in vercel.json');
  const list = wanted().join(' ');
  h.value = h.value.replace(/script-src [^;]*/, 'script-src ' + list);
  write('vercel.json', JSON.stringify(cfg, null, 2) + '\n');
  console.log('Updated vercel.json with', wanted().length, 'script fingerprint(s):\n  ' + wanted().join('\n  '));
}
function check() {
  const problems = [], ok = m => console.log('  ok   ' + m), bad = m => { problems.push(m); console.log('  FAIL ' + m); };
  for (const f of ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'vercel.json', 'favicon.ico', 'og-image.jpg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', '.well-known/security.txt'])
    fs.existsSync(P(f)) ? ok(f + ' exists') : bad(f + ' is missing');
  try {
    const cfg = JSON.parse(read('vercel.json')); ok('vercel.json is valid JSON');
    const h = cspOf(cfg), have = scriptSrc(h ? h.value : '').split(/\s+/).filter(Boolean).sort().join(' '), want = wanted().sort().join(' ');
    have === want ? ok('CSP script fingerprints match index.html (' + wanted().length + ')') : bad('CSP script fingerprints are out of date. Run: node tools/site.js csp');
  } catch (e) { bad('vercel.json: ' + e.message); }
  const html = read('index.html'), o = origin();
  o ? ok('canonical address is ' + o) : bad('index.html has no canonical link');
  if (o) {
    for (const f of ['index.html', 'sitemap.xml', 'robots.txt', '.well-known/security.txt']) {
      const other = (read(f).match(/https?:\/\/[a-z0-9.-]+\.[a-z]+/gi) || []).filter(u => /vercel\.app|anjor/i.test(u) && !u.startsWith(o) && !/linkedin|calendly|web3forms|w3\.org|schema\.org|googleapis|gstatic/i.test(u));
      other.length ? bad(f + ' mentions a different address: ' + [...new Set(other)].join(', ')) : ok(f + ' uses the canonical address');
    }
    /og:image" content="([^"]+)"/.test(html) && RegExp.$1.startsWith(o + '/') ? ok('og:image is an absolute address on the same site') : bad('og:image is missing or not absolute');
  }
  fs.existsSync(P('og-image.jpg')) && fs.statSync(P('og-image.jpg')).size < 300 * 1024 ? ok('og-image.jpg is under 300 KB (WhatsApp and LinkedIn previews need this)') : bad('og-image.jpg is over 300 KB or missing');
  (html.match(/<title>/g) || []).length === 1 ? ok('exactly one <title>') : bad('index.html should have exactly one <title>');
  (html.match(/<script type="application\/ld\+json">/g) || []).length === 1 ? ok('structured data present') : bad('structured data block missing');
  console.log(problems.length ? '\n' + problems.length + ' problem(s). Fix them before deploying.' : '\nAll checks passed.'); process.exit(problems.length ? 1 : 0);
}
function domain(next) {
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(next || '')) { console.error('Give the address as https://example.com (no trailing slash, no path).'); process.exit(1); }
  const old = origin(); if (!old) throw new Error('No canonical link found');
  if (old === next) { console.log('Already ' + next); return; }
  for (const f of ['index.html', 'sitemap.xml', 'robots.txt', '.well-known/security.txt']) { const t = read(f); if (t.includes(old)) write(f, t.split(old).join(next)); }
  console.log('Changed', old, '->', next, 'in index.html, sitemap.xml, robots.txt and security.txt.');
}
const [cmd, arg] = process.argv.slice(2);
({ check, csp, domain: () => domain(arg) }[cmd] || (() => { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace('#!/usr/bin/env node\n/*', '')); process.exit(cmd ? 1 : 0); }))();
