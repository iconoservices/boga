"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchNotasRevista, type NotaCard } from '@/lib/revista';
import { fetchBanners, fetchCatalogo } from '@/lib/catalogo';
import { fetchEventos } from '@/lib/eventos';
import { fetchLugares } from '@/lib/lugares';
import { BannerOverlay, type BannerStyle } from '@/components/BannerOverlay';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

// "/" = el Inicio del lado consumidor. Es el índice vivo de Boga: un vistazo a
// cada hub + contenido editorial fresco (SEO). Nada se resuelve acá, solo se
// descubre; cada bloque termina en "Ver todo". Buscador = /market, B2B = /negocios.
// Data de muestra hasta que cada hub exponga sus destacados reales.

// Portada rotativa — un solo banner que va cambiando entre notas REALES de la
// Revista (vía /api/revista) y promos de cada hub. Las promas siguen siendo de
// muestra hasta que cada hub exponga sus destacados; las de Revista ya son reales.
type Slide = { kicker: string; title: string; href: string; img: string; portrait?: string; pura?: boolean };

// Promos de los otros hubs (de muestra). Se intercalan con las notas de Revista.
const PROMO_SLIDES: Slide[] = [
  {
    kicker: 'Promo · Market',
    title: '2x1 en hamburguesas — solo por hoy',
    href: '/market',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600&q=80',
  },
  {
    kicker: 'Sorteo del mes',
    title: 'Suma tickets con tus compras y gana una moto lineal 0 km',
    href: '/sorteos',
    img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1600&q=80',
  },
  {
    kicker: 'Eventos',
    title: 'Trueno en Pucallpa · 1 de octubre en el Anfiteatro',
    href: '/eventos',
    img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1600&q=80',
  },
];

// Fallback completo si /api/revista no responde (egress caído, tabla vacía):
// el banner nunca queda en blanco.
const PORTADA_FALLBACK: Slide[] = [
  {
    kicker: 'Revista',
    title: 'Historias, cultura y rutas de Pucallpa',
    href: '/revista',
    img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=80',
  },
  ...PROMO_SLIDES,
];

// Construye la lista de slides: intercala las 2 notas más recientes de la
// Revista con las promos (las que cargó el superadmin, o las de muestra si
// todavía no cargó ninguna).
function armarSlides(notas: NotaCard[], promos: Slide[]): Slide[] {
  const p = promos.length ? promos : PROMO_SLIDES;
  if (!notas.length) return [PORTADA_FALLBACK[0], ...p];
  const rev: Slide[] = notas.slice(0, 2).map((n) => ({
    kicker: `Revista · ${n.kicker}`,
    title: n.titulo,
    href: `/revista/${n.slug}`,
    img: n.img,
  }));
  return [rev[0], p[0], p[1], rev[1], p[2]].filter(Boolean) as Slide[];
}

// Los 8 Portales de Boga — el lanzador de la ciudad. Un ícono por hub, cada
// uno con su color. El "sub" está escrito como lo que Boga te resuelve, no
// como una categoría: "cómo te ayudamos", en lenguaje cercano.
const PORTALES = [
  { href: '/market',      label: 'Market',      icon: 'storefront',          sub: 'Te traemos pescado, carne y tienda', color: '#E8894A' },
  { href: '/servicios',   label: 'Chamba',      icon: 'construction',        sub: 'Te conseguimos técnico o trabajo',   color: '#3E9B5F' },
  { href: '/taxi-seguro', label: 'Taxi Seguro', icon: 'local_taxi',          sub: 'Te llevamos con chofer verificado',  color: '#E4655A' },
  { href: '/inmuebles',   label: 'Inmuebles',   icon: 'real_estate_agent',   sub: 'Te encontramos dónde vivir o invertir', color: '#8B7FD4' },
  { href: '/viajes',      label: 'Viajes',      icon: 'directions_boat',     sub: 'Te conectamos con rápidos y buses',  color: '#1B8EBF' },
  { href: '/eventos',     label: 'Agenda',      icon: 'celebration',         sub: 'Te armamos el finde en la ciudad',   color: '#EBB05C' },
  { href: '/sorteos',     label: 'La Suerte',   icon: 'confirmation_number', sub: 'Te hacemos ganar con tus compras',   color: '#2E9B76' },
  { href: '/revista',     label: 'Revista',     icon: 'menu_book',           sub: 'Te contamos la selva y sus historias', color: '#D97742' },
  { href: '/negocios',    label: 'Negocios',    icon: 'work',                sub: 'Te ponemos a vender por WhatsApp',   color: '#2F3B4C' },
];

