"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import {
  SECCIONES, EDICION, EN_ESTA_EDICION, VERDE, VERDE_CLARO,
  notaHref, type Nota,
} from '@/lib/revista';

// "Yo Soy de la Selva" — portada de la revista/blog digital de Boga. Masthead +
// barra de secciones + grilla de notas. Cada nota abre en su propia URL
// (/revista/<slug>), que es una página server-rendered con su metadata y
// JSON-LD para que Google y los motores de IA la indexen y la citen.

// Tarjeta de nota con el título ENCIMA de la imagen (estilo tapa de revista).
function NotaCard({ n, lead = false }: { n: Nota; lead?: boolean }) {
  return (
    <Link
      href={notaHref(n)}
      className={`group relative overflow-hidden rounded-sm text-left w-full block ${
        lead ? 'aspect-[16/10] sm:aspect-[21/9] sm:col-span-2 lg:col-span-3' : 'aspect-[4/3]'
      }`}
    >
      <img
        src={n.img}
        alt={n.titulo}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
      <div className={`absolute inset-x-0 bottom-0 ${lead ? 'p-5 lg:p-8' : 'p-4'}`}>
        <span className="inline-block text-white font-label-md text-[9px] uppercase tracking-[0.2em] px-2 py-0.5" style={{ backgroundColor: VERDE }}>
          {n.kicker}
        </span>
        <h3
          className={`text-white font-headline-lg font-extrabold tracking-tight leading-[1.08] mt-2 ${
            lead ? 'text-xl sm:text-3xl lg:text-4xl max-w-[20ch]' : 'text-base lg:text-lg'
          }`}
        >
          {n.titulo}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-white/70">
          <span className="font-label-md text-[10px] uppercase tracking-wider">{n.fecha}</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span className="font-label-md text-[10px]">{n.lectura}</span>
        </div>
      </div>
    </Link>
  );
}

function ListaNotas({ notas, conLead = false }: { notas: Nota[]; conLead?: boolean }) {
  if (notas.length === 0) {
    return <p className="font-body-md text-secondary text-sm py-10">Todavía no hay notas en esta sección.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
      {notas.map((n, i) => (
        <NotaCard key={n.id} n={n} lead={conLead && i === 0} />
      ))}
    </div>
  );
}

