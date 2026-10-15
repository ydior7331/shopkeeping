# Kosárár – Mi mennyibe kerül a boltban?

Árösszehasonlító a GVH Árfigyelő napi adataiból. Kereshetsz a termékek között, megnézheted az ártörténetüket és azt, hogy mi drágult. A kosaradról megmutatja, melyik boltláncnál jön ki a legolcsóbban.

## Felépítés

| Rész | Hol | Mit csinál |
|---|---|---|
| Frontend | `index.html`, `src/` | React + Vite, a „Szupermarket” dizájn (`src/style.css`) |
| API | `worker/index.js` | Cloudflare Worker, `/api/*` végpontok, a többi kérést a statikus fájlok szolgálják ki (`dist/`) |
| Adatbázis | `migrations/` | Cloudflare D1 (`kosarar`), FTS5 kereséssel |
| Import | `scripts/` | Letölti a napi xlsx-et, összeveti a meglévő adatokkal, és csak a változásokat írja be |
| Ütemezés | `.github/workflows/import.yml` | GitHub Actions, kétóránként fut, és kihagyja a futást, ha az aznapi adat már bent van |

### API

- `GET /api/meta`: a láncok listája és az utolsó import napja
- `GET /api/categories`: főcsoportok, bennük az Árfigyelő kategóriái
- `GET /api/products?cat=&q=&chain=&sort=&page=`: termékek egy kategóriából vagy keresésből
- `GET /api/product/:id`: lánconkénti árak és az ártörténet
- `POST /api/basket`: `{ items: [{ id, qty }] }`, a kosár végösszege láncokra bontva
- `GET /api/changes?days=7&dir=up|down`: mi drágult, mi lett olcsóbb

### Adatmodell

- `prices`: a mai ár lánconként (termék × lánc), és hogy mióta érvényes
- `price_history`: lezárt időszakok; ide csak akkor kerül sor, ha változott az ár
- `price_changes`: napi változásnapló a „Mi drágult?” nézethez
- `products`: a terméklista, a legolcsóbb ár és lánc előre kiszámolva

A D1 ingyenes kerete napi 100 ezer sorírás. Az első import kb. 50 ezer sort ír, utána naponta csak a változások kerülnek be.

## Helyi futtatás

```bash
npm install
npm run db:migrate:local
node scripts/import.mjs --file arfigyelo_napi_termekadatok.xlsx --fresh --out seed.local.sql
npx wrangler d1 execute kosarar --local --file seed.local.sql
npm run preview
```

Ezután az oldal a http://localhost:8787 címen érhető el. Frontendfejlesztéshez az `npm run dev:api` és az `npm run dev` párhuzamosan is futtatható. Ilyenkor a Vite a `/api` kéréseket a Workerhez továbbítja.

## Telepítés

- **Weboldal és API:** a Workers Builds minden `main` ágra küldött módosítást kitelepít. Build parancs: `npm run build`, deploy parancs: `npx wrangler deploy`.
- **Napi import:** a GitHub Actions a `CLOUDFLARE_D1_TOKEN` repo-secrettel ír a D1-be. A tokenhez *Account → D1 → Edit* jogosultság kell. Kézi futtatás: **Actions → Napi árimport → Run workflow**.
- **Új migráció:** `npm run db:migrate` (bejelentkezett `wrangler` kell hozzá).

Forrás: [GVH Árfigyelő](https://arfigyelo.gvh.hu). Az árak lánconként a legalacsonyabb és legmagasabb bolti árat mutatják, ezért egy adott boltban eltérhetnek.
