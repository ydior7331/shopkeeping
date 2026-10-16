# Kosárár: mi mennyibe kerül a boltban?

Árösszehasonlító a GVH Árfigyelő napi adataiból. Kereshetsz a termékek között, megnézheted az ártörténetüket és azt, hogy mi drágult. A kosaradról megmutatja, melyik boltláncnál jön ki a legolcsóbban.

Élő oldal: https://shop.ydr1337.xyz

## Funkciók

- **Bolt-élmény:** a kezdőképernyőn ki kell húzni a bevásárlókocsit, utána nyílik a bolt.
- **Kategóriák:** az Árfigyelő 161 kategóriája 12 főcsoportba rendezve.
- **Keresés:** ékezet nélkül is működik, például a `turo` megtalálja a túrót.
- **Termékkártyák:** képpel, a legolcsóbb árral és lánccal, egységárral, és azzal, hogy hány láncban kapható.
- **Akciók:** AKCIÓ címke áthúzott eredeti árral, a hűségkártyás ár külön sorban, és egy „Csak akciós és kártyás” kapcsoló.
- **Láncszűrő:** több lánc kijelölhető egyszerre, és bekapcsolható, hogy csak a mindegyikben kapható termékek látszódjanak.
- **Terméklap:** lánconkénti árak, boltszám és ártörténet-grafikon.
- **Mi drágult?:** a legnagyobb drágulások és árcsökkenések az elmúlt 1, 7, 30 vagy 90 napban.
- **Kosár:** a böngészőben marad meg. Megmutatja a végösszeget láncokra bontva, és hogy melyik lánc árulja az összes terméket.

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

A GET válaszokat a Worker 15 percig gyorsítótárban tartja, hogy kevesebb D1-olvasás legyen.

### Adatmodell

- `prices`: a mai ár lánconként (termék × lánc), és hogy mióta érvényes
- `price_history`: lezárt időszakok; ide csak akkor kerül sor, ha változott az ár
- `price_changes`: napi változásnapló a „Mi drágult?” nézethez
- `products`: a terméklista, a legolcsóbb ár és lánc előre kiszámolva
- `imports`: melyik napot mikor töltöttük be

A D1 ingyenes kerete napi 100 ezer sorírás. Az első import kb. 50 ezer sort írt, utána naponta csak a változások kerülnek be.

## Adatforrás

- **Árak:** `https://cdnarfigyeloprodweu.azureedge.net/excel/arfigyelo_napi_termekadatok.xlsx`. Naponta egyszer frissül, a munkalap nevében benne van a nap dátuma.
- **Akciós és kártyás árak:** a GVH Árfigyelő weboldalának saját API-jából (`/api/products-by-category/{kategória}?limit=48&offset=…`), mind a 161 kategória végiglapozásával (kb. 350 kérés, 1,5 perc). Az xlsx minimum ára már az akciós ár, ebből derül ki a normál ár és az akció ténye. A hűségkártyás ár nincs benne az xlsx-ben. Ha az API nem érhető el, az import ettől még lefut, csak a jelölések nem frissülnek.
- **Termékképek:** a GVH CDN-jéről, a termék azonosítója alapján: `https://cdnarfigyeloprodweu.azureedge.net/images/product-image-{EAN}.jpg`. A termékek kb. 98%-ához van kép, a többinél egy kosárikon jelenik meg.
- **Azonosítók:** a legtöbb termék EAN-t kap, de az Aldi, a Lidl, a Penny és a Spar egy részénél saját azonosító áll, például `aldi-106896`.
- **Kimaradó láncok:** ha egy lánc egy nap teljesen kimarad a fájlból, az árai megmaradnak, és nem számítanak eltűntnek.

## Miért GitHub Actions?

A Workers ingyenes csomagjában egy időzített futás csak 10 ms CPU-időt kaphat, a kibontott napi fájl pedig kb. 10,5 MB XML. Ezért a GitHub Actions dolgozza fel, és a D1 REST API-n keresztül írja be.

## Helyi futtatás

```bash
npm install
npm run db:migrate:local
node scripts/import.mjs --file arfigyelo_napi_termekadatok.xlsx --fresh --out seed.local.sql
npx wrangler d1 execute kosarar --local --file seed.local.sql
npm run preview
```

Ezután az oldal a http://localhost:8787 címen érhető el. Frontendfejlesztéshez az `npm run dev:api` és az `npm run dev` párhuzamosan is futtatható. Ilyenkor a Vite a `/api` kéréseket a Workerhez továbbítja.

Az importáló kapcsolói:

- `--file <útvonal>`: helyi xlsx a letöltés helyett
- `--fresh`: üres adatbázisból indul, nem olvassa a D1-et
- `--out <fájl>`: a változásokat SQL-fájlba írja ahelyett, hogy végrehajtaná
- `--dry-run`: csak kiírja, mi változna
- `--force`: akkor is lefut, ha az aznapi adat már be van töltve (régebbi napot soha nem tölt be)
- `--no-promos`: kihagyja a GVH API-t, az akciós jelölések nem frissülnek

## Telepítés

- **Weboldal és API:** a Workers Builds minden `main` ágra küldött módosítást kitelepít. Build parancs: `npm run build`, deploy parancs: `npx wrangler deploy`.
- **Napi import:** a GitHub Actions a `CLOUDFLARE_D1_TOKEN` repo-secrettel ír a D1-be. A tokenhez *Account → D1 → Edit* jogosultság kell. Kézi futtatás: **Actions → Napi árimport → Run workflow**.
- **Új migráció:** `npm run db:migrate` (bejelentkezett `wrangler` kell hozzá).

Forrás: [GVH Árfigyelő](https://arfigyelo.gvh.hu). Az árak lánconként a legalacsonyabb és legmagasabb bolti árat mutatják, ezért egy adott boltban eltérhetnek.
