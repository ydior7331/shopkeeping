import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import Basket from './Basket.jsx';
import Changes from './Changes.jsx';
import { fullDay } from './format.js';
import { Ico, ICONS } from './Icons.jsx';
import ProductCard from './ProductCard.jsx';
import ProductDetail from './ProductDetail.jsx';
import { useCart } from './useCart.js';

const SORTS = [
  { id: 'auto', label: 'Ajánlott' },
  { id: 'price', label: 'Legolcsóbb elöl' },
  { id: 'unit', label: 'Egységár szerint' },
  { id: 'name', label: 'Név szerint' },
];

export default function Shop({ meta, onExit }) {
  const chains = meta?.chains ?? [];
  const names = useMemo(() => new Map(chains.map(c => [c.id, c.name])), [chains]);
  const chainName = useCallback(id => names.get(id) ?? 'ismeretlen lánc', [names]);

  const [groups, setGroups] = useState(null);
  const [groupsError, setGroupsError] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [catId, setCatId] = useState(null);
  const [view, setView] = useState('browse');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('auto');
  const [chain, setChain] = useState('');
  const [list, setList] = useState({ items: [], page: 0, hasMore: false, loading: false, error: null });
  const [detailId, setDetailId] = useState(null);
  const [msg, setMsg] = useState('');
  const [isNew, setIsNew] = useState(true);
  const { cart, change, clear } = useCart();
  const mainRef = useRef(null);
  const listCtl = useRef(null);

  useEffect(() => {
    api
      .categories()
      .then(d => {
        setGroups(d.groups);
        if (d.groups.length) {
          setGroupId(d.groups[0].id);
          setCatId(null);
        }
      })
      .catch(e => setGroupsError(e.message));
    const t = setTimeout(() => setIsNew(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const groupCats = useMemo(() => {
    const g = groups?.find(x => x.id === groupId);
    return g ? g.categories.map(c => c.id).join(',') : '';
  }, [groups, groupId]);

  const load = useCallback(
    page => {
      if (!query && catId == null && !groupCats) return;
      listCtl.current?.abort();
      const ctl = new AbortController();
      listCtl.current = ctl;
      setList(l => ({ ...l, loading: true, error: null, ...(page === 1 ? { items: [] } : {}) }));
      const params = { page, chain };
      if (query) params.q = query;
      else if (catId != null) params.cat = catId;
      else params.cats = groupCats;
      params.sort = sort === 'auto' ? (query ? 'relevance' : 'chains') : sort;
      api
        .products(params, ctl.signal)
        .then(d =>
          setList(l => ({
            items: page === 1 ? d.items : [...l.items, ...d.items],
            page,
            hasMore: d.hasMore,
            loading: false,
            error: null,
          })),
        )
        .catch(e => {
          if (e.name !== 'AbortError') setList(l => ({ ...l, loading: false, error: e.message }));
        });
    },
    [query, catId, groupCats, sort, chain],
  );

  useEffect(() => {
    if (view !== 'browse') return;
    load(1);
    mainRef.current?.scrollTo?.(0, 0);
  }, [load, view]);

  useEffect(() => {
    if (query) {
      setView('browse');
      setDetailId(null);
    }
  }, [query]);

  const group = groups?.find(g => g.id === groupId) ?? null;
  const cat = group?.categories.find(c => c.id === catId) ?? null;
  const count = Object.values(cart).reduce((s, l) => s + l.qty, 0);

  function pickGroup(g) {
    setGroupId(g.id);
    setCatId(null);
    setInput('');
    setQuery('');
    setView('browse');
    setDetailId(null);
  }

  function pickCat(c) {
    setCatId(c ? c.id : null);
    setInput('');
    setQuery('');
    setView('browse');
    setDetailId(null);
  }

  function add(p) {
    change(p, 1);
    setMsg(`${p.name}: ${(cart[p.id]?.qty ?? 0) + 1} db a kocsiban`);
  }

  function dec(p) {
    change(p, -1);
    setMsg(`${p.name}: ${Math.max(0, (cart[p.id]?.qty ?? 0) - 1)} db a kocsiban`);
  }

  function remove(id) {
    const line = cart[id];
    if (line) change(line, -line.qty);
  }

  function open(id) {
    setDetailId(id);
    mainRef.current?.scrollTo?.(0, 0);
  }

  let main;
  if (detailId != null) {
    main = (
      <ProductDetail
        id={detailId}
        chainName={chainName}
        lastDay={meta?.lastImport?.day}
        qty={cart[detailId]?.qty ?? 0}
        onAdd={add}
        onDec={dec}
        onBack={() => setDetailId(null)}
      />
    );
  } else if (view === 'changes') {
    main = <Changes chainName={chainName} cart={cart} onAdd={add} onDec={dec} onOpen={open} />;
  } else {
    main = (
      <>
        {groups && (
          <div className="mobile-pick">
            <label className="select">
              <span>Csoport</span>
              <select value={groupId ?? ''} onChange={e => pickGroup(groups.find(g => g.id === e.target.value))}>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            {group && (
              <label className="select">
                <span>Alkategória</span>
                <select value={catId ?? ''} onChange={e => pickCat(e.target.value ? { id: Number(e.target.value) } : null)}>
                  <option value="">Összes ({group.product_count})</option>
                  {group.categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.product_count})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        <p className="crumb">
          {query ? (
            `Keresés: „${query}”`
          ) : group ? (
            <>
              {group.name} › {cat ? cat.name : 'Összes'}
              {cat && (
                <button type="button" className="crumb-reset" onClick={() => pickCat(null)} aria-label="Alkategória szűrés törlése">
                  <Ico d={ICONS.close} />
                </button>
              )}
            </>
          ) : (
            ' '
          )}
        </p>
        <div className="toolbar">
          <label className="select">
            <span>Rendezés</span>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              {SORTS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="select">
            <span>Lánc</span>
            <select value={chain} onChange={e => setChain(e.target.value)}>
              <option value="">Mind</option>
              {chains.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {list.error && <p className="notice error">{list.error}</p>}
        {!list.loading && !list.error && list.page > 0 && !list.items.length && (
          <p className="notice">{query ? 'Nincs találat. Próbálj rövidebb vagy más keresőszót.' : 'Ebben a kategóriában most nincs termék.'}</p>
        )}
        <div className="grid">
          {list.items.map(p => (
            <ProductCard
              key={p.id}
              p={p}
              chainName={chainName}
              qty={cart[p.id]?.qty ?? 0}
              onAdd={() => add(p)}
              onDec={() => dec(p)}
              onOpen={() => open(p.id)}
            />
          ))}
        </div>
        {list.loading && <p className="notice">Betöltés…</p>}
        {list.hasMore && !list.loading && (
          <button type="button" className="ghost more" onClick={() => load(list.page + 1)}>
            Több termék
          </button>
        )}
      </>
    );
  }

  return (
    <div className="shop">
      <section className={`modal ${isNew ? 'is-new' : ''}`} role="dialog" aria-labelledby="ask-title">
        <header className="m-head">
          <div>
            <p className="eyebrow">
              Bent vagy a boltban · {count} db a kocsiban
              {meta?.lastImport && ` · árak: ${fullDay(meta.lastImport.day)}`}
            </p>
            <h2 id="ask-title">Mit szeretnél venni?</h2>
          </div>
          <div className="m-actions">
            <label className="search">
              <Ico d={ICONS.search} />
              <input type="search" placeholder="Keresés, pl. trappista, Mizo tej…" value={input} onChange={e => setInput(e.target.value)} aria-label="Termék keresése" />
            </label>
            <button
              type="button"
              className={`ghost ${view === 'changes' && detailId == null ? 'is-on' : ''}`}
              onClick={() => {
                setView('changes');
                setDetailId(null);
                setInput('');
                setQuery('');
              }}
            >
              <Ico d={ICONS.trend} />
              Mi drágult?
            </button>
            <button type="button" className="icon-btn" onClick={onExit} aria-label="Kilépés a boltból">
              <Ico d={ICONS.close} />
            </button>
          </div>
        </header>
        <div className="m-body">
          <nav className="cats" aria-label="Kategóriák">
            {groupsError && <p className="notice error">{groupsError}</p>}
            {!groups && !groupsError && <p className="notice">Betöltés…</p>}
            {groups?.map(g => {
              const browsing = !query && view === 'browse';
              const on = g.id === groupId && browsing;
              const opened = g.id === groupId;
              return (
                <div key={g.id} className="grp">
                  <button type="button" className={`cat ${on ? 'is-on' : ''}`} aria-expanded={opened} aria-controls={`sub-${g.id}`} onClick={() => pickGroup(g)}>
                    <Ico d={g.icon} />
                    <span className="cat-name">{g.name}</span>
                    <span className="cat-count">
                      {g.categories.length} kategória · {g.product_count} termék
                    </span>
                  </button>
                  <div className={`sub-wrap ${opened ? 'open' : ''}`} id={`sub-${g.id}`}>
                    <div className="sub-inner">
                      <ul className="sub-list">
                        <li>
                          <button
                            type="button"
                            className={`sub-btn is-all ${on && catId == null ? 'is-current' : ''}`}
                            aria-current={on && catId == null ? 'true' : undefined}
                            tabIndex={opened ? 0 : -1}
                            onClick={() => pickCat(null)}
                          >
                            <span className="sub-name">Összes</span>
                            <span className="sub-cnt">{g.product_count}</span>
                          </button>
                        </li>
                        {g.categories.map(c => {
                          const cur = on && c.id === catId;
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                className={`sub-btn ${cur ? 'is-current' : ''}`}
                                aria-current={cur ? 'true' : undefined}
                                tabIndex={opened ? 0 : -1}
                                title={c.name}
                                onClick={() => pickCat(c)}
                              >
                                <span className="sub-name">{c.name}</span>
                                <span className="sub-cnt">{c.product_count}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="main" ref={mainRef}>
            {main}
          </div>
          <Basket cart={cart} count={count} onRemove={remove} onClear={clear} onOpen={open} msg={msg} />
        </div>
      </section>
    </div>
  );
}
