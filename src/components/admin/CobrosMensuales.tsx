'use client';

// Cobros mensuales: el negocio lleva a quién le cobra cada mes (pensión, membresía, cuota, alquiler…).
// Cada cliente tiene un monto y una fecha hasta la que está pagado (`vence`). «Cobrado» suma un mes y deja el pago en el
// historial; «Recordar» abre WhatsApp con el mensaje escrito. Tablas: supabase_cobros_mensuales.sql.
// Solo aparece si el superadmin prendió el módulo «cobros_mensuales» de la tienda.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hoyLima } from '@/lib/fechaLima';
import { estadoCobro, sumarMeses } from '@/lib/modulos';

interface Cliente {
  id: string;
  nombre: string;
  whatsapp: string | null;
  concepto: string | null;
  monto: number;
  vence: string | null;
  activo: boolean;
}

type Form = { id?: string; nombre: string; whatsapp: string; concepto: string; monto: string; vence: string };
const FORM_VACIO = (): Form => ({ nombre: '', whatsapp: '', concepto: '', monto: '', vence: hoyLima() });

const dinero = (n: number) => `S/ ${Number(n).toFixed(2)}`;
const fechaCorta = (iso: string) => iso.split('-').reverse().join('/');

/** Solo dígitos; un celular de 9 dígitos de Perú se completa con el 51. */
const telefonoWa = (t: string) => {
  const d = t.replace(/\D/g, '');
  return d.length === 9 ? `51${d}` : d;
};

const campo = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-md font-medium text-sm focus:outline-none focus:border-black transition-all';

