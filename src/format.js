const whole = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 });

export function ft(n) {
  return n == null ? '–' : `${whole.format(Math.round(n))} Ft`;
}

export function num(n) {
  return dec.format(n);
}

export function packText(pack, unit) {
  if (pack == null || !unit) return '';
  if (unit === 'kg' && pack < 1) return `${num(Math.round(pack * 1000))} g`;
  if (unit === 'l' && pack < 1) return `${num(Math.round(pack * 1000))} ml`;
  return `${num(pack)} ${unit}`;
}

export function unitPrice(price, unit) {
  return price == null || !unit ? null : `${ft(price)}/${unit}`;
}

export function pct(a, b) {
  if (a == null || b == null || !a) return null;
  return ((b - a) / a) * 100;
}

export function day(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

export function fullDay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function calm() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const CHAIN_COLORS = ['#13241B', '#3E7CC0', '#C23B12', '#1F7A4C', '#E8893A', '#7B5EA7', '#B8961E', '#2A9D8F', '#8A2C0B', '#5E7E68', '#D16BA5'];

export function chainColor(id) {
  return CHAIN_COLORS[id % CHAIN_COLORS.length];
}

export function az(word) {
  return /^[aáeéiíoóöőuúüű]/i.test(word ?? '') ? 'az' : 'a';
}
