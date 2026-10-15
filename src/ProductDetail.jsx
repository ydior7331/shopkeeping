import { useEffect, useState } from 'react';
import { api } from './api.js';
import { chainColor, day, ft, fullDay, packText, unitPrice } from './format.js';
import { Ico, ICONS } from './Icons.jsx';
import { Stepper, Trend } from './ProductCard.jsx';

function toMs(iso) {
  return Date.parse(`${iso}T00:00:00Z`);
}

function History({ prices, history, lastDay, chainName }) {
  const end = lastDay ?? prices.reduce((m, p) => (p.valid_from > m ? p.valid_from : m), '');
  const segs = [
    ...history.map(h => ({ chain: h.chain_id, from: h.valid_from, to: h.valid_to, price: h.min_price })),
    ...prices.map(p => ({ chain: p.chain_id, from: p.valid_from, to: end, price: p.min_price })),
  ];
  const start = segs.reduce((m, s) => (s.from < m ? s.from : m), end);
  if (!history.length || start >= end) return null;

  const W = 480;
  const H = 220;
  const L = 74;
  const R = 12;
  const T = 12;
  const B = 30;
  const x0 = toMs(start);
  const x1 = toMs(end);
  const vals = segs.map(s => s.price);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.12;
  lo = Math.max(0, lo - pad);
  hi += pad;
  const sx = ms => L + ((ms - x0) / (x1 - x0)) * (W - L - R);
  const sy = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

  const byChain = new Map();
  for (const s of segs) {
    const list = byChain.get(s.chain) ?? [];
    list.push(s);
    byChain.set(s.chain, list);
  }
  const ticks = [lo, (lo + hi) / 2, hi];

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ártörténet láncok szerint">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} className="grid-line" />
            <text x={L - 8} y={sy(t) + 4} textAnchor="end" className="axis">
              {ft(t)}
            </text>
          </g>
        ))}
        <text x={L} y={H - 8} className="axis">
          {day(start)}
        </text>
        <text x={W - R} y={H - 8} textAnchor="end" className="axis">
          {day(end)}
        </text>
        {[...byChain.entries()].map(([chain, list]) => {
          const sorted = list.sort((a, b) => a.from.localeCompare(b.from));
          let d = '';
          let prevTo = null;
          for (const s of sorted) {
            const xa = sx(toMs(s.from));
            const xb = sx(toMs(s.to));
            const y = sy(s.price);
            d += prevTo === s.from ? `L${xa},${y}` : `M${xa},${y}`;
            d += `L${Math.max(xb, xa + 2)},${y}`;
            prevTo = s.to;
          }
          return (
            <g key={chain}>
              <path d={d} fill="none" stroke={chainColor(chain)} strokeWidth="3" strokeLinejoin="round" />
              {sorted.map(s => (
                <circle key={s.from} cx={sx(toMs(s.from))} cy={sy(s.price)} r="4" fill={chainColor(chain)}>
                  <title>{`${chainName(chain)}: ${ft(s.price)} (${day(s.from)})`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        {[...byChain.keys()].map(c => (
          <span key={c}>
            <i style={{ background: chainColor(c) }} />
            {chainName(c)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export default function ProductDetail({ id, chainName, lastDay, qty, onAdd, onDec, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctl = new AbortController();
    setData(null);
    setError(null);
    api
      .product(id, ctl.signal)
      .then(setData)
      .catch(e => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => ctl.abort();
  }, [id]);

  return (
    <div className="detail">
      <button type="button" className="ghost back" onClick={onBack}>
        <Ico d={ICONS.back} />
        Vissza
      </button>
      {error && <p className="notice error">{error}</p>}
      {!data && !error && <p className="notice">Betöltés…</p>}
      {data && (
        <>
          <p className="crumb">{data.product.category_name}</p>
          <div className="detail-head">
            <div>
              <h3 className="detail-name">{data.product.name}</h3>
              <p className="item-qty">
                {packText(data.product.pack, data.product.unit)} · EAN {data.product.ean}
              </p>
              <div className="item-top">
                <Trend p={data.product} />
              </div>
            </div>
            <div className="detail-buy">
              <span className="price">{ft(data.product.best_price)}</span>
              <Stepper name={data.product.name} qty={qty} onAdd={() => onAdd(data.product)} onDec={() => onDec(data.product)} />
            </div>
          </div>

          {data.prices.length ? (
            <table className="chain-table">
              <thead>
                <tr>
                  <th>Lánc</th>
                  <th>Ár</th>
                  <th>Egységár</th>
                  <th>Boltok</th>
                </tr>
              </thead>
              <tbody>
                {data.prices.map((p, i) => (
                  <tr key={p.chain_id} className={i === 0 ? 'is-best' : ''}>
                    <td>
                      <i className="dot" style={{ background: chainColor(p.chain_id) }} />
                      {chainName(p.chain_id)}
                    </td>
                    <td>
                      <strong>{ft(p.min_price)}</strong>
                      {p.max_price != null && p.max_price !== p.min_price && <span className="range"> – {ft(p.max_price)}</span>}
                    </td>
                    <td>{unitPrice(p.min_unit_price, data.product.unit) ?? '–'}</td>
                    <td>{p.stores ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="notice">Ez a termék jelenleg egyik láncnál sem szerepel.</p>
          )}

          <h4 className="section-title">Ártörténet</h4>
          <History prices={data.prices} history={data.history} lastDay={lastDay} chainName={chainName} />
          {!data.history.length && (
            <p className="notice">
              Még nem változott az ára. Az árakat {fullDay(data.prices[0]?.valid_from)} óta követjük.
            </p>
          )}
          <p className="fineprint">
            Az árak lánconként a legalacsonyabb és legmagasabb bolti árat mutatják. Forrás: GVH Árfigyelő.
          </p>
        </>
      )}
    </div>
  );
}
