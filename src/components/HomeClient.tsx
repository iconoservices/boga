"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchNotasRevista } from '@/lib/revista';
import { fetchBanners, fetchCatalogo } from '@/lib/catalogo';
import { fetchEventos } from '@/lib/eventos';
import { fetchAlquileres } from '@/lib/alquileres';
import { fetchVentas } from '@/lib/ventas';
import { fetchViajes } from '@/lib/viajes';
import { fetchChamba, haceCuanto } from '@/lib/chamba';
import { fetchSorteos } from '@/lib/sorteos';
import { CarruselSorteos } from '@/components/SorteosCarrusel';
import { fetchLugares } from '@/lib/lugares';
import { BannerOverlay, type BannerStyle } from '@/components/BannerOverlay';
import { hrefTienda, esFuera } from '@/lib/tiendaUrl';
import {
  armarCatalogoHome, armarChamba, armarInmuebles, armarNotas, armarPromos, armarQueHacer, armarViajes,
  type HomeData, type HomeSlide, type NotaHome,
} from '@/lib/homeShape';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

// "/" = el Inicio del lado consumidor. Es el índice vivo de BogaHub: un vistazo a
// cada hub + contenido editorial fresco (SEO). Nada se resuelve acá, solo se
// descubre; cada bloque termina en "Ver todo". Buscador = /explore, B2B = /negocios.
// Los datos llegan ya leídos desde el servidor (app/page.tsx → lib/homeData.ts) y vienen
// dentro del HTML; este componente solo los pinta y anima. Si el servidor no pudo leer una
// sección (`inicial.fallidas`), esa sección se pide desde el navegador, como antes.

// Portada rotativa — un solo banner que va cambiando entre notas REALES de la
// Revista y promos cargadas por el superadmin.
type Slide = HomeSlide;

// Construye la lista de slides con datos REALES: las promos que cargó el superadmin (la primera
// abre el carrusel) intercaladas con las 2 notas más recientes de la Revista. Sin demos: si no
// hay nada, la lista queda vacía y el banner no se muestra.
function armarSlides(notas: NotaHome[], promos: Slide[]): Slide[] {
  const rev: Slide[] = notas.slice(0, 2).map((n) => ({
    kicker: `Revista · ${n.kicker}`,
    title: n.titulo,
    href: `/revista/${n.slug}`,
    img: n.img,
  }));
  // El primer banner que cargó el superadmin va de primero; después se intercalan las notas de la Revista.
  return [promos[0], rev[0], promos[1], rev[1], ...promos.slice(2)].filter(Boolean) as Slide[];
}

// Los 8 Portales de BogaHub — el lanzador de la ciudad. Un ícono por hub, cada
// uno con su color. El "sub" está escrito como lo que BogaHub te resuelve, no
// como una categoría: "cómo te ayudamos", en lenguaje cercano.
const PORTALES = [
  { href: '/explore',     label: 'Market',      icon: 'storefront',          sub: 'Te traemos pescado, carne y tienda', color: '#E8894A' },
  { href: '/trabajos',   label: 'Trabajos',    icon: 'construction',        sub: 'Te conseguimos técnico o trabajo',   color: '#3E9B5F' },
  { href: '/transporte', label: 'Taxi Seguro', icon: 'local_taxi',          sub: 'Te llevamos con chofer verificado',  color: '#E4655A' },
  { href: '/inmuebles',   label: 'Inmuebles',   icon: 'real_estate_agent',   sub: 'Te encontramos dónde vivir o invertir', color: '#8B7FD4' },
  { href: '/viajes',      label: 'Viajes',      icon: 'directions_boat',     sub: 'Te conectamos con rápidos y buses',  color: '#1B8EBF' },
  { href: '/eventos',     label: 'Agenda',      icon: 'celebration',         sub: 'Te armamos el finde en la ciudad',   color: '#EBB05C' },
  { href: '/sorteos',     label: 'Sorteos',     icon: 'confirmation_number', sub: 'Te hacemos ganar con tus compras',   color: '#2E9B76' },
  { href: '/revista',     label: 'Revista',     icon: 'menu_book',           sub: 'Te contamos la selva y sus historias', color: '#D97742' },
  { href: '/negocios',    label: 'Negocios',    icon: 'work',                sub: 'Te ponemos a vender por WhatsApp',   color: '#2F3B4C' },
];