export default function CobrosMensuales({ slug }: { slug: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarPausados, setMostrarPausados] = useState(false);
  const hoy = hoyLima();

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: e } = await supabase
      .from('cobros_clientes')
      .select('id,nombre,whatsapp,concepto,monto,vence,activo')
      .eq('store', slug)
      .order('vence', { ascending: true, nullsFirst: true });
    if (e) {
      setError(/relation .* does not exist|42P01/i.test(`${e.code} ${e.message}`)
        ? 'Faltan las tablas de este módulo. Avisa a Boga (hay que ejecutar supabase_cobros_mensuales.sql).'
        : e.message);
      setClientes([]);
    } else {
      setError('');
      setClientes(((data ?? []) as Cliente[]).map((c) => ({ ...c, monto: Number(c.monto) || 0 })));
    }
    setCargando(false);
  }, [slug]);

  useEffect(() => { cargar(); }, [cargar]);

  const conEstado = useMemo(
    () => clientes.map((c) => ({ c, est: estadoCobro(c.vence, c.monto, hoy) })),
    [clientes, hoy],
  );
  const activos = conEstado.filter((x) => x.c.activo);
  const pausados = conEstado.filter((x) => !x.c.activo);
  const pendiente = activos.filter((x) => x.est.tipo === 'vencido' || x.est.tipo === 'por_vencer' || x.est.tipo === 'sin_pagos');
  const totalPendiente = pendiente.reduce((s, x) => s + x.c.monto, 0);
  const vencidos = activos.filter((x) => x.est.tipo === 'vencido').length;

  const guardar = async () => {
    if (!form) return;
    const nombre = form.nombre.trim();
    const monto = parseFloat(form.monto);
    if (!nombre || !(monto > 0)) { alert('Pon el nombre y un monto mayor a 0.'); return; }
    setGuardando(true);
    const fila = {
      store: slug,
      nombre,
      whatsapp: form.whatsapp.trim() || null,
      concepto: form.concepto.trim() || null,
      monto,
      vence: form.vence || null,
    };
    const { error: e } = form.id
      ? await supabase.from('cobros_clientes').update(fila).eq('id', form.id)
      : await supabase.from('cobros_clientes').insert(fila);
    setGuardando(false);
    if (e) { alert('No se pudo guardar: ' + e.message); return; }
    setForm(null);
    cargar();
  };

  const cobrado = async (c: Cliente) => {
    if (!window.confirm(`¿Registrar el pago de ${c.nombre} por ${dinero(c.monto)}? Su próximo vencimiento pasa a un mes después.`)) return;
    const nuevo = sumarMeses(c.vence || hoy, 1);
    const { error: e1 } = await supabase.from('cobros_pagos').insert({ cliente_id: c.id, store: slug, monto: c.monto, meses: 1, vence_despues: nuevo });
    if (e1) { alert('No se pudo registrar el pago: ' + e1.message); return; }
    const { error: e2 } = await supabase.from('cobros_clientes').update({ vence: nuevo }).eq('id', c.id);
    if (e2) { alert('El pago quedó registrado pero no se movió el vencimiento: ' + e2.message); }
    cargar();
  };

  const alternarActivo = async (c: Cliente) => {
    await supabase.from('cobros_clientes').update({ activo: !c.activo }).eq('id', c.id);
    cargar();
  };

  const borrar = async (c: Cliente) => {
    if (!window.confirm(`¿Borrar a ${c.nombre} y su historial de pagos?`)) return;
    await supabase.from('cobros_clientes').delete().eq('id', c.id);
    cargar();
  };

  const linkRecordatorio = (c: Cliente, dias: number | null) => {
    const cuando = dias === null ? '' : dias < 0 ? ` (venció hace ${-dias} día${-dias === 1 ? '' : 's'})` : dias === 0 ? ' (vence hoy)' : ` (vence el ${c.vence ? fechaCorta(c.vence) : ''})`;
    const texto = `Hola ${c.nombre}, te recordamos tu pago de ${dinero(c.monto)}${c.concepto ? ` por ${c.concepto}` : ''}${cuando}. ¡Gracias!`;
    return `https://wa.me/${telefonoWa(c.whatsapp || '')}?text=${encodeURIComponent(texto)}`;
  };

  const insignia = (x: (typeof conEstado)[number]) => {
    const { tipo, dias } = x.est;
    if (tipo === 'vencido') return { txt: `Vencido hace ${-(dias ?? 0)} d`, cls: 'bg-red-50 text-red-700' };
    if (tipo === 'por_vencer') return { txt: dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`, cls: 'bg-amber-50 text-amber-700' };
    if (tipo === 'sin_pagos') return { txt: 'Sin fecha', cls: 'bg-gray-100 text-gray-600' };
    return { txt: x.c.vence ? `Al día · ${fechaCorta(x.c.vence)}` : 'Al día', cls: 'bg-green-50 text-green-700' };
  };

  const fila = (x: (typeof conEstado)[number]) => {
    const { c } = x;
    const ins = insignia(x);
    const puedeWa = !!c.whatsapp && telefonoWa(c.whatsapp).length >= 9;
    return (
      <div key={c.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${c.activo ? '' : 'opacity-60'}`}>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{c.nombre}</p>
          <p className="text-xs text-gray-500 font-medium truncate">{c.concepto || 'Sin concepto'} · {dinero(c.monto)} al mes</p>
        </div>
        <span className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${ins.cls}`}>{ins.txt}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {c.activo && (
            <button onClick={() => cobrado(c)} className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors">Cobrado</button>
          )}
          {c.activo && puedeWa && (
            <a href={linkRecordatorio(c, x.est.dias)} target="_blank" rel="noreferrer" title="Recordar por WhatsApp" className="px-3 py-1.5 rounded-md border border-green-200 text-green-700 text-xs font-bold hover:bg-green-50 transition-colors">Recordar</a>
          )}
          <button onClick={() => setForm({ id: c.id, nombre: c.nombre, whatsapp: c.whatsapp || '', concepto: c.concepto || '', monto: String(c.monto), vence: c.vence || '' })} title="Editar" className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={() => alternarActivo(c)} title={c.activo ? 'Pausar (ya no cobra)' : 'Reactivar'} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100">
            <span className="material-symbols-outlined text-[18px]">{c.activo ? 'pause' : 'play_arrow'}</span>
          </button>
          <button onClick={() => borrar(c)} title="Borrar" className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="bg-white border border-gray-200 rounded-md px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Por cobrar</p>
            <p className="text-lg font-black text-gray-900">{dinero(totalPendiente)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-md px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Vencidos</p>
            <p className={`text-lg font-black ${vencidos ? 'text-red-600' : 'text-gray-900'}`}>{vencidos}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-md px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Clientes activos</p>
            <p className="text-lg font-black text-gray-900">{activos.length}</p>
          </div>
        </div>
        <button onClick={() => setForm(FORM_VACIO())} className="px-4 py-2.5 rounded-md bg-[var(--tienda-color)] text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">+ Agregar cliente</button>
      </div>

      {form && (
        <div className="bg-white border border-gray-200 rounded-md p-4 flex flex-col gap-3">
          <p className="font-bold text-gray-900">{form.id ? 'Editar cobro' : 'Nuevo cobro mensual'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label>
              <input className={campo} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Carlos Mendoza" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp (opcional)</label>
              <input className={campo} inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="987 654 321" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Concepto (opcional)</label>
              <input className={campo} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Ej: Pensión, membresía, cuota" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Monto mensual (S/)</label>
              <input className={campo} inputMode="decimal" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Próximo cobro</label>
              <input type="date" className={campo} value={form.vence} onChange={(e) => setForm({ ...form, vence: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-md border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button disabled={guardando} onClick={guardar} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-bold hover:bg-black disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        {cargando ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500 font-medium">Cargando…</p>
        ) : activos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500 font-medium">
            Todavía no hay cobros. Agrega a quien le cobras cada mes y aquí verás quién está al día y quién debe.
          </p>
        ) : (
          // Primero los que ya vencieron o están por vencer (vienen ordenados por fecha).
          activos.map(fila)
        )}
      </div>

      {pausados.length > 0 && (
        <div>
          <button onClick={() => setMostrarPausados((v) => !v)} className="text-xs font-bold text-gray-500 underline underline-offset-2">
            {mostrarPausados ? 'Ocultar' : 'Ver'} pausados ({pausados.length})
          </button>
          {mostrarPausados && <div className="mt-2 bg-white border border-gray-200 rounded-md overflow-hidden">{pausados.map(fila)}</div>}
        </div>
      )}
    </div>
  );
}
