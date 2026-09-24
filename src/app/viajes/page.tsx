"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import VuelosWidget from '@/components/VuelosWidget';
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

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

const KIWI_AFFILIATE_URL = 'https://kiwi.tpo.lv/QQudEv2V';

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

        {/* Banner Kiwi.com Vuelos Promocional */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003831] via-[#005a4e] to-[#01a48c] text-white p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-emerald-900/20">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/15">
              <span className="material-symbols-outlined text-[28px] text-emerald-300">flight_takeoff</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider text-emerald-200">
                  Vuelos Nacionales e Internacionales
                </span>
                <span className="text-white/60 text-xs font-semibold">vía Kiwi.com</span>
              </div>
              <h3 className="font-headline-sm text-base sm:text-lg font-bold leading-tight">
                ¿Buscas vuelos baratos desde o hacia Pucallpa?
              </h3>
              <p className="font-body-md text-xs text-white/80 max-w-xl">
                Compara en tiempo real pasajes aéreos a Lima, Tarapoto, Iquitos y destinos internacionales con las tarifas más bajas.
              </p>
            </div>
          </div>
          <a
            href={KIWI_AFFILIATE_URL}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="shrink-0 bg-white text-[#003831] hover:bg-emerald-50 active:scale-95 font-label-md text-xs sm:text-sm font-bold px-4 py-2.5 rounded-full flex items-center gap-2 shadow-md transition-all self-stretch md:self-auto justify-center"
          >
            <span>Buscar vuelos baratos</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </a>
        </div>

        {/* Buscador de vuelos interactivo Travelpayouts */}
        <VuelosWidget primaryColor="B8130E" />

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
