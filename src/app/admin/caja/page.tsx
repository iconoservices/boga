'use client';

// Caja chica del POS: abrir la caja con el sencillo del día, anotar la plata que entra o sale sin ser venta (pagar al
// delivery, comprar hielo, poner sencillo) y cerrarla contando el efectivo. El sistema dice cuánto DEBERÍA haber
// (apertura + ventas en efectivo del POS + ingresos − egresos) y la diferencia con lo contado.
// Las ventas no se copian: se suman de `orders` (las del POS entre la apertura y ahora). Tablas: supabase_caja.sql.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { moduloActivo } from '@/lib/modulos';

interface Sesion {
  id: string; store: string; abierta_at: string; abierta_por: string | null; monto_inicial: number;
  cerrada_at: string | null; cerrada_por: string | null; esperado: number | null; contado: number | null; diferencia: number | null;
  resumen: Resumen | null; nota: string | null;
}
interface Movimiento { id: string; tipo: 'ingreso' | 'egreso'; monto: number; concepto: string; usuario: string | null; created_at: string }
interface Resumen { inicial: number; ventas: Record<string, { n: number; total: number }>; ingresos: number; egresos: number; esperado: number }

const soles = (n: number) => `S/ ${n.toFixed(2)}`;
const hora = (iso: string) => new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }).format(new Date(iso));
const fechaHora = (iso: string) => new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }).format(new Date(iso));
const monto = (txt: string) => { const n = Math.round(parseFloat(txt.replace(',', '.')) * 100) / 100; return Number.isFinite(n) ? n : NaN; };
const CONCEPTOS_EGRESO = ['Pago a delivery', 'Compra de insumos', 'Hielo / gas', 'Retiro del dueño'];
const CONCEPTOS_INGRESO = ['Sencillo extra', 'Cobro de deuda'];

