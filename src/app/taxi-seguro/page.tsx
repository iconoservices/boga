"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

// Taxi Seguro: por ahora es SOLO UN DIRECTORIO de choferes verificados
// (mototaxi / auto / moto). No hay reserva ni pago dentro de la app todavía —
// el pasajero llama o escribe por WhatsApp directo. Data curada a mano.
// Tarjeta inspirada en el mockup de Stitch: perfil + placa + sellos de
// confianza + tarifa comunitaria de referencia + reseña de un vecino.

type Filtro = 'Todos' | 'Mototaxi' | 'Auto' | 'Moto';

const VERDE = '#0b7a48';
const VERDE_SOFT = '#d7f0e2';

type Chofer = {
  id: string;
  nombre: string;
  tipo: Exclude<Filtro, 'Todos'>;
  comite: string;
  experiencia: string;
  placa: string;
  modelo: string;
  sellos: { label: string; icon: string; fuerte?: boolean }[];
  ruta: string;
  precio: string;
  paradero: string;
  resena: string;
  resenaAutor: string;
  tel: string;
  img: string;
  vehImg: string;
};

const CHOFERES: Chofer[] = [
  {
    id: 'c1',
    nombre: 'Luz Marina Rengifo',
    tipo: 'Mototaxi',
    comite: 'Comité Femenino La Selva · Unidad #019',
    experiencia: '5 años transportando familias',
    placa: '4312-8U',
    modelo: 'Motokar Honda CG125',
    sellos: [
      { label: 'DNI Validado', icon: 'badge', fuerte: true },
      { label: 'SOAT Vigente 2025', icon: 'health_and_safety', fuerte: true },
      { label: 'Licencia B-IIc', icon: 'directions_car' },
      { label: 'Favorita Familias', icon: 'favorite' },
    ],
    ruta: 'Plaza de Armas ⇄ Open Plaza',
    precio: 'S/ 4.00 – S/ 5.00',
    paradero: 'Jr. Tacna c/ Jr. Sucre',
    resena: 'Viajo siempre con mis dos hijos y Luz maneja con muchísima precaución. Súper atenta y honrada.',
    resenaAutor: 'Carmen Soto, comerciante Mercado 2 (5.0 ★)',
    tel: '51962000001',
    img: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&q=80',
    vehImg: 'https://images.unsplash.com/photo-1591257670606-2f2c8e6c0d0c?w=400&q=80',
  },
  {
    id: 'c2',
    nombre: 'Segundo Vásquez Pinedo',
    tipo: 'Mototaxi',
    comite: 'Comité 14 · Yarinacocha · Unidad #038',
    experiencia: '9 años de chofer en la región',
    placa: '9841-7U',
    modelo: 'Bajaj Torito 4T',
    sellos: [
      { label: 'DNI Validado', icon: 'badge', fuerte: true },
      { label: 'SOAT Vigente 2025', icon: 'health_and_safety', fuerte: true },
      { label: 'Licencia B-IIc', icon: 'directions_car' },
      { label: 'Récord Limpio', icon: 'gavel' },
    ],
    ruta: 'Plaza de Armas ⇄ Embarcadero',
    precio: 'S/ 5.00 – S/ 6.00',
    paradero: 'Embarcadero Yarinacocha',
    resena: 'Segundo maneja tranquilo sin correr por las pistas rotas. Súper respetuoso y el mototaxi siempre huele a limpio.',
    resenaAutor: 'Fiorella R., vecina de Jr. Raymondi (5.0 ★)',
    tel: '51962000002',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    vehImg: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400&q=80',
  },
  {
    id: 'c3',
    nombre: 'Carlos Dávila Ruiz',
    tipo: 'Auto',
    comite: 'Asociación Radio Taxi Ucayali · Móvil 12',
    experiencia: '14 años de experiencia en ruta',
    placa: 'U1B-624',
    modelo: 'Toyota Yaris (aire acond.)',
    sellos: [
      { label: 'DNI Validado', icon: 'badge', fuerte: true },
      { label: 'SOAT Vigente 2025', icon: 'health_and_safety', fuerte: true },
      { label: 'Licencia A-IIa', icon: 'directions_car' },
      { label: 'Aire Acondicionado', icon: 'ac_unit' },
    ],
    ruta: 'Plaza de Armas ⇄ UNU / Aeropuerto',
    precio: 'S/ 10.00 – S/ 12.00',
    paradero: 'Frontis Univ. Nacional de Ucayali',
    resena: 'Puntual para traslados al aeropuerto FAP David Abenzur. Aire acondicionado prendido que te salva del calor.',
    resenaAutor: 'Ing. Marco Tello, docente UNU (4.9 ★)',
    tel: '51962000003',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    vehImg: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&q=80',
  },
  {
    id: 'c4',
    nombre: 'Jhonatan Meléndez',
    tipo: 'Moto',
    comite: 'Rápido Ucayali Express · Unidad #07',
    experiencia: '6 años en delivery y carreras express',
    placa: '5190-7U',
    modelo: 'Honda GL 150 (casco extra)',
    sellos: [
      { label: 'DNI Validado', icon: 'badge', fuerte: true },
      { label: 'SOAT Vigente 2025', icon: 'health_and_safety', fuerte: true },
      { label: 'Casco Pasajero', icon: 'sports_motorsports' },
      { label: 'Despacho Rápido', icon: 'bolt' },
    ],
    ruta: 'Puerto El Reloj ⇄ Manantay',
    precio: 'S/ 3.50 – S/ 4.50',
    paradero: 'Malecón El Reloj Público',
    resena: 'Te lleva al puerto al toque cuando sale lancha rápida. Siempre lleva casco limpio para el pasajero.',
    resenaAutor: 'Edwin T., comerciante maderero (4.8 ★)',
    tel: '51962000004',
    img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&q=80',
    vehImg: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80',
  },
  {
    id: 'c5',
    nombre: 'Rosa Shahuano',
    tipo: 'Auto',
    comite: 'Taxi Seguro Manantay · Móvil 04',
    experiencia: '8 años · escolares y adultos mayores',
    placa: 'X1F-203',
    modelo: 'Kia Rio sedán',
    sellos: [
      { label: 'DNI Validado', icon: 'badge', fuerte: true },
      { label: 'SOAT Vigente 2025', icon: 'health_and_safety', fuerte: true },
      { label: 'Licencia A-IIa', icon: 'directions_car' },
      { label: 'Favorita Familias', icon: 'favorite' },
    ],
    ruta: 'Manantay ⇄ Hospital Regional',
    precio: 'S/ 7.00 – S/ 9.00',
    paradero: 'Óvalo Manantay',
    resena: 'Llevo a mi mamá a sus controles y Rosa la espera sin apuro. De total confianza.',
    resenaAutor: 'Lida P., vecina de Manantay (5.0 ★)',
    tel: '51962000005',
    img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
    vehImg: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&q=80',
  },
  {
    id: 'c6',
    nombre: 'Miguel Fasabi',
    tipo: 'Mototaxi',
    comite: 'Comité Centro · Unidad #052',
    experiencia: '11 años · conoce toda la ciudad',
    placa: 'A9-3320',
    modelo: 'Motokar Bajaj RE',
    sellos: [
      { label: 'DNI Validado', icon: 'badge', fuerte: true },
      { label: 'SOAT Vigente 2025', icon: 'health_and_safety', fuerte: true },
      { label: 'Licencia B-IIc', icon: 'directions_car' },
      { label: 'Récord Limpio', icon: 'gavel' },
    ],
    ruta: 'Centro ⇄ Mercado Nº 3',
    precio: 'S/ 3.00 – S/ 4.00',
    paradero: 'Jr. Ucayali c/ Jr. Tacna',
    resena: 'Le pido que me lleve a cualquier dirección y la ubica sin renegar. Precio justo siempre.',
    resenaAutor: 'Napoleón G., vecino del Centro (4.7 ★)',
    tel: '51962000006',
    img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80',
    vehImg: 'https://images.unsplash.com/photo-1597762333765-8b0e2f2f3f4a?w=400&q=80',
  },
];

