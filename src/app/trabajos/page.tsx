"use client";

import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchChamba, haceCuanto, fechaAviso } from '@/lib/chamba';

// Servicios = tablero local de trabajo, oficios y empleos. Por ahora es un DIRECTORIO curado a mano
// (sin tabla en Supabase todavía): gente que ofrece su oficio y avisos de
// trabajo de negocios de la zona. El contacto sale por WhatsApp directo.

type Vista = 'servicios' | 'empleos';

// Descripción / requisitos de un empleo: 3 líneas y "Ver más" para desplegar.
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
          <div className="flex flex-col gap-3">
            {cargado && empleos.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-dashed border-surface-container-highest p-8 text-center">
                <span className="material-symbols-outlined text-secondary/40 text-[32px]">work</span>
                <p className="font-headline-sm text-sm text-on-surface mt-2">Todavía no hay avisos de empleo</p>
                <p className="text-secondary font-body-md text-xs mt-1">Publica el tuyo gratis con el botón «Publica tu aviso gratis» de abajo.</p>
              </div>
            )}
            {empleos.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl p-4 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex items-start gap-4">
                {e.img ? (
                  <a href={e.img} target="_blank" rel="noopener noreferrer" aria-label={`Ver imagen del aviso de ${e.puesto}`} className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-low shrink-0 border border-surface-container-highest">
                    <img src={e.img} alt={e.puesto} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[20px]">work</span>
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{e.puesto}</span>
                  <span className="text-secondary font-label-md text-[11px] line-clamp-1">{e.negocio} · {e.zona}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="bg-surface-container-low text-secondary text-[10px] font-label-md px-2 py-0.5 rounded-full border border-surface-container-highest">{e.tipo}</span>
                    <span className="bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full">{e.pago}</span>
                  </div>
                  {(haceCuanto(e.subido) || fechaAviso(e.publicado)) && (
                    <div className="text-secondary/70 font-label-md text-[10px] flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                      {haceCuanto(e.subido) && (
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">schedule</span>{haceCuanto(e.subido)}</span>
                      )}
                      {fechaAviso(e.publicado) && (
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">event</span>{fechaAviso(e.publicado)}</span>
                      )}
                    </div>
                  )}
                  {e.descripcion && <DescripcionEmpleo texto={e.descripcion} />}
                </div>
                <div className="shrink-0 flex flex-col gap-1.5 items-stretch">
                  {(e.link || e.wsp) && (
                    <a
                      href={e.link || waLink(e.wsp, `Hola, vi el aviso de "${e.puesto}" en ${e.negocio} por BogaHub. Me interesa postular.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-primary text-white text-[12px] font-label-md px-3 py-2 rounded-full active:scale-95 transition-transform"
                    >
                      {e.link ? 'Ver aviso' : 'Postular'}
                      <span className="material-symbols-outlined text-[16px]">{e.link ? 'open_in_new' : 'arrow_forward'}</span>
                    </a>
                  )}
                  {e.email && (
                    <a
                      href={`mailto:${e.email}?subject=${encodeURIComponent(`Postulación: ${e.puesto}`)}`}
                      className="flex items-center justify-center gap-1.5 bg-primary-fixed text-primary text-[12px] font-label-md px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[15px]">mail</span>
                      Enviar CV
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={waLink('51961000000', 'Hola BogaHub, quiero publicar un aviso en Servicios de BogaHub (servicio / empleo).')}
            target="_blank"
            rel="noreferrer"
            className="relative overflow-hidden rounded-2xl bg-inverse-surface text-inverse-on-surface p-4 flex items-center gap-3 group"
          >
            <div className="absolute -right-8 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-inverse-primary text-[22px]">campaign</span>
            </div>
            <div className="relative flex flex-col min-w-0 flex-1">
              <span className="font-headline-sm text-sm leading-tight">Publica tu aviso gratis</span>
              <span className="text-inverse-on-surface/70 font-body-md text-xs mt-0.5">Ofrece tu oficio o publica un puesto de trabajo</span>
            </div>
            <span className="material-symbols-outlined text-inverse-on-surface/60 shrink-0 group-hover:translate-x-1 transition-transform">chevron_right</span>
          </a>

          {/* Afiliados / referidos — por ahora solo capta interés por WhatsApp.
              El sistema completo (?ref=, columna referido_por, panel) está en
              memoria: afiliados.md. */}
          <a
            href={waLink('51961000000', 'Hola BogaHub, quiero ganar dinero recomendando BogaHub (negocios, choferes). ¿Cómo funciona?')}
            target="_blank"
            rel="noreferrer"
            className="relative overflow-hidden rounded-2xl bg-primary text-on-primary p-4 flex items-center gap-3 group"
          >
            <div className="absolute -right-8 -top-10 w-40 h-40 bg-white/15 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
            <div className="relative flex flex-col min-w-0 flex-1">
              <span className="font-headline-sm text-sm leading-tight">Gana dinero con BogaHub</span>
              <span className="text-on-primary/80 font-body-md text-xs mt-0.5">Recomienda negocios y choferes, gana comisión por cada uno</span>
            </div>
            <span className="material-symbols-outlined text-on-primary/70 shrink-0 group-hover:translate-x-1 transition-transform">chevron_right</span>
          </a>
        </div>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          BogaHub conecta, pero no es empleador ni responsable de los acuerdos. Verifica siempre con quién tratas.
        </p>
      </main>
    </>
  );
}
