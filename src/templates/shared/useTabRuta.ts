'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Pestaña activa de una plantilla, sincronizada con la dirección: /<tienda>/<pestaña>.
 * Reemplaza al `useState('home')` de cada plantilla (misma forma: [pestaña, cambiarPestaña]).
 *
 * - Cambiar de pestaña cambia la dirección SIN recargar (history.pushState): el enlace se puede compartir y
 *   el botón atrás del navegador vuelve a la pestaña anterior en vez de sacar de la tienda.
 * - Entrar directo a /<tienda>/obras abre esa pestaña (la ruta del servidor pasa `desdeRuta`).
 * - La pestaña inicial vive en /<tienda>, sin segmento.
 *
 * Qué pestañas tienen dirección (y su título para Google) está en lib/rutasTienda.ts.
 */
export function useTabRuta(slug: string, inicial: string, desdeRuta?: string): [string, (tab: string) => void] {
  const [tab, setTab] = useState(desdeRuta || inicial);

  const cambiar = useCallback(
    (nueva: string) => {
      setTab(nueva);
      // En la vista previa de una plantilla (/preview/<id>) no hay tienda real: cambiar la dirección dejaría un enlace roto
      // (al recargar daba 404), así que la dirección se queda como está.
      if (window.location.pathname.startsWith('/preview/')) return;
      const ruta = nueva === inicial ? `/${slug}` : `/${slug}/${nueva}`;
      if (window.location.pathname !== ruta) window.history.pushState(null, '', ruta);
    },
    [slug, inicial],
  );

  // Atrás / adelante del navegador: la pestaña sigue a la dirección.
  useEffect(() => {
    const alVolver = () => {
      const partes = window.location.pathname.split('/').filter(Boolean);
      if (partes[0] !== slug) return;
      if (partes[1] === 'producto') return;   // el detalle de producto va encima de la pestaña: no la cambia
      setTab(partes[1] || inicial);
    };
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, [slug, inicial]);

  return [tab, cambiar];
}
