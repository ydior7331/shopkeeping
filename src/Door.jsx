import { useRef, useState } from 'react';
import { CartSvg, Ico, ICONS } from './Icons.jsx';

function Shelf({ colors }) {
  return (
    <div className="shelf">
      {colors.split(' ').map((c, i) => (
        <span key={i} className={c} />
      ))}
    </div>
  );
}

export default function Door({ pulled, onPull, chainCount }) {
  const drag = useRef(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [dx, setDx] = useState(0);

  function down(e) {
    if (pulled) return;
    drag.current = { x: e.clientX, dx: 0 };
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function move(e) {
    if (!drag.current) return;
    const v = Math.max(0, Math.min(240, e.clientX - drag.current.x));
    drag.current.dx = v;
    if (v > 4) moved.current = true;
    setDx(v);
  }

  function up() {
    if (!drag.current) return;
    const d = drag.current.dx;
    drag.current = null;
    setDragging(false);
    if (d > 110) onPull();
    else setDx(0);
    setTimeout(() => {
      moved.current = false;
    }, 0);
  }

  function click() {
    if (!moved.current) onPull();
  }

  const cls = ['scene', pulled && 'is-pulled', dragging && 'is-drag'].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="brand">
        <CartSvg detailed={false} />
        <span>Kosárár</span>
      </div>
      <h1 className="hero-title">Mi mennyibe kerül a boltban?</h1>
      <p className="hero-sub">
        Napi boltlánc-árak a GVH Árfigyelőből. Keresd meg a termékeidet, nézd meg, mi drágult, és hol jön ki olcsóbban a szokásos kosarad.
      </p>
      <div className="facade">
        <div className="awning" />
        <div className="sign">ÉJJEL-NAPPAL NYITVA</div>
        <div className="window l" aria-hidden="true">
          <div>
            {chainCount || 9} lánc<small>egy helyen</small>
          </div>
        </div>
        <div className="window r" aria-hidden="true">
          <div>
            Friss<small>naponta frissülő árak</small>
          </div>
        </div>
        <div className="doorway">
          <div className="inside" aria-hidden="true">
            <Shelf colors="g o b y g r b o y g b r" />
            <Shelf colors="y r g b o y g r b o g y" />
          </div>
          <div className="corral">
            <div className="stack-cart s1" aria-hidden="true">
              <CartSvg />
            </div>
            <div className="stack-cart s2" aria-hidden="true">
              <CartSvg />
            </div>
            <button
              type="button"
              className="pull-cart"
              aria-label="Bevásárlókocsi kihúzása"
              style={dx && !pulled ? { transform: `translateX(${dx}px)` } : undefined}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onClick={click}
            >
              <span className="grip" aria-hidden="true" />
              <CartSvg />
            </button>
          </div>
          <div className="door l" aria-hidden="true" />
          <div className="door r" aria-hidden="true" />
        </div>
      </div>
      <div className="floor">
        <p className="hint">
          <Ico d={ICONS.arrow} />
          Fogd meg a piros pöttyöt, és húzd ki a kocsit a sorból
        </p>
        <button type="button" className="cta" onClick={onPull}>
          Kocsi kihúzása
        </button>
      </div>
    </div>
  );
}
