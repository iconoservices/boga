'use client';

// Comparativa de los niveles que se le venden al comercio, en dos ejes que se combinan:
//  · Alcance: Carta → App → App + Google
//  · Operación: Sin caja → Ventas → Ventas + Inventario
// Lo que gatea de verdad el panel del dueño: se prende por tienda desde el editor de tienda del
// superadmin. La definición vive en src/lib/modulos.ts (un solo lugar).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CAPACIDADES_PLAN, MODULOS_PROXIMOS, MODULOS_VENTA, PLANES, REQUISITOS_MARKET, planIncluye } from '@/lib/planesNegocios';
import {
  ALCANCES, CAPACIDADES_ALCANCE, CAPACIDADES_OPERACION, EXTRAS, LIMITES, OPERACIONES,
  alcanceIncluye, nivelAlcance, nivelOperacion, operacionIncluye,
  type AlcanceId, type Modulos, type OperacionId,
} from '@/lib/modulos';

type FilaTienda = { slug: string; name: string; modulos: Modulos | null; subdominio_activo: boolean | null };

// Marca lo que se sumó para igualar /negocios y hay que revisar.
function Nuevo() {
  return <span className="ml-2 align-middle text-[9px] font-bold uppercase tracking-wider text-[#0058be] bg-[#d8e2ff] px-1.5 py-0.5 rounded">Nuevo</span>;
}