export default function RevistaIndex({ notas }: { notas: Nota[] }) {
  const [seccion, setSeccion] = useState<string>('Portada');

  const irASeccion = (s: string) => {
    setSeccion(s);
    if (s !== 'Portada') {
      document.getElementById('historias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const tabs = ['Portada', ...SECCIONES];
  const portada = notas.find((n) => n.portada) ?? notas[0];
  const destacados = notas.filter((n) => n.destacado && n.slug !== portada?.slug).slice(0, 3);
  const notasSeccion = seccion === 'Portada'
    ? notas.filter((n) => n.slug !== portada?.slug)
    : notas.filter((n) => n.kicker === seccion);

  return (
    <>
      <AppHeader showSearch={false} showLocation={false} showChat={false} showCart={false} />

      <main className="w-full pb-16">

        {/* Masthead — paleta del logo: verde selva + dorado + madera */}
        <div className="text-white border-b-4" style={{ backgroundColor: VERDE, borderColor: '#e0a72e' }}>
          <div className="max-w-[1100px] mx-auto px-container-margin lg:px-8 py-4 lg:py-5">
            <button onClick={() => irASeccion('Portada')} className="text-left">
              <h1 className="font-headline-lg font-extrabold tracking-tight leading-[0.92] text-[7vw] sm:text-3xl lg:text-4xl">
                Yo Soy <span style={{ color: '#f2d489' }}>de la Selva</span>
              </h1>
            </button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <span className="font-label-md text-[10px] px-2.5 py-1 rounded-sm shadow-sm" style={{ backgroundColor: '#6b4a2e', color: '#f4e7d3' }}>
                Únete y sé un selvático de verdad
              </span>
              <p className="font-label-md text-[10px] uppercase tracking-widest text-white/70">{EDICION}</p>
            </div>
          </div>
        </div>

        {/* Barra de secciones / categorías del blog (sticky) */}
        <nav className="sticky top-0 z-30 bg-surface-container-lowest border-b border-on-surface/15 shadow-[0_4px_10px_rgba(0,0,0,0.03)]">
          <div className="max-w-[1100px] mx-auto flex items-stretch overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {tabs.map((s, i) => {
              const active = seccion === s;
              return (
                <button
                  key={s}
                  onClick={() => irASeccion(s)}
                  className={`shrink-0 px-4 py-3 font-headline-sm text-[13px] whitespace-nowrap transition-colors relative ${
                    i > 0 ? 'border-l border-on-surface/12' : ''
                  }`}
                  style={{ color: active ? VERDE : undefined }}
                >
                  <span className={active ? '' : 'text-on-surface'}>{s}</span>
                  {active && <span className="absolute left-0 right-0 -bottom-px h-0.5" style={{ backgroundColor: VERDE }} />}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="max-w-[1100px] mx-auto">

          {seccion === 'Portada' && portada && (
            <>
              {/* Nota de portada */}
              <Link href={notaHref(portada)} className="block w-full text-left px-container-margin lg:px-8 pt-8 group">
                <div className="relative overflow-hidden rounded-sm aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
                  <img src={portada.img} alt={portada.titulo} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8">
                    <span className="inline-block text-white font-label-md text-[10px] uppercase tracking-[0.2em] px-2.5 py-1" style={{ backgroundColor: VERDE }}>
                      {portada.kicker}
                    </span>
                    <h2 className="text-white font-headline-lg font-extrabold tracking-tight leading-[1.03] text-2xl sm:text-4xl lg:text-5xl mt-3 max-w-[16ch]">
                      {portada.titulo}
                    </h2>
                  </div>
                </div>
                <p className="font-body-lg text-on-surface/80 text-base lg:text-lg leading-relaxed mt-5 max-w-[62ch]">
                  {portada.dek}
                </p>
                <span className="inline-flex items-center gap-1 mt-3 font-label-md text-[12px] uppercase tracking-wider" style={{ color: VERDE_CLARO }}>
                  Leer la crónica
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </span>
              </Link>

              {/* Destacados */}
              <section className="px-container-margin lg:px-8 mt-10 grid sm:grid-cols-3 gap-5 lg:gap-6">
                {destacados.map((d) => (
                  <NotaCard key={d.id} n={d} />
                ))}
              </section>
            </>
          )}

          {/* Lista de notas — filtrable por sección */}
          <section id="historias" className="px-container-margin lg:px-8 scroll-mt-16 pt-10">
            <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl border-b border-on-surface/15 pb-3">
              {seccion === 'Portada' ? 'Últimas notas' : seccion}
            </h2>
            <div className="mt-8">
              <ListaNotas notas={notasSeccion} conLead={seccion === 'Portada'} />
            </div>
          </section>

          {seccion === 'Portada' && (
            <section className="px-container-margin lg:px-8 mt-14">
              <div className="bg-surface-container-low rounded-sm p-6 lg:p-8">
                <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg lg:text-xl">También en la edición 07</h2>
                <ol className="mt-4 divide-y divide-on-surface/10">
                  {EN_ESTA_EDICION.map((t, i) => (
                    <li key={i} className="flex items-baseline gap-4 py-3">
                      <span className="font-headline-lg font-black text-lg tabular-nums shrink-0" style={{ color: VERDE_CLARO }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-body-md text-on-surface text-sm lg:text-base leading-snug">{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          <footer className="px-container-margin lg:px-8 mt-14 pt-6 border-t border-on-surface/15">
            <p className="font-label-md text-[11px] uppercase tracking-[0.25em] text-secondary">Yo Soy de la Selva</p>
            <p className="font-body-md text-secondary/80 text-xs mt-2 max-w-[62ch] leading-relaxed">
              Revista digital de Boga. Historias de Pucallpa y la Amazonía peruana, compiladas por el
              equipo de Boga a partir de fuentes públicas. Fotografías de Wikimedia Commons,
              acreditadas en cada nota.
            </p>
          </footer>

        </div>
      </main>
    </>
  );
}
