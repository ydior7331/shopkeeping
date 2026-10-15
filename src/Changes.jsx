import { useEffect, useState } from 'react';
import { api } from './api.js';
import { day, ft, num } from './format.js';
import ProductCard from './ProductCard.jsx';

export default function Changes({ chainName, cart, onAdd, onDec, onOpen }) {
  const [dir, setDir] = useState('up');
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctl = new AbortController();
    setData(null);
    setError(null);
    api
      .changes({ dir, days }, ctl.signal)
      .then(setData)
      .catch(e => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => ctl.abort();
  }, [dir, days]);

  return (
    <>
      <p className="crumb">
        Árváltozások
        {data?.since && ` · ${day(data.since)} – ${day(data.until)}`}
      </p>
      <div className="subs">
        <button type="button" className={`sub ${dir === 'up' ? 'is-on' : ''}`} aria-pressed={dir === 'up'} onClick={() => setDir('up')}>
          Mi drágult?
        </button>
        <button type="button" className={`sub ${dir === 'down' ? 'is-on' : ''}`} aria-pressed={dir === 'down'} onClick={() => setDir('down')}>
          Mi lett olcsóbb?
        </button>
      </div>
      <div className="toolbar">
        <label className="select">
          <span>Időszak</span>
          <select value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={1}>Utolsó nap</option>
            <option value={7}>Utolsó 7 nap</option>
            <option value={30}>Utolsó 30 nap</option>
            <option value={90}>Utolsó 90 nap</option>
          </select>
        </label>
      </div>
      {error && <p className="notice error">{error}</p>}
      {!data && !error && <p className="notice">Betöltés…</p>}
      {data && !data.items.length && (
        <p className="notice">
          Ebben az időszakban még nincs {dir === 'up' ? 'drágulás' : 'árcsökkenés'}. Az árváltozásokat naponta rögzítjük, a lista a következő frissítésekkel telik meg.
        </p>
      )}
      {data && data.items.length > 0 && (
        <div className="grid">
          {data.items.map(it => (
            <ProductCard
              key={`${it.id}-${it.chain_id}-${it.day}`}
              p={it}
              chainName={chainName}
              qty={cart[it.id]?.qty ?? 0}
              onAdd={() => onAdd(it)}
              onDec={() => onDec(it)}
              onOpen={() => onOpen(it.id)}
              extra={
                <span className={`trend ${it.pct > 0 ? 'up' : 'down'}`} title={`${chainName(it.chain_id)}: ${ft(it.old_price)} → ${ft(it.new_price)}`}>
                  {it.pct > 0 ? '+' : '−'}
                  {num(Math.abs(it.pct))}% · {chainName(it.chain_id)} · {day(it.day)}
                </span>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