function Tabla<T extends string>({ titulo, niveles, capacidades, incluye }: {
  titulo: string;
  niveles: { id: T; nombre: string }[];
  capacidades: { texto: string; desde: T; nuevo?: boolean }[];
  incluye: (nivel: T, desde: T) => boolean;
}) {
  return (
    <div className="bg-white border border-[#c2c6d6] rounded-md overflow-x-auto">
      <table className="w-full text-left text-xs min-w-[520px]">
        <thead>
          <tr className="bg-[#f2f3fd] text-[10px] uppercase tracking-wider text-[#424754]">
            <th className="p-3 font-bold">{titulo}</th>
            {niveles.map((n) => (
              <th key={n.id} className="p-3 font-bold text-center w-28">{n.nombre}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {capacidades.map((c) => (
            <tr key={c.texto} className="border-t border-[#ecedf7]">
              <td className="p-3 font-semibold text-[#191b23]">{c.texto}{c.nuevo && <Nuevo />}</td>
              {niveles.map((n) => (
                <td key={n.id} className="p-3 text-center">
                  {incluye(n.id, c.desde) ? (
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
  );
}

function Tarjeta({ nombre, resumen, tiendas, precio }: { nombre: string; resumen: string; tiendas: FilaTienda[] | null; precio: number | null | undefined }) {
  return (
    <div className="p-4 bg-white border border-[#c2c6d6] rounded-md flex flex-col gap-2">
      <h4 className="text-sm font-bold text-[#191b23] leading-tight">{nombre}</h4>
      <p className="text-xs text-[#424754]">{resumen}</p>
      {precio !== null && (
        <p className="text-[11px] font-bold text-[#0058be]">
          {precio && precio > 0 ? `+ S/ ${precio.toLocaleString('es-PE')} /mes` : 'Precio por definir'}
        </p>
      )}
      <div className="mt-auto pt-3 border-t border-[#ecedf7]">
        <span className="text-2xl font-bold text-[#191b23]">{tiendas ? tiendas.length : '…'}</span>
        <span className="text-xs text-[#424754] font-semibold ml-1">{tiendas?.length === 1 ? 'tienda' : 'tiendas'}</span>
        {tiendas && tiendas.length > 0 && (
          <p className="text-[10px] text-[#727785] font-semibold mt-1 truncate" title={tiendas.map((t) => t.name).join(', ')}>
            {tiendas.map((t) => t.name).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

export default function NivelesModulos() {
  const [tiendas, setTiendas] = useState<FilaTienda[] | null>(null);
  // Si la columna `modulos` todavía no existe en la base (migración sin correr).
  const [sinColumna, setSinColumna] = useState(false);
  // Precios de cada paso (tabla plan_precios, se editan en /superadmin/cobros). Sin la tabla, salen "por definir".
  const [precios, setPrecios] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from('stores').select('slug,name,modulos,subdominio_activo').then(({ data, error }) => {
      if (error) { setSinColumna(true); setTiendas([]); return; }
      setTiendas((data ?? []) as FilaTienda[]);
    });
    supabase.from('plan_precios').select('clave,monto').then(({ data, error }) => {
      if (error) return;
      setPrecios(Object.fromEntries((data ?? []).map((r: { clave: string; monto: number }) => [r.clave, Number(r.monto) || 0])));
    });
  }, []);

  const deAlcance = (id: AlcanceId) => (tiendas ? tiendas.filter((t) => nivelAlcance(t) === id) : null);
  const deOperacion = (id: OperacionId) => (tiendas ? tiendas.filter((t) => nivelOperacion(t.modulos) === id) : null);
  const sinClasificar = (tiendas ?? []).filter((t) => nivelOperacion(t.modulos) === 'sin-clasificar');

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-bold text-[#191b23]">Niveles</h3>
        <p className="text-xs text-[#424754] mt-1">
          Dos ejes que se combinan: <b>Alcance</b> (a cuánta gente llega) y <b>Operación</b> (qué controla el dueño en su local).
          Se prenden por tienda en{' '}
          <Link href="/superadmin" className="text-[#0058be] font-bold hover:underline">el editor de tienda</Link>.
          Los precios (cada paso se suma al anterior) y los pagos se manejan en{' '}
          <Link href="/superadmin/cobros" className="text-[#0058be] font-bold hover:underline">Cobros</Link>.
        </p>
      </div>

      {sinColumna && (
        <div className="p-3 bg-[#fff8e1] border border-[#f5c518]/50 rounded-md text-xs text-[#5c4a00] font-semibold">
          Falta correr la migración de módulos en Supabase (ver el final de <code>supabase_setup.sql</code>). Mientras tanto, todas las tiendas
          tienen todo prendido.
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0058be]">Alcance · a cuánta gente llega</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ALCANCES.map((n) => <Tarjeta key={n.id} nombre={n.nombre} resumen={n.resumen} tiendas={deAlcance(n.id)} precio={precios[`alcance:${n.id}`] ?? 0} />)}
        </div>
        <Tabla titulo="Qué gana el dueño" niveles={ALCANCES} capacidades={CAPACIDADES_ALCANCE} incluye={alcanceIncluye} />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0058be]">Operación · qué controla en su local</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {OPERACIONES.map((n) => <Tarjeta key={n.id} nombre={n.nombre} resumen={n.resumen} tiendas={deOperacion(n.id)} precio={n.id === 'sin_caja' ? null : precios[`operacion:${n.id}`] ?? 0} />)}
        </div>
        <Tabla titulo="Qué gana el dueño" niveles={OPERACIONES.slice(1)} capacidades={CAPACIDADES_OPERACION} incluye={operacionIncluye} />
        {sinClasificar.length > 0 && (
          <p className="text-[11px] text-[#727785] font-semibold">
            {sinClasificar.length} tienda(s) sin clasificar (anteriores a los módulos, con todo prendido): {sinClasificar.map((t) => t.name).join(', ')}.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0058be]">Lo que se vende en /negocios <Nuevo /></p>
        <p className="text-xs text-[#424754]">
          Los planes son paquetes de módulos (siguen el eje de Alcance: Carta → App → App + Google) y cada módulo también se vende suelto.
          Todo sale de <code>lib/planesNegocios.ts</code>: si cambias precio o texto ahí, cambia en la landing y aquí.
          «Por definir» es un marcador de precio.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANES.map((p) => (
            <div key={p.id} className="p-4 bg-white border border-[#c2c6d6] rounded-md flex flex-col gap-1">
              <h4 className="text-sm font-bold text-[#191b23] leading-tight">{p.nombre}{p.pronto && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-[#5c4a00] bg-[#fff8e1] border border-[#f5c518]/50 px-1.5 py-0.5 rounded align-middle">Aún no existe</span>}</h4>
              <p className="text-[11px] font-bold text-[#0058be]">
                {p.mes.precio}{p.mes.periodo}{p.anio.periodo && ` · ${p.anio.precio}${p.anio.periodo}`}
              </p>
              <p className="text-[10px] text-[#727785] font-semibold">{p.mes.nota}</p>
              <p className="text-xs text-[#424754] mt-1">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="bg-white border border-[#c2c6d6] rounded-md overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[520px]">
            <thead>
              <tr className="bg-[#f2f3fd] text-[10px] uppercase tracking-wider text-[#424754]">
                <th className="p-3 font-bold">Qué trae el plan</th>
                {PLANES.map((p) => <th key={p.id} className="p-3 font-bold text-center w-28">{p.nombre}</th>)}
              </tr>
            </thead>
            <tbody>
              {CAPACIDADES_PLAN.map((c) => (
                <tr key={c.texto} className="border-t border-[#ecedf7]">
                  <td className="p-3 font-semibold text-[#191b23]">
                    {c.texto}{c.nuevo && <Nuevo />}
                    {c.estado === 'falta' && (
                      <span className="ml-2 align-middle text-[9px] font-bold uppercase tracking-wider text-[#5c4a00] bg-[#fff8e1] border border-[#f5c518]/50 px-1.5 py-0.5 rounded">Aún no existe</span>
                    )}
                  </td>
                  {PLANES.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      {!planIncluye(p.id, c.desde)
                        ? <span className="text-[#c2c6d6]">—</span>
                        : c.valor?.[p.id]
                          ? <span className="text-[11px] font-bold text-[#191b23]">{c.valor[p.id]}</span>
                          : <span className="material-symbols-outlined text-[18px] text-[#16a34a]">check_circle</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white border border-[#c2c6d6] rounded-md overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[520px]">
            <thead>
              <tr className="bg-[#f2f3fd] text-[10px] uppercase tracking-wider text-[#424754]">
                <th className="p-3 font-bold">Módulo (se compra suelto)</th>
                <th className="p-3 font-bold w-36">Precio suelto</th>
                <th className="p-3 font-bold w-48">Ya viene en</th>
              </tr>
            </thead>
            <tbody>
              {MODULOS_VENTA.flatMap((g) => g.items).map((m) => (
                <tr key={m.id} className="border-t border-[#ecedf7]">
                  <td className="p-3 font-semibold text-[#191b23]">
                    {m.nombre}<Nuevo />
                    {m.pronto && <span className="ml-2 align-middle text-[9px] font-bold uppercase tracking-wider text-[#5c4a00] bg-[#fff8e1] border border-[#f5c518]/50 px-1.5 py-0.5 rounded">Aún no existe</span>}
                    {m.promo && <p className="text-[10px] text-[#727785] font-semibold mt-0.5">{m.promo}</p>}
                  </td>
                  <td className="p-3 text-[#424754]">{m.precio}{m.precio !== 'Por definir' && (m.unidad ?? ' /mes')}</td>
                  <td className="p-3 text-[#424754]">{m.incluidoEn.length ? m.incluidoEn.map((id) => PLANES.find((p) => p.id === id)?.nombre).join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-[#c2c6d6] rounded-md">
          <h4 className="text-xs font-bold text-[#191b23] mb-2">Requisitos para entrar al Market (promo de lanzamiento)<Nuevo /></h4>
          <ul className="list-disc pl-4 text-xs text-[#424754] space-y-1">
            {REQUISITOS_MARKET.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="text-[10px] text-[#727785] font-semibold mt-2">Se revisan a mano; lo apagas por tienda con el interruptor «marketplace» del editor.</p>
        </div>
        <div className="p-4 bg-white border border-[#c2c6d6] rounded-md">
          <h4 className="text-xs font-bold text-[#191b23] mb-2">Módulos por venir (aún no existen)<Nuevo /></h4>
          <ul className="list-disc pl-4 text-xs text-[#424754] space-y-1">
            {MODULOS_PROXIMOS.map((m) => <li key={m.nombre}><b>{m.nombre}:</b> {m.desc}</li>)}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-[#c2c6d6] rounded-md">
          <h4 className="text-xs font-bold text-[#191b23] mb-2">Aparte de los niveles</h4>
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
