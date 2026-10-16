import ChainLogo from './ChainLogo.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { az, ft } from './format.js';
import { CartSvg, Ico, ICONS } from './Icons.jsx';

export default function Basket({ cart, count, onRemove, onClear, onOpen, msg }) {
  const lines = useMemo(() => Object.values(cart), [cart]);
  const key = useMemo(() => lines.map(l => `${l.id}:${l.qty}`).sort().join(','), [lines]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setOpen(false);
    barRef.current?.focus();
  }

  function openProduct(id) {
    setOpen(false);
    onOpen(id);
  }

  useEffect(() => {
    if (!key) {
      setResult(null);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      api
        .basket(
          key.split(',').map(s => {
            const [id, qty] = s.split(':').map(Number);
            return { id, qty };
          }),
          ctl.signal,
        )
        .then(r => {
          setResult(r);
          setError(null);
        })
        .catch(e => {
          if (e.name !== 'AbortError') setError(e.message);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [key]);

  const best = result?.mix?.picks ? new Map(result.mix.picks.map(p => [p.id, p.price])) : new Map();
  const total = result?.count ?? 0;
  const stores = result?.chains ?? [];
  const complete = stores.filter(s => s.missing.length === 0);
  const max = Math.max(1, ...complete.map(s => s.total));
  const [barTitle, barSub] = !lines.length
    ? ['A kocsi', 'Még üres']
    : complete.length
      ? [`Legolcsóbb: ${complete[0].name}`, ft(complete[0].total)]
      : result?.mix
        ? ['Vegyesen a legolcsóbb', ft(result.mix.total)]
        : ['A kocsi', 'Számolás…'];

  return (
    <>
      <button type="button" ref={barRef} className="basket-bar" aria-expanded={open} aria-controls="basket-panel" onClick={() => setOpen(true)}>
        <span className="basket-bar-icon">
          <CartSvg detailed={false} />
          {count > 0 && <b>{count}</b>}
        </span>
        <span className="basket-bar-text">
          <strong>{barTitle}</strong>
          <span>{barSub}</span>
        </span>
        <span className="basket-bar-cta">Megnyitás</span>
      </button>
      {open && <div className="basket-backdrop" onClick={close} aria-hidden="true" />}
      <aside id="basket-panel" className={`basket ${open ? 'is-open' : ''}`} aria-label="Kocsi tartalma">
      <h3>
        A kocsiban <span>{count} db</span>
        <button type="button" ref={closeRef} className="icon-btn basket-close" onClick={close} aria-label="Kocsi bezárása">
          <Ico d={ICONS.close} />
        </button>
      </h3>
      {!lines.length ? (
        <p className="empty">Még üres. Tegyél bele néhány terméket, és megmutatjuk, melyik láncnál jön ki a legolcsóbban.</p>
      ) : (
        <>
          <ul className="lines">
            {lines.map(l => (
              <li key={l.id}>
                <span>
                  <b>{l.qty}×</b>{' '}
                  <button type="button" className="link" onClick={() => openProduct(l.id)}>
                    {l.name}
                  </button>
                </span>
                <span className="line-end">
                  {ft((best.get(l.id) ?? l.best_price) * l.qty)}
                  <button type="button" className="mini" onClick={() => onRemove(l.id)} aria-label={`${l.name} kivétele a kocsiból`}>
                    <Ico d={ICONS.close} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {result?.mix && (
            <p className="total">
              Legolcsóbb összeállításban <strong>{ft(result.mix.total)}</strong>
            </p>
          )}
          <h4>Hol jön ki olcsóbban?</h4>
          {error && <p className="notice error">{error}</p>}
          {!result && !error && <p className="notice">Számolás…</p>}
          {stores.map(s => {
            const isBest = complete.length > 0 && s.id === complete[0].id;
            const full = s.missing.length === 0;
            return (
              <div key={s.id} className={`store ${isBest ? 'is-best' : ''} ${full ? '' : 'partial'}`}>
                <div className="store-row">
                  <span className="chain-cell">
                    <ChainLogo name={s.name} />
                    {s.name}
                  </span>
                  <span>{ft(s.total)}</span>
                </div>
                {full && (
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${Math.round((s.total / max) * 100)}%` }} />
                  </div>
                )}
                <span className="store-tag">
                  {isBest
                    ? 'Itt a legolcsóbb'
                    : full
                      ? s.total === complete[0].total
                        ? 'Ugyanannyi'
                        : `+${ft(s.total - complete[0].total)} drágább`
                      : `${s.found}/${total} termék kapható`}
                </span>
              </div>
            );
          })}
          {result && (
            <p className="verdict">
              {complete.length ? (
                <>
                  Ezzel a kosárral {az(complete[0].name)} <strong>{complete[0].name}</strong> a legjobb: {ft(complete[0].total)}
                  {complete.length > 1 && <>, ami {ft(complete[complete.length - 1].total - complete[0].total)} megtakarítás a legdrágábbhoz képest</>}.
                </>
              ) : stores.length ? (
                <>
                  Egyik lánc sem árulja az összes terméket. A legtöbbet ({stores[0].found}/{total}) {az(stores[0].name)} <strong>{stores[0].name}</strong> kínálatában találod.
                </>
              ) : (
                <>A kosárban lévő termékek jelenleg egyik láncnál sem kaphatók.</>
              )}
            </p>
          )}
          <button type="button" className="ghost clear" onClick={onClear}>
            <Ico d={ICONS.trash} />
            Kocsi ürítése
          </button>
          <p className="fineprint">A lánconkénti legalacsonyabb bolti árral számolunk. Egy adott boltban ennél drágább is lehet.</p>
        </>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {msg}
      </p>
      </aside>
    </>
  );
}