// Peek: Market → "Dónde comer esta semana". Un carrusel de listas por antojo;
// cada lista trae 3 locales. La posición dentro de la lista la paga el local
// (las listas marcadas "patrocinado").
type ComerLugar = { name: string; cuisine: string; rating: string; img: string };
type ComerLista = { id: string; titulo: string; patrocinado?: boolean; lugares: ComerLugar[] };
const COMER_LISTAS: ComerLista[] = [
  {
    id: 'parrillas',
    titulo: 'Parrillas y ahumados',
    patrocinado: true,
    lugares: [
      { name: 'La Anaconda Parrillas',   cuisine: 'Parrilla amazónica',     rating: '4.9', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80' },
      { name: 'El Ahumadero de Yarina',  cuisine: 'Ahumados a la leña',      rating: '4.7', img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80' },
      { name: 'Brasa Shipiba',           cuisine: 'Carnes y chorizo regional', rating: '4.6', img: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80' },
    ],
  },
  {
    id: 'menu',
    titulo: 'Menú del día',
    lugares: [
      { name: 'Doña Fela · Comida Criolla', cuisine: 'Menú casero',        rating: '4.8', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80' },
      { name: 'El Almuerzo de la Tía',      cuisine: 'Menú económico',      rating: '4.5', img: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80' },
      { name: 'Sabor Ucayalino',           cuisine: 'Criollo y selvático',  rating: '4.6', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Tacacho_con_cecina.jpg/500px-Tacacho_con_cecina.jpg' },
    ],
  },
  {
    id: 'selva',
    titulo: 'Cocina de la selva',
    lugares: [
      { name: 'El Fogón · Juanes & Tacacho', cuisine: 'Regional selvática',           rating: '4.7', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80' },
      { name: 'Tacacho & Cecina "El Boquerón"', cuisine: 'Platos típicos',            rating: '4.6', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80' },
      { name: 'La Patarashca de Manuel',     cuisine: 'Pescado en hoja de bijao',     rating: '4.8', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80' },
    ],
  },
  {
    id: 'llevar',
    titulo: 'Para llevar y delivery',
    lugares: [
      { name: 'Pollería La Leña Brava',     cuisine: 'Pollo a la brasa',    rating: '4.5', img: 'https://images.unsplash.com/photo-1626082927389-6cd097cee6a6?w=400&q=80' },
      { name: 'Anticuchos del Malecón',     cuisine: 'Anticucho y parrilla', rating: '4.7', img: 'https://images.unsplash.com/photo-1633896949673-1eb9d131a9b4?w=400&q=80' },
      { name: 'Juguería Amazonía',          cuisine: 'Jugos y sánguches',    rating: '4.6', img: 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&q=80' },
    ],
  },
];

// Guía rápida — "¿Primera vez en Pucallpa?". 6 necesidades, cada tarjeta
// manda al portal que la resuelve; la guía completa (clima, plata, etc.)
// vive en /guia. Tarjetas compactas (ícono + texto), sin foto.
const GUIA_PUCALLPA = [
  { href: '/inmuebles',   icon: 'real_estate_agent', titulo: 'Dónde quedarte', sub: 'Alquiler y venta de cuartos, casas y terrenos', color: '#8B7FD4', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/La_catedral_de_Pucallpa_2022.jpg/500px-La_catedral_de_Pucallpa_2022.jpg' },
  { href: '/taxi-seguro', icon: 'local_taxi',   titulo: 'Cómo moverte',   sub: 'Mototaxi, auto o moto con chofer verificado',       color: '#E4655A', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Jir%C3%B3n_Sucre_Pucallpa.jpg/500px-Jir%C3%B3n_Sucre_Pucallpa.jpg' },
  { href: '/eventos',     icon: 'map',          titulo: 'Qué hacer',      sub: 'Yarinacocha, Boquerón, ferias y agenda cultural',   color: '#EBB05C', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Laguna_de_Yarinacocha_desde_un_bote_01.jpg/500px-Laguna_de_Yarinacocha_desde_un_bote_01.jpg' },
  { href: '/market',      icon: 'ramen_dining', titulo: 'Dónde comer',    sub: 'Huariques, menús del día y cocina de la selva',     color: '#E8894A', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Tacacho_con_cecina.jpg/500px-Tacacho_con_cecina.jpg' },
  { href: '/servicios',   icon: 'construction', titulo: 'Buscar chamba',  sub: 'Técnicos de confianza y bolsa de empleo local',     color: '#3E9B5F', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Textiler%C3%ADa_shipiba_en_pucalla.jpg/500px-Textiler%C3%ADa_shipiba_en_pucalla.jpg' },
  { href: '/market',      icon: 'storefront',   titulo: 'Qué comprar',    sub: 'Pescado y carne fresca, abarrotes y artesanía',     color: '#D97742', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Feria_Artesanal_por_el_Mes_Patrio%2C%2C_estudiantes_observando_las_l%C3%ADneas_shipibas.jpg/500px-Feria_Artesanal_por_el_Mes_Patrio%2C%2C_estudiantes_observando_las_l%C3%ADneas_shipibas.jpg' },
];

// Peek: Eventos / turismo → "¿Qué hacer en Pucallpa hoy?"
const EXPERIENCES = [
  { id: 'yarina',   title: 'Laguna de Yarinacocha',          tag: 'Medio día',    from: 'S/ 25', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
  { id: 'shipibo',  title: 'Comunidad Shipiba San Francisco', tag: '3–4 h',        from: 'S/ 40', img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600&q=80' },
  { id: 'boqueron', title: 'Boquerón del Padre Abad',         tag: 'Día completo', from: 'S/ 90', img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80' },
  { id: 'jardin',   title: 'Jardín Botánico y Serpentario',   tag: '2 h',          from: 'S/ 15', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80' },
  { id: 'malecon',  title: 'Atardecer en el Malecón',         tag: 'Gratis',       from: 'S/ 0',  img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80' },
];

// Peek: Servicios locales.
const SERVICIOS_PEEK = [
  { id: 'sv1', nombre: 'Marco Ríos',    oficio: 'Electricista domiciliario', zona: 'Yarinacocha', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80' },
  { id: 'sv2', nombre: 'Lucía Panduro', oficio: 'Gasfitería y destape',      zona: 'Callería',    img: 'https://images.unsplash.com/photo-1580281658626-ee379f3cce93?w=400&q=80' },
  { id: 'sv3', nombre: 'Karen Vela',    oficio: 'Fotografía de eventos',     zona: 'Centro',      img: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&q=80' },
];

// Peek: Inmuebles.
const INMUEBLES_PEEK = [
  { id: 'al1', titulo: 'Habitación amoblada con baño propio',  zona: 'Callería',    precio: 'S/ 450', tag: 'Alquiler', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80' },
  { id: 'al2', titulo: 'Mini-departamento para 1–2 personas',  zona: 'Yarinacocha', precio: 'S/ 800', tag: 'Alquiler', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80' },
  { id: 'al3', titulo: 'Terreno 200 m² con título de propiedad', zona: 'Campo Verde', precio: 'S/ 45,000', tag: 'Venta', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80' },
];

// Peek: Viajes.
const VIAJES_PEEK = [
  { id: 'vj1', titulo: 'Rápido a Contamana',   medio: 'Fluvial',   tiempo: '~12 h',   precio: 'S/ 80–120', icon: 'directions_boat' },
  { id: 'vj2', titulo: 'Colectivo a Lima',     medio: 'Terrestre', tiempo: '~18 h',   precio: 'S/ 60–100', icon: 'directions_bus' },
  { id: 'vj3', titulo: 'Vuelo a Lima',         medio: 'Aéreo',     tiempo: '~1 h 10 min', precio: 'S/ 120–350', icon: 'flight' },
];

// Peek: Sorteos.
const SORTEO_PEEK = {
  titulo: 'Moto lineal 0 km',
  sub: 'Honda XR 150 · sorteo del mes',
  img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1400&q=80',
};

// SEO: notas de la revista.
const SELVA_NOTES = [
  { id: 'tacacho',   cat: 'Huariques',    title: 'Los 3 huariques secretos para el mejor tacacho de Pucallpa', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80' },
  { id: 'yarina',    cat: 'Curiosidades', title: '¿Sabías por qué la laguna de Yarinacocha se llama así?',      img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
  { id: 'domingo',   cat: 'Turismo',      title: 'Qué hacer un domingo en Pucallpa con menos de S/ 50',         img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80' },
  { id: 'contamana', cat: 'Itinerarios',  title: 'Ruta de fin de semana: de Pucallpa a Contamana',              img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80' },
  { id: 'mitos',     cat: 'Curiosidades', title: 'Mitos de la selva que probablemente no sabías',               img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600&q=80' },
];

function SectionHead({ title, href, cta = 'Ver todo' }: { title: string; href: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">{title}</h2>
      <Link href={href} className="font-label-md text-[12px] text-primary shrink-0 flex items-center gap-0.5 whitespace-nowrap">
        {cta}
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </Link>
    </div>
  );
}

const CAROUSEL = "flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x scroll-pl-container-margin lg:scroll-pl-0";

// Un solo banner de portada que rota entre notas de la Revista y promos.
// Mismo diseño en móvil y escritorio: foto a sangre, kicker + titular abajo,
// flechas a los lados y puntos de posición. Rota solo cada 6 s.
function PortadaCarrusel({ notas, promos, style }: { notas: NotaCard[]; promos: Slide[]; style: BannerStyle }) {
  const slides = React.useMemo(() => armarSlides(notas, promos), [notas, promos]);
  const [i, setI] = useState(0);
  const n = slides.length;

  // Si cambia la cantidad de slides (llegan las notas reales), no dejar el
  // índice fuera de rango.
  useEffect(() => { setI((v) => (v < n ? v : 0)); }, [n]);

  const next = useCallback(() => setI((v) => (v + 1) % n), [n]);
  const prev = () => setI((v) => (v - 1 + n) % n);

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className="w-screen mx-[calc(50%-50vw)] lg:w-full lg:mx-0">
      <div className="relative overflow-hidden lg:rounded-2xl bg-surface-container-low shadow-sm aspect-[16/10] sm:aspect-[2/1] lg:aspect-auto lg:h-[380px]">
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {slides.map((s) => (
            <Link key={s.title} href={s.href} className="group relative w-full h-full shrink-0">
              {s.pura ? (
                <>
                  <img src={s.img} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
                  <img src={s.img} alt={s.title} className="absolute inset-0 w-full h-full object-contain" />
                </>
              ) : (
                <img src={s.img} alt={s.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              )}
              {s.portrait && (
                <div className="absolute top-3 left-3 lg:top-5 lg:left-5 w-16 h-16 lg:w-24 lg:h-24 rounded-full overflow-hidden border-4 border-white shadow-xl z-10">
                  <img src={s.portrait} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <BannerOverlay style={style} tag={s.kicker} title1={s.title} />
            </Link>
          ))}
        </div>

        <button onClick={(e) => { e.preventDefault(); prev(); }} aria-label="Anterior" className="flex absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-on-surface">chevron_left</span>
        </button>
        <button onClick={(e) => { e.preventDefault(); next(); }} aria-label="Siguiente" className="flex absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-on-surface">chevron_right</span>
        </button>
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.preventDefault(); setI(idx); }}
              aria-label={`Ir al banner ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Panel "Los 8 Portales de Boga" — el lanzador de la ciudad, al lado de la
// portada en escritorio y apilado en móvil. Antes era una grilla 3x3 con
// descripción (~400px de alto); ahora es una tira horizontal compacta
// (ícono + nombre, sin descripción) para no competir tanto con el banner.
function PortalesPanel() {
  return (
    <div className="px-container-margin lg:px-0 pt-6 lg:pt-0">
      <div className="flex flex-col gap-4 lg:h-full lg:justify-center">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">
              Todo Pucallpa en una sola app
            </h2>
            <p className="font-body-md text-secondary text-xs mt-1 max-w-[52ch]">
              <span className="lg:hidden">Transporte, servicios y agenda de la ciudad.</span>
              <span className="hidden lg:inline">Transporte verificado, servicios de confianza y la agenda de la ciudad, en tiempo real.</span>
            </p>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 font-label-md text-[10px] text-secondary shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F8A55] animate-pulse" />
            Sincronizado
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x lg:flex-wrap lg:overflow-visible" style={{ scrollbarWidth: 'none' }}>
          {PORTALES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col items-center gap-1.5 shrink-0 w-16 snap-start"
            >
              <span
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
                style={{ backgroundColor: p.color }}
              >
                <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
              </span>
              <span className="font-label-md text-[10px] text-on-surface text-center leading-tight line-clamp-1 w-full">{p.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { cartCount, setIsCartOpen } = useCart();

  // Notas reales de la Revista (endpoint cacheado). Alimentan el banner de
  // portada y el carrusel "Más de la Revista".
  const [notasRevista, setNotasRevista] = useState<NotaCard[]>([]);
  useEffect(() => { fetchNotasRevista().then(setNotasRevista); }, []);

  // "Qué hacer en Pucallpa hoy" jala de las dos fuentes reales de /eventos:
  // la agenda (events) y los lugares para visitar (lugares), mezcladas en
  // una sola tira. Si el admin todavía no cargó ninguna, cae a EXPERIENCES.
  const [eventosHome, setEventosHome] = useState<Awaited<ReturnType<typeof fetchEventos>>>([]);
  const [lugaresHome, setLugaresHome] = useState<Awaited<ReturnType<typeof fetchLugares>>>([]);
  useEffect(() => { fetchEventos().then(setEventosHome); }, []);
  useEffect(() => { fetchLugares().then(setLugaresHome); }, []);

  // Promos del banner de portada, editables desde superadmin (tabla
  // market_banners con page='home'). Si todavia no cargaron ninguna, el
  // carrusel sigue usando PROMO_SLIDES de muestra (ver armarSlides).
  const [promoBanners, setPromoBanners] = useState<Slide[]>([]);
  const [bannerStyle, setBannerStyle] = useState<BannerStyle>('bottom');
  useEffect(() => {
    fetchBanners('home').then(({ banners, style }) => {
      setBannerStyle(style);
      setPromoBanners(banners.map((b: any) => {
        const conTexto = b.show_text !== false && (b.tag || b.title1 || b.title2 || b.sub);
        return {
          kicker: conTexto ? (b.tag || 'Promo') : '',
          title: conTexto ? [b.title1, b.title2].filter(Boolean).join(' ') : '',
          href: b.link || '/market',
          img: b.image,
          pura: !conTexto,
        };
      }));
    });
  }, []);

  // Productos de comida reales que se venden en Boga Market (mismo catalogo
  // cacheado que usa /market), para el carrusel de abajo. Se excluyen los
  // rubros claramente no-comida (moda, salud, servicios); todo lo demas
  // entra, porque hoy casi todo el catalogo real es comida/bebida.
  const [comidaProducts, setComidaProducts] = useState<{ id: string; name: string; price: number; image: string; storeSlug: string; storeName: string; storeExternalUrl?: string }[]>([]);
  useEffect(() => {
    fetchCatalogo().then(({ stores: dbStores, products: dbProducts }) => {
      const tiendasPorSlug: Record<string, any> = {};
      (dbStores || []).forEach((s: any) => { tiendasPorSlug[s.slug] = s; });
      const noComida = ['moda', 'salud', 'servicio', 'boutique', 'belleza'];
      const items = (dbProducts || [])
        .filter((p: any) => {
          const cat = (tiendasPorSlug[p.store]?.marketplace_category || '').toLowerCase();
          return tiendasPorSlug[p.store] && !noComida.some((n) => cat.includes(n));
        })
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          image: p.image,
          storeSlug: p.store,
          storeName: tiendasPorSlug[p.store]?.name || p.store,
          storeExternalUrl: tiendasPorSlug[p.store]?.external_url || undefined,
        }));
      setComidaProducts(items.sort(() => Math.random() - 0.5).slice(0, 12));
    });
  }, []);

  const masRevista = notasRevista.length
    ? notasRevista.slice(0, 8).map((n) => ({ key: n.slug, href: `/revista/${n.slug}`, cat: n.kicker, title: n.titulo, img: n.img }))
    : SELVA_NOTES.map((n) => ({ key: n.id, href: '/revista', cat: n.cat, title: n.title, img: n.img }));

  const queHacer = eventosHome.length || lugaresHome.length
    ? [
        ...eventosHome.slice(0, 4).map((e) => ({
          id: e.id, title: e.titulo, img: e.img,
          tag: [e.dia, e.mes].filter(Boolean).join(' ') || 'Evento',
          meta: e.precio ? `Desde ${e.precio}` : 'Ver evento',
        })),
        ...lugaresHome.slice(0, 4).map((l) => ({
          id: l.id, title: l.nombre, img: l.img,
          tag: l.tag || 'Para visitar',
          meta: 'Para visitar',
        })),
      ]
    : EXPERIENCES.map((e) => ({ id: e.id, title: e.title, img: e.img, tag: e.tag, meta: `Desde ${e.from}` }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Boga',
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        sameAs: [] as string[],
      },
      {
        '@type': 'WebSite',
        name: 'Boga · Todo Pucallpa en una app',
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/market?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      {/* Banda negra compacta */}
      <div className="bg-on-surface text-background overflow-hidden">
        <div className="w-full px-container-margin lg:px-8 py-1 lg:py-1.5 flex items-center gap-x-6">
          <h1 className="shrink-0 font-headline-lg font-extrabold tracking-tight text-base lg:text-lg">
            Descubre <span className="text-primary-fixed">Pucallpa</span>
          </h1>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="marquee-track flex w-max gap-16 whitespace-nowrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <p key={i} className="font-body-md text-background/60 text-xs" aria-hidden={i > 0 || undefined}>
                  Comercio, movilidad, trabajo, inmuebles, viajes y estilo de vida — en un solo lugar.
                  <span className="mx-6 text-background/30">•</span>
                  Callería · Yarinacocha · Manantay — <span className="text-primary-fixed font-bold">100% ucayalino</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portada rotativa + panel "Los 8 Portales de Boga" (lado a lado en escritorio) */}
      <div className="max-w-[1440px] mx-auto w-full lg:px-8 pt-4 lg:pt-6">
        <div className="lg:grid lg:grid-cols-[1.7fr_1fr] lg:gap-5 lg:items-stretch">
          <PortadaCarrusel notas={notasRevista} promos={promoBanners} style={bannerStyle} />
          <PortalesPanel />
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto w-full flex flex-col gap-9 lg:gap-12 pt-3 pb-9 lg:pt-8 lg:pb-12 px-container-margin lg:px-8">

        {/* Lo que se pide en Market — productos reales del catalogo, justo
            debajo de la tira de portales */}
        {comidaProducts.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">Lo que se pide en Market</h2>
              <Link href="/market" className="group shrink-0 font-label-md text-[12px] text-primary flex items-center gap-0.5 whitespace-nowrap">
                Ver todo
                <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </Link>
            </div>
            <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
              {comidaProducts.map((p) => (
                <Link
                  href={p.storeExternalUrl || `/${p.storeSlug}`}
                  key={p.id}
                  target={p.storeExternalUrl ? '_blank' : undefined}
                  rel={p.storeExternalUrl ? 'noreferrer' : undefined}
                  className="group bg-white border border-surface-container-highest rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md transition-all min-w-[150px] w-[150px] snap-start shrink-0"
                >
                  <div className="aspect-square bg-surface-container-low overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-2.5 flex flex-col gap-0.5">
                    <span className="font-label-md text-[9px] text-secondary uppercase tracking-wide truncate">{p.storeName}</span>
                    <h3 className="font-headline-sm text-xs text-on-surface leading-tight line-clamp-1">{p.name}</h3>
                    <span className="font-price-lg text-primary text-sm mt-0.5">S/ {p.price.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Guía rápida — ¿Primera vez en Pucallpa? (debajo del banner) */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">¿Primera vez en Pucallpa?</h2>
              <Link
                href="/guia"
                className="group shrink-0 font-label-md text-[12px] text-primary flex items-center gap-0.5 whitespace-nowrap"
              >
                Guía completa
                <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </Link>
            </div>
            <p className="font-body-md text-secondary text-xs">
              <span className="sm:hidden">Lo esencial para moverte, dormir y comer.</span>
              <span className="hidden sm:inline">Lo esencial para moverte, dormir, comer y pasarla bien.</span>
            </p>
          </div>
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {GUIA_PUCALLPA.map((g) => (
              <Link
                href={g.href}
                key={g.titulo}
                className="group bg-white border border-surface-container-highest rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md transition-all min-w-[150px] w-[150px] snap-start shrink-0"
              >
                <div className="aspect-square bg-surface-container-low overflow-hidden relative">
                  <img src={g.img} alt={g.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: g.color }}>
                    <span className="material-symbols-outlined text-white text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>{g.icon}</span>
                  </span>
                </div>
                <div className="p-2.5 flex flex-col gap-0.5">
                  <h3 className="font-headline-sm text-xs text-on-surface leading-tight">{g.titulo}</h3>
                  <p className="font-body-md text-secondary text-[10px] leading-snug line-clamp-2">{g.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Qué hacer en Pucallpa hoy */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Qué hacer en Pucallpa hoy" href="/eventos" cta="Ver agenda" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {queHacer.map((e) => (
              <Link href="/eventos" key={e.id} className="min-w-[220px] w-[220px] lg:min-w-[260px] lg:w-[260px] bg-white border border-surface-container-highest overflow-hidden shadow-sm rounded-2xl snap-start group flex flex-col">
                <div className="relative h-32 overflow-hidden bg-surface-container-low">
                  <img src={e.img} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-on-surface text-[10px] font-label-md px-2 py-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>{e.tag}
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2">{e.title}</h4>
                  <span className="text-secondary font-label-md text-[11px] mt-auto"><span className="font-price-lg text-primary text-sm">{e.meta}</span></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Del Market — Dónde comer esta semana (carrusel de listas) */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="w-fit bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider mb-0.5">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>Selección Boga
            </span>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">Dónde comer esta semana</h2>
              <Link href="/market" className="group shrink-0 font-label-md text-[12px] text-primary flex items-center gap-0.5 whitespace-nowrap">
                Ver Market<span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </Link>
            </div>
            <p className="font-body-md text-secondary text-xs">Listas por antojo — desliza para ver más.</p>
          </div>
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {COMER_LISTAS.map((lista) => (
              <div
                key={lista.id}
                className="snap-start shrink-0 w-[86%] sm:w-[380px] lg:w-[420px] bg-white border border-surface-container-highest shadow-sm rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-container-high">
                  <h3 className="font-headline-sm text-sm text-on-surface">{lista.titulo}</h3>
                  {lista.patrocinado && (
                    <span className="text-[9px] font-label-md uppercase tracking-wider text-secondary shrink-0">Patrocinado</span>
                  )}
                </div>
                <div className="flex flex-col">
                  {lista.lugares.map((r) => (
                    <Link
                      href="/market"
                      key={r.name}
                      className="group flex items-center gap-3 p-3 border-b border-surface-container-low last:border-0 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
                        <img src={r.img} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{r.name}</h4>
                        <div className="flex items-center gap-1 mt-0.5 text-secondary">
                          <span className="material-symbols-outlined text-tertiary text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-[11px] font-label-md line-clamp-1">{r.rating} · {r.cuisine}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-secondary/40 text-[18px] group-hover:text-primary transition-colors shrink-0">chevron_right</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Más de la Revista — SEO */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Más de la Revista" href="/revista" cta="Ver revista" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {masRevista.map((n) => (
              <Link href={n.href} key={n.key} className="min-w-[260px] w-[260px] lg:min-w-[300px] lg:w-[300px] snap-start group flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface-container-low">
                  <img src={n.img} alt={n.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <span className="absolute top-2 left-2 bg-white text-on-surface text-[9px] font-label-md px-2 py-0.5 uppercase tracking-wider">{n.cat}</span>
                  <h3 className="absolute inset-x-0 bottom-0 p-3 font-headline-sm text-white text-sm leading-tight line-clamp-2">{n.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Servicios y chamba */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Chamba y oficios" href="/servicios" cta="Ver todo" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {SERVICIOS_PEEK.map((s) => (
              <Link href="/servicios" key={s.id} className="min-w-[240px] w-[240px] lg:min-w-[280px] lg:w-[280px] snap-start shrink-0 bg-white border border-surface-container-highest rounded-2xl p-3 flex items-center gap-3 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
                  <img src={s.img} alt={s.nombre} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{s.nombre}</span>
                  <span className="block font-label-md text-[11px] text-secondary line-clamp-1">{s.oficio}</span>
                  <span className="font-label-md text-[10px] text-secondary/70 flex items-center gap-0.5 mt-0.5">
                    <span className="material-symbols-outlined text-[12px]">location_on</span>{s.zona}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Dónde vivir — Inmuebles */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Dónde vivir" href="/inmuebles" cta="Ver inmuebles" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {INMUEBLES_PEEK.map((a) => (
              <Link href="/inmuebles" key={a.id} className="min-w-[220px] w-[220px] lg:min-w-[260px] lg:w-[260px] bg-white border border-surface-container-highest overflow-hidden shadow-sm rounded-2xl snap-start group flex flex-col">
                <div className="relative h-32 overflow-hidden bg-surface-container-low">
                  <img src={a.img} alt={a.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{a.tag}</span>
                  <span className="absolute bottom-2 right-2 bg-white text-primary font-price-lg text-sm px-2 py-0.5 shadow-sm">{a.precio}</span>
                </div>
                <div className="p-3">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2 leading-tight">{a.titulo}</h4>
                  <span className="font-label-md text-[11px] text-secondary flex items-center gap-0.5 mt-1">
                    <span className="material-symbols-outlined text-[12px]">location_on</span>{a.zona}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Viajes & Transporte */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Viajes desde Pucallpa" href="/viajes" cta="Ver rutas" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {VIAJES_PEEK.map((v) => (
              <Link href="/viajes" key={v.id} className="min-w-[250px] w-[250px] lg:min-w-[290px] lg:w-[290px] snap-start shrink-0 bg-white border border-surface-container-highest rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md transition-all group flex items-center gap-3 p-3">
                <div className="w-11 h-11 rounded-xl bg-[#1B8EBF]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#1B8EBF] text-[22px]">{v.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{v.titulo}</h4>
                  <span className="font-label-md text-[11px] text-secondary">{v.medio} · {v.tiempo}</span>
                  <span className="block font-price-lg text-primary text-xs mt-0.5">{v.precio}</span>
                </div>
                <span className="material-symbols-outlined text-secondary/40 text-[18px] shrink-0 group-hover:translate-x-1 transition-transform">chevron_right</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Sorteo del mes */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Sorteo del mes" href="/sorteos" cta="Ver sorteos" />
          <Link href="/sorteos" className="group relative block overflow-hidden rounded-2xl aspect-[16/9] sm:aspect-[21/9] bg-[#3a1a6e] shadow-sm">
            <img src={SORTEO_PEEK.img} alt={SORTEO_PEEK.titulo} className="absolute inset-0 w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#3a1a6e]/95 via-[#3a1a6e]/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-1.5 p-5 lg:p-10 max-w-[520px]">
              <span className="w-fit text-[10px] font-label-md uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: '#c9f24a', color: '#2a1155' }}>Suma tickets con tus compras</span>
              <h3 className="font-headline-lg font-extrabold text-white text-2xl lg:text-4xl leading-[1.03]">{SORTEO_PEEK.titulo}</h3>
              <p className="text-white/80 font-body-md text-xs lg:text-sm">{SORTEO_PEEK.sub}</p>
            </div>
          </Link>
        </section>

        {/* Qué es Boga */}
        <section className="bg-on-surface text-background rounded-2xl p-6 lg:p-10">
          <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-background/50">Qué es Boga</span>
          <p className="font-headline-lg font-extrabold tracking-tight text-lg lg:text-2xl leading-snug mt-2 max-w-[46ch]">
            Boga es el sistema operativo digital de Pucallpa: una super-app que reúne el comercio,
            la movilidad segura, el trabajo, los inmuebles, los viajes y el estilo de vida de la ciudad
            en un solo lugar.
          </p>
          <Link href="/negocios" className="inline-flex items-center gap-1 mt-4 font-label-md text-[12px] text-primary-fixed">
            ¿Tienes un negocio? Vende con Boga
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </section>

      </main>
    </>
  );
}
