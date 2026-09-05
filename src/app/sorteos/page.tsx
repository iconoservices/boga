"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

// Sorteos = "La Casa de la Suerte" de Boga. Estética morada, energética.
// Todo es contenido de muestra + una tómbola de demo en el cliente (sin motor
// de tickets ni premios reales todavía). Negocio:
//  - Tickets automáticos por compras (cada S/ 20 = 1 ticket).
//  - "Aumentar chances": comprar tickets extra para un premio.
//  - Tómbola: juego con intentos, algunos ganan premio al instante.

const LIMA = '#c9f24a';

const MIEMBRO = {
  nombre: 'Alex',
  codigo: 'BOGA-7C9-2K4',
  plan: 'Suertudo desde SET 2026',
  tickets: 14,
};

const NAV = ['Premios', 'Cómo participar', 'Ganadores', 'Beneficios'];

const PREMIOS = [
  { id: 'pr1', titulo: 'Moto Honda NAVI 110 · 2026',        fecha: '30 SEP 2026', tickets: 1, img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=700&q=80' },
  { id: 'pr2', titulo: 'Smart TV Samsung 65" 4K UHD',        fecha: '30 SEP 2026', tickets: 1, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=700&q=80' },
  { id: 'pr3', titulo: 'PlayStation 5 Slim + Mando + FC 26', fecha: '30 SEP 2026', tickets: 1, img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=700&q=80' },
  { id: 'pr4', titulo: 'PC Gamer Ryzen 7 + Monitor 24"',     fecha: '30 SEP 2026', tickets: 1, img: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=700&q=80' },
  { id: 'pr5', titulo: 'Refrigeradora No Frost 300 L',       fecha: '05 OCT 2026', tickets: 1, img: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=700&q=80' },
  { id: 'pr6', titulo: 'S/ 2 000 en efectivo',               fecha: '10 OCT 2026', tickets: 1, img: 'https://images.unsplash.com/photo-1554672408-730436b60dde?w=700&q=80' },
];

// Sorteos promocionales: el usuario COMPRA tickets. Barra de meta + botón.
const SORTEOS_PROMO = [
  { id: 'promo1', titulo: 'PlayStation 5 + 2 juegos', precio: 5,  vendidos: 340, meta: 500, cierra: '30 sep', img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&q=80' },
  { id: 'promo2', titulo: 'Refrigeradora No Frost',   precio: 3,  vendidos: 180, meta: 400, cierra: '05 oct', img: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80' },
  { id: 'promo3', titulo: 'S/ 2 000 en efectivo',     precio: 10, vendidos: 95,  meta: 300, cierra: '10 oct', img: 'https://images.unsplash.com/photo-1554672408-730436b60dde?w=600&q=80' },
];

const SORTEOS_ACTIVOS = [
  { id: 's1', titulo: 'Canasta gigante de la selva', sub: 'Abarrotes para todo el mes',     cierra: '15 sep', tickets: 3, patrocina: 'Minimarket El Ahorro', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80' },
  { id: 's2', titulo: 'Cena para 2 en La Anaconda',  sub: 'Parrilla + bebidas incluidas',   cierra: '12 sep', tickets: 1, patrocina: 'La Anaconda Parrillas', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80' },
  { id: 's3', titulo: 'Vale de S/ 500 en Boga',      sub: 'Para gastar en cualquier tienda', cierra: '20 sep', tickets: 5, patrocina: 'Boga',                  img: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=600&q=80' },
];

const GANADORES = [
  { id: 'g1', nombre: 'María Q.', premio: 'Licuadora Oster', zona: 'Callería',    img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80' },
  { id: 'g2', nombre: 'Jorge P.', premio: 'Vale S/ 200',     zona: 'Manantay',    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80' },
  { id: 'g3', nombre: 'Rosa I.',  premio: 'Cena para 2',     zona: 'Yarinacocha', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80' },
];

// Tómbola: 16 casillas, 3 con premio, 3 intentos. Demo 100% cliente.
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

      <div className="min-h-screen bg-[#3a1a6e] text-white">
        <div className="max-w-[1200px] mx-auto px-container-margin lg:px-6 pt-5 pb-16 flex flex-col gap-7">

          {/* Bienvenida / membresía */}
          <section className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 lg:p-5 flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center shrink-0 shadow-lg">
              <span className="material-symbols-outlined text-white text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>casino</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-label-md uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: LIMA, color: '#2a1155' }}>
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>Suertudo VIP
              </span>
              <h1 className="font-headline-lg font-extrabold text-xl lg:text-2xl leading-tight mt-1">¡Bienvenid@, {MIEMBRO.nombre}!</h1>
            </div>
            <div className="flex flex-col gap-1 text-right shrink-0">
              <span className="font-label-md text-[11px] text-white/70">Código: {MIEMBRO.codigo}</span>
              <span className="font-label-md text-[11px] text-white/70">{MIEMBRO.plan}</span>
              <span className="font-price-lg text-base mt-0.5" style={{ color: LIMA }}>{MIEMBRO.tickets} tickets</span>
            </div>
          </section>

          {/* Sub-nav */}
          <nav className="flex gap-1 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
            <span className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-label-md bg-white text-[#3a1a6e]">Inicio</span>
            {NAV.map((n) => (
              <span key={n} className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-label-md text-white/70 hover:text-white transition-colors cursor-default">{n}</span>
            ))}
          </nav>

          {/* Banner promo */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] p-5 lg:p-7 flex flex-wrap items-center gap-4">
            <div className="absolute -right-10 -top-12 w-52 h-52 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
            <div className="relative min-w-0 flex-1">
              <h2 className="font-headline-lg font-extrabold text-2xl lg:text-4xl leading-[1.02]">
                Suma tickets<br />con <span style={{ color: LIMA }}>cada compra</span>
              </h2>
              <p className="text-white/80 font-body-md text-xs lg:text-sm mt-2">Cada S/ 20 en cualquier tienda de Boga = 1 ticket automático para todos los premios.</p>
            </div>
            <button className="relative font-headline-sm text-sm text-[#2a1155] px-6 py-3 rounded-full active:scale-95 transition-transform shrink-0" style={{ backgroundColor: LIMA }}>
              ¡Quiero participar!
            </button>
          </section>

          {/* Premios del mes */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Premios de este mes 🎁</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {PREMIOS.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white/[0.06] border border-white/12 overflow-hidden flex flex-col">
                  <div className="relative aspect-square bg-gradient-to-br from-[#5b21b6] to-[#312e81]">
                    <img src={p.img} alt={p.titulo} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#3a1a6e]/40 to-transparent" />
                    <span className="absolute top-2 right-2 bg-white/15 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">confirmation_number</span>{p.tickets} ticket
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <span className="font-label-md text-[9px] uppercase tracking-wider text-white/50">Fecha: {p.fecha}</span>
                    <h3 className="font-headline-sm text-[13px] leading-tight line-clamp-2">{p.titulo}</h3>
                    <span className="font-label-md text-[9px] text-white/40 underline">Aplican términos y condiciones</span>
                    <button className="mt-2 w-full border border-white/40 text-white font-label-md text-[11px] py-2 rounded-full hover:bg-white/10 transition-colors">
                      Aumentar chances
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sorteos promocionales — se compran los tickets */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Sorteos promocionales 🔥</h2>
              <p className="text-white/70 font-body-md text-xs mt-0.5">Compra tickets para premios grandes. Se sortea al llenar la meta.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SORTEOS_PROMO.map((p) => {
                const pct = Math.min(100, Math.round((p.vendidos / p.meta) * 100));
                return (
                  <div key={p.id} className="rounded-2xl bg-white/[0.06] border border-white/12 overflow-hidden flex flex-col">
                    <div className="relative h-32 bg-black/20">
                      <img src={p.img} alt={p.titulo} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>Cierra {p.cierra}
                      </span>
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <h3 className="font-headline-sm text-[13px] leading-tight line-clamp-1">{p.titulo}</h3>
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: LIMA }} />
                        </div>
                        <span className="text-[10px] font-label-md text-white/50">{p.vendidos} / {p.meta} tickets vendidos</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-auto">
                        <span className="font-price-lg text-sm" style={{ color: LIMA }}>S/ {p.precio} <span className="text-[10px] text-white/50 font-label-md">/ ticket</span></span>
                        <button className="flex items-center gap-1 text-[#2a1155] font-label-md text-[12px] px-3 py-1.5 rounded-full active:scale-95 transition-transform" style={{ backgroundColor: LIMA }}>
                          <span className="material-symbols-outlined text-[15px]">add</span>Comprar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tómbola de la suerte */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Tómbola de la suerte 🍀</h2>
              <p className="text-white/70 font-body-md text-xs mt-0.5">Destapa casillas con tus intentos. Algunas esconden un premio al instante.</p>
            </div>

            <div className="rounded-2xl bg-white/[0.06] border border-white/12 p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-label-md flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: LIMA, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  Intentos: <span className="font-price-lg text-base" style={{ color: LIMA }}>{intentos}</span>
                </span>
                <button onClick={reiniciar} className="text-[11px] font-label-md text-white/60 flex items-center gap-1 active:scale-95 transition-transform">
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
                            ? 'bg-white text-[#3a1a6e]'
                            : 'bg-white/5 border border-white/15 text-white/40'
                          : 'bg-gradient-to-br from-[#a855f7] to-[#7c3aed] text-white shadow-md hover:opacity-90 disabled:opacity-40'
                      }`}
                    >
                      {abierta ? (
                        premio ? (
                          <span className="flex flex-col items-center gap-0.5 p-1">
                            <span className="material-symbols-outlined text-[#7c3aed] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
                            <span className="text-[8px] font-label-md leading-tight line-clamp-2">{premio}</span>
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        )
                      ) : (
                        <span className="material-symbols-outlined text-[20px]">question_mark</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {intentos <= 0 && (
                <div className="bg-white/5 rounded-xl p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: LIMA }}>shopping_bag</span>
                  <span className="text-[11px] font-body-md text-white/70">Te quedaste sin intentos. Consigues 1 intento nuevo por cada compra en Boga.</span>
                </div>
              )}

              {ganados.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ganados.map((g, idx) => (
                    <span key={idx} className="text-[11px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: LIMA, color: '#2a1155' }}>
                      <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Ganaste: {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Sorteos por tus compras */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Sorteos por tus compras</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SORTEOS_ACTIVOS.map((s) => (
                <div key={s.id} className="rounded-2xl bg-white/[0.06] border border-white/12 overflow-hidden flex flex-col">
                  <div className="relative h-32 bg-black/20">
                    <img src={s.img} alt={s.titulo} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full">Cierra {s.cierra}</span>
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <h3 className="font-headline-sm text-[13px] leading-tight line-clamp-1">{s.titulo}</h3>
                    <span className="font-label-md text-[11px] text-white/60 line-clamp-1">{s.sub}</span>
                    <span className="font-label-md text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Patrocina · {s.patrocina}</span>
                    <span className="text-[11px] font-label-md flex items-center gap-1 mt-1.5" style={{ color: LIMA }}>
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                      Tienes {s.tickets} {s.tickets === 1 ? 'ticket' : 'tickets'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ganadores */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Últimos ganadores 🏆</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GANADORES.map((g) => (
                <div key={g.id} className="rounded-2xl bg-white/[0.06] border border-white/12 p-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-black/20">
                    <img src={g.img} alt={g.nombre} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-headline-sm text-[13px] leading-tight">{g.nombre} · {g.zona}</span>
                    <span className="font-label-md text-[11px] text-white/60">Ganó: {g.premio}</span>
                  </div>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: LIMA, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                </div>
              ))}
            </div>
          </section>

          <p className="text-white/50 font-body-md text-[11px] text-center pt-2">
            Sorteos válidos en Pucallpa. Boga contacta al ganador por teléfono y lo publica en sus redes. La tómbola de esta pantalla es una demostración.
          </p>
        </div>
      </div>
    </>
  );
}
