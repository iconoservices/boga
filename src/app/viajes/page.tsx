"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import ViajesCabecera from '@/components/ViajesCabecera';
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
  { id: 'aereo',     label: 'Vuelos',     icon: 'flight' },
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
    const m = new URLSearchParams(window.location.search).get('medio');
    if (m === 'fluvial' || m === 'terrestre') setFiltro(m);
  }, []);
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

        <ViajesCabecera
          activo={filtro}
          titulo="Viajes desde Pucallpa"
          subtitulo="Rápidos por el río Ucayali, buses por la Federico Basadre y vuelos nacionales."
          onSelect={setFiltro}
          conteo={{ fluvial: conteo.fluvial, terrestre: conteo.terrestre }}
        />

        {/* Para agencias: arriba y compacto, así lo ve quien quiere anunciarse (antes estaba al final de la página) */}
        <a
          href={waLink('51963000000', 'Hola BogaHub, soy agencia de transporte y quiero aparecer en la sección Viajes.')}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-inverse-surface text-inverse-on-surface px-3 py-2.5 flex items-center gap-2.5 active:scale-[0.99] transition-transform"
        >
          <span className="w-9 h-9 rounded-lg bg-[#1B8EBF]/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#1B8EBF] text-[20px]">add_business</span>
          </span>
          <span className="flex flex-col min-w-0 flex-1 leading-tight">
            <span className="font-headline-sm text-[13px]">¿Eres agencia de transporte?</span>
            <span className="text-[11px] text-inverse-on-surface/70 mt-0.5">Aparece aquí gratis y recibe pasajeros por WhatsApp</span>
          </span>
          <span className="material-symbols-outlined text-inverse-on-surface/60 shrink-0">chevron_right</span>
        </a>

        {/* Grilla de rutas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Puerta a los vuelos (el buscador vive en /viajes/vuelos) */}
          {filtro === 'todos' && (
            <Link
              href="/viajes/vuelos"
              className="col-span-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#8a0d09] via-[#B8130E] to-[#d6281e] text-white p-4 sm:p-5 flex items-center gap-4 active:scale-[0.99] transition-transform"
            >
              <div className="absolute -right-8 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
              <span className="relative w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">flight_takeoff</span>
              </span>
              <span className="relative min-w-0 flex-1 leading-tight">
                <span className="block font-headline-sm text-base sm:text-lg font-bold">Compra tu pasaje o cotiza tu vuelo con Boga</span>
                <span className="block font-body-md text-xs sm:text-sm text-white/80 mt-0.5">Compara tarifas desde Pucallpa, en soles</span>
              </span>
              <span className="relative hidden sm:inline-flex items-center gap-1 bg-white text-[#B8130E] text-sm font-label-md font-bold px-4 py-2 rounded-full group-hover:opacity-90">
                Buscar vuelos
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
              <span className="relative sm:hidden material-symbols-outlined text-[22px] text-white/80">chevron_right</span>
            </Link>
          )}
          {cargado && lista.length === 0 && (
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

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          Los horarios y precios son referenciales. Confirma directamente con la agencia antes de viajar. BogaHub solo conecta.
        </p>
      </main>
    </>
  );
}
