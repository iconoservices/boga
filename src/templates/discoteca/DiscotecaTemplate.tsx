'use client';

import CustomerAccountButton from '@/components/CustomerAccountButton';
import React, { useState, useEffect, useMemo } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import OtrosPrecios, { preciosDeProducto } from '@/templates/shared/OtrosPrecios';
import type { PreciosMoneda } from '@/lib/preciosMoneda';
import { fetchProductosDeTienda } from '@/lib/catalogo';
import { getDemoProducts } from '@/lib/templates.config';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { leerPresentaciones, Presentacion } from '@/lib/presentaciones';
import { useDetalleProducto } from '../shared/useDetalleProducto';

interface DiscotecaTemplateProps {
  store: StoreConfig;
  initialProductId?: string;
}

interface ProductItem {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  hasOffer?: boolean;
  category: string;
  image: string;
  images?: string[];
  description?: string;
  presentaciones?: Presentacion[];
  /** Precio en otras monedas, escrito por el dueño (lib/preciosMoneda.ts). */
  preciosMoneda?: PreciosMoneda;
}

export default function DiscotecaTemplate({ store, initialProductId }: DiscotecaTemplateProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyCombos, setOnlyCombos] = useState(false);

  const [selectedSize, setSelectedSize] = useState('');
  const [detailQty, setDetailQty] = useState(1);
  const [fotoActiva, setFotoActiva] = useState(0);

  // Cart State
  const [cart, setCart] = useState<{ product: ProductItem; quantity: number; size?: string; unitPrice?: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Supabase or Demo products
  const [supabaseProducts, setSupabaseProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const data = await fetchProductosDeTienda(store.slug);
        if (isMounted && data && data.length > 0) {
          const formatted: ProductItem[] = data.map((p) => ({
            id: String(p.id),
            title: p.name,
            price: Number(p.price) || 0,
            originalPrice: p.price_anterior > 0 ? Number(p.price_anterior) : Number(p.price) || 0,
            hasOffer: Boolean(p.price_anterior && Number(p.price_anterior) > Number(p.price)),
            category: (p.category || 'botellas').toLowerCase(),
            image: p.image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
            images: Array.isArray(p.images) && p.images.length > 1 ? p.images : undefined,
            description: p.description || 'Disfruta de la mejor experiencia nocturna, tragos premium y atención VIP.',
            presentaciones: leerPresentaciones(p.presentaciones),
            preciosMoneda: p.preciosMoneda,
          }));
          setSupabaseProducts(formatted);
        }
      } catch (err) {
        console.error('Error cargando catálogo en DiscotecaTemplate:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [store.slug]);

  // Demo fallback
  const allProducts = useMemo<ProductItem[]>(() => {
    if (supabaseProducts.length > 0) return supabaseProducts;
    const demoList = (store as any).demoProducts || getDemoProducts(store.template || 'discoteca');
    if (demoList && demoList.length > 0) {
      return demoList.map((p: any, idx: number) => ({
        id: `demo-${idx + 1}`,
        title: p.name,
        price: p.price,
        originalPrice: p.originalPrice || p.price,
        hasOffer: Boolean(p.originalPrice && p.originalPrice > p.price),
        category: (p.category || 'botellas').toLowerCase(),
        image: p.image,
        description: p.description || 'Servicio de alta calidad para que disfrutes tu noche al máximo.',
        presentaciones: p.presentaciones || [
          { label: 'Botella Sola', price: p.price },
          { label: 'Combo + 2 Red Bull', price: p.price + 30 },
        ],
      }));
    }
    return [];
  }, [supabaseProducts, (store as any).demoProducts, store.template]);

  const theme = store.theme;
  const primaryColor = theme.primary || '#a855f7'; // Neon Purple by default
  const secondaryColor = theme.secondary || '#06b6d4'; // Cyan neon

  // Detalle de producto con URL compartible /<slug>/producto/<id>
  const { seleccionado: selectedProduct, abrir: abrirProducto, cerrar: cerrarProducto } = useDetalleProducto<any>(
    store.slug,
    allProducts,
    initialProductId
  );

  useEffect(() => {
    setFotoActiva(0);
    setDetailQty(1);
    if (selectedProduct?.presentaciones && selectedProduct.presentaciones.length > 0) {
      setSelectedSize(selectedProduct.presentaciones[0].label);
    } else {
      setSelectedSize('');
    }
  }, [selectedProduct]);

  const fotosDetalle = selectedProduct
    ? selectedProduct.images && selectedProduct.images.length > 1
      ? selectedProduct.images
      : [selectedProduct.image]
    : [];

  // Categorías con productos (SOLO las que realmente tienen productos en catálogo)
  const categoriasTienda = useMemo(() => {
    const categoriasConProductos = new Set(
      allProducts.map((p) => (p.category || '').toLowerCase().trim()).filter(Boolean)
    );

    if ((store.categories || []).length > 0) {
      const filtradas = store.categories.filter((c) => {
        const slug = (c.href || '').toLowerCase().trim();
        const nom = (c.name || '').toLowerCase().trim();
        return categoriasConProductos.has(slug) || categoriasConProductos.has(nom);
      });
      if (filtradas.length > 0) {
        return filtradas.map((c) => ({
          id: (c.href || '').toLowerCase().trim(),
          label: c.name,
          icon: c.icon || 'nightlife',
        }));
      }
    }

    const unicas = [...categoriasConProductos];
    return unicas.map((c) => ({
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
      icon: 'nightlife',
    }));
  }, [store.categories, allProducts]);

  // Helper para fotos de categorías en Stories
  const fotoDeCategoria = (catId: string, catLabel: string) => {
    const p = allProducts.find((item) => {
      const pc = (item.category || '').toLowerCase().trim();
      return pc === catId.toLowerCase().trim() || pc === catLabel.toLowerCase().trim();
    });
    return p?.image || store.heroImage || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80';
  };

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return allProducts.filter((prod) => {
      const prodCat = (prod.category || '').toLowerCase().trim();
      const matchedCategory = categoriasTienda.find((c) => c.id === activeCategory);
      const matchCategory =
        activeCategory === 'all' ||
        (!matchedCategory
          ? prodCat === activeCategory
          : prodCat === matchedCategory.id || prodCat === matchedCategory.label.toLowerCase().trim());
      const matchSearch =
        !searchQuery.trim() ||
        prod.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchCombo = !onlyCombos || prod.hasOffer || prod.title.toLowerCase().includes('combo') || prod.title.toLowerCase().includes('box');
      return matchCategory && matchSearch && matchCombo;
    });
  }, [allProducts, activeCategory, searchQuery, onlyCombos, categoriasTienda]);

  // Productos destacados de fiesta (los primeros 5)
  const productosDestacados = useMemo(() => {
    return allProducts.slice(0, 5);
  }, [allProducts]);

  // Cart operations
  const addToCart = (product: ProductItem, size?: string, unitPrice?: number, qty = 1) => {
    const finalPrice = unitPrice ?? product.price;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.size === size);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product, quantity: qty, size, unitPrice: finalPrice }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, amount: number, size?: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.size === size) {
            return { ...item, quantity: item.quantity + amount };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string, size?: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.size === size)));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.unitPrice ?? item.product.price) * item.quantity, 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const sendCartToWhatsApp = async () => {
    const cliente = await pedirDatosCliente({
      color: primaryColor,
      pedirEntrega: true,
      entregaDisponible: store.entrega || 'ambos',
    });
    if (!cliente) return;

    const header = `🍾 *RESERVA / PEDIDO EN ${store.name.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    const itemsText = cart
      .map((item) => {
        const itemPrice = (item.unitPrice ?? item.product.price) * item.quantity;
        const presentacionTexto = item.size ? ` (${item.size})` : '';
        return `• ${item.quantity}x ${item.product.title}${presentacionTexto} — S/ ${itemPrice.toFixed(2)}`;
      })
      .join('\n');

    const entregaTexto =
      cliente.entrega === 'recojo'
        ? '📍 Consumo / Recojo en Local (Barra / Box)'
        : cliente.entrega === 'delivery'
        ? `🛵 Delivery previo al evento a: ${cliente.direccion}`
        : '';

    const footer = `\n━━━━━━━━━━━━━━━━━━━━━━\n💰 *Total:* S/ ${cartTotal.toFixed(2)}\n👤 *Cliente:* ${cliente.nombre}\n📱 *Teléfono:* ${cliente.telefono}${entregaTexto ? `\n${entregaTexto}` : ''}\n\n_Por favor confirmar disponibilidad de Box / Mesa / Botellas._`;

    enviarPedidoPorWhatsApp(store, header + itemsText + footer, {
      items: cart.map((item) => ({ id: String(item.product.id), quantity: item.quantity })),
      cliente,
    });
  };

  const whatsappVisible = tieneWhatsApp(store);
  const whatsappUrl = whatsappVisible
    ? `https://wa.me/${(store.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${store.name}, deseo consultar por reservas de Boxes y cartas de la discoteca.`
      )}`
    : null;

  return (
    <div
      style={{
        backgroundColor: '#0a0a0f',
        color: '#f3f4f6',
        fontFamily: theme.fontBody || "'Plus Jakarta Sans', sans-serif",
      }}
      className="min-h-screen flex flex-col selection:bg-purple-600 selection:text-white"
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── STICKY NAVBAR NOCTURNO ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0d0d14]/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            {store.logoImage || store.iconImage ? (
              <img
                src={store.logoImage || store.iconImage}
                alt={store.name}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
              />
            ) : (
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-extrabold text-base shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                style={{ backgroundColor: primaryColor }}
              >
                {store.name.charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              <span
                className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-2"
                style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
              >
                {store.name}
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" title="Abierto" />
              </span>
              <span className="text-[10px] sm:text-xs text-purple-300/80 font-medium tracking-wide line-clamp-1">
                {store.tagline || 'Discoteca & Club Nocturno'}
              </span>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="flex items-center gap-2.5">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:bg-purple-900/60 text-xs font-bold transition-all"
                title="Consultar por WhatsApp"
              >
                <span className="material-symbols-outlined text-sm text-emerald-400">chat</span>
                <span>Reservas</span>
              </a>
            )}

            {/* Bag Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-white transition-all active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer hover:brightness-110"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)`,
              }}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">shopping_bag</span>
              <span className="text-xs sm:text-sm font-black">{cartItemsCount}</span>
              {cartTotal > 0 && (
                <span className="hidden sm:inline text-xs font-bold border-l border-white/20 pl-2">
                  S/ {cartTotal.toFixed(2)}
                </span>
              )}
            </button>
            <CustomerAccountButton variant="encabezado" />
          </div>
        </div>
      </header>

      {/* ── PORTADA 100% VISUAL (SOLO IMAGEN, SIN TEXTOS SUPERPUESTOS) ── */}
      {/* 
        El cliente puede colocar el flyer de su fiesta semanal, evento o portada 
        diseñada en Canva/Photoshop sin textos superpuestos que choquen.
      */}
      <section className="w-full bg-[#08080c] border-b border-white/5">
        <div className="max-w-6xl mx-auto px-0 sm:px-4 sm:py-4">
          <div className="w-full overflow-hidden sm:rounded-3xl shadow-2xl bg-black relative border border-white/5">
            <StoreFloatingActions store={store} />
            <img
              src={store.heroImage || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=85'}
              alt={store.heroAlt || store.name}
              className="w-full h-auto max-h-[520px] object-cover object-center block"
            />
          </div>
        </div>
      </section>

      {/* ── MARQUESINA DE FIESTA / TICKER NEÓN (DEBAJO DEL BANNER) ────── */}
      <section className="bg-gradient-to-r from-purple-950/80 via-[#130d22] to-purple-950/80 border-b border-purple-500/20 py-2.5 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-200/90 gap-6 overflow-x-auto scrollbar-none whitespace-nowrap">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-sm text-yellow-400">bolt</span>
            <span>Viernes & Sábados Open</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-sm text-cyan-400">wine_bar</span>
            <span>Combos & Botellas Premium</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-sm text-fuchsia-400">weekend</span>
            <span>Boxes VIP & Ultra Lounge</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-sm text-emerald-400">headphones</span>
            <span>Resident & Guest DJs</span>
          </span>
        </div>
      </section>

      {/* ── BARRA DE PERFIL Y CONFIANZA DEL CLUB ─────────────────────── */}
      <section className="bg-[#101018] border-b border-white/5 py-3.5 px-4 text-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-gray-300">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-extrabold uppercase tracking-widest text-[10px]">
              +18 VIP ONLY
            </span>
            {store.zona && (
              <span className="text-gray-400 border-l border-white/10 pl-3 hidden sm:inline">
                📍 {store.zona}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            {store.horario && (
              <div className="hidden sm:flex items-center gap-1.5 text-gray-400">
                <span className="material-symbols-outlined text-sm text-purple-400">schedule</span>
                <span>{store.horario}</span>
              </div>
            )}
            <span className="flex items-center gap-1 text-white font-bold">
              <span className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span>{store.rating ? store.rating.toFixed(1) : '4.9'}</span>
              <span className="text-gray-400 font-normal hidden sm:inline">Top Nightclub</span>
            </span>
            {store.entrega && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 font-medium">
                {store.entrega === 'recojo' ? '🏢 En Local' : store.entrega === 'delivery' ? '🛵 Delivery Previo' : '🍾 Consumo & Delivery'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── STORIES / HIGHLIGHTS DE CATEGORÍAS NEÓN ─────────────────── */}
      {categoriasTienda.length > 0 && (
        <section className="bg-[#0b0b12] border-b border-white/5 py-4 sm:py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-2 scrollbar-none">
              {/* Botón Todo */}
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setOnlyCombos(false);
                }}
                className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                    activeCategory === 'all' && !onlyCombos
                      ? 'ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                      : 'border border-white/15'
                  }`}
                >
                  <div
                    className={`w-full h-full rounded-full flex flex-col items-center justify-center font-black text-[10px] uppercase tracking-wider ${
                      activeCategory === 'all' && !onlyCombos
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white'
                        : 'bg-[#181824] text-gray-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">local_fire_department</span>
                    <span>TODO</span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold tracking-tight transition-colors ${
                    activeCategory === 'all' && !onlyCombos ? 'text-purple-400' : 'text-gray-400 group-hover:text-white'
                  }`}
                >
                  Carta Completa
                </span>
              </button>

              {/* Burbujas de categorías con foto real */}
              {categoriasTienda.map((cat) => {
                const foto = fotoDeCategoria(cat.id, cat.label);
                const isActive = activeCategory === cat.id && !onlyCombos;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setOnlyCombos(false);
                    }}
                    className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                          : 'border border-white/15'
                      }`}
                    >
                      <img
                        src={foto}
                        alt={cat.label}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <span
                      className={`text-[11px] font-semibold tracking-tight transition-colors max-w-[80px] text-center line-clamp-1 ${
                        isActive ? 'text-purple-400 font-bold' : 'text-gray-400 group-hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── LOS MÁS PEDIDOS DE LA NOCHE (SHOWCASE HORIZONTAL) ────────── */}
      {activeCategory === 'all' && !searchQuery && productosDestacados.length > 0 && (
        <section className="bg-gradient-to-b from-[#0b0b12] to-[#0d0d16] py-6 sm:py-8 border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3
                  className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2"
                  style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
                >
                  <span className="material-symbols-outlined text-purple-400">stars</span>
                  <span>Destacados de la Noche</span>
                </h3>
                <p className="text-xs text-gray-400">Los combos, botellas y boxes más pedidos de este fin de semana</p>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
              {productosDestacados.map((item) => (
                <div
                  key={item.id}
                  onClick={() => abrirProducto(item)}
                  className="w-64 sm:w-72 shrink-0 bg-[#141420]/80 rounded-2xl border border-white/10 overflow-hidden group cursor-pointer hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all flex flex-col"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden relative bg-[#1c1c2e]">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-purple-500/40 text-[9px] font-black uppercase tracking-wider text-purple-300">
                      TOP PICKS
                    </span>
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
                      <span className="text-base font-black text-white">
                        S/ {Number(item.price).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Pedir</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CATÁLOGO PRINCIPAL ───────────────────────────────────────── */}
      <main id="catalog" className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Buscador y Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2
              className="text-xl sm:text-2xl font-black tracking-tight text-white"
              style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
            >
              Carta & Reservas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-bold">
              {filteredProducts.length} disponibles
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar trago, box, botella..."
                className="w-full pl-9 pr-8 py-2 bg-[#141420] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setOnlyCombos((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                onlyCombos
                  ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'bg-[#141420] text-gray-300 border-white/10 hover:border-white/20'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-yellow-400">local_bar</span>
              <span>Combos VIP</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Categoría */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {[{ id: 'all', label: 'Todo' }, ...categoriasTienda].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                  : 'bg-[#13131e] text-gray-400 border-white/5 hover:text-white hover:border-white/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid de Productos */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-[#101018] rounded-3xl border border-white/5 p-8">
            <span className="material-symbols-outlined text-5xl text-purple-400/50 mb-3 block">
              nightlife
            </span>
            <p className="text-base font-bold text-white">No se encontraron opciones</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Intenta con otra búsqueda o selecciona otra categoría de la carta.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
                setOnlyCombos(false);
              }}
              className="mt-4 px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors"
            >
              Ver Toda la Carta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => abrirProducto(prod)}
                className="bg-[#12121c]/90 rounded-2xl border border-white/10 overflow-hidden flex flex-col group cursor-pointer hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all"
              >
                {/* Imagen */}
                <div className="aspect-[4/3] sm:aspect-square w-full relative overflow-hidden bg-[#1a1a28]">
                  <img
                    src={prod.image}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {prod.hasOffer && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md">
                      PROMO
                    </span>
                  )}

                  {/* Botón rápido de agregar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(prod);
                    }}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                    title="Añadir a la cuenta"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                      {prod.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mt-0.5">
                      {prod.title}
                    </h4>
                    {prod.description && (
                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-1">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-white/5">
                    <div>
                      {prod.hasOffer && prod.originalPrice && prod.originalPrice > prod.price && (
                        <span className="text-[10px] text-gray-500 line-through mr-1.5 block">
                          S/ {Number(prod.originalPrice).toFixed(2)}
                        </span>
                      )}
                      <span className="text-sm sm:text-base font-black text-white">
                        S/ {Number(prod.price).toFixed(2)}
                      </span>
                      <OtrosPrecios precios={preciosDeProducto(prod)} className="text-[10px] text-gray-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 group-hover:underline">
                      Ver
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BANNER DE RESERVAS VIP & CUMPLEAÑOS ──────────────────────── */}
        {whatsappVisible && (
          <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/70 via-[#18112e] to-purple-950/70 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-400">
                <span className="material-symbols-outlined text-3xl">celebration</span>
              </div>
              <div>
                <h4
                  className="text-lg sm:text-xl font-black text-white"
                  style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
                >
                  ¿Celebras tu cumpleaños o buscas Box VIP?
                </h4>
                <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl">
                  Asegura la mejor ubicación para tu grupo, cotiza combos personalizados y recibe beneficios exclusivos de cumpleañero.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/${(store.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                `Hola ${store.name}, deseo información para celebrar un cumpleaños / reservar un Box VIP este fin de semana.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              <span>Reservar Box / Cumpleaños</span>
            </a>
          </div>
        )}
      </main>

      {/* ── MODAL DETALLE DE PRODUCTO / TRAGO ────────────────────────── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
          onClick={() => cerrarProducto()}
        >
          <div
            className="w-full sm:max-w-lg bg-[#11111a] rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                Detalle del Producto / Servicio
              </span>
              <button
                onClick={() => cerrarProducto()}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Imagen */}
              <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black/40 border border-white/10 relative">
                <img
                  src={fotosDetalle[fotoActiva] || selectedProduct.image}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Título y Precio */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  {selectedProduct.category}
                </span>
                <h3
                  className="text-xl sm:text-2xl font-black text-white mt-1"
                  style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
                >
                  {selectedProduct.title}
                </h3>
                <p className="text-2xl font-black text-white mt-2">
                  S/{' '}
                  {(
                    (selectedProduct.presentaciones?.find((p: any) => p.label === selectedSize)?.price ??
                      selectedProduct.price) * detailQty
                  ).toFixed(2)}
                </p>
                <OtrosPrecios precios={preciosDeProducto(selectedProduct, selectedSize)} factor={detailQty} className="text-sm text-gray-300" />
                {selectedProduct.description && (
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                )}
              </div>

              {/* Presentaciones / Medidas / Combos */}
              {selectedProduct.presentaciones && selectedProduct.presentaciones.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-bold text-gray-300 block">
                    Elige la presentación / opción:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.presentaciones.map((p: any) => {
                      const isSel = selectedSize === p.label;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setSelectedSize(p.label)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                            isSel
                              ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                              : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <span>{p.label}</span>
                          <span className="text-[10px] opacity-80">S/ {Number(p.price).toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selector de Cantidad */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-gray-300">Cantidad:</span>
                <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <button
                    onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm text-white w-4 text-center">{detailQty}</span>
                  <button
                    onClick={() => setDetailQty(detailQty + 1)}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Footer: Botón de ancho completo */}
            <div className="p-4 border-t border-white/10 bg-[#0e0e16]">
              <button
                onClick={() => {
                  const matchedPres = (selectedProduct.presentaciones || []).find(
                    (p: any) => p.label === selectedSize
                  );
                  const unitPrice = matchedPres ? matchedPres.price : selectedProduct.price;
                  addToCart(selectedProduct, selectedSize, unitPrice, detailQty);
                  cerrarProducto();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                <span>Añadir al Pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DEL CARRITO / CUENTA ─────────────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#0f0f18] text-white flex flex-col border-l border-white/10 shadow-2xl">
              {/* Header Carrito */}
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#131320]">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-purple-400 text-2xl">shopping_bag</span>
                  <h3 className="font-black text-base uppercase tracking-wider" style={{ fontFamily: theme.fontHeadline }}>
                    Mi Cuenta / Pedido
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/30 text-purple-300 font-bold">
                    {cartItemsCount}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Lista de Items */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">
                      nightlife
                    </span>
                    <p className="font-bold text-sm text-gray-300">Tu cuenta está vacía</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Agrega botellas, combos, cócteles o reserva tu box VIP para disfrutar la noche.
                    </p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors cursor-pointer"
                    >
                      Explorar Carta
                    </button>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={`${item.product.id}-${item.size}-${idx}`}
                      className="flex gap-3 bg-[#161624] p-3 rounded-2xl border border-white/5"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-16 h-16 rounded-xl object-cover bg-black shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white truncate">
                            {item.product.title}
                          </h4>
                          {item.size && (
                            <span className="text-[10px] text-purple-400 font-bold block mt-0.5">
                              {item.size}
                            </span>
                          )}
                          <span className="text-xs font-black text-white mt-1 block">
                            S/ {((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                          <div className="flex items-center gap-2 bg-black/30 rounded-full px-2 py-0.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1, item.size)}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1, item.size)}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.size)}
                            className="text-gray-500 hover:text-rose-400 p-1"
                            title="Quitar"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Carrito */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-6 border-t border-white/10 bg-[#131320] space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-medium">Total de la orden:</span>
                    <span className="text-xl font-black text-white">
                      S/ {cartTotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={sendCartToWhatsApp}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                    <span>Confirmar por WhatsApp</span>
                  </button>

                  <p className="text-[10px] text-gray-400 text-center">
                    Los datos de mesa/reserva se solicitarán antes de enviar el mensaje a WhatsApp.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
