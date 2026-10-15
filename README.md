# Kosárár – Mi mennyibe kerül a boltban?

Árösszehasonlító kalkulátor: a gyakran vásárolt termékek árát követi, megmutatja, mi drágult, és melyik boltban (Lidl / Tesco / Spar) jön ki olcsóbban a kosarad.

Statikus weboldal, build lépés nélkül:

- `public/index.html` – az oldal
- `public/style.css` – a „Szupermarket” dizájn
- `public/app.js` – a logika és a tesztadatok
- `wrangler.jsonc` – Cloudflare Workers beállítás

## Helyi futtatás

Bármilyen statikus szerverrel, például:

```bash
npx serve public
```

## Telepítés Cloudflare-re

A Cloudflare irányítópulton: **Workers & Pages → Create → Import a repository**, válaszd ki a `shopkeeping` repót.
Build parancs nem kell, deploy parancs: `npx wrangler deploy`.
Ezután minden `main` ágra küldött módosítás automatikusan kikerül.

Az árak jelenleg tesztadatok.
