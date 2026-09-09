'use client';

// Libro de Reclamaciones virtual (D.S. 011-2011-PCM). Formulario público que
// escribe a `reclamaciones` vía la RPC `presentar_reclamacion` (devuelve el
// número correlativo). Al enviar, muestra la Hoja de Reclamación completa con
// su número y un botón para imprimir/guardar.
//
// PENDIENTE (ver /legal/libro-de-reclamaciones): enviar la copia al correo del
// consumidor de forma automática. Hoy el consumidor guarda/imprime la hoja
// desde la pantalla de confirmación; el equipo responde desde /superadmin/reclamaciones.

import React, { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import PrintButton from '@/components/PrintButton';
import { supabase } from '@/lib/supabase';
import {
  HOJA_VACIA, type HojaReclamacion, codigoHoja, PROVEEDOR,
  PLAZO_RESPUESTA_DIAS_HABILES, RECLAMO_VS_QUEJA,
} from '@/lib/reclamaciones';

type Enviada = { numero: number; created_at: string };

const field =
  'w-full rounded-xl border border-surface-container-highest bg-surface-container-lowest px-3.5 py-2.5 text-[14px] text-on-surface outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15';
const lbl = 'mb-1.5 block font-label-md text-[11px] font-bold uppercase tracking-wider text-secondary';

export default function LibroDeReclamacionesPage() {
  const [h, setH] = useState<HojaReclamacion>(HOJA_VACIA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState<Enviada | null>(null);

  const set = <K extends keyof HojaReclamacion>(k: K, v: HojaReclamacion[K]) =>
    setH((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!h.con_nombre || !h.con_email || !h.detalle) {
      setError('Completá tu nombre, tu correo y el detalle.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.rpc('presentar_reclamacion', { p: h });
    setLoading(false);
    if (err || !data || !data[0]) {
      setError('No pudimos registrar tu reclamo. Intentá de nuevo en unos minutos o escribí a ' + PROVEEDOR.email + '.');
      return;
    }
    setOk({ numero: data[0].numero, created_at: data[0].created_at });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <AppHeader showSearch={false} showLocation={false} showChat={false} showCart={false} />
      <main className="mx-auto w-full max-w-[720px] px-container-margin pb-20 pt-6 lg:px-8">
        <Link
          href="/legal/libro-de-reclamaciones"
          className="flex items-center gap-1.5 font-label-md text-[12px] uppercase tracking-wider text-secondary transition-colors hover:text-on-surface print:hidden"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Qué es el Libro de Reclamaciones
        </Link>

        {ok ? (
          <HojaEnviada h={h} enviada={ok} />
        ) : (
          <>
            <div className="mt-5 flex items-center gap-3">
              <span className="material-symbols-outlined rounded-xl bg-primary-container/20 p-2 text-primary">menu_book</span>
              <div>
                <h1 className="font-headline-lg text-2xl font-extrabold tracking-tight text-on-surface lg:text-3xl">
                  Libro de Reclamaciones
                </h1>
                <p className="font-label-md text-[12px] text-secondary">
                  {PROVEEDOR.razonSocial} · RUC {PROVEEDOR.ruc}
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-md bg-surface-container-low p-3 font-body-md text-[13px] leading-relaxed text-on-surface/80">
              Conforme al Código de Protección y Defensa del Consumidor, tenés un Libro de
              Reclamaciones a tu disposición. Completá esta hoja y te responderemos en un plazo
              máximo de <strong>{PLAZO_RESPUESTA_DIAS_HABILES} días hábiles</strong>. Presentar un
              reclamo no impide acudir a INDECOPI.
            </p>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
              {/* 1. Consumidor */}
              <fieldset className="rounded-xl border border-surface-container-high p-4">
                <legend className="px-1 font-headline-sm text-[13px] font-bold text-on-surface">1 · Tus datos</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={lbl}>Nombre completo *</label>
                    <input className={field} required value={h.con_nombre} onChange={(e) => set('con_nombre', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>DNI / CE / Pasaporte</label>
                    <input className={field} value={h.con_documento} onChange={(e) => set('con_documento', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Teléfono</label>
                    <input className={field} value={h.con_telefono} onChange={(e) => set('con_telefono', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Correo electrónico * (te enviaremos la respuesta)</label>
                    <input className={field} type="email" required value={h.con_email} onChange={(e) => set('con_email', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Domicilio</label>
                    <input className={field} value={h.con_domicilio} onChange={(e) => set('con_domicilio', e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2 sm:col-span-2">
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={h.con_menor} onChange={(e) => set('con_menor', e.target.checked)} />
                    <span className="font-body-md text-[13px] text-on-surface/80">Soy menor de edad (completá el nombre del padre/madre o tutor)</span>
                  </label>
                  {h.con_menor && (
                    <div className="sm:col-span-2">
                      <label className={lbl}>Nombre del padre / madre / tutor</label>
                      <input className={field} value={h.apoderado} onChange={(e) => set('apoderado', e.target.value)} />
                    </div>
                  )}
                </div>
              </fieldset>

              {/* 2. Bien contratado */}
              <fieldset className="rounded-xl border border-surface-container-high p-4">
                <legend className="px-1 font-headline-sm text-[13px] font-bold text-on-surface">2 · Producto o servicio</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Tipo</label>
                    <select className={field} value={h.bien} onChange={(e) => set('bien', e.target.value as HojaReclamacion['bien'])}>
                      <option value="producto">Producto</option>
                      <option value="servicio">Servicio</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Monto reclamado (S/)</label>
                    <input className={field} inputMode="decimal" value={h.monto} onChange={(e) => set('monto', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Descripción (qué compraste, a qué comercio, número de pedido)</label>
                    <textarea className={field} rows={2} value={h.bien_detalle} onChange={(e) => set('bien_detalle', e.target.value)} />
                  </div>
                </div>
              </fieldset>

              {/* 3. Reclamo */}
              <fieldset className="rounded-xl border border-surface-container-high p-4">
                <legend className="px-1 font-headline-sm text-[13px] font-bold text-on-surface">3 · Tu reclamo</legend>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {(['reclamo', 'queja'] as const).map((t) => (
                      <label
                        key={t}
                        className={`flex-1 cursor-pointer rounded-xl border p-3 transition ${
                          h.tipo === t ? 'border-primary bg-primary-container/15' : 'border-surface-container-highest'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input type="radio" name="tipo" className="accent-primary" checked={h.tipo === t} onChange={() => set('tipo', t)} />
                          <span className="font-headline-sm text-[13px] font-bold capitalize text-on-surface">{t}</span>
                        </span>
                        <span className="mt-1 block font-body-md text-[12px] leading-snug text-on-surface/70">{RECLAMO_VS_QUEJA[t]}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className={lbl}>Detalle *</label>
                    <textarea className={field} rows={4} required value={h.detalle} onChange={(e) => set('detalle', e.target.value)} placeholder="Contanos qué pasó, cuándo y con qué pedido o comercio." />
                  </div>
                  <div>
                    <label className={lbl}>Qué pedís (opcional)</label>
                    <textarea className={field} rows={2} value={h.pedido} onChange={(e) => set('pedido', e.target.value)} placeholder="Devolución, reenvío, disculpa…" />
                  </div>
                </div>
              </fieldset>

              {error && <p className="font-body-md text-[13px] font-semibold text-error">{error}</p>}

              <p className="font-body-md text-[12px] leading-relaxed text-secondary">
                Al enviar declarás que la información es verdadera y aceptás que Boga trate estos
                datos para atender tu reclamo, según la{' '}
                <Link href="/legal/privacidad" className="underline hover:text-on-surface">Política de Privacidad</Link>.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary py-3 font-bold text-white shadow-md transition hover:bg-primary-container disabled:opacity-70"
              >
                {loading ? 'Enviando…' : 'Enviar hoja de reclamación'}
              </button>
            </form>
          </>
        )}
      </main>
    </>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex flex-col border-b border-on-surface/10 py-1.5 sm:flex-row sm:gap-3">
      <span className="w-48 shrink-0 font-label-md text-[11px] uppercase tracking-wider text-secondary">{k}</span>
      <span className="font-body-md text-[14px] text-on-surface">{v}</span>
    </div>
  );
}

function HojaEnviada({ h, enviada }: { h: HojaReclamacion; enviada: Enviada }) {
  const fecha = new Date(enviada.created_at).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
  return (
    <div className="mt-5">
      <div className="rounded-xl border border-primary/30 bg-primary-container/10 p-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <h1 className="font-headline-lg text-xl font-extrabold text-on-surface">Hoja de Reclamación registrada</h1>
        </div>
        <p className="mt-1 font-body-md text-[13px] leading-relaxed text-on-surface/80">
          Tu código es <strong>{codigoHoja(enviada.numero)}</strong>. Guardá o imprimí esta hoja.
          Te responderemos al correo <strong>{h.con_email}</strong> en un máximo de{' '}
          {PLAZO_RESPUESTA_DIAS_HABILES} días hábiles.
        </p>
        <div className="mt-3 print:hidden">
          <PrintButton label="Imprimir / Guardar esta hoja" />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-surface-container-high p-5">
        <h2 className="font-headline-sm text-[15px] font-bold text-on-surface">Hoja de Reclamación · {codigoHoja(enviada.numero)}</h2>
        <p className="font-label-md text-[11px] text-secondary">{fecha}</p>

        <h3 className="mt-4 font-label-md text-[11px] font-bold uppercase tracking-wider text-secondary">Proveedor</h3>
        <Row k="Razón social" v={PROVEEDOR.razonSocial} />
        <Row k="RUC" v={PROVEEDOR.ruc} />
        <Row k="Domicilio" v={PROVEEDOR.domicilio} />

        <h3 className="mt-4 font-label-md text-[11px] font-bold uppercase tracking-wider text-secondary">Consumidor</h3>
        <Row k="Nombre" v={h.con_nombre} />
        <Row k="Documento" v={h.con_documento} />
        <Row k="Domicilio" v={h.con_domicilio} />
        <Row k="Teléfono" v={h.con_telefono} />
        <Row k="Correo" v={h.con_email} />
        {h.con_menor && <Row k="Padre / madre / tutor" v={h.apoderado || '—'} />}

        <h3 className="mt-4 font-label-md text-[11px] font-bold uppercase tracking-wider text-secondary">Bien contratado</h3>
        <Row k="Tipo" v={h.bien === 'producto' ? 'Producto' : 'Servicio'} />
        <Row k="Monto reclamado" v={h.monto ? `S/ ${h.monto}` : undefined} />
        <Row k="Descripción" v={h.bien_detalle} />

        <h3 className="mt-4 font-label-md text-[11px] font-bold uppercase tracking-wider text-secondary">
          {h.tipo === 'reclamo' ? 'Reclamo' : 'Queja'}
        </h3>
        <Row k="Detalle" v={h.detalle} />
        <Row k="Pedido del consumidor" v={h.pedido} />
      </div>

      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-surface-container-high px-4 py-2 font-label-md text-[12px] uppercase tracking-wider text-on-surface print:hidden"
      >
        Volver a Boga
      </Link>
    </div>
  );
}