export default function CajaChica() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tiendas, setTiendas] = useState<{ slug: string; name: string }[]>([]);
  const [slug, setSlug] = useState('');
  const [sinSql, setSinSql] = useState(false);
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);   // undefined = cargando, null = caja cerrada
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [ventas, setVentas] = useState<{ payment_method: string | null; total_amount: number }[]>([]);
  const [historial, setHistorial] = useState<Sesion[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [cierre, setCierre] = useState<Sesion | null>(null);    // la que se acaba de cerrar (para mostrar el resultado)

  // formularios
  const [inicial, setInicial] = useState('');
  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>('egreso');
  const [movMonto, setMovMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [contado, setContado] = useState('');
  const [nota, setNota] = useState('');
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=/admin/caja');
  }, [loading, user, router]);

  // Tiendas con POS que administra: las suyas, las que co-administra y la que venga en ?tienda= (superadmin).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const crudo = new URLSearchParams(window.location.search).get('tienda') || '';
      const pedida = /^[a-z0-9-]{1,80}$/.test(crudo) ? crudo : '';   // va dentro de un filtro: solo un slug válido
      const { data: coAdmin } = await supabase.from('store_admins').select('store').eq('user_id', user.id);
      const slugsCo = (coAdmin ?? []).map((c: { store: string }) => c.store);
      const filtros = [`user_id.eq.${user.id}`, ...(slugsCo.length ? [`slug.in.(${slugsCo.join(',')})`] : []), ...(pedida ? [`slug.eq.${pedida}`] : [])];
      const { data } = await supabase.from('stores').select('slug,name,modulos').or(filtros.join(',')).order('name');
      const lista = ((data ?? []) as { slug: string; name: string; modulos: unknown }[]).filter((t) => moduloActivo(t.modulos as never, 'pos'));
      setTiendas(lista.map(({ slug, name }) => ({ slug, name })));
      setSlug((s) => s || (lista.some((t) => t.slug === pedida) ? pedida : lista[0]?.slug || ''));
    })();
  }, [user]);

  const cargar = useCallback(async () => {
    if (!slug) return;
    const { data: abierta, error } = await supabase.from('caja_sesiones').select('*').eq('store', slug).is('cerrada_at', null).maybeSingle();
    if (error) { setSinSql(/caja_sesiones|relation|does not exist|schema cache/i.test(error.message)); setSesion(null); return; }
    setSinSql(false);
    setSesion((abierta as Sesion | null) ?? null);
    if (abierta) {
      const [{ data: m }, { data: v }] = await Promise.all([
        supabase.from('caja_movimientos').select('id,tipo,monto,concepto,usuario,created_at').eq('sesion_id', abierta.id).order('created_at'),
        supabase.from('orders').select('payment_method,total_amount').eq('store', slug).eq('order_source', 'POS').neq('status', 'Cancelado').gte('created_at', abierta.abierta_at),
      ]);
      setMovs((m ?? []) as Movimiento[]);
      setVentas((v ?? []) as { payment_method: string | null; total_amount: number }[]);
    } else { setMovs([]); setVentas([]); }
    const { data: h } = await supabase.from('caja_sesiones').select('*').eq('store', slug).not('cerrada_at', 'is', null).order('abierta_at', { ascending: false }).limit(10);
    setHistorial((h ?? []) as Sesion[]);
  }, [slug]);
  useEffect(() => { void (async () => { await cargar(); })(); }, [cargar]);
  // Al volver a esta pestaña (después de vender en el POS) se actualizan las cuentas.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [cargar]);

  const resumen: Resumen | null = useMemo(() => {
    if (!sesion) return null;
    const porMetodo: Record<string, { n: number; total: number }> = {};
    for (const v of ventas) {
      const k = v.payment_method || 'Sin método';
      porMetodo[k] = { n: (porMetodo[k]?.n ?? 0) + 1, total: Math.round(((porMetodo[k]?.total ?? 0) + Number(v.total_amount || 0)) * 100) / 100 };
    }
    const suma = (t: 'ingreso' | 'egreso') => Math.round(movs.filter((x) => x.tipo === t).reduce((s, x) => s + Number(x.monto), 0) * 100) / 100;
    const ingresos = suma('ingreso'), egresos = suma('egreso');
    const inicialN = Number(sesion.monto_inicial);
    const esperado = Math.round((inicialN + (porMetodo['Efectivo']?.total ?? 0) + ingresos - egresos) * 100) / 100;
    return { inicial: inicialN, ventas: porMetodo, ingresos, egresos, esperado };
  }, [sesion, ventas, movs]);

  const abrir = async () => {
    const n = inicial.trim() === '' ? 0 : monto(inicial);
    if (!(n >= 0)) { alert('Escribe con cuánto sencillo abres la caja (puede ser 0).'); return; }
    setOcupado(true);
    const { error } = await supabase.from('caja_sesiones').insert({ store: slug, monto_inicial: n, abierta_por: user?.email ?? null });
    setOcupado(false);
    if (error && error.code !== '23505') { alert('No se pudo abrir la caja: ' + error.message); return; }
    setInicial(''); setCierre(null);
    cargar();
  };

  const anotar = async () => {
    if (!sesion) return;
    const n = monto(movMonto);
    const c = concepto.trim();
    if (!(n > 0)) { alert('Escribe el monto.'); return; }
    if (!c) { alert('Escribe para qué fue (ej. "Pago a delivery").'); return; }
    setOcupado(true);
    const { error } = await supabase.from('caja_movimientos').insert({ sesion_id: sesion.id, store: slug, tipo, monto: n, concepto: c.slice(0, 120), usuario: user?.email ?? null });
    setOcupado(false);
    if (error) { alert('No se pudo anotar: ' + error.message); return; }
    setMovMonto(''); setConcepto('');
    cargar();
  };

  const borrarMov = async (m: Movimiento) => {
    if (!confirm(`¿Borrar "${m.concepto}" (${soles(Number(m.monto))})?`)) return;
    const { error } = await supabase.from('caja_movimientos').delete().eq('id', m.id);
    if (error) alert('No se pudo borrar: ' + error.message);
    cargar();
  };

  const cerrar = async () => {
    if (!sesion || !resumen) return;
    const n = monto(contado);
    if (!(n >= 0)) { alert('Cuenta el efectivo que hay en la caja y escríbelo.'); return; }
    setOcupado(true);
    // Se cierra con las cuentas al día: por si se vendió algo desde que se abrió esta pantalla.
    const { data: v } = await supabase.from('orders').select('payment_method,total_amount').eq('store', slug).eq('order_source', 'POS').neq('status', 'Cancelado').gte('created_at', sesion.abierta_at);
    const ventasHoy = (v ?? []) as { payment_method: string | null; total_amount: number }[];
    const porMetodo: Record<string, { n: number; total: number }> = {};
    for (const x of ventasHoy) {
      const k = x.payment_method || 'Sin método';
      porMetodo[k] = { n: (porMetodo[k]?.n ?? 0) + 1, total: Math.round(((porMetodo[k]?.total ?? 0) + Number(x.total_amount || 0)) * 100) / 100 };
    }
    const esperado = Math.round((resumen.inicial + (porMetodo['Efectivo']?.total ?? 0) + resumen.ingresos - resumen.egresos) * 100) / 100;
    const final: Resumen = { ...resumen, ventas: porMetodo, esperado };
    const { data, error } = await supabase.from('caja_sesiones').update({
      cerrada_at: new Date().toISOString(), cerrada_por: user?.email ?? null,
      esperado, contado: n, diferencia: Math.round((n - esperado) * 100) / 100, resumen: final, nota: nota.trim() || null,
    }).eq('id', sesion.id).is('cerrada_at', null).select('*').maybeSingle();
    setOcupado(false);
    if (error || !data) { alert('No se pudo cerrar la caja' + (error ? ': ' + error.message : ' (¿ya la cerró otra persona?)')); cargar(); return; }
    setCierre(data as Sesion);
    setContado(''); setNota(''); setCerrando(false);
    cargar();
  };

  if (!user) return null;
  const nombreTienda = tiendas.find((t) => t.slug === slug)?.name ?? slug;

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <header className="border-b border-surface-container-highest bg-surface">
        <div className="max-w-[720px] mx-auto px-container-margin py-3 flex items-center gap-2">
          <Link href="/admin/vender" className="text-secondary hover:text-primary text-sm flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Caja (POS)
          </Link>
          <span className="text-secondary">/</span>
          <span className="font-headline-sm text-headline-sm text-on-surface truncate">Caja chica</span>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-container-margin py-6 flex flex-col gap-5">
        {tiendas.length > 1 && (
          <select value={slug} onChange={(e) => { setSlug(e.target.value); setSesion(undefined); setCierre(null); }} className="self-start border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            {tiendas.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        )}

        {tiendas.length === 0 && sesion !== undefined ? (
          <p className="text-sm text-secondary bg-white border border-gray-100 rounded-xl p-6 text-center">Ninguna de tus tiendas tiene la caja (POS) activada.</p>
        ) : sinSql ? (
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4">Falta correr <b>supabase_caja.sql</b> en Supabase para usar la caja chica.</p>
        ) : sesion === undefined ? (
          <p className="text-sm text-secondary">Cargando…</p>
        ) : (
          <>
            {/* Resultado del cierre recién hecho */}
            {cierre && <TarjetaCierre s={cierre} destacada />}

            {sesion === null ? (
              <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400">lock</span>
                  <h2 className="font-bold text-gray-900">La caja de {nombreTienda} está cerrada</h2>
                </div>
                <p className="text-xs text-gray-500">Ábrela al empezar el día con el sencillo que dejas en el cajón. Al cerrar, el sistema te dice cuánto efectivo debería haber.</p>
                <label className="text-xs font-bold text-gray-600">¿Con cuánto sencillo abres?</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S/</span>
                    <input inputMode="decimal" value={inicial} onChange={(e) => setInicial(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm" />
                  </div>
                  <button onClick={abrir} disabled={ocupado} className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">Abrir caja</button>
                </div>
              </section>
            ) : resumen && (
              <>
                <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h2 className="font-bold text-gray-900">Caja abierta</h2>
                    </div>
                    <button onClick={cargar} className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-800"><span className="material-symbols-outlined text-[16px]">refresh</span>Actualizar</button>
                  </div>
                  <p className="text-xs text-gray-500">Desde {fechaHora(sesion.abierta_at)}{sesion.abierta_por ? ` · ${sesion.abierta_por}` : ''}</p>
                  <div className="flex flex-col gap-1.5 text-sm">
                    <Fila t="Apertura (sencillo)" v={resumen.inicial} />
                    <Fila t={`Ventas en efectivo (${resumen.ventas['Efectivo']?.n ?? 0})`} v={resumen.ventas['Efectivo']?.total ?? 0} signo="+" />
                    <Fila t="Otros ingresos" v={resumen.ingresos} signo="+" />
                    <Fila t="Salidas (egresos)" v={resumen.egresos} signo="−" rojo />
                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-1 font-black text-gray-900">
                      <span>Debería haber en efectivo</span><span>{soles(resumen.esperado)}</span>
                    </div>
                  </div>
                  {Object.entries(resumen.ventas).filter(([k]) => k !== 'Efectivo').length > 0 && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 flex flex-col gap-0.5">
                      <span className="font-bold text-gray-600">No entran al cajón (van a tu cuenta):</span>
                      {Object.entries(resumen.ventas).filter(([k]) => k !== 'Efectivo').map(([k, x]) => (
                        <span key={k} className="flex justify-between"><span>{k} ({x.n})</span><span>{soles(x.total)}</span></span>
                      ))}
                    </div>
                  )}
                </section>

                {/* Anotar entrada o salida */}
                <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col gap-3">
                  <h3 className="font-bold text-gray-900 text-sm">Anotar plata que entra o sale (que no es venta)</h3>
                  <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-lg p-1">
                    {(['egreso', 'ingreso'] as const).map((t) => (
                      <button key={t} onClick={() => setTipo(t)} className={`py-1.5 rounded-md text-xs font-bold ${tipo === t ? 'bg-white shadow-sm ' + (t === 'egreso' ? 'text-red-700' : 'text-emerald-700') : 'text-gray-500'}`}>
                        {t === 'egreso' ? 'Sale plata' : 'Entra plata'}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(tipo === 'egreso' ? CONCEPTOS_EGRESO : CONCEPTOS_INGRESO).map((c) => (
                      <button key={c} onClick={() => setConcepto(c)} className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${concepto === c ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600'}`}>{c}</button>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative sm:w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S/</span>
                      <input inputMode="decimal" value={movMonto} onChange={(e) => setMovMonto(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm" />
                    </div>
                    <input value={concepto} onChange={(e) => setConcepto(e.target.value)} maxLength={120} placeholder="¿Para qué fue?" className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
                    <button onClick={anotar} disabled={ocupado} className="px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-50">Anotar</button>
                  </div>
                  {movs.length > 0 && (
                    <ul className="flex flex-col divide-y divide-gray-100 text-sm">
                      {movs.map((m) => (
                        <li key={m.id} className="flex items-center gap-2 py-2">
                          <span className="text-[11px] text-gray-400 w-12 shrink-0">{hora(m.created_at)}</span>
                          <span className="flex-1 min-w-0 truncate text-gray-700">{m.concepto}</span>
                          <span className={`font-bold ${m.tipo === 'egreso' ? 'text-red-600' : 'text-emerald-700'}`}>{m.tipo === 'egreso' ? '−' : '+'}{soles(Number(m.monto))}</span>
                          <button onClick={() => borrarMov(m)} title="Borrar (si fue un error)" className="text-gray-300 hover:text-red-600"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Cerrar */}
                <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col gap-3">
                  {!cerrando ? (
                    <button onClick={() => setCerrando(true)} className="w-full py-3 rounded-lg border-2 border-gray-900 text-gray-900 text-sm font-black">Cerrar caja</button>
                  ) : (
                    <>
                      <h3 className="font-bold text-gray-900 text-sm">Cuenta el efectivo del cajón</h3>
                      <p className="text-xs text-gray-500">Cuenta billetes y monedas (incluido el sencillo de la apertura) y escribe el total.</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S/</span>
                        <input inputMode="decimal" autoFocus value={contado} onChange={(e) => setContado(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-3 text-lg font-bold" />
                      </div>
                      <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Nota (opcional): ej. faltó porque se dio mal un vuelto" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => setCerrando(false)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-600">Volver</button>
                        <button onClick={cerrar} disabled={ocupado} className="flex-1 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-black disabled:opacity-50">Cerrar y ver el resultado</button>
                      </div>
                    </>
                  )}
                </section>
              </>
            )}

            {historial.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">Cierres anteriores</h2>
                {historial.filter((h) => h.id !== cierre?.id).map((h) => <TarjetaCierre key={h.id} s={h} />)}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Fila({ t, v, signo, rojo }: { t: string; v: number; signo?: string; rojo?: boolean }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span>{t}</span>
      <span className={rojo && v > 0 ? 'text-red-600 font-semibold' : 'font-semibold'}>{signo && v > 0 ? `${signo} ` : ''}{soles(v)}</span>
    </div>
  );
}

function TarjetaCierre({ s, destacada }: { s: Sesion; destacada?: boolean }) {
  const dif = Number(s.diferencia ?? 0);
  const estado = Math.abs(dif) < 0.005 ? { t: 'Cuadra exacto', c: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
    : dif > 0 ? { t: `Sobran ${soles(dif)}`, c: 'bg-blue-50 text-blue-800 border-blue-200' }
    : { t: `Faltan ${soles(-dif)}`, c: 'bg-red-50 text-red-800 border-red-200' };
  const otras = Object.entries(s.resumen?.ventas ?? {}).filter(([k]) => k !== 'Efectivo');
  return (
    <article className={`bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2 ${destacada ? 'border-gray-900' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm">{destacada ? 'Caja cerrada' : fechaHora(s.abierta_at)}</p>
          <p className="text-[11px] text-gray-500">{fechaHora(s.abierta_at)} → {s.cerrada_at ? hora(s.cerrada_at) : '…'}{s.cerrada_por ? ` · ${s.cerrada_por}` : ''}</p>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${estado.c}`}>{estado.t}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600">
        <span>Debía haber</span><span className="text-right font-semibold">{soles(Number(s.esperado ?? 0))}</span>
        <span>Se contó</span><span className="text-right font-semibold">{soles(Number(s.contado ?? 0))}</span>
        {s.resumen && <><span>Ventas en efectivo</span><span className="text-right">{soles(s.resumen.ventas['Efectivo']?.total ?? 0)}</span></>}
        {otras.map(([k, x]) => <React.Fragment key={k}><span>{k}</span><span className="text-right">{soles(x.total)}</span></React.Fragment>)}
        {s.resumen && s.resumen.egresos > 0 && <><span>Salidas</span><span className="text-right text-red-600">− {soles(s.resumen.egresos)}</span></>}
      </div>
      {s.nota && <p className="text-xs text-gray-500">“{s.nota}”</p>}
    </article>
  );
}
