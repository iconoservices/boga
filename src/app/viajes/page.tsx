"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import VuelosWidget from '@/components/VuelosWidget';
import { useCart } from '@/context/CartContext';
import { fetchViajes } from '@/lib/viajes';
import { fetchNotasRevista, type NotaCard } from '@/lib/revista';

// Viajes & Transporte desde Pucallpa — directorio de agencias de transporte
// fluvial (rápidos), terrestre (colectivos/buses) y aéreo (vuelos).
// Contenido de muestra hasta que se cree una tabla en Supabase.

type Medio = 'todos' | 'fluvial' | 'terrestre' | 'aereo';

const FILTROS: { id: Medio; label: string; icon: string }[] = [
  { id: 'todos',     label: 'Todos',      icon: 'travel_explore' },
  { id: 'fluvial',   label: 'Fluvial',    icon: 'directions_boat' },
  { id: 'terrestre', label: 'Terrestre',  icon: 'directions_bus' },
  { id: 'aereo',     label: 'Aéreo',      icon: 'flight' },
];

type Ruta = {
  id: string;
  medio: 'fluvial' | 'terrestre' | 'aereo';
  destino: string;
  via: string;
  agencia: string;
  duracion: string;
  frecuencia: string;
  precio: string;
  wsp: string;
  icon: string;
  notas?: string;
};

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

const KIWI_AFFILIATE_URL = 'https://kiwi.tpo.lv/QQudEv2V';

// Notas de la Revista ("Yo Soy de la Selva") sobre viajar: rutas, ríos, carreteras y destinos.
// Enlaza contenido real (y de paso refuerza los enlaces internos para Google).
const RE_VIAJE = /viaj|lancha|contamana|boquer|carretera|puente|shanay|cordillera|r[aá]pido|pasaje|aguayt|laguna|catarata/i;

