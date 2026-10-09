'use client';

// Aviso al dueño cuando su tienda se acerca (desde el 90%) o llega al tope de productos de su plan.
// Al llegar al tope ya no puede agregar más: el botón le abre WhatsApp con el mensaje armado para pedir el plan siguiente.
// El número del asesor es el que el superadmin pone en Cobros → Precios → «Contacto de Boga».

import { useEffect, useState } from 'react';
import { precioVigente, type PlanComercial } from '@/lib/planesComerciales';

export default function AvisoLimiteProductos({
  nombreTienda, slug, usados, max, plan, planes,
}: {
  nombreTienda: string;
  slug: string;
  usados: number;
  max: number | null;
  plan?: PlanComercial;
  planes: PlanComercial[];
}) {
  const [numero, setNumero] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/contacto')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d?.whatsapp) setNumero(d.whatsapp); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  if (!max || usados < Math.floor(max * 0.9)) return null;
  const lleno = usados >= max;
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  // El plan siguiente: el activo que sigue en orden al plan actual de la tienda.
  const siguiente = planes
    .filter((p) => p.activo && (plan ? p.orden > plan.orden : true))
    .sort((a, b) => a.orden - b.orden)[0];
  const precio = siguiente ? precioVigente(siguiente, hoy) : 0;
  const mensaje = `Hola, mi tienda ${nombreTienda} (${slug}) ${lleno ? 'llegó al límite' : 'está por llegar al límite'} de ${max} productos${siguiente ? ` y quiero pasar al plan ${siguiente.nombre}` : ''}.`;

  return (
    <div className={`w-full rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${lleno ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`} role="status">
      <span className={`material-symbols-outlined text-[28px] shrink-0 ${lleno ? 'text-red-600' : 'text-amber-600'}`}>{lleno ? 'inventory' : 'warning'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-extrabold ${lleno ? 'text-red-800' : 'text-amber-900'}`}>
          {lleno ? `Llegaste al límite de tu plan: ${usados} de ${max.toLocaleString('es-PE')} productos` : `Te quedan ${max - usados} productos en tu plan (${usados} de ${max.toLocaleString('es-PE')})`}
        </p>
        <p className={`text-xs font-semibold mt-0.5 ${lleno ? 'text-red-700' : 'text-amber-800'}`}>
          {lleno ? 'Ya no puedes agregar más. ' : ''}
          {siguiente ? `Contrata el plan ${siguiente.nombre}${siguiente.limite_productos ? ` (${siguiente.limite_productos.toLowerCase()})` : ''}${precio > 0 ? ` por S/ ${precio.toLocaleString('es-PE')} al mes` : ''} para seguir creciendo.` : 'Escríbenos para ampliar tu plan.'}
        </p>
      </div>
      {numero && (
        <a
          href={`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-extrabold text-white active:scale-95 transition ${lleno ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          {siguiente ? `Pasar a ${siguiente.nombre}` : 'Hablar con un asesor'}
        </a>
      )}
    </div>
  );
}
