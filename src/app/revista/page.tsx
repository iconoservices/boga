"use client";

import React, { useState } from 'react';
import MarketTabs from '@/components/MarketTabs';

// "Yo Soy de la Selva" — la revista digital de Boga. Formato diario/revista de
// estilo de vida (masthead + barra de secciones + lista de notas), no catálogo.
// Contenido de muestra hasta que haya un CMS / tabla de notas.

const EDICION = 'Edición 07 · Septiembre 2026';

// Secciones tipo revista de estilo de vida (COSAS / BBC Mundo), adaptadas a
// Pucallpa. "Portada" es la vista curada; el resto filtra la lista de notas.
const SECCIONES = ['Actualidad', 'Cultura', 'Lifestyle', 'Vida Social', 'Gastronomía', 'Naturaleza', 'Rutas'];

const PORTADA = {
  kicker: 'Crónica',
  titulo: 'El último maestro del bote de madera en Yarinacocha',
  dek: 'Don Aurelio tiene 74 años y las manos llenas de astillas. En su taller a orillas de la laguna todavía se construyen peque-peques como hace medio siglo — pero ya nadie quiere aprender el oficio.',
  autor: 'Redacción Boga',
  lectura: '6 min',
  img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=80',
};

const CITA = {
  texto: '“Acá el río manda. Si el río sube, tu día cambia. Si el río baja, también. Uno aprende a vivir preguntándole al agua.”',
  autor: 'Aurelio Sangama, carpintero de ribera',
};

type Nota = {
  id: string;
  kicker: string;
  titulo: string;
  dek: string;
  autor: string;
  fecha: string;
  lectura: string;
  img: string;
  destacado?: boolean;
};

