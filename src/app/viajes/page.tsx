"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchViajes } from '@/lib/viajes';

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

const RUTAS: Ruta[] = [
  // ── Fluviales (Rápidos) ──
  {
    id: 'f1', medio: 'fluvial', destino: 'Contamana',
    via: 'Río Ucayali · Puerto Henry / La Hoyada',
    agencia: 'Rápidos Eduardo', duracion: '~10–12 h', frecuencia: 'Diario, 5:00 AM',
    precio: 'S/ 80–120', wsp: '51963000000', icon: 'directions_boat',
    notas: 'Llevar agua, comida y protector solar. Chaleco incluido.',
  },
  {
    id: 'f2', medio: 'fluvial', destino: 'Atalaya',
    via: 'Río Ucayali · Puerto Henry',
    agencia: 'Transportes Fluviales Atalaya', duracion: '~2–3 días', frecuencia: 'Semanal (lunes y jueves)',
    precio: 'S/ 150–200', wsp: '51963000000', icon: 'directions_boat',
    notas: 'Incluye hamaca. Comida a bordo disponible.',
  },
  {
    id: 'f3', medio: 'fluvial', destino: 'Orellana / Bolognesi',
    via: 'Río Ucayali · La Hoyada',
    agencia: 'Rápidos Mishael', duracion: '~6–8 h', frecuencia: 'Diario, 6:00 AM',
    precio: 'S/ 60–90', wsp: '51963000000', icon: 'directions_boat',
  },
  {
    id: 'f4', medio: 'fluvial', destino: 'Iquitos',
    via: 'Río Ucayali → Marañón → Amazonas',
    agencia: 'Lancha Henry / Eduardo', duracion: '~5–7 días', frecuencia: 'Semanal',
    precio: 'S/ 200–350', wsp: '51963000000', icon: 'directions_boat',
    notas: 'Ruta larga. Recomendado llevar hamaca y provisiones.',
  },

  // ── Terrestres ──
  {
    id: 't1', medio: 'terrestre', destino: 'Lima',
    via: 'Carretera Federico Basadre → Central',
    agencia: 'Turismo Central / León de Huánuco', duracion: '~18–20 h', frecuencia: 'Diario, varias salidas',
    precio: 'S/ 60–120', wsp: '51963000000', icon: 'directions_bus',
    notas: 'Buses cama y semi-cama. Terminal Terrestre Pucallpa.',
  },
  {
    id: 't2', medio: 'terrestre', destino: 'Huánuco',
    via: 'Carretera Federico Basadre',
    agencia: 'Turismo Central / Bahía', duracion: '~8–10 h', frecuencia: 'Diario',
    precio: 'S/ 35–55', wsp: '51963000000', icon: 'directions_bus',
  },
  {
    id: 't3', medio: 'terrestre', destino: 'Tingo María',
    via: 'Carretera Federico Basadre',
    agencia: 'Bahía Continental', duracion: '~5–6 h', frecuencia: 'Diario',
    precio: 'S/ 25–40', wsp: '51963000000', icon: 'directions_bus',
  },
  {
    id: 't4', medio: 'terrestre', destino: 'Aguaytía',
    via: 'Carretera Federico Basadre',
    agencia: 'Colectivos y combis', duracion: '~2–3 h', frecuencia: 'Cada 30 min',
    precio: 'S/ 15–25', wsp: '51963000000', icon: 'directions_bus',
    notas: 'Colectivos desde el Paradero de Aguaytía.',
  },

  // ── Aéreos ──
  {
    id: 'a1', medio: 'aereo', destino: 'Lima (Jorge Chávez)',
    via: 'Aeropuerto FAP David Abensur Rengifo',
    agencia: 'LATAM / Sky Airline / Star Perú', duracion: '~1 h 10 min', frecuencia: 'Diario, varios vuelos',
    precio: 'S/ 120–350', wsp: '51963000000', icon: 'flight',
    notas: 'Comprar con anticipación para mejores precios.',
  },
  {
    id: 'a2', medio: 'aereo', destino: 'Iquitos',
    via: 'Aeropuerto FAP David Abensur Rengifo',
    agencia: 'Star Perú', duracion: '~1 h', frecuencia: '2–3 veces por semana',
    precio: 'S/ 150–300', wsp: '51963000000', icon: 'flight',
  },
];

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export default function Viajes() {
  const { cartCount, setIsCartOpen } = useCart();
  const [filtro, setFiltro] = useState<Medio>('todos');

  // Rutas reales de /api/viajes; mientras la tabla esté vacía, las de muestra.
  const [rutas, setRutas] = useState<Ruta[]>(RUTAS);
  useEffect(() => {
    fetchViajes().then((rows) => { if (rows.length > 0) setRutas(rows); });
  }, []);

  const lista = filtro === 'todos' ? rutas : rutas.filter((r) => r.medio === filtro);

  const conteo = {
    fluvial: rutas.filter((r) => r.medio === 'fluvial').length,
    terrestre: rutas.filter((r) => r.medio === 'terrestre').length,
    aereo: rutas.filter((r) => r.medio === 'aereo').length,
  };

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-[1200px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-14">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-on-surface">Viajes 🚤</h1>
          <p className="text-secondary font-body-md text-sm">Rápidos fluviales, buses terrestres y vuelos desde Pucallpa.</p>
        </div>

        {/* Banner informativo */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0c4a6e] to-[#1B8EBF] text-white p-5 lg:p-6">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <div className="absolute right-4 bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[80px]">sailing</span>
          </div>
          <div className="relative flex flex-col gap-2 max-w-lg">
            <span className="text-[10px] font-label-md uppercase tracking-[0.2em] text-white/60">Transporte interprovincial</span>
            <h2 className="font-headline-sm text-lg font-bold leading-tight">
              ¿A dónde vas? Te conectamos con los medios de transporte de la selva
            </h2>
            <p className="font-body-md text-xs text-white/70 leading-relaxed">
              Encuentra rápidos fluviales por el río Ucayali, colectivos y buses por la Federico Basadre, y vuelos nacionales desde el aeropuerto de Pucallpa.
            </p>
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1B8EBF]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#1B8EBF] text-[20px]">directions_boat</span>
            </div>
            <div>
              <span className="font-headline-sm text-sm text-on-surface">{conteo.fluvial}</span>
              <span className="block font-label-md text-[10px] text-secondary">Rutas fluviales</span>
            </div>
          </div>
          <div className="bg-white border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8894A]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#E8894A] text-[20px]">directions_bus</span>
            </div>
            <div>
              <span className="font-headline-sm text-sm text-on-surface">{conteo.terrestre}</span>
              <span className="block font-label-md text-[10px] text-secondary">Rutas terrestres</span>
            </div>
          </div>
          <div className="bg-white border border-surface-container-highest rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8B7FD4]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#8B7FD4] text-[20px]">flight</span>
            </div>
            <div>
              <span className="font-headline-sm text-sm text-on-surface">{conteo.aereo}</span>
              <span className="block font-label-md text-[10px] text-secondary">Rutas aéreas</span>
            </div>
          </div>
        </div>

        {/* Filtros por medio */}
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
            </button>
          ))}
        </div>

        {/* Grilla de rutas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
