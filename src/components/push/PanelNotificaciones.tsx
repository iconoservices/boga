'use client';

// Panel para enviar campañas de notificaciones. Lo usan el superadmin (/superadmin/notificaciones,
// puede elegir cualquier tienda con notificaciones activadas y el canal de BogaHub) y cada dueño
// (/admin/notificaciones, solo sus tiendas). El servidor comprueba los permisos y los límites.
//
// Diseño: en pantallas anchas, historial a la izquierda y formulario a la derecha (fijo al bajar);
// en el celular, el formulario queda detrás de un botón «+ Nueva campaña».

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CANAL_BOGA, PUSH_PAQUETE } from '@/lib/pushLimites';

export type OpcionCanal = { slug: string; nombre: string };

type Estado = {
  seguidores: number; usadasMes: number; usadasDia: number; cupoMes: number; restantesMes: number; creditos: number; puedeHoy: boolean;
  dentroDeHorario: boolean; tablasListas: boolean; sinTope: boolean;
  limites: { maxPorDia: number; horaDesde: number; horaHasta: number };
  ultimas: { id: number; titulo: string; cuerpo: string; url?: string | null; enviados: number; fallidos: number; creada_at: string }[];
};

const campo = 'w-full bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';
const tarjeta = 'rounded-xl border border-surface-container-highest bg-surface p-5';

