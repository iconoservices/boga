"use client";

import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { fetchChamba, haceCuanto, fechaAviso, slugEmpleo } from '@/lib/chamba';

// Servicios = tablero local de trabajo, oficios y empleos. Por ahora es un DIRECTORIO curado a mano
// (sin tabla en Supabase todavía): gente que ofrece su oficio y avisos de
// trabajo de negocios de la zona. El contacto sale por WhatsApp directo.

type Vista = 'servicios' | 'empleos';

// Discreto a propósito: una línea de texto (sin caja ni fondo) al pie de cada aviso, no una
// tarjeta de alerta que compita visualmente con el puesto o el botón de postular.
function AvisoSeguridadEmpleo() {
  return (
    <p className="flex items-center gap-1 text-[10px] font-label-md text-red-600/80">
      <span className="material-symbols-outlined text-[12px]">error</span>
      BogaHub solo indexa este aviso, no es el empleador. Ninguna empresa seria te pedirá dinero por examen médico, uniforme o capacitación.
    </p>
  );
}

// Descripción / requisitos de un empleo: 3 líneas y "Ver más" para desplegar.
// Cuadrito de color de cada aviso en móvil: un color estable por aviso, para que la
// lista se lea de un vistazo (como las tarjetas de las piezas de Boga).
const COLORES_EMPLEO = ['#7C5CFC', '#2DB56B', '#F08A3C', '#1B8EBF', '#E4655A', '#D4A017'];
const colorEmpleo = (id: string) => {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORES_EMPLEO[h % COLORES_EMPLEO.length];
};

