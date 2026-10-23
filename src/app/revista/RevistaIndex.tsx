"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import {
  SECCIONES, EDICION, EN_ESTA_EDICION, VERDE, VERDE_CLARO,
  notaHref, type Nota,
} from "@/lib/revista";
import { CATEGORIAS_2025 } from "@/lib/guia2025";

// "Yo Soy de la Selva" — portada de la revista/blog digital de BogaHub.
// Masthead redesigned + banner Guía Comercial 2025 + grilla de notas.
// Cada nota abre en su propia URL (/revista/<slug>), server-rendered con
// metadata y JSON-LD para indexación en Google y motores de IA.

const ORO = "#e0a72e";
const ORO_CLARO = "#f4d978";
const VERDE_OSC = "#0f3d22";

// ── Tarjeta de nota estilo tapa de revista ────────────────────────────────
function NotaCard({ n, lead = false }: { n: Nota; lead?: boolean }) {
  return (
    <Link
      href={notaHref(n)}
      className={`group relative overflow-hidden text-left w-full block ${lead ? "aspect-[16/10] sm:aspect-[21/9] sm:col-span-2 lg:col-span-3" : "aspect-[4/3]"
        }`}
    >
      <img
        src={n.img}
        alt={n.titulo}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
      <div className={`absolute inset-x-0 bottom-0 ${lead ? "p-5 lg:p-8" : "p-4"}`}>
        <span
          className="inline-block text-white font-label-md text-[9px] uppercase tracking-[0.2em] px-2 py-0.5"
          style={{ backgroundColor: VERDE }}
        >
          {n.kicker}
        </span>
        <h3
          className={`text-white font-headline-lg font-extrabold tracking-tight leading-[1.08] mt-2 ${lead ? "text-xl sm:text-3xl lg:text-4xl max-w-[20ch]" : "text-base lg:text-lg"
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
    return (
      <p className="font-body-md text-secondary text-sm py-10">
        Todavía no hay notas en esta sección.
      </p>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
      {notas.map((n, i) => (
        <NotaCard key={n.id} n={n} lead={conLead && i === 0} />
      ))}
    </div>
  );
}

// ── Anuncio Publicitario Sticky de la Guía Comercial 2025 ─────────────────
function AnuncioGuia2025Sticky() {
  const cats = CATEGORIAS_2025.slice(0, 5);

  return (
    <aside className="sticky top-20 space-y-2">
      {/* Etiqueta editorial */}
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-on-surface/50 px-1">
        <span>Aviso · Guía Oficial</span>
        <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Destacado
        </span>
      </div>

      <Link
        href="/revista/guia-2025"
        className="group block relative overflow-hidden bg-surface-container-low border border-on-surface/15 shadow-sm transition-all hover:shadow-lg hover:border-amber-400/60"
      >
        {/* Línea dorada superior */}
        <div className="h-1" style={{ backgroundColor: ORO }} />

        {/* Imagen publicitaria con badge */}
        <div className="relative h-40 overflow-hidden bg-stone-900">
          <img
            src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80"
            alt="Guía Comercial Pucallpa 2025"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="absolute top-2.5 left-2.5">
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5"
              style={{ backgroundColor: ORO, color: VERDE_OSC }}
            >
              ★ Edición 2025
            </span>
          </div>
          <div className="absolute bottom-2.5 left-3 right-3 text-white">
            <p className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
              Pucallpa &middot; Directorio
            </p>
            <h3 className="font-headline-sm font-black text-lg leading-tight drop-shadow-sm">
              Guía Comercial <span style={{ color: ORO_CLARO }}>&amp; Turística</span>
            </h3>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 bg-surface-container-lowest">
          <p className="text-xs text-on-surface/80 leading-relaxed">
            Restaurantes, hoteles, tours y comercios recomendados de Pucallpa en una sola guía digital.
          </p>

          {/* Categorías como tags */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-on-surface/10">
            {cats.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-surface-container-high text-on-surface/80"
              >
                <span className="material-symbols-outlined text-[11px]">{c.icon}</span>
                {c.id}
              </span>
            ))}
          </div>

          {/* Botón CTA */}
          <div
            className="mt-4 w-full py-2.5 px-3 flex items-center justify-center gap-2 font-headline-sm text-xs font-black tracking-wide transition-all group-hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "#0f3d22", color: "#fef3c7" }}
          >
            <span className="material-symbols-outlined text-[15px]">menu_book</span>
            Abrir Guía 2025
            <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </div>
          <p className="text-center text-[9px] text-on-surface/40 mt-2 font-mono uppercase tracking-wider">
            Acceso libre &middot; BogaHub
          </p>
        </div>
      </Link>
    </aside>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export default function RevistaIndex({ notas }: { notas: Nota[] }) {
  const [seccion, setSeccion] = useState<string>("Portada");

  const irASeccion = (s: string) => {
    setSeccion(s);
    if (s !== "Portada") {
      document.getElementById("historias")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const tabs = ["Portada", ...SECCIONES];
  const portada = notas.find((n) => n.portada) ?? notas[0];
  const destacados = notas.filter((n) => n.destacado && n.slug !== portada?.slug).slice(0, 3);
  const notasSeccion =
    seccion === "Portada"
      ? notas.filter((n) => n.slug !== portada?.slug)
      : notas.filter((n) => n.kicker === seccion);

  return (
    <>
      <AppHeader />

      <main className="w-full pb-16">

        {/* ── MASTHEAD REDISEÑADO ────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden text-white"
          style={{ backgroundColor: VERDE }}
        >
          {/* Deco diagonal sutil */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: "repeating-linear-gradient(-60deg,#fff 0,#fff 1px,transparent 0,transparent 30px)",
            }}
          />

          {/* Banda dorada superior */}
          <div className="h-1.5" style={{ backgroundColor: ORO }} />

          <div className="relative max-w-[1100px] mx-auto px-container-margin lg:px-8">
            {/* Fila principal del masthead */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 py-5 lg:py-6">
              <button onClick={() => irASeccion("Portada")} className="text-left">
                <p
                  className="text-[9px] font-extrabold uppercase tracking-[0.45em] mb-1 opacity-70"
                >
                  BogaHub · Revista
                </p>
                <h1 className="font-headline-lg font-black tracking-tighter leading-[0.88] text-[10vw] sm:text-4xl lg:text-5xl">
                  Yo Soy{" "}
                  <span style={{ color: ORO_CLARO }}>de la Selva</span>
                </h1>
              </button>

              {/* Info lateral */}
              <div className="flex flex-col items-start sm:items-end gap-1.5 pb-0.5">
                <p className="font-label-md text-[10px] uppercase tracking-widest text-white/60">
                  {EDICION}
                </p>
                <span
                  className="font-label-md text-[10px] px-2.5 py-1 font-extrabold"
                  style={{ backgroundColor: "#6b4a2e", color: "#f4e7d3" }}
                >
                  Únete · Sé un selvático de verdad
                </span>
              </div>
            </div>
          </div>

          {/* Banda dorada inferior + nav de secciones */}
          <div className="h-px" style={{ backgroundColor: ORO }} />
        </div>

        {/* ── NAV DE SECCIONES (sticky) ─────────────────────────────────── */}
        <nav className="sticky top-0 z-30 bg-surface-container-lowest border-b border-on-surface/15 shadow-[0_4px_10px_rgba(0,0,0,0.03)]">
          <div
            className="max-w-[1100px] mx-auto flex items-stretch overflow-x-auto hide-scrollbar"
            style={{ scrollbarWidth: "none" }}
          >
            {tabs.map((s, i) => {
              const active = seccion === s;
              return (
                <button
                  key={s}
                  onClick={() => irASeccion(s)}
                  className={`shrink-0 px-4 py-3 font-headline-sm text-[13px] whitespace-nowrap transition-colors relative ${i > 0 ? "border-l border-on-surface/12" : ""
                    }`}
                  style={{ color: active ? VERDE : undefined }}
                >
                  <span className={active ? "" : "text-on-surface"}>{s}</span>
                  {active && (
                    <span
                      className="absolute left-0 right-0 -bottom-px h-0.5"
                      style={{ backgroundColor: VERDE }}
                    />
                  )}
                </button>
              );
            })}

            {/* Guía 2025 como tab especial */}
            <Link
              href="/revista/guia-2025"
              className="shrink-0 border-l border-on-surface/12 px-4 py-3 font-headline-sm text-[13px] whitespace-nowrap flex items-center gap-1.5 transition-colors hover:opacity-80"
              style={{ color: "#0f3d22", backgroundColor: ORO + "22" }}
            >
              <span className="text-[11px]">★</span>
              Guía 2025
            </Link>
          </div>
        </nav>

        <div className="max-w-[1240px] mx-auto px-container-margin lg:px-8">
          <div className="lg:grid lg:grid-cols-[1fr_310px] lg:gap-8 items-start pt-4">

            {/* ── Columna Principal de Contenido ────────────────────── */}
            <div className="min-w-0">
              {seccion === "Portada" && portada && (
                <>
                  {/* ── NOTA DE PORTADA ─────────────────────────────────── */}
                  <Link
                    href={notaHref(portada)}
                    className="block w-full text-left group"
                  >
                    <div className="relative overflow-hidden aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
                      <img
                        src={portada.img}
                        alt={portada.titulo}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8">
                        <span
                          className="inline-block text-white font-label-md text-[10px] uppercase tracking-[0.2em] px-2.5 py-1"
                          style={{ backgroundColor: VERDE }}
                        >
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
                    <span
                      className="inline-flex items-center gap-1 mt-3 font-label-md text-[12px] uppercase tracking-wider"
                      style={{ color: VERDE_CLARO }}
                    >
                      Leer la crónica
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </span>
                  </Link>

                  {/* ── DESTACADOS ──────────────────────────────────────── */}
                  {destacados.length > 0 && (
                    <section className="mt-10 grid sm:grid-cols-3 gap-5 lg:gap-6">
                      {destacados.map((d) => (
                        <NotaCard key={d.id} n={d} />
                      ))}
                    </section>
                  )}
                </>
              )}

              {/* Anuncio visible en móviles entre portada y notas */}
              <div className="lg:hidden mt-8 mb-4">
                <AnuncioGuia2025Sticky />
              </div>

              {/* ── LISTA DE NOTAS (filtrable por sección) ───────────────── */}
              <section id="historias" className="scroll-mt-16 pt-10">
                <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl border-b border-on-surface/15 pb-3">
                  {seccion === "Portada" ? "Últimas notas" : seccion}
                </h2>
                <div className="mt-8">
                  <ListaNotas notas={notasSeccion} conLead={seccion === "Portada"} />
                </div>
              </section>

              {seccion === "Portada" && (
                <section className="mt-14">
                  <div className="bg-surface-container-low p-6 lg:p-8">
                    <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg lg:text-xl">
                      También en la edición 07
                    </h2>
                    <ol className="mt-4 divide-y divide-on-surface/10">
                      {EN_ESTA_EDICION.map((t, i) => (
                        <li key={i} className="flex items-baseline gap-4 py-3">
                          <span
                            className="font-headline-lg font-black text-lg tabular-nums shrink-0"
                            style={{ color: VERDE_CLARO }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="font-body-md text-on-surface text-sm lg:text-base leading-snug">
                            {t}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              )}
            </div>

            {/* ── Columna Lateral Derecha (Sticky Ad de Guía 2025) ───── */}
            <div className="hidden lg:block">
              <AnuncioGuia2025Sticky />
            </div>

          </div>

          <footer className="mt-14 pt-6 border-t border-on-surface/15">
            <p className="font-label-md text-[11px] uppercase tracking-[0.25em] text-secondary">
              Yo Soy de la Selva
            </p>
            <p className="font-body-md text-secondary/80 text-xs mt-2 max-w-[62ch] leading-relaxed">
              Revista digital de BogaHub. Historias de Pucallpa y la Amazonía peruana, compiladas
              por el equipo de BogaHub a partir de fuentes públicas. Fotografías de Wikimedia
              Commons, acreditadas en cada nota.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
