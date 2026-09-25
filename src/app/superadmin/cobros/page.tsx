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
import {
  PASOS_PRECIO, estadoCobro, nivelAlcance, nivelOperacion, pasosDeTienda, precioSugerido, sumarMeses,
  type Modulos, type TipoCobro,
} from '@/lib/modulos';

interface Tienda { slug: string; name: string; status: string | null; modulos: Modulos | null; subdominio_activo: boolean | null }
interface Suscripcion { store: string; monto_mensual: number | null; vence: string | null; notas: string | null }
interface Pago { id: string; store: string; monto: number; metodo: string | null; referencia: string | null; meses: number; vence_despues: string | null; nota: string | null; created_at: string }

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
  const [subs, setSubs] = useState<Record<string, Suscripcion>>({});
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [sinTablas, setSinTablas] = useState(false);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [gestion, setGestion] = useState<string | null>(null);   // slug de la tienda abierta en el modal

  const hoy = hoyLima();

  const cargar = useCallback(async () => {
    const [t, pr, su, pa] = await Promise.all([
      supabase.from('stores').select('slug,name,status,modulos,subdominio_activo').order('name'),
      supabase.from('plan_precios').select('clave,monto'),
      supabase.from('store_suscripciones').select('store,monto_mensual,vence,notas'),
      supabase.from('store_pagos').select('id,store,monto,metodo,referencia,meses,vence_despues,nota,created_at').order('created_at', { ascending: false }).limit(500),
    ]);
    setTiendas((t.data ?? []) as Tienda[]);
    if (pr.error || su.error || pa.error) { setSinTablas(true); return; }
    setSinTablas(false);
    const mapaPrecios: Record<string, number> = {};
    (pr.data ?? []).forEach((r: { clave: string; monto: number }) => { mapaPrecios[r.clave] = Number(r.monto) || 0; });
    setPrecios(mapaPrecios);
    setBorrador(Object.fromEntries(PASOS_PRECIO.map((p) => [p.clave, mapaPrecios[p.clave] != null ? String(mapaPrecios[p.clave]) : ''])));
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
        const sugerido = precioSugerido(pasosDeTienda(t), precios);
        const sub = subs[t.slug];
        const monto = sub?.monto_mensual ?? sugerido;
        return { tienda: t, sugerido, sub, monto, estado: estadoCobro(sub?.vence, monto, hoy) };
      }),
    [tiendas, precios, subs, hoy],
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
    const filasPrecio = PASOS_PRECIO.map((p) => ({ clave: p.clave, monto: Math.max(0, Number(borrador[p.clave]) || 0), updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('plan_precios').upsert(filasPrecio, { onConflict: 'clave' });
    setGuardandoPrecios(false);
    setMensaje(error ? `No se pudieron guardar los precios: ${error.message}` : 'Precios guardados.');
    if (!error) cargar();
  };

  if (cargando) return <div className="p-10 text-center text-[#424754] text-sm font-semibold">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const abierta = filas.find((f) => f.tienda.slug === gestion) ?? null;

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

        {/* Precios por nivel */}
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-bold">Precios por nivel (S/ al mes)</h2>
            <p className="text-xs text-[#424754] mt-1">
              Cada paso se <b>suma</b> al anterior. Una tienda con App + Ventas + Inventario paga: App + Ventas + Inventario (más la Carta base).
            </p>
          </div>
          <div className="bg-white border border-[#c2c6d6] rounded-md divide-y divide-[#ecedf7]">
            {PASOS_PRECIO.map((p) => (
              <label key={p.clave} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold">{p.etiqueta}</span>
                  <span className="block text-[10px] text-[#727785] font-semibold">{p.ayuda}</span>
                </span>
                <span className="text-xs font-bold text-[#424754]">S/</span>
                <input
                  type="number" min={0} step="1" inputMode="decimal"
                  value={borrador[p.clave] ?? ''}
                  onChange={(e) => setBorrador((b) => ({ ...b, [p.clave]: e.target.value }))}
                  placeholder="0"
                  className="w-24 bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-sm font-bold text-right outline-none focus:border-[#0058be]"
                />
              </label>
            ))}
          </div>
          <button
            onClick={guardarPrecios}
            disabled={guardandoPrecios || sinTablas}
            className="self-start px-4 py-2.5 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] disabled:opacity-50 transition-colors"
          >
            {guardandoPrecios ? 'Guardando…' : 'Guardar precios'}
          </button>
        </section>

        {/* Tiendas */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold">Tiendas</h2>
          <div className="flex flex-col gap-2">
            {filas.map((f) => {
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
                      {f.sub?.monto_mensual != null ? 'monto acordado' : 'precio sugerido'}
                    </p>
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
            {filas.length === 0 && <p className="text-xs text-[#727785] italic">Todavía no hay tiendas.</p>}
          </div>
        </section>
      </main>

      {abierta && (
        <GestionTienda
          fila={abierta}
          hoy={hoy}
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
  fila, hoy, pagos, deshabilitado, onClose, onCambio,
}: {
  fila: { tienda: Tienda; sugerido: number; sub?: Suscripcion; monto: number };
  hoy: string;
  pagos: Pago[];
  deshabilitado: boolean;
  onClose: () => void;
  onCambio: (mensaje: string) => void;
}) {
  const { tienda, sub, sugerido, monto } = fila;
  const [acordado, setAcordado] = useState(sub?.monto_mensual != null ? String(sub.monto_mensual) : '');
  const [vence, setVence] = useState(sub?.vence ?? '');
  const [notas, setNotas] = useState(sub?.notas ?? '');
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
      vence: vence || null,
      notas: notas.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'store' });
    setOcupado(false);
    if (err) { setError(err.message); return; }
    onCambio(`Acuerdo de ${tienda.name} guardado.`);
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
      updated_at: new Date().toISOString(),
    }, { onConflict: 'store' });
    setOcupado(false);
    if (e2) { setError(`El pago se guardó pero no se pudo mover el vencimiento: ${e2.message}`); return; }
    onCambio(`Pago de ${soles(montoPago)} de ${tienda.name} registrado. Pagado hasta ${nuevoVence}.`);
    onClose();
  };

  const campo = 'w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be]';

  return (
    <div className="fixed inset-0 z-[200] bg-[#191b23]/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between sticky top-0">
          <div>
            <h3 className="font-bold text-sm">{tienda.name}</h3>
            <p className="text-[10px] text-[#727785] font-semibold">Precio sugerido {soles(sugerido)} /mes</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-7 h-7 flex items-center justify-center hover:bg-[#e6e7f2] rounded-lg">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          {/* Registrar un pago */}
          <section className="flex flex-col gap-3">
            <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Registrar un pago recibido</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[10px] font-bold text-[#545f73]">Monto (S/)
                <input type="number" min={0} step="0.01" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} className={`${campo} mt-1`} />
              </label>
              <label className="text-[10px] font-bold text-[#545f73]">Método
                <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={`${campo} mt-1`}>
                  {METODOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label className="text-[10px] font-bold text-[#545f73]">Meses que cubre
                <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} className={`${campo} mt-1`}>
                  {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>)}
                </select>
              </label>
              <label className="text-[10px] font-bold text-[#545f73]">N.º de operación (opcional)
                <input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={`${campo} mt-1`} />
              </label>
            </div>
            <p className="text-[11px] text-[#424754] font-semibold">Quedará pagado hasta <b>{nuevoVence}</b>.</p>
            <button onClick={registrarPago} disabled={ocupado || deshabilitado} className="self-start px-4 py-2.5 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] disabled:opacity-50">
              {ocupado ? 'Guardando…' : 'Registrar pago'}
            </button>
          </section>

          {/* Acuerdo */}
          <section className="flex flex-col gap-3 border-t border-[#ecedf7] pt-5">
            <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Acuerdo con esta tienda</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[10px] font-bold text-[#545f73]">Monto acordado (S/ al mes)
                <input type="number" min={0} step="0.01" value={acordado} onChange={(e) => setAcordado(e.target.value)} placeholder={`Vacío = ${sugerido}`} className={`${campo} mt-1`} />
              </label>
              <label className="text-[10px] font-bold text-[#545f73]">Pagado hasta
                <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={`${campo} mt-1`} />
              </label>
            </div>
            <label className="text-[10px] font-bold text-[#545f73]">Notas
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={`${campo} mt-1 resize-none`} />
            </label>
            <button onClick={guardarAcuerdo} disabled={ocupado || deshabilitado} className="self-start px-4 py-2.5 border border-[#c2c6d6] text-[#0058be] rounded-md font-bold text-xs hover:bg-[#f2f3fd] disabled:opacity-50">
              Guardar acuerdo
            </button>
          </section>

          {/* Historial */}
          <section className="flex flex-col gap-2 border-t border-[#ecedf7] pt-5">
            <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Pagos registrados ({pagos.length})</p>
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
                    <span className="font-bold whitespace-nowrap">{soles(Number(p.monto))} <span className="text-[10px] text-[#727785]">({p.meses}m)</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
