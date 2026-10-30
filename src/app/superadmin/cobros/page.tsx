"use client";

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
import EditorPlanes from '@/components/superadmin/EditorPlanes';
import type { PlanComercial } from '@/lib/planesComerciales';
import NivelesModulos from '@/components/superadmin/NivelesModulos';
import CatalogoOrdenado from '@/components/superadmin/CatalogoOrdenado';
import MatrizPlanes from '@/components/superadmin/MatrizPlanes';
import HistorialPromociones from '@/components/superadmin/HistorialPromociones';
import ContactoBoga from '@/components/superadmin/ContactoBoga';
import { generarPdfCobro } from '@/lib/pdfCobro';
import { compartirPDF } from '@/lib/pdfPedido';
import { INITIAL_MODULES } from '@/lib/modulosPaquetes';
import { PAQUETES_CARGA, CLAVES_CARGA } from '@/lib/paquetesCarga';
import { MODULOS_CATALOGO, CLAVES_MODULOS_CATALOGO } from '@/lib/modulosCatalogo';
import {
  PASOS_PRECIO, ALCANCES, estadoCobro, nivelAlcance, nivelOperacion, pasosDeTienda, precioSugerido, sumarMeses,
  PERIODOS_COBRO, POR_UNIDAD, cargoMensual, totalCargo, mensualDeAnual,
  type Modulos, type TipoCobro, type CargoTienda, type PeriodoCobro, type PorUnidad,
} from '@/lib/modulos';

interface Tienda { slug: string; name: string; status: string | null; modulos: Modulos | null; subdominio_activo: boolean | null; plan?: string | null; whatsapp?: string | null }
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
const ALCANCE_TXT = { carta: 'Esencial', app: 'Negocio', app_google: 'Premium' } as const;
const OPERACION_TXT = { sin_caja: 'Sin caja', ventas: 'Ventas', inventario: 'Ventas + Inventario', 'sin-clasificar': 'Todo (sin clasificar)' } as const;

interface DatosPagoCobro {
  yape: string;
  titular: string;
  banco: string;
  cuenta: string;
  cci: string;
}

const DATOS_PAGO_KEY = 'boga_cobros_datos_pago_v1';

