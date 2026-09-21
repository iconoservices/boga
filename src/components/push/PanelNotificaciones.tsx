'use client';

// Panel para enviar campañas de notificaciones. Lo usan el superadmin (/superadmin/notificaciones,
// puede elegir cualquier tienda con avisos activados y el canal de BogaHub) y cada dueño
// (/admin/notificaciones, solo sus tiendas). El servidor comprueba los permisos y los límites.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type OpcionCanal = { slug: string; nombre: string };

type Estado = {
  seguidores: number; usadasSemana: number; usadasDia: number; restantesSemana: number; puedeHoy: boolean;
  dentroDeHorario: boolean; tablasListas: boolean; sinTope: boolean;
  limites: { maxPorSemana: number; maxPorDia: number; horaDesde: number; horaHasta: number };
  ultimas: { id: number; titulo: string; cuerpo: string; enviados: number; fallidos: number; creada_at: string }[];
};

const campo = 'w-full bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';

export default function PanelNotificaciones({ opciones }: { opciones: OpcionCanal[] }) {
  const [slug, setSlug] = useState(opciones[0]?.slug ?? '');
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState('');
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [url, setUrl] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

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

  // Prueba: la notificación llega solo a ESTE dispositivo (no avisa a nadie, no gasta cupo)
  const enviarPrueba = async () => {
    setMensaje('');
    if (!titulo.trim() || !cuerpo.trim()) { setMensaje('Escribe el título y el texto.'); return; }
    setEnviando(true);
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!sub) { setMensaje('Este navegador no tiene los avisos activados. Activa antes la campana de BogaHub (o el interruptor de tu perfil).'); setEnviando(false); return; }
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
      <div className="rounded-xl border border-surface-container-highest bg-surface p-6 text-sm text-secondary">
        Todavía no hay ninguna tienda con avisos activados. Se activan desde el editor de tienda del superadmin
        (casilla «Avisos push propios»).
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
          <div className="rounded-xl border border-surface-container-highest bg-surface p-5 flex flex-wrap gap-8 items-center">
            <div><div className="text-2xl font-extrabold text-on-surface">{estado.seguidores}</div><div className="text-xs text-secondary">seguidores</div></div>
            <div>
              <div className="text-2xl font-extrabold text-on-surface">{estado.sinTope ? '∞' : `${estado.restantesSemana}/${estado.limites.maxPorSemana}`}</div>
              <div className="text-xs text-secondary">{estado.sinTope ? 'sin tope de campañas' : 'campañas disponibles esta semana'}</div>
            </div>
            <div className="text-xs text-secondary">
              {estado.sinTope ? '' : `Máximo ${estado.limites.maxPorDia} por día · `}se envía de {estado.limites.horaDesde}:00 a {estado.limites.horaHasta}:00 (Lima)
              {!estado.dentroDeHorario && <b className="text-amber-700"> · ahora está fuera de horario</b>}
            </div>
          </div>

          <div className="rounded-xl border border-surface-container-highest bg-surface p-5 flex flex-col gap-3">
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

          {estado.ultimas.length > 0 && (
            <div className="rounded-xl border border-surface-container-highest bg-surface p-5">
              <h3 className="font-bold text-on-surface mb-3">Últimas campañas</h3>
              {estado.ultimas.map((c) => (
                <div key={c.id} className="py-3 border-t border-surface-container-highest text-sm">
                  <b className="text-on-surface">{c.titulo}</b>
                  <div className="text-secondary">{c.cuerpo}</div>
                  <div className="text-[11px] text-secondary mt-1">
                    {new Date(c.creada_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })} · enviada a {c.enviados}{c.fallidos ? ` · ${c.fallidos} fallaron` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
