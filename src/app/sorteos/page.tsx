"use client";

import React, { useEffect, useRef, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchSorteos, type Sorteo } from '@/lib/sorteos';
import { hoyLima } from '@/lib/fechaLima';

// Sorteos de BogaHub: sorteos patrocinados por negocios de Pucallpa. Cada sorteo
// tiene una META de tickets; a medida que se van registrando, la barra se llena y
// cuando llega a la meta el sorteo se hace solo, al azar, en el servidor.
// Todo sale de /api/sorteos (datos reales; sin ejemplos: si no hay sorteos, se avisa).
// Se administran desde /superadmin/sorteos.

const LIMA = '#c9f24a';
const WHATSAPP_BOGAHUB = '51961000000';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaCorta(iso?: string) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return y && m && d ? `${d} ${MESES[m - 1]}` : '';
}

// Días que faltan hasta una fecha AAAA-MM-DD (hora de Perú). null si no hay fecha.
function diasHasta(iso?: string): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const [hy, hm, hd] = hoyLima().split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(hy, hm - 1, hd)) / 86400000);
}

function waParticipar(titulo: string) {
  const texto = `Hola BogaHub, quiero participar en el sorteo «${titulo}».`;
  return `https://wa.me/${WHATSAPP_BOGAHUB}?text=${encodeURIComponent(texto)}`;
}

function Barra({ vendidos, meta, fechaSorteo, grande = false }: { vendidos: number; meta: number | null; fechaSorteo?: string; grande?: boolean }) {
  // Sin meta = sorteo por fecha: no hay contador de tickets, solo la cuenta regresiva.
  if (!meta) {
    const dias = diasHasta(fechaSorteo);
    return (
      <div className={`flex items-center gap-1.5 font-label-md text-white/80 ${grande ? 'text-xs' : 'text-[11px]'}`}>
        <span className="material-symbols-outlined text-[16px]" style={{ color: LIMA }}>event</span>
        <span>
          Se sortea el <b className="text-white">{fechaCorta(fechaSorteo)}</b>
          {dias !== null && (dias <= 0 ? ' · ¡hoy!' : dias === 1 ? ' · ¡mañana!' : ` · faltan ${dias} días`)}
        </span>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((vendidos / meta) * 100));
  const faltan = Math.max(0, meta - vendidos);
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`${grande ? 'h-3' : 'h-2'} rounded-full bg-white/15 overflow-hidden`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: LIMA }} />
      </div>
      <div className="flex items-center justify-between font-label-md text-white/70">
        <span className={grande ? 'text-xs' : 'text-[11px]'}><b className="text-white">{vendidos}</b> de {meta} tickets</span>
        <span className={grande ? 'text-xs' : 'text-[11px]'} style={{ color: LIMA }}>
          {faltan === 0 ? '¡Lleno!' : faltan <= Math.max(3, Math.round(meta * 0.1)) ? `¡Faltan solo ${faltan}!` : `${pct}%`}
        </span>
      </div>
    </div>
  );
}

function TarjetaSorteo({ s, etiqueta }: { s: Sorteo; etiqueta: string }) {
  return (
    <article className="rounded-2xl bg-white/[0.06] border border-white/15 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_1.1fr] h-full">
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[300px] bg-gradient-to-br from-[#5b21b6] to-[#312e81]">
        {s.img && <img src={s.img} alt={s.titulo} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {s.patrocinador && (
          <span className="absolute top-3 left-3 bg-black/55 backdrop-blur-sm text-white text-[11px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>Patrocina {s.patrocinador}
          </span>
        )}
      </div>
      <div className="p-4 lg:p-6 flex flex-col gap-3">
        <span className="w-fit text-[10px] font-label-md uppercase tracking-wider px-2 py-0.5 rounded-full text-[#2a1155]" style={{ backgroundColor: LIMA }}>{etiqueta}</span>
        <h2 className="font-headline-lg font-extrabold text-xl lg:text-3xl leading-tight">{s.titulo}</h2>
        {s.descripcion && <p className="text-white/75 font-body-md text-sm leading-relaxed whitespace-pre-line line-clamp-3">{s.descripcion}</p>}
        <Barra vendidos={s.vendidos} meta={s.meta} fechaSorteo={s.cierraEl} grande />
        <ul className="text-white/80 font-body-md text-xs flex flex-col gap-1">
          {s.comoParticipar && <li className="flex items-start gap-1.5"><span className="material-symbols-outlined text-[15px] mt-px" style={{ color: LIMA }}>confirmation_number</span>{s.comoParticipar}</li>}
          {s.precioTicket && <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[15px]" style={{ color: LIMA }}>sell</span>Ticket: {s.precioTicket}</li>}
          {s.cierraEl && s.meta && <li className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[15px]" style={{ color: LIMA }}>schedule</span>Cierra el {fechaCorta(s.cierraEl)} o al llenarse</li>}
        </ul>
        <a
          href={waParticipar(s.titulo)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto w-full sm:w-fit flex items-center justify-center gap-1.5 font-headline-sm text-sm text-[#2a1155] px-6 py-3 rounded-full active:scale-95 transition-transform"
          style={{ backgroundColor: LIMA }}
        >
          ¡Quiero participar!
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </a>
      </div>
    </article>
  );
}

// Carrusel: una tarjeta grande por sorteo abierto. Se desliza con el dedo o con las
// flechas, y los puntitos muestran en cuál vas. Con un solo sorteo no hay controles.
function CarruselSorteos({ items }: { items: Sorteo[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const n = items.length;

  const ir = (i: number) => {
    const el = pista.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(n - 1, i));
    el.scrollTo({ left: destino * el.clientWidth, behavior: 'smooth' });
  };

  const alDeslizar = () => {
    const el = pista.current;
    if (el && el.clientWidth) setActual(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative">
      <div
        ref={pista}
        onScroll={alDeslizar}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar rounded-2xl"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((s, i) => (
          <div key={s.id} className="snap-start shrink-0 w-full">
            <TarjetaSorteo s={s} etiqueta={n > 1 ? `Sorteo ${i + 1} de ${n}` : 'Sorteo destacado'} />
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Sorteo anterior"
            onClick={() => ir(actual - 1)}
            disabled={actual === 0}
            className="hidden md:flex absolute left-2 top-[150px] -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#3a1a6e] items-center justify-center shadow-lg disabled:opacity-30 active:scale-90 transition"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            aria-label="Sorteo siguiente"
            onClick={() => ir(actual + 1)}
            disabled={actual === n - 1}
            className="hidden md:flex absolute right-2 top-[150px] -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#3a1a6e] items-center justify-center shadow-lg disabled:opacity-30 active:scale-90 transition"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <div className="flex justify-center gap-1.5 mt-3">
            {items.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Ir al sorteo ${i + 1}`}
                onClick={() => ir(i)}
                className={`h-1.5 rounded-full transition-all ${i === actual ? 'w-6' : 'w-1.5 bg-white/35'}`}
                style={i === actual ? { backgroundColor: LIMA } : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
