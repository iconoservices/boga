"use client";

import React from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

// Guía de Pucallpa — la página "recién llegas, esto es lo que necesitas
// saber". Los accesos rápidos mandan a su portal; abajo, lo práctico que no
// vive en ningún portal (clima, plata, emergencias, cómo llegar, costumbres).
// Contenido de referencia / muestra hasta que haya una fuente oficial.

const ACCESOS = [
  { href: '/alquileres',  icon: 'bed',          titulo: 'Dónde quedarte', sub: 'Cuartos, hostales y minidepas' },
  { href: '/taxi-seguro', icon: 'local_taxi',   titulo: 'Cómo moverte',   sub: 'Taxi Seguro con chofer verificado' },
  { href: '/eventos',     icon: 'map',          titulo: 'Qué hacer',      sub: 'Tours, ferias y agenda' },
  { href: '/market',      icon: 'ramen_dining', titulo: 'Dónde comer',    sub: 'Huariques y menús del día' },
  { href: '/servicios',   icon: 'construction', titulo: 'Buscar chamba',  sub: 'Técnicos y bolsa de empleo' },
  { href: '/market',      icon: 'storefront',   titulo: 'Qué comprar',    sub: 'Mercado fresco y artesanía' },
];

// Fotos reales de Wikimedia Commons (uso libre), no de bancos de stock —
// verificadas una por una porque los IDs de Unsplash "a ojo" salieron mal
// (fotos que no tenían nada que ver con el lugar).
// Cada tarjeta abre su artículo completo en Revista (categoría "Rutas"),
// no un link externo — son preview/miniatura de esa nota.
const QUE_VISITAR = [
  {
    notaId: 'r1',
    titulo: 'Laguna de Yarinacocha',
    desc: 'La joya de Pucallpa: paseo en bote, artesanía shipibo-conibo y las mejores puestas de sol.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Laguna_de_Yarinacocha_desde_un_bote_01.jpg/500px-Laguna_de_Yarinacocha_desde_un_bote_01.jpg',
  },
  {
    notaId: 'r2',
    titulo: 'Plaza de Armas',
    desc: 'El corazón de la ciudad, punto de partida para conocer el centro a pie.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Plaza_de_Armas_de_Pucallpa%2C_Per%C3%BA.jpg/500px-Plaza_de_Armas_de_Pucallpa%2C_Per%C3%BA.jpg',
  },
  {
    notaId: 'r3',
    titulo: 'Catedral Virgen de la Inmaculada',
    desc: 'El templo principal de Pucallpa, frente a la Plaza de Armas.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/La_catedral_de_Pucallpa_2022.jpg/500px-La_catedral_de_Pucallpa_2022.jpg',
  },
  {
    notaId: 'r4',
    titulo: 'Museo Agustín Rivas Vásquez',
    desc: 'Esculturas en madera del "Picasso de la Amazonía", tallada de raíces y troncos.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Pucallpa1.JPG/500px-Pucallpa1.JPG',
  },
  {
    notaId: 'r5',
    titulo: 'Plaza del Reloj Público',
    desc: 'Punto de encuentro clásico, con el reloj más reconocible de la ciudad.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Reloj_publico_pucallpa_2022.jpg/500px-Reloj_publico_pucallpa_2022.jpg',
  },
  {
    notaId: 'r6',
    titulo: 'Parque Natural y Museo Regional',
    desc: 'Fauna amazónica de cerca y piezas de la historia de Ucayali, en un mismo lugar.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Puente_central_del_Parque_Natural_de_Pucallpa.jpg/500px-Puente_central_del_Parque_Natural_de_Pucallpa.jpg',
  },
  {
    notaId: 'r7',
    titulo: 'Laguna Cashibococha',
    desc: 'Más tranquila que Yarinacocha, ideal para pasar el día en familia.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Cashibo_cocha.jpg/500px-Cashibo_cocha.jpg',
  },
  {
    notaId: 'r8',
    titulo: 'Casa "Usko Ayar" de Pablo Amaringo',
    desc: 'El taller del maestro del arte visionario shipibo, hoy escuela de pintura.',
    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Hanna_jon_2002_amaringo_pablo.jpg/500px-Hanna_jon_2002_amaringo_pablo.jpg',
  },
];

