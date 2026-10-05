'use client';

import React, { useMemo, useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { useTabRuta } from '../shared/useTabRuta';
import { TXT, ICON, inicialesDe } from '../shared/tokens';
import type { PerfilEmpresa } from '@/lib/perfilEmpresa';
import FormularioCotizacion from './FormularioCotizacion';
import { ProductModal, BottomNav, StoreFooter } from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  /** Pestaña con la que abre (desde /<tienda>/<sección>). */
  initialTab?: string;
}

// Solo para la vista previa de la plantilla (/preview/empresa): una tienda real muestra lo que cargó en su admin.
const PERFIL_DEMO: PerfilEmpresa = {
  nosotros: 'Somos una empresa dedicada a la fabricación y montaje de estructuras metálicas, tuberías y tanques para empresas públicas y privadas.',
  mision: 'Brindar servicios profesionales y eficientes, cuidando la seguridad de nuestros trabajadores y el medio ambiente.',
  vision: 'Ser una empresa líder y reconocida por su excelencia y mejora continua.',
  politicas: [
    { titulo: 'Política de calidad', texto: 'Mantener y mejorar de forma continua nuestro sistema de gestión para aumentar la satisfacción de nuestros clientes.' },
    { titulo: 'Política de seguridad y salud', texto: 'Generar condiciones de trabajo seguras y cumplir con la normativa vigente y los estándares de nuestros clientes.' },
  ],
  clientes: ['Cliente de ejemplo S.A.C.', 'Empresa de ejemplo E.I.R.L.'],
  sectores: ['Petroleras', 'Gasíferas', 'Minería', 'Construcción'],
};

const PASOS = [
  { icon: 'chat', titulo: 'Cuéntanos tu proyecto', texto: 'Escríbenos por WhatsApp con lo que necesitas.' },
  { icon: 'request_quote', titulo: 'Recibe tu cotización', texto: 'Evaluamos tu pedido y te enviamos una propuesta.' },
  { icon: 'construction', titulo: 'Ejecutamos la obra', texto: 'Fabricación y montaje en taller o en tu local.' },
];

/** Punto de color que sigue al mouse por toda la página (con retraso suave) y crece sobre links y botones. Solo con mouse. */
function PuntoCursor({ color }: { color: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = -100, y = -100, px = -100, py = -100, escala = 1, raf = 0;
    const mover = (e: MouseEvent) => {
      x = e.clientX; y = e.clientY;
      el.style.opacity = '1';
      escala = (e.target as HTMLElement | null)?.closest?.('a,button,[role="button"],summary,input,select,textarea') ? 2.4 : 1;
    };
    const salir = () => { el.style.opacity = '0'; };
    const tick = () => {
      px += (x - px) * 0.18; py += (y - py) * 0.18;
      el.style.transform = `translate(${px - 8}px, ${py - 8}px) scale(${escala})`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', mover);
    document.documentElement.addEventListener('mouseleave', salir);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', mover); document.documentElement.removeEventListener('mouseleave', salir); };
  }, []);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] w-4 h-4 rounded-full opacity-0 transition-opacity duration-300"
      style={{ background: color, boxShadow: `0 0 14px ${color}` }}
    />
  );
}