// Guía rápida — "¿Primera vez en Pucallpa?". 6 necesidades, cada tarjeta
// manda al portal que la resuelve; la guía completa (clima, plata, etc.)
// vive en /guia. Tarjetas compactas (ícono + texto), sin foto.
const GUIA_PUCALLPA = [
  { href: '/inmuebles',   icon: 'real_estate_agent', titulo: 'Dónde quedarte', sub: 'Alquiler y venta de cuartos, casas y terrenos', color: '#8B7FD4', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/La_catedral_de_Pucallpa_2022.jpg/500px-La_catedral_de_Pucallpa_2022.jpg' },
  { href: '/transporte', icon: 'local_taxi',   titulo: 'Cómo moverte',   sub: 'Mototaxi, auto o moto con chofer verificado',       color: '#E4655A', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Jir%C3%B3n_Sucre_Pucallpa.jpg/500px-Jir%C3%B3n_Sucre_Pucallpa.jpg' },
  { href: '/eventos',     icon: 'map',          titulo: 'Qué hacer',      sub: 'Yarinacocha, Boquerón, ferias y agenda cultural',   color: '#EBB05C', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Laguna_de_Yarinacocha_desde_un_bote_01.jpg/500px-Laguna_de_Yarinacocha_desde_un_bote_01.jpg' },
  { href: '/explore',      icon: 'ramen_dining', titulo: 'Dónde comer',    sub: 'Huariques, menús del día y cocina de la selva',     color: '#E8894A', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Tacacho_con_cecina.jpg/500px-Tacacho_con_cecina.jpg' },
  { href: '/trabajos',   icon: 'construction', titulo: 'Buscar trabajo',  sub: 'Técnicos de confianza y bolsa de empleo local',     color: '#3E9B5F', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Textiler%C3%ADa_shipiba_en_pucalla.jpg/500px-Textiler%C3%ADa_shipiba_en_pucalla.jpg' },
  { href: '/explore',      icon: 'storefront',   titulo: 'Qué comprar',    sub: 'Pescado y carne fresca, abarrotes y artesanía',     color: '#D97742', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Feria_Artesanal_por_el_Mes_Patrio%2C%2C_estudiantes_observando_las_l%C3%ADneas_shipibas.jpg/500px-Feria_Artesanal_por_el_Mes_Patrio%2C%2C_estudiantes_observando_las_l%C3%ADneas_shipibas.jpg' },
];

// Atajo a la pestaña Negocios (/negocios), que explica qué gana el negocio y desde ahí llega al formulario de alta.
function RegistraNegocio() {
  return (
    <Link
      href="/negocios"
      className="group flex items-center gap-2.5 bg-white border border-primary/20 rounded-xl px-3 py-2 lg:px-4 lg:py-3 shadow-sm hover:border-primary/40 hover:shadow-md active:scale-[0.99] transition-all"
    >
      <span className="w-8 h-8 lg:w-11 lg:h-11 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-[18px] lg:text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block font-headline-sm text-sm lg:text-base font-bold text-on-surface">Registra tu negocio</span>
        <span className="block font-body-md text-[11px] lg:text-xs text-secondary mt-0.5 truncate">Crea tu tienda y vende por WhatsApp</span>
      </span>
      <span className="material-symbols-outlined text-secondary/50 text-[20px] shrink-0 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
    </Link>
  );
}

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
function PortadaCarrusel({ notas, promos, style, cargando }: { notas: NotaHome[]; promos: Slide[]; style: BannerStyle; cargando: boolean }) {
  const slides = React.useMemo(() => armarSlides(notas, promos), [notas, promos]);
  const [i, setI] = useState(0);
  const n = slides.length;

  // Si cambia la cantidad de slides (llegan las notas reales), no dejar el
  // índice fuera de rango.
  useEffect(() => { setI((v) => (v < n ? v : 0)); }, [n]);

  const next = useCallback(() => setI((v) => (n ? (v + 1) % n : 0)), [n]);
  const prev = () => setI((v) => (n ? (v - 1 + n) % n : 0));

  useEffect(() => {
    if (n < 2) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next, n]);

  // Mientras llegan los datos reales: recuadro gris neutro (nunca un flyer de muestra).
  if (cargando) {
    return (
      <div className="w-screen mx-[calc(50%-50vw)] lg:w-full lg:mx-0">
        <div className="bg-surface-container-low animate-pulse aspect-video lg:rounded-2xl" aria-hidden="true" />
      </div>
    );
  }
  if (n === 0) return null;

  return (
    <div className="w-screen mx-[calc(50%-50vw)] lg:w-full lg:mx-0">
      <div className="relative overflow-hidden lg:rounded-2xl bg-surface-container-low shadow-sm aspect-video">
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {slides.map((s, idx) => (
            // La primera imagen es lo más grande de la pantalla (LCP): se pide primero y con prioridad; el resto espera.
            <Link key={`${idx}-${s.href}`} href={s.href} className="group relative w-full h-full shrink-0">
              {s.pura ? (
                <>
                  <img src={s.img} alt="" aria-hidden loading={idx === 0 ? 'eager' : 'lazy'} className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
                  <img src={s.img} alt={s.title} loading={idx === 0 ? 'eager' : 'lazy'} fetchPriority={idx === 0 ? 'high' : 'auto'} className="absolute inset-0 w-full h-full object-contain" />
                </>
              ) : (
                <img src={s.img} alt={s.title} loading={idx === 0 ? 'eager' : 'lazy'} fetchPriority={idx === 0 ? 'high' : 'auto'} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
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

        <div className="absolute bottom-3 right-3 flex gap-1.5 z-20 sm:contents">
        <button onClick={(e) => { e.preventDefault(); prev(); }} aria-label="Anterior" className="flex sm:absolute sm:left-3 sm:top-1/2 sm:-translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-on-surface">chevron_left</span>
        </button>
        <button onClick={(e) => { e.preventDefault(); next(); }} aria-label="Siguiente" className="flex sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-on-surface">chevron_right</span>
        </button>
        </div>
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

// Panel "Los 8 Portales de BogaHub" — el lanzador de la ciudad, al lado de la
// portada en escritorio y apilado en móvil. Antes era una grilla 3x3 con
// descripción (~400px de alto); ahora es una tira horizontal compacta
// (ícono + nombre, sin descripción) para no competir tanto con el banner.
function PortalesPanel() {
  // En móvil la tira se desliza sola de a un portal cada 3 s (vuelve al inicio
  // al llegar al final). Se pausa mientras el usuario la toca y unos segundos
  // después. En escritorio (flex-wrap, sin overflow) no hace nada.
  const tira = React.useRef<HTMLDivElement>(null);
  const pausaHasta = React.useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      const el = tira.current;
      if (!el || el.scrollWidth <= el.clientWidth + 4) return;
      if (Date.now() < pausaHasta.current) return;
      const paso = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 64;
      const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: fin ? 0 : el.scrollLeft + paso + 12, behavior: 'smooth' });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  const pausar = () => { pausaHasta.current = Date.now() + 6000; };

  return (
    <div className="px-container-margin lg:px-0 pt-6 lg:pt-0 lg:relative lg:min-h-0">
      <div className="panel-portales flex flex-col gap-4 lg:absolute lg:inset-0 lg:gap-3 lg:justify-between">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-xl lg:whitespace-nowrap leading-tight">
              Todo Pucallpa en una sola app
            </h2>
            <p className="panel-portales-sub font-body-md text-secondary text-xs mt-1 max-w-[52ch]">
              <span className="lg:hidden">Transporte, servicios y agenda de la ciudad.</span>
              <span className="hidden lg:inline">Transporte verificado, servicios de confianza y la agenda de la ciudad, en tiempo real.</span>
            </p>
          </div>
          <span className="panel-portales-sinc hidden sm:flex lg:hidden 2xl:flex items-center gap-1.5 font-label-md text-[10px] text-secondary shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F8A55] animate-pulse" />
            Sincronizado
          </span>
        </div>

        <div ref={tira} onTouchStart={pausar} onPointerDown={pausar} onWheel={pausar} className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x lg:grid lg:grid-cols-3 lg:grid-rows-3 lg:gap-2.5 lg:overflow-visible lg:flex-1 lg:min-h-0 lg:pb-0" style={{ scrollbarWidth: 'none' }}>
          {PORTALES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col items-center gap-1.5 shrink-0 w-16 snap-start lg:w-auto lg:h-full lg:min-h-0 lg:justify-center lg:gap-[clamp(2px,1.2cqh,8px)] lg:py-0 lg:bg-white lg:border lg:border-surface-container-highest lg:rounded-2xl lg:shadow-sm lg:hover:shadow-md lg:hover:border-primary/30 lg:transition-all"
            >
              <span
                className="w-12 h-12 lg:w-[clamp(26px,8.5cqh,54px)] lg:h-[clamp(26px,8.5cqh,54px)] rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
                style={{ backgroundColor: p.color }}
              >
                <span className="material-symbols-outlined text-white text-[22px] lg:text-[length:clamp(15px,4.8cqh,30px)]" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
              </span>
              <span className="font-label-md text-[10px] lg:text-xs lg:font-semibold text-on-surface text-center leading-tight line-clamp-1 w-full">{p.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden lg:block">
          <RegistraNegocio />
        </div>
      </div>
    </div>
  );
}

export default function HomeClient({ inicial }: { inicial: HomeData }) {
  const { cartCount, setIsCartOpen } = useCart();

  const [d, setD] = useState<HomeData>(inicial);
  // Secciones que el servidor no pudo leer y que aún faltan por llegar desde el navegador.
  const [pendientes, setPendientes] = useState<string[]>(inicial.fallidas);

  // Plan B: solo si el servidor no pudo leer alguna sección (p. ej. Supabase caído justo al generar
  // la página), esa sección se pide desde acá con los mismos endpoints cacheados y las mismas
  // transformaciones de siempre. En el caso normal no hace ninguna llamada.
  useEffect(() => {
    if (inicial.fallidas.length === 0) return;
    let vivo = true;
    const pide = (s: HomeData['fallidas'][number], cargar: () => Promise<Partial<HomeData>>) => {
      if (!inicial.fallidas.includes(s)) return;
      cargar().then((parcial) => {
        if (!vivo) return;
        setD((v) => ({ ...v, ...parcial }));
        setPendientes((p) => p.filter((x) => x !== s));
      });
    };
    pide('revista', async () => ({ notas: armarNotas(await fetchNotasRevista()) }));
    pide('promos', async () => {
      const { banners, style } = await fetchBanners('home');
      return { promos: armarPromos(banners), bannerStyle: style };
    });
    pide('agenda', async () => {
      const [eventos, lugares] = await Promise.all([fetchEventos(), fetchLugares()]);
      return { queHacer: armarQueHacer(eventos, lugares) };
    });
    pide('chamba', async () => {
      const { empleos, oficios } = await fetchChamba();
      return armarChamba(empleos, oficios);
    });
    pide('sorteos', async () => ({ sorteos: (await fetchSorteos()).filter((x) => x.status === 'abierto') }));
    pide('viajes', async () => ({ viajes: armarViajes(await fetchViajes()) }));
    pide('inmuebles', async () => {
      const [alq, vta] = await Promise.all([fetchAlquileres(), fetchVentas()]);
      return { inmuebles: armarInmuebles(alq, vta) };
    });
    pide('catalogo', async () => {
      const { stores, products } = await fetchCatalogo();
      return armarCatalogoHome(stores, products);
    });
    return () => { vivo = false; };
  }, [inicial]);

  const { notas: notasRevista, promos: promoBanners, bannerStyle, queHacer, empleos: empleosHome, oficios: oficiosHome,
    sorteos: sorteosHome, viajes: viajesHome, inmuebles: inmueblesHome, productos: comidaProducts, tiendasComida } = d;

  const masRevista = notasRevista.map((n) => ({ key: n.slug, href: `/revista/${n.slug}`, cat: n.kicker, title: n.titulo, img: n.img }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'BogaHub',
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        sameAs: [] as string[],
      },
      {
        '@type': 'WebSite',
        name: 'BogaHub · Todo Pucallpa en una app',
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

      {/* Portada rotativa + panel "Los 8 Portales de BogaHub" (lado a lado en escritorio) */}
      <div className="max-w-[1440px] mx-auto w-full lg:px-8 pt-0 lg:pt-6">
        <div className="lg:grid lg:grid-cols-[1.7fr_1fr] lg:gap-5 lg:items-stretch">
          <PortadaCarrusel notas={notasRevista} promos={promoBanners} style={bannerStyle} cargando={pendientes.includes('revista') || pendientes.includes('promos')} />
          <PortalesPanel />
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto w-full flex flex-col gap-9 lg:gap-12 pt-3 pb-9 lg:pt-8 lg:pb-12 px-container-margin lg:px-8">

        {/* Registra tu negocio — en celular, bajo los portales; en escritorio va en el panel, al costado del banner */}
        <div className="lg:hidden mt-1">
          <RegistraNegocio />
        </div>

        {/* Lo que se pide en Market — productos reales de todas las categorías, justo
            debajo de la tira de portales */}
        {comidaProducts.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">Lo que se pide en Market</h2>
              <Link href="/explore" className="group shrink-0 font-label-md text-[12px] text-primary flex items-center gap-0.5 whitespace-nowrap">
                Ver todo
                <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </Link>
            </div>
            <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
              {comidaProducts.map((p) => (
                <Link
                  href={hrefTienda(p.storeSlug, p.storeExternalUrl)}
                  key={p.id}
                  target={esFuera(hrefTienda(p.storeSlug, p.storeExternalUrl)) ? '_blank' : undefined}
                  rel={esFuera(hrefTienda(p.storeSlug, p.storeExternalUrl)) ? 'noopener' : undefined}
                  className="group bg-white border border-surface-container-highest rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md transition-all min-w-[150px] w-[150px] snap-start shrink-0"
                >
                  <div className="aspect-square bg-surface-container-low overflow-hidden">
                    <img loading="lazy" src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-2.5 flex flex-col gap-0.5">
                    <span className="font-label-md text-[9px] text-secondary uppercase tracking-wide truncate">{p.storeName}</span>
                    <h3 className="font-headline-sm text-xs text-on-surface leading-tight line-clamp-1">{p.name}</h3>
                    <span className="font-price-lg text-primary text-sm mt-0.5">S/ {p.price.toFixed(2)}{p.priceAnterior && <span className="ml-1.5 text-[11px] font-normal text-secondary line-through">S/ {p.priceAnterior.toFixed(2)}</span>}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Vuelos: puerta al buscador de /viajes/vuelos (siempre visible: no depende de tener rutas cargadas) */}
        <Link
          href="/viajes/vuelos"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#8a0d09] via-[#B8130E] to-[#d6281e] text-white p-4 sm:p-5 flex items-center gap-4 active:scale-[0.99] transition-transform"
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

        {/* Qué hacer en Pucallpa hoy — justo después de Market */}
        {queHacer.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHead title="Qué hacer en Pucallpa hoy" href="/eventos" cta="Ver agenda" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {queHacer.map((e) => (
              <Link href="/eventos" key={e.id} className="min-w-[220px] w-[220px] lg:min-w-[260px] lg:w-[260px] bg-white border border-surface-container-highest overflow-hidden shadow-sm rounded-2xl snap-start group flex flex-col">
                <div className="relative h-32 overflow-hidden bg-surface-container-low flex items-center justify-center">
                  {/* Si la foto no carga (p. ej. un enlace de Facebook que caducó) se ve este ícono, no el texto roto */}
                  <span className="material-symbols-outlined text-[40px] text-secondary/40" aria-hidden>event</span>
                  <img loading="lazy" src={e.img} alt="" onError={(ev) => { ev.currentTarget.style.display = 'none'; }} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
        )}

        {/* Guía rápida — ¿Primera vez en Pucallpa? */}
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
                  <img loading="lazy" src={g.img} alt={g.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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

        {/* Tiendas de comida — solo rubro comida/bebida, con su logo y sus productos */}
        {tiendasComida.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">Tiendas de comida</h2>
              <Link href="/explore" className="group shrink-0 font-label-md text-[12px] text-primary flex items-center gap-0.5 whitespace-nowrap">
                Ver todas
                <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </Link>
            </div>
            <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
              {tiendasComida.map((t) => (
                <Link
                  key={t.slug}
                  href={hrefTienda(t.slug, t.externalUrl)}
                  target={esFuera(hrefTienda(t.slug, t.externalUrl)) ? '_blank' : undefined}
                  rel={esFuera(hrefTienda(t.slug, t.externalUrl)) ? 'noopener' : undefined}
                  className="group snap-start shrink-0 w-[290px] bg-white border border-surface-container-highest rounded-2xl overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 p-3 border-b border-surface-container-high">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-surface-container-low border border-surface-container-highest flex items-center justify-center shrink-0">
                      {t.logo ? (
                        <img src={t.logo} alt={t.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-headline-sm text-primary">{t.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{t.name}</h3>
                      <p className="font-body-md text-[11px] text-secondary leading-tight line-clamp-1 mt-0.5">{t.tagline}</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary/40 text-[18px] shrink-0 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {t.productos.map((p) => (
                      <div key={p.id} className="min-w-0">
                        <div className="aspect-square rounded-lg overflow-hidden bg-surface-container-low">
                          <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                        </div>
                        <p className="font-label-md text-[10px] text-on-surface leading-tight line-clamp-1 mt-1">{p.name}</p>
                        <p className="font-price-lg text-primary text-[11px]">S/ {p.price.toFixed(2)}{p.priceAnterior && <span className="ml-1 text-[9px] font-normal text-secondary line-through">S/ {p.priceAnterior.toFixed(2)}</span>}</p>
                      </div>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Más de la Revista — SEO */}
        {masRevista.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHead title="Más de la Revista" href="/revista" cta="Ver revista" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {masRevista.map((n) => (
              <Link href={n.href} key={n.key} className="min-w-[260px] w-[260px] lg:min-w-[300px] lg:w-[300px] snap-start group flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface-container-low">
                  <img loading="lazy" src={n.img} alt={n.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <span className="absolute top-2 left-2 bg-white text-on-surface text-[9px] font-label-md px-2 py-0.5 uppercase tracking-wider">{n.cat}</span>
                  <h3 className="absolute inset-x-0 bottom-0 p-3 font-headline-sm text-white text-sm leading-tight line-clamp-2">{n.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
        )}

        {/* Trabajos y oficios — solo datos reales; sin ninguno, no se muestra */}
        {(empleosHome.length > 0 || oficiosHome.length > 0) && (
        <section className="flex flex-col gap-4">
          <SectionHead title="Trabajos y oficios" href="/trabajos" cta="Ver todo" />

          {empleosHome.length > 0 && (
            <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
              {empleosHome.map((e) => (
                <Link
                  href="/trabajos"
                  key={e.id}
                  className="group min-w-[260px] w-[260px] lg:min-w-[290px] lg:w-[290px] snap-start shrink-0 bg-white border border-surface-container-highest rounded-2xl p-3 flex flex-col gap-2.5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-primary-fixed flex items-center justify-center">
                      {e.img ? (
                        <img src={e.img} alt={e.puesto} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-[24px]">work</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-2">{e.puesto}</h3>
                      <span className="block font-label-md text-[11px] text-secondary line-clamp-1 mt-0.5">{[e.negocio, e.zona].filter(Boolean).join(' · ')}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {e.tipo && <span className="bg-surface-container-low text-secondary text-[10px] font-label-md px-2 py-0.5 rounded-full border border-surface-container-highest">{e.tipo}</span>}
                    {e.pago && <span className="bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full">{e.pago}</span>}
                    {haceCuanto(e.subido) && <span className="text-secondary/70 font-label-md text-[10px] ml-auto">{haceCuanto(e.subido)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {oficiosHome.length > 0 && (
            <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
              {oficiosHome.map((s) => (
                <Link href="/trabajos" key={s.id} className="min-w-[240px] w-[240px] lg:min-w-[280px] lg:w-[280px] snap-start shrink-0 bg-white border border-surface-container-highest rounded-2xl p-3 flex items-center gap-3 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
                    {s.img ? (
                      <img loading="lazy" src={s.img} alt={s.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-secondary/40"><span className="material-symbols-outlined text-[24px]">construction</span></div>
                    )}
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
          )}
        </section>
        )}

        {/* Dónde quedarte — solo avisos reales; sin ninguno, no se muestra */}
        {inmueblesHome.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHead title="Dónde quedarte" href="/inmuebles" cta="Ver inmuebles" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {inmueblesHome.map((a) => (
              <Link href="/inmuebles" key={a.id} className="min-w-[220px] w-[220px] lg:min-w-[260px] lg:w-[260px] bg-white border border-surface-container-highest overflow-hidden shadow-sm rounded-2xl snap-start group flex flex-col">
                <div className="relative h-32 overflow-hidden bg-surface-container-low">
                  {a.img ? <img src={a.img} alt={a.titulo} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-secondary/30"><span className="material-symbols-outlined text-[36px]">real_estate_agent</span></div>}
                  <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{a.tag}</span>
                  <span className="absolute bottom-2 right-2 bg-white text-primary font-price-lg text-sm px-2 py-0.5 shadow-sm">{a.precio}</span>
                </div>
                <div className="p-3">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2 leading-tight">{a.titulo}</h4>
                  <span className="font-label-md text-[11px] text-secondary flex items-center gap-0.5 mt-1">
                    <span className="material-symbols-outlined text-[12px] shrink-0">location_on</span><span className="truncate">{a.zona}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        )}

        {/* Sorteos — solo si hay alguno real abierto; mismas tarjetas de carrusel que /sorteos */}
        {sorteosHome.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHead title="Sorteos" href="/sorteos" cta="Ver sorteos" />
          <CarruselSorteos items={sorteosHome} />
        </section>
        )}

        {/* Viajes & Transporte — solo con rutas reales cargadas */}
        {viajesHome.length > 0 && (        <section className="flex flex-col gap-4">
          <SectionHead title="Viajes desde Pucallpa" href="/viajes" cta="Ver rutas" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {viajesHome.map((v) => (
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
        )}

        {/* Qué es BogaHub */}
        <section className="bg-on-surface text-background rounded-2xl p-6 lg:p-10">
          <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-background/50">Qué es BogaHub</span>
          <p className="font-headline-lg font-extrabold tracking-tight text-lg lg:text-2xl leading-snug mt-2 max-w-[46ch]">
            BogaHub es el sistema operativo digital de Pucallpa: una super-app que reúne el comercio,
            la movilidad segura, el trabajo, los inmuebles, los viajes y el estilo de vida de la ciudad
            en un solo lugar.
          </p>
          <Link href="/negocios" className="inline-flex items-center gap-1 mt-4 font-label-md text-[12px] text-primary-fixed">
            ¿Tienes un negocio? Vende con BogaHub
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </section>

      </main>
    </>
  );
}
