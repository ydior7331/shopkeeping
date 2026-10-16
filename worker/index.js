import { GROUPS, OTHER_GROUP } from './groups.js';

const PAGE_SIZE = 24;
const CACHE_SECONDS = 900;
const PRODUCT_COLUMNS = 'p.id, p.ean, p.name, p.category_id, p.unit, p.pack, p.chain_count, p.best_price, p.best_chain, p.best_unit_price, p.prev_best_price, p.best_changed_on';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...init.headers },
  });
}

function intParam(value, fallback, min, max) {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function idList(value, max) {
  return [...new Set((value ?? '').split(',').map(s => Number.parseInt(s, 10)).filter(n => Number.isFinite(n) && n >= 0))].slice(0, max);
}

function ftsQuery(q) {
  const tokens = q
    .normalize('NFC')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 6);
  return tokens.length ? tokens.map(t => `"${t}"*`).join(' ') : null;
}

async function chains(env) {
  const { results } = await env.DB.prepare('SELECT id, name, store_count FROM chains ORDER BY name').all();
  return results;
}

async function getMeta(env) {
  const [chainList, last] = await Promise.all([
    chains(env),
    env.DB.prepare('SELECT day, imported_at FROM imports ORDER BY day DESC LIMIT 1').first(),
  ]);
  return { chains: chainList, lastImport: last };
}

async function getCategories(env) {
  const { results } = await env.DB.prepare('SELECT id, name, product_count FROM categories WHERE product_count > 0').all();
  const byId = new Map(results.map(c => [c.id, c]));
  const used = new Set();
  const groups = GROUPS.map(g => {
    const cats = g.cats.map(id => byId.get(id)).filter(Boolean);
    cats.forEach(c => used.add(c.id));
    return { id: g.id, name: g.name, icon: g.icon, categories: cats };
  });
  const rest = results.filter(c => !used.has(c.id)).sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  if (rest.length) groups.push({ ...OTHER_GROUP, categories: rest });
  return {
    groups: groups
      .filter(g => g.categories.length)
      .map(g => ({ ...g, product_count: g.categories.reduce((s, c) => s + c.product_count, 0) })),
  };
}

async function listProducts(env, url) {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
  const cat = intParam(url.searchParams.get('cat'), null, 0, 1e9);
  const cats = idList(url.searchParams.get('cats'), 60);
  const chainIds = idList(url.searchParams.get('chains'), 30).filter(id => id >= 1 && id <= 30);
  const matchAll = url.searchParams.get('match') === 'all' && chainIds.length > 1;
  const page = intParam(url.searchParams.get('page'), 1, 1, 200);
  const sort = url.searchParams.get('sort') ?? (q ? 'relevance' : 'name');
  const offset = (page - 1) * PAGE_SIZE;

  const where = ['p.chain_count > 0'];
  const params = [];
  let from = 'products p';
  if (q) {
    const match = ftsQuery(q);
    if (!match) return { items: [], hasMore: false, page };
    from = 'products_fts f JOIN products p ON p.id = f.rowid';
    where.push('products_fts MATCH ?');
    params.push(match);
  }
  if (cat != null) {
    where.push('p.category_id = ?');
    params.push(cat);
  } else if (cats.length) {
    where.push(`p.category_id IN (${cats.map(() => '?').join(',')})`);
    params.push(...cats);
  }
  let selCols = '';
  if (chainIds.length) {
    const mask = chainIds.reduce((m, id) => m | (1 << id), 0);
    if (matchAll) {
      where.push('(p.chains & ?) = ?');
      params.push(mask, mask);
    } else {
      where.push('(p.chains & ?) != 0');
      params.push(mask);
    }
    const sel = `FROM prices x WHERE x.product_id = p.id AND x.chain_id IN (${chainIds.join(',')})`;
    selCols = `, (SELECT x.min_price ${sel} ORDER BY x.min_price, x.chain_id LIMIT 1) AS sel_price, (SELECT x.chain_id ${sel} ORDER BY x.min_price, x.chain_id LIMIT 1) AS sel_chain, (SELECT MIN(x.min_unit_price) ${sel}) AS sel_unit, (SELECT COUNT(*) ${sel}) AS sel_count`;
  }
  if (!q && cat == null && !cats.length) throw new HttpError(400, 'Adj meg keresőszót vagy kategóriát.');

  const orders = {
    name: 'p.name COLLATE NOCASE',
    price: selCols ? 'sel_price' : 'p.best_price',
    unit: selCols ? 'sel_unit IS NULL, sel_unit' : 'p.best_unit_price IS NULL, p.best_unit_price',
    chains: 'p.chain_count DESC, p.name COLLATE NOCASE',
    relevance: q ? 'f.rank * (1 + 0.3 * p.chain_count)' : 'p.name COLLATE NOCASE',
  };
  const order = orders[sort] ?? orders.name;
  const sql = `SELECT ${PRODUCT_COLUMNS}${selCols} FROM ${from} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`;
  const { results } = await env.DB.prepare(sql).bind(...params, PAGE_SIZE + 1, offset).all();
  const items = results.slice(0, PAGE_SIZE).map(({ sel_price, sel_chain, sel_unit, sel_count, ...p }) =>
    selCols
      ? {
          ...p,
          best_price: sel_price,
          best_chain: sel_chain,
          best_unit_price: sel_unit,
          prev_best_price: sel_price === p.best_price ? p.prev_best_price : null,
          sel_count,
          all_best_price: p.best_price,
          all_best_chain: p.best_chain,
        }
      : p,
  );
  return { items, hasMore: results.length > PAGE_SIZE, page };
}

