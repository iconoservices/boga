"use client";

import React from 'react';
import Link from 'next/link';

// Servicios de BogaHub: profesionales y locales que no venden productos con carrito (abogados, salud,
// gimnasios, belleza…). Cada uno es una tienda con ficha, WhatsApp y horario, igual que en el Market.
// Vive dentro de "Tiendas y servicios" (/explore, selector Productos | Servicios). Todavía sin listado:
// cuando existan negocios de servicios se leerán del mismo catálogo cacheado, filtrando por una marca
// "producto o servicio" que se agregaría a cada tienda (todavía no existe).

const RUBROS = [
  { icon: 'gavel', nombre: 'Abogados y trámites', desc: 'Consultas legales, notarías y gestiones.' },
  { icon: 'medical_services', nombre: 'Salud y clínicas', desc: 'Consultorios, odontólogos y laboratorios.' },
  { icon: 'fitness_center', nombre: 'Gimnasios y deporte', desc: 'Planes, clases y entrenadores.' },
  { icon: 'spa', nombre: 'Belleza y bienestar', desc: 'Salones, barberías, spa y uñas.' },
  { icon: 'school', nombre: 'Educación', desc: 'Academias, idiomas y clases particulares.' },
  { icon: 'engineering', nombre: 'Técnicos y oficios', desc: 'Reparaciones, instalaciones y mantenimiento.' },
];

export default function ServiciosContenido() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-primary">Próximamente</span>
        <h1 className="font-headline-lg text-3xl md:text-4xl font-extrabold tracking-tight">Servicios en Pucallpa</h1>
        <p className="text-secondary font-body-md max-w-[560px]">
          Profesionales y locales de tu ciudad en un solo lugar: los encuentras por rubro, ves su ficha con horario y
          ubicación, y les escribes directo por WhatsApp.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RUBROS.map((r) => (
          <div key={r.nombre} className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5 flex flex-col gap-2">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">{r.icon}</span>
            </div>
            <h2 className="font-headline-sm text-base font-bold">{r.nombre}</h2>
            <p className="text-secondary text-sm leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </section>

      <section className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-headline-sm text-lg font-extrabold">¿Ofreces un servicio?</h2>
          <p className="text-secondary text-sm mt-1">
            Registra tu negocio y entra desde el inicio: tu propia página con tu WhatsApp, y apareces en BogaHub Pucallpa.
          </p>
        </div>
        <Link href="/negocios/registro?i=tienda" className="bg-primary text-on-primary font-bold text-sm px-6 py-3 rounded-full text-center hover:opacity-90 transition-opacity">
          Registrar mi negocio
        </Link>
      </section>
    </div>
  );
}
