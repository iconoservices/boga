'use client';

// Tarjeta "Tu plan" del Inicio del dueño: en qué nivel está su tienda, cuánto paga y hasta cuándo está pagado.
// Solo se muestra si la tienda tiene un costo o ya tiene fecha de pago; con todo en 0 no aparece.
// Los datos salen de las tablas de Cobros (ver /superadmin/cobros). Si todavía no existen, no se muestra nada.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cargarPlanes, planDeTienda, type PlanComercial } from '@/lib/planesComerciales';
import { hoyLima } from '@/lib/fechaLima';
import { estadoCobro, nivelAlcance, nivelOperacion, pasosDeTienda, precioSugerido, type Modulos, type TipoCobro } from '@/lib/modulos';

const ALCANCE = { carta: 'Esencial', app: 'Negocio', app_google: 'Premium' } as const;
const OPERACION = { sin_caja: 'Sin caja', ventas: 'Ventas', inventario: 'Ventas + Inventario', 'sin-clasificar': 'Ventas + Inventario' } as const;

const ESTADO: Record<TipoCobro, { texto: (d: number | null) => string; clase: string }> = {
  sin_costo: { texto: () => 'Sin costo', clase: 'bg-gray-100 text-gray-600' },
  sin_pagos: { texto: () => 'Pendiente de pago', clase: 'bg-amber-100 text-amber-800' },
  vencido: { texto: (d) => `Venció hace ${Math.abs(d ?? 0)} ${Math.abs(d ?? 0) === 1 ? 'día' : 'días'}`, clase: 'bg-red-100 text-red-700' },
  por_vencer: { texto: (d) => (d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}`), clase: 'bg-amber-100 text-amber-800' },
  al_dia: { texto: () => 'Al día', clase: 'bg-green-100 text-green-700' },
};

export default function MiPlan({
  slug, modulos, subdominioActivo, plan,
}: {
  slug: string;
  modulos: Modulos | null | undefined;
  subdominioActivo: boolean | null | undefined;
  plan?: string | null;
}) {
  const [usados, setUsados] = useState<number | null>(null);
  const [planes, setPlanes] = useState<PlanComercial[]>([]);
  const [datos, setDatos] = useState<{ precios: Record<string, number>; monto: number | null; descuentoHasta: string | null; vence: string | null } | null>(null);

  useEffect(() => {
    let vivo = true;
    // Cuántos productos lleva la tienda y cuál es el tope de su plan.
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('store', slug).then(({ count }) => { if (vivo) setUsados(count ?? 0); });
    cargarPlanes(supabase).then((rp) => { if (vivo) setPlanes(rp.planes); });
    Promise.all([
      supabase.from('plan_precios').select('clave,monto'),
      // `descuento_hasta` es columna nueva: si el SQL todavía no se corrió, reintenta sin ella
      // (mismo criterio que /superadmin/cobros) en vez de dejar la tarjeta sin datos.
      supabase.from('store_suscripciones').select('monto_mensual,vence,descuento_hasta').eq('store', slug).maybeSingle()
        .then((r) => (r.error ? supabase.from('store_suscripciones').select('monto_mensual,vence').eq('store', slug).maybeSingle() : r)),
    ]).then(([pr, su]) => {
      if (!vivo || pr.error || su.error) return;
      const precios: Record<string, number> = {};
      (pr.data ?? []).forEach((r: { clave: string; monto: number }) => { precios[r.clave] = Number(r.monto) || 0; });
      setDatos({ precios, monto: su.data?.monto_mensual ?? null, descuentoHasta: (su.data as any)?.descuento_hasta ?? null, vence: su.data?.vence ?? null });
    });
    return () => { vivo = false; };
  }, [slug]);

  if (!datos) return null;

  const tienda = { modulos, subdominio_activo: subdominioActivo, plan };
  const sugerido = precioSugerido(pasosDeTienda(tienda), datos.precios);
  // Sin descuentoHasta, el monto acordado queda fijo para siempre; con fecha ya pasada, vuelve solo al sugerido.
  const descuentoVigente = datos.monto != null && (!datos.descuentoHasta || datos.descuentoHasta >= hoyLima());
  const monto = descuentoVigente ? (datos.monto as number) : sugerido;
  if (!(monto > 0) && !datos.vence) return null;

  const estado = estadoCobro(datos.vence, monto, hoyLima());
  const ui = ESTADO[estado.tipo];
  const operacion = nivelOperacion(modulos);

  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-gray-900 text-sm">Tu plan</h4>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ui.clase}`}>{ui.texto(estado.dias)}</span>
      </div>
      <p className="mt-2 text-sm text-gray-700 font-semibold">
        {ALCANCE[nivelAlcance(tienda)]} · {OPERACION[operacion]}
        {modulos?.marca_blanca ? ' · Marca blanca' : ''}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="text-xl font-black text-gray-900">
          S/ {monto.toFixed(2)}<span className="text-xs text-gray-400 font-semibold"> /mes</span>
          {descuentoVigente && monto < sugerido && <span className="ml-2 text-xs text-gray-400 font-semibold line-through">S/ {sugerido.toFixed(2)}</span>}
        </p>
        {datos.vence && (
          <p className="text-xs text-gray-500 font-semibold">
            Pagado hasta {new Date(`${datos.vence}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
      {(() => {
        const planDeEsta = planDeTienda({ modulos, subdominio_activo: subdominioActivo, plan }, planes);
        const max = planDeEsta?.max_productos ?? null;
        if (usados === null || !max) return null;
        const pct = Math.min(100, Math.round((usados / max) * 100));
        const lleno = usados >= max;
        return (
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-xs font-semibold text-gray-600">
              <span>Productos</span>
              <span className={lleno ? 'text-red-600 font-bold' : ''}>{usados} de {max.toLocaleString('es-PE')}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${lleno ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
            </div>
            {lleno && <p className="mt-1.5 text-[11px] font-semibold text-red-600">Llegaste al límite de tu plan. Para agregar más productos, pásate a un plan mayor.</p>}
          </div>
        );
      })()}
      {descuentoVigente && monto < sugerido && (
        <p className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Tienes un descuento de S/ {(sugerido - monto).toFixed(2)} al mes ({Math.round(((sugerido - monto) / sugerido) * 100)}%)
          {datos.descuentoHasta ? ` hasta el ${new Date(`${datos.descuentoHasta}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}.
        </p>
      )}
      {(estado.tipo === 'vencido' || estado.tipo === 'por_vencer' || estado.tipo === 'sin_pagos') && (
        <p className="mt-2 text-xs text-gray-500 font-medium">Escríbenos para coordinar tu pago (Yape, Plin o transferencia) y seguir con todo activo.</p>
      )}
    </div>
  );
}
