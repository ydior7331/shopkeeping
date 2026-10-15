export function Ico({ d }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function CartSvg({ detailed = true }) {
  return (
    <svg className="cart-ico" viewBox="0 0 120 100" aria-hidden="true">
      <path d="M4 12h16l14 56h64l14-42H24" />
      {detailed && <path className="thin" d="M28 40h80M32 54h72M48 26v42M66 26v42M84 26v42" />}
      <circle cx="40" cy="84" r="8" />
      <circle cx="92" cy="84" r="8" />
    </svg>
  );
}

export const ICONS = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  back: 'M15 6l-6 6 6 6',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
};
