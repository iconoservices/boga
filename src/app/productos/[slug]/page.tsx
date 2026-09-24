// Ficha de un producto del Mostrador (/productos/<slug>): una introducción corta
// (qué es, qué incluye) y debajo las plantillas disponibles, cada una con su
// vista previa (/preview/<id>). Es una landing informativa, no un checkout.

import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { PRODUCTOS_MOSTRADOR, getProductoMostrador, plantillasDe } from '@/lib/productos';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTOS_MOSTRADOR.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProductoMostrador(slug);
  if (!p) return { title: 'Producto no encontrado' };
  return { title: `${p.titulo} · Productos`, description: p.gancho };
}

export default async function ProductoMostradorPage({ params }: Props) {
  const { slug } = await params;
  const p = getProductoMostrador(slug);
  if (!p) notFound();
  const plantillas = plantillasDe(p);
  const listo = p.estado === 'listo';

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
      <AppHeader />

      <main className="max-w-[1100px] mx-auto px-container-margin pt-4 md:pt-6 pb-16 md:pb-24">
        <Link href="/productos" className="inline-flex items-center gap-1 text-secondary hover:text-primary font-label-md text-label-md">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Todos los productos
        </Link>

        {/* Introducción */}
        <section className="mt-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
          <div className="flex flex-col gap-4">
            <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
              {p.para}
            </span>
            <h1 className="font-headline-lg text-on-background text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">{p.titulo}</h1>
            <p className="text-secondary font-body-lg text-base md:text-lg">{p.descripcion}</p>

            {!listo && p.nota && (
              <p className="text-sm font-semibold rounded-xl px-4 py-3 bg-surface-container-high text-on-background">
                <span className="text-primary font-extrabold">Próximamente · </span>{p.nota}
              </p>
            )}

            {listo && (
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <Link
                  href="/negocios/registro"
                  className="bg-primary text-on-primary font-bold text-sm px-7 py-3.5 rounded-full text-center hover:opacity-90 transition-opacity active:scale-95"
                >
                  Lo quiero
                </Link>
                <Link href="/negocios" className="text-on-background font-semibold text-sm px-7 py-3.5 rounded-full border border-surface-container-highest text-center hover:border-primary hover:text-primary transition-colors">
                  Ver planes
                </Link>
              </div>
            )}
          </div>

          <ul className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5 flex flex-col gap-3">
            <li className="text-[11px] font-bold uppercase tracking-wide text-secondary">Qué incluye</li>
            {p.beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm font-semibold text-on-background">
                <span className="material-symbols-outlined text-[20px] text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {b}
              </li>
            ))}
          </ul>
        </section>

        {/* Plantillas */}
        {plantillas.length > 0 && (
          <section className="mt-12 md:mt-14">
            <div className="mb-5">
              <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-background">
                {plantillas.length === 1 ? 'La plantilla' : 'Elige tu plantilla'}
              </h2>
              <p className="text-secondary font-body-md text-sm md:text-base mt-1">Toca una para verla funcionando, con datos de ejemplo.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {plantillas.map((t) => (
                <Link
                  key={t.id}
                  href={`/preview/${t.id}`}
                  className="group bg-surface-container-lowest border border-surface-container-highest rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-high">
                    <img src={t.heroImage} alt={t.heroAlt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-on-background text-xs font-extrabold px-4 py-2 rounded-full">Ver vista previa</span>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-headline-sm text-headline-sm text-on-background truncate">{t.name}</h3>
                      <p className="text-secondary text-xs">{t.category}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary shrink-0 group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
