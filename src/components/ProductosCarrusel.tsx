"use client";

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { type ProductoMostrador, plantillasDe, portadaDe } from '@/lib/productos';

interface Props {
  productos: ProductoMostrador[];
  customBanners?: Record<string, string>;
}

export default function ProductosCarrusel({ productos, customBanners = {} }: Props) {
  const pista = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(true);

  const actualizarBotones = () => {
    const el = pista.current;
    if (!el) return;
    setPuedeIzq(el.scrollLeft > 10);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    actualizarBotones();
    const el = pista.current;
    if (!el) return;
    el.addEventListener('scroll', actualizarBotones, { passive: true });
    window.addEventListener('resize', actualizarBotones);
    return () => {
      el.removeEventListener('scroll', actualizarBotones);
      window.removeEventListener('resize', actualizarBotones);
    };
  }, [productos]);

  const mover = (dir: 1 | -1) => {
    pista.current?.scrollBy({ left: dir * 360, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carrusel">
      {/* Botones de navegación (Desktop) */}
      <div className="hidden lg:flex items-center justify-end gap-2 mb-3">
        <button
          type="button"
          aria-label="Anterior"
          disabled={!puedeIzq}
          onClick={() => mover(-1)}
          className={`w-9 h-9 rounded-full border border-surface-container-highest bg-surface-container-lowest text-on-surface flex items-center justify-center transition shadow-sm ${
            !puedeIzq ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:scale-105 active:scale-95'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          disabled={!puedeDer}
          onClick={() => mover(1)}
          className={`w-9 h-9 rounded-full border border-surface-container-highest bg-surface-container-lowest text-on-surface flex items-center justify-center transition shadow-sm ${
            !puedeDer ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:scale-105 active:scale-95'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      {/* Fila única de productos con scroll horizontal fluido y snap */}
      <div
        ref={pista}
        className="flex gap-5 overflow-x-auto hide-scrollbar pb-6 pt-1 snap-x scroll-pl-4 sm:scroll-pl-0 -mx-container-margin px-container-margin sm:mx-0 sm:px-0 scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {productos.map((p) => {
          const portada = customBanners[p.slug] || portadaDe(p);
          const n = plantillasDe(p).length;
          return (
            <Link
              key={p.slug}
              href={`/productos/${p.slug}`}
              className="group w-[290px] sm:w-[340px] md:w-[360px] shrink-0 snap-start bg-surface-container-lowest border border-surface-container-highest rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
            >
              <div className="relative aspect-[16/9] bg-primary/10 overflow-hidden">
                {portada ? (
                  <img
                    src={portada}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[56px] opacity-60">{p.icon}</span>
                  </div>
                )}
                <span
                  className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    p.estado === 'listo' ? 'text-emerald-800 bg-emerald-100' : 'text-secondary bg-white/90'
                  }`}
                >
                  {p.estado === 'listo' ? 'Disponible' : 'Próximamente'}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-1.5 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{p.para}</p>
                <h2 className="font-headline-sm text-headline-sm text-on-background line-clamp-1">{p.titulo}</h2>
                <p className="text-secondary font-body-md text-sm leading-relaxed line-clamp-2">{p.gancho}</p>
                <p className="mt-auto pt-3 text-primary font-label-md text-label-md inline-flex items-center gap-1">
                  {n > 0 ? `Ver ${n} plantilla${n === 1 ? '' : 's'}` : 'Ver más'}
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
