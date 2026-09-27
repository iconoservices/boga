"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCatalogo } from '@/lib/catalogo';
import { hrefTienda, esFuera } from '@/lib/tiendaUrl';

// Servicios de BogaHub: profesionales y locales que no venden productos con carrito (abogados, salud,
// gimnasios, belleza…). Cada uno es una tienda con ficha, WhatsApp y horario, igual que en el Market.
// Vive dentro de "Tiendas y servicios" (/explore, selector Productos | Servicios).
//
// Una tienda aparece acá si tiene AL MENOS UN producto marcado "Es un servicio" desde su panel
// (/admin → Productos → editar). No hay curaduría a mano ni una tienda entera "de servicios": una
// misma tienda puede vender productos y servicios a la vez (ej. Sweet Kitty Nails: esmaltes = producto,
// manicura = servicio). Mismo catálogo cacheado que usa el Market (fetchCatalogo), sin pegarle aparte
// a Supabase.

const RUBROS = [
  { icon: 'gavel', nombre: 'Abogados y trámites', desc: 'Consultas legales, notarías y gestiones.' },
  { icon: 'medical_services', nombre: 'Salud y clínicas', desc: 'Consultorios, odontólogos y laboratorios.' },
  { icon: 'fitness_center', nombre: 'Gimnasios y deporte', desc: 'Planes, clases y entrenadores.' },
  { icon: 'spa', nombre: 'Belleza y bienestar', desc: 'Salones, barberías, spa y uñas.' },
  { icon: 'school', nombre: 'Educación', desc: 'Academias, idiomas y clases particulares.' },
  { icon: 'engineering', nombre: 'Técnicos y oficios', desc: 'Reparaciones, instalaciones y mantenimiento.' },
];

interface TiendaServicio {
  slug: string;
  name: string;
  logoImage?: string | null;
  marketplaceCategory: string;
  externalUrl?: string | null;
}

export default function ServiciosContenido() {
  // null = todavía cargando; [] = ya cargó y no hay ninguna.
  const [tiendas, setTiendas] = useState<TiendaServicio[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetchCatalogo().then(({ stores, products }) => {
      if (!vivo) return;
      const slugsConServicio = new Set(
        (products as any[]).filter((p) => p.es_servicio === true).map((p) => p.store),
      );
      setTiendas(
        (stores as any[])
          .filter((s) => slugsConServicio.has(s.slug))
          .map((s) => ({
            slug: s.slug,
            name: s.name,
            logoImage: s.logo_image,
            marketplaceCategory: s.marketplace_category || 'Servicios',
            externalUrl: s.external_url,
          })),
      );
    });
    return () => { vivo = false; };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        {tiendas !== null && tiendas.length === 0 && (
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary">Próximamente</span>
        )}
        <h1 className="font-headline-lg text-3xl md:text-4xl font-extrabold tracking-tight">Servicios en Pucallpa</h1>
        <p className="text-secondary font-body-md max-w-[560px]">
          Profesionales y locales de tu ciudad en un solo lugar: los encuentras por rubro, ves su ficha con horario y
          ubicación, y les escribes directo por WhatsApp.
        </p>
      </header>

      {tiendas && tiendas.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiendas.map((t) => {
            const href = hrefTienda(t.slug, t.externalUrl);
            const fuera = esFuera(href);
            return (
              <Link
                key={t.slug}
                href={href}
                target={fuera ? '_blank' : undefined}
                rel={fuera ? 'noopener' : undefined}
                className="flex items-center gap-3 bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-4 hover:border-primary/40 transition-colors"
              >
                {t.logoImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logoImage} alt={t.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">handyman</span>
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-headline-sm text-base font-bold truncate">{t.name}</h3>
                  <p className="text-secondary text-xs truncate">{t.marketplaceCategory}</p>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        {tiendas && tiendas.length > 0 && (
          <h2 className="font-headline-sm text-base font-bold">Explora por rubro</h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RUBROS.map((r) => (
            <div key={r.nombre} className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5 flex flex-col gap-2">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">{r.icon}</span>
              </div>
              <h2 className="font-headline-sm text-base font-bold">{r.nombre}</h2>
              <p className="text-secondary text-sm leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
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
