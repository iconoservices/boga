'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Carrusel de banners con puntos (y avance solo cada 5 s). Un solo banner no lleva puntos ni avanza. */
export default function BannerSlider({ slides }: { slides: { key: string; contenido: React.ReactNode }[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState(0);
  const pausa = useRef(false);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      const el = pista.current;
      if (!el || pausa.current) return;
      const siguiente = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length;
      el.scrollTo({ left: siguiente * el.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <div className="relative">
      <div
        ref={pista}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        onScroll={(e) => setActivo(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onPointerDown={() => { pausa.current = true; }}
        onPointerUp={() => { pausa.current = false; }}
        onMouseEnter={() => { pausa.current = true; }}
        onMouseLeave={() => { pausa.current = false; }}
      >
        {slides.map((sl) => (
          <div key={sl.key} className="w-full shrink-0 snap-center">{sl.contenido}</div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {slides.map((sl, i) => (
            <span key={sl.key} className="h-1.5 rounded-full transition-all" style={{ width: i === activo ? 18 : 6, background: i === activo ? '#fff' : 'rgba(255,255,255,0.55)', boxShadow: '0 0 2px rgba(0,0,0,0.5)' }} />
          ))}
        </div>
      )}
    </div>
  );
}
