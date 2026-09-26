'use client';

// Ciudad del usuario — una sola fuente, un solo selector (el de la barra de
// arriba, <CitySwitcher/>):
//   • useCiudad()        — hook: ciudad guardada + detección por GPS
//   • <CitySwitcher/>     — el "Entregar en <ciudad>" del AppHeader, ahora con
//                           dropdown (lista + "usar mi ubicación")
//   • <MarketCityBanner/> — el aviso arriba del Market cuando BogaHub todavía no
//                           opera en la ciudad elegida (NO tiene selector propio:
//                           la ciudad se cambia desde el header)
//
// Ver src/lib/ciudades.ts (qué ciudades hay / cuáles están activas) y
// src/lib/geo.ts (cómo se detecta la ciudad por GPS).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CIUDADES,
  CIUDADES_ACTIVAS,
  ciudadPorSlug,
  esCiudadActiva,
  guardarCiudad,
  leerCiudadGuardada,
  type Ciudad,
} from '@/lib/ciudades';
import { detectarCiudad } from '@/lib/geo';

// ── Hook ────────────────────────────────────────────────────────────────────
export function useCiudad() {
  const [slug, setSlug] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [detectando, setDetectando] = useState(false);
  const [avisoGeo, setAvisoGeo] = useState<string | null>(null);

  const cerrarAviso = useCallback(() => setAvisoGeo(null), []);

  const elegir = useCallback((s: string) => {
    setSlug(s || null);
    guardarCiudad(s);
    setAvisoGeo(null);
  }, []);

  // `silencioso`: si es true no muestra el globo de error. Hoy el intento automático de la primera visita SÍ lo muestra
  // (se dejó el globo y se quitó la tarjeta «Elige tu ciudad» del Market para que no salgan los dos avisos).
  const detectarConAviso = useCallback(async (silencioso: boolean) => {
    setDetectando(true);
    setAvisoGeo(null);
    const r = await detectarCiudad();
    setDetectando(false);
    if (r.ok) {
      if (r.slug) {
        elegir(r.slug);
      } else if (!silencioso) {
        setAvisoGeo(
          r.nombreCrudo
            ? `Detectamos "${r.nombreCrudo}". Elígela de la lista.`
            : 'No pudimos ubicar tu ciudad. Elígela de la lista.',
        );
      }
      return;
    }
    // Mensajes concisos que se adaptan a la pantalla móvil
    const mensajes: Record<string, string> = {
      'permiso-denegado':
        'Ubicación bloqueada en tu navegador. Toca el candado para permitir o elige tu ciudad en la lista.',
      'no-disponible':
        'GPS no disponible en este dispositivo. Elige tu ciudad en la lista.',
      timeout:
        'La ubicación tardó demasiado. Elige tu ciudad en la lista.',
    };
    if (!silencioso) setAvisoGeo(mensajes[r.motivo] ?? 'No pudimos obtener tu ubicación. Elige tu ciudad de la lista.');
  }, [elegir]);

  const detectar = useCallback(() => detectarConAviso(false), [detectarConAviso]);

  // Primera visita (sin ciudad guardada): intenta detectar sola por GPS en vez
  // de obligar a elegir a mano. Si el navegador niega el permiso o falla, el
  // usuario simplemente ve "Elige tu ciudad" como antes.
  useEffect(() => {
    const guardada = leerCiudadGuardada();
    setSlug(guardada);
    setListo(true);
    if (!guardada) detectarConAviso(false);

    const onCambio = (e: Event) => setSlug((e as CustomEvent<string>).detail || null);
    window.addEventListener('boga:ciudad', onCambio);
    return () => window.removeEventListener('boga:ciudad', onCambio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    slug,
    ciudad: ciudadPorSlug(slug) ?? null,
    activa: esCiudadActiva(slug),
    listo,
    detectando,
    avisoGeo,
    cerrarAviso,
    elegir,
    detectar,
  };
}

// ── Selector del header ─────────────────────────────────────────────────────
// Reemplaza el "Entregar en <dirección>" hardcodeado del AppHeader. Muestra la
// ciudad elegida y, al tocar, abre un panel con la lista + "usar mi ubicación".
export function CitySwitcher({ variant }: { variant: 'mobile' | 'desktop' }) {
  const { slug, ciudad, listo, detectando, avisoGeo, cerrarAviso, elegir, detectar } = useCiudad();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // El globo se quita solo a los 6 s: si se queda, tapa las pestañas del Market (Explorar, Tiendas, Servicios).
  useEffect(() => {
    if (!avisoGeo) return;
    const t = setTimeout(cerrarAviso, 6000);
    return () => clearTimeout(t);
  }, [avisoGeo, cerrarAviso]);

  useEffect(() => {
    if (!abierto) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [abierto]);

  const etiqueta = !listo
    ? '…'
    : ciudad
      ? ciudad.nombre
      : 'Elige tu ciudad';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          if (!abierto) cerrarAviso();
        }}
        className={
          variant === 'mobile'
            ? 'flex items-center gap-2 min-w-0 flex-1 pr-2 text-left'
            : 'flex items-center gap-1.5 text-secondary group cursor-pointer'
        }
      >
        <span
          className="material-symbols-outlined text-primary text-[20px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          location_on
        </span>
        {variant === 'mobile' ? (
          <span className="flex flex-col min-w-0">
            <span className="font-label-md text-label-md text-secondary leading-none mb-0.5">
              Tu ciudad
            </span>
            <span className="flex items-center gap-1">
              <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                {etiqueta}
              </span>
              <span className="material-symbols-outlined text-sm text-secondary">expand_more</span>
            </span>
          </span>
        ) : (
          <>
            <span className="font-label-md text-label-md group-hover:text-primary transition-colors">
              {etiqueta}
            </span>
            <span className="material-symbols-outlined text-sm text-secondary group-hover:text-primary transition-colors">
              expand_more
            </span>
          </>
        )}
      </button>

      {/* Aviso adaptativo si falló la detección: no desborda la pantalla y se puede cerrar */}
      {!abierto && avisoGeo && (
        <div className="absolute left-0 top-full mt-2 z-[70] w-[min(calc(100vw-32px),320px)] bg-white/95 backdrop-blur-md border border-surface-container-highest shadow-[0_10px_25px_rgba(0,0,0,0.12)] rounded-2xl p-2.5 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <span
            className="material-symbols-outlined text-[17px] text-amber-600 shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            location_off
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-on-surface font-body-md leading-snug whitespace-normal break-words">
              {avisoGeo}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cerrarAviso();
            }}
            aria-label="Cerrar aviso"
            className="w-5 h-5 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary/60 hover:text-secondary shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {abierto && (
        <div className="absolute left-0 top-full mt-2 z-[60] w-[280px] rounded-2xl border border-surface-container-highest bg-surface shadow-[0_20px_40px_rgba(0,0,0,0.12)] p-2">
          <button
            type="button"
            onClick={detectar}
            disabled={detectando}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">
              {detectando ? 'progress_activity' : 'my_location'}
            </span>
            {detectando ? 'Ubicando…' : 'Usar mi ubicación'}
          </button>

          {avisoGeo && (
            <div className="mx-2 my-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-amber-700 shrink-0 mt-0.5">info</span>
              <p className="text-[11px] text-amber-900 font-body-md leading-tight whitespace-normal break-words">{avisoGeo}</p>
            </div>
          )}

          <div className="my-1 border-t border-surface-container-highest" />

          <div className="max-h-[260px] overflow-y-auto">
            {CIUDADES.map((c) => {
              const activa = CIUDADES_ACTIVAS.includes(c.slug);
              const sel = c.slug === slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    elegir(c.slug);
                    setAbierto(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    sel ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{c.nombre}</span>
                    <span className="text-xs text-secondary font-normal truncate">{c.region}</span>
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      activa
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-container-high text-secondary'
                    }`}
                  >
                    {activa ? 'Disponible' : 'Pronto'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formulario de "avísame" ─────────────────────────────────────────────────
function WaitlistForm({
  ciudad,
  role,
  source,
}: {
  ciudad: Ciudad;
  role: 'comprador' | 'negocio';
  source: string;
}) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    const { error: err } = await supabase.from('city_interest').insert({
      city: ciudad.slug,
      region: ciudad.region,
      role,
      email: email || null,
      source,
    });
    setEnviando(false);
    if (err) {
      setError('No se pudo enviar. Intenta de nuevo en un momento.');
      return;
    }
    setOk(true);
  };

  if (ok) {
    return (
      <p className="text-sm text-on-surface font-body-md flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
        Listo. Te escribimos apenas BogaHub llegue a {ciudad.nombre}.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        className="flex-1 bg-surface-container-lowest border border-surface-container-highest rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={enviando}
        className="shrink-0 bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {enviando ? 'Enviando…' : 'Avísame'}
      </button>
      {error && <p className="text-xs text-primary font-body-md sm:w-full">{error}</p>}
    </form>
  );
}

// ── Banner del Market ───────────────────────────────────────────────────────
// Arriba de /market. Reacciona a la ciudad elegida en el header:
//   • ciudad activa       → no renderiza nada
//   • sin ciudad elegida  → no renderiza nada (ya avisa el globo de ubicación del header)
//   • ciudad no activa    → lista de espera (el catálogo se sigue viendo)
export function MarketCityBanner({
  role = 'comprador',
  source = 'market',
}: {
  role?: 'comprador' | 'negocio';
  source?: string;
}) {
  const { slug, ciudad, activa, listo } = useCiudad();
  const [cerrado, setCerrado] = useState(false);

  if (!listo || activa || cerrado) return null;
  // Sin ciudad elegida: el globo del header ya lo pide; la tarjeta repetía el mismo aviso.
  if (!slug || !ciudad) return null;

  return (
    <div className="mx-container-margin lg:mx-6 mt-4 rounded-2xl border border-surface-container-highest bg-surface-container-lowest overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 pr-16 lg:pr-0">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            distance
          </span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">
            {ciudad
              ? `Boga Market todavía no llega a ${ciudad.nombre}`
              : 'Elige tu ciudad'}
          </h3>
        </div>

        {!slug || !ciudad ? (
          <p className="text-sm text-secondary font-body-md">
            Toca <b>&ldquo;Elige tu ciudad&rdquo;</b> arriba para ver si Boga Market ya está
            disponible donde estás.
          </p>
        ) : (
          <>
            <p className="text-sm text-secondary font-body-md">
              Estás viendo tiendas de otras zonas. Déjanos tu correo y te avisamos apenas
              abramos en {ciudad.nombre} — mientras más gente se anote, antes llegamos.
            </p>
            <WaitlistForm ciudad={ciudad} role={role} source={source} />
          </>
        )}

        <button
          onClick={() => setCerrado(true)}
          className="self-start text-xs text-secondary hover:text-on-surface underline underline-offset-2"
        >
          Ocultar por ahora
        </button>
      </div>
    </div>
  );
}
