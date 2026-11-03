"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export interface EdicionLibro {
  anio: number;
  tomo: string;
  titulo: string;
  subtitulo: string;
  estado: 'publicada' | 'convocatoria' | 'proxima';
  badge: string;
  totalNegocios?: number;
  colorTapa: string;
  colorDorado: string;
  descripcion: string;
  portadaImg: string;
  href: string;
}

export const EDICIONES_GUIA: EdicionLibro[] = [
  {
    anio: 2025,
    tomo: 'Tomo I',
    titulo: 'Lo mejor de Pucallpa',
    subtitulo: 'Edición Fundacional',
    estado: 'publicada',
    badge: '★ Publicada',
    totalNegocios: 24,
    colorTapa: 'from-[#0b2918] via-[#144b2c] to-[#0a2315]',
    colorDorado: '#e0a72e',
    descripcion: '24 restaurantes, hoteles, tours y locales curados por BogaHub.',
    portadaImg: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
    href: '/revista/guia-2025',
  },
  {
    anio: 2026,
    tomo: 'Tomo II',
    titulo: 'Pucallpa & Ucayali',
    subtitulo: 'La Selva se Renueva',
    estado: 'convocatoria',
    badge: '✦ En Convocatoria',
    totalNegocios: 0,
    colorTapa: 'from-[#2b0f08] via-[#6d1f11] to-[#250d07]',
    colorDorado: '#f6d878',
    descripcion: 'En preparación. Postula tu restaurante o negocio para la nueva edición.',
    portadaImg: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    href: '#postula-2026',
  },
  {
    anio: 2027,
    tomo: 'Tomo III',
    titulo: 'Rutas & Fronteras',
    subtitulo: 'Futura Edición',
    estado: 'proxima',
    badge: 'En Agenda',
    totalNegocios: 0,
    colorTapa: 'from-[#0e1726] via-[#1e293b] to-[#0a0f18]',
    colorDorado: '#93c5fd',
    descripcion: 'El próximo volumen anual de la colección cultural y comercial.',
    portadaImg: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80',
    href: '#',
  },
];

interface Props {
  anioActivo?: number;
  onPostularClick?: () => void;
  className?: string;
}

