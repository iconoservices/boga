'use client';

import React, { useMemo, useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { TXT, ICON, inicialesDe } from '../shared/tokens';
import type { PerfilEmpresa } from '@/lib/perfilEmpresa';
import { CategoryChips, ProductGrid, ProductModal, ContactPanel, BottomNav, StoreFooter } from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
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
};

const PASOS = [
  { icon: 'chat', titulo: 'Cuéntanos tu proyecto', texto: 'Escríbenos por WhatsApp con lo que necesitas.' },
  { icon: 'request_quote', titulo: 'Recibe tu cotización', texto: 'Evaluamos tu pedido y te enviamos una propuesta.' },
  { icon: 'construction', titulo: 'Ejecutamos la obra', texto: 'Fabricación y montaje en taller o en tu local.' },
];

/**
 * Plantilla "Empresa de Servicios": para negocios que cotizan (metalmecánica, construcción,
 * talleres), no que venden por carrito. Sin precios ni carrito (useCatalogo oculta ambos cuando
 * store.template === 'empresa'): cada servicio se consulta por WhatsApp. La galería de obras sale
 * de las fotos de los mismos servicios que carga el comercio, no de un campo aparte.
 * Pestañas: Inicio, Servicios, Obras, Contacto.
 */
export default function EmpresaTemplate({ store, initialProductId }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);
  const [activeTab, setActiveTab] = useState('home');
  const [foto, setFoto] = useState<string | null>(null);
  const perfil = store.perfilEmpresa ?? (store.demoDePlantilla ? PERFIL_DEMO : undefined);
  const hayNosotros = !!(perfil && (perfil.nosotros || perfil.mision || perfil.vision || perfil.politicas?.length || perfil.clientes?.length));

  const TABS = [
    { id: 'home', label: 'Inicio' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'obras', label: 'Obras' },
    ...(hayNosotros ? [{ id: 'nosotros', label: 'Nosotros' }] : []),
    { id: 'contacto', label: 'Contacto' },
  ];

  const obras = useMemo(() => {
    const todas = c.products.flatMap((p) => (p.images?.length ? p.images : [p.image]));
    return [...new Set(todas.filter(Boolean))].slice(0, 18);
  }, [c.products]);

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
        onCarrito={() => cotizar()}
        ctaLabel="Cotizar"
        onCta={() => cotizar()}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* ══ PORTADA ══ */}
            <section className="relative w-full h-[46vh] md:h-[420px] overflow-hidden">
              <img className="w-full h-full object-cover" alt={store.heroAlt} src={store.heroImage} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.secondary}f2 0%, ${t.secondary}66 55%, transparent 100%)` }} />
              <StoreFloatingActions store={store} />
              <div className="absolute bottom-0 left-0 right-0 px-5 md:px-8 pb-6 max-w-3xl md:mx-auto">
                <div className="flex items-center gap-3 mb-3">
                  {store.logoImage ? (
                    <img src={store.logoImage} alt="" className="w-12 h-12 rounded-xl object-cover bg-white p-0.5 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0" style={{ background: t.primary, color: t.onPrimary }}>{inicialesDe(store.name)}</div>
                  )}
                  <h1 className="font-black text-2xl md:text-3xl leading-tight text-white">{store.name}</h1>
                </div>
                {store.tagline && <p className={`${TXT.body} font-semibold text-white/90`}>{store.tagline}</p>}
                {c.whatsappVisible && (
                  <button
                    onClick={() => cotizar()}
                    className={`mt-4 w-full md:w-auto md:px-8 flex items-center justify-center gap-2 py-3.5 rounded-full font-extrabold ${TXT.lead} shadow-lg active:scale-95 transition-all`}
                    style={{ background: '#25D366', color: '#ffffff' }}
                  >
                    <span className={`material-symbols-outlined ${ICON.md}`}>chat</span>
                    Pedir cotización por WhatsApp
                  </button>
                )}
                {perfil?.email && (
                  <button
                    onClick={cotizarPorCorreo}
                    className={`mt-2 w-full md:w-auto md:px-8 flex items-center justify-center gap-2 py-3 rounded-full font-bold ${TXT.body} border-2 border-white/80 text-white active:scale-95 transition-all`}
                  >
                    <span className={`material-symbols-outlined ${ICON.sm}`}>mail</span>
                    Cotizar por correo
                  </button>
                )}
              </div>
            </section>

            {/* ══ FICHA ══ */}
            {filas.length > 0 && (
              <section style={{ background: t.surface, borderBottom: `1px solid ${t.outlineVariant}40` }}>
                <div className="px-5 md:px-8 max-w-3xl md:mx-auto divide-y" style={{ borderColor: `${t.outlineVariant}50` }}>
                  {filas.map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-4 py-3">
                      <span className={`${TXT.small} font-semibold shrink-0`} style={{ color: t.onSurfaceVariant }}>{f.label}</span>
                      <span className={`${TXT.small} font-bold text-right`} style={{ color: t.onSurface }}>{f.valor}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ══ SERVICIOS ══ */}
            {categorias.length > 0 && (
              <section className="px-5 md:px-6 pt-8 max-w-3xl md:mx-auto">
                <h2 className={`${TXT.title} font-black mb-4`} style={{ color: t.onSurface }}>Nuestros servicios</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categorias.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => irA('servicios', cat.id)}
                      className="flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.98] transition-all"
                      style={{ background: t.surface, borderColor: `${t.outlineVariant}60` }}
                    >
                      <img src={cat.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      <span className={`${TXT.body} font-extrabold`} style={{ color: t.onSurface }}>{cat.label}</span>
                      <span className={`material-symbols-outlined ${ICON.md} ml-auto`} style={{ color: t.onSurfaceVariant }}>chevron_right</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ══ QUIÉNES SOMOS (resumen) ══ */}
            {perfil?.nosotros && (
              <section className="px-5 md:px-6 pt-10 max-w-3xl md:mx-auto">
                <h2 className={`${TXT.title} font-black mb-2`} style={{ color: t.onSurface }}>Quiénes somos</h2>
                <p className={`${TXT.body} leading-relaxed`} style={{ color: t.onSurfaceVariant }}>{perfil.nosotros}</p>
                <button onClick={() => irA('nosotros')} className={`${TXT.small} font-bold mt-2`} style={{ color: t.primary }}>Conocer más</button>
              </section>
            )}

            {/* ══ OBRAS (adelanto) ══ */}
            {obras.length > 0 && (
              <section className="px-5 md:px-6 pt-10 max-w-3xl md:mx-auto">
                <div className="flex items-end justify-between mb-4">
                  <h2 className={`${TXT.title} font-black`} style={{ color: t.onSurface }}>Trabajos realizados</h2>
                  <button onClick={() => irA('obras')} className={`${TXT.small} font-bold`} style={{ color: t.primary }}>Ver todos</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {obras.slice(0, 6).map((src) => (
                    <button key={src} onClick={() => setFoto(src)} className="aspect-square rounded-xl overflow-hidden active:scale-95 transition-transform">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ══ CÓMO TRABAJAMOS ══ */}
            <section className="px-5 md:px-6 pt-10 max-w-3xl md:mx-auto">
              <h2 className={`${TXT.title} font-black mb-4`} style={{ color: t.onSurface }}>Cómo trabajamos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PASOS.map((p, i) => (
                  <div key={p.titulo} className="p-4 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: t.primary, color: t.onPrimary }}>
                      <span className={`material-symbols-outlined ${ICON.md}`}>{p.icon}</span>
                    </div>
                    <p className={`${TXT.body} font-extrabold`} style={{ color: t.onSurface }}>{i + 1}. {p.titulo}</p>
                    <p className={`${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>{p.texto}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'servicios' && (
          <div className="animate-fade-in">
            <div className="px-5 md:px-6 pt-6 pb-1">
              <h2 className="font-black text-2xl md:text-3xl" style={{ color: t.onBackground }}>Servicios</h2>
              <p className={`${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>Toca un servicio y pide tu cotización por WhatsApp.</p>
            </div>
            <CategoryChips t={t} tabs={c.categoryTabs} active={c.activeCategory} onSelect={c.setActiveCategory} />
            <section className="px-5 md:px-6 pb-8">
              <ProductGrid t={t} productos={c.filtered} onSelect={c.abrirProducto} onAdd={c.addToCart} onVerTodo={() => c.setActiveCategory('all')} />
            </section>
          </div>
        )}

        {activeTab === 'obras' && (
          <div className="animate-fade-in px-5 md:px-6 pt-6 pb-8 max-w-3xl md:mx-auto">
            <h2 className="font-black text-2xl md:text-3xl mb-4" style={{ color: t.onBackground }}>Nuestras obras</h2>
            {obras.length === 0 ? (
              <p className={TXT.body} style={{ color: t.onSurfaceVariant }}>Pronto subiremos fotos de nuestros trabajos.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {obras.map((src) => (
                  <button key={src} onClick={() => setFoto(src)} className="aspect-[4/3] rounded-xl overflow-hidden active:scale-95 transition-transform">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'nosotros' && perfil && (
          <div className="animate-fade-in px-5 md:px-6 pt-6 pb-8 max-w-3xl md:mx-auto space-y-8">
            <h2 className="font-black text-2xl md:text-3xl" style={{ color: t.onBackground }}>Nosotros</h2>
            {perfil.nosotros && (
              <p className={`${TXT.body} leading-relaxed`} style={{ color: t.onSurfaceVariant }}>{perfil.nosotros}</p>
            )}
            {(perfil.mision || perfil.vision) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[{ t: 'Misión', icon: 'flag', v: perfil.mision }, { t: 'Visión', icon: 'visibility', v: perfil.vision }]
                  .filter((x) => x.v)
                  .map((x) => (
                    <div key={x.t} className="p-4 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
                      <p className={`${TXT.body} font-extrabold flex items-center gap-1.5 mb-1`} style={{ color: t.primary }}>
                        <span className={`material-symbols-outlined ${ICON.md}`}>{x.icon}</span>{x.t}
                      </p>
                      <p className={TXT.small} style={{ color: t.onSurfaceVariant }}>{x.v}</p>
                    </div>
                  ))}
              </div>
            )}
            {perfil.politicas && perfil.politicas.length > 0 && (
              <div>
                <h3 className={`${TXT.title} font-black mb-3`} style={{ color: t.onSurface }}>Nuestras políticas</h3>
                <div className="space-y-2">
                  {perfil.politicas.map((p) => (
                    <details key={p.titulo} className="group rounded-2xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
                      <summary className={`flex items-center justify-between gap-2 p-4 cursor-pointer list-none font-extrabold ${TXT.body}`} style={{ color: t.onSurface }}>
                        {p.titulo}
                        <span className={`material-symbols-outlined ${ICON.md} transition-transform group-open:rotate-180`}>expand_more</span>
                      </summary>
                      <p className={`${TXT.small} px-4 pb-4 leading-relaxed whitespace-pre-line`} style={{ color: t.onSurfaceVariant }}>{p.texto}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
            {perfil.clientes && perfil.clientes.length > 0 && (
              <div>
                <h3 className={`${TXT.title} font-black mb-3`} style={{ color: t.onSurface }}>Empresas que confían en nosotros</h3>
                <div className="flex flex-wrap gap-2">
                  {perfil.clientes.map((cl) => (
                    <span key={cl} className={`px-3 py-1.5 rounded-full ${TXT.small} font-bold`} style={{ background: t.secondaryContainer, color: t.secondary }}>{cl}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            onEnviar={(d) => cotizar(`Hola ${store.name}, soy ${d.nombre} (${d.telefono}).\n\n${d.mensaje}`)}
          />
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
          { id: 'obras', icon: 'photo_library', label: 'Obras' },
          ...(hayNosotros ? [{ id: 'nosotros', icon: 'business_center', label: 'Nosotros' }] : []),
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={0}
      />

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
