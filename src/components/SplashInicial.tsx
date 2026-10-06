'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RUTAS_DE_BOGAHUB } from '@/lib/rutasBoga';

interface Tienda {
  nombre: string;
  logo?: string;
  /** Color de fondo y color de acento: los de la plantilla de la tienda. */
  fondo: string;
  acento: string;
}

// Pantalla de carga. Viene en el HTML del servidor, así que se ve desde el primer paint (antes de
// que cargue/hidrate la página) y se desvanece apenas la app está lista.
//  - Sin `tienda`: la de BogaHub (logo de Boga), solo en las páginas de BogaHub. En una tienda (ruta
//    /<tienda> o su subdominio) no sale: ahí va la de la propia tienda (ver html[data-tienda] en globals.css).
//  - Con `tienda`: el logo y los colores de esa tienda.
export default function SplashInicial({ tienda }: { tienda?: Tienda }) {
  const pathname = usePathname() || '/';
  const primero = pathname.split('/')[1] ?? '';
  const esDeBoga = primero === '' || RUTAS_DE_BOGAHUB.has(primero);
  const [fase, setFase] = useState<'visible' | 'saliendo' | 'fuera'>('visible');
  const activo = tienda ? true : esDeBoga;

  useEffect(() => {
    if (!activo) return;
    // No va dentro de la vista previa del admin (iframe). Sale en cada carga completa (entrar directo, abrir un enlace o recargar);
    // al navegar dentro del sitio no vuelve a salir porque el layout no se vuelve a montar.
    if (tienda && window.parent !== window) { setFase('fuera'); return; }
    const salir = () => setFase((f) => (f === 'visible' ? 'saliendo' : f));
    // Está desde el primer instante (viene en el HTML del servidor) y se desvanece cuando la página terminó de cargar.
    const listo = () => salir();
    if (document.readyState === 'complete') listo();
    else window.addEventListener('load', listo, { once: true });
    // Tope de seguridad: nunca dejar la pantalla tapada más de 3 s.
    const tope = setTimeout(salir, 3000);
    return () => { clearTimeout(tope); window.removeEventListener('load', listo); };
  }, [activo, tienda]);

  useEffect(() => {
    if (fase !== 'saliendo') return;
    const t = setTimeout(() => setFase('fuera'), 400);
    return () => clearTimeout(t);
  }, [fase]);

  if (!activo || fase === 'fuera') return null;

  const clases = ['boga-splash', tienda ? 'boga-splash--tienda' : '', fase === 'saliendo' ? 'boga-splash--out' : ''].filter(Boolean).join(' ');

  const acento = tienda ? tienda.acento : '#B8130E';

  return (
    <div
      id={tienda ? 'tienda-splash' : 'boga-splash'}
      aria-hidden="true"
      className={clases}
      style={{ ...(tienda ? { background: tienda.fondo } : {}), ['--splash-acento' as string]: acento }}
    >
      <div className="boga-splash__box">
        <span className="boga-splash__anillo" />
        {tienda ? (
          tienda.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tienda.logo} alt="" className="boga-splash__logo" style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 9999, background: '#fff', padding: 8, boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} />
          ) : (
            <span className="boga-splash__logo" style={{ color: acento, fontWeight: 900, fontSize: 22, textAlign: 'center', padding: '0 16px' }}>{tienda.nombre}</span>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo-mark.svg" alt="" width={72} height={72} className="boga-splash__logo" />
        )}
      </div>
      <span className="boga-splash__barra"><i /></span>
    </div>
  );
}
