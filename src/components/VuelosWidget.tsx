'use client';

import React, { useEffect, useRef } from 'react';

interface VuelosWidgetProps {
  primaryColor?: string; // Sin '#', ej: 'B8130E'
}

export default function VuelosWidget({ primaryColor = 'B8130E' }: VuelosWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Limpiar contenido previo para evitar duplicados en re-render
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
    <div className="w-full bg-white rounded-2xl border border-surface-container-highest p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">flight_takeoff</span>
          <h3 className="font-headline-sm text-sm sm:text-base text-on-surface font-bold">
            Vuelos en tiempo real desde Pucallpa (S/)
          </h3>
        </div>
        <span className="text-[10px] font-label-md bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold">
          Precios en Soles (PEN)
        </span>
      </div>
      <div ref={containerRef} className="tp-flight-widget w-full min-h-[140px]" />
    </div>
  );
}
