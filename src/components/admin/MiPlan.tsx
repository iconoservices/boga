'use client';

// Tarjeta "Tu plan" del Inicio del dueño: en qué nivel está su tienda, cuánto paga y hasta cuándo está pagado.
// Solo se muestra si la tienda tiene un costo o ya tiene fecha de pago; con todo en 0 no aparece.
// Los datos salen de las tablas de Cobros (ver /superadmin/cobros). Si todavía no existen, no se muestra nada.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hoyLima } from '@/lib/fechaLima';
import { estadoCobro, nivelAlcance, nivelOperacion, pasosDeTienda, precioSugerido, type Modulos, type TipoCobro } from '@/lib/modulos';

const ALCANCE = { carta: 'Carta', app: 'App', app_google: 'App + Google' } as const;
const OPERACION = { sin_caja: 'Sin caja', ventas: 'Ventas', inventario: 'Ventas + Inventario', 'sin-clasificar': 'Ventas + Inventario' } as const;

const ESTADO: Record<TipoCobro, { texto: (d: number | null) => string; clase: string }> = {
  sin_costo: { texto: () => 'Sin costo', clase: 'bg-gray-100 text-gray-600' },
  sin_pagos: { texto: () => 'Pendiente de pago', clase: 'bg-amber-100 text-amber-800' },
  vencido: { texto: (d) => `Venció hace ${Math.abs(d ?? 0)} ${Math.abs(d ?? 0) === 1 ? 'día' : 'días'}`, clase: 'bg-red-100 text-red-700' },
  por_vencer: { texto: (d) => (d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}`), clase: 'bg-amber-100 text-amber-800' },
  al_dia: { texto: () => 'Al día', clase: 'bg-green-100 text-green-700' },
};

export default function MiPlan({
  slug, modulos, subdominioActivo,
}: {
  slug: string;
  modulos: Modulos | null | undefined;
  subdominioActivo: boolean | null | undefined;
}) {
  const [datos, setDatos] = useState<{ precios: Record<string, number>; monto: number | null; vence: string | null } | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      supabase.from('plan_precios').select('clave,monto'),
      supabase.from('store_suscripciones').select('monto_mensual,vence').eq('store', slug).maybeSingle(),
    ]).then(([pr, su]) => {
      if (!vivo || pr.error || su.error) return;
      const precios: Record<string, number> = {};
      (pr.data ?? []).forEach((r: { clave: string; monto: number }) => { precios[r.clave] = Number(r.monto) || 0; });
      setDatos({ precios, monto: su.data?.monto_mensual ?? null, vence: su.data?.vence ?? null });
    });
    return () => { vivo = false; };
  }, [slug]);

  if (!datos) return null;

  const tienda = { modulos, subdominio_activo: subdominioActivo };
  const monto = datos.monto ?? precioSugerido(pasosDeTienda(tienda), datos.precios);
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
        <p className="text-xl font-black text-gray-900">S/ {monto.toFixed(2)}<span className="text-xs text-gray-400 font-semibold"> /mes</span></p>
        {datos.vence && (
          <p className="text-xs text-gray-500 font-semibold">
            Pagado hasta {new Date(`${datos.vence}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
      {(estado.tipo === 'vencido' || estado.tipo === 'por_vencer' || estado.tipo === 'sin_pagos') && (
        <p className="mt-2 text-xs text-gray-500 font-medium">Escríbenos para coordinar tu pago (Yape, Plin o transferencia) y seguir con todo activo.</p>
      )}
    </div>
  );
}
