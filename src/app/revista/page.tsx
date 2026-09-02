"use client";

import React from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';

// "Yo Soy de la Selva" — la revista digital de Boga. Formato editorial, no
// catálogo: crónicas, guías y retratos de Pucallpa y la Amazonía. Todo el
// contenido es de muestra hasta que haya un CMS / tabla de artículos.

const EDICION = 'Edición 07 · Septiembre 2026';

const PORTADA = {
  kicker: 'Crónica',
  titulo: 'El último maestro del bote de madera en Yarinacocha',
  dek: 'Don Aurelio tiene 74 años y las manos llenas de astillas. En su taller a orillas de la laguna todavía se construyen peque-peques como hace medio siglo — pero ya nadie quiere aprender el oficio.',
  autor: 'Redacción Boga',
  lectura: '6 min',
  img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=80',
};

const SECCIONES = ['Gastronomía', 'Cultura', 'Naturaleza', 'Rutas', 'Gente'];

const DESTACADOS = [
  { id: 'd1', kicker: 'Gastronomía', titulo: 'Guía definitiva del tacacho con cecina', dek: 'Dónde se come el mejor, cuánto cuesta y por qué el plátano bellaco lo cambia todo.', autor: 'M. Panduro', lectura: '8 min', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80', ancho: true },
  { id: 'd2', kicker: 'Naturaleza', titulo: 'Amanecer en el Boquerón del Padre Abad', dek: 'Tres horas de carretera para ver caer el agua entre la niebla.', autor: 'K. Vela', lectura: '4 min', img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=700&q=80', ancho: false },
  { id: 'd3', kicker: 'Cultura', titulo: 'El kené shipibo no es un adorno, es un idioma', dek: 'Las artesanas de San Francisco explican qué dice cada línea.', autor: 'Redacción', lectura: '5 min', img: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=700&q=80', ancho: false },
];

const CITA = {
  texto: '“Acá el río manda. Si el río sube, tu día cambia. Si el río baja, también. Uno aprende a vivir preguntándole al agua.”',
  autor: 'Aurelio Sangama, carpintero de ribera',
};

const ARTICULOS = [
  { id: 'a1', kicker: 'Rutas',       titulo: 'Fin de semana barato: Pucallpa a Contamana en lancha', autor: 'J. Ríos',      lectura: '7 min', img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80' },
  { id: 'a2', kicker: 'Gente',       titulo: 'La señora que alimenta a media cuadra desde su ventana', autor: 'R. Isuiza',   lectura: '5 min', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80' },
  { id: 'a3', kicker: 'Naturaleza',  titulo: 'Cinco aves que solo vas a ver si te levantas a las 5 a. m.', autor: 'P. Sangama', lectura: '6 min', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80' },
  { id: 'a4', kicker: 'Gastronomía', titulo: 'Juane: la historia detrás del plato que solo se come en junio', autor: 'M. Panduro', lectura: '4 min', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80' },
  { id: 'a5', kicker: 'Cultura',     titulo: '¿Por qué Yarinacocha se llama así? La respuesta está en el shipibo', autor: 'Redacción', lectura: '3 min', img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600&q=80' },
  { id: 'a6', kicker: 'Rutas',       titulo: 'Manejar mototaxi en Pucallpa: reglas que nadie te dice', autor: 'C. Pinedo',   lectura: '5 min', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80' },
];

const EN_ESTA_EDICION = [
  'El mercado de Bellavista a las 4 de la mañana',
  'Qué pasó con el viejo cine de la calle 7 de Junio',
  'Receta: inchicapi de gallina como lo hace mi abuela',
  'Mapa: dónde hay wifi gratis de verdad en el centro',
];

export default function Revista() {
  return (
    <>
      <AppHeader showSearch={false} showLocation={false} showChat={false} showCart={false} />
      <MarketTabs />

      <main className="max-w-[1100px] mx-auto w-full pb-16">

        {/* Masthead */}
        <header className="bg-on-surface text-background px-container-margin lg:px-8 pt-8 pb-7">
          <p className="font-label-md text-[10px] uppercase tracking-[0.35em] text-background/60">Boga · Revista digital</p>
          <h1 className="font-headline-lg font-extrabold tracking-tight leading-[0.92] text-[13vw] sm:text-6xl lg:text-7xl mt-2">
            Yo Soy<br />de la Selva
          </h1>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-background/20">
            <span className="font-label-md text-[11px] uppercase tracking-widest text-background/70">{EDICION}</span>
            <span className="w-1 h-1 rounded-full bg-background/40" />
            <span className="font-label-md text-[11px] uppercase tracking-widest text-background/70">Pucallpa</span>
          </div>
        </header>

        {/* Portada / cover story */}
        <article className="px-container-margin lg:px-8 pt-8">
          <div className="relative overflow-hidden rounded-sm aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
            <img src={PORTADA.img} alt={PORTADA.titulo} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-8">
              <span className="inline-block bg-primary text-white font-label-md text-[10px] uppercase tracking-[0.2em] px-2.5 py-1">
                {PORTADA.kicker}
              </span>
              <h2 className="text-white font-headline-lg font-extrabold tracking-tight leading-[1.03] text-2xl sm:text-4xl lg:text-5xl mt-3 max-w-[16ch]">
                {PORTADA.titulo}
              </h2>
            </div>
          </div>
          <div className="grid lg:grid-cols-[1fr_240px] gap-6 lg:gap-10 mt-6">
            <p className="font-body-lg text-on-surface/80 text-base lg:text-lg leading-relaxed first-letter:font-headline-lg first-letter:font-black first-letter:text-6xl first-letter:leading-[0.75] first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:text-primary">
              {PORTADA.dek}
            </p>
            <div className="flex lg:flex-col gap-3 lg:gap-2 lg:border-l lg:border-on-surface/15 lg:pl-6 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">edit</span>
                <span className="font-label-md text-[12px] text-on-surface">{PORTADA.autor}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">schedule</span>
                <span className="font-label-md text-[12px] text-secondary">{PORTADA.lectura} de lectura</span>
              </div>
            </div>
          </div>
        </article>

        {/* Índice de secciones */}
        <nav className="px-container-margin lg:px-8 mt-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-on-surface/15 py-3">
            <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-secondary">En esta edición</span>
            {SECCIONES.map((s) => (
              <span key={s} className="font-headline-sm text-[13px] text-on-surface">
                {s}
              </span>
            ))}
          </div>
        </nav>

        {/* Destacados: 1 ancho + 2 */}
        <section className="px-container-margin lg:px-8 mt-8 grid md:grid-cols-2 gap-8 md:gap-10">
          {DESTACADOS.map((d) => (
            <article key={d.id} className={`group ${d.ancho ? 'md:col-span-2 md:grid md:grid-cols-2 md:gap-8 md:items-center' : ''}`}>
              <div className={`relative overflow-hidden rounded-sm ${d.ancho ? 'aspect-[16/10]' : 'aspect-[3/2]'}`}>
                <img src={d.img} alt={d.titulo} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <div className={d.ancho ? 'mt-4 md:mt-0' : 'mt-4'}>
                <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-primary">{d.kicker}</span>
                <h3 className={`font-headline-lg font-extrabold tracking-tight text-on-surface leading-[1.08] mt-1.5 ${d.ancho ? 'text-2xl lg:text-3xl' : 'text-xl'}`}>
                  {d.titulo}
                </h3>
                <p className="font-body-md text-secondary text-sm leading-relaxed mt-2">{d.dek}</p>
                <div className="flex items-center gap-2 mt-3 text-secondary">
                  <span className="font-label-md text-[11px] uppercase tracking-wider">{d.autor}</span>
                  <span className="w-1 h-1 rounded-full bg-secondary/40" />
                  <span className="font-label-md text-[11px]">{d.lectura}</span>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Cita */}
        <blockquote className="px-container-margin lg:px-8 my-14">
          <div className="border-l-4 border-primary pl-5 lg:pl-8 max-w-[28ch] lg:max-w-[40ch]">
            <p className="font-headline-lg font-extrabold tracking-tight text-on-surface leading-[1.15] text-xl lg:text-3xl">
              {CITA.texto}
            </p>
            <footer className="font-label-md text-[11px] uppercase tracking-widest text-secondary mt-4">— {CITA.autor}</footer>
          </div>
        </blockquote>

        {/* Grilla editorial */}
        <section className="px-container-margin lg:px-8">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl border-b border-on-surface/15 pb-3">
            Más historias
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 mt-8">
            {ARTICULOS.map((a) => (
              <article key={a.id} className="group">
                <div className="relative overflow-hidden rounded-sm aspect-[3/2]">
                  <img src={a.img} alt={a.titulo} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
                <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-primary block mt-3">{a.kicker}</span>
                <h3 className="font-headline-lg font-bold tracking-tight text-on-surface leading-snug text-base lg:text-lg mt-1">
                  {a.titulo}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-secondary">
                  <span className="font-label-md text-[11px] uppercase tracking-wider">{a.autor}</span>
                  <span className="w-1 h-1 rounded-full bg-secondary/40" />
                  <span className="font-label-md text-[11px]">{a.lectura}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* En esta edición — índice numerado */}
        <section className="px-container-margin lg:px-8 mt-14">
          <div className="bg-surface-container-low rounded-sm p-6 lg:p-8">
            <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg lg:text-xl">También en la edición 07</h2>
            <ol className="mt-4 divide-y divide-on-surface/10">
              {EN_ESTA_EDICION.map((t, i) => (
                <li key={i} className="flex items-baseline gap-4 py-3">
                  <span className="font-headline-lg font-black text-primary text-lg tabular-nums shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-body-md text-on-surface text-sm lg:text-base leading-snug">{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Colofón */}
        <footer className="px-container-margin lg:px-8 mt-14 pt-6 border-t border-on-surface/15">
          <p className="font-label-md text-[11px] uppercase tracking-[0.25em] text-secondary">Yo Soy de la Selva</p>
          <p className="font-body-md text-secondary/80 text-xs mt-2 max-w-[52ch] leading-relaxed">
            Revista digital de Boga. Historias de Pucallpa y la Amazonía peruana. Fotografía y textos por el equipo de Boga y colaboradores locales. Contenido de muestra — próximamente con firmas reales.
          </p>
        </footer>

      </main>
    </>
  );
}