function NotasDeViaje() {
  const [notas, setNotas] = useState<NotaCard[]>([]);
  useEffect(() => {
    fetchNotasRevista().then((todas) => {
      const deViaje = todas.filter((n) => n.kicker === 'Rutas' || RE_VIAJE.test(`${n.titulo} ${n.dek}`));
      setNotas(deViaje.slice(0, 3));
    });
  }, []);
  if (notas.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-headline-sm text-base text-on-surface">Antes de viajar, lee</h2>
        <Link href="/revista" className="text-primary font-label-md text-[12px]">Ver la Revista</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {notas.map((n) => (
          <Link
            key={n.slug}
            href={`/revista/${n.slug}`}
            className="group flex sm:flex-col gap-3 bg-white rounded-2xl border border-surface-container-highest overflow-hidden active:scale-[0.99] transition-transform"
          >
            <img src={n.img} alt="" loading="lazy" className="w-28 h-24 sm:w-full sm:h-32 object-cover shrink-0" />
            <div className="p-3 sm:pt-0 flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary">{n.kicker}</span>
              <span className="font-headline-sm text-[13px] leading-snug text-on-surface line-clamp-3">{n.titulo}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Viajes() {
  const { cartCount, setIsCartOpen } = useCart();
  const [filtro, setFiltro] = useState<Medio>('todos');

  // Solo rutas reales de /api/viajes (sin ejemplos: si no hay ninguna, se avisa).
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [cargado, setCargado] = useState(false);
  useEffect(() => {
    fetchViajes().then((rows) => { setRutas(rows); setCargado(true); });
  }, []);

  const lista = filtro === 'todos' ? rutas : rutas.filter((r) => r.medio === filtro);

  const conteo = {
    fluvial: rutas.filter((r) => r.medio === 'fluvial').length,
    terrestre: rutas.filter((r) => r.medio === 'terrestre').length,
    aereo: rutas.filter((r) => r.medio === 'aereo').length || 'Kiwi',
  };

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-[1200px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-14">

        {/* Encabezado + banner en una sola fila (antes eran dos bloques que repetían lo mismo) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0c4a6e] to-[#1B8EBF] text-white px-5 py-4 flex items-center gap-4">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <span className="relative w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">sailing</span>
          </span>
          <div className="relative min-w-0">
            <h1 className="font-headline-lg text-xl lg:text-2xl font-extrabold leading-tight">Viajes desde Pucallpa</h1>
            <p className="font-body-md text-xs sm:text-sm text-white/80 leading-snug mt-0.5">
              Rápidos por el río Ucayali, buses por la Federico Basadre y vuelos nacionales.
            </p>
          </div>
        </div>

        {/* Filtros por medio — arriba; el número solo sale si hay rutas (antes había tarjetas aparte con "0") */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                filtro === f.id
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{f.icon}</span>
              {f.label}
              {f.id !== 'todos' && typeof conteo[f.id as 'fluvial'|'terrestre'|'aereo'] === 'number' && (conteo[f.id as 'fluvial'|'terrestre'|'aereo'] as number) > 0 && (
                <span className="text-[10px] font-bold opacity-70">{conteo[f.id as 'fluvial'|'terrestre'|'aereo']}</span>
              )}
            </button>
          ))}
        </div>

        {/* Módulo de Vuelos: Buscador en Soles (Travelpayouts) en Rojo Boga */}
        {/* Solo se oculta (no se desmonta): volver a montarlo recargaba el script de Kiwi y duplicaba el buscador. */}
        <div className={filtro === 'todos' || filtro === 'aereo' ? '' : 'hidden'}>
          <VuelosWidget primaryColor="B8130E" />
        </div>

        {/* Grilla de rutas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card Kiwi.com destacada para vuelos */}
          {(filtro === 'todos' || filtro === 'aereo') && (
            <div className="bg-gradient-to-b from-white to-emerald-50/40 rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border-2 border-emerald-500/30 flex flex-col group hover:border-emerald-500 transition-all">
              <div className="px-4 py-3 bg-[#01a48c]/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#01a48c]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px] text-[#00695c]">flight</span>
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-sm text-on-surface leading-tight">Vuelos Pucallpa & Todo el Mundo</h4>
                    <span className="font-label-md text-[10px] text-emerald-700 uppercase tracking-wider font-semibold">
                      Kiwi.com · Comparador oficial
                    </span>
                  </div>
                </div>
                <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Recomendado
                </span>
              </div>

              <div className="p-3.5 flex flex-col gap-2.5 flex-1">
                <div className="flex flex-col gap-1.5 text-[11px] text-secondary font-label-md">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-emerald-600">connecting_airports</span>
                    Pucallpa (PCL) ⇄ Lima, Iquitos, Tarapoto y más
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                    LATAM, Sky, Star Perú y aerolíneas mundiales
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-emerald-600">savings</span>
                    Garantía de conexión y tarifas más económicas
                  </span>
                </div>

                <div className="flex items-end justify-between border-t border-surface-container pt-3 mt-auto">
                  <div className="flex flex-col">
                    <span className="font-price-lg text-emerald-700 text-base leading-none">Ofertas del día</span>
                    <span className="text-secondary font-label-md text-[10px] mt-0.5">según fecha de viaje</span>
                  </div>
                  <a
                    href={KIWI_AFFILIATE_URL}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex items-center gap-1.5 bg-[#01a48c] hover:bg-[#008f79] text-white text-[12px] font-label-md px-3.5 py-1.5 rounded-full active:scale-95 transition-all shadow-sm font-semibold"
                  >
                    <span>Cotizar vuelo</span>
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {cargado && lista.length === 0 && filtro !== 'aereo' && filtro !== 'todos' && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-surface-container-highest p-8 text-center">
              <span className="material-symbols-outlined text-secondary/40 text-[32px]">directions_boat</span>
              <p className="font-headline-sm text-sm text-on-surface mt-2">
                {rutas.length === 0 ? 'Todavía no hay rutas publicadas' : 'No hay rutas de este tipo por ahora'}
              </p>
              <p className="text-secondary font-body-md text-xs mt-1">
                {rutas.length === 0 ? 'Muy pronto: rápidos y buses desde Pucallpa.' : 'Prueba con otro medio de transporte.'}
              </p>
            </div>
          )}
          {lista.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
              {/* Header con ícono y destino */}
              <div className={`px-4 py-3 flex items-center gap-3 ${
                r.medio === 'fluvial' ? 'bg-[#1B8EBF]/5' :
                r.medio === 'terrestre' ? 'bg-[#E8894A]/5' : 'bg-[#8B7FD4]/5'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  r.medio === 'fluvial' ? 'bg-[#1B8EBF]/15' :
                  r.medio === 'terrestre' ? 'bg-[#E8894A]/15' : 'bg-[#8B7FD4]/15'
                }`}>
                  <span className={`material-symbols-outlined text-[22px] ${
                    r.medio === 'fluvial' ? 'text-[#1B8EBF]' :
                    r.medio === 'terrestre' ? 'text-[#E8894A]' : 'text-[#8B7FD4]'
                  }`}>{r.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-headline-sm text-sm text-on-surface leading-tight">{r.destino}</h4>
                  <span className="font-label-md text-[10px] text-secondary uppercase tracking-wider">
                    {r.medio === 'fluvial' ? 'Rápido fluvial' : r.medio === 'terrestre' ? 'Terrestre' : 'Vuelo'}
                  </span>
                </div>
              </div>

              <div className="p-3 flex flex-col gap-2 flex-1">
                {/* Detalles */}
                <div className="flex flex-col gap-1.5 text-[11px] text-secondary font-label-md">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">route</span>
                    {r.via}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">business</span>
                    {r.agencia}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {r.duracion} · {r.frecuencia}
                  </span>
                </div>

                {r.notas && (
                  <p className="text-[10px] text-secondary/70 font-body-md bg-surface-container-low rounded-lg px-2.5 py-1.5 mt-0.5">
                    💡 {r.notas}
                  </p>
                )}

                {/* Precio + WhatsApp */}
                <div className="flex items-end justify-between border-t border-surface-container pt-2.5 mt-auto">
                  <div className="flex flex-col">
                    <span className="font-price-lg text-primary text-base leading-none">{r.precio}</span>
                    <span className="text-secondary font-label-md text-[10px] mt-0.5">por persona</span>
                  </div>
                  <a
                    href={waLink(r.wsp, `Hola, vi la ruta "${r.destino}" (${r.medio}) en Viajes de BogaHub. ¿Tienen disponibilidad?`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-[#25D366] text-white text-[12px] font-label-md px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                    Consultar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <NotasDeViaje />

        {/* CTA para agencias */}
        <a
          href={waLink('51963000000', 'Hola BogaHub, soy agencia de transporte y quiero aparecer en la sección Viajes.')}
          target="_blank"
          rel="noreferrer"
          className="relative overflow-hidden rounded-2xl bg-inverse-surface text-inverse-on-surface p-4 flex items-center gap-3 group"
        >
          <div className="absolute -right-8 -top-10 w-40 h-40 bg-[#1B8EBF]/20 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <div className="w-11 h-11 rounded-xl bg-[#1B8EBF]/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#1B8EBF] text-[22px]">add_business</span>
          </div>
          <div className="relative flex flex-col min-w-0 flex-1">
            <span className="font-headline-sm text-sm leading-tight">¿Eres agencia de transporte?</span>
            <span className="text-inverse-on-surface/70 font-body-md text-xs mt-0.5">Aparece aquí gratis y recibe pasajeros por WhatsApp</span>
          </div>
          <span className="material-symbols-outlined text-inverse-on-surface/60 shrink-0 group-hover:translate-x-1 transition-transform">chevron_right</span>
        </a>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          Los horarios y precios son referenciales. Confirma directamente con la agencia antes de viajar. BogaHub solo conecta.
        </p>
      </main>
    </>
  );
}
