'use client';

// Pestaña "Alumnos" de la plantilla Academia: la entrada de los padres y de los profesores desde la app instalada.
//  · Padre: inicia sesión con la cuenta de siempre (la misma de todas las tiendas). Sus hijos aparecen solos si la
//    academia anotó su correo; si no, los vincula con el código de 6 letras que le da la academia.
//  · Profesor: botón a la pantalla de asistencia (pide el PIN que le dio el dueño).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import type { StoreTheme } from '@/lib/templates.config';
import { horaLegibleLima } from '@/lib/academia';
import { useAuth } from '@/context/AuthContext';
import { useCustomerSession } from '@/context/CustomerSessionContext';
import { TXT, ICON } from '../shared/tokens';

interface Hijo { nombre: string; grupo: string | null; token: string; llegadaHoy: string | null }

export default function AccesoAlumnos({ t, slug, demo }: { t: StoreTheme; slug: string; demo?: boolean }) {
  const { session, loading } = useAuth();
  const { setModalAbierto } = useCustomerSession();
  const accessToken = session?.access_token;

  const [hijos, setHijos] = useState<Hijo[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [codigo, setCodigo] = useState('');
  const [verQr, setVerQr] = useState<string | null>(null);

  const consultar = useCallback(async (extra?: { accion: 'vincular'; codigo: string }) => {
    if (!accessToken) return;
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/academia/hijos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ store: slug, ...extra }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error || 'No se pudo consultar'); return; }
      setHijos(j.hijos ?? []);
      if (extra) setCodigo('');
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [accessToken, slug]);

  useEffect(() => { if (!demo && accessToken) consultar(); }, [demo, accessToken, consultar]);

  // Mientras mira a sus hijos, el estado "llegó" se actualiza solo.
  useEffect(() => {
    if (!hijos?.length) return;
    const id = setInterval(() => { if (document.visibilityState === 'visible') consultar(); }, 30_000);
    return () => clearInterval(id);
  }, [hijos, consultar]);

  const tarjeta = { background: t.surface, border: `1px solid ${t.outlineVariant}60` } as const;

  const formVincular = (
    <form
      onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) consultar({ accion: 'vincular', codigo: codigo.trim() }); }}
      className="p-4 rounded-2xl flex flex-col gap-3"
      style={tarjeta}
    >
      <p className={`${TXT.body} font-bold`} style={{ color: t.onSurface }}>¿No aparece tu hijo?</p>
      <p className={`${TXT.small}`} style={{ color: t.onSurfaceVariant }}>Escribe el código de 6 letras que te dio la academia.</p>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="ABC123"
        autoCapitalize="characters"
        className={`w-full rounded-xl px-4 py-3 ${TXT.lead} tracking-[0.3em] text-center font-mono outline-none border`}
        style={{ background: t.background, borderColor: `${t.outlineVariant}80`, color: t.onSurface }}
      />
      <button disabled={cargando || codigo.length < 6} className={`py-3 rounded-full font-extrabold ${TXT.body} disabled:opacity-50 active:scale-95 transition-all`} style={{ background: t.primary, color: t.onPrimary }}>
        {cargando ? 'Vinculando…' : 'Vincular a mi hijo'}
      </button>
      {error && <p className={`${TXT.small} font-semibold`} style={{ color: '#dc2626' }}>{error}</p>}
    </form>
  );

  return (
    <div className="animate-fade-in">
      <section className="py-10 md:py-14" style={{ background: t.secondary }}>
        <div className="max-w-3xl mx-auto px-5 md:px-10">
          <p className={`${TXT.micro} font-extrabold uppercase tracking-widest text-white/70`}>Alumnos y padres</p>
          <h2 className="font-black text-3xl md:text-4xl leading-tight text-white mt-1">Mira si tu hijo llegó</h2>
          <p className="text-base leading-relaxed text-white/90 mt-3">Inicia sesión y ten a mano su carnet con QR. Te avisamos cuando llegue a clase.</p>
        </div>
      </section>

      <div className="px-5 md:px-6 pt-6 pb-8 max-w-3xl md:mx-auto flex flex-col gap-5">
        {demo ? (
          <div className="p-4 rounded-2xl" style={tarjeta}>
            <p className={`${TXT.body} font-bold`} style={{ color: t.onSurface }}>Así se verá en tu academia</p>
            <p className={`${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>Cada padre inicia sesión y ve a sus hijos, su carnet con QR y si hoy llegaron a clase.</p>
          </div>
        ) : loading ? (
          <p className={`${TXT.small}`} style={{ color: t.onSurfaceVariant }}>Cargando…</p>
        ) : !accessToken ? (
          <div className="p-5 rounded-2xl flex flex-col gap-3 items-start" style={tarjeta}>
            <span className={`material-symbols-outlined ${ICON.lg} p-3 rounded-2xl`} style={{ background: `${t.primary}15`, color: t.primary }}>family_restroom</span>
            <p className={`${TXT.lead} font-extrabold`} style={{ color: t.onSurface }}>Entra con tu cuenta</p>
            <p className={`${TXT.small}`} style={{ color: t.onSurfaceVariant }}>Usa la misma cuenta con la que pides en las tiendas de BogaHub. Si la academia anotó tu correo, tus hijos aparecen solos.</p>
            <button onClick={() => setModalAbierto(true)} className={`w-full py-3 rounded-full font-extrabold ${TXT.body} active:scale-95 transition-all`} style={{ background: t.primary, color: t.onPrimary }}>
              Iniciar sesión
            </button>
          </div>
        ) : hijos === null ? (
          <p className={`${TXT.small}`} style={{ color: t.onSurfaceVariant }}>{error || 'Buscando a tus hijos…'}</p>
        ) : (
          <>
            {hijos.length === 0 && (
              <div className="p-4 rounded-2xl" style={tarjeta}>
                <p className={`${TXT.body} font-bold`} style={{ color: t.onSurface }}>Todavía no hay alumnos en tu cuenta</p>
                <p className={`${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>Pídele a la academia que anote tu correo, o vincula a tu hijo con su código aquí abajo.</p>
              </div>
            )}
            {hijos.map((h) => (
              <div key={h.token} className="p-4 rounded-2xl" style={tarjeta}>
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${ICON.md} p-2 rounded-full shrink-0`} style={{ background: h.llegadaHoy ? '#10b981' : `${t.outlineVariant}80`, color: h.llegadaHoy ? '#fff' : t.onSurfaceVariant }}>
                    {h.llegadaHoy ? 'check' : 'schedule'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`${TXT.body} font-extrabold truncate`} style={{ color: t.onSurface }}>{h.nombre}</p>
                    <p className={`${TXT.small}`} style={{ color: t.onSurfaceVariant }}>
                      {[h.grupo, h.llegadaHoy ? `Llegó a las ${horaLegibleLima(h.llegadaHoy)}` : 'Aún no llega hoy'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setVerQr(verQr === h.token ? null : h.token)} className={`flex-1 py-2 rounded-full font-bold ${TXT.small} active:scale-95 transition-all`} style={{ background: t.primary, color: t.onPrimary }}>
                    {verQr === h.token ? 'Ocultar QR' : 'Mostrar QR'}
                  </button>
                  <Link href={`/academia/alumno/${h.token}`} className={`flex-1 py-2 rounded-full font-bold ${TXT.small} text-center border-2 active:scale-95 transition-all`} style={{ borderColor: t.primary, color: t.primary }}>
                    Asistencia y avisos
                  </Link>
                </div>
                {verQr === h.token && (
                  <div className="mt-4 flex flex-col items-center">
                    <div className="p-3 bg-white rounded-2xl border" style={{ borderColor: `${t.outlineVariant}80` }}>
                      <QRCodeSVG value={h.token} size={200} level="M" />
                    </div>
                    <p className={`${TXT.micro} mt-2 text-center`} style={{ color: t.onSurfaceVariant }}>Muéstraselo al profesor al entrar a clase</p>
                  </div>
                )}
              </div>
            ))}
            {formVincular}
          </>
        )}

        <Link
          href={demo ? '#' : `/academia/asistencia/${slug}`}
          className="p-4 rounded-2xl flex items-center gap-3 active:scale-[0.98] transition-all"
          style={{ background: t.secondaryContainer }}
        >
          <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.secondary }}>qr_code_scanner</span>
          <span className="min-w-0 flex-1">
            <span className={`block ${TXT.body} font-extrabold`} style={{ color: t.secondary }}>Soy profesor</span>
            <span className={`block ${TXT.small}`} style={{ color: t.onSurfaceVariant }}>Tomar asistencia escaneando los carnets</span>
          </span>
          <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.onSurfaceVariant }}>chevron_right</span>
        </Link>
      </div>
    </div>
  );
}