export default function RepisaGuias({ anioActivo = 2025, onPostularClick, className = '' }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const handleLibroClick = (ed: EdicionLibro, e: React.MouseEvent) => {
    if (ed.estado === 'convocatoria') {
      e.preventDefault();
      if (onPostularClick) {
        onPostularClick();
      } else {
        setModalAbierto(true);
      }
    } else if (ed.estado === 'proxima') {
      e.preventDefault();
    }
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Encabezado de la repisa */}
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#e0a72e]">auto_stories</span>
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f4d978] font-bold">
            Colección de Guías Anuales
          </span>
        </div>
        <span className="text-[10px] text-white/50 font-mono hidden sm:inline">
          Ediciones oficiales · Pucallpa
        </span>
      </div>

      {/* Contenedor de libros sobre la repisa */}
      <div className="relative w-full flex items-end justify-center gap-4 sm:gap-6 pt-6 pb-2 px-3 overflow-x-auto hide-scrollbar">
        {EDICIONES_GUIA.map((ed) => {
          const esActivo = ed.anio === anioActivo;
          const esConvocatoria = ed.estado === 'convocatoria';
          const esProxima = ed.estado === 'proxima';

          return (
            <div key={ed.anio} className="flex flex-col items-center group relative shrink-0">
              {/* Badge superior indicando estado */}
              <div className="mb-2 transition-transform duration-300 group-hover:-translate-y-1">
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm ${
                    esActivo
                      ? 'bg-[#e0a72e] text-[#0f3d22] font-black'
                      : esConvocatoria
                      ? 'bg-amber-400/90 text-stone-900 animate-pulse'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {esActivo ? '★ Leyendo' : ed.badge}
                </span>
              </div>

              {/* El Libro 3D */}
              <Link
                href={ed.href}
                onClick={(e) => handleLibroClick(ed, e)}
                className={`relative block w-[120px] sm:w-[135px] h-[175px] sm:h-[195px] rounded-r-md rounded-l-xs overflow-hidden transition-all duration-300 shadow-[-6px_10px_20px_rgba(0,0,0,0.6),-1px_0_3px_rgba(0,0,0,0.4)] ${
                  esActivo
                    ? 'ring-2 ring-[#e0a72e] -translate-y-2 shadow-[-8px_16px_28px_rgba(0,0,0,0.7)]'
                    : esConvocatoria
                    ? 'hover:-translate-y-3 hover:scale-105 cursor-pointer opacity-95 hover:opacity-100'
                    : 'opacity-60 cursor-default'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${ed.colorTapa.replace('from-[', '').replace(']', '').replace('via-[', '').replace('to-[', '')})`,
                }}
              >
                {/* Lomo / Pliegue del libro a la izquierda (sombra 3D) */}
                <div
                  className="absolute inset-y-0 left-0 w-3.5 pointer-events-none z-20"
                  style={{
                    background:
                      'linear-gradient(to right, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.3) 30%, rgba(255,255,255,0.1) 60%, rgba(0,0,0,0.4) 100%)',
                  }}
                />

                {/* Imagen de fondo sutil con overlay */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ed.portadaImg}
                  alt={ed.titulo}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 transition-transform duration-500 group-hover:scale-110"
                />

                {/* Marco dorado interior tipo encuadernación de lujo */}
                <div className="absolute inset-2 border border-white/20 rounded-xs pointer-events-none z-10 flex flex-col justify-between p-2">
                  <div className="flex items-center justify-between border-b border-white/15 pb-1">
                    <span className="text-[8px] font-mono tracking-widest uppercase text-white/70">
                      {ed.tomo}
                    </span>
                    <span className="text-[9px] font-black text-[#f4d978]">
                      {ed.anio}
                    </span>
                  </div>

                  <div className="text-center my-auto flex flex-col items-center py-1">
                    <span className="text-[7.5px] uppercase font-mono tracking-[0.2em] text-[#e0a72e] leading-tight font-bold">
                      Guía Oficial
                    </span>
                    <span className="font-serif font-black text-[13px] sm:text-[14px] leading-tight text-white drop-shadow-sm mt-0.5">
                      Pucallpa
                    </span>
                    <span className="text-[8px] italic text-white/80 font-serif leading-tight mt-0.5">
                      {ed.subtitulo}
                    </span>
                  </div>

                  <div className="border-t border-white/15 pt-1 text-center">
                    <span className="text-[7.5px] font-mono uppercase text-white/50 tracking-wider">
                      BogaHub
                    </span>
                  </div>
                </div>

                {/* Listón / Marcapáginas colgando por debajo */}
                <div
                  className="absolute bottom-0 right-4 w-2.5 h-4 z-25 shadow-sm"
                  style={{
                    backgroundColor: ed.colorDorado,
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
                  }}
                />
              </Link>

              {/* Título y estado debajo del libro */}
              <div className="mt-2 text-center max-w-[120px]">
                <p className="text-xs font-bold text-white leading-tight">
                  Edición {ed.anio}
                </p>
                <p className="text-[10px] text-white/60 leading-tight mt-0.5">
                  {esActivo
                    ? '24 seleccionados'
                    : esConvocatoria
                    ? 'Postular local →'
                    : 'Próximamente'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── La Repisa Física de Madera (Base 3D) ────────────────────── */}
      <div className="relative w-full max-w-[520px] mt-1">
        {/* Superficie superior de la madera (con reflejo) */}
        <div className="h-3.5 w-full bg-gradient-to-r from-[#21130b] via-[#4d2c17] to-[#21130b] rounded-t-xs border-t border-[#875028] shadow-[inset_0_1px_3px_rgba(255,255,255,0.2)]" />
        {/* Canto frontal del tablón de madera con sombra hacia abajo */}
        <div className="h-2.5 w-full bg-gradient-to-r from-[#140b07] via-[#2e1a0e] to-[#140b07] shadow-[0_12px_24px_rgba(0,0,0,0.7)]" />
        {/* Mensaje de la repisa */}
        <p className="text-center text-[10px] font-mono text-white/40 uppercase tracking-widest mt-2">
          Archivo Histórico de Guías Anuales · BogaHub Selva
        </p>
      </div>

      {/* ── Modal Convocatoria 2026 ───────────────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-stone-900 border border-[#e0a72e]/40 rounded-2xl p-6 text-white shadow-2xl">
            <button
              onClick={() => setModalAbierto(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white text-lg p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#e0a72e]/20 text-[#f4d978] font-bold border border-[#e0a72e]/40">
                ★ Convocatoria Abierta 2026
              </span>
            </div>

            <h3 className="text-xl font-bold font-serif text-white">
              Guía Comercial & Turística 2026
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed mt-2">
              Estamos preparando la segunda edición oficial anual con los restaurantes, hoteles, tours y locales más destacados de Pucallpa y Ucayali.
            </p>

            <div className="bg-stone-800/80 border border-white/10 rounded-xl p-4 my-4 flex flex-col gap-2">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                ¿Tienes un negocio en Pucallpa?
              </span>
              <p className="text-xs text-stone-300">
                Postula tu restaurante, hospedaje, agencia turística o servicio para ser evaluado y aparecer en el Libro Anual 2026.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="https://wa.me/51987911213?text=Hola%20BogaHub%2C%20quisiera%20postular%20mi%20negocio%20para%20aparecer%20en%20la%20Gu%C3%ADa%20Tur%C3%ADstica%202026."
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-[#25D366] text-white flex items-center justify-center gap-2 hover:bg-[#20ba59] active:scale-95 transition shadow-lg"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                Postular por WhatsApp
              </a>
              <button
                onClick={() => setModalAbierto(false)}
                className="py-2.5 px-4 rounded-xl text-xs bg-white/10 text-white/80 hover:bg-white/20 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

