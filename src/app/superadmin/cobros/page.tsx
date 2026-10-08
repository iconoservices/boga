'use client';

// Cobros: cuánto paga cada tienda, hasta cuándo está pagado y el registro de pagos.
//
// Los negocios pagan por Yape, transferencia o efectivo (todavía no hay pasarela): acá el superadmin
// fija los precios de cada nivel, registra cada pago recibido y ve quién vence o ya venció.
// El precio de una tienda = suma de los pasos de nivel que tiene prendidos (ver PASOS_PRECIO en lib/modulos.ts),
// salvo que se le haya acordado un monto propio.
// No apaga módulos solo al vencer: hoy es un tablero de control, no un candado.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import { hoyLima } from '@/lib/fechaLima';
import { PLANES } from '@/lib/planesNegocios';
import NivelesModulos from '@/components/superadmin/NivelesModulos';
import { PAQUETES_CARGA, CLAVES_CARGA } from '@/lib/paquetesCarga';
import { MODULOS_CATALOGO, CLAVES_MODULOS_CATALOGO } from '@/lib/modulosCatalogo';
import {
  PASOS_PRECIO, estadoCobro, nivelAlcance, nivelOperacion, pasosDeTienda, precioSugerido, sumarMeses,
  PERIODOS_COBRO, POR_UNIDAD, cargoMensual, totalCargo, mensualDeAnual,
  type Modulos, type TipoCobro, type CargoTienda, type PeriodoCobro, type PorUnidad,
} from '@/lib/modulos';

interface Tienda { slug: string; name: string; status: string | null; modulos: Modulos | null; subdominio_activo: boolean | null }
interface Suscripcion { store: string; monto_mensual: number | null; vence: string | null; notas: string | null; descuento_hasta?: string | null }
interface Pago { id: string; store: string; monto: number; metodo: string | null; referencia: string | null; meses: number; vence_despues: string | null; nota: string | null; created_at: string }

// Un precio a tu medida (catálogo). Todo en texto porque se edita en inputs; se convierte al guardar.
interface PrecioExtra { clave: string; nombre: string; monto: string; periodo: PeriodoCobro; por: PorUnidad; oferta: string; ofertaHasta: string }

/** El precio que rige hoy: la oferta si hay y no venció; si no, el normal. */
const precioDe = (x: { monto: string; oferta: string; ofertaHasta: string }, hoy: string) => {
  const normal = Number(x.monto) || 0;
  const oferta = x.oferta.trim() === '' ? null : Number(x.oferta);
  return oferta != null && oferta > 0 && (!x.ofertaHasta || x.ofertaHasta >= hoy) ? oferta : normal;
};

const METODOS = ['Yape', 'Plin', 'Transferencia', 'Efectivo', 'Otro'];
const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ALCANCE_TXT = { carta: 'Carta', app: 'App', app_google: 'App + Google' } as const;
const OPERACION_TXT = { sin_caja: 'Sin caja', ventas: 'Ventas', inventario: 'Ventas + Inventario', 'sin-clasificar': 'Todo (sin clasificar)' } as const;

