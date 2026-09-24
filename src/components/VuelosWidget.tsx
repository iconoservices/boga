'use client';

import React, { useEffect, useRef } from 'react';

interface VuelosWidgetProps {
  primaryColor?: string; // Sin '#', ej: 'B8130E'
  kiwiUrl?: string;
}

export default function VuelosWidget({
  primaryColor = 'B8130E',
  kiwiUrl = 'https://kiwi.tpo.lv/QQudEv2V',
}: VuelosWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    script.charset = 'utf-8';
    script.src = `https://tpemd.com/content?currency=pen&trs=577562&shmarker=781488&from_name=pucallpa_pe&locale=es&powered_by=true&limit=4&primary_color=${primaryColor}&results_background_color=FFFFFF&form_background_color=FFFFFF&campaign_id=111&promo_id=3411`;

    el.appendChild(script);

    return () => {
      if (el) el.innerHTML = '';
    };
  }, [primaryColor]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-surface-container-highest shadow-md flex flex-col">
      {/* Cabecera integrada: Rojo Boga + Acentos de Viaje */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#8a0d09] via-[#B8130E] to-[#d6281e] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
            <span className="material-symbols-outlined text-[26px] text-white">flight_takeoff</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                Aeropuerto Pucallpa (PCL)
              </span>
              <span className="bg-black/20 text-white/90 text-[10px] font-label-md px-2 py-0.5 rounded-full">
                Precios en Soles (PEN)
              </span>
            </div>
            <h3 className="font-headline-sm text-base sm:text-lg font-bold leading-tight mt-1 text-white">
              Vuelos y pasajes baratos desde Pucallpa
            </h3>
            <p className="text-white/80 font-body-md text-xs mt-0.5">
              Compara tarifas a Lima, Iquitos, Tarapoto y conexiones mundiales con la garantía de <strong>Kiwi.com</strong>.
            </p>
          </div>
        </div>

        {kiwiUrl && (
          <a
            href={kiwiUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="shrink-0 bg-white hover:bg-red-50 text-[#B8130E] font-label-md text-xs sm:text-sm font-bold px-4 py-2.5 rounded-full flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <span>Buscar en Kiwi.com</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        )}
      </div>

      {/* Contenedor del Widget Interactivo de Vuelos */}
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <div ref={containerRef} className="tp-flight-widget w-full min-h-[140px]" />

        {/* Píldoras de beneficios combinados */}
        <div className="pt-3 border-t border-surface-container flex items-center justify-between flex-wrap gap-2 text-[11px] text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[15px]">verified</span>
            <span>Tarifas actualizadas en vivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[15px]">savings</span>
            <span>Garantía de mejores precios</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[15px]">airplane_ticket</span>
            <span>LATAM, Sky, Star Perú y más</span>
          </div>
        </div>
      </div>
    </div>
  );
}
