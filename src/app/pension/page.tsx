"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

// Pensión Boga — almuerzo casero por suscripción (semana / quincena / mes).
// Placeholder: estructura lista, contenido de muestra. Todavía no hay motor de
// suscripciones ni cobro; el botón solo registra interés (local, sin backend).
// Cuando esté: planes reales desde Supabase + pago + menú semanal editable.

const VERDE = '#0f3d24';
const CREMA = '#f4e7d3';
const ORO = '#e7b84b';

const NAV = ['Planes', 'Cómo funciona', 'Menú de la semana', 'Preguntas'];

const PLANES = [
  {
    id: 'semanal', nombre: 'Semanal', almuerzos: '5 almuerzos', detalle: 'Lunes a viernes',
    precio: 'S/ 45', nota: 'Ideal para probar', destacado: false,
  },
  {
    id: 'quincenal', nombre: 'Quincenal', almuerzos: '10 almuerzos', detalle: 'Dos semanas',
    precio: 'S/ 85', nota: 'El más elegido', destacado: true,
  },
  {
    id: 'mensual', nombre: 'Mensual', almuerzos: '22 almuerzos', detalle: 'Todo el mes',
    precio: 'S/ 180', nota: 'Mejor precio por plato', destacado: false,
  },
];

const INCLUYE = [
  { icon: 'restaurant', txt: 'Entrada, segundo y refresco en cada almuerzo' },
  { icon: 'sports_motorsports', txt: 'Delivery a tu zona sin costo, al mediodía' },
  { icon: 'calendar_month', txt: 'Menú distinto cada día, casero' },
  { icon: 'pause_circle', txt: 'Pausá o cambiá de plan cuando quieras' },
];

const MENU_SEMANA = [
  { dia: 'Lunes', plato: 'Ají de gallina con arroz' },
  { dia: 'Martes', plato: 'Tallarín rojo con bistec' },
  { dia: 'Miércoles', plato: 'Juane + caldo de gallina' },
  { dia: 'Jueves', plato: 'Seco de res con frejoles' },
  { dia: 'Viernes', plato: 'Arroz chaufa amazónico' },
];

const PREGUNTAS = [
  { q: '¿Cómo pago?', a: 'Por semana, quincena o mes, por adelantado. Vas a poder pagar dentro de Boga o por Yape/Plin.' },
  { q: '¿Puedo elegir el menú?', a: 'El menú lo armamos nosotros y cambia cada día. Si tenés una restricción (sin picante, sin cerdo, etc.) la anotás al reservar.' },
  { q: '¿Y si un día no voy a estar?', a: 'Avisás con un día de anticipación y ese almuerzo se corre para más adelante. No se pierde.' },
  { q: '¿A qué zonas llega?', a: 'Al arrancar: centro de Pucallpa, Yarinacocha y Manantay. Después sumamos más.' },
];

