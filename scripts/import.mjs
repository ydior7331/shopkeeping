import { readFileSync, writeFileSync } from 'node:fs';
import { parseArfigyelo } from './xlsx.mjs';
import { plan } from './plan.mjs';

const SOURCE_URL = 'https://cdnarfigyeloprodweu.azureedge.net/excel/arfigyelo_napi_termekadatok.xlsx';
const MIN_ROWS = 5000;
const MAX_REQUEST_CHARS = 90_000;

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const opt = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const FILE = opt('--file');
const OUT = opt('--out');
const FRESH = flag('--fresh');
const FORCE = flag('--force');
const DRY = flag('--dry-run');

const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID } = process.env;
const useRemote = !FRESH;

if (useRemote && !(CLOUDFLARE_API_TOKEN && CLOUDFLARE_ACCOUNT_ID && D1_DATABASE_ID)) {
  console.error('Hiányzik: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID vagy D1_DATABASE_ID');
  process.exit(1);
}

async function d1(sql, params) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(params ? { sql, params } : { sql }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.success) return body.result;
    const msg = body?.errors?.map(e => e.message).join('; ') || `HTTP ${res.status}`;
    if (attempt >= 3 || (res.status < 500 && res.status !== 429)) throw new Error(`D1 hiba: ${msg}`);
    await new Promise(r => setTimeout(r, 2000 * attempt));
  }
}

async function selectAll(sql, params) {
  const result = await d1(sql, params);
  return result[0].results;
}

async function selectPaged(sqlFor, keyOf, pageSize = 5000) {
  const out = [];
  let after = null;
  for (;;) {
    const { sql, params } = sqlFor(after, pageSize);
    const rows = await selectAll(sql, params);
    out.push(...rows);
    if (rows.length < pageSize) return out;
    after = keyOf(rows[rows.length - 1]);
  }
}

async function download() {
  if (FILE) return { bytes: readFileSync(FILE), etag: null };
  const res = await fetch(SOURCE_URL, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`Letöltési hiba: HTTP ${res.status}`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), etag: res.headers.get('etag') };
}

async function loadState() {
  if (!useRemote) return { chains: [], categories: [], products: [], prices: [] };
  const chains = await selectAll('SELECT id, name, store_count FROM chains');
  const categories = await selectAll('SELECT id, name, product_count FROM categories');
  const products = await selectPaged(
    (after, n) => ({
      sql: 'SELECT id, ean, name, category_id, unit, pack, chains, chain_count, best_price, best_chain, best_unit_price, prev_best_price, best_changed_on FROM products WHERE id > ? ORDER BY id LIMIT ?',
      params: [after ?? 0, n],
    }),
    r => r.id,
  );
  const prices = await selectPaged(
    (after, n) => ({
      sql: 'SELECT product_id, chain_id, valid_from, min_price, max_price, min_unit_price, max_unit_price, stores FROM prices WHERE (product_id, chain_id) > (?, ?) ORDER BY product_id, chain_id LIMIT ?',
      params: [after?.[0] ?? 0, after?.[1] ?? 0, n],
    }),
    r => [r.product_id, r.chain_id],
  );
  return { chains, categories, products, prices };
}

async function execute(stmts) {
  let batch = [];
  let size = 0;
  let sent = 0;
  const flush = async () => {
    if (!batch.length) return;
    await d1(batch.join(';\n'));
    sent += batch.length;
    process.stdout.write(`\r${sent}/${stmts.length} utasítás`);
    batch = [];
    size = 0;
  };
  for (const s of stmts) {
    if (size + s.length > MAX_REQUEST_CHARS) await flush();
    batch.push(s);
    size += s.length + 2;
  }
  await flush();
  process.stdout.write('\n');
}

const { bytes, etag } = await download();
const parsed = parseArfigyelo(bytes);
const day = parsed.date ?? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(new Date());
console.log(`Forrás: ${parsed.sheetName} · ${parsed.rows.length} sor · nap: ${day}`);

if (parsed.rows.length < MIN_ROWS) throw new Error(`Gyanúsan kevés sor (${parsed.rows.length}), az import leáll`);

if (useRemote && !FORCE) {
  const done = await selectAll('SELECT day FROM imports WHERE day >= ? LIMIT 1', [day]);
  if (done.length) {
    console.log(`A(z) ${day} napi adat már be van töltve, nincs teendő.`);
    process.exit(0);
  }
}

const state = await loadState();
console.log(`Jelenlegi állapot: ${state.products.length} termék, ${state.prices.length} ár`);
const { stmts, stats } = plan(day, parsed.rows, state, etag);
console.log(JSON.stringify(stats));

if (OUT) {
  writeFileSync(OUT, stmts.join(';\n') + ';\n');
  console.log(`SQL kiírva: ${OUT}`);
} else if (DRY) {
  console.log('Próbafuttatás, írás nem történt.');
} else {
  await execute(stmts);
  console.log('Kész.');
}
