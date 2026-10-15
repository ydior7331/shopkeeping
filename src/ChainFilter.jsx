import { chainColor } from './format.js';

export default function ChainFilter({ chains, selected, onChange, matchAll }) {
  const set = new Set(selected);
  const all = set.size === 0;

  function toggle(id) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div className="chain-filter" role="group" aria-label="Láncok szűrése">
      <span className="chain-filter-label">Láncok</span>
      <div className="chain-chips">
        <button type="button" className={`chain-chip all ${all ? 'is-on' : ''}`} aria-pressed={all} onClick={() => onChange([])}>
          Mind megjelenítése
        </button>
        {chains.map(c => {
          const on = set.has(c.id);
          return (
            <button key={c.id} type="button" className={`chain-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggle(c.id)}>
              <span className="chain-box" style={{ '--chain': chainColor(c.id) }} aria-hidden="true">
                {on && (
                  <svg viewBox="0 0 16 16">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
              </span>
              {c.name}
            </button>
          );
        })}
      </div>
      {!all && (
        <p className="chain-filter-note">
          {set.size} lánc kiválasztva{matchAll ? ', csak a mindegyikben kapható termékek látszanak' : ''}. Az árak és a „Legolcsóbb” csak ezek közül számolnak.
        </p>
      )}
    </div>
  );
}
