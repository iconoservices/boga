"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// Yapu = tablero local de chamba. Por ahora es un DIRECTORIO curado a mano
// (sin tabla en Supabase todavía): gente que ofrece su oficio y avisos de
// trabajo de negocios de la zona. El contacto sale por WhatsApp directo.

type Vista = 'servicios' | 'empleos';

const SERVICIOS = [
  { id: 'elec1',  nombre: 'Marco Ríos',      oficio: 'Electricista domiciliario', zona: 'Yarinacocha',   rating: '4.9', trabajos: 120, wsp: '51961000001', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80' },
  { id: 'gas1',   nombre: 'Lucía Panduro',   oficio: 'Gasfitería y destape',       zona: 'Callería',      rating: '4.8', trabajos: 86,  wsp: '51961000002', img: 'https://images.unsplash.com/photo-1580281658626-ee379f3cce93?w=300&q=80' },
  { id: 'jard1',  nombre: 'Pedro Sangama',   oficio: 'Jardinería y poda',          zona: 'Manantay',      rating: '4.7', trabajos: 54,  wsp: '51961000003', img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&q=80' },
  { id: 'foto1',  nombre: 'Karen Vela',      oficio: 'Fotografía de eventos',      zona: 'Pucallpa centro', rating: '5.0', trabajos: 41, wsp: '51961000004', img: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=300&q=80' },
  { id: 'lim1',   nombre: 'Rosa Isuiza',     oficio: 'Limpieza de casas y oficinas', zona: 'Callería',    rating: '4.9', trabajos: 200, wsp: '51961000005', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80' },
  { id: 'carp1',  nombre: 'Julio Ramírez',   oficio: 'Carpintería a medida',       zona: 'Manantay',      rating: '4.8', trabajos: 73,  wsp: '51961000006', img: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=300&q=80' },
];

const EMPLEOS = [
  { id: 'e1', puesto: 'Mozo / Moza',            negocio: 'La Anaconda Parrillas', tipo: 'Tiempo completo', zona: 'Yarinacocha',     pago: 'S/ 1200 + propinas', wsp: '51961000010' },
  { id: 'e2', puesto: 'Repartidor con moto',    negocio: 'Boga Market',            tipo: 'Medio tiempo',    zona: 'Toda la ciudad',  pago: 'S/ 900 + delivery', wsp: '51961000011' },
  { id: 'e3', puesto: 'Cocinero/a de línea',    negocio: 'Doña Fela',              tipo: 'Tiempo completo', zona: 'Callería',        pago: 'A convenir',        wsp: '51961000012' },
  { id: 'e4', puesto: 'Cajero/a de tienda',     negocio: 'Minimarket El Ahorro',   tipo: 'Turno tarde',     zona: 'Manantay',        pago: 'S/ 1100',           wsp: '51961000013' },
  { id: 'e5', puesto: 'Ayudante de mudanza (cachuelo)', negocio: 'Familia particular', tipo: 'Por día',    zona: 'Pucallpa centro', pago: 'S/ 80 el día',     wsp: '51961000014' },
];

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export default function Yapu() {
  const { cartCount, setIsCartOpen } = useCart();
  const [vista, setVista] = useState<Vista>('servicios');

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <MarketTabs />

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-12">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-on-surface">Yapu · Tablero local 🤝</h1>
          <p className="text-secondary font-body-md text-sm">¿Buscas chamba o necesitas a alguien de confianza? Todo pasa por acá.</p>
        </div>

        {/* CTA publicar */}
        <a
          href={waLink('51961000000', 'Hola Boga, quiero publicar un aviso en Yapu (servicio / empleo).')}
          target="_blank"
          rel="noreferrer"
          className="relative overflow-hidden rounded-2xl bg-inverse-surface text-inverse-on-surface p-4 flex items-center gap-3 group"
        >
          <div className="absolute -right-8 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-inverse-primary text-[22px]">campaign</span>
          </div>
          <div className="relative flex flex-col min-w-0 flex-1">
            <span className="font-headline-sm text-sm leading-tight">Publica tu aviso gratis</span>
            <span className="text-inverse-on-surface/70 font-body-md text-xs mt-0.5">Ofrece tu oficio o publica un puesto de trabajo</span>
          </div>
          <span className="material-symbols-outlined text-inverse-on-surface/60 shrink-0 group-hover:translate-x-1 transition-transform">chevron_right</span>
        </a>

        {/* Conmutador de vista */}
        <div className="flex gap-2">
          {([['servicios', 'Servicios', 'construction'], ['empleos', 'Empleos', 'work']] as const).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setVista(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md transition-all shadow-sm active:scale-95 ${
                vista === id
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Directorio de servicios */}
        {vista === 'servicios' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICIOS.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl p-4 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
                    <img src={s.img} alt={s.nombre} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{s.nombre}</span>
                    <span className="text-secondary font-label-md text-[11px] line-clamp-1">{s.oficio}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-[11px] font-label-md text-secondary">{s.rating} <span className="opacity-60">· {s.trabajos} trabajos</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-surface-container pt-3">
                  <span className="text-[11px] font-label-md text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>{s.zona}
                  </span>
                  <a
                    href={waLink(s.wsp, `Hola ${s.nombre}, te contacto desde Yapu (Boga) por tu servicio de ${s.oficio}.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-[#25D366] text-white text-[12px] font-label-md px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                    Contactar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Avisos de empleo */}
        {vista === 'empleos' && (
          <div className="flex flex-col gap-3">
            {EMPLEOS.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl p-4 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">work</span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{e.puesto}</span>
                  <span className="text-secondary font-label-md text-[11px] line-clamp-1">{e.negocio} · {e.zona}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="bg-surface-container-low text-secondary text-[10px] font-label-md px-2 py-0.5 rounded-full border border-surface-container-highest">{e.tipo}</span>
                    <span className="bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full">{e.pago}</span>
                  </div>
                </div>
                <a
                  href={waLink(e.wsp, `Hola, vi el aviso de "${e.puesto}" en ${e.negocio} por Yapu (Boga). Me interesa postular.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 bg-primary text-white text-[12px] font-label-md px-3 py-2 rounded-full active:scale-95 transition-transform"
                >
                  Postular
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
              </div>
            ))}
          </div>
        )}

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          Boga conecta, pero no es empleador ni responsable de los acuerdos. Verifica siempre con quién tratas.
        </p>
      </main>
    </>
  );
}