const NOTAS: Nota[] = [
  { id: 'n1', kicker: 'Lifestyle',   titulo: 'Stefano Klima detrás del foco: sus aficiones, sueños y recuerdos', dek: 'El fotógrafo ítalo-peruano nos abre su universo personal: de sus viajes a la Toscana e Islandia a su afición por el Real Madrid, su gata Mera y el deporte.', autor: 'Redacción', fecha: '02 sep 2026', lectura: '7 min', img: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&q=80', destacado: true },
  { id: 'n2', kicker: 'Lifestyle',   titulo: 'La técnica para lograr una piel luminosa', dek: 'Cómo potenciar la luz natural de la piel con hidratación, activos y una rutina simple que sí se puede sostener en el calor de la selva.', autor: 'M. Vela', fecha: '02 sep 2026', lectura: '5 min', img: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80' },
  { id: 'n3', kicker: 'Vida Social', titulo: 'La feria de Yarinacocha reunió a toda la ciudad este fin de semana', dek: 'Emprendedores, música en vivo y el reencuentro de siempre a orillas de la laguna. Las fotos de la noche.', autor: 'Redacción', fecha: '01 sep 2026', lectura: '3 min', img: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80', destacado: true },
  { id: 'n4', kicker: 'Actualidad',  titulo: 'Nuevo malecón de Bellavista: qué se sabe y cuándo abre', dek: 'La obra avanza al 70%. Recorrimos el tramo terminado y hablamos con los comerciantes que ya se están mudando.', autor: 'J. Ríos', fecha: '31 ago 2026', lectura: '6 min', img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80', destacado: true },
  { id: 'n5', kicker: 'Gastronomía', titulo: 'Guía definitiva del tacacho con cecina', dek: 'Dónde se come el mejor, cuánto cuesta y por qué el plátano bellaco lo cambia todo.', autor: 'M. Panduro', fecha: '30 ago 2026', lectura: '8 min', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' },
  { id: 'n6', kicker: 'Cultura',     titulo: 'El kené shipibo no es un adorno, es un idioma', dek: 'Las artesanas de San Francisco explican qué dice cada línea del diseño.', autor: 'Redacción', fecha: '29 ago 2026', lectura: '5 min', img: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80' },
  { id: 'n7', kicker: 'Naturaleza',  titulo: 'Amanecer en el Boquerón del Padre Abad', dek: 'Tres horas de carretera para ver caer el agua entre la niebla. Vale cada minuto.', autor: 'K. Vela', fecha: '28 ago 2026', lectura: '4 min', img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80' },
  { id: 'n8', kicker: 'Rutas',       titulo: 'Fin de semana barato: Pucallpa a Contamana en lancha', dek: 'Cuánto cuesta, dónde dormir y qué llevar para bajar el río sin gastar de más.', autor: 'J. Ríos', fecha: '27 ago 2026', lectura: '7 min', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80' },
  { id: 'n9', kicker: 'Vida Social', titulo: 'La señora que alimenta a media cuadra desde su ventana', dek: 'Hace doce años que doña Rosa cocina de más "por si alguien pasa con hambre". La conocimos.', autor: 'R. Isuiza', fecha: '26 ago 2026', lectura: '5 min', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80' },
  { id: 'n10', kicker: 'Gastronomía', titulo: 'Juane: la historia detrás del plato que solo se come en junio', dek: 'De la fiesta de San Juan a tu mesa: por qué este tamal amazónico tiene fecha propia.', autor: 'M. Panduro', fecha: '25 ago 2026', lectura: '4 min', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80' },
  { id: 'n11', kicker: 'Cultura',    titulo: '¿Por qué Yarinacocha se llama así? La respuesta está en el shipibo', dek: 'Yarina + cocha: dos palabras que explican la laguna y a la gente que vive de ella.', autor: 'Redacción', fecha: '24 ago 2026', lectura: '3 min', img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=800&q=80' },
  { id: 'n12', kicker: 'Actualidad', titulo: 'Manejar mototaxi en Pucallpa: reglas que nadie te dice', dek: 'Rutas, tarifas y códigos no escritos del transporte que mueve la ciudad.', autor: 'C. Pinedo', fecha: '23 ago 2026', lectura: '5 min', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80' },
];

const EN_ESTA_EDICION = [
  'El mercado de Bellavista a las 4 de la mañana',
  'Qué pasó con el viejo cine de la calle 7 de Junio',
  'Receta: inchicapi de gallina como lo hace mi abuela',
  'Mapa: dónde hay wifi gratis de verdad en el centro',
];

function ListaNotas({ notas }: { notas: Nota[] }) {
  if (notas.length === 0) {
    return <p className="font-body-md text-secondary text-sm py-10">Todavía no hay notas en esta sección.</p>;
  }
  return (
    <div className="divide-y divide-on-surface/10">
      {notas.map((n) => (
        <article key={n.id} className="flex gap-4 lg:gap-6 py-6 group">
          <div className="w-28 sm:w-44 lg:w-56 shrink-0 aspect-[4/3] overflow-hidden rounded-sm bg-surface-container-low">
            <img src={n.img} alt={n.titulo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-label-md text-[11px] uppercase tracking-wider text-secondary">{n.fecha}</span>
            <h3 className="font-headline-lg font-bold tracking-tight text-on-surface leading-snug text-base sm:text-lg lg:text-xl mt-1">
              {n.titulo}
            </h3>
            <p className="hidden sm:block font-body-md text-secondary text-sm leading-relaxed mt-2 line-clamp-2 lg:line-clamp-3">{n.dek}</p>
            <div className="flex items-center gap-2 mt-2 text-secondary">
              <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-primary">{n.kicker}</span>
              <span className="w-1 h-1 rounded-full bg-secondary/40" />
              <span className="font-label-md text-[11px]">{n.lectura}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Revista() {
  const [seccion, setSeccion] = useState<string>('Portada');

  const irASeccion = (s: string) => {
    setSeccion(s);
    if (s !== 'Portada') {
      document.getElementById('historias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const tabs = ['Portada', ...SECCIONES];
  const destacados = NOTAS.filter((n) => n.destacado).slice(0, 3);
  const notasSeccion = seccion === 'Portada' ? NOTAS : NOTAS.filter((n) => n.kicker === seccion);

  return (
    <>
      <MarketTabs />

      <main className="w-full pb-16">

        {/* Masthead estilo diario digital */}
        <div className="bg-primary text-white">
          <div className="max-w-[1100px] mx-auto px-container-margin lg:px-8 py-6 lg:py-8">
            <h1 className="font-headline-lg font-extrabold tracking-tight leading-[0.92] text-[11vw] sm:text-5xl lg:text-6xl">
              Yo Soy de la Selva
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <p className="font-label-md text-[11px] uppercase tracking-[0.25em] text-white/80">
                Revista digital de Pucallpa
              </p>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <p className="font-label-md text-[10px] uppercase tracking-widest text-white/70">{EDICION}</p>
            </div>
          </div>
        </div>

        {/* Barra de secciones (sticky, con divisores tipo BBC / COSAS) */}
        <nav className="sticky top-0 z-30 bg-surface-container-lowest border-b border-on-surface/15 shadow-[0_4px_10px_rgba(0,0,0,0.03)]">
          <div className="max-w-[1100px] mx-auto flex items-stretch overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {tabs.map((s, i) => {
              const active = seccion === s;
              return (
                <button
                  key={s}
                  onClick={() => irASeccion(s)}
                  className={`shrink-0 px-4 py-3 font-headline-sm text-[13px] whitespace-nowrap transition-colors relative ${
                    i > 0 ? 'border-l border-on-surface/12' : ''
                  } ${active ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
                >
                  {s}
                  {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary" />}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="max-w-[1100px] mx-auto">

          {seccion === 'Portada' && (
            <>
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

              {/* Destacados */}
              <section className="px-container-margin lg:px-8 mt-10 grid sm:grid-cols-3 gap-8">
                {destacados.map((d) => (
                  <article key={d.id} className="group">
                    <div className="relative overflow-hidden rounded-sm aspect-[3/2]">
                      <img src={d.img} alt={d.titulo} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-primary block mt-3">{d.kicker}</span>
                    <h3 className="font-headline-lg font-extrabold tracking-tight text-on-surface leading-[1.1] text-lg mt-1">
                      {d.titulo}
                    </h3>
                    <p className="font-body-md text-secondary text-sm leading-relaxed mt-2 line-clamp-2">{d.dek}</p>
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
            </>
          )}

          {/* Lista de notas — filtrable por sección (formato revista) */}
          <section id="historias" className="px-container-margin lg:px-8 scroll-mt-16 pt-8">
            <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl border-b border-on-surface/15 pb-3">
              {seccion === 'Portada' ? 'Últimas notas' : seccion}
            </h2>
            <div className="mt-2">
              <ListaNotas notas={notasSeccion} />
            </div>
          </section>

          {seccion === 'Portada' && (
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
          )}

          <footer className="px-container-margin lg:px-8 mt-14 pt-6 border-t border-on-surface/15">
            <p className="font-label-md text-[11px] uppercase tracking-[0.25em] text-secondary">Yo Soy de la Selva</p>
            <p className="font-body-md text-secondary/80 text-xs mt-2 max-w-[52ch] leading-relaxed">
              Revista digital de Boga. Historias de Pucallpa y la Amazonía peruana. Fotografía y textos por el equipo de Boga y colaboradores locales. Contenido de muestra — próximamente con firmas reales.
            </p>
          </footer>

        </div>
      </main>
    </>
  );
}
