import { unzipSync, strFromU8 } from 'fflate';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function unescapeXml(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
}

function textOf(xml) {
  let out = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1];
  return unescapeXml(out);
}

function colIndex(ref) {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

export function readXlsx(bytes) {
  const files = unzipSync(bytes, {
    filter: f => f.name === 'xl/sharedStrings.xml' || f.name === 'xl/workbook.xml' || f.name === 'xl/worksheets/sheet1.xml',
  });
  const strings = [];
  const sst = files['xl/sharedStrings.xml'];
  if (sst) for (const m of strFromU8(sst).matchAll(/<si>([\s\S]*?)<\/si>/g)) strings.push(textOf(m[1]));

  const workbook = strFromU8(files['xl/workbook.xml']);
  const sheetName = unescapeXml(workbook.match(/<sheet\s[^>]*name="([^"]*)"/)?.[1] ?? '');

  const rows = [];
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  for (const rm of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const body = cm[2] ?? '';
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const idx = ref ? colIndex(ref) : row.length;
      let value = '';
      if (type === 's') value = strings[Number(body.match(/<v>([^<]*)<\/v>/)?.[1])] ?? '';
      else if (type === 'inlineStr') value = textOf(body);
      else value = unescapeXml(body.match(/<v>([^<]*)<\/v>/)?.[1] ?? '');
      row[idx] = value;
    }
    rows.push(row);
  }
  return { sheetName, rows };
}

const HEADERS = {
  ean: 'Termék azonosító',
  name: 'Termék név',
  catId: 'Kategória azonosító',
  catName: 'Kategória név',
  chain: 'Üzletlánc név',
  unit: 'Egység',
  pack: 'Kiszerelés',
  minPrice: 'Minimum ár',
  maxPrice: 'Maximum ár',
  minUnit: 'Minimum egységár',
  maxUnit: 'Maximum egységár',
  stores: 'Hány boltban elérhető',
  chainStores: 'Üzletlánc összes boltja',
};

function num(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return n == null ? null : Math.round(n * 100) / 100;
}

export function parseArfigyelo(bytes) {
  const { sheetName, rows } = readXlsx(bytes);
  const header = rows[0].map(h => (h ?? '').trim());
  const col = {};
  for (const [key, label] of Object.entries(HEADERS)) {
    const i = header.indexOf(label);
    if (i < 0) throw new Error(`Hiányzó oszlop: ${label}`);
    col[key] = i;
  }
  const date = sheetName.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const ean = (row[col.ean] ?? '').trim();
    const chain = (row[col.chain] ?? '').trim();
    if (!ean || !chain) continue;
    out.push({
      ean,
      name: (row[col.name] ?? '').replace(/\s+/g, ' ').trim(),
      catId: Number((row[col.catId] ?? '').trim()) || null,
      catName: (row[col.catName] ?? '').trim(),
      chain,
      unit: (row[col.unit] ?? '').trim() || null,
      pack: num(row[col.pack]),
      minPrice: round2(num(row[col.minPrice])),
      maxPrice: round2(num(row[col.maxPrice])),
      minUnit: round2(num(row[col.minUnit])),
      maxUnit: round2(num(row[col.maxUnit])),
      stores: num(row[col.stores]),
      chainStores: num(row[col.chainStores]),
    });
  }
  return { date, sheetName, rows: out };
}
