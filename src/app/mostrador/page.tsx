// El Mostrador de BogaHub: una tienda de productos digitales (como una app store,
// pero para negocios y personas). Es una ruta APARTE de /negocios: /negocios es la
// landing B2B de lo que ya ofrece BogaHub (tienda propia + Market); acá se muestran
// productos digitales nuevos, uno por rubro. Todo "Próximamente" hasta que exista.

import type { Metadata } from 'next';
import React from 'react';
import AppHeader from '@/components/AppHeader';

export const metadata: Metadata = {
  title: 'Mostrador · Productos digitales',
  description: 'Invitaciones digitales, carné de vacunación para mascotas, app para boticas y más: productos digitales listos para usar.',
};

// `disponible: false` => "Próximamente" (sin botón), para no vender algo que aún no existe.
const PRODUCTOS = [
  { icon: 'favorite',   para: 'Bodas y eventos',         title: 'Invitaciones digitales de boda', disponible: false, body: 'Tu invitación con fotos, cuenta regresiva, ubicación en el mapa y confirmación de asistencia por WhatsApp.' },
  { icon: 'pets',       para: 'Veterinarias y mascotas', title: 'App para veterinarias y mascotas', disponible: false, body: 'Tu tienda para vender alimento y accesorios, con el carné de vacunación digital de cada perrito para que sus dueños lo lleven en el celular.' },
  { icon: 'medication', para: 'Boticas',                 title: 'App para boticas',                disponible: false, body: 'Catálogo de productos y pedidos para tu botica, con su propia interfaz pensada para farmacia.' },
];

export default function MostradorPage() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
      <AppHeader />

      <main className="max-w-[1200px] mx-auto px-container-margin pt-10 md:pt-14 pb-16 md:pb-24">
        <section className="text-center max-w-[620px] mx-auto mb-10">
          <span className="font-label-md text-label-md text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">Nuevo</span>
          <h1 className="font-headline-lg text-on-background text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mt-4">
            El Mostrador de <span className="text-primary">BogaHub</span>
          </h1>
          <p className="text-secondary font-body-lg text-base md:text-lg mt-3">
            Como una app store, pero de productos digitales: eliges el que está hecho para lo que necesitas.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTOS.map((p) => (
            <div
              key={p.title}
              className={`bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5 flex flex-col gap-2 ${p.disponible ? '' : 'opacity-75'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">{p.icon}</span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${p.disponible ? 'text-emerald-700 bg-emerald-100' : 'text-secondary bg-surface-container-high'}`}>
                  {p.disponible ? 'Disponible' : 'Próximamente'}
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary mt-1">Para {p.para.toLowerCase()}</p>
              <h2 className="font-headline-sm text-headline-sm text-on-background -mt-1">{p.title}</h2>
              <p className="text-secondary font-body-md text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </section>
      </main>

    </div>
  );
}
