"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// Eventos = agenda local de Pucallpa. Contenido curado a mano (sin tabla ni
// venta de entradas todavía): conciertos, ferias, fiestas, deporte y cultura.
// El negocio organizador paga por destacar su evento.

type Filtro = 'Todos' | 'Música' | 'Ferias' | 'Fiestas' | 'Deporte' | 'Cultura';

const EVENTO_DESTACADO = {
  titulo: 'Feria Regional de la Amazonía',
  lugar: 'Parque Natural de Pucallpa',
  dia: 'SÁB 13',
  mes: 'SEP',
  hora: '10:00 a. m. – 10:00 p. m.',
  precio: 'Entrada libre',
  img: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
};

const EVENTOS = [
  { id: 'e1', titulo: 'Noche de Cumbia Amazónica', cat: 'Música',  lugar: 'Complejo La Cabaña',   dia: 'VIE 12', mes: 'SEP', precio: 'S/ 30', destacado: true,  organiza: 'Producciones Selva', img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80' },
  { id: 'e2', titulo: 'Feria Gastronómica del Juane', cat: 'Ferias', lugar: 'Plaza de Armas',       dia: 'DOM 14', mes: 'SEP', precio: 'Libre', destacado: false, organiza: 'Municipalidad',       img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80' },
  { id: 'e3', titulo: 'Torneo de Fútbol Playa',      cat: 'Deporte', lugar: 'Playa de Yarinacocha', dia: 'SÁB 20', mes: 'SEP', precio: 'Libre', destacado: false, organiza: 'Liga Distrital',      img: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80' },
  { id: 'e4', titulo: 'Expo Artesanía Shipiba',      cat: 'Cultura', lugar: 'Casa de la Cultura',   dia: 'JUE 18', mes: 'SEP', precio: 'S/ 5',  destacado: false, organiza: 'Colectivo Shipibo',    img: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&q=80' },
  { id: 'e5', titulo: 'Aniversario de Pucallpa',     cat: 'Fiestas', lugar: 'Malecón Bellavista',   dia: 'MIÉ 13', mes: 'OCT', precio: 'Libre', destacado: false, organiza: 'Municipalidad',       img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80' },
  { id: 'e6', titulo: 'Concierto Rock en la Selva',  cat: 'Música',  lugar: 'Anfiteatro Municipal', dia: 'SÁB 27', mes: 'SEP', precio: 'S/ 45', destacado: false, organiza: 'Selva Sound',          img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80' },
];

const FILTROS: Filtro[] = ['Todos', 'Música', 'Ferias', 'Fiestas', 'Deporte', 'Cultura'];

export default function Eventos() {
  const { cartCount, setIsCartOpen } = useCart();
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const lista = filtro === 'Todos' ? EVENTOS : EVENTOS.filter((e) => e.cat === filtro);

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <MarketTabs />

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-12">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-on-surface">Eventos 🎉</h1>
          <p className="text-secondary font-body-md text-sm">Qué pasa esta semana en Pucallpa. Conciertos, ferias, fiestas y más.</p>
        </div>

        {/* Evento destacado */}
        <section className="relative overflow-hidden rounded-2xl shadow-lg min-h-[240px] flex">
          <img src={EVENTO_DESTACADO.img} alt={EVENTO_DESTACADO.titulo} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
          <div className="relative z-10 flex flex-col w-full p-5 mt-auto gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl px-3 py-1.5 text-center shrink-0 shadow-md">
                <span className="block font-price-lg text-primary text-lg leading-none">{EVENTO_DESTACADO.dia.split(' ')[1]}</span>
                <span className="block font-label-md text-[10px] text-secondary uppercase">{EVENTO_DESTACADO.dia.split(' ')[0]} · {EVENTO_DESTACADO.mes}</span>
              </div>
              <span className="bg-primary text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">Destacado</span>
            </div>
            <h2 className="font-headline-lg text-white text-2xl font-extrabold leading-tight">{EVENTO_DESTACADO.titulo}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">location_on</span>{EVENTO_DESTACADO.lugar}
              </span>
              <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">schedule</span>{EVENTO_DESTACADO.hora}
              </span>
              <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-label-md px-2.5 py-1 rounded-full">{EVENTO_DESTACADO.precio}</span>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                filtro === f
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Agenda */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
              <div className="relative h-36 overflow-hidden bg-surface-container-low">
                <img src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-white rounded-lg px-2 py-1 text-center shadow-sm">
                  <span className="block font-price-lg text-primary text-sm leading-none">{e.dia.split(' ')[1]}</span>
                  <span className="block font-label-md text-[9px] text-secondary uppercase">{e.dia.split(' ')[0]} {e.mes}</span>
                </div>
                <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{e.cat}</span>
                {e.destacado && (
                  <span className="absolute bottom-2 left-2 bg-primary text-white text-[9px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>Destacado
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col gap-1 flex-1">
                <h4 className="font-headline-sm text-sm text-on-surface line-clamp-1">{e.titulo}</h4>
                <span className="text-secondary font-label-md text-[11px] flex items-center gap-1 line-clamp-1">
                  <span className="material-symbols-outlined text-[13px]">location_on</span>{e.lugar}
                </span>
                <span className="text-secondary/70 font-label-md text-[10px] uppercase tracking-wider">Organiza · {e.organiza}</span>
                <div className="flex items-center justify-between border-t border-surface-container pt-2.5 mt-2">
                  <span className="font-price-lg text-primary text-sm">{e.precio}</span>
                  <span className="text-primary font-label-md text-[11px] flex items-center gap-1">Más info<span className="material-symbols-outlined text-[13px]">arrow_forward</span></span>
                </div>
              </div>
            </div>
          ))}
        </section>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          ¿Organizas un evento en Pucallpa? Publícalo en Boga y llega a miles de personas. Escríbenos por WhatsApp.
        </p>
      </main>
    </>
  );
}
