const API = 'https://arfigyelo.gvh.hu/api';
const PAGE = 48;
const DELAY_MS = 150;
const HEADERS = { 'user-agent': 'kosarar-import (+https://shop.ydr1337.xyz)', accept: 'application/json' };

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.json();
      if (attempt >= 3 || (res.status < 500 && res.status !== 429)) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt >= 3) throw err;
    }
    await sleep(1500 * attempt);
  }
}

function leafIds(nodes, out = []) {
  for (const n of nodes ?? []) {
    if (n.categoryNodes?.length) leafIds(n.categoryNodes, out);
    else if (n.id != null) out.push(n.id);
  }
  return out;
}

export async function fetchPromos({ log = () => {} } = {}) {
  const tree = await getJson(`${API}/categories`);
  const leaves = leafIds((tree.categories ?? tree).flatMap(t => t.categoryNodes ?? []));
  const offers = new Map();
  let products = 0;
  let requests = 1;
  for (const id of leaves) {
    let offset = 0;
    let count = 0;
    do {
      const page = await getJson(`${API}/products-by-category/${id}?limit=${PAGE}&offset=${offset}`);
      requests++;
      count = page.count ?? 0;
      for (const p of page.products ?? []) {
        products++;
        for (const ch of p.pricesOfChainStores ?? []) {
          const byType = {};
          for (const pr of ch.prices ?? []) {
            if (pr.amount != null && (byType[pr.type] == null || pr.amount < byType[pr.type])) byType[pr.type] = pr.amount;
          }
          offers.set(`${String(p.id).trim()}|${String(ch.name).trim()}`, {
            normal: byType.NORMAL ?? null,
            discounted: byType.DISCOUNTED ?? null,
            loyalty: byType.LOYALTY ?? null,
          });
        }
      }
      offset += PAGE;
      await sleep(DELAY_MS);
    } while (offset < count);
  }
  log(`GVH API: ${leaves.length} kategória, ${products} termék, ${offers.size} ajánlat, ${requests} kérés`);
  return { offers, products };
}