export default function Pension() {
  const { cartCount, setIsCartOpen } = useCart();
  const [planSel, setPlanSel] = useState('quincenal');
  const [avisado, setAvisado] = useState(false);

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <div className="min-h-screen" style={{ backgroundColor: VERDE, color: CREMA }}>
        <div className="max-w-[1100px] mx-auto px-container-margin lg:px-6 pt-5 pb-20 flex flex-col gap-8">

          {/* Masthead */}
          <section className="flex flex-col gap-3">
            <span className="self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-md text-[11px] uppercase tracking-wider" style={{ backgroundColor: ORO, color: VERDE }}>
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
              Próximamente
            </span>
            <h1 className="font-headline-lg font-extrabold tracking-tight text-3xl sm:text-4xl lg:text-5xl leading-[1.03]">
              Pensión <span style={{ color: ORO }}>Boga</span>
            </h1>
            <p className="font-body-lg text-base lg:text-lg leading-relaxed max-w-[52ch]" style={{ color: CREMA + 'cc' }}>
              Tu almuerzo casero, todos los días. Pagás por semana, quincena o mes — nosotros
              te lo llevamos al mediodía.
            </p>
          </section>

          {/* Sub-nav (decorativa por ahora) */}
          <nav className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
            <span className="shrink-0 px-3 py-1.5 rounded-full font-label-md text-[12px]" style={{ backgroundColor: CREMA, color: VERDE }}>Planes</span>
            {NAV.slice(1).map((n) => (
              <span key={n} className="shrink-0 px-3 py-1.5 rounded-full font-label-md text-[12px] cursor-default" style={{ color: CREMA + '99' }}>{n}</span>
            ))}
          </nav>

          {/* Planes */}
          <section className="grid sm:grid-cols-3 gap-4">
            {PLANES.map((p) => {
              const activo = planSel === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlanSel(p.id)}
                  className="text-left rounded-2xl p-5 border transition-all flex flex-col gap-1.5"
                  style={{
                    backgroundColor: activo ? CREMA : 'rgba(244,231,211,0.06)',
                    borderColor: activo ? ORO : 'rgba(244,231,211,0.18)',
                    color: activo ? VERDE : CREMA,
                  }}
                >
                  {p.destacado && (
                    <span className="self-start font-label-md text-[10px] uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: ORO, color: VERDE }}>
                      {p.nota}
                    </span>
                  )}
                  <span className="font-headline-lg font-extrabold text-xl">{p.nombre}</span>
                  <span className="font-body-md text-sm" style={{ opacity: 0.8 }}>{p.almuerzos} · {p.detalle}</span>
                  <span className="font-price-lg text-2xl mt-1" style={{ color: activo ? VERDE : ORO }}>{p.precio}</span>
                  {!p.destacado && <span className="font-label-md text-[11px]" style={{ opacity: 0.65 }}>{p.nota}</span>}
                </button>
              );
            })}
          </section>

          {/* Qué incluye */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Qué incluye</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {INCLUYE.map((i) => (
                <div key={i.icon} className="flex items-start gap-3 rounded-xl p-3.5" style={{ backgroundColor: 'rgba(244,231,211,0.06)' }}>
                  <span className="material-symbols-outlined text-[22px] shrink-0" style={{ color: ORO }}>{i.icon}</span>
                  <span className="font-body-md text-sm leading-snug">{i.txt}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Menú de la semana */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Menú de esta semana</h2>
              <span className="font-label-md text-[11px]" style={{ color: CREMA + '80' }}>Ejemplo — el menú cambia cada semana</span>
            </div>
            <ol className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(244,231,211,0.06)' }}>
              {MENU_SEMANA.map((m, i) => (
                <li key={m.dia} className="flex items-center gap-4 px-4 py-3" style={{ borderTop: i ? '1px solid rgba(244,231,211,0.1)' : 'none' }}>
                  <span className="font-label-md text-[11px] uppercase tracking-wider w-24 shrink-0" style={{ color: ORO }}>{m.dia}</span>
                  <span className="font-body-md text-sm">{m.plato}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Preguntas */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Preguntas</h2>
            <div className="flex flex-col gap-2.5">
              {PREGUNTAS.map((p) => (
                <details key={p.q} className="rounded-xl px-4 py-3 group" style={{ backgroundColor: 'rgba(244,231,211,0.06)' }}>
                  <summary className="font-headline-sm text-sm cursor-pointer list-none flex items-center justify-between">
                    {p.q}
                    <span className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180">expand_more</span>
                  </summary>
                  <p className="font-body-md text-sm leading-relaxed mt-2" style={{ color: CREMA + 'cc' }}>{p.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl p-6 lg:p-8 text-center flex flex-col items-center gap-3" style={{ backgroundColor: CREMA, color: VERDE }}>
            <span className="material-symbols-outlined text-[32px]">skillet</span>
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Todavía estamos cocinando esta sección</h2>
            <p className="font-body-md text-sm max-w-[42ch]" style={{ opacity: 0.75 }}>
              Pronto vas a poder reservar tu pensión acá mismo. Dejanos tu interés y te avisamos apenas abra.
            </p>
            <button
              onClick={() => setAvisado(true)}
              disabled={avisado}
              className="mt-1 font-headline-sm text-sm px-6 py-3 rounded-full active:scale-95 transition-transform disabled:opacity-70"
              style={{ backgroundColor: VERDE, color: CREMA }}
            >
              {avisado ? '¡Listo! Te avisaremos 👌' : 'Avísame cuando esté'}
            </button>
            <span className="font-label-md text-[10px] uppercase tracking-wider" style={{ opacity: 0.5 }}>Contenido de muestra</span>
          </section>

        </div>
      </div>
    </>
  );
}
