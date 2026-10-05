'use client';

import { useEffect, useState } from 'react';

// Pantalla de carga con el logo de Boga. Viene en el HTML del servidor, así que
// se ve desde el primer paint (antes de que cargue/hidrate la página) y se
// desvanece apenas la app está lista. En tiendas con subdominio no se muestra
// (ver html[data-tienda] en globals.css): ahí no va el logo de Boga.
export default function SplashInicial() {
  const [fase, setFase] = useState<'visible' | 'saliendo' | 'fuera'>('visible');

  useEffect(() => {
    // Una vez por sesión: si ya se vio, se quita sin animación.
    try {
      if (sessionStorage.getItem('boga_splash')) { setFase('fuera'); return; }
      sessionStorage.setItem('boga_splash', '1');
    } catch {}
    const salir = () => setFase('saliendo');
    // Mínimo ~400 ms para que el logo no parpadee, y espera a que cargue todo.
    const inicio = Date.now();
    const listo = () => setTimeout(salir, Math.max(0, 400 - (Date.now() - inicio)));
    let t: ReturnType<typeof setTimeout> | undefined;
    if (document.readyState === 'complete') t = listo();
    else window.addEventListener('load', () => { t = listo(); }, { once: true });
    // Tope de seguridad: nunca dejar la pantalla tapada más de 3 s.
    const tope = setTimeout(salir, 3000);
    return () => { clearTimeout(tope); if (t) clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (fase !== 'saliendo') return;
    const t = setTimeout(() => setFase('fuera'), 400);
    return () => clearTimeout(t);
  }, [fase]);

  if (fase === 'fuera') return null;

  return (
    <div
      id="boga-splash"
      aria-hidden="true"
      className={fase === 'saliendo' ? 'boga-splash boga-splash--out' : 'boga-splash'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.svg" alt="" width={96} height={96} className="boga-splash__logo" />
    </div>
  );
}
