(function () {
  'use strict';

  var STORES = ['Lidl', 'Tesco', 'Spar'];
  var DATA = [
    { id: 'tej', name: 'Tejtermék', icon: 'M8 2h8M9 2v4l-3 4v12h12V10l-3-4V2M6 14h12', subs: [
      { id: 'tejek', name: 'Tejek', items: [
        { id: 'tej1', n: 'Mizo félzsíros tej 2,8%', q: '1 l', amt: 1, bu: 'l', p: 389, sale: 0, prev: 349, st: [379, 389, 409] },
        { id: 'tej2', n: 'Riska laktózmentes tej 1,5%', q: '1 l', amt: 1, bu: 'l', p: 459, sale: 399, prev: 459, st: [429, 399, 479] } ] },
      { id: 'kefir', name: 'Kefirek', items: [
        { id: 'kef1', n: 'Mizo kefir 2,8%', q: '450 g', amt: 0.45, bu: 'kg', p: 329, sale: 0, prev: 299, st: [319, 329, 349] } ] },
      { id: 'joghurt', name: 'Joghurtok', items: [
        { id: 'jog1', n: 'Görög joghurt 10%', q: '400 g', amt: 0.4, bu: 'kg', p: 649, sale: 499, prev: 599, st: [549, 499, 679] },
        { id: 'jog2', n: 'Danone natúr joghurt', q: '140 g', amt: 0.14, bu: 'kg', p: 179, sale: 0, prev: 179, st: [169, 179, 199] } ] },
      { id: 'sajt', name: 'Sajtok', items: [
        { id: 'saj1', n: 'Trappista sajt, szeletelt', q: '200 g', amt: 0.2, bu: 'kg', p: 899, sale: 0, prev: 799, st: [849, 899, 949] } ] }
    ] },
    { id: 'pek', name: 'Pékáru', icon: 'M5 10a3 3 0 0 1 0-6h14a3 3 0 0 1 0 6v10H5zM9 13v4M15 13v4', subs: [
      { id: 'kenyer', name: 'Kenyerek', items: [
        { id: 'ken1', n: 'Fehér kenyér', q: '1 kg', amt: 1, bu: 'kg', p: 649, sale: 0, prev: 599, st: [599, 649, 699] },
        { id: 'ken2', n: 'Teljes kiőrlésű kenyér', q: '500 g', amt: 0.5, bu: 'kg', p: 549, sale: 0, prev: 549, st: [529, 549, 589] } ] },
      { id: 'peksuti', name: 'Péksütemények', items: [
        { id: 'pek1', n: 'Vajas kifli', q: '60 g', amt: 0.06, bu: 'kg', p: 59, sale: 0, prev: 49, st: [55, 59, 69] },
        { id: 'pek2', n: 'Kakaós csiga', q: '90 g', amt: 0.09, bu: 'kg', p: 299, sale: 249, prev: 279, st: [259, 249, 319] } ] }
    ] },
    { id: 'ital', name: 'Italok', icon: 'M10 2h4v4l2 3v13H8V9l2-3zM8 14h8', subs: [
      { id: 'udito', name: 'Üdítők', items: [
        { id: 'udi1', n: 'Coca-Cola', q: '1,75 l', amt: 1.75, bu: 'l', p: 749, sale: 579, prev: 699, st: [699, 579, 789] },
        { id: 'udi2', n: 'Fanta narancs', q: '1,75 l', amt: 1.75, bu: 'l', p: 699, sale: 0, prev: 649, st: [649, 699, 729] } ] },
      { id: 'viz', name: 'Ásványvizek', items: [
        { id: 'viz1', n: 'Szentkirályi szénsavmentes', q: '1,5 l', amt: 1.5, bu: 'l', p: 169, sale: 0, prev: 159, st: [159, 169, 189] } ] },
      { id: 'gyle', name: 'Gyümölcslevek', items: [
        { id: 'gyl1', n: 'Hohes C narancslé 100%', q: '1 l', amt: 1, bu: 'l', p: 949, sale: 799, prev: 899, st: [899, 799, 999] } ] }
    ] },
    { id: 'zold', name: 'Zöldség-gyümölcs', icon: 'M12 7c-3-2-8-1-8 5s4 10 6 10c1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 6-4 6-10s-5-7-8-5zM12 7c0-2 1-4 3-5', subs: [
      { id: 'gyum', name: 'Gyümölcsök', items: [
        { id: 'gyu1', n: 'Banán', q: '1 kg', amt: 1, bu: 'kg', p: 649, sale: 0, prev: 599, st: [599, 649, 699] },
        { id: 'gyu2', n: 'Jonagold alma', q: '1 kg', amt: 1, bu: 'kg', p: 499, sale: 399, prev: 449, st: [449, 399, 529] } ] },
      { id: 'zoldseg', name: 'Zöldségek', items: [
        { id: 'zol1', n: 'Burgonya, hálós', q: '2 kg', amt: 2, bu: 'kg', p: 799, sale: 0, prev: 699, st: [749, 799, 849] },
        { id: 'zol2', n: 'Paradicsom', q: '1 kg', amt: 1, bu: 'kg', p: 1299, sale: 0, prev: 1399, st: [1199, 1299, 1399] } ] }
    ] },
    { id: 'hus', name: 'Hús', icon: 'M15 3a6 6 0 0 1 6 6c0 4-4 6-7 6l-4 4a2 2 0 1 1-3-3l4-4c0-3 1-9 4-9z', subs: [
      { id: 'barom', name: 'Baromfi', items: [
        { id: 'bar1', n: 'Csirkemellfilé', q: '1 kg', amt: 1, bu: 'kg', p: 2899, sale: 2399, prev: 2699, st: [2599, 2399, 3099] } ] },
      { id: 'serte', name: 'Sertés', items: [
        { id: 'ser1', n: 'Sertéskaraj, csont nélkül', q: '1 kg', amt: 1, bu: 'kg', p: 3299, sale: 0, prev: 2999, st: [3199, 3299, 3499] } ] }
    ] },
    { id: 'haz', name: 'Háztartás', icon: 'M9 9h6v13H9zM10 9V5h4v4M14 5h4l-1-2', subs: [
      { id: 'mosog', name: 'Mosogatószerek', items: [
        { id: 'mos1', n: 'Jar mosogatószer, citrom', q: '450 ml', amt: 0.45, bu: 'l', p: 899, sale: 699, prev: 849, st: [849, 699, 949] } ] },
      { id: 'papir', name: 'Papíráru', items: [
        { id: 'pap1', n: 'Toalettpapír, 3 rétegű', q: '16 tekercs', amt: 16, bu: 'tekercs', p: 2799, sale: 0, prev: 2599, st: [2699, 2799, 2999] } ] }
    ] }
  ];

  var ALL = {};
  DATA.forEach(function (c) { c.subs.forEach(function (s) { s.items.forEach(function (it) { ALL[it.id] = it; }); }); });

  var state = { stage: 'door', cat: 'tej', sub: 'tejek', cart: {} };
  var app = document.getElementById('app');
  var timer = null;

  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft'; }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function ico(d) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"></path></svg>'; }
  function calm() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  var CART_SVG = '<svg class="cart-ico" viewBox="0 0 120 100" aria-hidden="true"><path d="M4 12h16l14 56h64l14-42H24"></path><path class="thin" d="M28 40h80M32 54h72M48 26v42M66 26v42M84 26v42"></path><circle cx="40" cy="84" r="8"></circle><circle cx="92" cy="84" r="8"></circle></svg>';

  function shelf(colors) {
    return '<div class="shelf">' + colors.split(' ').map(function (c) { return '<span class="' + c + '"></span>'; }).join('') + '</div>';
  }

  function doorView() {
    var cls = state.stage === 'pulled' ? 'is-pulled' : '';
    return '<div class="scene ' + cls + '">' +
      '<div class="brand"><svg class="cart-ico" viewBox="0 0 120 100" aria-hidden="true"><path d="M4 12h16l14 56h64l14-42H24"></path><circle cx="40" cy="84" r="8"></circle><circle cx="92" cy="84" r="8"></circle></svg><span>Kosárár</span></div>' +
      '<h1 class="hero-title">Mi mennyibe kerül a boltban?</h1>' +
      '<p class="hero-sub">Saját blokkjaidból vagy kézzel bevitt árakból követjük a gyakran vásárolt termékeid árát. Látod, mi drágult, és hol jön ki olcsóbban a szokásos kosarad.</p>' +
      '<div class="facade"><div class="awning"></div><div class="sign">NYITVA · 7–21</div>' +
      '<div class="window l" aria-hidden="true"><div>−23%<small>heti akciók</small></div></div>' +
      '<div class="window r" aria-hidden="true"><div>Friss<small>árak a blokkodból</small></div></div>' +
      '<div class="doorway"><div class="inside" aria-hidden="true">' +
      shelf('g o b y g r b o y g b r') + shelf('y r g b o y g r b o g y') + '</div>' +
      '<div class="corral">' +
      '<div class="stack-cart s1" aria-hidden="true">' + CART_SVG + '</div>' +
      '<div class="stack-cart s2" aria-hidden="true">' + CART_SVG + '</div>' +
      '<button type="button" class="pull-cart" data-act="pull" aria-label="Bevásárlókocsi kihúzása"><span class="grip" aria-hidden="true"></span>' + CART_SVG + '</button>' +
      '</div><div class="door l" aria-hidden="true"></div><div class="door r" aria-hidden="true"></div></div></div>' +
      '<div class="floor"><p class="hint">' + ico('M5 12h14M13 6l6 6-6 6') + 'Fogd meg a piros pöttyöt, és húzd ki a kocsit a sorból</p>' +
      '<button type="button" class="cta" data-act="pull">Kocsi kihúzása</button></div></div>';
  }

  function totals() {
    var lines = [], count = 0, tot = [0, 0, 0], own = 0;
    Object.keys(state.cart).forEach(function (id) {
      var it = ALL[id], q = state.cart[id];
      if (!it) return;
      count += q; own += (it.sale || it.p) * q;
      it.st.forEach(function (v, i) { tot[i] += v * q; });
      lines.push({ name: it.n, q: q, sum: (it.sale || it.p) * q });
    });
    return { lines: lines, count: count, tot: tot, own: own };
  }

  function shopView() {
    var cat = DATA.find(function (c) { return c.id === state.cat; }) || DATA[0];
    var sub = cat.subs.find(function (x) { return x.id === state.sub; }) || cat.subs[0];
    var t = totals();

    var cats = DATA.map(function (c) {
      var n = 0; c.subs.forEach(function (x) { n += x.items.length; });
      var on = c.id === cat.id;
      return '<button type="button" class="cat ' + (on ? 'is-on' : '') + '" aria-pressed="' + on + '" data-act="cat" data-id="' + c.id + '" data-key="cat-' + c.id + '">' +
        ico(c.icon) + '<span class="cat-name">' + esc(c.name) + '</span><span class="cat-count">' + c.subs.length + ' alkategória · ' + n + ' termék</span></button>';
    }).join('');

    var subs = cat.subs.map(function (x) {
      var on = x.id === sub.id;
      return '<button type="button" class="sub ' + (on ? 'is-on' : '') + '" aria-pressed="' + on + '" data-act="sub" data-id="' + x.id + '" data-key="sub-' + x.id + '">' + esc(x.name) + '<span class="n">' + x.items.length + '</span></button>';
    }).join('');

    var items = sub.items.map(function (it) {
      var cur = it.sale || it.p;
      var ch = (it.p - it.prev) / it.prev * 100;
      var mi = 0; it.st.forEach(function (v, i) { if (v < it.st[mi]) mi = i; });
      var q = state.cart[it.id] || 0;
      var trend = ch > 0.5 ? ['up', 'Drágult +' + Math.round(ch) + '%'] : (ch < -0.5 ? ['down', 'Olcsóbb lett −' + Math.round(-ch) + '%'] : ['flat', 'Nem változott']);
      var sale = it.sale ? '<span class="sale">AKCIÓ −' + Math.round((it.p - it.sale) / it.p * 100) + '%</span>' : '';
      var act = q === 0
        ? '<button type="button" class="add" data-act="add" data-id="' + it.id + '" data-key="add-' + it.id + '" aria-label="' + esc(it.n) + ' a kocsiba">Kocsiba</button>'
        : '<div class="stepper"><button type="button" data-act="dec" data-id="' + it.id + '" data-key="dec-' + it.id + '" aria-label="Eggyel kevesebb: ' + esc(it.n) + '">−</button><span>' + q + ' db</span><button type="button" data-act="add" data-id="' + it.id + '" data-key="inc-' + it.id + '" aria-label="Eggyel több: ' + esc(it.n) + '">+</button></div>';
      return '<article class="item ' + (it.sale ? 'on-sale' : '') + '">' +
        '<div class="item-top">' + sale + '<span class="trend ' + trend[0] + '">' + trend[1] + '</span></div>' +
        '<h3 class="item-name">' + esc(it.n) + '</h3><p class="item-qty">' + esc(it.q) + '</p>' +
        '<div class="price-row"><span class="price">' + fmt(cur) + '</span>' + (it.sale ? '<s class="old">' + fmt(it.p) + '</s>' : '') + '</div>' +
        '<p class="unit"><span>' + fmt(cur / it.amt) + '/' + it.bu + '</span>' + (it.sale ? '<s>' + fmt(it.p / it.amt) + '/' + it.bu + '</s>' : '') + '</p>' +
        '<p class="meta">3 hónapja: ' + fmt(it.prev) + '</p>' +
        '<p class="meta best">Legolcsóbb: ' + STORES[mi] + ' · ' + fmt(it.st[mi]) + '</p>' + act + '</article>';
    }).join('');

    var basket;
    if (!t.count) {
      basket = '<p class="empty">Még üres. Tegyél bele néhány terméket, és megmutatjuk, melyik boltban jön ki a legolcsóbban.</p>';
    } else {
      var order = [0, 1, 2].sort(function (a, b) { return t.tot[a] - t.tot[b]; });
      var max = t.tot[order[2]];
      basket = '<ul class="lines">' + t.lines.map(function (l) {
        return '<li><span><b>' + l.q + '×</b> ' + esc(l.name) + '</span><span>' + fmt(l.sum) + '</span></li>';
      }).join('') + '</ul>' +
        '<p class="total">Összesen <strong>' + fmt(t.own) + '</strong></p><h4>Hol jön ki olcsóbban?</h4>' +
        order.map(function (i, k) {
          return '<div class="store ' + (k === 0 ? 'is-best' : '') + '"><div class="store-row"><span>' + STORES[i] + '</span><span>' + fmt(t.tot[i]) + '</span></div>' +
            '<div class="bar"><div class="bar-fill" style="width:' + (max ? Math.round(t.tot[i] / max * 100) : 0) + '%"></div></div>' +
            '<span class="store-tag">' + (k === 0 ? 'Itt a legolcsóbb' : '+' + fmt(t.tot[i] - t.tot[order[0]]) + ' drágább') + '</span></div>';
        }).join('') +
        '<p class="verdict">Ezzel a kosárral a <strong>' + STORES[order[0]] + '</strong> a legjobb: ' + fmt(t.tot[order[0]]) + ', ami ' + fmt(max - t.tot[order[0]]) + ' megtakarítás a legdrágábbhoz képest.</p>';
    }

    return '<div class="shop"><section class="modal" role="dialog" aria-labelledby="ask-title">' +
      '<header class="m-head"><div><p class="eyebrow">Bent vagy a boltban · ' + t.count + ' db a kocsiban</p><h2 id="ask-title">Mit szeretnél venni?</h2></div>' +
      '<div class="m-actions">' +
      '<button type="button" class="ghost" data-act="soon">' + ico('M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4') + 'Blokk beolvasása</button>' +
      '<button type="button" class="ghost" data-act="soon">' + ico('M4 20h4L19 9l-4-4L4 16zM13 7l4 4') + 'Ár kézi bevitele</button>' +
      '<button type="button" class="icon-btn" data-act="restart" aria-label="Kilépés a boltból">' + ico('M6 6l12 12M18 6L6 18') + '</button>' +
      '</div></header>' +
      '<div class="m-body"><nav class="cats" aria-label="Kategóriák">' + cats + '</nav>' +
      '<div class="main"><p class="crumb">' + esc(cat.name) + ' › ' + esc(sub.name) + '</p><div class="subs">' + subs + '</div><div class="grid">' + items + '</div></div>' +
      '<aside class="basket" aria-label="Kocsi tartalma"><h3>A kocsiban <span>' + t.count + ' db</span></h3>' + basket +
      '<p class="sr-live" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">' + (state.msg || '') + '</p></aside>' +
      '</div></section></div>';
  }

  var SCROLLERS = ['.cats', '.main', '.basket'];
  function render() {
    var active = document.activeElement && document.activeElement.getAttribute('data-key');
    var scroll = SCROLLERS.map(function (s) { var el = app.querySelector(s); return el ? [el.scrollTop, el.scrollLeft] : null; });
    var wasShop = !!app.querySelector('.modal');
    app.innerHTML = state.stage === 'shop' ? shopView() : doorView();
    var modal = app.querySelector('.modal');
    if (modal && !wasShop) modal.classList.add('is-new');
    SCROLLERS.forEach(function (s, i) { var el = app.querySelector(s); if (el && scroll[i]) { el.scrollTop = scroll[i][0]; el.scrollLeft = scroll[i][1]; } });
    if (active) {
      var el = app.querySelector('[data-key="' + active + '"]');
      if (el) el.focus({ preventScroll: true });
    }
  }

  function pull() {
    if (state.stage !== 'door') return;
    state.stage = 'pulled';
    render();
    clearTimeout(timer);
    timer = setTimeout(function () { state.stage = 'shop'; render(); window.scrollTo(0, 0); }, calm() ? 60 : 950);
  }

  function setQty(id, d) {
    var n = (state.cart[id] || 0) + d;
    if (n <= 0) delete state.cart[id]; else state.cart[id] = n;
    var it = ALL[id];
    state.msg = it ? it.n + ': ' + (state.cart[id] || 0) + ' db a kocsiban' : '';
    var el = document.activeElement;
    if (el && el.getAttribute('data-key') === 'add-' + id) el.setAttribute('data-key', 'inc-' + id);
    if (el && el.getAttribute('data-key') === 'dec-' + id && !state.cart[id]) el.setAttribute('data-key', 'add-' + id);
    render();
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (act === 'pull') { if (!dragMoved) pull(); }
    else if (act === 'cat') { var c = DATA.find(function (x) { return x.id === id; }); state.cat = id; state.sub = c.subs[0].id; render(); }
    else if (act === 'sub') { state.sub = id; render(); }
    else if (act === 'add') setQty(id, 1);
    else if (act === 'dec') setQty(id, -1);
    else if (act === 'restart') { clearTimeout(timer); state.stage = 'door'; render(); }
    else if (act === 'soon') { state.msg = 'Ez a funkció hamarosan érkezik.'; render(); }
  });

  var drag = null, dragMoved = false;
  app.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('.pull-cart');
    if (!b || state.stage !== 'door') return;
    drag = { el: b, x: e.clientX, dx: 0 };
    dragMoved = false;
    b.setPointerCapture(e.pointerId);
    var sc = b.closest('.scene');
    if (sc) sc.classList.add('is-drag');
  });
  app.addEventListener('pointermove', function (e) {
    if (!drag) return;
    drag.dx = Math.max(0, Math.min(240, e.clientX - drag.x));
    if (drag.dx > 4) dragMoved = true;
    drag.el.style.transform = 'translateX(' + drag.dx + 'px)';
  });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    var scene = app.querySelector('.scene');
    if (scene) scene.classList.remove('is-drag');
    if (d.dx > 110) pull(); else d.el.style.transform = '';
    setTimeout(function () { dragMoved = false; }, 0);
  }
  app.addEventListener('pointerup', endDrag);
  app.addEventListener('pointercancel', endDrag);

  render();
})();
