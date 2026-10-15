import { useState } from 'react';
import { imageUrl } from './format.js';
import { CartSvg } from './Icons.jsx';

export default function ProductImage({ ean, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(ean);
  return (
    <div className={`thumb ${className} ${failed || !src ? 'no-img' : ''}`}>
      {failed || !src ? <CartSvg detailed={false} /> : <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </div>
  );
}
