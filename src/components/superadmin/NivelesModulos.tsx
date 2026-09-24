'use client';

// Comparativa de los niveles que se le venden al comercio (Carta / +Ventas / +Inventario).
// Lo que gatea de verdad el panel del dueño: cada nivel es un conjunto de módulos que se
// prende por tienda desde el editor de tienda del superadmin. La definición vive en
// src/lib/modulos.ts (un solo lugar).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CAPACIDADES, EXTRAS, LIMITES, NIVELES, nivelDeTienda, nivelIncluye, type Modulos, type NivelId } from '@/lib/modulos';

type TiendaNivel = { slug: string; name: string; nivel: NivelId | 'sin-clasificar' };

export default function NivelesModulos() {
  const [tiendas, setTiendas] = useState<TiendaNivel[] | null>(null);
  // Si la columna `modulos` todavía no existe en la base (migración sin correr).
  const [sinColumna, setSinColumna] = useState(false);

  useEffect(() => {
    supabase.from('stores').select('slug,name,modulos').then(({ data, error }) => {
      if (error) { setSinColumna(true); setTiendas([]); return; }
      setTiendas((data ?? []).map((s: { slug: string; name: string; modulos: Modulos | null }) => ({ slug: s.slug, name: s.name, nivel: nivelDeTienda(s.modulos) })));
    });
  }, []);

  const deNivel = (id: NivelId | 'sin-clasificar') => (tiendas ?? []).filter((t) => t.nivel === id);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-[#191b23]">Niveles por módulos</h3>
        <p className="text-xs text-[#424754] mt-1">
          Lo que se vende y lo que el dueño ve en su panel. Se prende por tienda en{' '}
          <Link href="/superadmin" className="text-[#0058be] font-bold hover:underline">el editor de tienda</Link> → «Módulos del negocio».
          Precios: por definir.
        </p>
      </div>

      {sinColumna && (
        <div className="p-3 bg-[#fff8e1] border border-[#f5c518]/50 rounded-md text-xs text-[#5c4a00] font-semibold">
          Falta correr la migración de módulos en Supabase (ver el final de <code>supabase_setup.sql</code>). Mientras tanto, todas las tiendas
          tienen todo prendido.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {NIVELES.map((n) => {
          const propias = deNivel(n.id);
          return (
            <div key={n.id} className="p-4 bg-white border border-[#c2c6d6] rounded-md flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0058be]">Nivel</span>
              <h4 className="text-sm font-bold text-[#191b23] leading-tight">{n.nombre}</h4>
              <p className="text-xs text-[#424754]">{n.resumen}</p>
              <div className="mt-auto pt-3 border-t border-[#ecedf7]">
                <span className="text-2xl font-bold text-[#191b23]">{tiendas ? propias.length : '…'}</span>
                <span className="text-xs text-[#424754] font-semibold ml-1">{propias.length === 1 ? 'tienda' : 'tiendas'}</span>
                {propias.length > 0 && (
                  <p className="text-[10px] text-[#727785] font-semibold mt-1 truncate" title={propias.map((t) => t.name).join(', ')}>
                    {propias.map((t) => t.name).join(', ')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {deNivel('sin-clasificar').length > 0 && (
        <p className="text-[11px] text-[#727785] font-semibold">
          {deNivel('sin-clasificar').length} tienda(s) sin clasificar (anteriores a los módulos, con todo prendido):{' '}
          {deNivel('sin-clasificar').map((t) => t.name).join(', ')}.
        </p>
      )}

      <div className="bg-white border border-[#c2c6d6] rounded-md overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[560px]">
          <thead>
            <tr className="bg-[#f2f3fd] text-[10px] uppercase tracking-wider text-[#424754]">
              <th className="p-3 font-bold">Qué puede hacer el dueño</th>
              {NIVELES.map((n) => (
                <th key={n.id} className="p-3 font-bold text-center w-28">{n.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPACIDADES.map((c) => (
              <tr key={c.texto} className="border-t border-[#ecedf7]">
                <td className="p-3 font-semibold text-[#191b23]">{c.texto}</td>
                {NIVELES.map((n) => (
                  <td key={n.id} className="p-3 text-center">
                    {nivelIncluye(n.id, c.desde) ? (
                      <span className="material-symbols-outlined text-[18px] text-[#16a34a]">check_circle</span>
                    ) : (
                      <span className="text-[#c2c6d6]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-[#c2c6d6] rounded-md">
          <h4 className="text-xs font-bold text-[#191b23] mb-2">Extras (se suman a cualquier nivel)</h4>
          <ul className="list-disc pl-4 text-xs text-[#424754] space-y-1">
            {EXTRAS.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
        <div className="p-4 bg-[#fff8e1] border border-[#f5c518]/50 rounded-md">
          <h4 className="text-xs font-bold text-[#5c4a00] mb-2">Ojo al vender: lo que hoy NO hace</h4>
          <ul className="list-disc pl-4 text-xs text-[#5c4a00] space-y-1">
            {LIMITES.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