const ICONO: Record<string, string> = { Mototaxi: 'electric_rickshaw', Auto: 'directions_car', Moto: 'two_wheeler' };

function DriverCard({ c }: { c: Chofer }) {
  const waText = encodeURIComponent(
    `Hola ${c.nombre.split(' ')[0]}, lo/la vi en Boga · Taxi Seguro. ¿Está libre para una carrera?\nOrigen: \nDestino: `
  );

  return (
    <article className="bg-white rounded-2xl border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)] p-4 lg:p-5 flex flex-col gap-3.5 hover:shadow-lg transition-shadow">
      {/* Perfil + placa */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container-low">
              <img src={c.img} alt={c.nombre} className="w-full h-full object-cover" />
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
              style={{ backgroundColor: VERDE }}
              title="Verificado por Boga"
            >
              <span className="material-symbols-outlined text-white text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-[15px] text-on-surface leading-tight line-clamp-1">{c.nombre}</h3>
            <span className="block font-label-md text-[11px] font-bold leading-tight mt-0.5" style={{ color: VERDE }}>{c.comite}</span>
            <span className="flex items-center gap-1 text-secondary font-body-md text-[11px] mt-0.5">
              <span className="material-symbols-outlined text-tertiary text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
              {c.experiencia}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="bg-[#FDE047] text-[#0F172A] font-price-lg text-[15px] px-2 py-0.5 rounded tracking-[0.12em] font-mono shadow-sm whitespace-nowrap">
            {c.placa}
          </span>
          <span className="font-label-md text-[10px] text-secondary mt-1 text-right leading-tight">{c.modelo}</span>
        </div>
      </div>

      {/* Sellos de confianza */}
      <div className="flex flex-wrap gap-1.5">
        {c.sellos.map((s) => (
          <span
            key={s.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-md text-[10px] leading-tight ${
              s.fuerte ? '' : 'bg-surface-container-high text-on-surface-variant'
            }`}
            style={s.fuerte ? { backgroundColor: VERDE_SOFT, color: VERDE } : undefined}
          >
            <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
            {s.label}
          </span>
        ))}
      </div>

      {/* Tarifa comunitaria de referencia */}
      <div className="flex gap-3 bg-surface-container-low rounded-xl p-2.5">
        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-container">
          <img src={c.vehImg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex flex-col justify-center">
          <span className="font-label-md text-[9px] uppercase tracking-[0.14em] text-secondary">Tarifa comunitaria habitual</span>
          <span className="font-headline-sm text-[13px] text-on-surface leading-snug mt-0.5">
            {c.ruta}: <span className="text-primary">{c.precio}</span>
          </span>
          <span className="font-body-md text-[11px] text-secondary mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">location_on</span>
            Paradero: {c.paradero}
          </span>
        </div>
      </div>

      {/* Reseña de un vecino */}
      <div className="flex gap-2 rounded-xl border border-surface-container-high p-2.5">
        <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">format_quote</span>
        <div>
          <p className="font-body-md text-[12px] text-on-surface italic leading-snug">“{c.resena}”</p>
          <span className="block font-label-md text-[10px] text-secondary font-bold mt-1">— {c.resenaAutor}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-2 border-t border-surface-container pt-3">
        <a
          href={`tel:+${c.tel}`}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md text-[12px] hover:bg-surface-container-highest active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[17px]">call</span>
          Llamar directo
        </a>
        <a
          href={`https://wa.me/${c.tel}?text=${waText}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-[12px] shadow-sm hover:bg-primary-container active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
          Pedir por WhatsApp
        </a>
      </div>
    </article>
  );
}

export default function TaxiSeguro() {
  const { cartCount, setIsCartOpen } = useCart();
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const lista = filtro === 'Todos' ? CHOFERES : CHOFERES.filter((c) => c.tipo === filtro);
  const cuenta = (f: Filtro) => (f === 'Todos' ? CHOFERES.length : CHOFERES.filter((c) => c.tipo === f).length);

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      {/* Banda cívica */}
      <div className="bg-on-surface text-background">
        <div className="max-w-[1440px] mx-auto px-container-margin lg:px-6 py-2 flex items-center gap-2 text-[11px] font-label-md">
          <span className="material-symbols-outlined text-[14px]" style={{ color: VERDE_SOFT }}>local_police</span>
          Padrón cívico vecinal · choferes con antecedentes y documentos revisados
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-12">

        {/* Encabezado + métricas */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex flex-col gap-1.5 max-w-xl">
            <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-white shadow-sm font-label-md text-[10px] uppercase tracking-wider" style={{ color: VERDE }}>
              <span className="material-symbols-outlined text-[13px]">local_taxi</span>
              Seguridad vial ciudadana
            </span>
            <h1 className="font-headline-lg text-on-surface tracking-tight text-2xl lg:text-3xl">Muévete tranquilo por Pucallpa</h1>
            <p className="text-secondary font-body-md text-sm">
              Choferes verificados por la comunidad Boga. Los contactas directo por llamada o WhatsApp — sin tarifas ocultas ni comisiones a intermediarios.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-white rounded-2xl border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)] p-4 lg:w-[360px] shrink-0">
            {[
              { k: 'Sin comisiones', v: '100%', s: 'Pago directo', c: VERDE },
              { k: 'Filtrados', v: '5 puntos', s: 'DNI · SOAT · Placa', c: 'var(--color-primary)' },
              { k: 'Satisfacción', v: '4.9★', s: '+3,400 viajes', c: 'var(--color-tertiary)' },
            ].map((m, i) => (
              <div key={m.k} className={`flex flex-col ${i > 0 ? 'border-l border-surface-container pl-3' : ''}`}>
                <span className="font-label-md text-[9px] text-secondary uppercase tracking-wide leading-tight">{m.k}</span>
                <span className="font-headline-md text-[17px] font-extrabold leading-tight mt-0.5" style={{ color: m.c }}>{m.v}</span>
                <span className="font-body-md text-[10px] text-secondary leading-tight">{m.s}</span>
              </div>
            ))}
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
              <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] ${filtro === f ? 'bg-white/20' : 'bg-surface-container-high text-secondary'}`}>
                {cuenta(f)}
              </span>
            </button>
          ))}
        </div>

        {/* Directorio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {lista.map((c) => (
            <DriverCard key={c.id} c={c} />
          ))}
        </div>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          Boga solo conecta pasajeros y choferes verificados. La tarifa se acuerda directamente entre las partes.
        </p>
      </main>
    </>
  );
}
