'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { getDemoProducts } from '@/lib/templates.config';
import { useDemo } from '@/context/DemoContext';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';

interface MercadoTemplateProps {
  store: StoreConfig;
}

interface Producto {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
}

/**
 * Plantilla "Mercado": toma el lenguaje visual del marketplace de Boga
 * (banners, grilla de categorias, secciones de productos) pero muestra el
 * catalogo de UNA sola tienda. Pensada para clientes con catalogo grande:
 * minimarket, ferreteria, farmacia, distribuidora.
 */
export default function MercadoTemplate({ store }: MercadoTemplateProps) {
  const t = store.theme;
  const { isDemoVisible } = useDemo();
  // Booleano estable: isDemoVisible cambia de identidad en cada render del
  // provider, y como dependencia del efecto dispararia refetches en bucle.
  const demoActivo = isDemoVisible(store.slug);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [agregados, setAgregados] = useState<Record<string, boolean>>({});

  // ── Carga de productos de esta tienda ──
  // Los productos demo de la plantilla se suman solo si el demo esta activo
  // para esta tienda (se apaga desde el superadmin), igual que en las demas.
  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store', store.slug);

      const deLaBase: Producto[] = data && !error
        ? data.map((p) => ({
            id: String(p.id),
            name: p.name,
            price: Number(p.price) || 0,
            category: (p.category || 'General').toLowerCase(),
            image: p.image || store.heroImage,
            description: p.description || '',
          }))
        : [];

      const demo: Producto[] = demoActivo
        ? getDemoProducts(store.template).map((p, i) => ({
            id: `demo-${i}`,
            name: p.name,
            price: p.price,
            category: p.category.toLowerCase(),
            image: p.image,
            description: p.description || '',
          }))
        : [];

      setProductos([...deLaBase, ...demo]);
      setCargando(false);
    };
    cargar();
  }, [store.slug, store.template, store.heroImage, demoActivo]);

  // ── Banners: se arman con las mejores imagenes del catalogo ──
  const banners = React.useMemo(() => {
    const base = [
      { titulo1: 'BIENVENIDO A', titulo2: store.name.toUpperCase(), sub: store.tagline || 'Todo lo que necesitas, en un solo lugar', img: store.heroImage },
    ];
    productos.slice(0, 2).forEach((p) => {
      base.push({
        titulo1: 'DESTACADO',
        titulo2: p.name.toUpperCase().slice(0, 22),
        sub: `Desde S/ ${p.price.toFixed(2)}`,
        img: p.image,
      });
    });
    return base;
  }, [productos, store.name, store.tagline, store.heroImage]);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerIdxRef = useRef(0);

  const irABanner = useCallback((idx: number) => {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.scrollTo({ left: idx * slider.clientWidth, behavior: 'smooth' });
    bannerIdxRef.current = idx;
    setBannerIdx(idx);
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => {
      irABanner((bannerIdxRef.current + 1) % banners.length);
    }, 5000);
    return () => clearInterval(id);
  }, [irABanner, banners.length]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const w = slider.clientWidth;
        if (w > 0) {
          const idx = Math.round(slider.scrollLeft / w);
          if (idx !== bannerIdxRef.current) {
            bannerIdxRef.current = idx;
            setBannerIdx(idx);
          }
        }
        ticking = false;
      });
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    return () => slider.removeEventListener('scroll', onScroll);
  }, []);

  // ── Categorias: las de la tienda, o las que se deducen del catalogo ──
  const categorias = React.useMemo(() => {
    if (store.categories?.length) {
      return store.categories.map((c) => ({ id: c.name.toLowerCase(), nombre: c.name, icono: c.icon }));
    }
    const vistas = new Map<string, string>();
    productos.forEach((p) => {
      if (!vistas.has(p.category)) vistas.set(p.category, p.category);
    });
    return [...vistas.keys()].map((c) => ({ id: c, nombre: c.charAt(0).toUpperCase() + c.slice(1), icono: 'category' }));
  }, [store.categories, productos]);

  const filtrados = productos.filter((p) => {
    const coincideCat = categoriaActiva === 'todas' || p.category === categoriaActiva;
    const coincideBusq = p.name.toLowerCase().includes(busqueda.toLowerCase());
    return coincideCat && coincideBusq;
  });

  // ── Carrito ──
  const agregar = (producto: Producto) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.producto.id === producto.id);
      if (existe) {
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { producto, cantidad: 1 }];
    });
    setAgregados((prev) => ({ ...prev, [producto.id]: true }));
    setTimeout(() => setAgregados((prev) => ({ ...prev, [producto.id]: false })), 1000);
  };

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => (i.producto.id === id ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const total = carrito.reduce((acc, i) => acc + i.producto.price * i.cantidad, 0);
  const unidades = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  const enviarPorWhatsApp = () => {
    const lineas = carrito.map((i) => `- ${i.producto.name} (x${i.cantidad}): S/ ${(i.producto.price * i.cantidad).toFixed(2)}`).join('\n');
    enviarPedidoPorWhatsApp(
      store,
      `*Pedido de ${store.name}*\n-------------------------\n${lineas}\n-------------------------\n*Total:* S/ ${total.toFixed(2)}`
    );
  };

  // ── Compartir / Instalar (PWA) ──
  const [promptInstalar, setPromptInstalar] = useState<any>(null);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    const alInstalar = (e: Event) => {
      e.preventDefault();
      setPromptInstalar(e);
    };
    const yaInstalada = () => {
      if (localStorage.getItem('boga_pwa_installed') === 'true') return true;
      if ((window.navigator as any).standalone) return true;
      return window.matchMedia('(display-mode: standalone)').matches;
    };
    setInstalada(yaInstalada());

    const marcarInstalada = () => {
      localStorage.setItem('boga_pwa_installed', 'true');
      setInstalada(true);
    };

    window.addEventListener('beforeinstallprompt', alInstalar);
    window.addEventListener('appinstalled', marcarInstalada);
    return () => {
      window.removeEventListener('beforeinstallprompt', alInstalar);
      window.removeEventListener('appinstalled', marcarInstalada);
    };
  }, []);

  const instalar = () => {
    if (promptInstalar) {
      promptInstalar.prompt();
      promptInstalar.userChoice.then(() => setPromptInstalar(null));
    } else {
      const ua = navigator.userAgent.toLowerCase();
      const esSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (/iphone|ipad|ipod/.test(ua) && esSafari) {
        alert('Para instalar:\n\n1. Tocá el icono Compartir (📤) abajo\n2. Deslizá y tocá "Agregar a pantalla de inicio"\n3. Tocá "Agregar"');
      } else {
        alert('Para instalar:\n\n1. Abrí el menú del navegador (⋯)\n2. Buscá "Agregar a pantalla de inicio"\n3. Confirmá la instalación');
      }
    }
  };

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  const iniciales = store.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen pb-24" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 shadow-sm" style={{ background: t.surface }}>
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {store.logoImage ? (
                <img src={store.logoImage} alt={store.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-sm" style={{ background: t.primary, color: t.onPrimary }}>
                  {iniciales}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-bold text-base leading-tight truncate" style={{ fontFamily: t.fontHeadline }}>{store.name}</h1>
                <p className="text-[11px] truncate" style={{ color: t.onSurfaceVariant }}>{store.tagline}</p>
              </div>
            </div>

            <button
              onClick={() => setCarritoAbierto(true)}
              className="relative w-10 h-10 rounded-lg flex items-center justify-center shrink-0 active:scale-90 transition-transform"
              style={{ background: t.surfaceContainer }}
              aria-label="Ver carrito"
            >
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
              {unidades > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: t.primary, color: t.onPrimary }}>
                  {unidades}
                </span>
              )}
            </button>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: t.onSurfaceVariant }}>search</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Busca lo que necesites..."
              className="w-full pl-11 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: t.surfaceContainerLow, color: t.onSurface, border: `1px solid ${t.outlineVariant}` }}
            />
          </div>
        </div>
      </header>

      {/* ── COMPARTIR / INSTALAR ── */}
      <div className="fixed top-32 right-3 z-50 flex flex-col gap-2">
        <button
          onClick={compartir}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 shadow-lg active:scale-90 hover:bg-white/60 transition-all"
          style={{ color: t.onBackground }}
          title="Compartir"
        >
          <span className="material-symbols-outlined text-[20px]">share</span>
        </button>
        {!instalada && (
          <button
            onClick={instalar}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 shadow-lg active:scale-90 hover:bg-white/60 transition-all"
            style={{ color: t.primary }}
            title="Instalar"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
          </button>
        )}
      </div>

      <main className="max-w-[1440px] mx-auto w-full flex flex-col gap-6 mt-4 px-4 lg:px-6">
        {/* ── BANNERS ── */}
        <section>
          <div
            ref={sliderRef}
            className="flex overflow-x-auto rounded-lg"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {banners.map((b, i) => (
              <div
                key={i}
                className="relative aspect-[21/9] lg:aspect-[21/6] overflow-hidden shrink-0 w-full"
                style={{ scrollSnapAlign: 'start', flex: '0 0 100%' }}
              >
                <img alt="" src={b.img} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 flex flex-col justify-center p-6 lg:px-12" style={{ background: 'linear-gradient(to right, rgba(0,0,0,.78), rgba(0,0,0,.35), transparent)' }}>
                  <span className="text-white/70 text-[10px] lg:text-xs font-bold tracking-widest uppercase">{b.titulo1}</span>
                  <h2 className="text-white font-black text-xl lg:text-4xl leading-tight mt-1" style={{ fontFamily: t.fontHeadline }}>{b.titulo2}</h2>
                  <p className="text-white/80 text-xs lg:text-base mt-1.5 max-w-md">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {banners.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => irABanner(i)}
                  aria-label={`Ir al banner ${i + 1}`}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: bannerIdx === i ? 16 : 6,
                    height: 6,
                    background: bannerIdx === i ? t.primary : t.outlineVariant,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── CATEGORIAS ── */}
        {categorias.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="font-bold text-lg" style={{ fontFamily: t.fontHeadline }}>Explorar Categorías</h3>
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
              <button
                onClick={() => setCategoriaActiva('todas')}
                aria-label="Ver todas las categorías"
                aria-pressed={categoriaActiva === 'todas'}
                className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg transition-all active:scale-95"
                style={{
                  background: categoriaActiva === 'todas' ? t.primary : t.surface,
                  color: categoriaActiva === 'todas' ? t.onPrimary : t.onSurface,
                  border: `1px solid ${categoriaActiva === 'todas' ? t.primary : t.outlineVariant}`,
                }}
              >
                <span className="material-symbols-outlined text-[22px]">grid_view</span>
                <span className="text-[10px] font-semibold leading-tight text-center">Todas</span>
              </button>

              {categorias.map((c) => {
                const activa = categoriaActiva === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoriaActiva(c.id)}
                    aria-label={`Filtrar por ${c.nombre}`}
                    aria-pressed={activa}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg transition-all active:scale-95"
                    style={{
                      background: activa ? t.primary : t.surface,
                      color: activa ? t.onPrimary : t.onSurface,
                      border: `1px solid ${activa ? t.primary : t.outlineVariant}`,
                    }}
                  >
                    <span className="material-symbols-outlined text-[22px]">{c.icono}</span>
                    <span className="text-[10px] font-semibold leading-tight text-center line-clamp-2">{c.nombre}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── PRODUCTOS ── */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <h3 className="font-bold text-lg" style={{ fontFamily: t.fontHeadline }}>
              {categoriaActiva === 'todas' ? 'Recomendados para ti' : categorias.find((c) => c.id === categoriaActiva)?.nombre}
            </h3>
            <span className="text-xs" style={{ color: t.onSurfaceVariant }}>
              {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>

          {cargando ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg overflow-hidden animate-pulse" style={{ background: t.surfaceContainer }}>
                  <div className="aspect-square" style={{ background: t.surfaceContainerHigh }} />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 rounded w-3/4" style={{ background: t.surfaceContainerHigh }} />
                    <div className="h-3 rounded w-1/2" style={{ background: t.surfaceContainerHigh }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2 text-center">
              <span className="material-symbols-outlined text-4xl" style={{ color: t.outlineVariant }}>inventory_2</span>
              <p className="font-semibold" style={{ color: t.onSurfaceVariant }}>
                {busqueda ? `Sin resultados para "${busqueda}"` : 'Todavía no hay productos en esta categoría'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtrados.map((p) => (
                <article
                  key={p.id}
                  className="rounded-lg overflow-hidden flex flex-col group"
                  style={{ background: t.surface, border: `1px solid ${t.outlineVariant}` }}
                >
                  <div className="relative aspect-square overflow-hidden p-3" style={{ background: t.surfaceContainerLow }}>
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: t.onSurfaceVariant }}>{p.category}</span>
                      <h4 className="font-bold text-sm line-clamp-2 mt-0.5" style={{ fontFamily: t.fontHeadline }}>{p.name}</h4>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-black text-base" style={{ color: t.primary }}>S/ {p.price.toFixed(2)}</span>
                      <button
                        onClick={() => agregar(p)}
                        aria-label={`Agregar ${p.name} al carrito`}
                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-90"
                        style={{
                          background: agregados[p.id] ? '#25D366' : t.primary,
                          color: t.onPrimary,
                          transform: agregados[p.id] ? 'scale(1.1)' : undefined,
                        }}
                      >
                        <span className="material-symbols-outlined text-[18px]">{agregados[p.id] ? 'check' : 'add'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── BARRA FIJA DE CARRITO ── */}
      {unidades > 0 && !carritoAbierto && (
        <button
          onClick={() => setCarritoAbierto(true)}
          className="fixed bottom-4 left-4 right-4 z-40 max-w-[1440px] mx-auto rounded-lg px-5 py-3.5 flex items-center justify-between shadow-2xl active:scale-[0.99] transition-transform"
          style={{ background: t.primary, color: t.onPrimary }}
        >
          <span className="font-bold text-sm">Ver pedido ({unidades})</span>
          <span className="font-black">S/ {total.toFixed(2)}</span>
        </button>
      )}

      {/* ── CARRITO ── */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setCarritoAbierto(false)} />
          <div
            className="relative w-full sm:max-w-md rounded-t-lg sm:rounded-lg overflow-hidden flex flex-col max-h-[85vh] shadow-2xl"
            style={{ background: t.surface }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.outlineVariant}` }}>
              <h3 className="font-bold text-lg" style={{ fontFamily: t.fontHeadline }}>Tu pedido</h3>
              <button onClick={() => setCarritoAbierto(false)} aria-label="Cerrar carrito" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: t.surfaceContainer }}>
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
              {carrito.length === 0 ? (
                <p className="py-10 text-center text-sm" style={{ color: t.onSurfaceVariant }}>Tu carrito está vacío</p>
              ) : (
                carrito.map((i) => (
                  <div key={i.producto.id} className="flex items-center gap-3">
                    <img src={i.producto.image} alt={i.producto.name} className="w-14 h-14 rounded-lg object-cover shrink-0" style={{ background: t.surfaceContainerLow }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{i.producto.name}</h4>
                      <span className="font-bold text-sm" style={{ color: t.primary }}>S/ {(i.producto.price * i.cantidad).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => cambiarCantidad(i.producto.id, -1)} aria-label="Quitar uno" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: t.surfaceContainer }}>
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="w-5 text-center font-bold text-sm">{i.cantidad}</span>
                      <button onClick={() => cambiarCantidad(i.producto.id, 1)} aria-label="Agregar uno" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: t.primary, color: t.onPrimary }}>
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {carrito.length > 0 && (
              <div className="px-5 py-4 flex flex-col gap-3" style={{ borderTop: `1px solid ${t.outlineVariant}` }}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold" style={{ color: t.onSurfaceVariant }}>Total</span>
                  <span className="font-black text-xl" style={{ color: t.primary }}>S/ {total.toFixed(2)}</span>
                </div>
                <button
                  onClick={enviarPorWhatsApp}
                  className="w-full py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                  style={{ background: '#25D366', color: '#ffffff' }}
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  Pedir por WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