const TEMAS = [
  {
    id: 'clima', icon: 'thermostat', titulo: 'Clima y qué llevar',
    parrafos: [
      'Pucallpa es cálida y húmeda todo el año, entre 28 y 34 °C. Llueve más fuerte de octubre a abril, casi siempre en chaparrones cortos e intensos.',
      'Lleva ropa ligera, sandalias, bloqueador, repelente y una sombrilla o poncho. Un abrigo fino solo lo vas a necesitar en el avión o en las noches raras de "friaje".',
    ],
  },
  {
    id: 'plata', icon: 'payments', titulo: 'Plata: efectivo, Yape y cajeros',
    parrafos: [
      'El efectivo en soles manda, sobre todo para el mototaxi y los mercados. Ten siempre sencillo a la mano.',
      'Yape y Plin se aceptan en muchos negocios; la tarjeta, solo en tiendas grandes y restaurantes formales. Hay cajeros de los principales bancos en el centro y en Yarinacocha. Cambia dólares en casas de cambio, no en la calle.',
    ],
  },
  {
    id: 'emergencias', icon: 'emergency', titulo: 'Emergencias y salud',
    parrafos: [
      'Números nacionales: Policía 105 · Bomberos 116 · Ambulancia (SAMU) 106. El serenazgo cambia según el distrito (Callería, Yarinacocha o Manantay).',
      'Para atención está el Hospital Regional de Pucallpa y el Hospital Amazónico en Yarinacocha. En el centro hay farmacias de turno las 24 horas.',
    ],
  },
  {
    id: 'llegar', icon: 'flight_land', titulo: 'Cómo llegar y moverte',
    parrafos: [
      'El aeropuerto está a unos 5 minutos del centro; hay vuelos diarios desde Lima (alrededor de 1 hora). Por tierra, los buses desde Lima vía Tingo María toman entre 18 y 20 horas.',
      'Dentro de la ciudad: mototaxi para trayectos cortos —pregunta el precio antes de subir— y colectivos al puerto de Yarinacocha desde el centro. Con Boga pides Taxi Seguro con chofer verificado.',
    ],
  },
  {
    id: 'costumbres', icon: 'diversity_3', titulo: 'Costumbres y palabras locales',
    parrafos: [
      'El almuerzo es la comida fuerte del día y muchos negocios cierran entre la 1 y las 3 de la tarde. La propina no es obligatoria: se redondea.',
      '"Charapa" es la persona de la selva y se dice con orgullo. En la carta vas a ver juane, tacacho con cecina, inchicapi y patarashca; para tomar, aguajina, chapo o el clásico RC.',
    ],
  },
];

export default function GuiaPage() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      {/* Banda de portada */}
      <div className="bg-on-surface text-background">
        <div className="max-w-[1000px] mx-auto px-container-margin lg:px-6 py-6 lg:py-9">
          <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-background/50">Guía de Pucallpa</span>
          <h1 className="font-headline-lg font-extrabold tracking-tight text-2xl lg:text-4xl mt-1 leading-tight">
            Todo lo que necesitas saber si recién llegas
          </h1>
          <p className="font-body-md text-background/60 text-sm mt-2 max-w-[54ch]">
            Dónde dormir, cómo moverte, qué comer — y lo práctico que nadie te cuenta: clima, plata, emergencias y costumbres.
          </p>
        </div>
      </div>

      <main className="max-w-[1000px] mx-auto px-container-margin lg:px-6 w-full py-8 lg:py-10 flex flex-col gap-10 lg:gap-12">

        {/* Accesos rápidos */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl">Empieza por acá</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ACCESOS.map((a) => (
              <Link
                href={a.href}
                key={a.titulo}
                className="group bg-white border border-surface-container-highest p-4 shadow-sm hover:border-primary/30 hover:shadow-md transition-all flex flex-col gap-2"
              >
                <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                </span>
                <h3 className="font-headline-sm text-sm text-on-surface leading-tight">{a.titulo}</h3>
                <p className="font-body-md text-secondary text-[11px] leading-snug">{a.sub}</p>
                <span className="mt-auto pt-1 text-primary font-label-md text-[11px] flex items-center gap-0.5">
                  Ver <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Qué visitar */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl">Qué visitar</h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-container-margin px-container-margin lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4" style={{ scrollbarWidth: 'none' }}>
            {QUE_VISITAR.map((l) => (
              <Link
                key={l.notaId}
                href={`/revista?nota=${l.notaId}`}
                className="group shrink-0 w-[220px] lg:w-auto bg-white border border-surface-container-highest shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden flex flex-col"
              >
                <img src={l.img} alt={l.titulo} className="w-full h-32 object-cover" loading="lazy" />
                <div className="p-3 flex flex-col gap-1">
                  <h3 className="font-headline-sm text-sm text-on-surface leading-tight">{l.titulo}</h3>
                  <p className="font-body-md text-secondary text-[11px] leading-snug">{l.desc}</p>
                  <span className="mt-1 text-primary font-label-md text-[11px] flex items-center gap-0.5">
                    Leer más <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Lo práctico */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl">Lo práctico</h2>
          <div className="flex flex-col gap-3">
            {TEMAS.map((t) => (
              <div key={t.id} className="bg-white border border-surface-container-highest p-4 lg:p-5 shadow-sm flex gap-4">
                <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-headline-sm text-base text-on-surface leading-tight">{t.titulo}</h3>
                  <div className="flex flex-col gap-2 mt-2">
                    {t.parrafos.map((p, i) => (
                      <p key={i} className="font-body-md text-secondary text-[13px] leading-relaxed">{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="font-body-md text-secondary/70 text-[11px]">
            Información de referencia para orientarte. Los números de emergencia son nacionales; horarios y precios pueden variar.
          </p>
        </section>

      </main>
    </>
  );
}
