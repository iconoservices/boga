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

// ── Anuncio Publicitario Sticky de la Guía Turística (Estilo Libro 3D en Repisa) ──
function AnuncioGuia2025Sticky() {
  const cats = CATEGORIAS_2025.slice(0, 5);

  return (
    <aside className="sticky top-20 space-y-3">
      {/* Etiqueta editorial superior */}
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-on-surface/50 px-1">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-amber-500">auto_stories</span>
          Libro Oficial
        </span>
        <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Anuario
        </span>
      </div>

      <Link
        href="/revista/guia-2025"
        className="group block relative overflow-hidden bg-gradient-to-b from-[#0f3d22] to-[#071c10] border border-[#e0a72e]/30 shadow-md transition-all duration-300 hover:shadow-2xl hover:border-[#e0a72e]/70 p-4 rounded-2xl"
      >
        {/* Resplandor dorado de fondo */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#e0a72e]/15 rounded-full blur-2xl pointer-events-none" />

        {/* ── Escenario 3D del Libro ── */}
        <div className="relative flex flex-col items-center pt-2 pb-1">
          {/* Badge flotante sobre el libro */}
          <div className="mb-2 z-10 transition-transform duration-300 group-hover:-translate-y-1">
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md"
              style={{ backgroundColor: ORO, color: VERDE_OSC }}
            >
              ★ Edición Anual
            </span>
          </div>

          {/* El Libro 3D */}
          <div className="relative w-[160px] h-[225px] rounded-r-md rounded-l-xs overflow-hidden transition-all duration-300 shadow-[-8px_14px_28px_rgba(0,0,0,0.8),-1px_0_3px_rgba(0,0,0,0.4)] group-hover:-translate-y-2 group-hover:scale-105 group-hover:shadow-[-12px_20px_35px_rgba(0,0,0,0.9)] bg-gradient-to-br from-[#0c2f1b] via-[#14532d] to-[#092415]">
            {/* Lomo / Pliegue del libro a la izquierda (sombra 3D) */}
            <div
              className="absolute inset-y-0 left-0 w-3.5 pointer-events-none z-20"
              style={{
                background:
                  'linear-gradient(to right, rgba(255,255,255,0.25) 0%, rgba(0,0,0,0.35) 30%, rgba(255,255,255,0.1) 60%, rgba(0,0,0,0.5) 100%)',
              }}
            />

            {/* Canto de páginas de papel blanco/marfil a la derecha */}
            <div className="absolute inset-y-0.5 right-0 w-2 bg-gradient-to-r from-stone-400 via-amber-100 to-stone-400 border-l border-black/20 pointer-events-none z-10" />

            {/* Imagen de fondo sutil con overlay */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80"
              alt="Guía Comercial Pucallpa"
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-35 transition-transform duration-700 group-hover:scale-110"
            />

            {/* Marco dorado interior tipo encuadernación de lujo */}
            <div className="absolute inset-2 border border-[#e0a72e]/50 rounded-xs pointer-events-none z-10 flex flex-col justify-between p-2 bg-black/10">
              <div className="flex items-center justify-between border-b border-[#e0a72e]/30 pb-1">
                <span className="text-[8px] font-mono tracking-widest uppercase text-white/70">
                  Tomo I
                </span>
                <span className="text-[10px] font-black text-[#f4d978]">
                  2025
                </span>
              </div>

              <div className="text-center my-auto flex flex-col items-center py-1">
                <span className="text-[7.5px] uppercase font-mono tracking-[0.2em] text-[#e0a72e] leading-tight font-bold">
                  Guía Oficial
                </span>
                <span className="font-serif font-black text-[16px] leading-tight text-white drop-shadow-md mt-0.5">
                  PUCALLPA
                </span>
                <div className="w-7 h-px bg-[#e0a72e]/60 my-1" />
                <span className="text-[8.5px] text-[#f4d978] font-serif font-semibold leading-tight">
                  Comercial &amp; Turística
                </span>
                <span className="text-[7.5px] italic text-white/70 font-serif leading-tight mt-0.5">
                  Lo mejor de la Selva
                </span>
              </div>

              <div className="border-t border-[#e0a72e]/30 pt-0.5 text-center">
                <span className="text-[7.5px] font-mono uppercase text-[#e0a72e] tracking-widest font-semibold">
                  BogaHub
                </span>
              </div>
            </div>

            {/* Listón / Marcapáginas dorado colgando por debajo */}
            <div
              className="absolute bottom-0 right-4 w-2.5 h-4 z-25 shadow-sm"
              style={{
                backgroundColor: ORO,
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
              }}
            />
          </div>

          {/* ── La Repisa de Madera ── */}
          <div className="relative w-full max-w-[195px] mt-1">
            <div className="h-2.5 w-full bg-gradient-to-r from-[#21130b] via-[#4d2c17] to-[#21130b] rounded-t-xs border-t border-[#875028] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)]" />
            <div className="h-2 w-full bg-gradient-to-r from-[#140b07] via-[#2e1a0e] to-[#140b07] shadow-[0_8px_16px_rgba(0,0,0,0.8)]" />
          </div>
        </div>

        {/* ── Descripción y Botón ── */}
        <div className="mt-3 pt-3 border-t border-white/10 text-center">
          <p className="text-xs text-white/80 leading-relaxed">
            Restaurantes, hoteles, tours y comercios recomendados de Pucallpa en una sola guía oficial.
          </p>

          {/* Categorías como tags */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-2.5">
            {cats.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/10"
              >
                <span className="material-symbols-outlined text-[11px]">{c.icon}</span>
                {c.id}
              </span>
            ))}
          </div>

          {/* Botón CTA */}
          <div
            className="mt-3.5 w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-headline-sm text-xs font-black tracking-wide transition-all bg-[#e0a72e] text-[#0f3d22] group-hover:bg-[#f4d978] shadow-lg active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            Abrir y hojear la Guía
            <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </div>
          <p className="text-center text-[9px] text-white/40 mt-1.5 font-mono uppercase tracking-wider">
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

            {/* Guía como tab especial */}
            <Link
              href="/revista/guia-2025"
              className="shrink-0 border-l border-on-surface/12 px-4 py-3 font-headline-sm text-[13px] whitespace-nowrap flex items-center gap-1.5 transition-colors hover:opacity-80 font-bold"
              style={{ color: "#0f3d22", backgroundColor: ORO + "22" }}
            >
              <span className="text-[11px]">★</span>
              Guía Turística
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
              Revista oficial de BogaHub. Historias de Pucallpa y la Amazonía peruana, compiladas
              por el equipo de BogaHub a partir de fuentes públicas. Fotografías de Wikimedia
              Commons, acreditadas en cada nota.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