// "Subido hoy" -> "Hoy"; "Subido hace 3 días" -> "Hace 3 días" (en móvil sobra el "Subido").
const haceCuantoCorto = (fecha?: string) => {
  const t = haceCuanto(fecha).replace(/^Subido\s+/i, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function DescripcionEmpleo({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const larga = texto.length > 140 || texto.split('\n').length > 3;
  return (
    <div className="mt-2">
      <p className={`text-secondary font-body-md text-xs leading-relaxed whitespace-pre-line ${abierta ? '' : 'line-clamp-3'}`}>{texto}</p>
      {larga && (
        <button type="button" onClick={() => setAbierta((v) => !v)} className="text-primary font-label-md text-[11px] mt-0.5">
          {abierta ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export default function Servicios() {
  const { cartCount, setIsCartOpen } = useCart();
  // Arranca en "Empleos": los avisos de trabajo tienen más demanda que el
  // directorio de oficios.
  const [vista, setVista] = useState<Vista>('empleos');

  // Datos reales de /api/chamba (sin ejemplos: si no hay nada cargado, se avisa).
  const [servicios, setServicios] = useState<any[]>([]);
  const [empleos, setEmpleos] = useState<any[]>([]);
  const [cargado, setCargado] = useState(false);
  // Visor: la imagen del aviso se abre grande aquí mismo (no en otra página).
  const [visor, setVisor] = useState<any | null>(null);
  // Tarjetas de empleo desplegadas en móvil (por defecto van compactas).
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!visor) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && setVisor(null);
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [visor]);
  useEffect(() => {
    fetchChamba().then(({ empleos: e, oficios: o }) => {
      setServicios(o);
      setEmpleos(e);
      setCargado(true);
    });
  }, []);

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-12">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">Trabajos y oficios</h1>
          <p className="font-body-md text-secondary text-xs">Trabajo y gente de confianza en Pucallpa.</p>
        </div>

        {/* CTAs — compactos, arriba y en una sola fila. "Gana dinero" va primero y marcado
            como Próximamente: hoy solo capta interés por WhatsApp. El sistema completo
            (?ref=, columna referido_por, panel) está en memoria: afiliados.md. */}
        <div className="grid grid-cols-2 gap-2.5 -mt-2 sm:max-w-[460px]">
          <a
            href={waLink('51961000000', 'Hola BogaHub, quiero que me avisen cuando esté listo "Gana dinero con BogaHub" (recomendar negocios y choferes con comisión).')}
            target="_blank"
            rel="noreferrer"
            aria-label="Gana dinero con BogaHub (próximamente)"
            className="rounded-xl bg-primary text-on-primary px-3 py-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
          >
            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
            <span className="flex flex-col min-w-0 leading-tight">
              <span className="font-headline-sm text-[13px] truncate">Gana dinero</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-on-primary/80">Próximamente</span>
            </span>
          </a>
          <a
            href={waLink('51961000000', 'Hola BogaHub, quiero publicar un aviso en Servicios de BogaHub (servicio / empleo).')}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-inverse-surface text-inverse-on-surface px-3 py-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
          >
            <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-inverse-primary text-[18px]">campaign</span>
            </span>
            <span className="flex flex-col min-w-0 leading-tight">
              <span className="font-headline-sm text-[13px] truncate">Publica tu aviso</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-inverse-on-surface/70">Gratis</span>
            </span>
          </a>
        </div>

        {/* Conmutador de vista */}
        <div className="flex gap-2">
          {([['empleos', 'Empleos', 'work'], ['servicios', 'Oficios', 'construction']] as const).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setVista(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md transition-all shadow-sm active:scale-95 ${
                vista === id
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Directorio de servicios */}
        {vista === 'servicios' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cargado && servicios.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-dashed border-surface-container-highest p-8 text-center">
                <span className="material-symbols-outlined text-secondary/40 text-[32px]">construction</span>
                <p className="font-headline-sm text-sm text-on-surface mt-2">Todavía no hay oficios publicados</p>
                <p className="text-secondary font-body-md text-xs mt-1">Publica el tuyo gratis con el botón «Publica tu aviso gratis» de abajo.</p>
              </div>
            )}
            {servicios.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl p-4 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
                    {s.img ? (
                      <img src={s.img} alt={s.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-secondary/40"><span className="material-symbols-outlined text-[24px]">construction</span></div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{s.nombre}</span>
                    <span className="text-secondary font-label-md text-[11px] line-clamp-1">{s.oficio}</span>
                    {s.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-[11px] font-label-md text-secondary">{s.rating} <span className="opacity-60">· {s.trabajos} trabajos</span></span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-surface-container pt-3">
                  <span className="text-[11px] font-label-md text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>{s.zona}
                  </span>
                  <a
                    href={waLink(s.wsp, `Hola ${s.nombre}, te contacto desde BogaHub por tu servicio de ${s.oficio}.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-[#25D366] text-white text-[12px] font-label-md px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                    Contactar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Avisos de empleo */}
        {vista === 'empleos' && (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
            {cargado && empleos.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-dashed border-surface-container-highest p-8 text-center">
                <span className="material-symbols-outlined text-secondary/40 text-[32px]">work</span>
                <p className="font-headline-sm text-sm text-on-surface mt-2">Todavía no hay avisos de empleo</p>
                <p className="text-secondary font-body-md text-xs mt-1">Publica el tuyo gratis con el botón «Publica tu aviso gratis» de abajo.</p>
              </div>
            )}
            {empleos.map((e) => (
              <React.Fragment key={e.id}>
              {/* ── Móvil: tarjeta compacta (cuadrito de color, puesto, zona, flecha); toca para desplegar ── */}
              <div className="sm:hidden bg-white rounded-2xl shadow-[0_10px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {e.img ? (
                    <button
                      type="button"
                      onClick={() => setVisor(e)}
                      aria-label={`Ver imagen del aviso de ${e.puesto} en grande`}
                      className="shrink-0 active:scale-95 transition-transform"
                    >
                      <img
                        src={e.img}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-24 h-16 rounded-lg object-cover object-top border border-surface-container-highest bg-surface-container-low"
                      />
                    </button>
                  ) : (
                    <span className="w-24 h-16 rounded-lg flex items-center justify-center shrink-0" style={{ background: colorEmpleo(e.id) }}>
                      <span className="material-symbols-outlined text-white text-[22px]">work</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAbiertos((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                    aria-expanded={!!abiertos[e.id]}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left"
                  >
                    <span className="flex flex-col min-w-0 flex-1">
                      <h2 className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{e.puesto}</h2>
                      <span className="text-secondary font-body-md text-xs line-clamp-1 mt-0.5">{[e.negocio, e.zona].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className={`material-symbols-outlined text-secondary/60 shrink-0 transition-transform duration-200 ${abiertos[e.id] ? 'rotate-90' : ''}`}>chevron_right</span>
                  </button>
                </div>

                {abiertos[e.id] && (
                  <div className="px-3 pb-3 pt-1 flex flex-col gap-3 border-t border-surface-container-high">
                    {/* Todos los elementos de esta fila miden lo mismo (h-7, texto 11px) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      <span className="h-7 inline-flex items-center bg-surface-container-low text-secondary text-[11px] font-label-md px-2.5 rounded-full border border-surface-container-highest">{e.tipo}</span>
                      <span className="h-7 inline-flex items-center bg-primary-fixed text-primary text-[11px] font-label-md px-2.5 rounded-full">{e.pago}</span>
                      {haceCuanto(e.subido) && (
                        <span className="h-7 inline-flex items-center gap-1 bg-surface-container-low text-secondary text-[11px] font-label-md px-2.5 rounded-full border border-surface-container-highest">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>{haceCuantoCorto(e.subido)}
                        </span>
                      )}
                      {/* La acción principal va al costado, en la misma fila */}
                      {(e.link || e.wsp) && (
                        <a
                          href={e.link || waLink(e.wsp, `Hola, vi el aviso de "${e.puesto}" en ${e.negocio} por BogaHub. Me interesa postular.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto h-7 inline-flex items-center justify-center gap-1 bg-primary text-white text-[11px] font-label-md px-3 rounded-full active:scale-95 transition-transform"
                        >
                          {e.link ? 'Ver aviso' : 'Postular'}
                          <span className="material-symbols-outlined text-[14px]">{e.link ? 'open_in_new' : 'arrow_forward'}</span>
                        </a>
                      )}
                    </div>
                    {e.descripcion && <DescripcionEmpleo texto={e.descripcion} />}
                    <Link href={`/trabajos/${slugEmpleo(e)}`} className="self-start text-[11px] font-label-md text-primary underline">
                      Ver ficha completa
                    </Link>
                    <AvisoSeguridadEmpleo />
                    <div className="flex gap-2">
                      {e.email && (
                        <a
                          href={`mailto:${e.email}?subject=${encodeURIComponent(`Postulación: ${e.puesto}`)}`}
                          className="flex items-center justify-center gap-1.5 bg-primary-fixed text-primary text-[13px] font-label-md px-3.5 py-2.5 rounded-full active:scale-95 transition-transform"
                        >
                          <span className="material-symbols-outlined text-[15px]">mail</span>
                          CV
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Desde sm: tarjeta con foto grande y todo a la vista ── */}
              <div className="hidden sm:flex bg-white rounded-2xl p-4 shadow-[0_10px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest items-start gap-4">
                {e.img ? (
                  <button
                    type="button"
                    onClick={() => setVisor(e)}
                    aria-label={`Ver imagen del aviso de ${e.puesto} en grande`}
                    className="group relative w-36 h-24 rounded-xl overflow-hidden bg-surface-container-low shrink-0 border border-surface-container-highest active:scale-95 transition-transform"
                  >
                    <img src={e.img} alt={e.puesto} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover object-top" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <span className="material-symbols-outlined text-white text-[26px] opacity-0 group-hover:opacity-100 transition-opacity">zoom_in</span>
                    </span>
                  </button>
                ) : (
                  <div className="w-36 h-24 rounded-xl flex items-center justify-center shrink-0" style={{ background: colorEmpleo(e.id) }}>
                    <span className="material-symbols-outlined text-white text-[30px]">work</span>
                  </div>
                )}

                <div className="flex flex-col min-w-0 flex-1 gap-2">
                  <div className="flex flex-col min-w-0">
                    <h2 className="font-headline-sm text-base text-on-surface leading-tight line-clamp-2">{e.puesto}</h2>
                    <span className="text-secondary font-body-md text-xs line-clamp-1 mt-0.5">{[e.negocio, e.zona].filter(Boolean).join(' · ')}</span>
                  </div>

                  {/* Todos los elementos de esta fila miden lo mismo (h-7, texto 11px) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="h-7 inline-flex items-center bg-surface-container-low text-secondary text-[11px] font-label-md px-2.5 rounded-full border border-surface-container-highest">{e.tipo}</span>
                    <span className="h-7 inline-flex items-center bg-primary-fixed text-primary text-[11px] font-label-md px-2.5 rounded-full">{e.pago}</span>
                    {haceCuanto(e.subido) && (
                      <span className="h-7 inline-flex items-center gap-1 bg-surface-container-low text-secondary text-[11px] font-label-md px-2.5 rounded-full border border-surface-container-highest">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>{haceCuantoCorto(e.subido)}
                      </span>
                    )}
                    {fechaAviso(e.publicado) && (
                      <span className="h-7 inline-flex items-center gap-1 bg-surface-container-low text-secondary text-[11px] font-label-md px-2.5 rounded-full border border-surface-container-highest">
                        <span className="material-symbols-outlined text-[14px]">event</span>{fechaAviso(e.publicado)}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1.5">
                      {e.email && (
                        <a
                          href={`mailto:${e.email}?subject=${encodeURIComponent(`Postulación: ${e.puesto}`)}`}
                          className="h-7 inline-flex items-center gap-1 bg-primary-fixed text-primary text-[11px] font-label-md px-3 rounded-full active:scale-95 transition-transform"
                        >
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          Enviar CV
                        </a>
                      )}
                      {(e.link || e.wsp) && (
                        <a
                          href={e.link || waLink(e.wsp, `Hola, vi el aviso de "${e.puesto}" en ${e.negocio} por BogaHub. Me interesa postular.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 inline-flex items-center justify-center gap-1 bg-primary text-white text-[11px] font-label-md px-3.5 rounded-full active:scale-95 transition-transform"
                        >
                          {e.link ? 'Ver aviso' : 'Postular'}
                          <span className="material-symbols-outlined text-[14px]">{e.link ? 'open_in_new' : 'arrow_forward'}</span>
                        </a>
                      )}
                    </span>
                  </div>

                  {e.descripcion && <DescripcionEmpleo texto={e.descripcion} />}
                  <Link href={`/trabajos/${slugEmpleo(e)}`} className="self-start text-[11px] font-label-md text-primary underline">
                    Ver ficha completa
                  </Link>
                  <AvisoSeguridadEmpleo />
                </div>
              </div>
              </React.Fragment>
            ))}
          </div>
        )}

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          BogaHub conecta, pero no es empleador ni responsable de los acuerdos. Verifica siempre con quién tratas.
        </p>

        {/* Visor de la imagen del aviso */}
        {visor && (
          <div className="fixed inset-0 z-[80] bg-black/85 flex flex-col items-center justify-center p-3 sm:p-6" onClick={() => setVisor(null)} role="dialog" aria-modal="true" aria-label={`Aviso de ${visor.puesto}`}>
            <button type="button" aria-label="Cerrar" onClick={() => setVisor(null)} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 active:scale-90 transition">
              <span className="material-symbols-outlined">close</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={visor.img} alt={visor.puesto} referrerPolicy="no-referrer" onClick={(ev) => ev.stopPropagation()} className="max-w-full max-h-[76dvh] object-contain rounded-xl shadow-2xl" />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2" onClick={(ev) => ev.stopPropagation()}>
              <p className="w-full text-center text-white/85 font-headline-sm text-sm">{visor.puesto}{visor.negocio ? ` · ${visor.negocio}` : ''}</p>
              {(visor.link || visor.wsp) && (
                <a
                  href={visor.link || waLink(visor.wsp, `Hola, vi el aviso de "${visor.puesto}" en ${visor.negocio} por BogaHub. Me interesa postular.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-primary text-white text-[13px] font-label-md px-4 py-2 rounded-full active:scale-95 transition-transform"
                >
                  {visor.link ? 'Ver aviso en la web' : 'Postular por WhatsApp'}
                  <span className="material-symbols-outlined text-[16px]">{visor.link ? 'open_in_new' : 'arrow_forward'}</span>
                </a>
              )}
              {visor.email && (
                <a href={`mailto:${visor.email}?subject=${encodeURIComponent(`Postulación: ${visor.puesto}`)}`} className="flex items-center gap-1.5 bg-white text-primary text-[13px] font-label-md px-4 py-2 rounded-full active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-[16px]">mail</span>Enviar CV
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