async function getProduct(env, id) {
  const product = await env.DB.prepare(
    `SELECT ${PRODUCT_COLUMNS}, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
  ).bind(id).first();
  if (!product) throw new HttpError(404, 'Nincs ilyen termék.');
  const [current, history] = await env.DB.batch([
    env.DB.prepare('SELECT chain_id, valid_from, min_price, max_price, min_unit_price, max_unit_price, stores FROM prices WHERE product_id = ? ORDER BY min_price').bind(id),
    env.DB.prepare('SELECT chain_id, valid_from, valid_to, min_price, max_price FROM price_history WHERE product_id = ? ORDER BY valid_from').bind(id),
  ]);
  return { product, prices: current.results, history: history.results };
}

async function basket(env, request) {
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  const qty = new Map();
  for (const it of items.slice(0, 200)) {
    const id = intParam(String(it?.id), null, 1, 1e12);
    const n = intParam(String(it?.qty), 1, 1, 999);
    if (id != null) qty.set(id, (qty.get(id) ?? 0) + n);
  }
  if (!qty.size) return { chains: [], mix: null, items: [] };

  const ids = [...qty.keys()];
  const rows = [];
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    const { results } = await env.DB.prepare(
      `SELECT pr.product_id, pr.chain_id, pr.min_price, p.name FROM prices pr JOIN products p ON p.id = pr.product_id WHERE pr.product_id IN (${part.map(() => '?').join(',')})`,
    ).bind(...part).all();
    rows.push(...results);
  }

  const chainList = await chains(env);
  const byChain = new Map(chainList.map(c => [c.id, { id: c.id, name: c.name, total: 0, found: 0, missing: [] }]));
  const best = new Map();
  const names = new Map();
  for (const r of rows) {
    names.set(r.product_id, r.name);
    const c = byChain.get(r.chain_id);
    if (c) {
      c.total += r.min_price * qty.get(r.product_id);
      c.found += 1;
    }
    const b = best.get(r.product_id);
    if (!b || r.min_price < b.min_price) best.set(r.product_id, r);
  }
  const available = ids.filter(id => best.has(id));
  for (const c of byChain.values()) {
    const have = new Set(rows.filter(r => r.chain_id === c.id).map(r => r.product_id));
    c.missing = available.filter(id => !have.has(id));
  }
  const result = [...byChain.values()]
    .filter(c => c.found > 0)
    .sort((a, b) => b.found - a.found || a.total - b.total || a.id - b.id);
  const mix = {
    total: available.reduce((s, id) => s + best.get(id).min_price * qty.get(id), 0),
    picks: available.map(id => ({ id, chain_id: best.get(id).chain_id, price: best.get(id).min_price })),
  };
  return {
    chains: result,
    mix,
    items: ids.map(id => ({ id, name: names.get(id) ?? null, qty: qty.get(id), available: best.has(id) })),
    count: available.length,
  };
}

async function changes(env, url) {
  const days = intParam(url.searchParams.get('days'), 7, 1, 90);
  const dir = url.searchParams.get('dir') === 'down' ? 'down' : 'up';
  const cat = intParam(url.searchParams.get('cat'), null, 0, 1e9);
  const last = await env.DB.prepare('SELECT day FROM imports ORDER BY day DESC LIMIT 1').first();
  if (!last) return { since: null, items: [] };
  const since = new Date(Date.parse(`${last.day}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10);
  const params = [since];
  let catFilter = '';
  if (cat != null) {
    catFilter = 'AND p.category_id = ?';
    params.push(cat);
  }
  const cmp = dir === 'up' ? 'ch.new_price > ch.old_price' : 'ch.new_price < ch.old_price';
  const ord = dir === 'up' ? 'DESC' : 'ASC';
  const { results } = await env.DB.prepare(
    `SELECT ch.day, ch.chain_id, ch.old_price, ch.new_price, ROUND((ch.new_price - ch.old_price) * 100.0 / ch.old_price, 1) AS pct, ${PRODUCT_COLUMNS}
     FROM price_changes ch JOIN products p ON p.id = ch.product_id
     WHERE ch.day >= ? AND ch.old_price IS NOT NULL AND ch.new_price IS NOT NULL AND ${cmp} ${catFilter}
     ORDER BY pct ${ord}, ch.day DESC LIMIT 60`,
  ).bind(...params).all();
  return { since, until: last.day, items: results };
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (request.method === 'GET') {
    if (path === '/api/meta') return getMeta(env);
    if (path === '/api/categories') return getCategories(env);
    if (path === '/api/products') return listProducts(env, url);
    if (path === '/api/changes') return changes(env, url);
    const m = path.match(/^\/api\/product\/(\d+)$/);
    if (m) return getProduct(env, Number(m[1]));
  }
  if (request.method === 'POST' && path === '/api/basket') return basket(env, request);
  throw new HttpError(404, 'Ismeretlen végpont.');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const cacheable = request.method === 'GET';
    const cache = caches.default;
    if (cacheable) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }
    try {
      const data = await route(request, env);
      const res = json(data, { headers: { 'cache-control': cacheable ? `public, max-age=${CACHE_SECONDS}` : 'no-store' } });
      if (cacheable) ctx.waitUntil(cache.put(request, res.clone()));
      return res;
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      return json({ error: status === 500 ? 'Szerverhiba.' : err.message }, { status, headers: { 'cache-control': 'no-store' } });
    }
  },
};
