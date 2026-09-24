// Buscador de vuelos desde Pucallpa, en su propia página (/viajes/vuelos).
// Antes el buscador de Kiwi vivía dentro de /viajes y la volvía muy larga; ahora
// /viajes solo enlaza acá. Server Component: el buscador (VuelosWidget) es el
// único trozo de cliente.

import React from 'react';
import AppHeader from '@/components/AppHeader';
import ViajesCabecera from '@/components/ViajesCabecera';
import VuelosWidget from '@/components/VuelosWidget';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

const PASOS = [
  { icon: 'edit_location_alt', titulo: 'Elige tu ruta', texto: 'Pucallpa ya viene como origen. Escribe tu destino, o deja el campo libre para ver las opciones más baratas.' },
  { icon: 'event', titulo: 'Juega con las fechas', texto: 'Deja la salida en "Cualquier momento" para ver los días más económicos.' },
  { icon: 'sync_alt', titulo: '¿Ida y vuelta?', texto: 'El buscador empieza en "Solo ida". Cambia esa opción arriba a "Ida y vuelta" para poner la fecha de regreso.' },
  { icon: 'verified_user', titulo: 'Reserva con confianza', texto: 'Compara precios en soles y termina la compra en Kiwi.com, que es quien vende el pasaje.' },
];

export default function VuelosPage() {
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BogaHub', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Viajes', item: `${SITE_URL}/viajes` },
      { '@type': 'ListItem', position: 3, name: 'Vuelos', item: `${SITE_URL}/viajes/vuelos` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <AppHeader />

      <main className="max-w-[1200px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-14">
        <ViajesCabecera
          activo="aereo"
          titulo="Vuelos desde Pucallpa"
          subtitulo="Compara tarifas a Lima, Iquitos, Tarapoto y más desde el aeropuerto de Pucallpa (PCL), en soles."
        />

        <div className="w-full max-w-[900px] mx-auto"><VuelosWidget primaryColor="B8130E" /></div>

        {/* Cómo usarlo */}
        <section className="w-full max-w-[900px] mx-auto flex flex-col gap-3">
          <h2 className="font-headline-sm text-base text-on-surface">Cómo sacar tu pasaje</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PASOS.map((p) => (
              <div key={p.titulo} className="bg-white rounded-2xl border border-surface-container-highest p-4 flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[22px]">{p.icon}</span>
                </span>
                <div className="min-w-0">
                  <h3 className="font-headline-sm text-sm text-on-surface leading-tight">{p.titulo}</h3>
                  <p className="font-body-md text-xs text-secondary leading-relaxed mt-1">{p.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-secondary/70 font-body-md text-[11px] text-center">
          BogaHub no vende pasajes: las tarifas las ofrece Kiwi.com. Si reservas ahí, BogaHub puede recibir una comisión, sin costo extra para ti.
          Los precios cambian en tiempo real; confírmalos antes de pagar.
        </p>
      </main>
    </>
  );
}
