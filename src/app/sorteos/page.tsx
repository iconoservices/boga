"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// Sorteos = hub de sorteos, promos y juegos. Por ahora todo es contenido curado
// a mano + un mini-juego de demo en el cliente (sin motor de tickets ni premios
// reales todavía). La idea de negocio:
//  - Sorteos por compras: cada S/ 20 = 1 ticket automático.
//  - Sorteos promocionales: el usuario COMPRA tickets (o los patrocina un local).
//  - Tómbola / buscaminas: juego con intentos, algunos ganan premio al instante.

const SORTEO_DESTACADO = {
  titulo: 'Moto lineal 0 km',
  premio: 'Honda XR 150 — la sacas de la tienda',
  cierra: '30 sep',
  participaciones: 1240,
  img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80',
};

const SORTEOS_ACTIVOS = [
  { id: 's1', titulo: 'Canasta gigante de la selva', sub: 'Abarrotes para todo el mes',     cierra: '15 sep', tickets: 3, patrocina: 'Minimarket El Ahorro', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80' },
  { id: 's2', titulo: 'Cena para 2 en La Anaconda',  sub: 'Parrilla + bebidas incluidas',   cierra: '12 sep', tickets: 1, patrocina: 'La Anaconda Parrillas', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80' },
  { id: 's3', titulo: 'Vale de S/ 500 en Boga',      sub: 'Para gastar en cualquier tienda', cierra: '20 sep', tickets: 5, patrocina: 'Boga',                  img: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=600&q=80' },
  { id: 's4', titulo: 'Smartphone gama media',       sub: 'Nuevo, con garantía y boleta',    cierra: '28 sep', tickets: 2, patrocina: 'TecnoBoga',             img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80' },
];

// Sorteos promocionales: se compran los tickets.
const SORTEOS_PROMO = [
  { id: 'p1', titulo: 'PlayStation 5 + 2 juegos', precio: 5,  vendidos: 340, meta: 500, cierra: '30 sep', img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&q=80' },
  { id: 'p2', titulo: 'Refrigeradora No Frost',   precio: 3,  vendidos: 180, meta: 400, cierra: '05 oct', img: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80' },
  { id: 'p3', titulo: 'S/ 2000 en efectivo',      precio: 10, vendidos: 95,  meta: 300, cierra: '10 oct', img: 'https://images.unsplash.com/photo-1554672408-730436b60dde?w=600&q=80' },
];

const GANADORES = [
  { id: 'g1', nombre: 'María Q.', premio: 'Licuadora Oster', zona: 'Callería',    img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80' },
  { id: 'g2', nombre: 'Jorge P.', premio: 'Vale S/ 200',     zona: 'Manantay',    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80' },
  { id: 'g3', nombre: 'Rosa I.',  premio: 'Cena para 2',     zona: 'Yarinacocha', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80' },
];

// --- Tómbola / buscaminas ---
// 16 casillas. 3 esconden premio. El usuario tiene 3 intentos (sus
// "participaciones"). Es una demo 100% cliente: no otorga nada real.
const PREMIOS_TOMBOLA: Record<number, string> = {
  3: 'S/ 20 de descuento',
  9: 'Envío gratis x1',
  14: '2x1 en postres',
};
const INTENTOS_INICIALES = 3;

export default function Sorteos() {
  const { cartCount, setIsCartOpen } = useCart();

  const [reveladas, setReveladas] = useState<number[]>([]);
  const [intentos, setIntentos] = useState(INTENTOS_INICIALES);
  const [ganados, setGanados] = useState<string[]>([]);

  const destapar = (i: number) => {
    if (reveladas.includes(i) || intentos <= 0) return;
    setReveladas((prev) => [...prev, i]);
    setIntentos((prev) => prev - 1);
    if (PREMIOS_TOMBOLA[i]) setGanados((prev) => [...prev, PREMIOS_TOMBOLA[i]]);
  };

  const reiniciar = () => {
    setReveladas([]);
    setIntentos(INTENTOS_INICIALES);
    setGanados([]);
  };

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <MarketTabs />

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-12">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-on-surface">Sorteos 🎟️</h1>
          <p className="text-secondary font-body-md text-sm">Cada compra en Boga te suma participaciones. Cuánto más compras, más chances.</p>
        </div>

        {/* Sorteo destacado */}
        <section className="relative overflow-hidden rounded-2xl shadow-lg min-h-[240px] flex">
          <img src={SORTEO_DESTACADO.img} alt={SORTEO_DESTACADO.titulo} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
          <div className="relative z-10 mt-auto p-5 flex flex-col gap-1.5 w-full">
            <span className="w-fit bg-primary text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>Sorteo del mes
            </span>
            <h2 className="font-headline-lg text-white text-2xl font-extrabold leading-tight">{SORTEO_DESTACADO.titulo}</h2>
            <p className="text-white/80 font-body-md text-xs">{SORTEO_DESTACADO.premio}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">schedule</span>Cierra {SORTEO_DESTACADO.cierra}
              </span>
              <span className="bg-white/15 backdrop-blur-sm text-white text-[11px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">group</span>{SORTEO_DESTACADO.participaciones.toLocaleString('es-PE')} participando
              </span>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <div className="bg-white rounded-2xl p-4 border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)] flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
          <div className="flex flex-col">
            <span className="font-headline-sm text-sm text-on-surface leading-tight">Cómo participas</span>
            <span className="text-secondary font-body-md text-xs mt-0.5">Compra en cualquier tienda de Boga: cada S/ 20 = 1 ticket automático. Los sorteos se transmiten en vivo por el Instagram de Boga.</span>
          </div>
        </div>

        {/* Tómbola / buscaminas */}
        <section className="flex flex-col gap-4">
          <div className="mb-1">
            <h3 className="font-headline-lg text-on-surface">Tómbola de la suerte 🍀</h3>
            <p className="text-secondary font-body-md text-xs mt-0.5">Destapa casillas con tus intentos. Algunas esconden un premio al instante.</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-label-md text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                Intentos: <span className="font-price-lg text-primary text-base">{intentos}</span>
              </span>
              <button
                onClick={reiniciar}
                className="text-[11px] font-label-md text-secondary flex items-center gap-1 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>Reiniciar demo
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:max-w-[360px]">
              {Array.from({ length: 16 }).map((_, i) => {
                const abierta = reveladas.includes(i);
                const premio = PREMIOS_TOMBOLA[i];
                return (
                  <button
                    key={i}
                    onClick={() => destapar(i)}
                    disabled={abierta || intentos <= 0}
                    className={`aspect-square rounded-xl flex items-center justify-center text-center transition-all active:scale-95 ${
                      abierta
                        ? premio
                          ? 'bg-primary-fixed border border-primary/30'
                          : 'bg-surface-container-low border border-surface-container-highest'
                        : 'bg-primary text-white shadow-md hover:opacity-90 disabled:opacity-40'
                    }`}
                  >
                    {abierta ? (
                      premio ? (
                        <span className="flex flex-col items-center gap-0.5 p-1">
                          <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
                          <span className="text-[8px] font-label-md text-on-primary-fixed leading-tight line-clamp-2">{premio}</span>
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-secondary/50 text-[18px]">close</span>
                      )
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">question_mark</span>
                    )}
                  </button>
                );
              })}
            </div>

            {intentos <= 0 && (
              <div className="bg-surface-container-low rounded-xl p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] shrink-0">shopping_bag</span>
                <span className="text-[11px] font-body-md text-secondary">
                  Te quedaste sin intentos. Consigues 1 intento nuevo por cada compra en Boga.
                </span>
              </div>
            )}

            {ganados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ganados.map((g, idx) => (
                  <span key={idx} className="bg-primary text-white text-[11px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Ganaste: {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sorteos promocionales (venta de tickets) */}
        <section className="flex flex-col gap-4">
          <div className="mb-1">
            <h3 className="font-headline-lg text-on-surface">Sorteos promocionales 🔥</h3>
            <p className="text-secondary font-body-md text-xs mt-0.5">Compra tickets para premios grandes. Se sortea al llenar la meta.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SORTEOS_PROMO.map((p) => {
              const pct = Math.min(100, Math.round((p.vendidos / p.meta) * 100));
              return (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
                  <div className="relative h-36 overflow-hidden bg-surface-container-low">
                    <img src={p.img} alt={p.titulo} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-on-surface text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>Cierra {p.cierra}
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <h4 className="font-headline-sm text-sm text-on-surface line-clamp-1">{p.titulo}</h4>
                    <div className="flex flex-col gap-1">
                      <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-label-md text-secondary">{p.vendidos} / {p.meta} tickets vendidos</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-surface-container pt-2.5 mt-auto">
                      <span className="font-price-lg text-primary text-sm">S/ {p.precio} <span className="text-[10px] text-secondary font-label-md">/ ticket</span></span>
                      <button className="flex items-center gap-1 bg-primary text-white text-[12px] font-label-md px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                        <span className="material-symbols-outlined text-[15px]">add</span>Comprar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sorteos activos (por compras) */}
        <section className="flex flex-col gap-4">
          <h3 className="font-headline-lg text-on-surface">Sorteos por tus compras</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SORTEOS_ACTIVOS.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
                <div className="relative h-36 overflow-hidden bg-surface-container-low">
                  <img src={s.img} alt={s.titulo} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-on-surface text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>Cierra {s.cierra}
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-1">{s.titulo}</h4>
                  <span className="text-secondary font-label-md text-[11px] line-clamp-1">{s.sub}</span>
                  <span className="text-secondary/70 font-label-md text-[10px] uppercase tracking-wider mt-0.5">Patrocina · {s.patrocina}</span>
                  <div className="flex items-center justify-between border-t border-surface-container pt-2.5 mt-2">
                    <span className="text-[11px] font-label-md text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                      Tienes {s.tickets} {s.tickets === 1 ? 'ticket' : 'tickets'}
                    </span>
                    <span className="text-[10px] font-label-md text-secondary">Auto por compras</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ganadores */}
        <section className="flex flex-col gap-4">
          <h3 className="font-headline-lg text-on-surface">Últimos ganadores 🏆</h3>
          <div className="flex flex-col gap-3">
            {GANADORES.map((g) => (
              <div key={g.id} className="bg-white rounded-2xl p-3 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-surface-container-low">
                  <img src={g.img} alt={g.nombre} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-headline-sm text-sm text-on-surface leading-tight">{g.nombre} · {g.zona}</span>
                  <span className="text-secondary font-label-md text-[11px]">Ganó: {g.premio}</span>
                </div>
                <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              </div>
            ))}
          </div>
        </section>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          Sorteos válidos en Pucallpa. Boga se contacta con el ganador por teléfono y lo publica en sus redes. La tómbola de esta pantalla es una demostración.
        </p>
      </main>
    </>
  );
}
