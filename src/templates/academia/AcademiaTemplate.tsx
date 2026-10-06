'use client';

import React from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import IconoWhatsApp from '../shared/IconoWhatsApp';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { useTabRuta } from '../shared/useTabRuta';
import { TXT, ICON, soles, type Producto } from '../shared/tokens';
import { CategoryChips, ProductModal, ContactPanel, BottomNav, StoreFooter } from '../shared/CatalogoUI';
import { moduloAcademia } from '@/lib/modulos';
import AccesoAlumnos from './AccesoAlumnos';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  /** Pestaña con la que abre (desde /<tienda>/<sección>). */
  initialTab?: string;
}

type Tema = StoreConfig['theme'];

const PASOS = [
  { icon: 'event_available', titulo: 'Elige tu grupo', texto: 'Mira los grupos por edad y sus horarios.' },
  { icon: 'chat', titulo: 'Escríbenos', texto: 'Un clic y te llega a nuestro WhatsApp con tus datos listos para matricularte.' },
  { icon: 'qr_code_2', titulo: 'Entra con tu carnet', texto: 'Escaneamos tu QR al llegar y tus papás ven que llegaste.' },
];

const ICONO_FILA: Record<string, string> = { Horario: 'schedule', Sede: 'location_on', Zona: 'map', WhatsApp: 'call' };

