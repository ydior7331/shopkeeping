const FILES = import.meta.glob('./assets/chains/*.svg', { eager: true, import: 'default' });
const LOGOS = Object.fromEntries(Object.entries(FILES).map(([path, url]) => [path.split('/').pop().replace('.svg', ''), url]));

function slug(name) {
  return (name ?? '')
    .toLowerCase()
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export default function ChainLogo({ name, size = 26 }) {
  const src = LOGOS[slug(name)];
  if (!src) return null;
  return <img className="chain-logo" src={src} alt="" width={size} height={size} aria-hidden="true" />;
}
