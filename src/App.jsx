import { useEffect, useRef, useState } from 'react';
import Door from './Door.jsx';
import Shop from './Shop.jsx';
import { api } from './api.js';
import { calm } from './format.js';

export default function App() {
  const [stage, setStage] = useState('door');
  const [meta, setMeta] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setMeta({ chains: [], lastImport: null }));
    return () => clearTimeout(timer.current);
  }, []);

  function pull() {
    if (stage !== 'door') return;
    setStage('pulled');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setStage('shop');
      window.scrollTo(0, 0);
    }, calm() ? 60 : 950);
  }

  if (stage === 'shop') return <Shop meta={meta} onExit={() => setStage('door')} />;
  return <Door pulled={stage === 'pulled'} onPull={pull} chainCount={meta?.chains?.length} />;
}