const ESTADO_UI: Record<TipoCobro, { texto: (d: number | null) => string; clase: string }> = {
  sin_costo: { texto: () => 'Sin costo', clase: 'bg-slate-100 text-slate-600 border-slate-200' },
  sin_pagos: { texto: () => 'Sin pagos aún', clase: 'bg-amber-50 text-amber-800 border-amber-200' },
  vencido: { texto: (d) => `Vencido hace ${Math.abs(d ?? 0)} d`, clase: 'bg-red-50 text-red-700 border-red-200' },
  por_vencer: { texto: (d) => (d === 0 ? 'Vence hoy' : `Vence en ${d} d`), clase: 'bg-amber-50 text-amber-800 border-amber-200' },
  al_dia: { texto: () => 'Al día', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function CobrosPage() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [borPer, setBorPer] = useState<Record<string, PeriodoCobro>>({});   // periodo de cada módulo (mes / año)
  const [extras, setExtras] = useState<PrecioExtra[]>([]);                  // precios a tu medida
  const [cargos, setCargos] = useState<Record<string, CargoTienda[]>>({});    // cargos extra por tienda
  const [flexError, setFlexError] = useState('');
  const [ofertaAbierta, setOfertaAbierta] = useState<Record<string, boolean>>({});   // filas de "otros precios" con la oferta desplegada
  const [borPor, setBorPor] = useState<Record<string, PorUnidad>>({});                 // módulos que se cobran por alumno / producto (borrador)
  const [borOf, setBorOf] = useState<Record<string, { oferta: string; hasta: string }>>({}); // ofertas de los módulos (borrador)
  const [porGuardado, setPorGuardado] = useState<Record<string, PorUnidad>>({});         // lo que está guardado: de ahí salen los totales
  const [unidades, setUnidades] = useState<Record<string, Record<string, number>>>({}); // clave de módulo → tienda → cuántas unidades tiene
  const [flexOk, setFlexOk] = useState(true);                                // ¿ya existe el SQL de cobros flexibles?
  const [subs, setSubs] = useState<Record<string, Suscripcion>>({});
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [sinTablas, setSinTablas] = useState(false);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [gestion, setGestion] = useState<string | null>(null);   // slug de la tienda abierta en el modal
  const [vista, setVista] = useState<'tiendas' | 'precios'>('tiendas');
  // Enlaces como /superadmin/cobros?vista=precios abren directo la pestaña Precios.
  useEffect(() => { if (new URLSearchParams(window.location.search).get('vista') === 'precios') setVista('precios'); }, []);
  const [filtro, setFiltro] = useState<'todas' | 'atender' | 'aldia'>('todas');
  const [busca, setBusca] = useState('');

  const hoy = hoyLima();

  const cargar = useCallback(async () => {
    const [t, pr0, pa, cg] = await Promise.all([
      supabase.from('stores').select('slug,name,status,modulos,subdominio_activo').order('name'),
      supabase.from('plan_precios').select('clave,monto,periodo,por,monto_anual,monto_oferta,oferta_hasta,nombre'),
      supabase.from('store_pagos').select('id,store,monto,metodo,referencia,meses,vence_despues,nota,created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('store_cargos').select('id,store,nombre,monto,periodo,por,cantidad,nota').order('created_at'),
    ]);
    // Las columnas nuevas de plan_precios y store_cargos vienen del SQL de «Cobros flexibles»: sin él, todo sigue como antes.
    let pr = pr0;
    const flex = !pr0.error;
    if (pr0.error) pr = (await supabase.from('plan_precios').select('clave,monto')) as unknown as typeof pr0;
    setFlexOk(flex);
    setFlexError(pr0.error?.message ?? '');
    setTiendas((t.data ?? []) as Tienda[]);
    // `descuento_hasta` es columna nueva: si el SQL todavía no se corrió, reintenta sin ella en vez
    // de tumbar toda la pantalla de Cobros por un campo que todavía nadie usó.
    let su = await supabase.from('store_suscripciones').select('store,monto_mensual,vence,notas,descuento_hasta');
    if (su.error) su = await supabase.from('store_suscripciones').select('store,monto_mensual,vence,notas');
    if (pr.error || su.error || pa.error) { setSinTablas(true); return; }
    setSinTablas(false);
    const mapaPrecios: Record<string, number> = {};
    type FilaPr = { clave: string; monto: number; periodo?: PeriodoCobro; por?: PorUnidad; monto_anual?: number | null; monto_oferta?: number | null; oferta_hasta?: string | null; nombre?: string | null };
    const filasPr = (pr.data ?? []) as unknown as FilaPr[];
    // Precio mensual que rige hoy: si el módulo está en oferta y no venció, manda la oferta (tecleada en el mismo periodo que el precio).
    filasPr.forEach((r) => {
      if (r.clave.startsWith('custom:') || CLAVES_CARGA.includes(r.clave) || CLAVES_MODULOS_CATALOGO.includes(r.clave)) return;
      const anual = r.periodo === 'anio';
      const normal = Number(r.monto) || 0;
      const enOferta = r.monto_oferta != null && Number(r.monto_oferta) > 0 && (!r.oferta_hasta || r.oferta_hasta >= hoy);
      mapaPrecios[r.clave] = enOferta ? (anual ? mensualDeAnual(Number(r.monto_oferta)) : Number(r.monto_oferta)) : normal;
    });
    setPrecios(mapaPrecios);
    const porMap: Record<string, PorUnidad> = {};
    PASOS_PRECIO.forEach((q) => { const por = filasPr.find((r) => r.clave === q.clave)?.por ?? null; if (por) porMap[q.clave] = por as PorUnidad; });
    setPorGuardado(porMap);
    setBorPor(porMap);
    setBorOf(Object.fromEntries(filasPr.filter((r) => !r.clave.startsWith('custom:') && r.monto_oferta != null).map((r) => [r.clave, { oferta: String(r.monto_oferta), hasta: r.oferta_hasta ?? '' }])));
    // Cuántas unidades tiene cada tienda en los módulos que se cobran por alumno / producto.
    const conteos: Record<string, Record<string, number>> = {};
    await Promise.all(Object.entries(porMap).flatMap(([clave, por]) =>
      ((t.data ?? []) as Tienda[]).filter((tt) => pasosDeTienda(tt).includes(clave)).map(async (tt) => {
        const q = por === 'alumno'
          ? supabase.from('alumnos').select('id', { count: 'exact', head: true }).eq('store', tt.slug).eq('activo', true)
          : supabase.from('products').select('id', { count: 'exact', head: true }).eq('store', tt.slug);
        const { count } = await q;
        (conteos[clave] ??= {})[tt.slug] = count ?? 0;
      }),
    ));
    setUnidades(conteos);
    const porClave = Object.fromEntries(filasPr.map((r) => [r.clave, r]));
    setBorrador(Object.fromEntries(PASOS_PRECIO.map((p) => {
      const r = porClave[p.clave];
      const anual = r?.periodo === 'anio' && r.monto_anual != null;
      return [p.clave, r ? String(anual ? r.monto_anual : r.monto) : ''];
    })));
    setBorPer(Object.fromEntries(PASOS_PRECIO.map((p) => [p.clave, (porClave[p.clave]?.periodo ?? 'mes') as PeriodoCobro])));
    // Precios a tu medida (custom:*) + los paquetes de carga de productos (antes se editaban en Paquetes; siguen siendo precios de una sola vez).
    const propios: PrecioExtra[] = filasPr.filter((r) => r.clave.startsWith('custom:') || CLAVES_CARGA.includes(r.clave) || CLAVES_MODULOS_CATALOGO.includes(r.clave)).map((r) => ({
      clave: r.clave,
      nombre: r.nombre ?? PAQUETES_CARGA.find((c) => c.clave === r.clave)?.nombre ?? MODULOS_CATALOGO.find((c) => c.clave === r.clave)?.nombre ?? '',
      monto: String(r.monto ?? ''),
      periodo: (CLAVES_CARGA.includes(r.clave) && !r.nombre ? 'unico' : (r.periodo ?? 'unico')) as PeriodoCobro,
      por: (r.por ?? null) as PorUnidad,
      oferta: r.monto_oferta != null ? String(r.monto_oferta) : '',
      ofertaHasta: r.oferta_hasta ?? '',
    }));
    PAQUETES_CARGA.forEach((c) => {
      if (!propios.some((x) => x.clave === c.clave)) propios.push({ clave: c.clave, nombre: c.nombre, monto: String(c.precio), periodo: 'unico', por: null, oferta: '', ofertaHasta: '' });
    });
    MODULOS_CATALOGO.forEach((m) => {
      if (!propios.some((x) => x.clave === m.clave)) propios.push({ clave: m.clave, nombre: m.nombre, monto: String(m.precio), periodo: m.periodo, por: m.por, oferta: '', ofertaHasta: '' });
    });
    setExtras(propios);
    const mapaCargos: Record<string, CargoTienda[]> = {};
    ((cg.error ? [] : cg.data ?? []) as unknown as CargoTienda[]).forEach((c) => { (mapaCargos[c.store] ??= []).push({ ...c, monto: Number(c.monto) || 0, cantidad: Number(c.cantidad) || 1 }); });
    setCargos(mapaCargos);
    const mapaSubs: Record<string, Suscripcion> = {};
    (su.data ?? []).forEach((r: Suscripcion) => { mapaSubs[r.store] = r; });
    setSubs(mapaSubs);
    setPagos((pa.data ?? []) as Pago[]);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/cobros');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => {
    if (!esSuperadmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [esSuperadmin, cargar]);

  const filas = useMemo(
    () =>
      tiendas.map((t) => {
        const sugerido = pasosDeTienda(t).reduce((acc, clave) => acc + (precios[clave] || 0) * (porGuardado[clave] ? (unidades[clave]?.[t.slug] ?? 0) : 1), 0);
        const sub = subs[t.slug];
        // Sin fecha de vencimiento, el monto acordado queda fijo para siempre (precio "congelado").
        // Con fecha y ya pasada, el descuento venció: vuelve solo al precio sugerido, sin que nadie
        // tenga que entrar a quitarlo a mano.
        const descuentoVigente = sub?.monto_mensual != null && (!sub.descuento_hasta || sub.descuento_hasta >= hoy);
        // Los cargos extra (por producto, por alumno, anuales…) se suman aparte: no los toca el descuento del plan.
        const base = descuentoVigente ? (sub!.monto_mensual as number) : sugerido;
        const extrasMes = (cargos[t.slug] ?? []).reduce((acc, c) => acc + cargoMensual(c), 0);
        const monto = base + extrasMes;
        return { tienda: t, sugerido, sub, base, extrasMes, monto, descuentoVigente, estado: estadoCobro(sub?.vence, monto, hoy) };
      }),
    [tiendas, precios, subs, cargos, porGuardado, unidades, hoy],
  );

  const resumen = useMemo(() => {
    const mes = hoy.slice(0, 7);
    return {
      esperado: filas.reduce((s, f) => s + f.monto, 0),
      cobradoMes: pagos.filter((p) => p.created_at.slice(0, 7) === mes).reduce((s, p) => s + Number(p.monto), 0),
      vencidos: filas.filter((f) => f.estado.tipo === 'vencido').length,
      porVencer: filas.filter((f) => f.estado.tipo === 'por_vencer').length,
    };
  }, [filas, pagos, hoy]);

  const guardarPrecios = async () => {
    setGuardandoPrecios(true);
    const ahora = new Date().toISOString();
    // monto = SIEMPRE el equivalente mensual (lo que leen la landing, Paquetes y "Tu plan"). Si es anual, lo tecleado va aparte.
    const pasos = PASOS_PRECIO.map((p) => {
      const v = Math.max(0, Number(borrador[p.clave]) || 0);
      const anual = !p.clave.startsWith('alcance:') && (borPer[p.clave] ?? 'mes') === 'anio';
      return {
        clave: p.clave,
        monto: anual ? mensualDeAnual(v) : v,
        ...(flexOk ? {
          periodo: anual ? 'anio' : 'mes',
          monto_anual: anual ? v : null,
          por: p.clave.startsWith('alcance:') ? null : (borPor[p.clave] ?? null),
          monto_oferta: !p.clave.startsWith('alcance:') && borOf[p.clave]?.oferta.trim() ? Math.max(0, Number(borOf[p.clave].oferta) || 0) : null,
          oferta_hasta: !p.clave.startsWith('alcance:') && borOf[p.clave]?.oferta.trim() && borOf[p.clave].hasta ? borOf[p.clave].hasta : null,
        } : {}),
        updated_at: ahora,
      };
    });
    const propios = flexOk
      ? extras.map((x) => ({
          clave: x.clave,
          nombre: x.nombre.trim() || 'Sin nombre',
          monto: Math.max(0, Number(x.monto) || 0),
          periodo: x.periodo,
          por: x.por,
          monto_oferta: x.oferta.trim() === '' ? null : Math.max(0, Number(x.oferta) || 0),
          oferta_hasta: x.oferta.trim() !== '' && x.ofertaHasta ? x.ofertaHasta : null,
          updated_at: ahora,
        }))
      : [];
    const { error } = await supabase.from('plan_precios').upsert([...pasos, ...propios], { onConflict: 'clave' });
    setGuardandoPrecios(false);
    setMensaje(error ? `No se pudieron guardar los precios: ${error.message}` : 'Precios guardados.');
    if (!error) cargar();
  };

  const quitarExtra = async (clave: string) => {
    if (!confirm('¿Quitar este precio de tu lista? Los cargos que ya pusiste a tiendas no se borran.')) return;
    setExtras((l) => l.filter((x) => x.clave !== clave));
    if (flexOk) await supabase.from('plan_precios').delete().eq('clave', clave);
  };

  if (cargando) return <div className="p-10 text-center text-[#424754] text-sm font-semibold">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const abierta = filas.find((f) => f.tienda.slug === gestion) ?? null;
  // Otros precios en orden: a tu medida → carga de productos → módulos que ya existen → módulos aún sin construir (con bandera).
  type GrupoExtra = 'medida' | 'carga' | 'modulo' | 'sin_construir';
  const ETIQUETA_GRUPO: Record<GrupoExtra, string> = { medida: 'A tu medida', carga: 'Carga de productos (una sola vez)', modulo: 'Módulos del catálogo', sin_construir: 'Módulos que todavía no existen' };
  const grupoDe = (clave: string): GrupoExtra =>
    CLAVES_CARGA.includes(clave) ? 'carga'
      : clave.startsWith('mod:') ? (MODULOS_CATALOGO.find((m) => m.clave === clave)?.construido ? 'modulo' : 'sin_construir')
        : 'medida';
  const ORDEN_GRUPO: GrupoExtra[] = ['medida', 'carga', 'modulo', 'sin_construir'];
  const grupoExtras = extras
    .map((x, i) => ({ x, i, grupo: grupoDe(x.clave) }))
    .sort((a, b) => ORDEN_GRUPO.indexOf(a.grupo) - ORDEN_GRUPO.indexOf(b.grupo))
    .map((e, k, arr) => ({ ...e, primero: k === 0 || arr[k - 1].grupo !== e.grupo }));
  // Lo que pide atención primero: vencidas, luego por vencer, luego sin pagos; las al día al final.
  const URGENCIA: Record<TipoCobro, number> = { vencido: 0, por_vencer: 1, sin_pagos: 2, al_dia: 3, sin_costo: 4 };
  const atender = (t: TipoCobro) => t === 'vencido' || t === 'por_vencer' || t === 'sin_pagos';
  const visibles = filas
    .filter((f) => (filtro === 'todas' ? true : filtro === 'atender' ? atender(f.estado.tipo) : !atender(f.estado.tipo)))
    .filter((f) => !busca.trim() || f.tienda.name.toLowerCase().includes(busca.trim().toLowerCase()) || f.tienda.slug.includes(busca.trim().toLowerCase()))
    .sort((a, b) => URGENCIA[a.estado.tipo] - URGENCIA[b.estado.tipo] || a.tienda.name.localeCompare(b.tienda.name));
  const nAtender = filas.filter((f) => atender(f.estado.tipo)).length;

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23]">
      <SuperadminSubheader title="Cobros" icon="payments" />
      <main className="max-w-[900px] mx-auto px-4 py-8 flex flex-col gap-8">
        {sinTablas && (
          <div className="p-4 bg-[#fff8e1] border border-[#f5c518]/50 rounded-md text-xs text-[#5c4a00] font-semibold">
            Falta correr el SQL de «Cobros» de <code>supabase_setup.sql</code> en Supabase (tablas plan_precios, store_suscripciones y store_pagos).
            Mientras tanto no se puede guardar nada aquí.
          </div>
        )}
        {mensaje && <div className="p-3 bg-[#f2f3fd] border border-[#c2c6d6] rounded-md text-xs font-semibold text-[#424754]">{mensaje}</div>}

        {/* Resumen */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { t: 'Ingreso mensual esperado', v: soles(resumen.esperado), c: 'text-[#191b23]' },
            { t: 'Cobrado este mes', v: soles(resumen.cobradoMes), c: 'text-emerald-700' },
            { t: 'Vencidos', v: String(resumen.vencidos), c: resumen.vencidos ? 'text-red-600' : 'text-[#191b23]' },
            { t: 'Vencen en 7 días', v: String(resumen.porVencer), c: resumen.porVencer ? 'text-amber-700' : 'text-[#191b23]' },
          ].map((k) => (
            <div key={k.t} className="p-4 bg-white border border-[#c2c6d6] rounded-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">{k.t}</p>
              <p className={`text-xl font-bold mt-1 ${k.c}`}>{k.v}</p>
            </div>
          ))}
        </section>

        {/* Dos tareas distintas: cobrar (a diario) y fijar precios (de vez en cuando) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#f2f3fd] rounded-lg">
          {([
            { id: 'tiendas', t: 'Tiendas', i: 'storefront' },
            { id: 'precios', t: 'Precios', i: 'sell' },
          ] as const).map((o) => (
            <button
              key={o.id}
              onClick={() => setVista(o.id)}
              className={`py-2.5 rounded-md text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${vista === o.id ? 'bg-white text-[#0058be] shadow-sm' : 'text-[#545f73] hover:text-[#191b23]'}`}
            >
              <span className="material-symbols-outlined text-[18px]">{o.i}</span>{o.t}
            </button>
          ))}
        </div>

        {vista === 'tiendas' && (<>
        {/* Tiendas */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Tiendas ({visibles.length})</h2>
            <div className="flex gap-1 p-1 bg-[#f2f3fd] rounded-lg">
              {([
                { id: 'todas', t: 'Todas' },
                { id: 'atender', t: `Por atender${nAtender ? ` (${nAtender})` : ''}` },
                { id: 'aldia', t: 'Al día' },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setFiltro(o.id)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${filtro === o.id ? 'bg-white text-[#0058be] shadow-sm' : 'text-[#545f73]'}`}
                >
                  {o.t}
                </button>
              ))}
            </div>
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tienda…"
            className="w-full bg-white border border-[#c2c6d6] rounded-md px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be]"
          />
          <div className="flex flex-col gap-2">
            {visibles.map((f) => {
              const ui = ESTADO_UI[f.estado.tipo];
              return (
                <div key={f.tienda.slug} className="bg-white border border-[#c2c6d6] rounded-md p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-bold">{f.tienda.name}</p>
                    <p className="text-[11px] text-[#727785] font-semibold">
                      {ALCANCE_TXT[nivelAlcance(f.tienda)]} · {OPERACION_TXT[nivelOperacion(f.tienda.modulos)]}
                      {f.tienda.modulos?.marca_blanca ? ' · Marca blanca' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{soles(f.monto)}<span className="text-[10px] text-[#727785] font-semibold"> /mes</span></p>
                    <p className="text-[10px] text-[#727785] font-semibold">
                      {f.descuentoVigente ? 'monto acordado' : 'precio sugerido'}
                    </p>
                    {f.extrasMes > 0 && <p className="text-[10px] font-semibold text-[#0058be]">incluye {soles(f.extrasMes)} en cargos extra</p>}
                    {f.sub?.monto_mensual != null && f.sub.descuento_hasta && (
                      <p className={`text-[10px] font-semibold ${f.descuentoVigente ? 'text-amber-700' : 'text-[#727785] italic'}`}>
                        {f.descuentoVigente ? `descuento hasta ${f.sub.descuento_hasta}` : `descuento venció el ${f.sub.descuento_hasta}`}
                      </p>
                    )}
                  </div>
                  <div className="w-28 text-right">
                    <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full border ${ui.clase}`}>{ui.texto(f.estado.dias)}</span>
                    {f.sub?.vence && <p className="text-[10px] text-[#727785] font-semibold mt-1">hasta {f.sub.vence}</p>}
                  </div>
                  <button
                    onClick={() => setGestion(f.tienda.slug)}
                    className="px-3 py-2 border border-[#c2c6d6] rounded-md text-xs font-bold text-[#0058be] hover:bg-[#f2f3fd] transition-colors"
                  >
                    Gestionar
                  </button>
                </div>
              );
            })}
            {visibles.length === 0 && <p className="text-xs text-[#727785] italic">{filas.length === 0 ? 'Todavía no hay tiendas.' : 'Ninguna tienda coincide.'}</p>}
          </div>
        </section>
        </>)}

        {vista === 'precios' && (<>
        {/* Precios: 3 planes (lo que incluye cada uno) + módulos que se suman */}
          <div className="flex flex-col gap-5">
            <p className="text-xs text-[#424754]">
              Cada tienda paga la <b>suma</b> de lo que tiene prendido: la Carta base + su plan + sus módulos. Ejemplo: App + Ventas + Inventario = Carta + App + Ventas + Inventario.
            </p>

            {/* Los 3 planes */}
            <div className="grid md:grid-cols-3 gap-3">
              {([
                { clave: 'alcance:carta', plan: PLANES[0], suma: null as string | null },
                { clave: 'alcance:app', plan: PLANES[1], suma: 'alcance:carta' },
                { clave: 'alcance:app_google', plan: PLANES[2], suma: 'alcance:carta' },
              ]).map(({ clave, plan, suma }) => {
                const propio = Number(borrador[clave]) || 0;
                const base = suma ? Number(borrador[suma]) || 0 : 0;
                return (
                  <div key={clave} className="flex flex-col gap-3 border border-[#c2c6d6] rounded-lg p-3 bg-[#f9f9ff]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[20px]">{plan.icon}</span>
                      <p className="text-sm font-black">{plan.nombre}</p>
                      {plan.etiqueta && <span className="text-[9px] font-black uppercase tracking-wider bg-[#0058be] text-white rounded-full px-2 py-0.5">{plan.etiqueta}</span>}
                    </div>
                    <label className="text-[10px] font-bold text-[#545f73]">
                      {suma ? 'Se suma a la Carta (S/ al mes)' : 'Precio base (S/ al mes)'}
                      <input
                        type="number" min={0} step="1" inputMode="decimal"
                        value={borrador[clave] ?? ''}
                        onChange={(e) => setBorrador((b) => ({ ...b, [clave]: e.target.value }))}
                        placeholder="0"
                        className="w-full mt-1 bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-sm font-bold outline-none focus:border-[#0058be]"
                      />
                    </label>
                    {suma && <p className="text-[11px] font-bold text-[#0058be]">Una tienda con este plan paga {soles(base + propio)} /mes</p>}
                    <ul className="flex flex-col gap-1">
                      {plan.bullets.map((b) => (
                        <li key={b} className="flex gap-1.5 text-[11px] text-[#424754] font-semibold leading-snug">
                          <span className="material-symbols-outlined text-[14px] text-emerald-600 shrink-0">check</span>{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Módulos que se suman encima de cualquier plan */}
            <div>
              <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest mb-2">Módulos que se suman encima del plan</p>
              <div className="border border-[#ecedf7] rounded-md divide-y divide-[#ecedf7]">
                {PASOS_PRECIO.filter((p) => !p.clave.startsWith('alcance:')).map((p) => {
                  const modo = borPor[p.clave] ? 'unidad' : ((borPer[p.clave] ?? 'mes') as string);   // 'mes' | 'anio' | 'unidad'
                  const ofer = borOf[p.clave];
                  const poner = (m: string) => {
                    if (m === 'unidad') { setBorPor((b) => ({ ...b, [p.clave]: (b[p.clave] ?? (p.clave === 'extra:academia' ? 'alumno' : 'producto')) as PorUnidad })); setBorPer((b) => ({ ...b, [p.clave]: 'mes' })); }
                    else { setBorPor((b) => ({ ...b, [p.clave]: null })); setBorPer((b) => ({ ...b, [p.clave]: m as PeriodoCobro })); }
                  };
                  const campoNum = 'w-24 bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-sm font-bold text-right outline-none focus:border-[#0058be]';
                  return (
                    <div key={p.clave} className="px-3 py-2.5 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className="flex-1 min-w-[200px]">
                          <span className="block text-xs font-bold">{p.etiqueta}</span>
                          <span className="block text-[10px] text-[#727785] font-semibold">{p.ayuda}</span>
                        </span>
                        <span className="text-xs font-bold text-[#424754]">S/</span>
                        <input
                          type="number" min={0} step="0.01" inputMode="decimal"
                          value={borrador[p.clave] ?? ''}
                          onChange={(e) => setBorrador((b) => ({ ...b, [p.clave]: e.target.value }))}
                          placeholder="0"
                          className={campoNum}
                        />
                        <select
                          value={modo}
                          onChange={(e) => poner(e.target.value)}
                          disabled={!flexOk}
                          title={flexOk ? 'Cada cuánto o por qué se cobra' : 'Falta correr el SQL de «Cobros flexibles»'}
                          className="bg-[#f8fafc] border border-[#ecedf7] rounded-md px-2 py-2 text-xs font-bold outline-none focus:border-[#0058be] disabled:opacity-50"
                        >
                          <option value="mes">al mes</option>
                          <option value="anio">al año</option>
                          <option value="unidad">por unidad (al mes)</option>
                        </select>
                        {modo === 'unidad' && (
                          <select
                            value={borPor[p.clave] ?? 'alumno'}
                            onChange={(e) => setBorPor((b) => ({ ...b, [p.clave]: e.target.value as PorUnidad }))}
                            title="Qué se cuenta para multiplicar el precio"
                            className="bg-[#f8fafc] border border-[#ecedf7] rounded-md px-2 py-2 text-xs font-bold outline-none focus:border-[#0058be]"
                          >
                            <option value="alumno">cada alumno</option>
                            <option value="producto">cada producto</option>
                          </select>
                        )}
                      </div>
                      {ofer ? (
                        <div className="flex flex-wrap items-end gap-2 pl-0 sm:pl-3 border-l-2 border-amber-300 ml-1">
                          <label className="text-[10px] font-bold text-[#545f73]">Precio en oferta (S/)
                            <input type="number" min={0} step="0.01" value={ofer.oferta} onChange={(e) => setBorOf((b) => ({ ...b, [p.clave]: { ...ofer, oferta: e.target.value } }))} className={`${campoNum} block mt-1 !text-left`} />
                          </label>
                          <label className="text-[10px] font-bold text-[#545f73]">Hasta (opcional)
                            <input type="date" value={ofer.hasta} onChange={(e) => setBorOf((b) => ({ ...b, [p.clave]: { ...ofer, hasta: e.target.value } }))} className="block mt-1 bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be]" />
                          </label>
                          <button type="button" onClick={() => setBorOf((b) => { const n = { ...b }; delete n[p.clave]; return n; })} className="text-[11px] font-bold text-[#727785] underline pb-2">Quitar oferta</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setBorOf((b) => ({ ...b, [p.clave]: { oferta: '', hasta: '' } }))} disabled={!flexOk} className="self-start text-[11px] font-bold text-[#0058be] disabled:opacity-40">+ Poner en oferta</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Precios a tu medida: por unidad, con oferta, de una sola vez… se cobran a una tienda desde "Gestionar" */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Otros precios (módulos del catálogo, carga de productos, a tu medida)</p>
                  <p className="text-[10px] text-[#727785] font-semibold mt-0.5">Se cobran a una tienda desde "Gestionar" → Cargos. Ejemplo: "Producto en la tienda online" a S/ 10 por producto, con oferta a S/ 5.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExtras((l) => [...l, { clave: `custom:${Date.now().toString(36)}`, nombre: '', monto: '', periodo: 'unico', por: null, oferta: '', ofertaHasta: '' }])}
                  className="shrink-0 px-3 py-2 border border-[#c2c6d6] text-[#0058be] rounded-md font-bold text-xs hover:bg-[#f2f3fd]"
                >
                  + Agregar precio
                </button>
              </div>
              {!flexOk && (
                <p className="text-[11px] font-semibold text-[#5c4a00] bg-[#fff8e1] border border-[#f5c518]/50 rounded-md px-3 py-2 mb-2">
                  Falta correr el SQL de «Cobros flexibles» de <code>supabase_setup.sql</code> en Supabase para guardar estos precios.
                  {flexError && <span className="block mt-1 font-mono text-[10px] break-words">Supabase dice: {flexError}</span>}
                </p>
              )}
              {extras.length === 0 ? (
                <p className="text-xs text-[#727785] italic">Todavía no hay precios a tu medida.</p>
              ) : (
                <div className="border border-[#ecedf7] rounded-md divide-y divide-[#ecedf7]">
                  {grupoExtras.map(({ x, i, grupo, primero }) => {
                    const cambiar = (c: Partial<PrecioExtra>) => setExtras((l) => l.map((y, j) => (j === i ? { ...y, ...c } : y)));
                    const sinConstruir = grupo === 'sin_construir';
                    const propio = x.clave.startsWith('custom:');
                    const detalle = PAQUETES_CARGA.find((c) => c.clave === x.clave)?.detalle ?? MODULOS_CATALOGO.find((c) => c.clave === x.clave)?.detalle ?? '';
                    // Mismo selector que los módulos de arriba: al mes · al año · una sola vez · por unidad.
                    const modo = x.por ? 'unidad' : x.periodo;
                    const poner = (m: string) => {
                      if (m === 'unidad') cambiar({ por: x.por ?? 'producto', periodo: x.periodo === 'anio' ? 'mes' : x.periodo });
                      else cambiar({ por: null, periodo: m as PeriodoCobro });
                    };
                    const campoNum = 'w-24 bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-sm font-bold text-right outline-none focus:border-[#0058be]';
                    const campoSel = 'bg-[#f8fafc] border border-[#ecedf7] rounded-md px-2 py-2 text-xs font-bold outline-none focus:border-[#0058be]';
                    return (
                      <div key={x.clave} className={sinConstruir ? 'bg-[#f7f7fa]' : ''}>
                        {primero && <p className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-[#424754] bg-white">{ETIQUETA_GRUPO[grupo]}</p>}
                        <div className="px-3 py-2.5 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="flex-1 min-w-[200px]">
                              {propio ? (
                                <input value={x.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} placeholder="Nombre (ej. Producto en la tienda online)" className="w-full bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be]" />
                              ) : (
                                <>
                                  <span className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold">{x.nombre}</span>
                                    {sinConstruir && <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-[#8a5a00] bg-[#fff1cc] border border-[#f1d28a] rounded-full px-1.5 py-0.5"><span className="material-symbols-outlined text-[11px]">flag</span>Aún no construido</span>}
                                  </span>
                                  {detalle && <span className="block text-[10px] text-[#727785] font-semibold">{detalle}</span>}
                                </>
                              )}
                            </span>
                            <span className="text-xs font-bold text-[#424754]">S/</span>
                            <input type="number" min={0} step="0.01" inputMode="decimal" value={x.monto} onChange={(e) => cambiar({ monto: e.target.value })} placeholder="0" className={campoNum} />
                            <select value={modo} onChange={(e) => poner(e.target.value)} disabled={!flexOk} className={`${campoSel} disabled:opacity-50`}>
                              <option value="mes">al mes</option>
                              <option value="anio">al año</option>
                              <option value="unico">una sola vez</option>
                              <option value="unidad">por unidad</option>
                            </select>
                            {modo === 'unidad' && (
                              <>
                                <select value={x.por ?? 'producto'} onChange={(e) => cambiar({ por: e.target.value as PorUnidad })} title="Qué se cuenta" className={campoSel}>
                                  {POR_UNIDAD.map((p) => <option key={p.id} value={p.id}>{p.texto.replace('por ', 'cada ')}</option>)}
                                </select>
                                <select value={x.periodo === 'anio' ? 'mes' : x.periodo} onChange={(e) => cambiar({ periodo: e.target.value as PeriodoCobro })} title="Cada cuánto se cobra" className={campoSel}>
                                  <option value="mes">al mes</option>
                                  <option value="unico">una sola vez</option>
                                </select>
                              </>
                            )}
                            {propio && (
                              <button type="button" onClick={() => quitarExtra(x.clave)} title="Quitar este precio" className="w-8 h-8 shrink-0 flex items-center justify-center text-[#a3a8b8] hover:text-red-600 hover:bg-red-50 rounded">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                          {x.oferta !== '' || ofertaAbierta[x.clave] ? (
                            <div className="flex flex-wrap items-end gap-2 sm:pl-3 border-l-2 border-amber-300 ml-1">
                              <label className="text-[10px] font-bold text-[#545f73]">Precio en oferta (S/)
                                <input type="number" min={0} step="0.01" value={x.oferta} onChange={(e) => cambiar({ oferta: e.target.value })} className={`${campoNum} block mt-1 !text-left`} />
                              </label>
                              <label className="text-[10px] font-bold text-[#545f73]">Hasta (opcional)
                                <input type="date" value={x.ofertaHasta} onChange={(e) => cambiar({ ofertaHasta: e.target.value })} className="block mt-1 bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be]" />
                              </label>
                              <button type="button" onClick={() => { cambiar({ oferta: '', ofertaHasta: '' }); setOfertaAbierta((o) => ({ ...o, [x.clave]: false })); }} className="text-[11px] font-bold text-[#727785] underline pb-2">Quitar oferta</button>
                              <span className="text-[11px] font-bold text-[#0058be] pb-2">Se cobrará {soles(precioDe(x, hoy))}{x.por ? ` ${POR_UNIDAD.find((p) => p.id === x.por)?.texto}` : ''}</span>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setOfertaAbierta((o) => ({ ...o, [x.clave]: true }))} disabled={!flexOk} className="self-start text-[11px] font-bold text-[#0058be] disabled:opacity-40">+ Poner en oferta</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={guardarPrecios}
              disabled={guardandoPrecios || sinTablas}
              className="self-start px-4 py-2.5 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] disabled:opacity-50 transition-colors"
            >
              {guardandoPrecios ? 'Guardando…' : 'Guardar precios'}
            </button>

            {/* Todo lo que se vende y qué trae cada plan (antes vivía en Paquetes). Se va ajustando acá. */}
            <div className="border-t border-[#ecedf7] pt-5">
              <NivelesModulos />
            </div>
          </div>
        </>)}
      </main>

      {abierta && (
        <GestionTienda
          fila={abierta}
          hoy={hoy}
          cargos={cargos[abierta.tienda.slug] ?? []}
          catalogo={extras}
          pagos={pagos.filter((p) => p.store === abierta.tienda.slug)}
          deshabilitado={sinTablas}
          onClose={() => setGestion(null)}
          onCambio={(msg) => { setMensaje(msg); cargar(); }}
        />
      )}
    </div>
  );
}

function GestionTienda({
  fila, hoy, cargos, catalogo, pagos, deshabilitado, onClose, onCambio,
}: {
  fila: { tienda: Tienda; sugerido: number; sub?: Suscripcion; base: number; extrasMes: number; monto: number; descuentoVigente: boolean; estado: ReturnType<typeof estadoCobro> };
  hoy: string;
  cargos: CargoTienda[];
  catalogo: PrecioExtra[];
  pagos: Pago[];
  deshabilitado: boolean;
  onClose: () => void;
  onCambio: (mensaje: string) => void;
}) {
  const { tienda, sub, sugerido, base: planMes, extrasMes, monto, descuentoVigente, estado } = fila;
  const [pestana, setPestana] = useState<'pago' | 'plan' | 'cargos' | 'historial'>('pago');
  const [fechaAbierta, setFechaAbierta] = useState(false);
  const [acordado, setAcordado] = useState(sub?.monto_mensual != null ? String(sub.monto_mensual) : '');
  const [vence, setVence] = useState(sub?.vence ?? '');
  const [notas, setNotas] = useState(sub?.notas ?? '');
  const [descuentoHasta, setDescuentoHasta] = useState(sub?.descuento_hasta ?? '');
  const [pagoMonto, setPagoMonto] = useState(String(monto || ''));
  const [metodo, setMetodo] = useState(METODOS[0]);
  const [referencia, setReferencia] = useState('');
  const [meses, setMeses] = useState(1);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = sub?.vence && sub.vence > hoy ? sub.vence : hoy;
  const nuevoVence = sumarMeses(base, meses);

  const guardarAcuerdo = async () => {
    setOcupado(true); setError(null);
    const { error: err } = await supabase.from('store_suscripciones').upsert({
      store: tienda.slug,
      monto_mensual: acordado.trim() === '' ? null : Math.max(0, Number(acordado) || 0),
      vence: sub?.vence ?? null,
      notas: notas.trim() || null,
      descuento_hasta: descuentoHasta || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'store' });
    setOcupado(false);
    if (err) { setError(err.message); return; }
    onCambio(`Plan de ${tienda.name} guardado.`);
    onClose();
  };

  // Corrección manual de la fecha de "pagado hasta" (normalmente la mueve sola el registro de pagos).
  const guardarFecha = async () => {
    setOcupado(true); setError(null);
    const { error: err } = await supabase.from('store_suscripciones').upsert({
      store: tienda.slug,
      monto_mensual: sub?.monto_mensual ?? null,
      vence: vence || null,
      notas: sub?.notas ?? null,
      descuento_hasta: sub?.descuento_hasta ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'store' });
    setOcupado(false);
    if (err) { setError(err.message); return; }
    onCambio(`Fecha de pago de ${tienda.name} corregida.`);
    onClose();
  };

  const registrarPago = async () => {
    const montoPago = Number(pagoMonto);
    if (!(montoPago > 0)) { setError('Escribe el monto recibido.'); return; }
    setOcupado(true); setError(null);
    const { error: e1 } = await supabase.from('store_pagos').insert({
      store: tienda.slug, monto: montoPago, metodo, referencia: referencia.trim() || null,
      meses, vence_antes: sub?.vence ?? null, vence_despues: nuevoVence,
    });
    if (e1) { setOcupado(false); setError(e1.message); return; }
    const { error: e2 } = await supabase.from('store_suscripciones').upsert({
      store: tienda.slug,
      monto_mensual: sub?.monto_mensual ?? null,
      vence: nuevoVence,
      notas: sub?.notas ?? null,
      descuento_hasta: sub?.descuento_hasta ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'store' });
    setOcupado(false);
    if (e2) { setError(`El pago se guardó pero no se pudo mover el vencimiento: ${e2.message}`); return; }
    onCambio(`Pago de ${soles(montoPago)} de ${tienda.name} registrado. Pagado hasta ${nuevoVence}.`);
    onClose();
  };

  const borrarPago = async (pago: Pago) => {
    if (!confirm(`¿Borrar el pago de ${soles(Number(pago.monto))} del ${pago.created_at.slice(0, 10)}? Esto NO mueve "Pagado hasta" — si hace falta, corrígelo a mano abajo.`)) return;
    setOcupado(true); setError(null);
    const { error: err } = await supabase.from('store_pagos').delete().eq('id', pago.id);
    setOcupado(false);
    if (err) { setError(err.message); return; }
    onCambio(`Pago de ${soles(Number(pago.monto))} borrado.`);
  };

  // ── Cargos extra de esta tienda ──
  const [cgSel, setCgSel] = useState('');
  const [cgNombre, setCgNombre] = useState('');
  const [cgMonto, setCgMonto] = useState('');
  const [cgPeriodo, setCgPeriodo] = useState<PeriodoCobro>('mes');
  const [cgPor, setCgPor] = useState<PorUnidad>(null);
  const [cgCant, setCgCant] = useState('1');

  const contar = async (por: 'producto' | 'alumno'): Promise<string> => {
    const q = por === 'producto'
      ? supabase.from('products').select('id', { count: 'exact', head: true }).eq('store', tienda.slug)
      : supabase.from('alumnos').select('id', { count: 'exact', head: true }).eq('store', tienda.slug).eq('activo', true);
    const { count } = await q;
    return String(Math.max(1, count ?? 1));
  };

  const elegirCatalogo = (clave: string) => {
    setCgSel(clave);
    const x = catalogo.find((c) => c.clave === clave);
    if (!x) { setCgNombre(''); setCgMonto(''); setCgPeriodo('mes'); setCgPor(null); setCgCant('1'); return; }
    setCgNombre(x.nombre);
    setCgMonto(String(precioDe(x, hoy)));      // la oferta vigente manda sobre el precio normal
    setCgPeriodo(x.periodo);
    setCgPor(x.por);
    if (x.por === 'producto' || x.por === 'alumno') contar(x.por).then(setCgCant); else setCgCant('1');
  };

  const agregarCargo = async () => {
    const monto = Number(cgMonto);
    if (!cgNombre.trim()) { setError('Ponle un nombre al cargo.'); return; }
    if (!(monto >= 0) || cgMonto.trim() === '') { setError('Escribe el precio del cargo.'); return; }
    setOcupado(true); setError(null);
    const { error: err } = await supabase.from('store_cargos').insert({
      store: tienda.slug,
      nombre: cgNombre.trim(),
      monto,
      periodo: cgPeriodo,
      por: cgPor,
      cantidad: cgPor ? Math.max(1, Math.round(Number(cgCant) || 1)) : 1,
    });
    setOcupado(false);
    if (err) { setError(`${err.message} (¿ya corriste el SQL de «Cobros flexibles»?)`); return; }
    setCgSel(''); setCgNombre(''); setCgMonto(''); setCgPor(null); setCgCant('1');
    onCambio(`Cargo «${cgNombre.trim()}» agregado a ${tienda.name}.`);
  };

  const borrarCargo = async (c: CargoTienda) => {
    if (!confirm(`¿Quitar el cargo «${c.nombre}» de ${tienda.name}?`)) return;
    setOcupado(true); setError(null);
    const { error: err } = await supabase.from('store_cargos').delete().eq('id', c.id);
    setOcupado(false);
    if (err) { setError(err.message); return; }
    onCambio(`Cargo «${c.nombre}» quitado.`);
  };

  const campo = 'w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be]';
  const ui = ESTADO_UI[estado.tipo];
  const pactado = acordado.trim() !== '' ? Number(acordado) : null;
  const hayDescuento = pactado !== null && !isNaN(pactado) && pactado < sugerido;
  const ahorro = hayDescuento ? sugerido - (pactado as number) : 0;
  const pct = hayDescuento && sugerido > 0 ? Math.round((ahorro / sugerido) * 100) : 0;
  const pestanas: { id: 'pago' | 'plan' | 'cargos' | 'historial'; texto: string }[] = [
    { id: 'pago', texto: 'Registrar pago' },
    { id: 'plan', texto: 'Editar plan' },
    { id: 'cargos', texto: `Cargos (${cargos.length})` },
    { id: 'historial', texto: `Pagos (${pagos.length})` },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-[#191b23]/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-bold text-sm">{tienda.name}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="w-7 h-7 flex items-center justify-center hover:bg-[#e6e7f2] rounded-lg">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* 1. Situación actual de un vistazo */}
          <div className="rounded-lg border border-[#c2c6d6] overflow-hidden">
            <div className="px-4 py-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-[#727785] uppercase tracking-widest">Paga por mes</p>
                <p className="text-2xl font-black leading-tight">{soles(monto)}</p>
                {extrasMes > 0 && <p className="text-[11px] font-semibold text-[#0058be]">Plan {soles(planMes)} + cargos extra {soles(extrasMes)}</p>}
                {descuentoVigente && planMes < sugerido ? (
                  <p className="text-[11px] font-semibold text-amber-700">
                    <span className="line-through text-[#727785]">{soles(sugerido)}</span> · descuento de {soles(sugerido - planMes)}
                    {sub?.descuento_hasta ? ` hasta ${sub.descuento_hasta}` : ''}
                  </p>
                ) : (
                  <p className="text-[11px] font-semibold text-[#727785]">Precio sugerido, sin descuento</p>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full border ${ui.clase}`}>{ui.texto(estado.dias)}</span>
                <p className="text-[11px] font-semibold text-[#424754] mt-1.5">{sub?.vence ? `Pagado hasta ${sub.vence}` : 'Aún no ha pagado'}</p>
              </div>
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          {/* 2. Qué quieres hacer */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#f2f3fd] rounded-lg">
            {pestanas.map((t) => (
              <button
                key={t.id}
                onClick={() => setPestana(t.id)}
                className={`py-2 rounded-md text-xs font-bold transition-colors ${pestana === t.id ? 'bg-white text-[#0058be] shadow-sm' : 'text-[#545f73] hover:text-[#191b23]'}`}
              >
                {t.texto}
              </button>
            ))}
          </div>

          {pestana === 'pago' && (
            <section className="flex flex-col gap-3">
              <p className="text-[11px] text-[#727785] font-semibold">Anota lo que te acaba de pagar. La fecha de "pagado hasta" se mueve sola; el precio no cambia.</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[10px] font-bold text-[#545f73]">Monto recibido (S/)
                  <input type="number" min={0} step="0.01" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className={`${campo} mt-1`} />
                </label>
                <label className="text-[10px] font-bold text-[#545f73]">Método
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={`${campo} mt-1`}>
                    {METODOS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="text-[10px] font-bold text-[#545f73]">Meses que cubre este pago
                  <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} className={`${campo} mt-1`}>
                    {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>)}
                  </select>
                </label>
                <label className="text-[10px] font-bold text-[#545f73]">N.º de operación (opcional)
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={`${campo} mt-1`} />
                </label>
              </div>
              <p className="text-xs text-[#424754] font-semibold bg-[#f2f3fd] rounded-md px-3 py-2">Quedará pagado hasta <b>{nuevoVence}</b></p>
              <button onClick={registrarPago} disabled={ocupado || deshabilitado} className="w-full px-4 py-3 bg-[#0058be] text-white rounded-md font-bold text-sm hover:bg-[#004395] disabled:opacity-50">
                {ocupado ? 'Guardando…' : 'Registrar pago'}
              </button>

              <div className="border-t border-[#ecedf7] pt-3">
                <button onClick={() => setFechaAbierta((v) => !v)} className="text-[11px] font-bold text-[#727785] hover:text-[#0058be]">
                  {fechaAbierta ? '▾' : '▸'} ¿Se cargó mal la fecha? Corregirla a mano
                </button>
                {fechaAbierta && (
                  <div className="flex items-end gap-2 mt-2">
                    <label className="flex-1 text-[10px] font-bold text-[#545f73]">Pagado hasta
                      <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={`${campo} mt-1`} />
                    </label>
                    <button onClick={guardarFecha} disabled={ocupado || deshabilitado} className="px-4 py-2 border border-[#c2c6d6] text-[#0058be] rounded-md font-bold text-xs hover:bg-[#f2f3fd] disabled:opacity-50">Guardar fecha</button>
                  </div>
                )}
              </div>
            </section>
          )}

          {pestana === 'plan' && (
            <section className="flex flex-col gap-3">
              <p className="text-[11px] text-[#727785] font-semibold">Cuánto paga esta tienda por mes. Si lo dejas vacío, paga el precio sugerido ({soles(sugerido)}).</p>
              <label className="text-[10px] font-bold text-[#545f73]">Monto acordado (S/ al mes)
                <input type="number" min={0} step="0.01" value={acordado} onChange={(e) => setAcordado(e.target.value)} placeholder={`Vacío = ${sugerido}`} className={`${campo} mt-1`} />
              </label>

              {hayDescuento && (
                <div className="rounded-md bg-[#fff4e0] border border-[#f3d9a4] px-3 py-2 text-xs font-bold text-[#7a5200]">
                  Descuento de {soles(ahorro)} al mes ({pct}%) sobre el precio sugerido.
                </div>
              )}

              {hayDescuento && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-[#545f73]">¿Hasta cuándo dura el descuento? (opcional)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { t: '3 meses', v: sumarMeses(hoy, 3) },
                      { t: '6 meses', v: sumarMeses(hoy, 6) },
                      { t: '12 meses', v: sumarMeses(hoy, 12) },
                    ].map((o) => (
                      <button
                        key={o.t}
                        type="button"
                        onClick={() => setDescuentoHasta(o.v)}
                        className={`px-3 py-1.5 rounded-full border text-[11px] font-bold ${descuentoHasta === o.v ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-white text-[#424754] border-[#c2c6d6] hover:bg-[#f2f3fd]'}`}
                      >
                        {o.t}
                      </button>
                    ))}
                  </div>
                  <label className="text-[10px] font-bold text-[#545f73]">o elige una fecha
                    <input type="date" value={descuentoHasta} onChange={(e) => setDescuentoHasta(e.target.value)} className={`${campo} mt-1`} />
                  </label>
                  {descuentoHasta && (
                    <p className="text-[10px] text-[#727785] font-semibold">
                      Después del {descuentoHasta} la tienda vuelve sola a {soles(sugerido)}/mes.{' '}
                      <button type="button" onClick={() => setDescuentoHasta('')} className="underline text-[#0058be]">Quitar fecha</button>
                    </p>
                  )}
                </div>
              )}

              <label className="text-[10px] font-bold text-[#545f73]">Notas
                <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={`${campo} mt-1 resize-none`} />
              </label>
              <button onClick={guardarAcuerdo} disabled={ocupado || deshabilitado} className="w-full px-4 py-3 bg-[#0058be] text-white rounded-md font-bold text-sm hover:bg-[#004395] disabled:opacity-50">
                {ocupado ? 'Guardando…' : 'Guardar plan'}
              </button>
            </section>
          )}

          {pestana === 'cargos' && (
            <section className="flex flex-col gap-3">
              <p className="text-[11px] text-[#727785] font-semibold">Cobros extra de esta tienda, además de su plan: por producto, por alumno, anuales o de una sola vez. Los mensuales y anuales se suman al "Paga por mes".</p>

              {cargos.length === 0 ? (
                <p className="text-xs text-[#727785] italic">Esta tienda todavía no tiene cargos extra.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {cargos.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-xs bg-[#f9f9ff] border border-[#ecedf7] rounded-md px-3 py-2">
                      <span className="min-w-0">
                        <span className="block font-bold truncate">{c.nombre}</span>
                        <span className="block text-[10px] text-[#727785] font-semibold">
                          {c.por ? `${c.cantidad} × ${soles(c.monto)} ${POR_UNIDAD.find((p) => p.id === c.por)?.texto}` : soles(c.monto)} · {PERIODOS_COBRO.find((p) => p.id === c.periodo)?.texto}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-bold whitespace-nowrap">{soles(totalCargo(c))}</span>
                        <button onClick={() => borrarCargo(c)} disabled={ocupado || deshabilitado} title="Quitar este cargo" className="w-6 h-6 flex items-center justify-center text-[#a3a8b8] hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-[#ecedf7] pt-3 flex flex-col gap-2">
                <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Agregar un cargo</p>
                <label className="text-[10px] font-bold text-[#545f73]">Elegir de tus precios
                  <select value={cgSel} onChange={(e) => elegirCatalogo(e.target.value)} className={`${campo} mt-1`}>
                    <option value="">A mi medida (escribirlo yo)</option>
                    {catalogo.map((x) => <option key={x.clave} value={x.clave}>{x.nombre || 'Sin nombre'}</option>)}
                  </select>
                </label>
                <label className="text-[10px] font-bold text-[#545f73]">Nombre
                  <input value={cgNombre} onChange={(e) => setCgNombre(e.target.value)} placeholder="Ej. Diseño de logo" className={`${campo} mt-1`} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold text-[#545f73]">Precio (S/)
                    <input type="number" min={0} step="0.01" value={cgMonto} onChange={(e) => setCgMonto(e.target.value)} className={`${campo} mt-1`} />
                  </label>
                  <label className="text-[10px] font-bold text-[#545f73]">Se cobra
                    <select value={cgPeriodo} onChange={(e) => setCgPeriodo(e.target.value as PeriodoCobro)} className={`${campo} mt-1`}>
                      {PERIODOS_COBRO.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] font-bold text-[#545f73]">Por cada…
                    <select value={cgPor ?? ''} onChange={(e) => { const v = (e.target.value || null) as PorUnidad; setCgPor(v); if (v === 'producto' || v === 'alumno') contar(v).then(setCgCant); else setCgCant('1'); }} className={`${campo} mt-1`}>
                      <option value="">Un solo monto</option>
                      {POR_UNIDAD.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] font-bold text-[#545f73]">Cantidad {cgPor === 'producto' || cgPor === 'alumno' ? '(contada sola, corrígela si hace falta)' : ''}
                    <input type="number" min={1} step="1" value={cgCant} onChange={(e) => setCgCant(e.target.value)} disabled={!cgPor} className={`${campo} mt-1 disabled:opacity-50`} />
                  </label>
                </div>
                <p className="text-xs text-[#424754] font-semibold bg-[#f2f3fd] rounded-md px-3 py-2">
                  Total: <b>{soles((Number(cgMonto) || 0) * (cgPor ? Math.max(1, Number(cgCant) || 1) : 1))}</b> {PERIODOS_COBRO.find((p) => p.id === cgPeriodo)?.texto}
                </p>
                <button onClick={agregarCargo} disabled={ocupado || deshabilitado} className="w-full px-4 py-3 bg-[#0058be] text-white rounded-md font-bold text-sm hover:bg-[#004395] disabled:opacity-50">
                  {ocupado ? 'Guardando…' : 'Agregar cargo'}
                </button>
              </div>
            </section>
          )}

          {pestana === 'historial' && (
            <section className="flex flex-col gap-2">
              {pagos.length === 0 ? (
                <p className="text-xs text-[#727785] italic">Todavía no hay pagos.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {pagos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 text-xs bg-[#f9f9ff] border border-[#ecedf7] rounded-md px-3 py-2">
                      <span className="font-semibold text-[#424754]">
                        {new Date(p.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}{p.metodo || '—'}{p.referencia ? ` · ${p.referencia}` : ''}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-bold whitespace-nowrap">{soles(Number(p.monto))} <span className="text-[10px] text-[#727785]">({p.meses}m)</span></span>
                        <button
                          onClick={() => borrarPago(p)}
                          disabled={ocupado || deshabilitado}
                          title="Borrar este pago (ej. si se cargó por error o duplicado)"
                          className="w-6 h-6 flex items-center justify-center text-[#a3a8b8] hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
