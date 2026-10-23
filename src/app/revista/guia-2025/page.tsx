"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import {
  NEGOCIOS_2025,
  CATEGORIAS_2025,
  PATROCINADORES_2025,
  type Categoria2025,
  type Negocio2025,
} from "@/lib/guia2025";

// ─────────────────────────────────────────────────────────────────────────────
// Guía Comercial & Turística 2025: Lo mejor de Pucallpa
// Página pública dentro de /revista. Acceso desde el masthead de la Revista.
// ─────────────────────────────────────────────────────────────────────────────

const VERDE = "#1a7a4a";
const ORO = "#e0a72e";
const ORO_CLARO = "#f4d978";

function BadgePrecio({ p }: { p: Negocio2025["precio"] }) {
  const map: Record<string, string> = { "$": "Económico", "$$": "Moderado", "$$$": "Premium" };
  if (!p || !map[p]) return null;
  return (
    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
      {p} · {map[p]}
    </span>
  );
}

function TarjetaNegocio({ n, grande = false }: { n: Negocio2025; grande?: boolean }) {
  const wa = n.whatsapp
    ? `https://wa.me/${n.whatsapp}?text=${encodeURIComponent(`Hola, vi tu negocio en la Guía BogaHub 2025 y me interesa saber más sobre ${n.nombre}.`)}`
    : null;

  return (
    <article
      className={`group relative bg-white border border-stone-200 overflow-hidden flex flex-col hover:border-stone-400 hover:shadow-lg transition-all duration-300 ${
        grande ? "sm:col-span-2 lg:col-span-2" : ""
      }`}
    >
      {/* Imagen */}
      <div className={`relative overflow-hidden ${grande ? "h-52 sm:h-64" : "h-40"}`}>
        <img
          src={n.img}
          alt={n.nombre}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badge flotante */}
        {n.badge && (
          <span
            className="absolute top-2.5 left-2.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 text-white"
            style={{ backgroundColor: ORO }}
          >
            {n.badge}
          </span>
        )}

        {/* Nombre encima de la imagen (estilo revista) */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3
            className={`text-white font-extrabold tracking-tight leading-tight ${
              grande ? "text-lg sm:text-xl" : "text-sm"
            }`}
          >
            {n.nombre}
          </h3>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <BadgePrecio p={n.precio} />
          <span className="flex items-center gap-0.5 text-[10px] text-stone-500">
            <span className="material-symbols-outlined text-[13px]">location_on</span>
            {n.zona}
          </span>
        </div>
        <p className="text-[12px] text-stone-600 leading-relaxed flex-1">{n.descripcion}</p>

        {/* CTA */}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex items-center gap-1.5 text-[11px] font-bold text-white px-3 py-2 transition-all active:scale-95"
            style={{ backgroundColor: "#25D366" }}
          >
            <span className="material-symbols-outlined text-[15px]">chat</span>
            Contactar por WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}

export default function Guia2025Page() {
  const [catActiva, setCatActiva] = useState<Categoria2025 | "Todos">("Todos");

  const negociosFiltrados =
    catActiva === "Todos"
      ? NEGOCIOS_2025
      : NEGOCIOS_2025.filter((n) => n.categoria === catActiva);

  const destacados = NEGOCIOS_2025.filter((n) => n.destacado);

  return (
    <>
      <AppHeader />

      <main className="w-full pb-20 bg-stone-50">

        {/* ── PORTADA / HERO ─────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden text-white"
          style={{ backgroundColor: "#0f3d22" }}
        >
          {/* Textura de fondo */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Banda dorada superior */}
          <div className="h-1.5 w-full" style={{ backgroundColor: ORO }} />

          <div className="relative max-w-[1100px] mx-auto px-4 lg:px-8 py-10 lg:py-14 flex flex-col gap-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
              <Link href="/revista" className="hover:text-white transition-colors">
                Yo Soy de la Selva
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span style={{ color: ORO_CLARO }}>Guía 2025</span>
            </div>

            {/* Título */}
            <div className="flex flex-col gap-2 max-w-[700px]">
              <p
                className="text-[11px] font-extrabold uppercase tracking-[0.35em]"
                style={{ color: ORO }}
              >
                Edición Anual · Pucallpa & La Selva
              </p>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[0.95]">
                Guía Comercial
                <span style={{ color: ORO_CLARO }}> & Turística</span>
                <br />
                <span className="text-white/70 text-2xl sm:text-4xl font-light italic">Lo mejor de Pucallpa</span>
                <span
                  className="block text-4xl sm:text-6xl font-black mt-1"
                  style={{ color: ORO }}
                >
                  2025
                </span>
              </h1>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-[55ch] mt-2">
                La selección definitiva de los mejores restaurantes, hoteles, tours, comercios y
                servicios de Pucallpa — curados por el equipo de BogaHub para que encuentres
                lo mejor de nuestra ciudad.
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/15">
              {[
                { n: NEGOCIOS_2025.length.toString(), l: "Negocios seleccionados" },
                { n: CATEGORIAS_2025.length.toString(), l: "Categorías" },
                { n: "2025", l: "Edición anual" },
              ].map((s) => (
                <div key={s.l} className="flex flex-col">
                  <span className="text-2xl font-black" style={{ color: ORO }}>
                    {s.n}
                  </span>
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Banda dorada inferior */}
          <div className="h-1 w-full" style={{ backgroundColor: ORO }} />
        </div>

        {/* ── DESTACADOS DEL AÑO ─────────────────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-4 lg:px-8 mt-10">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="text-[11px] font-extrabold uppercase tracking-[0.25em] px-3 py-1"
              style={{ backgroundColor: ORO, color: "#0f3d22" }}
            >
              ★ Destacados del Año
            </span>
            <div className="flex-1 h-px bg-stone-300" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {destacados.map((n, i) => (
              <TarjetaNegocio key={n.id} n={n} grande={i === 0} />
            ))}
          </div>
        </section>

        {/* ── FILTRO DE CATEGORÍAS ────────────────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-4 lg:px-8 mt-12">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="text-[11px] font-extrabold uppercase tracking-[0.25em] px-3 py-1"
              style={{ backgroundColor: "#0f3d22", color: "white" }}
            >
              Directorio Completo
            </span>
            <div className="flex-1 h-px bg-stone-300" />
          </div>

          {/* Tabs de categoría */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setCatActiva("Todos")}
              className={`px-4 py-2 text-xs font-bold transition-all border ${
                catActiva === "Todos"
                  ? "text-white border-transparent"
                  : "bg-white text-stone-600 border-stone-300 hover:border-stone-500"
              }`}
              style={catActiva === "Todos" ? { backgroundColor: VERDE } : {}}
            >
              Todos ({NEGOCIOS_2025.length})
            </button>
            {CATEGORIAS_2025.map((cat) => {
              const count = NEGOCIOS_2025.filter((n) => n.categoria === cat.id).length;
              const active = catActiva === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCatActiva(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all border ${
                    active
                      ? "text-white border-transparent"
                      : "bg-white text-stone-600 border-stone-300 hover:border-stone-500"
                  }`}
                  style={active ? { backgroundColor: cat.color } : {}}
                >
                  <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                  {cat.id}
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                      active ? "bg-white/25 text-white" : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Separador por categoría si es "Todos" */}
          {catActiva === "Todos" ? (
            <div className="flex flex-col gap-10">
              {CATEGORIAS_2025.map((cat) => {
                const negs = NEGOCIOS_2025.filter((n) => n.categoria === cat.id);
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2" style={{ borderColor: cat.color }}>
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: cat.color }}
                      >
                        {cat.icon}
                      </span>
                      <h2 className="font-extrabold text-base tracking-tight" style={{ color: cat.color }}>
                        {cat.id}
                      </h2>
                      <span className="text-[11px] text-stone-400 font-medium ml-1">
                        {negs.length} {negs.length === 1 ? "negocio" : "negocios"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {negs.map((n) => (
                        <TarjetaNegocio key={n.id} n={n} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {negociosFiltrados.map((n) => (
                <TarjetaNegocio key={n.id} n={n} />
              ))}
            </div>
          )}
        </section>

        {/* ── CTA APARECE AQUÍ ───────────────────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-4 lg:px-8 mt-14">
          <div
            className="relative overflow-hidden p-8 lg:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6"
            style={{ backgroundColor: "#0f3d22" }}
          >
            {/* Deco */}
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full -mr-40 -mt-40 opacity-10"
              style={{ backgroundColor: ORO }}
            />
            <div className="relative z-10 flex-1 flex flex-col gap-2">
              <p
                className="text-[11px] font-extrabold uppercase tracking-[0.3em]"
                style={{ color: ORO }}
              >
                ¿Tienes un negocio en Pucallpa?
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Aparece en la Guía Comercial{" "}
                <span style={{ color: ORO_CLARO }}>2026</span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-[50ch]">
                Las revistas antiguas cobraban un dineral. En BogaHub, tu local llega a toda
                Pucallpa con una ficha digital, fotos reales y contacto directo por WhatsApp.
              </p>
            </div>
            <div className="relative z-10 flex flex-col gap-2 shrink-0">
              <a
                href={`https://wa.me/51900000000?text=${encodeURIComponent("Hola, quiero aparecer en la Guía Comercial BogaHub 2026.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 font-extrabold text-sm transition-all active:scale-95 flex items-center gap-2"
                style={{ backgroundColor: ORO, color: "#0f3d22" }}
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                Quiero aparecer aquí
              </a>
              <Link
                href="/vende-con-boga"
                className="px-6 py-3 font-bold text-xs text-white/70 border border-white/20 hover:border-white/50 transition-all text-center"
              >
                Ver planes para negocios →
              </Link>
            </div>
          </div>
        </section>

        {/* ── PATROCINADORES ─────────────────────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-4 lg:px-8 mt-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 text-center mb-4">
            Guía patrocinada por
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {PATROCINADORES_2025.map((p) => (
              <div
                key={p.nombre}
                className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 bg-white text-stone-700 text-xs font-semibold"
              >
                <span className="text-base">{p.logo}</span>
                {p.nombre}
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER DE LA GUIA ──────────────────────────────────────────── */}
        <footer className="max-w-[1100px] mx-auto px-4 lg:px-8 mt-10 pt-6 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">
              Guía Comercial & Turística · Pucallpa 2025
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Selección editorial de BogaHub. Información de referencia — verifica horarios y
              precios directamente con cada establecimiento.
            </p>
          </div>
          <Link
            href="/revista"
            className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Volver a Yo Soy de la Selva
          </Link>
        </footer>
      </main>
    </>
  );
}