const inicialesDe = (nombre: string) => nombre.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function TituloSeccion({ t, kicker, titulo, accion }: { t: Tema; kicker: string; titulo: string; accion?: React.ReactNode }) {
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

/** Cabecera de color de cada pestaña: línea chica, título y una frase. */
function CabeceraPestana({ t, kicker, titulo, frase }: { t: Tema; kicker: string; titulo: string; frase: string }) {
  return (
    <section className="py-10 md:py-14" style={{ background: t.secondary }}>
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <p className={`${TXT.micro} font-extrabold uppercase tracking-widest text-white/70`}>{kicker}</p>
        <h2 className="font-black text-3xl md:text-4xl leading-tight text-white mt-1">{titulo}</h2>
        <p className="text-base md:text-lg leading-relaxed text-white/90 mt-3 max-w-2xl">{frase}</p>
      </div>
    </section>
  );
}

/** Un grupo: foto, nombre, horario en una cajita, mensualidad si la hay y botón de inscripción. */
function TarjetaGrupo({ t, p, conWhatsApp, onAbrir, onInscribir }: { t: Tema; p: Producto; conWhatsApp: boolean; onAbrir: () => void; onInscribir: () => void }) {
  const lineas = (p.desc || '').split(/\n|·/).map((l) => l.trim()).filter(Boolean);
  return (
    <div className="group flex flex-col rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
      <button onClick={onAbrir} className="text-left flex-1 active:opacity-90 transition-opacity" aria-label={`Ver ${p.name}`}>
        {p.image && (
          <div className="aspect-[16/9] overflow-hidden">
            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <div className="p-4 pb-3">
          <p className={`font-extrabold ${TXT.lead} leading-snug`} style={{ color: t.onSurface }}>{p.name}</p>
          {lineas.length > 0 && (
            <div className="mt-3 rounded-xl p-3 flex flex-col gap-1.5" style={{ background: `${t.primary}10` }}>
              {lineas.map((l) => (
                <p key={l} className={`${TXT.small} font-bold flex items-start gap-2`} style={{ color: t.onSurface }}>
                  <span className={`material-symbols-outlined ${ICON.sm} shrink-0`} style={{ color: t.primary }}>schedule</span>
                  {l}
                </p>
              ))}
            </div>
          )}
          {!p.sinPrecio && p.price > 0 && (
            <p className={`${TXT.body} font-black mt-3`} style={{ color: t.primary }}>{soles(p.price)} <span className={`${TXT.small} font-semibold`} style={{ color: t.onSurfaceVariant }}>al mes</span></p>
          )}
        </div>
      </button>
      {conWhatsApp && (
        <div className="px-4 pb-4">
          <button
            onClick={onInscribir}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold ${TXT.body} active:scale-[0.98] transition-all`}
            style={{ background: '#25D366', color: '#ffffff' }}
          >
            <IconoWhatsApp className="w-5 h-5" />
            Inscribirme en este grupo
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Plantilla "Academia": deportiva o de enseñanza. Los GRUPOS son los productos de la tienda (servicios sin carrito:
 * el nombre del grupo, su horario en la descripción —una línea por día—, y la mensualidad como precio, o 0 = no se muestra).
 * Inscribirse es un clic a WhatsApp. La pestaña "Alumnos" es la puerta de los padres (iniciar sesión y ver a sus hijos y
 * su carnet QR) y de los profesores (tomar asistencia); necesita el módulo `academia` prendido en la tienda (ver lib/academia.ts).
 * Estilo hermano de la plantilla Empresa: portada con degradado, franja de datos, cabeceras de color y cierre con llamado.
 */
export default function AcademiaTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);
  const [activeTab, setActiveTab] = useTabRuta(store.slug, 'home', initialTab);

  // Alumnos, carnet QR y asistencia son un módulo de pago: sin él la tienda es solo la página de la academia (la vista previa sí lo muestra).
  const conAlumnos = store.demoDePlantilla === true || moduloAcademia(store.modulos);

  const TABS = [
    { id: 'home', label: 'Inicio' },
    { id: 'grupos', label: 'Grupos' },
    ...(conAlumnos ? [{ id: 'alumnos', label: 'Alumnos' }] : []),
    { id: 'contacto', label: 'Contacto' },
  ];

  const irA = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inscribirme = (grupo?: string) =>
    enviarPedidoPorWhatsApp(
      store,
      grupo
        ? `¡Hola ${store.name}! Quiero inscribirme en el grupo "${grupo}". ¿Me pueden dar informes?`
        : `¡Hola ${store.name}! Quiero inscribirme o pedir informes de los horarios.`,
    );

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
    ...(store.direccion ? [{ label: 'Sede', valor: store.direccion }] : []),
    ...(store.zona ? [{ label: 'Zona', valor: store.zona }] : []),
    ...(c.telefonoVisible ? [{ label: 'WhatsApp', valor: c.telefonoVisible }] : []),
  ];

  const titular = store.tagline || store.name;

  const cierre = c.whatsappVisible ? (
    <section className="rounded-3xl p-8 md:p-12 text-center" style={{ background: t.secondaryContainer }}>
      <h3 className="font-black text-2xl md:text-3xl" style={{ color: t.secondary }}>¿Listo para empezar?</h3>
      <p className={`${TXT.body} md:text-base mt-2 max-w-xl mx-auto`} style={{ color: t.onSurfaceVariant }}>Escríbenos y te contamos cómo matricularte.</p>
      <button onClick={() => inscribirme()} className={`mt-6 px-7 py-3.5 rounded-xl font-bold ${TXT.body} inline-flex items-center justify-center gap-2 active:scale-95 transition-all`} style={{ background: t.secondary, color: '#ffffff' }}>
        Inscribirme por WhatsApp
        <IconoWhatsApp className="w-5 h-5" />
      </button>
    </section>
  ) : null;

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <StoreHeader
        store={store}
        tabs={TABS}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={0}
        onCarrito={() => inscribirme()}
        ctaLabel="Inscribirme"
        onCta={() => inscribirme()}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* ══ PORTADA ══ */}
            {store.hideHeroText ? (
              <section className="relative w-full" style={{ background: t.secondary }}>
                <img className="w-full h-auto block" alt={store.heroAlt} src={store.heroImage} />
                <StoreFloatingActions store={store} />
              </section>
            ) : (
              <section className="relative w-full md:h-[520px] overflow-hidden" style={{ background: t.secondary }}>
                <img className="block w-full h-auto md:absolute md:inset-0 md:h-full md:object-cover" alt={store.heroAlt} src={store.heroImage} />
                <div className="hidden md:block absolute inset-0" style={{ background: `linear-gradient(to right, ${t.secondary}f5 0%, ${t.secondary}e0 45%, ${t.secondary}66 75%, ${t.secondary}33 100%), linear-gradient(to top, ${t.secondary}e6 0%, transparent 65%)` }} />
                <StoreFloatingActions store={store} />
                <div className="relative pt-6 md:pt-0 md:absolute md:inset-x-0 md:bottom-0 px-5 md:px-10 pb-7 md:pb-10 max-w-6xl md:mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-8">
                  <div className="max-w-3xl">
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
                    <h1 className="font-black uppercase leading-[1.05] tracking-tight text-3xl sm:text-4xl md:text-5xl text-white drop-shadow-lg">{titular}</h1>
                  </div>
                  <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 md:w-64">
                    {c.whatsappVisible && (
                      <button onClick={() => inscribirme()} className={`px-6 py-3 rounded-xl font-bold ${TXT.body} md:text-base flex items-center justify-center gap-2 bg-white shadow-lg active:scale-95 transition-all`} style={{ color: t.secondary }}>
                        Inscribirme por WhatsApp
                        <IconoWhatsApp className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={() => irA('grupos')} className={`px-6 py-3 rounded-xl font-bold ${TXT.body} md:text-base border-2 border-white/80 text-white hover:bg-white/10 active:scale-95 transition-all`}>
                      Ver grupos y horarios
                    </button>
                  </div>
                </div>
              </section>
            )}
            {/* Con banner propio los botones van debajo, como en Empresa */}
            {store.hideHeroText && (
              <section className="px-5 md:px-10 py-4 flex flex-col sm:flex-row sm:justify-center gap-3" style={{ background: t.surface, borderBottom: `1px solid ${t.outlineVariant}40` }}>
                {c.whatsappVisible && (
                  <button onClick={() => inscribirme()} className={`px-6 py-3 rounded-xl font-bold ${TXT.body} flex items-center justify-center gap-2 active:scale-95 transition-all`} style={{ background: '#25D366', color: '#ffffff' }}>
                    Inscribirme por WhatsApp
                    <IconoWhatsApp className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => irA('grupos')} className={`px-6 py-3 rounded-xl font-bold ${TXT.body} border-2 active:scale-95 transition-all`} style={{ borderColor: t.primary, color: t.primary }}>
                  Ver grupos y horarios
                </button>
              </section>
            )}

            {/* ══ DATOS RÁPIDOS ══ */}
            {filas.length > 0 && (
              <section style={{ background: t.surface, borderBottom: `1px solid ${t.outlineVariant}40` }}>
                <div className="max-w-6xl mx-auto px-5 md:px-10 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div className="max-w-6xl mx-auto px-5 md:px-10 py-10 md:py-14 space-y-14">

              {/* ══ GRUPOS Y HORARIOS ══ */}
              {c.products.length > 0 && (
                <section>
                  <TituloSeccion
                    t={t}
                    kicker="Entrena con nosotros"
                    titulo="Grupos y horarios"
                    accion={c.products.length > 3 ? <button onClick={() => irA('grupos')} className={`${TXT.small} font-bold shrink-0`} style={{ color: t.primary }}>Ver todos →</button> : undefined}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {c.products.slice(0, 6).map((p) => (
                      <TarjetaGrupo key={p.id} t={t} p={p} conWhatsApp={c.whatsappVisible} onAbrir={() => c.abrirProducto(p)} onInscribir={() => inscribirme(p.name)} />
                    ))}
                  </div>
                </section>
              )}

              {/* ══ CÓMO FUNCIONA ══ */}
              <section>
                <TituloSeccion t={t} kicker="Matricularte es simple" titulo="Así de fácil" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {PASOS.map((p, i) => (
                    <div key={p.titulo} className="relative p-5 rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
                      <span className="absolute -top-2 right-3 font-black text-7xl leading-none select-none" style={{ color: `${t.primary}12` }}>{i + 1}</span>
                      <div className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: t.primary, color: t.onPrimary }}>
                        <span className={`material-symbols-outlined ${ICON.md}`}>{p.icon}</span>
                      </div>
                      <p className={`relative ${TXT.lead} font-extrabold`} style={{ color: t.onSurface }}>{p.titulo}</p>
                      <p className={`relative ${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>{p.texto}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ══ PARA PADRES ══ */}
              {conAlumnos && (
              <section>
                <button onClick={() => irA('alumnos')} className="w-full text-left rounded-3xl p-6 md:p-8 flex items-center gap-4 md:gap-6 active:scale-[0.99] transition-all" style={{ background: t.secondary }}>
                  <span className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 bg-white/15">
                    <span className={`material-symbols-outlined ${ICON.lg} text-white`}>family_restroom</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-xl md:text-2xl text-white leading-tight">Papás: instalen la app</span>
                    <span className="block text-sm md:text-base text-white/85 mt-1">Vean el carnet con QR de su hijo y reciban un aviso cuando llegue a clase.</span>
                  </span>
                  <span className={`material-symbols-outlined ${ICON.md} text-white shrink-0`}>arrow_forward</span>
                </button>
              </section>
              )}

              {cierre}
            </div>
          </div>
        )}

        {activeTab === 'grupos' && (
          <div className="animate-fade-in">
            <CabeceraPestana t={t} kicker="Elige el tuyo" titulo="Grupos y horarios" frase="Encuentra el grupo de tu edad e inscríbete con un clic." />
            <div className="max-w-6xl mx-auto">
              <CategoryChips t={t} tabs={c.categoryTabs} active={c.activeCategory} onSelect={c.setActiveCategory} />
            </div>
            <section className="max-w-6xl mx-auto px-5 md:px-10 py-6 pb-10">
              {c.filtered.length === 0 && !c.cargando ? (
                <p className={`${TXT.small}`} style={{ color: t.onSurfaceVariant }}>Todavía no hay grupos publicados.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {c.filtered.map((p) => (
                    <TarjetaGrupo key={p.id} t={t} p={p} conWhatsApp={c.whatsappVisible} onAbrir={() => c.abrirProducto(p)} onInscribir={() => inscribirme(p.name)} />
                  ))}
                </div>
              )}
              <div className="mt-10">{cierre}</div>
            </section>
          </div>
        )}

        {activeTab === 'alumnos' && conAlumnos && <AccesoAlumnos t={t} slug={store.slug} demo={store.demoDePlantilla === true} />}

        {activeTab === 'contacto' && (
          <ContactPanel
            t={t}
            catalogo
            telefonoVisible={c.telefonoVisible}
            direccionVisible={store.direccion}
            horarioVisible={store.horario}
            facebookVisible={store.facebook}
            instagramVisible={store.instagram}
            tiktokVisible={store.tiktok}
            onEnviar={(d) => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, soy ${d.nombre} (${d.telefono}).\n\n${d.mensaje}`)}
          />
        )}

        <StoreFooter
          t={t}
          storeName={store.name}
          acciones={[
            { icon: 'share', label: 'Compartir', onClick: compartir },
            { icon: 'event_available', label: 'Grupos', onClick: () => irA('grupos') },
            { icon: 'chat', label: 'Inscribirme', onClick: () => inscribirme() },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'home', icon: 'home', label: 'Inicio' },
          { id: 'grupos', icon: 'event_available', label: 'Grupos' },
          ...(conAlumnos ? [{ id: 'alumnos', icon: 'qr_code_2', label: 'Alumnos' }] : []),
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={0}
      />

      {/* WhatsApp flotante: en móvil va encima de la barra inferior y solo con el icono; en escritorio se despliega al pasar el mouse. */}
      {c.whatsappVisible && (
        <button
          onClick={() => inscribirme()}
          aria-label="Inscríbete por WhatsApp"
          title="Inscríbete por WhatsApp"
          className="group flex fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 items-center h-14 pl-[14px] pr-[14px] rounded-full shadow-xl active:scale-95 transition-all"
          style={{ background: '#25D366', color: '#ffffff' }}
        >
          <span className={`${TXT.body} font-extrabold whitespace-nowrap max-w-0 opacity-0 overflow-hidden transition-all duration-300 md:group-hover:max-w-[200px] md:group-hover:opacity-100 md:group-hover:mr-3 md:group-focus-visible:max-w-[200px] md:group-focus-visible:opacity-100 md:group-focus-visible:mr-3`}>
            Inscríbete por WhatsApp
          </span>
          <IconoWhatsApp className="w-7 h-7" />
        </button>
      )}

      <ProductModal
        t={t}
        producto={c.detalle}
        productos={c.products}
        onSelect={c.abrirProducto}
        onClose={c.cerrarProducto}
        onAdd={c.addToCart}
        onConsultar={(p) => inscribirme(p.name)}
      />
    </div>
  );
}