/** Aparece suave (sube y se desvanece) cuando entra en pantalla. Sin movimiento si el equipo pide menos animación. */
function Aparece({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisto(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: visto ? 1 : 0, transform: visto ? 'none' : 'translateY(28px)', transition: `opacity .7s ease ${delay}ms, transform .7s ease ${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Encabezado de una sección de "Nosotros": una línea chica arriba y el título. */
function TituloSeccion({ t, kicker, titulo, accion }: { t: StoreConfig['theme']; kicker: string; titulo: string; accion?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className={`${TXT.micro} font-extrabold uppercase tracking-widest`} style={{ color: t.primary }}>{kicker}</p>
        <h3 className="font-black text-xl md:text-2xl mt-0.5" style={{ color: t.onSurface }}>{titulo}</h3>
      </div>
      {accion}
    </div>
  );
}

/**
 * Tarjeta de un servicio: foto, nombre y descripción (tocar abre el detalle) y, debajo, un botón que abre WhatsApp con ese
 * servicio ya escrito en el mensaje. La usan Inicio y Servicios.
 */
function TarjetaServicio({
  t, prod, onAbrir, onCotizar, conWhatsApp,
}: {
  t: StoreConfig['theme'];
  prod: { name: string; desc?: string; image: string };
  onAbrir: () => void;
  onCotizar: () => void;
  /** Sin WhatsApp cargado el botón no tiene a dónde ir: la tarjeta solo abre el detalle. */
  conWhatsApp: boolean;
}) {
  return (
    <div className="group flex flex-col rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
      <button onClick={onAbrir} className="text-left flex-1 active:opacity-90 transition-opacity" aria-label={`Ver ${prod.name}`}>
        <div className="aspect-[4/3] overflow-hidden">
          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="p-4 pb-3">
          <p className={`font-extrabold ${TXT.lead} leading-snug line-clamp-2`} style={{ color: t.onSurface }}>{prod.name}</p>
          {prod.desc && <p className={`${TXT.small} mt-1 line-clamp-2`} style={{ color: t.onSurfaceVariant }}>{prod.desc}</p>}
        </div>
      </button>
      <div className="px-4 pb-4">
        {conWhatsApp ? (
          <button
            onClick={onCotizar}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold ${TXT.body} border-2 border-[var(--marca)] text-[var(--marca)] bg-transparent transition-colors hover:bg-[var(--marca)] hover:text-white active:bg-[var(--marca)] active:text-white`}
            // El color va en la clase (no en style): un style en línea le ganaba al hover y el texto se quedaba azul sobre azul.
            style={{ '--marca': t.primary } as React.CSSProperties}
          >
            <IconoWhatsApp className="w-5 h-5" />
            Cotizar este servicio
          </button>
        ) : (
          <button onClick={onAbrir} className={`w-full py-3 rounded-xl font-bold ${TXT.body} border-2 active:scale-[0.98] transition-all`} style={{ borderColor: t.primary, color: t.primary }}>
            Ver detalle
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Clientes: una sola cuadrícula, todas las tarjetas del mismo tamaño y en el orden de la lista. Con logo se ve el logo;
 * sin logo, su nombre con un icono. (Antes los que no tenían logo no salían en el Inicio.)
 */
function ClientesGrilla({ t, clientes, logos }: { t: StoreConfig['theme']; clientes: string[]; logos?: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {clientes.map((cl) => (
        <div key={cl} className="h-24 rounded-2xl flex items-center justify-center p-4 text-center" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
          {logos?.[cl] ? (
            <img src={logos[cl]} alt={cl} title={cl} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1 min-w-0">
              <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.primary }}>domain</span>
              <span className={`${TXT.small} font-bold leading-tight line-clamp-2`} style={{ color: t.onSurface }}>{cl}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Cabecera azul de cada pestaña: línea chica, título y una frase. */
function CabeceraPestana({ t, kicker, titulo, frase }: { t: StoreConfig['theme']; kicker: string; titulo: string; frase: string }) {
  return (
    <section className="py-10 md:py-14" style={{ background: t.secondary }}>
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <p className={`${TXT.micro} font-extrabold uppercase tracking-widest text-white/70`}>{kicker}</p>
        <h2 className="font-black text-3xl md:text-4xl leading-tight text-white mt-1">{titulo}</h2>
        <p className="text-base md:text-lg leading-relaxed text-white/90 mt-3 max-w-2xl">{frase}</p>
      </div>
    </section>
  );
}

const ICONO_FILA: Record<string, string> = { Horario: 'schedule', 'Dirección': 'location_on', Zona: 'map', WhatsApp: 'call' };

/** Logo de WhatsApp (el mismo del botón flotante y del botón de la portada). */
function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className ?? ''} fill-current shrink-0`} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.85 9.85 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

/**
 * Plantilla "Empresa de Servicios": para negocios que cotizan (metalmecánica, construcción,
 * talleres), no que venden por carrito. Sin precios ni carrito (useCatalogo oculta ambos cuando
 * store.template === 'empresa'): cada servicio se consulta por WhatsApp. La galería de obras sale
 * de las fotos de los mismos servicios que carga el comercio, no de un campo aparte.
 * Pestañas: Inicio, Servicios, Obras, Contacto.
 */
export default function EmpresaTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);
  const [activeTab, setActiveTab] = useTabRuta(store.slug, 'home', initialTab);
  const [foto, setFoto] = useState<string | null>(null);
  const perfil = store.perfilEmpresa ?? (store.demoDePlantilla ? PERFIL_DEMO : undefined);
  const hayNosotros = !!(perfil && (perfil.nosotros || perfil.mision || perfil.vision || perfil.politicas?.length || perfil.clientes?.length || perfil.sectores?.length || perfil.equipoFoto));

  // Galería de obras: las fotos que el comercio subió para eso (aparte de las de cada servicio).
  // Solo la vista previa de la plantilla usa las fotos de los servicios de ejemplo, para que se vea llena.
  const obras = useMemo(() => {
    if (perfil?.obras?.length) return perfil.obras;
    if (!store.demoDePlantilla) return [];
    const todas = c.products.flatMap((p) => (p.images?.length ? p.images : [p.image]));
    return [...new Set(todas.filter(Boolean))].slice(0, 18);
  }, [perfil?.obras, store.demoDePlantilla, c.products]);

  const TABS = [
    { id: 'home', label: 'Inicio' },
    { id: 'servicios', label: 'Servicios' },
    ...(obras.length > 0 ? [{ id: 'obras', label: 'Obras' }] : []),
    ...(hayNosotros ? [{ id: 'nosotros', label: 'Nosotros' }] : []),
    { id: 'contacto', label: 'Contacto' },
  ];


  const irA = (tab: string, cat?: string) => {
    setActiveTab(tab);
    if (cat) c.setActiveCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cotizar = (msg?: string) =>
    enviarPedidoPorWhatsApp(store, msg ?? `¡Hola ${store.name}! Quisiera pedir una cotización.`);

  const cotizarPorCorreo = () => {
    if (!perfil?.email) return;
    const asunto = encodeURIComponent(`Cotización - ${store.name}`);
    const cuerpo = encodeURIComponent(`Hola ${store.name}, quisiera pedir una cotización.\n\nMi nombre:\nMi teléfono:\nQué necesito:`);
    window.location.href = `mailto:${perfil.email}?subject=${asunto}&body=${cuerpo}`;
  };

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  const filas = [
    ...(store.horario ? [{ label: 'Horario', valor: store.horario }] : []),
    ...(store.direccion ? [{ label: 'Dirección', valor: store.direccion }] : []),
    ...(store.zona ? [{ label: 'Zona', valor: store.zona }] : []),
    ...(c.telefonoVisible ? [{ label: 'WhatsApp', valor: c.telefonoVisible }] : []),
  ];

  const categorias = c.categoriasConFoto(6);

  // Cierre con llamado a cotizar: el mismo en Inicio y en Nosotros.
  const cierre = (c.whatsappVisible || perfil?.email) ? (
    <section className="rounded-3xl p-8 md:p-12 text-center" style={{ background: t.secondaryContainer }}>
      <h3 className="font-black text-2xl md:text-3xl" style={{ color: t.secondary }}>¿Tienes un proyecto en mente?</h3>
      <p className={`${TXT.body} md:text-base mt-2 max-w-xl mx-auto`} style={{ color: t.onSurfaceVariant }}>Cuéntanos qué necesitas y te enviamos una cotización.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        {c.whatsappVisible && (
          <button onClick={() => cotizar()} className={`px-7 py-3.5 rounded-xl font-bold ${TXT.body} flex items-center justify-center gap-2 active:scale-95 transition-all`} style={{ background: t.secondary, color: '#ffffff' }}>
            Cotiza por WhatsApp
            <IconoWhatsApp className="w-5 h-5" />
          </button>
        )}
        {perfil?.email && (
          <button onClick={cotizarPorCorreo} className={`px-7 py-3.5 rounded-xl font-bold ${TXT.body} flex items-center justify-center gap-2 border-2 active:scale-95 transition-all`} style={{ borderColor: t.secondary, color: t.secondary }}>
            Cotizar por correo
            <span className={`material-symbols-outlined ${ICON.md}`}>mail</span>
          </button>
        )}
      </div>
    </section>
  ) : null;

  // Titular: el lema de la tienda; sin lema, el nombre. En la vista previa de la plantilla, un texto de ejemplo.
  const titular = store.demoDePlantilla ? 'Fabricación y montaje de estructuras metálicas' : (store.tagline || store.name);

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <PuntoCursor color={t.primary} />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <StoreHeader
        store={store}
        tabs={TABS}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={0}
        ctaLabel="Cotizar"
        nombreRecto
        menuDe={{
          tabId: 'servicios',
          items: c.products.slice(0, 8).map((x) => ({ id: x.id, nombre: x.name, imagen: x.image })),
          onItem: (id) => { const prod = c.products.find((x) => x.id === id); if (prod) c.abrirProducto(prod); },
        }}
        onCta={() => cotizar()}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* ══ PORTADA ══ */}
            {store.hideHeroText ? (
              <>
                {/* Portada limpia: el comercio sube un banner ya diseñado (con su logo y textos); se ve entero, sin texto encima. */}
                <section className="relative w-full" style={{ background: t.secondary }}>
                  <img className="w-full h-auto block" alt={store.heroAlt} src={store.heroImage} />
                  <StoreFloatingActions store={store} />
                </section>
                <section className="px-5 md:px-10 py-4 flex flex-col sm:flex-row sm:justify-center gap-3" style={{ background: t.surface, borderBottom: `1px solid ${t.outlineVariant}40` }}>
                  <button
                    onClick={() => irA('servicios')}
                    className={`px-6 py-3 rounded-xl font-bold ${TXT.body} md:text-base active:scale-95 transition-all`}
                    style={{ background: t.primary, color: t.onPrimary }}
                  >
                    Ver servicios
                  </button>
                  {c.whatsappVisible && (
                    <button
                      onClick={() => cotizar()}
                      className={`px-6 py-3 rounded-xl font-bold ${TXT.body} md:text-base flex items-center justify-center gap-2 active:scale-95 transition-all`}
                      style={{ background: t.secondary, color: '#ffffff' }}
                    >
                      Cotiza por WhatsApp
                      <IconoWhatsApp className="w-5 h-5" />
                    </button>
                  )}
                  {perfil?.email && (
                    <button
                      onClick={cotizarPorCorreo}
                      className={`px-6 py-3 rounded-xl font-bold ${TXT.body} md:text-base flex items-center justify-center gap-2 border-2 active:scale-95 transition-all`}
                      style={{ borderColor: t.primary, color: t.primary }}
                    >
                      Cotizar por correo
                      <span className={`material-symbols-outlined ${ICON.md}`}>mail</span>
                    </button>
                  )}
                </section>
              </>
            ) : (
            <section className="relative w-full md:h-[540px] overflow-hidden" style={{ background: t.secondary }}>
              <img className="block w-full h-auto md:absolute md:inset-0 md:h-full md:object-cover" alt={store.heroAlt} src={store.heroImage} />
              <div className="hidden md:block absolute inset-0" style={{ background: `linear-gradient(to right, ${t.secondary}f5 0%, ${t.secondary}e0 45%, ${t.secondary}66 75%, ${t.secondary}33 100%), linear-gradient(to top, ${t.secondary}e6 0%, transparent 65%)` }} />
              <StoreFloatingActions store={store} />
              <div className="relative pt-6 md:pt-0 md:absolute md:inset-x-0 md:bottom-0 px-5 md:px-10 pb-7 md:pb-9 max-w-[88rem] md:mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-8">
                <div className="max-w-4xl">
                  {/* Etiqueta: logo + rubro */}
                  <div className="flex items-center gap-2.5 mb-4">
                    {store.logoImage ? (
                      <img src={store.logoImage} alt="" className="w-10 h-10 rounded-xl object-contain bg-white p-1 shadow-md shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-md shrink-0" style={{ background: t.primary, color: t.onPrimary }}>{inicialesDe(store.name)}</div>
                    )}
                    <span className={`px-3 py-1.5 rounded-lg ${TXT.small} font-bold text-white bg-white/15 backdrop-blur-sm border border-white/20`}>
                      {store.marketplaceCategory || store.name}
                    </span>
                  </div>

                  {/* Titular: el lema en grande, en blanco */}
                  <h1 className="font-black uppercase leading-[1.05] tracking-tight text-3xl sm:text-4xl md:text-[2.5rem] lg:text-[2.75rem] text-white drop-shadow-lg">
                    {titular}
                  </h1>

                  {perfil?.nosotros && (
                    <p className={`${TXT.body} md:text-base leading-relaxed text-white/90 mt-3 max-w-3xl`}>{perfil.nosotros}</p>
                  )}
                </div>

                {/* Botones: uno blanco y otro con borde, con el logo real de WhatsApp */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 md:w-64">
                  <button
                    onClick={() => irA('servicios')}
                    className={`px-6 py-3 rounded-xl font-bold ${TXT.body} md:text-base bg-white shadow-lg active:scale-95 transition-all`}
                    style={{ color: t.secondary }}
                  >
                    Ver servicios
                  </button>
                  {c.whatsappVisible && (
                    <button
                      onClick={() => cotizar()}
                      className={`px-6 py-3 rounded-xl font-bold ${TXT.body} md:text-base flex items-center justify-center gap-2 border-2 border-white/80 text-white hover:bg-white/10 active:scale-95 transition-all`}
                    >
                      Cotiza por WhatsApp
                      <IconoWhatsApp className="w-5 h-5" />
                    </button>
                  )}
                  {perfil?.email && (
                    <button
                      onClick={cotizarPorCorreo}
                      className={`px-6 py-3 rounded-xl font-bold ${TXT.body} md:text-base flex items-center justify-center gap-2 border-2 border-white/80 text-white hover:bg-white/10 active:scale-95 transition-all`}
                    >
                      Cotizar por correo
                      <span className={`material-symbols-outlined ${ICON.md}`}>mail</span>
                    </button>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* ══ DATOS RÁPIDOS: horario, dirección, zona y WhatsApp en una franja ══ */}
            {filas.length > 0 && (
              <section style={{ background: t.surface, borderBottom: `1px solid ${t.outlineVariant}40` }}>
                <div className="max-w-7xl mx-auto px-5 md:px-10 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filas.map((f) => (
                    <div key={f.label} className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${t.primary}15`, color: t.primary }}>
                        <span className={`material-symbols-outlined ${ICON.md}`}>{ICONO_FILA[f.label] ?? 'info'}</span>
                      </span>
                      <div className="min-w-0">
                        <p className={`${TXT.micro} font-bold uppercase tracking-wider`} style={{ color: t.onSurfaceVariant }}>{f.label}</p>
                        <p className={`${TXT.body} font-bold leading-snug`} style={{ color: t.onSurface }}>{f.valor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 md:py-14 space-y-14">

              {/* ══ SERVICIOS ══ */}
              {c.products.length > 0 && (
                <section>
                  <TituloSeccion
                    t={t}
                    kicker="Lo que hacemos"
                    titulo="Nuestros servicios"
                    accion={<button onClick={() => irA('servicios')} className={`${TXT.small} font-bold shrink-0`} style={{ color: t.primary }}>Ver todos →</button>}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {c.products.slice(0, 6).map((prod) => (
                      <TarjetaServicio key={prod.id} t={t} prod={prod} onAbrir={() => c.abrirProducto(prod)} onCotizar={() => cotizar(`Hola ${store.name}, quiero cotizar "${prod.name}".`)} conWhatsApp={c.whatsappVisible} />
                    ))}
                  </div>
                </section>
              )}

              {/* ══ QUIÉNES SOMOS + SECTORES ══ */}
              {(perfil?.nosotros || perfil?.sectores?.length || perfil?.brochure) && (
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                  {perfil?.nosotros && (
                    <div>
                      <TituloSeccion t={t} kicker="Quiénes somos" titulo={store.name} />
                      <p className={`${TXT.body} md:text-base leading-relaxed line-clamp-6`} style={{ color: t.onSurfaceVariant }}>{perfil.nosotros}</p>
                      {hayNosotros && (
                        <button onClick={() => irA('nosotros')} className={`${TXT.body} font-bold mt-3`} style={{ color: t.primary }}>Conocer más →</button>
                      )}
                    </div>
                  )}
                  {(perfil?.sectores?.length || perfil?.brochure) && (
                    <div className={perfil?.nosotros ? '' : 'lg:col-span-2'}>
                      {perfil?.sectores && perfil.sectores.length > 0 && (
                        <>
                          <TituloSeccion t={t} kicker="A quién servimos" titulo="Sectores que atendemos" />
                          <div className="flex flex-wrap gap-3">
                            {perfil.sectores.map((sec) => (
                              <span key={sec} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${TXT.body} font-bold`} style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60`, color: t.onSurface }}>
                                <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.primary }}>check_circle</span>
                                {sec}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                      {perfil?.brochure && (
                        <a
                          href={perfil.brochure}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold ${TXT.body} border-2 active:scale-95 transition-all ${perfil.sectores?.length ? 'mt-5' : ''}`}
                          style={{ borderColor: t.primary, color: t.primary }}
                        >
                          <span className={`material-symbols-outlined ${ICON.md}`}>picture_as_pdf</span>
                          Descargar brochure
                        </a>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ══ OBRAS (adelanto) ══ */}
              {obras.length > 0 && (
                <section>
                  <TituloSeccion
                    t={t}
                    kicker="Nuestro trabajo"
                    titulo="Trabajos realizados"
                    accion={<button onClick={() => irA('obras')} className={`${TXT.small} font-bold shrink-0`} style={{ color: t.primary }}>Ver todos →</button>}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {obras.slice(0, 6).map((src) => (
                      <button key={src} onClick={() => setFoto(src)} className="aspect-square rounded-2xl overflow-hidden active:scale-95 transition-transform">
                        <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* ══ CLIENTES ══ */}
              {perfil?.clientes && perfil.clientes.length > 0 && (
                <section>
                  <TituloSeccion t={t} kicker="Confían en nosotros" titulo="Empresas con las que trabajamos" />
                  <ClientesGrilla t={t} clientes={perfil.clientes} logos={perfil.clienteLogos} />
                </section>
              )}

              {/* ══ CÓMO TRABAJAMOS ══ */}
              <section>
                <TituloSeccion t={t} kicker="Así de fácil" titulo="Cómo trabajamos" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PASOS.map((p, i) => (
                    <div key={p.titulo} className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: t.primary, color: t.onPrimary }}>
                          <span className={`material-symbols-outlined ${ICON.md}`}>{p.icon}</span>
                        </span>
                        <span className="font-black text-3xl" style={{ color: `${t.primary}30` }}>{i + 1}</span>
                      </div>
                      <p className={`${TXT.lead} font-extrabold`} style={{ color: t.onSurface }}>{p.titulo}</p>
                      <p className={`${TXT.body} mt-1`} style={{ color: t.onSurfaceVariant }}>{p.texto}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ══ CIERRE ══ */}
              {cierre}
            </div>
          </div>
        )}

        {activeTab === 'servicios' && (
          <div className="animate-fade-in">
            <CabeceraPestana t={t} kicker="Servicios" titulo="Lo que hacemos" frase="Toca un servicio para ver el detalle y pedir su cotización." />
            <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 md:py-12 space-y-10">
              {/* Filtro por categoría: una sola fila que se desliza de lado y queda fija bajo el encabezado al bajar */}
              {c.categoryTabs.length > 1 && (
                <div className="sticky top-16 md:top-[60px] z-30 -mx-5 md:-mx-10 px-5 md:px-10 py-3" style={{ background: `${t.background}F2`, backdropFilter: 'blur(10px)' }}>
                  <div className="hide-scrollbar flex gap-2 overflow-x-auto md:flex-wrap" role="tablist" aria-label="Categorías de servicios">
                    {c.categoryTabs.map((cat) => {
                      const activa = c.activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          role="tab"
                          aria-selected={activa}
                          onClick={() => c.setActiveCategory(cat.id)}
                          className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full ${TXT.body} font-bold transition-all active:scale-95`}
                          style={activa
                            ? { background: t.primary, color: t.onPrimary }
                            : { background: t.surface, color: t.onSurface, border: `1px solid ${t.outlineVariant}80` }}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {c.filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <span className={`material-symbols-outlined ${ICON.xl} block mb-3`} style={{ color: `${t.onSurfaceVariant}80` }}>construction</span>
                  <p className={`font-bold ${TXT.body}`} style={{ color: t.onSurface }}>Todavía no hay servicios en esta categoría</p>
                  {c.activeCategory !== 'all' && (
                    <button onClick={() => c.setActiveCategory('all')} className={`mt-4 px-6 py-2.5 rounded-full font-bold ${TXT.small} uppercase active:scale-95 transition-all`} style={{ background: t.primary, color: t.onPrimary }}>
                      Ver todos los servicios
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {c.filtered.map((prod) => (
                    <TarjetaServicio key={prod.id} t={t} prod={prod} onAbrir={() => c.abrirProducto(prod)} onCotizar={() => cotizar(`Hola ${store.name}, quiero cotizar "${prod.name}".`)} conWhatsApp={c.whatsappVisible} />
                  ))}
                </div>
              )}

              {cierre}
            </div>
          </div>
        )}

        {activeTab === 'obras' && (
          <div className="animate-fade-in">
            <CabeceraPestana t={t} kicker="Obras" titulo="Trabajos realizados" frase="Una muestra de lo que hemos hecho para nuestros clientes." />
            <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 md:py-12 space-y-10">
              {obras.length === 0 ? (
                <p className={`${TXT.body} py-10 text-center`} style={{ color: t.onSurfaceVariant }}>Pronto subiremos fotos de nuestros trabajos.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {obras.map((src) => (
                    <button key={src} onClick={() => setFoto(src)} className="group aspect-[4/3] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
                      <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </button>
                  ))}
                </div>
              )}
              {cierre}
            </div>
          </div>
        )}

        {activeTab === 'nosotros' && perfil && (
          <div className="animate-fade-in">
            {/* ══ CABECERA: fotos superpuestas + quiénes somos + misión/visión + viñetas ══ */}
            {(() => {
              const fotoGrande = perfil.equipoFoto || obras[0];
              const fotoChica = perfil.equipoFoto ? obras[0] : obras[1];
              const valores = (perfil.politicas ?? []).slice(0, 2).map((p, i) => ({ t: p.titulo, icon: i === 0 ? 'workspace_premium' : 'verified_user', v: p.texto }));
              const datos = [...filas, ...(perfil.email ? [{ label: 'Correo', valor: perfil.email }] : [])];
              return (
                <section className="py-10 md:py-14">
                  <div className="max-w-7xl mx-auto px-5 md:px-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                    {fotoGrande ? (
                      <Aparece className="relative pb-16 pr-10 sm:pr-16">
                        <img src={fotoGrande} alt={`Equipo de ${store.name}`} className="w-full aspect-[4/5] object-cover rounded-3xl shadow-xl" />
                        {fotoChica && (
                          <img src={fotoChica} alt="" className="absolute right-0 top-[18%] w-[58%] aspect-[4/5] object-cover rounded-2xl shadow-2xl border-4 border-white transition-transform duration-500 hover:-translate-y-2 hover:-rotate-1" />
                        )}
                        {store.logoImage && (
                          <span className="absolute left-[44%] bottom-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-4 flex items-center justify-center p-3 shadow-xl transition-transform duration-500 hover:rotate-12 hover:scale-110" style={{ borderColor: t.primary }}>
                            <img src={store.logoImage} alt="" className="max-w-full max-h-full object-contain" />
                          </span>
                        )}
                        {perfil.equipoTexto && <p className={`${TXT.small} mt-3 font-semibold`} style={{ color: t.onSurfaceVariant }}>{perfil.equipoTexto}</p>}
                      </Aparece>
                    ) : datos.length > 0 ? (
                      <aside className="rounded-3xl p-6 md:p-8" style={{ background: t.secondary }}>
                        <p className={`${TXT.micro} font-extrabold uppercase tracking-widest text-white/70 mb-3`}>Datos de contacto</p>
                        <dl className="space-y-3">
                          {datos.map((f) => (
                            <div key={f.label}>
                              <dt className={`${TXT.micro} font-bold uppercase tracking-wider text-white/60`}>{f.label}</dt>
                              <dd className={`${TXT.body} font-semibold text-white`}>{f.valor}</dd>
                            </div>
                          ))}
                        </dl>
                      </aside>
                    ) : null}

                    <Aparece delay={150} className={fotoGrande || datos.length > 0 ? '' : 'lg:col-span-2 max-w-3xl'}>
                      <p className={`${TXT.micro} font-extrabold uppercase tracking-widest flex items-center gap-2`} style={{ color: t.onSurface }}>
                        <span className="w-2 h-2 inline-block" style={{ background: t.primary }} />Nosotros
                      </p>
                      <h2 className="font-black text-3xl md:text-5xl leading-tight mt-2" style={{ color: t.onSurface }}>{store.name}</h2>
                      {perfil.nosotros && (
                        <p className="text-base md:text-lg leading-relaxed mt-4 whitespace-pre-line" style={{ color: t.onSurfaceVariant }}>{perfil.nosotros}</p>
                      )}

                      {valores.length > 0 && (
                        <div className="mt-6 rounded-2xl p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5" style={{ background: t.surfaceContainer, borderLeft: `5px solid ${t.primary}` }}>
                          {valores.map((x) => (
                            <div key={x.t} className="group/valor flex items-start gap-4">
                              <span className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/valor:scale-110 group-hover/valor:-rotate-6" style={{ background: t.primary, color: t.onPrimary }}>
                                <span className={`material-symbols-outlined ${ICON.lg}`}>{x.icon}</span>
                              </span>
                              <div>
                                <p className="font-extrabold text-lg" style={{ color: t.onSurface }}>{x.t}</p>
                                <p className={`${TXT.small} leading-relaxed mt-1 line-clamp-3`} style={{ color: t.onSurfaceVariant }}>{x.v}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 mt-7">
                        {c.whatsappVisible && (
                          <button onClick={() => cotizar()} className={`px-6 py-3 rounded-xl font-bold ${TXT.body} active:scale-95 transition-all flex items-center justify-center gap-2`} style={{ background: t.primary, color: t.onPrimary }}>
                            Pedir cotización
                            <span className={`material-symbols-outlined ${ICON.md}`}>arrow_forward</span>
                          </button>
                        )}
                        {perfil.brochure && (
                          <a href={perfil.brochure} target="_blank" rel="noopener noreferrer" className={`px-6 py-3 rounded-xl font-bold ${TXT.body} flex items-center justify-center gap-2 border-2 active:scale-95 transition-all`} style={{ borderColor: t.primary, color: t.primary }}>
                            <span className={`material-symbols-outlined ${ICON.md}`}>picture_as_pdf</span>
                            Descargar brochure
                          </a>
                        )}
                      </div>
                    </Aparece>
                  </div>
                </section>
              );
            })()}

            {/* ══ MISIÓN · VISIÓN · SECTORES: tres tarjetas sobre el color de la plantilla ══ */}
            {(perfil.mision || perfil.vision || (perfil.sectores?.length ?? 0) > 0) && (
              <section className="py-12 md:py-16" style={{ background: t.secondary }}>
                <div className="max-w-7xl mx-auto px-5 md:px-10 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { titulo: 'Nuestra misión', texto: perfil.mision, tags: [] as string[] },
                    { titulo: 'Nuestra visión', texto: perfil.vision, tags: [] as string[] },
                    { titulo: 'Sectores que atendemos', texto: '', tags: perfil.sectores ?? [] },
                  ]
                    .filter((x) => x.texto || x.tags.length > 0)
                    .map((x, i) => (
                      <Aparece key={x.titulo} delay={i * 130} className="h-full">
                      <article
                        className="group relative overflow-hidden rounded-2xl p-6 md:p-7 flex flex-col h-full transition-transform duration-300 hover:-translate-y-1.5"
                        style={{ background: '#ffffff12', border: '1px solid #ffffff20' }}
                      >
                        {obras[i + 2] && (
                          <div className="overflow-hidden rounded-xl mb-5">
                            <img src={obras[i + 2]} alt="" className="w-full h-36 object-cover transition-transform duration-700 group-hover:scale-110" />
                          </div>
                        )}
                        <h3 className="font-extrabold text-xl text-white flex items-center gap-2">
                          <span className="w-2 h-2 inline-block" style={{ background: t.primary }} />{x.titulo}
                        </h3>
                        {x.texto && <p className={`${TXT.body} leading-relaxed text-white/80 mt-3 whitespace-pre-line`}>{x.texto}</p>}
                        {x.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {x.tags.map((tag) => (
                              <span key={tag} className={`px-4 py-2 rounded-lg ${TXT.small} font-semibold text-white transition-colors hover:bg-white/30`} style={{ background: '#ffffff1f' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </article>
                      </Aparece>
                    ))}
                </div>
              </section>
            )}

            <div className="max-w-7xl mx-auto px-5 md:px-10 pb-10 md:pb-12 space-y-12">
              {/* ══ CLIENTES ══ */}
              {perfil.clientes && perfil.clientes.length > 0 && (
                <section>
                  <TituloSeccion t={t} kicker="Confían en nosotros" titulo="Empresas con las que trabajamos" />
                  <ClientesGrilla t={t} clientes={perfil.clientes} logos={perfil.clienteLogos} />
                </section>
              )}

              {/* ══ POLÍTICAS ══ */}
              {perfil.politicas && perfil.politicas.length > 0 && (
                <section>
                  <TituloSeccion t={t} kicker="Nuestro compromiso" titulo="Políticas de la empresa" />
                  <div className="space-y-3">
                    {perfil.politicas.map((p, i) => (
                      <details key={p.titulo} open={i === 0} className="group rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
                        <summary className={`flex items-center gap-3 p-4 md:p-5 cursor-pointer list-none font-extrabold ${TXT.lead}`} style={{ color: t.onSurface }}>
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${t.primary}15`, color: t.primary }}>
                            <span className={`material-symbols-outlined ${ICON.md}`}>verified_user</span>
                          </span>
                          <span className="flex-1">{p.titulo}</span>
                          <span className={`material-symbols-outlined ${ICON.md} transition-transform group-open:rotate-180`}>expand_more</span>
                        </summary>
                        <p className={`${TXT.body} px-5 pb-5 md:pl-[4.75rem] max-w-4xl leading-relaxed whitespace-pre-line`} style={{ color: t.onSurfaceVariant }}>{p.texto}</p>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {/* ══ CIERRE ══ */}
              {cierre}
            </div>
          </div>
        )}

        {activeTab === 'contacto' && (
          <div className="animate-fade-in">
            {/* ══ CABECERA ══ */}
            <CabeceraPestana t={t} kicker="Contacto" titulo="Hablemos de tu proyecto" frase={`Cuéntanos qué necesitas y te respondemos con una cotización${perfil?.email ? ' por WhatsApp o por correo' : ' por WhatsApp'}.`} />

            <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 md:py-12 grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
              {/* ══ DATOS ══ */}
              <div className="lg:col-span-2 space-y-3">
                {[
                  ...(store.direccion ? [{ icon: 'location_on', titulo: 'Dirección', valor: store.direccion, href: store.mostrarUbicacion && store.latitud != null && store.longitud != null ? `https://www.google.com/maps?q=${store.latitud},${store.longitud}` : undefined, accion: 'Cómo llegar' }] : []),
                  ...(store.zona ? [{ icon: 'map', titulo: 'Zona', valor: store.zona }] : []),
                  ...(store.horario ? [{ icon: 'schedule', titulo: 'Horario de atención', valor: store.horario }] : []),
                  ...(c.telefonoVisible ? [{ icon: 'call', titulo: 'WhatsApp', valor: c.telefonoVisible, href: `tel:${c.telefonoVisible}`, accion: 'Llamar' }] : []),
                  ...(perfil?.email ? [{ icon: 'mail', titulo: 'Correo', valor: perfil.email, href: `mailto:${perfil.email}`, accion: 'Escribir' }] : []),
                ].map((d: { icon: string; titulo: string; valor: string; href?: string; accion?: string }) => (
                  <div key={d.titulo} className="flex items-start gap-4 p-4 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${t.primary}15`, color: t.primary }}>
                      <span className={`material-symbols-outlined ${ICON.md}`}>{d.icon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`${TXT.micro} font-bold uppercase tracking-wider`} style={{ color: t.onSurfaceVariant }}>{d.titulo}</p>
                      <p className={`${TXT.body} font-bold leading-snug break-words`} style={{ color: t.onSurface }}>{d.valor}</p>
                    </div>
                    {d.href && d.accion && (
                      <a href={d.href} target={d.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={`${TXT.small} font-bold shrink-0 self-center`} style={{ color: t.primary }}>{d.accion} →</a>
                    )}
                  </div>
                ))}

                {(store.facebook || store.instagram || store.tiktok) && (
                  <div className="flex gap-2.5 pt-1">
                    {[
                      ...(store.facebook ? [{ href: store.facebook, label: 'Facebook' }] : []),
                      ...(store.instagram ? [{ href: store.instagram, label: 'Instagram' }] : []),
                      ...(store.tiktok ? [{ href: store.tiktok, label: 'TikTok' }] : []),
                    ].map((r) => (
                      <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" aria-label={r.label} title={r.label} className={`px-4 h-10 rounded-xl flex items-center gap-1.5 ${TXT.small} font-bold active:scale-95 transition-transform`} style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60`, color: t.onSurface }}>
                        <span className={`material-symbols-outlined ${ICON.sm}`} style={{ color: t.primary }}>link</span>{r.label}
                      </a>
                    ))}
                  </div>
                )}

                {perfil?.brochure && (
                  <a href={perfil.brochure} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold ${TXT.body} border-2 active:scale-95 transition-all`} style={{ borderColor: t.primary, color: t.primary }}>
                    <span className={`material-symbols-outlined ${ICON.md}`}>picture_as_pdf</span>
                    Descargar brochure
                  </a>
                )}
              </div>

              {/* ══ FORMULARIO ══ */}
              <div className="lg:col-span-3">
                <FormularioCotizacion t={t} servicios={c.products.map((x) => x.name)} onEnviar={(msg) => cotizar(`Hola ${store.name}. ${msg}`)} />
              </div>
            </div>
          </div>
        )}

        <StoreFooter
          t={t}
          storeName={store.name}
          acciones={[
            { icon: 'share', label: 'Compartir', onClick: compartir },
            { icon: 'construction', label: 'Servicios', onClick: () => irA('servicios') },
            { icon: 'chat', label: 'Cotizar', onClick: () => cotizar() },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'home', icon: 'home', label: 'Inicio' },
          { id: 'servicios', icon: 'construction', label: 'Servicios' },
          ...(obras.length > 0 ? [{ id: 'obras', icon: 'photo_library', label: 'Obras' }] : []),
          ...(hayNosotros ? [{ id: 'nosotros', icon: 'business_center', label: 'Nosotros' }] : []),
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={0}
      />

      {/* WhatsApp flotante: en móvil va encima de la barra inferior y solo con el icono; en escritorio se despliega al pasar el mouse. */}
      {c.whatsappVisible && (
        <button
          onClick={() => cotizar()}
          aria-label="Escríbenos por WhatsApp"
          title="Escríbenos por WhatsApp"
          className="group flex fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 items-center h-14 pl-[14px] pr-[14px] rounded-full shadow-xl active:scale-95 transition-all"
          style={{ background: '#25D366', color: '#ffffff' }}
        >
          {/* Solo el icono; al pasar el mouse se despliega el texto hacia la izquierda. */}
          <span className={`${TXT.body} font-extrabold whitespace-nowrap max-w-0 opacity-0 overflow-hidden transition-all duration-300 md:group-hover:max-w-[200px] md:group-hover:opacity-100 md:group-hover:mr-3 md:group-focus-visible:max-w-[200px] md:group-focus-visible:opacity-100 md:group-focus-visible:mr-3`}>
            Cotiza por WhatsApp
          </span>
          <IconoWhatsApp className="w-7 h-7" />
        </button>
      )}

      {foto && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setFoto(null)}>
          <img src={foto} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button aria-label="Cerrar" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center">
            <span className={`material-symbols-outlined ${ICON.md}`}>close</span>
          </button>
        </div>
      )}

      <ProductModal
        t={t}
        producto={c.detalle}
        productos={c.products}
        onSelect={c.abrirProducto}
        onClose={c.cerrarProducto}
        onAdd={c.addToCart}
        onConsultar={(p) => cotizar(`Hola ${store.name}, quiero cotizar "${p.name}".`)}
      />
    </div>
  );
}
