"use client";

import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchSorteos, type Sorteo } from '@/lib/sorteos';
import { CarruselSorteos, LIMA, fechaCorta } from '@/components/SorteosCarrusel';

// Sorteos de BogaHub: sorteos patrocinados por negocios de Pucallpa. Cada sorteo
// tiene una META de tickets; a medida que se van registrando, la barra se llena y
// cuando llega a la meta el sorteo se hace solo, al azar, en el servidor.
// Todo sale de /api/sorteos (datos reales; sin ejemplos: si no hay sorteos, se avisa).
// Se administran desde /superadmin/sorteos.

type Pestana = 'abiertos' | 'ganadores' | 'como';

export default function Sorteos() {
  const { cartCount, setIsCartOpen } = useCart();
  const [sorteos, setSorteos] = useState<Sorteo[]>([]);
  const [cargado, setCargado] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('abiertos');

  useEffect(() => {
    fetchSorteos().then((s) => { setSorteos(s); setCargado(true); });
  }, []);

  const abiertos = sorteos.filter((s) => s.status === 'abierto');
  const ganadores = sorteos.filter((s) => s.status === 'sorteado' && s.ganador);

  const PESTANAS: { id: Pestana; label: string; n?: number }[] = [
    { id: 'abiertos', label: 'Sorteos abiertos', n: abiertos.length },
    { id: 'ganadores', label: 'Ganadores', n: ganadores.length },
    { id: 'como', label: 'Cómo funciona' },
  ];

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <div className="min-h-screen bg-[#3a1a6e] text-white">
        <div className="max-w-[1200px] mx-auto px-container-margin lg:px-6 pt-4 pb-16 flex flex-col gap-5">

          {/* Encabezado compacto */}
          <header className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center shrink-0 shadow-lg">
              <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>casino</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-headline-lg font-extrabold text-lg sm:text-xl lg:text-2xl leading-tight">Sorteos</h1>
              <p className="text-white/70 font-body-md text-xs leading-snug">Premios de negocios de Pucallpa. Se sortea solo cuando se llenan los tickets, o en la fecha que indique cada sorteo.</p>
            </div>
          </header>

          {/* Pestañas */}
          <nav className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPestana(p.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-label-md transition-colors active:scale-95 ${
                  pestana === p.id ? 'bg-white text-[#3a1a6e]' : 'bg-white/10 text-white/80 hover:bg-white/15'
                }`}
              >
                {p.label}{typeof p.n === 'number' && p.n > 0 ? ` (${p.n})` : ''}
              </button>
            ))}
          </nav>

          {/* Banner delgado: la mecánica en 3 pasos */}
          {pestana !== 'como' && (
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-3.5 lg:px-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="absolute -right-10 -top-14 w-44 h-44 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
              <h2 className="relative font-headline-lg font-extrabold text-base lg:text-lg leading-tight shrink-0">
                Llena la barra, <span style={{ color: LIMA }}>gana el premio</span>
              </h2>
              <ol className="relative flex flex-wrap gap-x-5 gap-y-1 text-[12px] font-label-md text-white/90">
                <li className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full text-[#2a1155] text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: LIMA }}>1</span>Consigue tu ticket</li>
                <li className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full text-[#2a1155] text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: LIMA }}>2</span>Se llena la barra</li>
                <li className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full text-[#2a1155] text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: LIMA }}>3</span>Sorteo automático</li>
              </ol>
            </section>
          )}

          {/* ───────── Sorteos abiertos ───────── */}
          {pestana === 'abiertos' && (
            <>
              {!cargado && <div className="h-64 rounded-2xl bg-white/10 animate-pulse" aria-hidden="true" />}

              {cargado && abiertos.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/25 p-10 text-center">
                  <span className="material-symbols-outlined text-white/40 text-[40px]">casino</span>
                  <p className="font-headline-sm text-base mt-2">Todavía no hay sorteos abiertos</p>
                  <p className="text-white/70 font-body-md text-xs mt-1">Muy pronto: premios de negocios de Pucallpa. ¡Vuelve a pasar!</p>
                </div>
              )}

              {abiertos.length > 0 && <CarruselSorteos items={abiertos} />}
            </>
          )}

          {/* ───────── Ganadores ───────── */}
          {pestana === 'ganadores' && (
            <section className="flex flex-col gap-3">
              {cargado && ganadores.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/25 p-10 text-center">
                  <span className="material-symbols-outlined text-white/40 text-[40px]">emoji_events</span>
                  <p className="font-headline-sm text-base mt-2">Aún no hay ganadores</p>
                  <p className="text-white/70 font-body-md text-xs mt-1">Cuando se llene un sorteo, aquí verás quién ganó.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ganadores.map((s) => (
                    <div key={s.id} className="rounded-2xl bg-white/[0.06] border border-white/12 p-3 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 shrink-0 flex items-center justify-center">
                        {s.img ? <img src={s.img} alt={s.titulo} loading="lazy" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-white/40">emoji_events</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-headline-sm text-sm leading-tight line-clamp-1">{s.titulo}</h3>
                        <p className="text-[12px] mt-0.5" style={{ color: LIMA }}>🏆 {s.ganador?.nombre} · ticket N.º {s.ganador?.numero}</p>
                        <p className="text-white/55 font-label-md text-[10px] mt-0.5">
                          {[s.patrocinador && `Patrocinó ${s.patrocinador}`, s.sorteadoEl && `Sorteado el ${fechaCorta(s.sorteadoEl)}`].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ───────── Cómo funciona ───────── */}
          {pestana === 'como' && (
            <section className="flex flex-col gap-3">
              {[
                ['confirmation_number', 'Consigue tu ticket', 'Cada sorteo dice cómo participar: por ejemplo, un ticket por cada compra en la tienda que patrocina, o un ticket a un precio bajo. Lo ves en la tarjeta del sorteo.'],
                ['bar_chart', 'La barra se llena', 'Cada sorteo tiene una meta de tickets. A medida que se registran, la barra avanza y todos ven cuántos faltan.'],
                ['casino', 'Sorteo automático', 'Hay dos tipos: los que tienen contador de tickets, que se sortean solos al llenarse, y los que tienen fecha, que se sortean ese día. En los dos casos, nadie, ni BogaHub ni el patrocinador, puede escoger al ganador.'],
                ['emoji_events', 'El ganador se publica', 'Verás el nombre abreviado del ganador y el número de su ticket en la pestaña Ganadores. Te contactamos por WhatsApp para entregar el premio.'],
              ].map(([icono, titulo, texto], i) => (
                <div key={titulo} className="rounded-2xl bg-white/[0.06] border border-white/12 p-4 flex gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[#2a1155]" style={{ backgroundColor: LIMA }}>
                    <span className="material-symbols-outlined text-[22px]">{icono}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-headline-sm text-sm">{i + 1}. {titulo}</h3>
                    <p className="text-white/70 font-body-md text-xs leading-relaxed mt-0.5">{texto}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          <p className="text-white/45 font-body-md text-[11px] text-center">
            Aplican términos y condiciones de cada sorteo. La participación es mayor de 18 años.
          </p>
        </div>
      </div>
    </>
  );
}
