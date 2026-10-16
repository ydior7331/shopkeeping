function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function tuple(values) {
  return `(${values.map(lit).join(',')})`;
}

function same(a, b) {
  return (a ?? null) === (b ?? null);
}

function promoFields(promos, offer, minPrice, old) {
  if (!promos) return { normal_price: old?.normal_price ?? null, promo: old?.promo ?? 0, loyalty_price: old?.loyalty_price ?? null };
  if (!offer) return { normal_price: null, promo: 0, loyalty_price: null };
  const promo = offer.discounted != null && offer.discounted === minPrice && offer.normal != null && offer.normal > minPrice ? 1 : 0;
  return {
    normal_price: promo ? offer.normal : null,
    promo,
    loyalty_price: offer.loyalty != null && offer.loyalty < minPrice ? offer.loyalty : null,
  };
}

export function plan(day, rows, state, etag, promos = null) {
  const stmts = [];
  const stats = { rows: rows.length, productsNew: 0, productsChanged: 0, pricesNew: 0, pricesChanged: 0, pricesUpdated: 0, pricesGone: 0, promoUpdated: 0 };
  const initial = state.prices.length === 0;

  const chainByName = new Map(state.chains.map(c => [c.name, c]));
  let nextChainId = Math.max(0, ...state.chains.map(c => c.id)) + 1;
  const chainStores = new Map();
  for (const r of rows) if (r.chainStores != null) chainStores.set(r.chain, r.chainStores);
  for (const r of rows) {
    if (chainByName.has(r.chain)) continue;
    const c = { id: nextChainId++, name: r.chain, store_count: chainStores.get(r.chain) ?? null };
    if (c.id > 30) throw new Error('Túl sok üzletlánc a bitmaszkhoz');
    chainByName.set(r.chain, c);
    stmts.push(`INSERT INTO chains (id, name, store_count) VALUES ${tuple([c.id, c.name, c.store_count])}`);
  }
  for (const [name, count] of chainStores) {
    const c = chainByName.get(name);
    if (state.chains.some(x => x.id === c.id) && !same(c.store_count, count)) {
      stmts.push(`UPDATE chains SET store_count = ${lit(count)} WHERE id = ${c.id}`);
      c.store_count = count;
    }
  }
  const chainsInFile = new Set(rows.map(r => chainByName.get(r.chain).id));

  const catById = new Map(state.categories.map(c => [c.id, { ...c }]));
  for (const r of rows) {
    if (r.catId == null) continue;
    const c = catById.get(r.catId);
    if (!c) {
      catById.set(r.catId, { id: r.catId, name: r.catName, product_count: 0, isNew: true });
    } else if (c.name !== r.catName && r.catName) {
      c.name = r.catName;
      c.renamed = true;
    }
  }

  const productByEan = new Map(state.products.map(p => [p.ean, { ...p }]));
  const productById = new Map([...productByEan.values()].map(p => [p.id, p]));
  let nextProductId = Math.max(0, ...state.products.map(p => p.id)) + 1;
  const newProducts = [];
  const ftsDeletes = [];
  const ftsInserts = [];
  for (const r of rows) {
    let p = productByEan.get(r.ean);
    if (!p) {
      p = { id: nextProductId++, ean: r.ean, name: r.name, category_id: r.catId ?? 0, unit: r.unit, pack: r.pack, chains: 0, chain_count: 0, best_price: null, best_chain: null, best_unit_price: null, prev_best_price: null, best_changed_on: null, isNew: true };
      productByEan.set(r.ean, p);
      productById.set(p.id, p);
      newProducts.push(p);
      ftsInserts.push([p.id, p.name]);
      stats.productsNew++;
      continue;
    }
    if (p.seen) continue;
    p.seen = true;
    if (p.name !== r.name || p.category_id !== (r.catId ?? 0) || !same(p.unit, r.unit) || !same(p.pack, r.pack)) {
      if (p.name !== r.name) {
        ftsDeletes.push([p.id, p.name]);
        ftsInserts.push([p.id, r.name]);
      }
      Object.assign(p, { name: r.name, category_id: r.catId ?? 0, unit: r.unit, pack: r.pack, metaChanged: true });
      stats.productsChanged++;
    }
  }

  const current = new Map(state.prices.map(x => [`${x.product_id}:${x.chain_id}`, x]));
  const finalPrices = new Map(current);
  const touched = new Set();
  const upserts = [];
  const history = [];
  const changes = [];
  const deletes = [];

  for (const r of rows) {
    if (r.minPrice == null) continue;
    const p = productByEan.get(r.ean);
    const chainId = chainByName.get(r.chain).id;
    const key = `${p.id}:${chainId}`;
    const old = current.get(key);
    const next = { product_id: p.id, chain_id: chainId, valid_from: day, min_price: r.minPrice, max_price: r.maxPrice, min_unit_price: r.minUnit, max_unit_price: r.maxUnit, stores: r.stores };
    Object.assign(next, promoFields(promos, promos?.get(`${r.ean}|${r.chain}`), r.minPrice, old));
    if (!old) {
      upserts.push(next);
      finalPrices.set(key, next);
      touched.add(p.id);
      stats.pricesNew++;
      if (!initial) changes.push([day, p.id, chainId, null, next.min_price]);
      continue;
    }
    const priceChanged = !same(old.min_price, next.min_price) || !same(old.max_price, next.max_price) || !same(old.min_unit_price, next.min_unit_price) || !same(old.max_unit_price, next.max_unit_price);
    if (priceChanged) {
      if (old.valid_from < day) {
        history.push([old.product_id, old.chain_id, old.valid_from, day, old.min_price, old.max_price, old.min_unit_price, old.max_unit_price, old.stores]);
      } else {
        next.valid_from = old.valid_from;
      }
      if (!same(old.min_price, next.min_price)) changes.push([day, p.id, chainId, old.min_price, next.min_price]);
      upserts.push(next);
      finalPrices.set(key, next);
      touched.add(p.id);
      stats.pricesChanged++;
    } else {
      const promoChanged = !same(old.normal_price, next.normal_price) || !same(old.promo ?? 0, next.promo) || !same(old.loyalty_price, next.loyalty_price);
      if (promoChanged || !same(old.stores, next.stores)) {
        next.valid_from = old.valid_from;
        upserts.push(next);
        finalPrices.set(key, next);
        if (promoChanged) {
          touched.add(p.id);
          stats.promoUpdated++;
        } else {
          stats.pricesUpdated++;
        }
      }
    }
  }

  const inFile = new Set();
  for (const r of rows) {
    if (r.minPrice == null) continue;
    inFile.add(`${productByEan.get(r.ean).id}:${chainByName.get(r.chain).id}`);
  }
  for (const [key, old] of current) {
    if (inFile.has(key) || !chainsInFile.has(old.chain_id)) continue;
    if (old.valid_from < day) history.push([old.product_id, old.chain_id, old.valid_from, day, old.min_price, old.max_price, old.min_unit_price, old.max_unit_price, old.stores]);
    changes.push([day, old.product_id, old.chain_id, old.min_price, null]);
    deletes.push([old.product_id, old.chain_id]);
    finalPrices.delete(key);
    touched.add(old.product_id);
    stats.pricesGone++;
  }

  const byProduct = new Map();
  for (const x of finalPrices.values()) {
    const list = byProduct.get(x.product_id) ?? [];
    list.push(x);
    byProduct.set(x.product_id, list);
  }

  const productUpdates = [];
  for (const p of productById.values()) {
    if (!touched.has(p.id) && !p.metaChanged && !p.isNew) continue;
    const list = byProduct.get(p.id) ?? [];
    let mask = 0;
    let best = null;
    let bestUnit = null;
    let promoMask = 0;
    let loyaltyMask = 0;
    let loyal = null;
    for (const x of list) {
      mask |= 1 << x.chain_id;
      if (x.promo) promoMask |= 1 << x.chain_id;
      if (x.loyalty_price != null) {
        loyaltyMask |= 1 << x.chain_id;
        if (!loyal || x.loyalty_price < loyal.loyalty_price) loyal = x;
      }
      if (!best || x.min_price < best.min_price || (x.min_price === best.min_price && x.chain_id < best.chain_id)) best = x;
      if (x.min_unit_price != null && (bestUnit == null || x.min_unit_price < bestUnit)) bestUnit = x.min_unit_price;
    }
    const agg = {
      chains: mask,
      chain_count: list.length,
      best_price: best?.min_price ?? null,
      best_chain: best?.chain_id ?? null,
      best_unit_price: bestUnit,
      prev_best_price: p.prev_best_price,
      best_changed_on: p.best_changed_on,
      best_normal_price: best?.promo ? best.normal_price : null,
      loyalty_price: loyal?.loyalty_price ?? null,
      loyalty_chain: loyal?.chain_id ?? null,
      promo_chains: promoMask,
      loyalty_chains: loyaltyMask,
    };
    if (!p.isNew && p.best_price != null && agg.best_price != null && p.best_price !== agg.best_price) {
      agg.prev_best_price = p.best_price;
      agg.best_changed_on = day;
    }
    const aggChanged = Object.keys(agg).some(k => !same(p[k], agg[k]));
    Object.assign(p, agg);
    if (!p.isNew && (aggChanged || p.metaChanged)) productUpdates.push(p);
  }

  const catCounts = new Map();
  for (const p of productById.values()) if (p.chain_count > 0) catCounts.set(p.category_id, (catCounts.get(p.category_id) ?? 0) + 1);
  const catStmts = [];
  for (const c of catById.values()) {
    const count = catCounts.get(c.id) ?? 0;
    if (c.isNew) catStmts.push(`INSERT INTO categories (id, name, product_count) VALUES ${tuple([c.id, c.name, count])}`);
    else if (c.renamed || c.product_count !== count) catStmts.push(`UPDATE categories SET name = ${lit(c.name)}, product_count = ${count} WHERE id = ${c.id}`);
  }

  stmts.push(...catStmts);
  pushInserts(stmts, 'INSERT INTO products (id, ean, name, category_id, unit, pack, chains, chain_count, best_price, best_chain, best_unit_price, prev_best_price, best_changed_on, best_normal_price, loyalty_price, loyalty_chain, promo_chains, loyalty_chains) VALUES',
    newProducts.map(p => [p.id, p.ean, p.name, p.category_id, p.unit, p.pack, p.chains, p.chain_count, p.best_price, p.best_chain, p.best_unit_price, p.prev_best_price, p.best_changed_on, p.best_normal_price, p.loyalty_price, p.loyalty_chain, p.promo_chains, p.loyalty_chains]));
  for (const p of productUpdates) {
    stmts.push(`UPDATE products SET name = ${lit(p.name)}, category_id = ${lit(p.category_id)}, unit = ${lit(p.unit)}, pack = ${lit(p.pack)}, chains = ${p.chains}, chain_count = ${p.chain_count}, best_price = ${lit(p.best_price)}, best_chain = ${lit(p.best_chain)}, best_unit_price = ${lit(p.best_unit_price)}, prev_best_price = ${lit(p.prev_best_price)}, best_changed_on = ${lit(p.best_changed_on)}, best_normal_price = ${lit(p.best_normal_price)}, loyalty_price = ${lit(p.loyalty_price)}, loyalty_chain = ${lit(p.loyalty_chain)}, promo_chains = ${p.promo_chains}, loyalty_chains = ${p.loyalty_chains} WHERE id = ${p.id}`);
  }
  for (const [id, name] of ftsDeletes) stmts.push(`INSERT INTO products_fts (products_fts, rowid, name) VALUES ('delete', ${id}, ${lit(name)})`);
  pushInserts(stmts, 'INSERT INTO products_fts (rowid, name) VALUES', ftsInserts);
  pushInserts(stmts, 'INSERT OR REPLACE INTO price_history (product_id, chain_id, valid_from, valid_to, min_price, max_price, min_unit_price, max_unit_price, stores) VALUES', history);
  pushInserts(stmts, 'INSERT OR REPLACE INTO price_changes (day, product_id, chain_id, old_price, new_price) VALUES', changes);
  pushInserts(stmts, 'INSERT INTO prices (product_id, chain_id, valid_from, min_price, max_price, min_unit_price, max_unit_price, stores, normal_price, promo, loyalty_price) VALUES',
    upserts.map(x => [x.product_id, x.chain_id, x.valid_from, x.min_price, x.max_price, x.min_unit_price, x.max_unit_price, x.stores, x.normal_price, x.promo, x.loyalty_price]),
    ' ON CONFLICT (product_id, chain_id) DO UPDATE SET valid_from = excluded.valid_from, min_price = excluded.min_price, max_price = excluded.max_price, min_unit_price = excluded.min_unit_price, max_unit_price = excluded.max_unit_price, stores = excluded.stores, normal_price = excluded.normal_price, promo = excluded.promo, loyalty_price = excluded.loyalty_price');
  for (const [pid, cid] of deletes) stmts.push(`DELETE FROM prices WHERE product_id = ${pid} AND chain_id = ${cid}`);
  const promoCount = promos ? [...finalPrices.values()].filter(x => x.promo || x.loyalty_price != null).length : null;
  stats.promos = promoCount;
  stmts.push(`INSERT OR REPLACE INTO imports (day, imported_at, source_etag, row_count, products_new, prices_changed, prices_new, prices_gone, promos) VALUES ${tuple([day, new Date().toISOString(), etag, stats.rows, stats.productsNew, stats.pricesChanged, stats.pricesNew, stats.pricesGone, promoCount])}`);

  stats.history = history.length;
  stats.changes = changes.length;
  stats.productUpdates = productUpdates.length;
  stats.statements = stmts.length;
  return { stmts, stats };
}

function pushInserts(stmts, head, rows, tail = '') {
  let chunk = [];
  let size = 0;
  const flush = () => {
    if (chunk.length) stmts.push(`${head} ${chunk.join(',')}${tail}`);
    chunk = [];
    size = 0;
  };
  for (const r of rows) {
    const t = tuple(r);
    if (size + t.length > 40_000 || chunk.length >= 400) flush();
    chunk.push(t);
    size += t.length + 1;
  }
  flush();
}
