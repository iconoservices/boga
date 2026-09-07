"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

// El Pandero de Boga — junta / fondo colectivo (pandero, pasanaco): un grupo
// pone una cuota mensual y cada mes uno se lleva todo el fondo, por sorteo o
// remate. Placeholder: estructura lista, contenido de muestra. Todavía sin
// motor de grupos, pagos ni sorteo. Cuando esté: grupos + cuotas + KYC +
// sorteo auditable + contrato, todo desde Supabase.

const TEAL = '#0d4b47';
const CREMA = '#f3ecdd';
const ORO = '#e0b64a';

const NAV = ['Cómo funciona', 'Grupos', 'Confianza', 'Preguntas'];

const PASOS = [
  { n: '1', txt: 'Te unís a un grupo de vecinos verificados con DNI.' },
  { n: '2', txt: 'Cada mes todos ponen la misma cuota en el fondo común.' },
  { n: '3', txt: 'Cada mes UNO se lleva todo el fondo — por sorteo o por remate.' },
  { n: '4', txt: 'Cuando termina la vuelta, todos recibieron su parte. Sin intereses.' },
];

const GRUPOS = [
  {
    id: 'chico', nombre: 'Pandero chico', personas: '10 personas', cuota: 'S/ 100 / mes',
    pozo: 'S/ 1 000', nota: 'Para arrancar', destacado: false,
  },
  {
    id: 'mediano', nombre: 'Pandero mediano', personas: '12 personas', cuota: 'S/ 300 / mes',
    pozo: 'S/ 3 600', nota: 'El más armado', destacado: true,
  },
  {
    id: 'grande', nombre: 'Pandero grande', personas: '20 personas', cuota: 'S/ 500 / mes',
    pozo: 'S/ 10 000', nota: 'Para un objetivo grande', destacado: false,
  },
];

const CONFIANZA = [
  { icon: 'badge', txt: 'Todos los miembros verificados con DNI y con historial en Boga' },
  { icon: 'account_balance', txt: 'Boga administra los pagos — la plata no pasa por una sola persona' },
  { icon: 'visibility', txt: 'El sorteo es público y queda registrado, cualquiera lo puede revisar' },
  { icon: 'handshake', txt: 'Contrato firmado por todo el grupo antes de arrancar' },
];

const PARA_QUE = ['Una moto', 'Una refrigeradora', 'Capital para tu negocio', 'El inicial de un lote', 'Útiles del colegio', 'Un viaje'];

const PREGUNTAS = [
  { q: '¿Y si alguien deja de pagar?', a: 'Cada miembro entra con garantía y contrato. Si alguien falla, Boga cubre esa cuota del fondo con la garantía y esa persona queda fuera y con mala calificación. El grupo no se perjudica.' },
  { q: '¿Es legal?', a: 'El pandero (o junta) es una práctica de ahorro tradicional y legal en el Perú. La diferencia con hacerlo "a la antigua" es que acá está todo registrado, con contrato y sin que la plata dependa de una sola persona.' },
  { q: '¿Cuándo me toca?', a: 'Depende del método del grupo: por sorteo (al azar, un mes distinto para cada uno) o por remate (el que más adelanta cuotas cobra antes). Lo eligen entre todos al armar el grupo.' },
  { q: '¿Puedo adelantar mi turno?', a: 'Sí, en los grupos por remate: ofrecés adelantar cuotas y si nadie ofrece más, cobrás ese mes. Es la forma de tener la plata antes si la necesitás urgente.' },
  { q: '¿Puedo salir antes de terminar?', a: 'Si ya cobraste, tenés que terminar de pagar tus cuotas (esa plata es de los demás). Si todavía no cobraste, podés ceder tu lugar a alguien que valide Boga.' },
];

