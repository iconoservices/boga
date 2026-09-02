"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// Taxi Seguro: por ahora es SOLO UN DIRECTORIO de choferes verificados
// (mototaxi / auto / moto). No hay reserva ni pago dentro de la app todavía —
// el pasajero llama o escribe por WhatsApp directo. Data curada a mano.

type Filtro = 'Todos' | 'Mototaxi' | 'Auto' | 'Moto';

const CHOFERES = [
  { id: 'c1', nombre: 'Juan Torres',    tipo: 'Mototaxi', placa: 'A5-1234', zona: 'Yarinacocha',     rating: '4.9', viajes: 1200, tel: '51962000001', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
  { id: 'c2', nombre: 'Elena Ramírez',  tipo: 'Auto',     placa: 'F3P-889', zona: 'Pucallpa centro', rating: '5.0', viajes: 640,  tel: '51962000002', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80' },
  { id: 'c3', nombre: 'Carlos Pinedo',  tipo: 'Mototaxi', placa: 'B2-4571', zona: 'Callería',        rating: '4.8', viajes: 980,  tel: '51962000003', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' },
  { id: 'c4', nombre: 'Rosa Shahuano',  tipo: 'Auto',     placa: 'X1F-203', zona: 'Manantay',        rating: '4.9', viajes: 410,  tel: '51962000004', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80' },
  { id: 'c5', nombre: 'Miguel Fasabi', tipo: 'Moto',     placa: 'C7-9982', zona: 'Toda la ciudad',  rating: '4.7', viajes: 1500, tel: '51962000005', img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&q=80' },
  { id: 'c6', nombre: 'Ana Vásquez',    tipo: 'Mototaxi', placa: 'A9-3320', zona: 'Yarinacocha',     rating: '5.0', viajes: 730,  tel: '51962000006', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80' },
];

const ICONO: Record<string, string> = { Mototaxi: 'electric_rickshaw', Auto: 'local_taxi', Moto: 'two_wheeler' };

export default function TaxiSeguro() {
  const { cartCount, setIsCartOpen } = useCart();
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const lista = filtro === 'Todos' ? CHOFERES : CHOFERES.filter((c) => c.tipo === filtro);

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <MarketTabs />

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-12">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-on-surface">Taxi Seguro 🛺</h1>
          <p className="text-secondary font-body-md text-sm">Directorio de choferes verificados de Pucallpa. Escribe o llama directo.</p>
        </div>

        {/* Nota de confianza */}
        <div className="bg-white rounded-2xl p-4 border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)] flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <div className="flex flex-col">
            <span className="font-headline-sm text-sm text-on-surface leading-tight">Cada chofer pasa un chequeo de Boga</span>
            <span className="text-secondary font-body-md text-xs mt-0.5">DNI, licencia, tarjeta de propiedad y placa validadas. Comparte tu viaje con un contacto siempre.</span>
          </div>
        </div>

        {/* Filtros por tipo de vehículo */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['Todos', 'Mototaxi', 'Auto', 'Moto'] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                filtro === f
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              {f !== 'Todos' && <span className="material-symbols-outlined text-[16px]">{ICONO[f]}</span>}
              {f}
            </button>
          ))}
        </div>

        {/* Directorio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-surface-container-low">
                  <img src={c.img} alt={c.nombre} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{c.nombre}</span>
                    <span className="material-symbols-outlined text-primary text-[15px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }} title="Verificado por Boga">verified</span>
                  </div>
                  <span className="text-secondary font-label-md text-[11px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">{ICONO[c.tipo]}</span>{c.tipo} · {c.placa}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-[11px] font-label-md text-secondary">{c.rating} <span className="opacity-60">· {c.viajes} viajes</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-surface-container pt-3">
                <span className="text-[11px] font-label-md text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>{c.zona}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:+${c.tel}`}
                    className="w-9 h-9 flex items-center justify-center bg-surface-container-low border border-surface-container-highest rounded-full text-on-surface active:scale-90 transition-transform"
                    title="Llamar"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                  </a>
                  <a
                    href={`https://wa.me/${c.tel}?text=${encodeURIComponent(`Hola ${c.nombre}, te contacto desde Taxi Seguro (Boga). ¿Estás disponible para una carrera?`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-[#25D366] text-white text-[12px] font-label-md px-3 py-2 rounded-full active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          Boga solo conecta pasajeros y choferes verificados. La tarifa se acuerda directamente entre las partes.
        </p>
      </main>
    </>
  );
}
