import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import {
  notaHref, relacionadasDe, fechaISO,
  VERDE, VERDE_CLARO, ORO, type Nota,
} from '@/lib/revista';
import { getNotaPublicadaBySlug, getNotasPublicadas } from '@/lib/revista.data';

// Un artículo de la Revista, en su propia URL (/revista/<slug>). Server
// Component: lee la nota de la tabla revista_notas (fallback a NOTAS_SEED),
// expone metadata por artículo (título, descripción, canónica, OG) y un bloque
// JSON-LD (NewsArticle + BreadcrumbList) para SEO y para que los motores de IA
// puedan citar la nota con autor y fecha. Revalida cada 5 min.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const nota = await getNotaPublicadaBySlug(slug);
  if (!nota) return { title: 'Nota no encontrada' };

  const url = `/revista/${slug}`;
  const publishedTime = fechaISO(nota.fecha);
  return {
    title: nota.titulo,
    description: nota.dek,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: nota.titulo,
      description: nota.dek,
      url,
      publishedTime,
      authors: [nota.autor],
      section: nota.kicker,
      images: [{ url: nota.img, alt: nota.titulo }],
    },
    twitter: {
      card: 'summary_large_image',
      title: nota.titulo,
      description: nota.dek,
      images: [nota.img],
    },
  };
}

function Byline({ n }: { n: Nota }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-secondary">
      <span className="font-label-md text-[11px] uppercase tracking-wider text-on-surface">{n.autor}</span>
      <span className="w-1 h-1 rounded-full bg-secondary/40" />
      <span className="font-label-md text-[11px] uppercase tracking-wider">{n.fecha}</span>
      <span className="w-1 h-1 rounded-full bg-secondary/40" />
      <span className="font-label-md text-[11px]">{n.lectura} de lectura</span>
    </div>
  );
}

function NotaMiniCard({ n }: { n: Nota }) {
  return (
    <Link href={notaHref(n)} className="group relative overflow-hidden rounded-sm text-left w-full block aspect-[4/3]">
      <img src={n.img} alt={n.titulo} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <span className="inline-block text-white font-label-md text-[9px] uppercase tracking-[0.2em] px-2 py-0.5" style={{ backgroundColor: VERDE }}>
          {n.kicker}
        </span>
        <h3 className="text-white font-headline-lg font-extrabold tracking-tight leading-[1.08] mt-2 text-base lg:text-lg">
          {n.titulo}
        </h3>
      </div>
    </Link>
  );
}

export default async function ArticuloPage({ params }: Props) {
  const { slug } = await params;
  const nota = await getNotaPublicadaBySlug(slug);
  if (!nota) notFound();

  const rel = relacionadasDe(nota, await getNotasPublicadas());
  const url = `${SITE_URL}/revista/${slug}`;
  const publishedTime = fechaISO(nota.fecha);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: nota.titulo,
        description: nota.dek,
        image: [nota.img],
        datePublished: publishedTime,
        dateModified: publishedTime,
        author: { '@type': 'Organization', name: nota.autor, url: SITE_URL },
        publisher: {
          '@type': 'Organization',
          name: 'Boga',
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.svg` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        articleSection: nota.kicker,
        inLanguage: 'es-PE',
        ...(nota.fuente?.url ? { isBasedOn: nota.fuente.url } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Yo Soy de la Selva', item: `${SITE_URL}/revista` },
          { '@type': 'ListItem', position: 3, name: nota.titulo, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <AppHeader showSearch={false} showLocation={false} showChat={false} showCart={false} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="w-full pb-16">
        <article className="pb-4">
          <div className="max-w-[720px] mx-auto px-container-margin lg:px-8 pt-6">
            <Link href="/revista" className="flex items-center gap-1.5 font-label-md text-[12px] uppercase tracking-wider text-secondary hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Volver a Yo Soy de la Selva
            </Link>
            <span className="inline-block mt-5 font-label-md text-[11px] uppercase tracking-[0.25em]" style={{ color: VERDE_CLARO }}>
              {nota.kicker}
            </span>
            <h1 className="font-headline-lg font-extrabold tracking-tight text-on-surface leading-[1.08] text-2xl sm:text-4xl lg:text-[42px] mt-2">
              {nota.titulo}
            </h1>
            <p className="font-body-lg text-on-surface/70 text-base lg:text-lg leading-relaxed mt-4">{nota.dek}</p>
            <div className="mt-5 pb-5 border-b border-on-surface/15">
              <Byline n={nota} />
            </div>
          </div>

          <figure className="max-w-[980px] mx-auto mt-6 px-container-margin lg:px-8">
            <div className="relative overflow-hidden rounded-sm aspect-[16/9]">
              <img src={nota.img} alt={nota.titulo} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <figcaption className="font-label-md text-[11px] text-secondary mt-2">{nota.imgCredito || 'Foto: archivo Boga · imagen referencial'}</figcaption>
          </figure>

          <div className="max-w-[680px] mx-auto px-container-margin lg:px-8 mt-8">
            {nota.cuerpo.map((p, i) => (
              <p
                key={i}
                className={`font-body-lg text-on-surface/90 text-[17px] leading-[1.75] ${i > 0 ? 'mt-5' : ''} ${
                  i === 0
                    ? 'first-letter:font-headline-lg first-letter:font-black first-letter:text-[52px] first-letter:leading-[0.8] first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:text-[#0b4d2c]'
                    : ''
                }`}
              >
                {p}
              </p>
            ))}

            {nota.cita && (
              <blockquote className="my-9 border-l-4 pl-5" style={{ borderColor: ORO }}>
                <p className="font-headline-lg font-extrabold tracking-tight text-on-surface leading-[1.2] text-xl lg:text-2xl">
                  “{nota.cita.texto}”
                </p>
                <footer className="font-label-md text-[11px] uppercase tracking-widest text-secondary mt-3">— {nota.cita.autor}</footer>
              </blockquote>
            )}

            {nota.ubicacionMaps && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nota.ubicacionMaps)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-label-md text-[12px] uppercase tracking-wider transition-opacity hover:opacity-90"
                style={{ backgroundColor: VERDE }}
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                Cómo llegar
              </a>
            )}

            {nota.fuente && (
              <p className="mt-8 font-label-md text-[11px] text-secondary">
                Fuente:{' '}
                {nota.fuente.url ? (
                  <a href={nota.fuente.url} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-on-surface">
                    {nota.fuente.nombre}
                  </a>
                ) : (
                  nota.fuente.nombre
                )}
                . Texto compilado y reescrito por Boga.
              </p>
            )}

            <div className="mt-10 pt-5 border-t border-on-surface/15 flex items-center gap-3">
              <span className="font-label-md text-[11px] uppercase tracking-wider text-secondary">Compartir</span>
              {['share', 'link', 'chat'].map((ic) => (
                <span key={ic} className="w-8 h-8 rounded-full border border-surface-container-highest flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[16px]">{ic}</span>
                </span>
              ))}
            </div>
          </div>

          {rel.length > 0 && (
            <div className="max-w-[1100px] mx-auto px-container-margin lg:px-8 mt-14">
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg lg:text-xl border-b border-on-surface/15 pb-3">
                Sigue leyendo · {nota.kicker}
              </h2>
              <div className="grid sm:grid-cols-3 gap-5 mt-6">
                {rel.map((r) => (
                  <NotaMiniCard key={r.id} n={r} />
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </>
  );
}
