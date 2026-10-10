// Ficha de un producto del Mostrador (/productos/<slug>): una introducción corta
// (qué es, qué incluye) y debajo las plantillas disponibles, cada una con su
// vista previa (/preview/<id>). Es una landing informativa, no un checkout.

import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { PRODUCTOS_MOSTRADOR, getProductoMostrador, plantillasDe } from '@/lib/productos';
import TarjetaPlantilla from '@/components/TarjetaPlantilla';
import { GET as catalogoGET } from '@/app/api/catalog/route';

// Las tiendas que usan las plantillas de este producto cambian: la página se rehace cada 5 min (no queda fija desde el build).
export const revalidate = 300;

type TiendaQueUsa = { slug: string; name: string; tagline: string; template: string; logo: string; banner: string; href: string; propia: boolean };

/** Tiendas reales del marketplace que usan alguna de estas plantillas (del mismo catálogo cacheado que usa /market). */
async function tiendasConPlantillas(ids: string[]): Promise<TiendaQueUsa[]> {
  try {
    const r = await catalogoGET(new Request('http://boga.local/api/catalog'));
    if (!r.ok) return [];
    const c = await r.json();
    return ((c.stores ?? []) as { slug: string; name: string; tagline?: string; template?: string; hero_image?: string; logo_image?: string; external_url?: string | null }[])
      .filter((s) => s.template && ids.includes(s.template))
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        tagline: s.tagline || '',
        template: s.template as string,
        logo: s.logo_image || '',
        banner: s.hero_image || '',
        href: s.external_url || `/${s.slug}`,
        propia: !!s.external_url,
      }));
  } catch {
    return [];
  }
}

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
  const tiendas = await tiendasConPlantillas(p.plantillas);
  // Foto de cada plantilla: el banner de una tienda real que la usa; si todavía ninguna la usa, la foto de ejemplo de la plantilla.
  const fotoDe = (id: string, porDefecto: string) => tiendas.find((x) => x.template === id && x.banner)?.banner ?? porDefecto;
  const nombrePlantilla = (id: string) => plantillas.find((t) => t.id === id)?.name ?? '';
  const listo = p.estado === 'listo';

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
      <AppHeader />

      <main className="max-w-[1100px] mx-auto px-container-margin pt-3 md:pt-6 pb-14 md:pb-24">
        <Link href="/productos" className="inline-flex items-center gap-1 text-secondary hover:text-primary font-label-md text-label-md">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Todos los productos
        </Link>

        {/* Introducción */}
        <section className="mt-3 md:mt-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 md:gap-8 items-start">
          <div className="flex flex-col gap-3 md:gap-4">
            <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
              {p.para}
            </span>
            <h1 className="font-headline-lg text-on-background text-[28px] md:text-5xl font-extrabold tracking-tight leading-[1.05]">{p.titulo}</h1>
            <p className="text-secondary font-body-lg text-[15px] md:text-lg leading-snug md:leading-normal">{p.descripcion}</p>

            {!listo && p.nota && (
              <p className="text-sm font-semibold rounded-xl px-4 py-3 bg-surface-container-high text-on-background">
                <span className="text-primary font-extrabold">Próximamente · </span>{p.nota}
              </p>
            )}

            {listo && (
              <div className="flex flex-row gap-2 md:gap-3 mt-1">
                <Link
                  href="/negocios/registro"
                  className="flex-1 sm:flex-none bg-primary text-on-primary font-bold text-sm px-5 sm:px-7 py-3 md:py-3.5 rounded-full text-center hover:opacity-90 transition-opacity active:scale-95"
                >
                  Lo quiero
                </Link>
                <Link href="/negocios" className="flex-1 sm:flex-none text-on-background font-semibold text-sm px-5 sm:px-7 py-3 md:py-3.5 rounded-full border border-surface-container-highest text-center hover:border-primary hover:text-primary transition-colors">
                  Ver planes
                </Link>
              </div>
            )}
          </div>

          <ul className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-4 md:p-5 flex flex-col gap-2 md:gap-3">
            <li className="text-[11px] font-bold uppercase tracking-wide text-secondary">Qué incluye</li>
            {p.beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px] md:text-sm font-semibold text-on-background">
                <span className="material-symbols-outlined text-[18px] md:text-[20px] text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {b}
              </li>
            ))}
          </ul>
        </section>

        {/* Negocios reales que ya usan estas plantillas */}
        {tiendas.length > 0 && (
          <section className="mt-9 md:mt-14">
            <div className="mb-5">
              <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-background">Negocios que ya lo usan</h2>
              <p className="text-secondary font-body-md text-sm md:text-base mt-1">Míralos funcionando de verdad: abre cualquiera.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tiendas.map((t) => {
                const Tarjeta = t.propia ? 'a' : Link;
                return (
                  <Tarjeta
                    key={t.slug}
                    href={t.href}
                    className="group bg-surface-container-lowest border border-surface-container-highest rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
                  >
                    {/* Banner chico con el logo pequeño encima, en la esquina */}
                    <span className="relative block h-16 bg-surface-container-high">
                      {(t.banner || t.logo) && <img src={t.banner || t.logo} alt="" loading="lazy" className="w-full h-full object-cover" />}
                      <span className="absolute -bottom-5 left-3 w-11 h-11 rounded-xl bg-white border-2 border-white shadow overflow-hidden flex items-center justify-center">
                        {t.logo && <img src={t.logo} alt={t.name} loading="lazy" className="w-full h-full object-cover" />}
                      </span>
                    </span>
                    <span className="block px-3 pt-7 pb-3 min-w-0">
                      <span className="block font-bold text-sm text-on-background truncate">{t.name}</span>
                      <span className="block text-secondary text-[11px] truncate">{t.tagline || nombrePlantilla(t.template)}</span>
                    </span>
                  </Tarjeta>
                );
              })}
            </div>
          </section>
        )}

        {/* Plantillas */}
        {plantillas.length > 0 && (
          <section className="mt-9 md:mt-14">
            <div className="mb-5">
              <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-background">
                {plantillas.length === 1 ? 'La plantilla' : 'Elige tu plantilla'}
              </h2>
              <p className="text-secondary font-body-md text-sm md:text-base mt-1">Toca una para verla funcionando, con datos de ejemplo, o con tu propio logo.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {plantillas.map((t) => (
                <TarjetaPlantilla key={t.id} id={t.id} name={t.name} category={t.category} heroImage={fotoDe(t.id, t.heroImage)} heroAlt={t.heroAlt} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
