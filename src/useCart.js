import { useCallback, useEffect, useState } from 'react';

const KEY = 'kosarar.cart.v2';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function useCart() {
  const [cart, setCart] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const change = useCallback((product, delta) => {
    setCart(prev => {
      const cur = prev[product.id];
      const qty = (cur?.qty ?? 0) + delta;
      const next = { ...prev };
      if (qty <= 0) delete next[product.id];
      else
        next[product.id] = {
          id: product.id,
          name: product.name,
          unit: product.unit,
          pack: product.pack,
          best_price: product.best_price,
          qty,
        };
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  return { cart, change, clear };
}
