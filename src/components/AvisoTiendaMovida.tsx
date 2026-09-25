'use client';

// Aviso para quien llega desde la app instalada de una tienda cuyo subdominio ya no está activo.
// proxy.ts redirige <tienda>.bogahub.app -> bogahub.app/<tienda>?desde=app; en vez de dejar a esa
// persona sin explicación, le decimos que la tienda sigue en BogaHub y le mostramos el Market.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useInstalarBoga } from '@/lib/useInstalarBoga';

export default function AvisoTiendaMovida({ nombre }: { nombre: string }) {
  const [ver, setVer] = useState(false);
  const { mostrar, instalar } = useInstalarBoga();

  useEffect(() => {
    try { setVer(new URLSearchParams(window.location.search).get('desde') === 'app'); } catch { /* noop */ }
  }, []);

  if (!ver) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-white border-b border-gray-200 shadow-md px-4 py-3">
      <div className="max-w-[720px] mx-auto flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-gray-900 leading-tight">{nombre} ahora está en BogaHub</p>
          <p className="text-xs text-gray-500 mt-0.5">Su app propia ya no está disponible, pero puedes seguir pidiendo aquí y descubrir más tiendas de tu ciudad.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Link href="/market" className="text-xs font-bold text-white px-3 py-1.5 rounded-full" style={{ backgroundColor: '#b8130e' }}>
              Ver otras tiendas
            </Link>
            {mostrar && (
              <button type="button" onClick={instalar} className="text-xs font-bold px-3 py-1.5 rounded-full border border-gray-300 text-gray-800">
                Instalar BogaHub
              </button>
            )}
          </div>
        </div>
        <button type="button" onClick={() => setVer(false)} aria-label="Cerrar aviso" className="text-gray-400 hover:text-gray-700 shrink-0">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}