export default function Pandero() {
  const { cartCount, setIsCartOpen } = useCart();
  const [grupoSel, setGrupoSel] = useState('mediano');
  const [anotado, setAnotado] = useState(false);

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <div className="min-h-screen" style={{ backgroundColor: TEAL, color: CREMA }}>
        <div className="max-w-[1100px] mx-auto px-container-margin lg:px-6 pt-5 pb-20 flex flex-col gap-8">

          {/* Masthead */}
          <section className="flex flex-col gap-3">
            <span className="self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-md text-[11px] uppercase tracking-wider" style={{ backgroundColor: ORO, color: TEAL }}>
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
              Próximamente
            </span>
            <h1 className="font-headline-lg font-extrabold tracking-tight text-3xl sm:text-4xl lg:text-5xl leading-[1.03]">
              El <span style={{ color: ORO }}>Pandero</span> de Boga
            </h1>
            <p className="font-body-lg text-base lg:text-lg leading-relaxed max-w-[54ch]" style={{ color: CREMA + 'cc' }}>
              Ahorrá en grupo y comprá lo grande sin préstamo ni intereses. El pandero de
              siempre, pero con contrato, verificación y sorteo a la vista de todos.
            </p>
          </section>

          {/* Sub-nav (decorativa) */}
          <nav className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
            <span className="shrink-0 px-3 py-1.5 rounded-full font-label-md text-[12px]" style={{ backgroundColor: CREMA, color: TEAL }}>Cómo funciona</span>
            {NAV.slice(1).map((n) => (
              <span key={n} className="shrink-0 px-3 py-1.5 rounded-full font-label-md text-[12px] cursor-default" style={{ color: CREMA + '99' }}>{n}</span>
            ))}
          </nav>

          {/* Cómo funciona */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Cómo funciona</h2>
            <ol className="grid sm:grid-cols-2 gap-3">
              {PASOS.map((p) => (
                <li key={p.n} className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: 'rgba(243,236,221,0.06)' }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center font-headline-sm text-sm shrink-0" style={{ backgroundColor: ORO, color: TEAL }}>{p.n}</span>
                  <span className="font-body-md text-sm leading-snug">{p.txt}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Grupos */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Grupos de ejemplo</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {GRUPOS.map((g) => {
                const activo = grupoSel === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGrupoSel(g.id)}
                    className="text-left rounded-2xl p-5 border transition-all flex flex-col gap-1.5"
                    style={{
                      backgroundColor: activo ? CREMA : 'rgba(243,236,221,0.06)',
                      borderColor: activo ? ORO : 'rgba(243,236,221,0.18)',
                      color: activo ? TEAL : CREMA,
                    }}
                  >
                    {g.destacado && (
                      <span className="self-start font-label-md text-[10px] uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: ORO, color: TEAL }}>
                        {g.nota}
                      </span>
                    )}
                    <span className="font-headline-lg font-extrabold text-lg">{g.nombre}</span>
                    <span className="font-body-md text-sm" style={{ opacity: 0.8 }}>{g.personas} · {g.cuota}</span>
                    <span className="font-label-md text-[11px] mt-1" style={{ opacity: 0.7 }}>El que gana se lleva</span>
                    <span className="font-price-lg text-2xl" style={{ color: activo ? TEAL : ORO }}>{g.pozo}</span>
                    {!g.destacado && <span className="font-label-md text-[11px]" style={{ opacity: 0.65 }}>{g.nota}</span>}
                  </button>
                );
              })}
            </div>
            <p className="font-label-md text-[11px]" style={{ color: CREMA + '80' }}>Montos de ejemplo. Los grupos y las cuotas se definen al armarlos.</p>
          </section>

          {/* Confianza */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Qué lo hace confiable</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {CONFIANZA.map((c) => (
                <div key={c.icon} className="flex items-start gap-3 rounded-xl p-3.5" style={{ backgroundColor: 'rgba(243,236,221,0.06)' }}>
                  <span className="material-symbols-outlined text-[22px] shrink-0" style={{ color: ORO }}>{c.icon}</span>
                  <span className="font-body-md text-sm leading-snug">{c.txt}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Para qué sirve */}
          <section className="flex flex-col gap-3">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Para qué lo usa la gente</h2>
            <div className="flex flex-wrap gap-2">
              {PARA_QUE.map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-full font-label-md text-[12px]" style={{ backgroundColor: 'rgba(243,236,221,0.08)' }}>{t}</span>
              ))}
            </div>
          </section>

          {/* Preguntas */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Preguntas</h2>
            <div className="flex flex-col gap-2.5">
              {PREGUNTAS.map((p) => (
                <details key={p.q} className="rounded-xl px-4 py-3 group" style={{ backgroundColor: 'rgba(243,236,221,0.06)' }}>
                  <summary className="font-headline-sm text-sm cursor-pointer list-none flex items-center justify-between gap-3">
                    {p.q}
                    <span className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180 shrink-0">expand_more</span>
                  </summary>
                  <p className="font-body-md text-sm leading-relaxed mt-2" style={{ color: CREMA + 'cc' }}>{p.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-2xl p-6 lg:p-8 text-center flex flex-col items-center gap-3" style={{ backgroundColor: CREMA, color: TEAL }}>
            <span className="material-symbols-outlined text-[32px]">savings</span>
            <h2 className="font-headline-lg font-extrabold text-xl lg:text-2xl">Todavía estamos armando los primeros grupos</h2>
            <p className="font-body-md text-sm max-w-[44ch]" style={{ opacity: 0.75 }}>
              Pronto vas a poder entrar a un pandero desde acá. Dejanos tu interés y te avisamos
              cuando abra el primer grupo de tu zona.
            </p>
            <button
              onClick={() => setAnotado(true)}
              disabled={anotado}
              className="mt-1 font-headline-sm text-sm px-6 py-3 rounded-full active:scale-95 transition-transform disabled:opacity-70"
              style={{ backgroundColor: TEAL, color: CREMA }}
            >
              {anotado ? '¡Anotado! Te avisamos 👌' : 'Quiero entrar a un pandero'}
            </button>
            <span className="font-label-md text-[10px] uppercase tracking-wider" style={{ opacity: 0.5 }}>Contenido de muestra</span>
          </section>

        </div>
      </div>
    </>
  );
}