const getDatosPagoGuardados = (): DatosPagoCobro => {
  if (typeof window === 'undefined') return { yape: '', titular: '', banco: '', cuenta: '', cci: '' };
  try {
    const raw = localStorage.getItem(DATOS_PAGO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { yape: '', titular: '', banco: '', cuenta: '', cci: '' };
};

const guardarDatosPago = (d: DatosPagoCobro) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DATOS_PAGO_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
};

function formatearBloquePago(datos?: DatosPagoCobro | null): string {
  if (!datos) return '';
  const lineas: string[] = [];
  if (datos.yape?.trim()) {
    lineas.push(`• *Yape / Plin:* ${datos.yape.trim()}`);
  }
  if (datos.titular?.trim()) {
    lineas.push(`• *Titular:* ${datos.titular.trim()}`);
  }
  if (datos.cuenta?.trim()) {
    const b = datos.banco?.trim() ? ` (${datos.banco.trim()})` : '';
    lineas.push(`• *Cuenta${b}:* ${datos.cuenta.trim()}`);
  }
  if (datos.cci?.trim()) {
    lineas.push(`• *CCI:* ${datos.cci.trim()}`);
  }
  if (lineas.length === 0) return '';
  return `💳 *Datos para realizar tu pago:*\n${lineas.join('\n')}`;
}

const telefonoWa = (t?: string | null) => {
  if (!t) return '';
  const d = t.replace(/\D/g, '');
  return d.length === 9 ? `51${d}` : d;
};

type TipoMensajeWa = 'hoy' | 'vence' | 'vencido' | 'sin_pagos';

function armarMensajeWhatsApp({
  tipo,
  tiendaNombre,
  planNombre,
  monto,
  venceFecha,
  dias,
  datosPago,
}: {
  tipo: TipoMensajeWa;
  tiendaNombre: string;
  planNombre: string;
  monto: number;
  venceFecha?: string | null;
  dias?: number | null;
  datosPago?: DatosPagoCobro | null;
}) {
  const montoTxt = soles(monto);
  const fechaFmt = venceFecha ? venceFecha.split('-').reverse().join('/') : 'la fecha acordada';
  const bloquePago = formatearBloquePago(datosPago);

  if (tipo === 'hoy') {
    const textoPago = bloquePago
      ? `${bloquePago}\n\nPor favor, envíanos la constancia por aquí para mantener tu tienda y catálogo activos sin interrupciones.`
      : `Puedes realizar tu pago por Yape, Plin o transferencia bancaria y enviarnos la constancia por aquí para mantener tu tienda y catálogo activos sin interrupciones.`;

    return `Hola *${tiendaNombre}* 👋 Te saluda el equipo de BogaHub.\n\nTe recordamos que hoy *${fechaFmt}* es la fecha de cobro de tu mensualidad de tienda digital (*${planNombre}*) por un monto de *${montoTxt}*.\n\n${textoPago}\n\n¡Muchas gracias por confiar en BogaHub! 🚀`;
  }

  if (tipo === 'vence') {
    const diasTxt = dias && dias > 0 ? `en ${dias} día${dias === 1 ? '' : 's'}` : 'pronto';
    const textoPago = bloquePago
      ? `\n\nTe dejamos los datos de pago para cuando desees realizarlo:\n${bloquePago}`
      : '';

    return `Hola *${tiendaNombre}* 👋 Te saluda el equipo de BogaHub.\n\nTe recordamos amablemente que tu mensualidad de tienda digital (*${planNombre}*) por *${montoTxt}* vencerá el *${fechaFmt}* (${diasTxt}).${textoPago}\n\nTe avisamos con anticipación para que puedas programar tu pago tranquilamente. ¡Que tengas excelentes ventas! ✨`;
  }

  if (tipo === 'vencido') {
    const diasPasados = dias ? Math.abs(dias) : null;
    const diasTxt = diasPasados ? `hace ${diasPasados} día${diasPasados === 1 ? '' : 's'}` : '';
    const textoPago = bloquePago
      ? `${bloquePago}\n\nPor favor, envíanos tu constancia de pago por aquí para regularizar tu cuenta y mantener tus servicios activos.`
      : `Por favor, envíanos tu constancia de pago por aquí para regularizar tu cuenta y mantener tus servicios al día. Si necesitas los datos de Yape o cuenta bancaria, con gusto te los enviamos.`;

    return `Hola *${tiendaNombre}* 👋 Te saluda el equipo de BogaHub.\n\nTe recordamos que tu mensualidad de tienda digital (*${planNombre}*) por *${montoTxt}* ya venció *${diasTxt}* (el ${fechaFmt}).\n\n${textoPago}\n\n¡Quedamos atentos para ayudarte! 🙏`;
  }

  // sin_pagos / demos
  const textoPago = bloquePago
    ? `Te compartimos los datos de pago para coordinar la activación de tu plan:\n${bloquePago}\n\nUna vez realizado, nos envías la constancia por aquí para dejar tu cuenta 100% activa.`
    : `¿Nos confirmas si prefieres los datos de pago por Yape, Plin o transferencia bancaria para activar tu plan formal?`;

  return `Hola *${tiendaNombre}* 👋 Te saluda el equipo de BogaHub.\n\nEsperamos que todo vaya excelente con tu tienda. Te escribimos para coordinar la activación de tu plan (*${planNombre}*) por *${montoTxt}*.\n\n${textoPago}\n\n¡Muchos éxitos con las ventas! 🌟`;
}

const ESTADO_UI: Record<TipoCobro, { texto: (d: number | null) => string; clase: string }> = {
  sin_costo: { texto: () => 'Sin costo', clase: 'bg-slate-100 text-slate-600 border-slate-200' },
  sin_pagos: { texto: () => 'Demo / Por acordar', clase: 'bg-slate-100 text-slate-700 border-slate-300' },
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
  const [planesEd, setPlanesEd] = useState<PlanComercial[]>([]);   // planes comerciales (se editan en EditorPlanes)
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
  const [filtro, setFiltro] = useState<'todas' | 'atender' | 'aldia' | 'vencidos' | 'por_vencer' | 'sin_pagos'>('todas');
  const [waModalFila, setWaModalFila] = useState<(typeof filas)[0] | null>(null);
  const [busca, setBusca] = useState('');
  const [datosPago, setDatosPago] = useState<DatosPagoCobro>(getDatosPagoGuardados);
  const [modalDatosPago, setModalDatosPago] = useState(false);

  useEffect(() => {
    setDatosPago(getDatosPagoGuardados());
  }, []);

  const actualizarDatosPago = (nuevos: DatosPagoCobro) => {
    setDatosPago(nuevos);
    guardarDatosPago(nuevos);
  };

  const hoy = hoyLima();

  const cargar = useCallback(async () => {
    const [t0, pr0, pa, cg] = await Promise.all([
      supabase.from('stores').select('slug,name,status,modulos,subdominio_activo,plan,whatsapp').order('name'),
      supabase.from('plan_precios').select('clave,monto,periodo,por,monto_anual,monto_oferta,oferta_hasta,nombre'),
      supabase.from('store_pagos').select('id,store,monto,metodo,referencia,meses,vence_despues,nota,created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('store_cargos').select('id,store,nombre,monto,periodo,por,cantidad,nota').order('created_at'),
    ]);
    // `stores.plan` viene del SQL «Plan de cada tienda»: sin él, se lee igual y el plan se deduce como antes.
    let t = t0;
    if (t0.error) t = (await supabase.from('stores').select('slug,name,status,modulos,subdominio_activo,whatsapp').order('name')) as unknown as typeof t0;
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

  const esCobroActivo = (f: (typeof filas)[0]) => {
    return f.estado.tipo === 'vencido' || f.estado.tipo === 'por_vencer' || f.estado.tipo === 'al_dia';
  };

  const resumen = useMemo(() => {
    const mes = hoy.slice(0, 7);
    const activas = filas.filter((f) => (f.tienda.status ?? 'active') === 'active');
    const tiendasConPlan = filas.filter(esCobroActivo);
    const esperadoReal = tiendasConPlan.reduce((s, f) => s + f.monto, 0);
    const esperadoPotencial = filas.reduce((s, f) => s + f.monto, 0);
    const quePagan = tiendasConPlan.length;
    const cobradoMes = pagos.filter((p) => p.created_at.slice(0, 7) === mes).reduce((s, p) => s + Number(p.monto), 0);
    const vencidos = filas.filter((f) => f.estado.tipo === 'vencido').length;
    const porVencer = filas.filter((f) => f.estado.tipo === 'por_vencer').length;
    const alDia = filas.filter((f) => f.estado.tipo === 'al_dia').length;
    const demos = filas.filter((f) => f.estado.tipo === 'sin_pagos' || f.estado.tipo === 'sin_costo').length;
    const conDescuento = filas.filter((f) => f.descuentoVigente && f.base < f.sugerido).length;
    const conPlan = tiendasConPlan.length;

    return {
      esperado: esperadoReal,
      esperadoPotencial,
      cobradoMes,
      vencidos,
      porVencer,
      alDia,
      sinPagos: demos,
      demos,
      conDescuento,
      conPlan,
      activas: activas.length,
      total: filas.length,
      promedio: quePagan ? esperadoReal / quePagan : 0,
      pendienteMes: Math.max(0, esperadoReal - cobradoMes),
      pctCobrado: esperadoReal > 0 ? Math.min(100, Math.round((cobradoMes / esperadoReal) * 100)) : 0,
    };
  }, [filas, pagos, hoy]);

  const guardarPrecios = async () => {
    setGuardandoPrecios(true);
    const ahora = new Date().toISOString();
    // monto = SIEMPRE el equivalente mensual (lo que leen la landing, Paquetes y "Tu plan"). Si es anual, lo tecleado va aparte.
    const pasos = PASOS_PRECIO.filter((p) => !p.clave.startsWith('alcance:')).map((p) => {
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
  // Precio ya formateado de una fila de Precios (módulo o precio a tu medida), para mostrarlo en el catálogo.
  const precioDeClave = (clave: string): string | null => {
    const ex = extras.find((x) => x.clave === clave);
    const unidad = (por: PorUnidad) => (por ? ' ' + (POR_UNIDAD.find((u) => u.id === por)?.texto ?? '') : '');
    if (ex) {
      const v = precioDe(ex, hoy);
      if (!(v > 0)) return null;
      return `${soles(v)}${unidad(ex.por)} ${PERIODOS_COBRO.find((p) => p.id === ex.periodo)?.texto ?? ''}`.trim();
    }
    const v = Number(borrador[clave]) || 0;
    if (!(v > 0)) return null;
    const por = borPor[clave] ?? null;
    return `${soles(v)}${unidad(por)} ${por ? 'al mes' : (borPer[clave] === 'anio' ? 'al año' : 'al mes')}`;
  };
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

  const URGENCIA_ACTIVOS: Record<TipoCobro, number> = { vencido: 0, por_vencer: 1, al_dia: 2, sin_pagos: 3, sin_costo: 4 };
  const atender = (t: TipoCobro) => t === 'vencido' || t === 'por_vencer';

  const visibles = filas
    .filter((f) => {
      if (filtro === 'atender') return atender(f.estado.tipo);
      if (filtro === 'aldia') return f.estado.tipo === 'al_dia';
      if (filtro === 'vencidos') return f.estado.tipo === 'vencido';
      if (filtro === 'por_vencer') return f.estado.tipo === 'por_vencer';
      if (filtro === 'sin_pagos') return f.estado.tipo === 'sin_pagos' || f.estado.tipo === 'sin_costo';
      return true;
    })
    .filter((f) => !busca.trim() || f.tienda.name.toLowerCase().includes(busca.trim().toLowerCase()) || f.tienda.slug.includes(busca.trim().toLowerCase()))
    .sort((a, b) => {
      // 1. ARRIBA: Tiendas con cobro activo (Vence hoy, Vencido, Por vencer, Al día)
      //    DEBAJO: Tiendas demo / sin cobro mensual acordado
      const actA = esCobroActivo(a) ? 0 : 1;
      const actB = esCobroActivo(b) ? 0 : 1;
      if (actA !== actB) return actA - actB;

      // Dentro de cobros activos: vencidos primero, luego por vencer (vence hoy primero), luego al día
      if (actA === 0) {
        const urg = URGENCIA_ACTIVOS[a.estado.tipo] - URGENCIA_ACTIVOS[b.estado.tipo];
        if (urg !== 0) return urg;

        const diasA = a.estado.dias ?? 999;
        const diasB = b.estado.dias ?? 999;
        if (diasA !== diasB) return diasA - diasB;

        return a.tienda.name.localeCompare(b.tienda.name);
      }

      // Demos: ordenar alfabéticamente
      return a.tienda.name.localeCompare(b.tienda.name);
    });
  const nAtender = filas.filter((f) => atender(f.estado.tipo)).length;

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23]">
      <SuperadminSubheader title="Cobros" icon="payments" />
      <main className="max-w-[1100px] mx-auto px-4 py-6 md:py-8 flex flex-col gap-6 md:gap-8">
        {sinTablas && (
          <div className="p-4 bg-[#fff8e1] border border-[#f5c518]/50 rounded-md text-xs text-[#5c4a00] font-semibold">
            Falta correr el SQL de «Cobros» de <code>supabase_setup.sql</code> en Supabase (tablas plan_precios, store_suscripciones y store_pagos).
            Mientras tanto no se puede guardar nada aquí.
          </div>
        )}
        {mensaje && <div className="p-3 bg-[#f2f3fd] border border-[#c2c6d6] rounded-md text-xs font-semibold text-[#424754]">{mensaje}</div>}

        {/* Resumen Compacto Ejecutivo (HUD) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Bloque 1: Recaudación del mes */}
          <div className="bg-white border border-[#c2c6d6] rounded-lg p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#424754] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Cobranza del Mes
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {resumen.pctCobrado}% del plan activo
              </span>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#191b23] tracking-tight">{soles(resumen.cobradoMes)}</span>
                <span className="text-xs font-semibold text-[#727785]">de {soles(resumen.esperado)} acordados</span>
              </div>
              <div className="w-full bg-[#f2f3fd] h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, resumen.pctCobrado)}%` }}
                />
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#ecedf7] flex items-center justify-between text-[11px] font-semibold text-[#545f73]">
              <span>Falta cobrar: <b className="text-amber-800">{soles(resumen.pendienteMes)}</b></span>
              <span title="Total si las tiendas demo pasaran a pagar">Potencial catálogo: <b className="text-[#191b23]">{soles(resumen.esperadoPotencial)}</b></span>
            </div>
          </div>

          {/* Bloque 2: Alertas de cobro interactivas (Filtros rápidos) */}
          <div className="bg-white border border-[#c2c6d6] rounded-lg p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#424754]">
                Alertas de Cobro
              </span>
              <span className="text-[10px] text-[#727785] font-semibold">Clic para filtrar</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setFiltro(filtro === 'vencidos' ? 'todas' : 'vencidos')}
                className={`px-2.5 py-1.5 rounded-md text-left border text-xs font-bold transition-all flex items-center justify-between ${
                  filtro === 'vencidos'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : resumen.vencidos > 0
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    : 'bg-white text-[#545f73] border-[#c2c6d6] hover:bg-[#f2f3fd]'
                }`}
              >
                <span>Vencidos</span>
                <span className={`px-1.5 py-0.5 rounded font-black ${filtro === 'vencidos' ? 'bg-white/20' : ''}`}>{resumen.vencidos}</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltro(filtro === 'por_vencer' ? 'todas' : 'por_vencer')}
                className={`px-2.5 py-1.5 rounded-md text-left border text-xs font-bold transition-all flex items-center justify-between ${
                  filtro === 'por_vencer'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : resumen.porVencer > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-white text-[#545f73] border-[#c2c6d6] hover:bg-[#f2f3fd]'
                }`}
              >
                <span className="flex items-center gap-1">
                  {resumen.porVencer > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  Vencen 7d / hoy
                </span>
                <span className={`px-1.5 py-0.5 rounded font-black ${filtro === 'por_vencer' ? 'bg-white/20' : ''}`}>{resumen.porVencer}</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltro(filtro === 'sin_pagos' ? 'todas' : 'sin_pagos')}
                className={`px-2.5 py-1.5 rounded-md text-left border text-xs font-bold transition-all flex items-center justify-between ${
                  filtro === 'sin_pagos'
                    ? 'bg-[#191b23] text-white border-[#191b23] shadow-sm'
                    : 'bg-white text-[#545f73] border-[#c2c6d6] hover:bg-[#f2f3fd]'
                }`}
              >
                <span>Demos / Vitrina</span>
                <span className={`px-1.5 py-0.5 rounded font-black ${filtro === 'sin_pagos' ? 'bg-white/20' : ''}`}>{resumen.demos}</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltro(filtro === 'aldia' ? 'todas' : 'aldia')}
                className={`px-2.5 py-1.5 rounded-md text-left border text-xs font-bold transition-all flex items-center justify-between ${
                  filtro === 'aldia'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-emerald-700 border-[#c2c6d6] hover:bg-emerald-50'
                }`}
              >
                <span>Al día</span>
                <span className={`px-1.5 py-0.5 rounded font-black ${filtro === 'aldia' ? 'bg-white/20' : ''}`}>{resumen.alDia}</span>
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#ecedf7] flex items-center justify-between text-[11px] font-semibold text-[#727785]">
              <span>Filtro: <b className="text-[#0058be] uppercase">{filtro === 'todas' ? 'Todas' : filtro.replace('_', ' ')}</b></span>
              {filtro !== 'todas' && (
                <button type="button" onClick={() => setFiltro('todas')} className="text-[#0058be] hover:underline">Ver todas</button>
              )}
            </div>
          </div>

          {/* Bloque 3: Tiendas y Cartera */}
          <div className="bg-white border border-[#c2c6d6] rounded-lg p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#424754]">
                Cartera de Tiendas
              </span>
              <span className="text-[11px] font-bold text-[#0058be] bg-[#f2f3fd] px-2 py-0.5 rounded-full">
                {resumen.activas} de {resumen.total} activas
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#191b23]">{soles(resumen.promedio)}</span>
              <span className="text-xs font-semibold text-[#727785]">promedio / plan acordado</span>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#ecedf7] flex items-center justify-between text-[11px] font-semibold text-[#545f73]">
              <span>Con cobro activo: <b className="text-[#0058be]">{resumen.conPlan}</b></span>
              <span>Demos en vitrina: <b className="text-slate-600">{resumen.demos}</b></span>
            </div>
          </div>
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
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold">Tiendas ({visibles.length})</h2>
              <button
                type="button"
                onClick={() => setModalDatosPago(true)}
                className="px-2.5 py-1 rounded-md bg-white border border-[#c2c6d6] hover:border-[#0058be] text-[#0058be] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                <span>Mis datos de cobro {datosPago.yape || datosPago.titular ? '✓' : ''}</span>
              </button>
            </div>
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
            placeholder="Buscar tienda por nombre o link…"
            className="w-full bg-white border border-[#c2c6d6] rounded-md px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#0058be]"
          />
          {/* Encabezado de columnas (solo en pantalla ancha; en celular cada tienda es una tarjeta) */}
          {/* Contenedor compacto de la tabla */}
          <div className="bg-white border border-[#c2c6d6] rounded-lg shadow-sm overflow-hidden">
            {/* Encabezado de columnas */}
            <div className="hidden lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_175px] gap-x-4 px-4 py-2.5 bg-[#f2f3fd] text-[10px] font-black uppercase tracking-wider text-[#545f73] border-b border-[#c2c6d6]">
              <span>Tienda</span>
              <span>Paga por mes</span>
              <span>Descuento y extras</span>
              <span>Estado de cobro</span>
              <span className="text-right">Acciones</span>
            </div>

            <div className="divide-y divide-[#ecedf7]">
              {visibles.map((f, idx) => {
                const ui = ESTADO_UI[f.estado.tipo];
                const activa = (f.tienda.status ?? 'active') === 'active';
                const conDescuento = f.descuentoVigente && f.base < f.sugerido;
                const nCargos = (cargos[f.tienda.slug] ?? []).length;
                const tieneCobro = esCobroActivo(f);
                const prev = idx > 0 ? visibles[idx - 1] : null;
                const primerSinPlan = !tieneCobro && (!prev || esCobroActivo(prev));

                return (
                  <div key={f.tienda.slug}>
                    {/* Encabezado Grupo 1: Cobros Activos */}
                    {idx === 0 && tieneCobro && (
                      <div className="px-4 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-[11px] font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-emerald-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Cobros activos / Suscripciones vigentes ({visibles.filter(esCobroActivo).length})
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700">
                          Prioridad de cobro
                        </span>
                      </div>
                    )}

                    {/* Encabezado Grupo 2: Demos y Vitrinas */}
                    {primerSinPlan && (
                      <div className="px-4 py-2.5 bg-[#f8fafc] border-y border-[#ecedf7] flex items-center justify-between text-[11px] font-bold text-[#545f73]">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-[#727785]">
                          <span className="material-symbols-outlined text-[15px]">store</span>
                          Demos y Vitrinas activas sin plan acordado ({visibles.filter((x) => !esCobroActivo(x)).length})
                        </span>
                        <span className="text-[10px] font-medium text-[#727785]">
                          Suman al catálogo público · Sin mensualidad pactada
                        </span>
                      </div>
                    )}

                    <div className="px-4 py-2.5 grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_175px] lg:items-center hover:bg-[#f9f9ff] transition-colors">
                      {/* Tienda */}
                      <div className="col-span-2 lg:col-span-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-[#191b23] truncate">{f.tienda.name}</p>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full border ${activa ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {activa ? 'Activa' : 'Inactiva'}
                          </span>
                          {tieneCobro ? (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-50 text-[#0058be] border border-blue-200">
                              {f.sub?.monto_mensual != null ? 'Acordado' : (ALCANCE_TXT[nivelAlcance(f.tienda)] || 'Plan')}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              Demo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#727785] font-semibold mt-0.5 truncate">
                          /{f.tienda.slug} · {ALCANCE_TXT[nivelAlcance(f.tienda)]} · {OPERACION_TXT[nivelOperacion(f.tienda.modulos)]}
                          {f.tienda.modulos?.marca_blanca ? ' · Marca blanca' : ''}
                        </p>
                      </div>

                      {/* Paga por mes */}
                      <div>
                        <p className="text-xs font-bold text-[#191b23]">
                          {soles(f.monto)}<span className="text-[10px] text-[#727785] font-medium"> /mes</span>
                        </p>
                        <p className="text-[10px] text-[#727785] font-semibold">
                          {tieneCobro ? (f.descuentoVigente ? 'monto acordado' : 'precio mensual') : 'precio sugerido (demo)'}
                        </p>
                      </div>

                      {/* Descuentos y extras */}
                      <div className="text-[11px] font-semibold flex flex-col gap-0.5 lg:order-none order-last col-span-2 lg:col-span-1">
                        {conDescuento && (
                          <p className="text-amber-700 text-[10px] font-bold">
                            Desc. {soles(f.sugerido - f.base)} ({Math.round(((f.sugerido - f.base) / f.sugerido) * 100)}%){f.sub?.descuento_hasta ? ` hasta ${f.sub.descuento_hasta}` : ''}
                          </p>
                        )}
                        {!f.descuentoVigente && f.sub?.monto_mensual != null && f.sub.descuento_hasta && (
                          <p className="text-[#727785] text-[10px] italic">Desc. venció el {f.sub.descuento_hasta}</p>
                        )}
                        {f.extrasMes > 0 && (
                          <p className="text-[#0058be] text-[10px] font-bold">+ {soles(f.extrasMes)} en {nCargos} cargo{nCargos === 1 ? '' : 's'}</p>
                        )}
                        {!conDescuento && f.extrasMes <= 0 && !(f.sub?.monto_mensual != null && f.sub.descuento_hasta) && (
                          <p className="text-[#a3a8b8] text-[10px]">—</p>
                        )}
                      </div>

                      {/* Estado cobro */}
                      <div className="lg:text-left text-right">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${ui.clase}`}>
                          {ui.texto(f.estado.dias)}
                        </span>
                        <p className="text-[10px] text-[#727785] font-semibold mt-0.5">
                          {f.sub?.vence ? `Hasta ${f.sub.vence.split('-').reverse().join('/')}` : 'Sin cobro pactado'}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="col-span-2 lg:col-span-1 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWaModalFila(f)}
                          title={tieneCobro ? "Enviar mensaje de cobro por WhatsApp" : "Contactar por WhatsApp para coordinar plan"}
                          className={`px-2 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                            tieneCobro
                              ? 'bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075E54] border border-[#25D366]/30'
                              : 'bg-[#0058be]/10 hover:bg-[#0058be]/20 text-[#0058be] border border-[#0058be]/20'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">{tieneCobro ? 'chat' : 'forum'}</span>
                          <span>{tieneCobro ? 'Cobrar' : 'Coordinar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setGestion(f.tienda.slug)}
                          className="px-2.5 py-1.5 border border-[#c2c6d6] rounded-md text-xs font-bold text-[#0058be] hover:bg-[#f2f3fd] transition-colors"
                        >
                          Gestionar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibles.length === 0 && (
                <div className="p-8 text-center text-xs text-[#727785] italic">
                  {filas.length === 0 ? 'Todavía no hay tiendas.' : 'Ninguna tienda coincide con el filtro.'}
                </div>
              )}
            </div>
          </div>
        </section>
        </>)}

        {vista === 'precios' && (<>
        {/* Precios: 3 planes (lo que incluye cada uno) + módulos que se suman */}
          <div className="flex flex-col gap-5">
            <p className="text-xs text-[#424754]">
              El <b>precio de cada plan es el total</b> que paga la tienda por ese plan. Encima se suman los módulos que tenga prendidos (Ventas, Inventario, dominio propio…). Ejemplo: plan Negocio + Ventas + Inventario.
            </p>

            {/* Los planes que se venden en /negocios: precio total, recomendado, ofertas, qué incluye */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Planes comerciales (lo que ve el cliente en /negocios)</p>
              <EditorPlanes hoy={hoy} flexOk={flexOk} onGuardado={cargar} onPlanes={setPlanesEd} />
            </div>

            {/* Precio de cada paso de nivel (en soles/mes): se suman si la tienda tiene esos módulos */}
            <div className="border-t border-[#ecedf7] pt-5">
              <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest mb-1">Precios por módulo / función (pasos de nivel)</p>
              <p className="text-[10px] text-[#727785] font-semibold mb-3">Si una tienda tiene varios módulos prendidos, su precio sugerido es la suma de los que apliquen.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PASOS_PRECIO.map((p) => {
                  const campoNum = 'w-24 bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-sm font-bold text-right outline-none focus:border-[#0058be]';
                  const valor = borrador[p.clave] ?? '';
                  const per = borPer[p.clave] ?? 'mes';
                  const por = borPor[p.clave] ?? null;
                  const modo = por ? 'unidad' : per;
                  const ofer = borOf[p.clave];
                  const ponerModo = (m: string) => {
                    if (m === 'unidad') {
                      setBorPor((b) => ({ ...b, [p.clave]: 'alumno' }));
                      setBorPer((b) => ({ ...b, [p.clave]: 'mes' }));
                    } else {
                      setBorPor((b) => { const n = { ...b }; delete n[p.clave]; return n; });
                      setBorPer((b) => ({ ...b, [p.clave]: m as PeriodoCobro }));
                    }
                  };
                  return (
                    <div key={p.clave} className="bg-white border border-[#c2c6d6] rounded-md p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold">{p.etiqueta}</p>
                          <p className="text-[10px] text-[#727785] font-semibold">{p.ayuda}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#424754]">S/</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          value={valor}
                          onChange={(e) => setBorrador((b) => ({ ...b, [p.clave]: e.target.value }))}
                          placeholder="0"
                          className={campoNum}
                        />
                        <select
                          value={modo}
                          onChange={(e) => ponerModo(e.target.value)}
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
                              <button type="button" onClick={() => quitarExtra(x.clave)} title="Quitar este precio de la lista" className="w-8 h-8 flex items-center justify-center text-[#a3a8b8] hover:text-red-600 rounded">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                          {x.oferta || ofertaAbierta[x.clave] ? (
                            <div className="flex flex-wrap items-end gap-2 pl-0 sm:pl-3 border-l-2 border-amber-300 ml-1">
                              <label className="text-[10px] font-bold text-[#545f73]">Precio en oferta (S/)
                                <input type="number" min={0} step="0.01" value={x.oferta} onChange={(e) => cambiar({ oferta: e.target.value })} className={`${campoNum} block mt-1 !text-left`} />
                              </label>
                              <label className="text-[10px] font-bold text-[#545f73]">Hasta (opcional)
                                <input type="date" value={x.ofertaHasta} onChange={(e) => cambiar({ ofertaHasta: e.target.value })} className="block mt-1 bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be]" />
                              </label>
                              <button type="button" onClick={() => { cambiar({ oferta: '', ofertaHasta: '' }); setOfertaAbierta((o) => ({ ...o, [x.clave]: false })); }} className="text-[11px] font-bold text-[#727785] underline pb-2">Quitar oferta</button>
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
            <div className="border-t border-[#ecedf7] pt-5 flex flex-col gap-8">
              <NivelesModulos />
              <MatrizPlanes
                modulos={INITIAL_MODULES}
                precioPlan={{
                  Basic: planesEd.find((x) => x.nivel === 'carta')?.precio_mes ? `${soles(planesEd.find((x) => x.nivel === 'carta')!.precio_mes)}/mes` : undefined,
                  Pro: planesEd.find((x) => x.nivel === 'app')?.precio_mes ? `${soles(planesEd.find((x) => x.nivel === 'app')!.precio_mes)}/mes` : undefined,
                  Enterprise: planesEd.find((x) => x.nivel === 'app_google')?.precio_mes ? `${soles(planesEd.find((x) => x.nivel === 'app_google')!.precio_mes)}/mes` : undefined,
                }}
              />
              <CatalogoOrdenado modulos={INITIAL_MODULES.filter((m) => m.buildStatus !== 'no_construido')} precioDeClave={precioDeClave} />
              <HistorialPromociones />
              <ContactoBoga />
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

      {waModalFila && (
        <ModalWhatsAppCobro
          fila={waModalFila}
          hoy={hoy}
          datosPago={datosPago}
          onActualizarDatosPago={actualizarDatosPago}
          onClose={() => setWaModalFila(null)}
        />
      )}

      {modalDatosPago && (
        <ModalConfigurarDatosPago
          datos={datosPago}
          onGuardar={(nuevos) => {
            actualizarDatosPago(nuevos);
            setModalDatosPago(false);
          }}
          onClose={() => setModalDatosPago(false)}
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
  const [planSel, setPlanSel] = useState<string>(nivelAlcance(fila.tienda));
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

  // Plan que contrató la tienda (Esencial / Negocio / Premium). No depende de si tiene dirección propia.
  const guardarPlanContratado = async () => {
    setOcupado(true); setError(null);
    const { error: err } = await supabase.from('stores').update({ plan: planSel }).eq('slug', tienda.slug);
    setOcupado(false);
    if (err) { setError(`${err.message} (¿corriste el SQL «Plan de cada tienda»?)`); return; }
    onCambio(`${tienda.name} ahora está en el plan ${ALCANCE_TXT[planSel as keyof typeof ALCANCE_TXT] ?? planSel}.`);
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

  const borrarCargo = async (id: string, nombre: string) => {
    if (!confirm(`¿Quitar el cargo «${nombre}» de ${tienda.name}?`)) return;
    setOcupado(true); setError(null);
    const { error: err } = await supabase.from('store_cargos').delete().eq('id', id);
    setOcupado(false);
    if (err) { setError(err.message); return; }
    onCambio(`Cargo «${nombre}» quitado.`);
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
                <p className="text-[10px] text-[#727785] font-semibold mt-1">
                  {sub?.vence ? `Pagado hasta ${sub.vence}` : 'Sin pagos registrados'}
                </p>
              </div>
            </div>
            {sub?.notas && <p className="px-4 py-2 bg-[#f8fafc] border-t border-[#ecedf7] text-[11px] text-[#545f73] italic">«{sub.notas}»</p>}
          </div>

          {error && <p className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-semibold">{error}</p>}

          {/* 2. Pestañas */}
          <div className="flex border-b border-[#c2c6d6] -mb-2">
            {pestanas.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPestana(p.id); setError(null); }}
                className={`flex-1 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${pestana === p.id ? 'border-[#0058be] text-[#0058be]' : 'border-transparent text-[#727785] hover:text-[#191b23]'}`}
              >
                {p.texto}
              </button>
            ))}
          </div>

          {pestana === 'pago' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[10px] font-bold text-[#545f73]">Monto cobrado (S/)
                  <input type="number" step="0.01" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className={`${campo} mt-1`} />
                </label>
                <label className="text-[10px] font-bold text-[#545f73]">Meses que cubre
                  <input type="number" min={1} value={meses} onChange={(e) => setMeses(Math.max(1, Number(e.target.value) || 1))} className={`${campo} mt-1`} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-[10px] font-bold text-[#545f73]">Método
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={`${campo} mt-1`}>
                    {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label className="text-[10px] font-bold text-[#545f73]">N° operación / referencia
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej. Yape 123456" className={`${campo} mt-1`} />
                </label>
              </div>

              <div className="p-3 bg-[#f2f3fd] rounded text-xs text-[#0058be] font-semibold flex items-center justify-between">
                <span>Al registrar el pago, vencerá el:</span>
                <b className="text-sm">{nuevoVence}</b>
              </div>

              <button onClick={registrarPago} disabled={ocupado || deshabilitado} className="w-full px-4 py-3 bg-[#0058be] text-white rounded-md font-bold text-sm hover:bg-[#004395] disabled:opacity-50">
                {ocupado ? 'Registrando…' : `Registrar pago de ${soles(Number(pagoMonto) || 0)}`}
              </button>
            </div>
          )}

          {pestana === 'plan' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#545f73] block mb-1">Plan contratado</label>
                <p className="text-[10px] text-[#727785] font-semibold mb-2">
                  Es el paquete comercial que compró (carta, app o catálogo grande). Afecta lo que puede usar en su panel y el precio sugerido.
                </p>
                <div className="flex gap-2">
                  <select value={planSel} onChange={(e) => setPlanSel(e.target.value)} className={`${campo} flex-1`}>
                    {ALCANCES.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre} — {a.resumen}</option>
                    ))}
                  </select>
                  <button
                    onClick={guardarPlanContratado}
                    disabled={ocupado || deshabilitado || planSel === (fila.tienda.plan ?? nivelAlcance(fila.tienda))}
                    className="px-3 py-2 bg-[#0058be] text-white rounded-md text-xs font-bold hover:bg-[#004395] disabled:opacity-40"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <div className="border-t border-[#ecedf7] pt-3">
                <label className="text-[10px] font-bold text-[#545f73]">Monto acordado (S/ al mes)
                  <input type="number" step="0.01" value={acordado} onChange={(e) => setAcordado(e.target.value)} placeholder={`Sugerido: ${sugerido}`} className={`${campo} mt-1`} />
                </label>
                <p className="text-[10px] text-[#727785] font-semibold mt-1">
                  En blanco = paga el precio sugerido de sus módulos ({soles(sugerido)}). Si le cobras menos o más, escríbelo acá.
                </p>
                {hayDescuento && (
                  <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mt-2">
                    Descuento de {soles(ahorro)} al mes ({pct}% menos que el precio de catálogo).
                  </p>
                )}
              </div>

              {hayDescuento && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-amber-900">
                    ¿El descuento es por tiempo limitado? (opcional)
                    <input
                      type="date"
                      value={descuentoHasta}
                      onChange={(e) => setDescuentoHasta(e.target.value)}
                      className="block mt-1 w-full bg-white border border-amber-300 rounded px-3 py-1.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                    />
                  </label>
                  <p className="text-[10px] text-amber-800">
                    {descuentoHasta
                      ? `Hasta el ${descuentoHasta}. Al pasar esa fecha, vuelve solo al precio sugerido sin que tengas que cambiarlo.`
                      : 'En blanco = precio con descuento permanente ("congelado").'}
                  </p>
                </div>
              )}

              <label className="text-[10px] font-bold text-[#545f73]">Nota interna del acuerdo (opcional)
                <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. Promoción de apertura 3 meses, o acordado por WhatsApp." className={`${campo} mt-1 font-normal`} />
              </label>

              <button onClick={guardarAcuerdo} disabled={ocupado || deshabilitado} className="w-full px-4 py-2.5 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] disabled:opacity-50">
                {ocupado ? 'Guardando…' : 'Guardar plan y precio acordado'}
              </button>

              {/* Corrección manual de la fecha de "pagado hasta" (desplegable) */}
              <div className="border-t border-[#ecedf7] pt-2">
                <button
                  type="button"
                  onClick={() => setFechaAbierta((v) => !v)}
                  className="text-[11px] font-bold text-[#727785] hover:text-[#191b23] flex items-center justify-between w-full py-1"
                >
                  <span>Corregir fecha "pagado hasta" a mano</span>
                  <span className="material-symbols-outlined text-[16px]">{fechaAbierta ? 'expand_less' : 'expand_more'}</span>
                </button>
                {fechaAbierta && (
                  <div className="mt-2 flex flex-col gap-2 p-3 bg-[#f8fafc] border border-[#ecedf7] rounded-md">
                    <p className="text-[10px] text-[#727785] font-semibold">
                      Normalmente se mueve sola al registrar pagos. Úsalo solo si necesitas corregir una fecha errónea.
                    </p>
                    <div className="flex gap-2 items-center">
                      <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={`${campo} flex-1`} />
                      <button onClick={guardarFecha} disabled={ocupado || deshabilitado} className="px-3 py-2 bg-[#545f73] text-white rounded-md text-xs font-bold hover:bg-[#424754] disabled:opacity-50">
                        Corregir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {pestana === 'cargos' && (
            <section className="flex flex-col gap-4">
              <p className="text-xs text-[#727785]">
                Cargos que se suman al plan base (ej. por producto, por alumno o de una sola vez).
              </p>

              {cargos.length === 0 ? (
                <p className="text-xs text-[#727785] italic">Esta tienda no tiene cargos extra.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {cargos.map((c) => {
                    const cant = c.por ? Math.max(1, Number(c.cantidad) || 1) : 1;
                    const tot = totalCargo(c);
                    const per = PERIODOS_COBRO.find((p) => p.id === c.periodo)?.texto ?? '';
                    const por = c.por ? ' ' + (POR_UNIDAD.find((u) => u.id === c.por)?.texto ?? '') : '';
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 text-xs bg-[#f9f9ff] border border-[#ecedf7] rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <p className="font-bold text-[#191b23] truncate">{c.nombre}</p>
                          <p className="text-[10px] text-[#727785] font-semibold">
                            {soles(Number(c.monto) || 0)}{por} {per}
                            {c.por ? ` · ${cant} ${c.por === 'producto' ? 'productos' : 'alumnos'} = ${soles(tot)} ${per}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => borrarCargo(c.id, c.nombre)}
                          disabled={ocupado || deshabilitado}
                          title="Quitar este cargo"
                          className="w-6 h-6 flex items-center justify-center text-[#a3a8b8] hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Formulario para agregar un cargo */}
              <div className="border-t border-[#ecedf7] pt-3 flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#424754]">Agregar cargo</p>

                {catalogo.length > 0 && (
                  <label className="text-[10px] font-bold text-[#545f73]">Elegir del catálogo de precios
                    <select value={cgSel} onChange={(e) => elegirCatalogo(e.target.value)} className={`${campo} mt-1`}>
                      <option value="">(Escribir a mano)</option>
                      {catalogo.map((x) => (
                        <option key={x.clave} value={x.clave}>
                          {x.nombre || x.clave} — {soles(precioDe(x, hoy))} {x.por ? `por ${x.por}` : ''} {PERIODOS_COBRO.find((p) => p.id === x.periodo)?.texto}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="text-[10px] font-bold text-[#545f73]">Nombre del cargo
                  <input value={cgNombre} onChange={(e) => setCgNombre(e.target.value)} placeholder="Ej. Producto en la tienda online" className={`${campo} mt-1`} />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold text-[#545f73]">Precio (S/)
                    <input type="number" min={0} step="0.01" value={cgMonto} onChange={(e) => setCgMonto(e.target.value)} placeholder="0" className={`${campo} mt-1`} />
                  </label>
                  <label className="text-[10px] font-bold text-[#545f73]">Periodo
                    <select value={cgPeriodo} onChange={(e) => setCgPeriodo(e.target.value as PeriodoCobro)} className={`${campo} mt-1`}>
                      {PERIODOS_COBRO.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold text-[#545f73]">¿Se cobra por unidad?
                    <select value={cgPor ?? ''} onChange={(e) => setCgPor((e.target.value || null) as PorUnidad)} className={`${campo} mt-1`}>
                      <option value="">Fijo (no se multiplica)</option>
                      {POR_UNIDAD.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
                    </select>
                  </label>
                  {cgPor && (
                    <label className="text-[10px] font-bold text-[#545f73]">Cantidad
                      <input type="number" min={1} value={cgCant} onChange={(e) => setCgCant(e.target.value)} className={`${campo} mt-1`} />
                    </label>
                  )}
                </div>

                {cgPor && Number(cgMonto) > 0 && (
                  <p className="text-[11px] font-bold text-[#0058be] bg-[#f2f3fd] rounded px-3 py-2">
                    Total: {soles((Number(cgMonto) || 0) * Math.max(1, Number(cgCant) || 1))} {PERIODOS_COBRO.find((p) => p.id === cgPeriodo)?.texto}
                  </p>
                )}

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

function ModalWhatsAppCobro({
  fila,
  hoy,
  datosPago,
  onActualizarDatosPago,
  onClose,
}: {
  fila: {
    tienda: Tienda;
    sugerido: number;
    sub?: Suscripcion;
    base: number;
    extrasMes: number;
    monto: number;
    descuentoVigente: boolean;
    estado: ReturnType<typeof estadoCobro>;
  };
  hoy: string;
  datosPago: DatosPagoCobro;
  onActualizarDatosPago: (d: DatosPagoCobro) => void;
  onClose: () => void;
}) {
  const { tienda, monto, estado, sub } = fila;
  const planNombre = ALCANCE_TXT[nivelAlcance(tienda)] || 'Plan Esencial';

  // Determinar plantilla sugerida segun situacion de cobro
  const tipoInicial: TipoMensajeWa =
    estado.tipo === 'por_vencer' && estado.dias === 0
      ? 'hoy'
      : estado.tipo === 'por_vencer'
      ? 'vence'
      : estado.tipo === 'vencido'
      ? 'vencido'
      : 'hoy';

  const [tipo, setTipo] = useState<TipoMensajeWa>(tipoInicial);
  const [numero, setNumero] = useState(tienda.whatsapp || '');
  const [editandoDatos, setEditandoDatos] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [texto, setTexto] = useState(() =>
    armarMensajeWhatsApp({
      tipo: tipoInicial,
      tiendaNombre: tienda.name,
      planNombre,
      monto,
      venceFecha: sub?.vence,
      dias: estado.dias,
      datosPago,
    })
  );

  const cambiarTipo = (nuevoTipo: TipoMensajeWa) => {
    setTipo(nuevoTipo);
    setTexto(
      armarMensajeWhatsApp({
        tipo: nuevoTipo,
        tiendaNombre: tienda.name,
        planNombre,
        monto,
        venceFecha: sub?.vence,
        dias: estado.dias,
        datosPago,
      })
    );
  };

  const modificarDatosPago = (cambios: Partial<DatosPagoCobro>) => {
    const nuevos = { ...datosPago, ...cambios };
    onActualizarDatosPago(nuevos);
    setTexto(
      armarMensajeWhatsApp({
        tipo,
        tiendaNombre: tienda.name,
        planNombre,
        monto,
        venceFecha: sub?.vence,
        dias: estado.dias,
        datosPago: nuevos,
      })
    );
  };

  const cleanNum = telefonoWa(numero);
  const puedeEnviar = cleanNum.length >= 9;
  const waUrl = puedeEnviar ? `https://wa.me/${cleanNum}?text=${encodeURIComponent(texto)}` : null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback
    }
  };

  const descargarPdf = async () => {
    setGenerandoPdf(true);
    try {
      const file = await generarPdfCobro({
        tiendaNombre: tienda.name,
        tiendaSlug: tienda.slug,
        planNombre,
        monto,
        venceFecha: sub?.vence,
        estadoTexto: ESTADO_UI[estado.tipo].texto(estado.dias),
        datosPago,
      });
      await compartirPDF(file, `Aviso de Cobro BogaHub - ${tienda.name}`);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el PDF de cobro.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#191b23]/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#c2c6d6] shadow-2xl w-full max-w-[540px] max-h-[92vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#ecedf7] bg-[#f9f9ff] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#25D366]/15 text-[#075E54] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">chat</span>
            </span>
            <div>
              <h3 className="font-bold text-sm text-[#191b23]">Mensaje de Cobro por WhatsApp</h3>
              <p className="text-[10px] text-[#727785] font-semibold">
                {tienda.name} · {soles(monto)}/mes {sub?.vence ? `· 📅 Vencimiento: ${sub.vence.split('-').reverse().join('/')}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-7 h-7 flex items-center justify-center hover:bg-[#e6e7f2] rounded-lg">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Telefono */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#545f73] block mb-1">
              Numero de WhatsApp
            </label>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ej. 961 123 456 (9 dígitos)"
                className="flex-1 bg-[#f8fafc] border border-[#c2c6d6] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
              />
              {cleanNum && (
                <span className="text-[11px] font-semibold text-[#727785]">
                  +{cleanNum}
                </span>
              )}
            </div>
            {!puedeEnviar && (
              <p className="text-[10px] text-amber-700 font-semibold mt-1">
                Escribe o verifica el número de 9 dígitos para abrir el chat directamente.
              </p>
            )}
          </div>

          {/* Plantillas preprogramadas */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#545f73] block mb-1.5">
              Plantilla preprogramada
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => cambiarTipo('hoy')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold text-left border flex items-center gap-1.5 transition-colors ${
                  tipo === 'hoy'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-[#424754] border-[#c2c6d6] hover:bg-[#f2f3fd]'
                }`}
              >
                <span>🟢</span>
                <span>Vence hoy (Cobro)</span>
              </button>

              <button
                type="button"
                onClick={() => cambiarTipo('vence')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold text-left border flex items-center gap-1.5 transition-colors ${
                  tipo === 'vence'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-[#424754] border-[#c2c6d6] hover:bg-[#f2f3fd]'
                }`}
              >
                <span>⏳</span>
                <span>Faltan días (Aviso)</span>
              </button>

              <button
                type="button"
                onClick={() => cambiarTipo('vencido')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold text-left border flex items-center gap-1.5 transition-colors ${
                  tipo === 'vencido'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white text-[#424754] border-[#c2c6d6] hover:bg-[#f2f3fd]'
                }`}
              >
                <span>🔴</span>
                <span>Vencido (Reclamo)</span>
              </button>

              <button
                type="button"
                onClick={() => cambiarTipo('sin_pagos')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold text-left border flex items-center gap-1.5 transition-colors ${
                  tipo === 'sin_pagos'
                    ? 'bg-[#191b23] text-white border-[#191b23] shadow-sm'
                    : 'bg-white text-[#424754] border-[#c2c6d6] hover:bg-[#f2f3fd]'
                }`}
              >
                <span>📋</span>
                <span>Demo / Por acordar</span>
              </button>
            </div>
          </div>

          {/* Tarjeta de Datos de Pago (Yape, Titular, Cuenta) */}
          <div className="bg-[#f0f9ff] border border-[#b9e6fe] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#026aa2]">account_balance_wallet</span>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#026aa2]">
                  Mis datos de cobro (Se auto-llenan al mensaje)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditandoDatos(!editandoDatos)}
                className="text-[11px] font-bold text-[#0058be] hover:underline"
              >
                {editandoDatos ? 'Cerrar editor' : 'Editar mis cuentas'}
              </button>
            </div>

            {editandoDatos ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#b9e6fe]/60">
                <div>
                  <label className="text-[10px] font-bold text-[#545f73] block mb-0.5">
                    Número Yape / Plin
                  </label>
                  <input
                    type="text"
                    value={datosPago.yape}
                    onChange={(e) => modificarDatosPago({ yape: e.target.value })}
                    placeholder="Ej. 961 123 456"
                    className="w-full bg-white border border-[#c2c6d6] rounded px-2.5 py-1.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#545f73] block mb-0.5">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    value={datosPago.titular}
                    onChange={(e) => modificarDatosPago({ titular: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-white border border-[#c2c6d6] rounded px-2.5 py-1.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#545f73] block mb-0.5">
                    Banco y N° Cuenta / Tarjeta (opcional)
                  </label>
                  <input
                    type="text"
                    value={datosPago.cuenta}
                    onChange={(e) => modificarDatosPago({ cuenta: e.target.value })}
                    placeholder="Ej. BCP 191-12345678-0-12"
                    className="w-full bg-white border border-[#c2c6d6] rounded px-2.5 py-1.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#545f73] block mb-0.5">
                    CCI interbancario (opcional)
                  </label>
                  <input
                    type="text"
                    value={datosPago.cci}
                    onChange={(e) => modificarDatosPago({ cci: e.target.value })}
                    placeholder="Ej. 002-191-..."
                    className="w-full bg-white border border-[#c2c6d6] rounded px-2.5 py-1.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-1.5 text-[11px] text-[#026aa2] font-semibold flex items-center justify-between flex-wrap gap-2">
                {datosPago.yape || datosPago.titular ? (
                  <span>
                    Yape/Plin: <b>{datosPago.yape || '—'}</b> · Titular: <b>{datosPago.titular || '—'}</b>
                    {datosPago.cuenta ? ` · Cuenta: ${datosPago.cuenta}` : ''}
                  </span>
                ) : (
                  <span className="italic text-[#727785]">
                    Aún no pusiste tus cuentas. Haz clic en «Editar mis cuentas» para que se agreguen solas.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Editor de texto */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#545f73]">
                Mensaje a enviar (puedes editarlo)
              </label>
              <button
                type="button"
                onClick={copiar}
                className="text-[11px] font-bold text-[#0058be] hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">content_copy</span>
                {copiado ? '¡Copiado!' : 'Copiar texto'}
              </button>
            </div>
            <textarea
              rows={6}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#c2c6d6] rounded-md p-3 text-xs font-normal text-[#191b23] outline-none focus:border-[#0058be] resize-none leading-relaxed"
            />
          </div>

          {/* Botones de accion */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Abrir en WhatsApp Web / App</span>
              </a>
            ) : (
              <button
                disabled
                className="flex-1 py-2.5 px-3 bg-gray-200 text-gray-500 rounded-lg font-bold text-xs cursor-not-allowed"
              >
                Escribe un número para enviar
              </button>
            )}

            <button
              type="button"
              onClick={descargarPdf}
              disabled={generandoPdf}
              title="Descargar o compartir proforma de cobro en PDF"
              className="py-2.5 px-3 bg-white hover:bg-[#f2f3fd] text-[#0058be] border border-[#0058be]/30 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              <span>{generandoPdf ? 'Generando…' : 'Descargar Aviso PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 border border-[#c2c6d6] text-[#545f73] hover:bg-[#f2f3fd] rounded-lg font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalConfigurarDatosPago({
  datos,
  onGuardar,
  onClose,
}: {
  datos: DatosPagoCobro;
  onGuardar: (d: DatosPagoCobro) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DatosPagoCobro>({ ...datos });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar(form);
  };

  return (
    <div className="fixed inset-0 z-[210] bg-[#191b23]/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#c2c6d6] shadow-2xl w-full max-w-[480px] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#ecedf7] bg-[#f9f9ff] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#0058be]/10 text-[#0058be] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </span>
            <div>
              <h3 className="font-bold text-sm text-[#191b23]">Mis Datos de Cobro</h3>
              <p className="text-[10px] text-[#727785] font-semibold">Se incluirán automáticamente en mensajes de WhatsApp y avisos PDF</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-7 h-7 flex items-center justify-center hover:bg-[#e6e7f2] rounded-lg">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <form onSubmit={submit} className="p-5 flex flex-col gap-3.5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#545f73] block mb-1">
              Número Yape / Plin
            </label>
            <input
              type="text"
              value={form.yape}
              onChange={(e) => setForm((p) => ({ ...p, yape: e.target.value }))}
              placeholder="Ej. 961 123 456"
              className="w-full bg-[#f8fafc] border border-[#c2c6d6] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#545f73] block mb-1">
              Nombre del Titular de la cuenta
            </label>
            <input
              type="text"
              value={form.titular}
              onChange={(e) => setForm((p) => ({ ...p, titular: e.target.value }))}
              placeholder="Ej. Juan Carlos Pérez"
              className="w-full bg-[#f8fafc] border border-[#c2c6d6] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#545f73] block mb-1">
              Banco y Número de Cuenta / Tarjeta (opcional)
            </label>
            <input
              type="text"
              value={form.cuenta}
              onChange={(e) => setForm((p) => ({ ...p, cuenta: e.target.value }))}
              placeholder="Ej. BCP Ahorros: 191-12345678-0-12"
              className="w-full bg-[#f8fafc] border border-[#c2c6d6] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#545f73] block mb-1">
              Código de Cuenta Interbancario (CCI) (opcional)
            </label>
            <input
              type="text"
              value={form.cci}
              onChange={(e) => setForm((p) => ({ ...p, cci: e.target.value }))}
              placeholder="Ej. 002-191-001234567801-12"
              className="w-full bg-[#f8fafc] border border-[#c2c6d6] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ecedf7] mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#c2c6d6] text-[#545f73] hover:bg-[#f2f3fd] rounded-lg font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0058be] hover:bg-[#004395] text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              Guardar datos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
