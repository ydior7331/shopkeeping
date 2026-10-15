import { day, ft, packText, pct, unitPrice } from './format.js';
import ProductImage from './ProductImage.jsx';

export function Trend({ p }) {
  const ch = pct(p.prev_best_price, p.best_price);
  if (ch == null || Math.abs(ch) < 0.5) return null;
  const up = ch > 0;
  return (
    <span className={`trend ${up ? 'up' : 'down'}`} title={`Előtte: ${ft(p.prev_best_price)}`}>
      {up ? 'Drágult +' : 'Olcsóbb lett −'}
      {Math.round(Math.abs(ch))}% · {day(p.best_changed_on)}
    </span>
  );
}

export function Stepper({ name, qty, onAdd, onDec }) {
  if (!qty)
    return (
      <button type="button" className="add" onClick={onAdd} aria-label={`${name} a kocsiba`}>
        Kocsiba
      </button>
    );
  return (
    <div className="stepper">
      <button type="button" onClick={onDec} aria-label={`Eggyel kevesebb: ${name}`}>
        −
      </button>
      <span>{qty} db</span>
      <button type="button" onClick={onAdd} aria-label={`Eggyel több: ${name}`}>
        +
      </button>
    </div>
  );
}

export default function ProductCard({ p, chainName, qty, onAdd, onDec, onOpen, extra }) {
  const unit = unitPrice(p.best_unit_price, p.unit);
  return (
    <article className="item">
      <button type="button" className="thumb-btn" onClick={onOpen} tabIndex={-1} aria-hidden="true">
        <ProductImage ean={p.ean} />
      </button>
      <div className="item-top">
        {extra}
        {!extra && <Trend p={p} />}
        <span className={`chains-tag ${p.chain_count > 1 ? 'multi' : ''}`}>
          {p.chain_count > 1 ? `${p.chain_count} láncban` : '1 láncban'}
        </span>
      </div>
      <h3 className="item-name">
        <button type="button" className="link" onClick={onOpen}>
          {p.name}
        </button>
      </h3>
      <p className="item-qty">{packText(p.pack, p.unit)}</p>
      <div className="price-row">
        <span className="price">
          {ft(p.best_price)}
          {p.chain_count > 1 && <small className="from">-tól</small>}
        </span>
      </div>
      {unit && (
        <p className="unit">
          <span>{unit}</span>
        </p>
      )}
      <p className="meta best">Legolcsóbb: {chainName(p.best_chain)}</p>
      <Stepper name={p.name} qty={qty} onAdd={onAdd} onDec={onDec} />
    </article>
  );
}
