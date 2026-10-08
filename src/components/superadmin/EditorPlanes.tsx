'use client';

// Editor de los planes comerciales (los que se venden en /negocios). Vive en Cobros → Precios.
// - El precio de cada plan es lo que paga una tienda en total por mes.
// - Al guardar se derivan los pasos de plan_precios que usa Cobros: alcance:app = precio App − precio Carta, etc.
//   Así hay UN solo precio por plan y lo que se cobra a las tiendas coincide con lo que dice la landing.
// - Marcar «Recomendado», ofertas con fecha, «Próximamente», activar/desactivar y las características de cada plan.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PLANES_BASE, cargarPlanes, precioVigente, type PlanComercial } from '@/lib/planesComerciales';

const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CLAVE_NIVEL: Record<string, string> = { carta: 'alcance:carta', app: 'alcance:app', app_google: 'alcance:app_google' };

export default function EditorPlanes({
  hoy, flexOk, onGuardado, onPlanes,
}: {
  hoy: string;
  /** ¿Existen ya las columnas de oferta de plan_precios? (SQL «Cobros flexibles») */
  flexOk: boolean;
  onGuardado: () => void;
  onPlanes?: (planes: PlanComercial[]) => void;
}) {
  const [planes, setPlanes] = useState<PlanComercial[]>(PLANES_BASE);
  const [deDb, setDeDb] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    const r = await cargarPlanes(supabase);
    setPlanes(r.planes);
    setDeDb(r.deDb);
    onPlanes?.(r.planes);
  }, [onPlanes]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (id: string, c: Partial<PlanComercial>) => {
    setPlanes((l) => {
      const sig = l.map((p) => (p.id === id ? { ...p, ...c } : p));
      onPlanes?.(sig);
      return sig;
    });
  };
  // Solo uno puede ser el «Recomendado».
  const marcarRecomendado = (id: string, si: boolean) => {
    setPlanes((l) => {
      const sig = l.map((p) => ({ ...p, recomendado: si && p.id === id }));
      onPlanes?.(sig);
      return sig;
    });
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    const ahora = new Date().toISOString();
    const filas = planes.map((p) => ({
      id: p.id, orden: p.orden, nombre: p.nombre.trim() || p.id, etiqueta: p.etiqueta.trim() || null, icono: p.icono,
      descripcion: p.descripcion.trim() || null, caracteristicas: p.caracteristicas.map((c) => c.trim()).filter(Boolean),
      precio_mes: Math.max(0, p.precio_mes || 0),
      precio_oferta: p.precio_oferta != null && p.precio_oferta > 0 ? p.precio_oferta : null,
      oferta_hasta: p.precio_oferta != null && p.precio_oferta > 0 && p.oferta_hasta ? p.oferta_hasta : null,
      recomendado: p.recomendado, activo: p.activo, limite_productos: p.limite_productos.trim() || null,
      max_productos: p.max_productos != null && p.max_productos > 0 ? Math.round(p.max_productos) : null,
      pronto: p.pronto, nivel: p.nivel, updated_at: ahora,
    }));
    const { error } = await supabase.from('planes_comerciales').upsert(filas, { onConflict: 'id' });
    if (error) { setGuardando(false); setMensaje(`No se pudo guardar: ${error.message} (¿corriste el SQL «Planes comerciales»?)`); return; }

    // Pasos que usa Cobros para calcular lo que paga cada tienda: Carta = su precio; los demás niveles = precio del plan − precio de la Carta.
    const carta = planes.find((p) => p.nivel === 'carta');
    const baseNormal = carta?.precio_mes ?? 0;
    const baseVigente = carta ? precioVigente(carta, hoy) : 0;
    const pasos = planes.filter((p) => p.nivel).map((p) => {
      const esCarta = p.nivel === 'carta';
      const conOferta = p.precio_oferta != null && p.precio_oferta > 0;
      return {
        clave: CLAVE_NIVEL[p.nivel as string],
        monto: esCarta ? p.precio_mes : Math.max(0, p.precio_mes - baseNormal),
        ...(flexOk ? {
          monto_oferta: conOferta ? (esCarta ? p.precio_oferta : Math.max(0, (p.precio_oferta as number) - baseVigente)) : null,
          oferta_hasta: conOferta && p.oferta_hasta ? p.oferta_hasta : null,
        } : {}),
        updated_at: ahora,
      };
    });
    const { error: e2 } = await supabase.from('plan_precios').upsert(pasos, { onConflict: 'clave' });
    setGuardando(false);
    setMensaje(e2 ? `Los planes se guardaron, pero no se pudieron actualizar los precios de las tiendas: ${e2.message}` : 'Planes guardados. Ya se ven en /negocios y los cobros de las tiendas se actualizaron.');
    if (!e2) { onGuardado(); cargar(); }
  };

  const campo = 'w-full bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be]';

  return (
    <div className="flex flex-col gap-3">
      {!deDb && (
        <p className="text-[11px] font-semibold text-[#5c4a00] bg-[#fff8e1] border border-[#f5c518]/50 rounded-md px-3 py-2">
          Falta correr el SQL «Planes comerciales» de <code>supabase_setup.sql</code> en Supabase. Mientras tanto se muestran los planes de ejemplo y no se pueden guardar cambios.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {planes.map((p) => {
          const vigente = precioVigente(p, hoy);
          const ofertaAbierta = p.precio_oferta != null;
          const total = p.nivel && p.nivel !== 'carta' ? null : null;
          void total;
          return (
            <div key={p.id} className={`flex flex-col gap-3 rounded-lg p-3 border ${p.recomendado ? 'border-[#0058be] bg-[#f5f8ff]' : 'border-[#c2c6d6] bg-[#f9f9ff]'} ${p.activo ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0058be] text-[20px]">{p.icono}</span>
                <input value={p.nombre} onChange={(e) => cambiar(p.id, { nombre: e.target.value })} className={`${campo} !text-sm !font-black`} aria-label="Nombre del plan" />
                {p.recomendado && <span className="shrink-0 text-[9px] font-black uppercase tracking-wider bg-[#0058be] text-white rounded-full px-2 py-0.5">Recomendado</span>}
              </div>

              <label className="text-[10px] font-bold text-[#545f73]">Etiqueta (frase corta sobre el plan)
                <input value={p.etiqueta} onChange={(e) => cambiar(p.id, { etiqueta: e.target.value })} className={`${campo} mt-1`} />
              </label>

              <label className="text-[10px] font-bold text-[#545f73]">Precio del plan (S/ al mes, total)
                <input type="number" min={0} step="1" inputMode="decimal" value={p.precio_mes || ''} onChange={(e) => cambiar(p.id, { precio_mes: Number(e.target.value) || 0 })} placeholder="0" className={`${campo} mt-1 !text-base`} />
              </label>

              {ofertaAbierta ? (
                <div className="flex flex-wrap items-end gap-2 border-l-2 border-amber-300 pl-2">
                  <label className="text-[10px] font-bold text-[#545f73]">Precio en oferta (S/)
                    <input type="number" min={0} step="1" value={p.precio_oferta || ''} onChange={(e) => cambiar(p.id, { precio_oferta: Number(e.target.value) || 0 })} className={`${campo} mt-1 !w-24`} />
                  </label>
                  <label className="text-[10px] font-bold text-[#545f73]">Hasta (opcional)
                    <input type="date" value={p.oferta_hasta ?? ''} onChange={(e) => cambiar(p.id, { oferta_hasta: e.target.value || null })} className={`${campo} mt-1`} />
                  </label>
                  <button type="button" onClick={() => cambiar(p.id, { precio_oferta: null, oferta_hasta: null })} className="text-[11px] font-bold text-[#727785] underline pb-1.5">Quitar</button>
                </div>
              ) : (
                <button type="button" onClick={() => cambiar(p.id, { precio_oferta: 0 })} className="self-start text-[11px] font-bold text-[#0058be]">+ Poner en oferta</button>
              )}
              {vigente < p.precio_mes && <p className="text-[11px] font-bold text-amber-700">Hoy se cobra {soles(vigente)} en vez de {soles(p.precio_mes)}</p>}

              <div className="grid grid-cols-[1fr_96px] gap-2">
                <label className="text-[10px] font-bold text-[#545f73]">Cómo se lee el límite
                  <input value={p.limite_productos} onChange={(e) => cambiar(p.id, { limite_productos: e.target.value })} placeholder="Ej. De 101 a 1 000 productos" className={`${campo} mt-1`} />
                </label>
                <label className="text-[10px] font-bold text-[#545f73]" title="El tope real: la base de datos no deja agregar más productos que este número. Vacío = sin tope.">Máximo (n.º)
                  <input type="number" min={0} step="1" value={p.max_productos ?? ''} onChange={(e) => cambiar(p.id, { max_productos: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Sin tope" className={`${campo} mt-1`} />
                </label>
              </div>

              <label className="text-[10px] font-bold text-[#545f73]">Qué incluye (una línea por cada punto)
                <textarea
                  rows={5}
                  value={p.caracteristicas.join('\n')}
                  onChange={(e) => cambiar(p.id, { caracteristicas: e.target.value.split('\n') })}
                  className={`${campo} mt-1 resize-y font-semibold`}
                />
              </label>

              <div className="flex flex-col gap-1.5 pt-1 border-t border-[#ecedf7]">
                <label className="flex items-center gap-2 text-[11px] font-bold text-[#424754] cursor-pointer">
                  <input type="checkbox" checked={p.recomendado} onChange={(e) => marcarRecomendado(p.id, e.target.checked)} className="accent-[#0058be]" /> Marcar como «Recomendado»
                </label>
                <label className="flex items-center gap-2 text-[11px] font-bold text-[#424754] cursor-pointer">
                  <input type="checkbox" checked={p.pronto} onChange={(e) => cambiar(p.id, { pronto: e.target.checked })} className="accent-[#0058be]" /> Próximamente (aún no se puede contratar)
                </label>
                <label className="flex items-center gap-2 text-[11px] font-bold text-[#424754] cursor-pointer">
                  <input type="checkbox" checked={p.activo} onChange={(e) => cambiar(p.id, { activo: e.target.checked })} className="accent-[#0058be]" /> Mostrar en /negocios
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={guardar} disabled={guardando || !deDb} className="px-4 py-2.5 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar planes'}
        </button>
        <a href="/negocios#precios" target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0058be] underline">Ver cómo queda en /negocios</a>
        {mensaje && <p className="text-[11px] font-semibold text-[#424754]">{mensaje}</p>}
      </div>
    </div>
  );
}