export default function PanelNotificaciones({ opciones, superadmin = false }: { opciones: OpcionCanal[]; superadmin?: boolean }) {
  const [slug, setSlug] = useState(opciones[0]?.slug ?? '');
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState('');
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [url, setUrl] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [formAbierto, setFormAbierto] = useState(false); // solo aplica en el celular

  // Si las opciones llegan después (carga asíncrona), se elige la primera
  useEffect(() => { if (!slug && opciones[0]) setSlug(opciones[0].slug); }, [opciones, slug]);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token || '';

  const cargar = useCallback(async () => {
    if (!slug) return;
    setError(''); setEstado(null);
    try {
      const r = await fetch(`/api/push/enviar?store=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${await token()}` } });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'No se pudo cargar'); return; }
      setEstado(j);
    } catch { setError('No se pudo cargar'); }
  }, [slug]);
  useEffect(() => { cargar(); }, [cargar]);

  // Superadmin: suma un paquete de notificaciones cuando el dueño paga (Yape/Plin). Requiere la columna push_creditos.
  const sumarPaquete = async () => {
    if (!estado || !window.confirm(`¿Sumar ${PUSH_PAQUETE} notificaciones compradas a esta tienda?`)) return;
    const { error: e } = await supabase.from('stores').update({ push_creditos: estado.creditos + PUSH_PAQUETE }).eq('slug', slug);
    setMensaje(e ? 'No se pudo sumar (¿corriste el SQL de push_creditos en supabase_setup.sql?)' : `✅ Se sumaron ${PUSH_PAQUETE} notificaciones.`);
    if (!e) cargar();
  };

  // Prueba: la notificación llega solo a ESTE dispositivo (no avisa a nadie, no gasta cupo)
  const enviarPrueba = async () => {
    setMensaje('');
    if (!titulo.trim() || !cuerpo.trim()) { setMensaje('Escribe el título y el texto.'); return; }
    setEnviando(true);
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!sub) { setMensaje('Este navegador no tiene las notificaciones activadas. Activa antes la campana de BogaHub (o el interruptor de tu perfil).'); setEnviando(false); return; }
      const r = await fetch('/api/push/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ store_slug: slug, titulo, cuerpo, url, prueba_endpoint: sub.endpoint }),
      });
      const j = await r.json();
      setMensaje(r.ok ? '✅ Prueba enviada: debería llegarte en unos segundos.' : (j.error || 'No se pudo enviar la prueba'));
    } catch { setMensaje('No se pudo enviar la prueba'); }
    setEnviando(false);
  };

  // Reutilizar una campaña anterior: copia su contenido al formulario para ajustarlo y volver a enviarlo.
  // (Una notificación ya enviada no se puede editar: ya está en los dispositivos.)
  const reutilizar = (c: { titulo: string; cuerpo: string; url?: string | null }) => {
    setTitulo(c.titulo); setCuerpo(c.cuerpo); setUrl(c.url && c.url !== '/' ? c.url : '');
    setMensaje('Campaña cargada: ajusta lo que quieras y envíala. Cuenta como una campaña nueva.');
    setFormAbierto(true);
    setTimeout(() => document.getElementById('form-campana')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const enviar = async () => {
    setMensaje('');
    if (!titulo.trim() || !cuerpo.trim()) { setMensaje('Escribe el título y el texto.'); return; }
    if (!window.confirm(`¿Enviar "${titulo}" a ${estado?.seguidores ?? 0} personas? No se puede deshacer.`)) return;
    setEnviando(true);
    try {
      const r = await fetch('/api/push/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ store_slug: slug, titulo, cuerpo, url }),
      });
      const j = await r.json();
      if (!r.ok) setMensaje(j.error || 'No se pudo enviar');
      else {
        setMensaje(`✅ Enviada a ${j.enviados} personas${j.fallidos ? ` (${j.fallidos} no la recibieron)` : ''}.`);
        setTitulo(''); setCuerpo(''); setUrl('');
        cargar();
      }
    } catch { setMensaje('No se pudo enviar'); }
    setEnviando(false);
  };

  if (opciones.length === 0) {
    return (
      <div className={`${tarjeta} text-sm text-secondary`}>
        Todavía no hay ninguna tienda con notificaciones activadas. Se activan desde el editor de tienda del superadmin
        (casilla «Notificaciones push propias»).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {opciones.length > 1 && (
        <div>
          <label className="block text-xs font-bold text-secondary mb-1">Enviar como</label>
          <select className={campo} value={slug} onChange={(e) => { setSlug(e.target.value); setMensaje(''); }}>
            {opciones.map((o) => <option key={o.slug} value={o.slug}>{o.nombre}</option>)}
          </select>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">{error}</div>}

      {estado && !estado.tablasListas && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm">
          Falta crear las tablas: corre <b>supabase_push.sql</b> en el SQL editor de Supabase.
        </div>
      )}

      {estado && (
        <>
          {slug !== CANAL_BOGA && !estado.sinTope && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-4 text-xs leading-relaxed">
              Tus notificaciones llegan solo a quienes instalaron y siguen tu app. Si mandas demasiadas, la gente puede silenciarlas:
              úsalas con criterio. Las notificaciones del mes se acumulan (se renuevan el día 1) y las extra compradas no vencen.
            </div>
          )}

          <div className={`${tarjeta} flex flex-wrap gap-8 items-center`}>
            <div><div className="text-2xl font-extrabold text-on-surface">{estado.seguidores}</div><div className="text-xs text-secondary">seguidores</div></div>
            <div>
              <div className="text-2xl font-extrabold text-on-surface">{estado.sinTope ? '∞' : `${estado.restantesMes}/${estado.cupoMes}`}</div>
              <div className="text-xs text-secondary">{estado.sinTope ? 'sin tope de campañas' : 'notificaciones disponibles este mes'}</div>
            </div>
            {slug !== CANAL_BOGA && (
              <div>
                <div className="text-2xl font-extrabold text-on-surface">{estado.creditos}</div>
                <div className="text-xs text-secondary">notificaciones extra compradas (no vencen)</div>
                {superadmin && (
                  <button onClick={sumarPaquete} className="mt-1 text-xs font-bold text-primary hover:underline">+ Sumar paquete de {PUSH_PAQUETE}</button>
                )}
              </div>
            )}
            <div className="text-xs text-secondary">
              {estado.sinTope ? '' : `Máximo ${estado.limites.maxPorDia} por día · `}se envía de {estado.limites.horaDesde}:00 a {estado.limites.horaHasta}:00 (Lima)
              {!estado.dentroDeHorario && <b className="text-amber-700"> · ahora está fuera de horario</b>}
            </div>
          </div>

          {/* Celular: una sola columna (formulario arriba, detrás del botón). Ancho: historial | formulario */}
          <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start">
            {/* Formulario */}
            <div className="order-1 md:order-2 flex flex-col gap-3 md:sticky md:top-4">
              <button
                onClick={() => setFormAbierto((v) => !v)}
                className="md:hidden flex items-center justify-center gap-1.5 rounded-xl bg-primary text-white font-bold py-3 text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">{formAbierto ? 'close' : 'add'}</span>
                {formAbierto ? 'Cerrar' : 'Nueva campaña'}
              </button>

              <div id="form-campana" className={`${formAbierto ? 'flex' : 'hidden'} md:flex ${tarjeta} flex-col gap-3 scroll-mt-4`}>
                <h3 className="font-bold text-on-surface">Nueva campaña</h3>
                <input className={campo} maxLength={60} placeholder="Título (ej. 🔥 Ofertas del fin de semana)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                <textarea className={campo + ' min-h-[88px]'} maxLength={160} placeholder="Texto corto (máx. 160 caracteres)" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
                <input className={campo} placeholder="A dónde lleva al tocarla (opcional, ej. /market). Vacío = inicio de la app" value={url} onChange={(e) => setUrl(e.target.value)} />
                <div className="text-[11px] text-secondary">{titulo.length}/60 · {cuerpo.length}/160</div>
                <button
                  onClick={enviar}
                  disabled={enviando || !estado.puedeHoy}
                  className="w-full rounded-lg bg-primary text-white font-bold py-2.5 text-sm disabled:opacity-50"
                >
                  {enviando ? 'Enviando…' : estado.puedeHoy ? 'Enviar a todos los seguidores' : 'Límite de campañas alcanzado'}
                </button>
                <button
                  onClick={enviarPrueba}
                  disabled={enviando}
                  className="w-full rounded-lg border border-primary text-primary font-bold py-2.5 text-sm disabled:opacity-50"
                >
                  Enviarme una prueba (solo a este dispositivo)
                </button>
                {mensaje && <p className="text-sm text-on-surface">{mensaje}</p>}
              </div>
            </div>

            {/* Historial */}
            <div className={`order-2 md:order-1 ${tarjeta}`}>
              <h3 className="font-bold text-on-surface mb-1">Últimas campañas</h3>
              {estado.ultimas.length === 0 ? (
                <p className="text-sm text-secondary py-3">Todavía no enviaste ninguna campaña.</p>
              ) : (
                estado.ultimas.map((c) => (
                  <div key={c.id} className="py-3 border-t border-surface-container-highest first:border-t-0 text-sm">
                    <b className="text-on-surface">{c.titulo}</b>
                    <div className="text-secondary">{c.cuerpo}</div>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <div className="text-[11px] text-secondary">
                        {new Date(c.creada_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })} · enviada a {c.enviados}{c.fallidos ? ` · ${c.fallidos} fallaron` : ''}
                      </div>
                      <button
                        onClick={() => reutilizar(c)}
                        className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>Reutilizar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
