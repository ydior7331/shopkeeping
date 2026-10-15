async function request(path, init) {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Hiba történt (${res.status}).`);
  return body;
}

export const api = {
  meta: () => request('/api/meta'),
  categories: () => request('/api/categories'),
  products: (params, signal) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, v);
    return request(`/api/products?${qs}`, { signal });
  },
  product: (id, signal) => request(`/api/product/${id}`, { signal }),
  changes: (params, signal) => request(`/api/changes?${new URLSearchParams(params)}`, { signal }),
  basket: (items, signal) =>
    request('/api/basket', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
      signal,
    }),
};
