'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';
import { StoreConfig } from '@/lib/stores.config';
import { getDemoProducts } from '@/lib/templates.config';
import { fetchProductosDeTienda } from '@/lib/catalogo';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { estrellasDe } from '../shared/tokens';
import { useDetalleProducto } from '../shared/useDetalleProducto';
import { leerPresentaciones } from '@/lib/presentaciones';

interface AtelierTemplateProps {
  store: StoreConfig;
  initialProductId?: string;
}

interface ProductItem {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  hasOffer: boolean;
  category: string;
  image: string;
  images?: string[];
  description: string;
  presentaciones?: { label: string; price: number }[];
}

interface CartItem {
  product: any;
  quantity: number;
  size?: string;
  unitPrice?: number;
}

export default function AtelierTemplate({ store, initialProductId }: AtelierTemplateProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  const [selectedSize, setSelectedSize] = useState('');
  const [detailQty, setDetailQty] = useState(1);
  const [fotoActiva, setFotoActiva] = useState(0);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Products state (Supabase or Demo fallback)
  const [supabaseProducts, setSupabaseProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const data = await fetchProductosDeTienda(store.slug);
        if (isMounted && data && data.length > 0) {
          const formatted = data.map((p) => ({
            id: String(p.id),
            title: p.name,
            price: Number(p.price) || 0,
            originalPrice: p.price_anterior > 0 ? Number(p.price_anterior) : Number(p.price) || 0,
            hasOffer: Boolean(p.price_anterior && Number(p.price_anterior) > Number(p.price)),
            category: (p.category || 'coleccion').toLowerCase(),
            image: p.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
            images: Array.isArray(p.images) && p.images.length > 1 ? p.images : undefined,
            description: p.description || 'Prenda de confección de alta calidad y diseño exclusivo.',
            presentaciones: leerPresentaciones(p.presentaciones),
          }));
          setSupabaseProducts(formatted);
        }
      } catch (err) {
        console.error('Error cargando catálogo en AtelierTemplate:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [store.slug]);

  // Demo fallback if store has no products yet (e.g. preview)
  const allProducts = useMemo<ProductItem[]>(() => {
    if (supabaseProducts.length > 0) return supabaseProducts;
    const demoList = (store as any).demoProducts || getDemoProducts(store.template || 'atelier');
    if (demoList && demoList.length > 0) {
      return demoList.map((p: any, idx: number) => ({
        id: `demo-${idx + 1}`,
        title: p.name,
        price: p.price,
        originalPrice: p.originalPrice || p.price,
        hasOffer: Boolean(p.originalPrice && p.originalPrice > p.price),
        category: (p.category || 'coleccion').toLowerCase(),
        image: p.image,
        description: p.description || 'Diseño exclusivo de temporada con telas seleccionadas.',
        presentaciones: p.presentaciones || [
          { label: 'S', price: p.price },
          { label: 'M', price: p.price },
          { label: 'L', price: p.price },
        ],
      }));
    }
    return [];
  }, [supabaseProducts, (store as any).demoProducts, store.template]);

  const theme = store.theme;

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

  // Categorías
  const categoriasTienda = useMemo(() => {
    if ((store.categories || []).length > 0) {
      return store.categories.map((c) => ({
        id: c.href.toLowerCase(),
        label: c.name,
        icon: c.icon || 'checkroom',
      }));
    }
    const unicas = [...new Set(allProducts.map((p) => p.category))].filter(Boolean);
    return unicas.map((c) => ({
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
      icon: 'checkroom',
    }));
  }, [store.categories, allProducts]);

  // Filtrado
  const filteredProducts = useMemo(() => {
    return allProducts.filter((prod) => {
      const matchCategory = activeCategory === 'all' || prod.category === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        prod.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchOffer = !onlyOffers || prod.hasOffer;
      return matchCategory && matchSearch && matchOffer;
    });
  }, [allProducts, activeCategory, searchQuery, onlyOffers]);

  // Wishlist toggle
  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  // Cart operations
  const addToCart = (product: any, size?: string, unitPrice?: number, qty = 1) => {
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

  const removeFromCart = (productId: string, size?: string) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.size === size)));
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

  const cartTotal = cart.reduce((acc, item) => acc + (item.unitPrice ?? item.product.price) * item.quantity, 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // WhatsApp checkout
  const sendCartToWhatsApp = async () => {
    const cliente = await pedirDatosCliente({
      color: theme.primary || '#111827',
      pedirEntrega: true,
      entregaDisponible: store.entrega,
    });
    if (!cliente) return;

    const header = `🛍️ *PEDIDO ATELIER — ${store.name}*\n────────────────────────\n`;
    const itemsText = cart
      .map((item) => {
        const itemPrice = (item.unitPrice ?? item.product.price) * item.quantity;
        const tallaTexto = item.size ? ` [Talla: ${item.size}]` : '';
        return `• *${item.product.title}*${tallaTexto}\n  ${item.quantity} un. x S/ ${(item.unitPrice ?? item.product.price).toFixed(2)} = S/ ${itemPrice.toFixed(2)}`;
      })
      .join('\n\n');

    const entregaTexto =
      cliente.entrega === 'recojo'
        ? '🏢 Recojo en tienda'
        : cliente.entrega === 'delivery'
        ? `🛵 Envío a domicilio: ${cliente.direccion}`
        : '';

    const footer = `\n────────────────────────\n💰 *Total a Pagar:* S/ ${cartTotal.toFixed(2)}\n👤 *Cliente:* ${cliente.nombre}\n📱 *Teléfono:* ${cliente.telefono}${entregaTexto ? `\n📍 *Entrega:* ${entregaTexto}` : ''}\n\n_Por favor confirmar disponibilidad para coordinar el pago._`;

    enviarPedidoPorWhatsApp(store, header + itemsText + footer, {
      items: cart.map((item) => ({ id: String(item.product.id), quantity: item.quantity })),
      cliente,
    });
  };

  const whatsappVisible = tieneWhatsApp(store);
  const telefonoVisible = whatsappVisible ? `+${(store.whatsapp || '').replace(/\D/g, '')}` : null;

  return (
    <div
      style={{
        backgroundColor: theme.background || '#faf9f6',
        color: theme.onBackground || '#111827',
        fontFamily: theme.fontBody || "'Plus Jakarta Sans', sans-serif",
      }}
      className="min-h-screen flex flex-col selection:bg-black selection:text-white"
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── TOP ANNOUNCEMENT BAR ────────────────────────────────────── */}
      <div
        className="text-[11px] font-semibold tracking-wider uppercase py-2 px-4 text-center text-white flex items-center justify-center gap-2"
        style={{ backgroundColor: theme.primary || '#111827' }}
      >
        <span>✨ NUEVA COLECCIÓN // ENVIOS A TODO EL PAÍS // COMPRA DIRECTA POR WHATSAPP</span>
      </div>

      {/* ── STICKY NAVBAR ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-shadow duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-3">
            {store.iconImage ? (
              <img
                src={store.iconImage}
                alt={store.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-200 shadow-xs"
              />
            ) : (
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-xs"
                style={{ backgroundColor: theme.primary || '#111827' }}
              >
                {store.name.charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              <span
                className="text-lg sm:text-2xl font-extrabold tracking-tight"
                style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
              >
                {store.name}
              </span>
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-gray-500 font-medium">
                {store.tagline || 'Estudio de Moda & Boutique'}
              </span>
            </div>
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest font-semibold text-gray-600">
            <button
              onClick={() => {
                setActiveCategory('all');
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-black transition-colors cursor-pointer"
            >
              Colección
            </button>
            <button
              onClick={() => {
                setOnlyOffers(true);
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-black transition-colors cursor-pointer text-rose-600 font-bold"
            >
              Ofertas 🔥
            </button>
            <button
              onClick={() => document.getElementById('garantias')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-black transition-colors cursor-pointer"
            >
              Beneficios
            </button>
            <button
              onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-black transition-colors cursor-pointer"
            >
              Contacto
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bag / Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gray-900 text-white hover:bg-black transition-transform active:scale-95 shadow-sm cursor-pointer"
              style={{ backgroundColor: theme.primary || '#111827' }}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">shopping_bag</span>
              <span className="text-xs sm:text-sm font-bold">{cartItemsCount}</span>
              <span className="hidden sm:inline text-xs font-medium border-l border-white/20 pl-2">
                S/ {cartTotal.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO LOOKBOOK BANNER ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="relative min-h-[380px] sm:min-h-[480px] lg:min-h-[540px] flex items-center">
          {/* Background Image with Dark Vignette */}
          <div className="absolute inset-0 z-0">
            <img
              src={store.heroImage || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=85'}
              alt={store.heroAlt || store.name}
              className="w-full h-full object-cover object-center opacity-70 filter brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 w-full">
            <div className="max-w-2xl space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs uppercase tracking-widest font-bold text-gray-200">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Nueva Colección 2026
              </div>

              <h1
                className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white"
                style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
              >
                Diseño, elegancia y tendencia para ti.
              </h1>

              <p className="text-sm sm:text-base text-gray-300 font-light max-w-lg leading-relaxed">
                Descubre prendas confeccionadas con atención a cada detalle. Elige tu talla y pide directamente por WhatsApp.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveCategory('all');
                    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 rounded-full bg-white text-black font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer flex items-center gap-2"
                >
                  <span>Explorar Colección</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>

                <button
                  onClick={() => {
                    setOnlyOffers(true);
                    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white font-semibold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-rose-400 text-base">local_fire_department</span>
                  <span>Ver Ofertas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STORIES / HIGHLIGHTS CATEGORY BUBBLES ───────────────────── */}
      {categoriasTienda.length > 0 && (
        <section className="bg-white border-b border-gray-100 py-4 sm:py-6 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-2 scrollbar-none">
              {/* "Todo" Bubble */}
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setOnlyOffers(false);
                }}
                className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                    activeCategory === 'all' && !onlyOffers
                      ? 'ring-2 ring-offset-2 ring-black'
                      : 'border border-gray-200'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs sm:text-sm">
                    TODO
                  </div>
                </div>
                <span className="text-[11px] font-bold tracking-wider text-gray-700 uppercase">
                  Todos
                </span>
              </button>

              {/* Individual Category Bubbles */}
              {categoriasTienda.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setOnlyOffers(false);
                    }}
                    className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                        isActive ? 'ring-2 ring-offset-2 ring-black' : 'border border-gray-200'
                      }`}
                    >
                      <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-gray-800">
                        <span className="material-symbols-outlined text-xl sm:text-2xl">{cat.icon}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap ${
                        isActive ? 'text-black font-extrabold' : 'text-gray-500'
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}

              {/* Offers Bubble */}
              <button
                onClick={() => {
                  setOnlyOffers(true);
                  setActiveCategory('all');
                }}
                className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                    onlyOffers ? 'ring-2 ring-offset-2 ring-rose-500' : 'border border-rose-200'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl sm:text-2xl">local_fire_department</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                  Ofertas
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── CATALOG SECTION ─────────────────────────────────────────── */}
      <main id="catalog" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        {/* Controls: Search, Tabs & Counter */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between pb-6 border-b border-gray-200">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900"
              style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
            >
              {onlyOffers ? 'Prendas en Promoción' : activeCategory === 'all' ? 'Nuestra Colección' : `Colección ${activeCategory}`}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Mostrando {filteredProducts.length} prenda{filteredProducts.length === 1 ? '' : 's'} disponible{filteredProducts.length === 1 ? '' : 's'}
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar prenda o estilo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {onlyOffers && (
              <button
                onClick={() => setOnlyOffers(false)}
                className="px-3 py-2 rounded-full bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>Ofertas</span>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Grid (3:4 aspect ratio fashion cards) */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <span className="material-symbols-outlined text-3xl">checkroom</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800">No encontramos prendas con estos filtros</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Prueba cambiando la categoría o borrando el término de búsqueda para ver más modelos.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
                setOnlyOffers(false);
              }}
              className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-800"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
            {filteredProducts.map((product) => {
              const hasSizes = product.presentaciones && product.presentaciones.length > 0;
              const isWishlisted = Boolean(wishlist[product.id]);

              return (
                <article
                  key={product.id}
                  onClick={() => abrirProducto(product)}
                  className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer relative"
                >
                  {/* Photo Container (Fashion 3:4 aspect ratio) */}
                  <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Discount or New Badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      {product.hasOffer ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                          OFERTA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          NUEVO
                        </span>
                      )}
                    </div>

                    {/* Wishlist Heart */}
                    <button
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-700 hover:text-rose-500 transition-colors shadow-sm cursor-pointer z-10"
                    >
                      <span
                        className={`material-symbols-outlined text-base ${
                          isWishlisted ? 'text-rose-600 fill-current' : ''
                        }`}
                        style={{ fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>

                    {/* Available Sizes preview pill */}
                    {hasSizes && product.presentaciones && (
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-black/60 backdrop-blur-md rounded-lg py-1 px-2 text-white text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Tallas:</span>
                        {product.presentaciones.slice(0, 4).map((p: any) => (
                          <span key={p.label} className="bg-white/20 px-1 rounded">
                            {p.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
                        {product.category}
                      </span>
                      <h3
                        className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-black line-clamp-2 mt-0.5"
                        style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
                      >
                        {product.title}
                      </h3>
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-gray-100 mt-2">
                      <div className="flex flex-col">
                        {product.hasOffer && (
                          <span className="text-[10px] text-gray-400 line-through">
                            S/ {Number(product.originalPrice).toFixed(2)}
                          </span>
                        )}
                        <span className="text-sm sm:text-base font-extrabold text-gray-900">
                          S/ {Number(product.price).toFixed(2)}
                        </span>
                      </div>

                      {/* Quick Add Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasSizes) {
                            abrirProducto(product);
                          } else {
                            addToCart(product);
                          }
                        }}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-900 text-white hover:bg-black flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-xs"
                        style={{ backgroundColor: theme.primary || '#111827' }}
                        title="Añadir a la bolsa"
                      >
                        <span className="material-symbols-outlined text-base sm:text-lg">add</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── GUARANTEES & TRUST BAR ──────────────────────────────────── */}
      <section id="garantias" className="bg-white border-y border-gray-100 py-10 my-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 text-gray-900">
                <span className="material-symbols-outlined text-2xl">local_shipping</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900">Envíos Seguros</h4>
                <p className="text-[11px] text-gray-500">Delivery local y a agencias a nivel nacional</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 text-gray-900">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900">Calidad Superior</h4>
                <p className="text-[11px] text-gray-500">Telas y confección probada en cada prenda</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 text-gray-900">
                <span className="material-symbols-outlined text-2xl">straighten</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900">Asesoría de Tallas</h4>
                <p className="text-[11px] text-gray-500">Te guiamos en medidas y ajuste por WhatsApp</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 text-gray-900">
                <span className="material-symbols-outlined text-2xl">payments</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900">Pagos Cómodos</h4>
                <p className="text-[11px] text-gray-500">Yape, Plin, transferencia o contraentrega</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STORE INFO & CONTACT ────────────────────────────────────── */}
      <footer id="contacto" className="bg-gray-900 text-gray-300 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-gray-800">
          {/* Brand Col */}
          <div className="space-y-3">
            <h3
              className="text-xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
            >
              {store.name}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              {store.heroAlt || store.tagline || 'Moda con actitud. Diseños contemporáneos pensados para destacar.'}
            </p>
            {whatsappVisible && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] text-emerald-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Atención activa por WhatsApp
                </span>
              </div>
            )}
          </div>

          {/* Details Col */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Ubicación y Horario</h4>
            <div className="space-y-2 text-xs text-gray-400">
              {store.direccion && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-gray-500">location_on</span>
                  <span>{store.direccion}</span>
                </div>
              )}
              {store.horario && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-gray-500">schedule</span>
                  <span>{store.horario}</span>
                </div>
              )}
              {telefonoVisible && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-gray-500">call</span>
                  <span>{telefonoVisible}</span>
                </div>
              )}
            </div>
          </div>

          {/* Direct WhatsApp Call to Action */}
          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">¿Tienes alguna consulta?</h4>
              <p className="text-xs text-gray-400 mt-1">
                Escríbenos directamente para consultar stock, fotos adicionales de las prendas o pedidos especiales.
              </p>
            </div>
            {whatsappVisible && (
              <a
                href={`https://wa.me/${(store.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hola ${store.name}, vi su catálogo y me gustaría hacer una consulta.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Chatear por WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>© {new Date().getFullYear()} {store.name}. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Impulsado por <span className="font-bold text-gray-300">Boga Market</span>
          </p>
        </div>
      </footer>

      {/* ── PRODUCT DETAIL MODAL ────────────────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl relative"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-[11px] uppercase tracking-widest font-bold text-gray-400">
                Detalle de Prenda
              </span>
              <button
                onClick={cerrarProducto}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Photo & Gallery */}
                <div className="space-y-3">
                  <div className="aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden shadow-xs relative">
                    <img
                      src={fotosDetalle[fotoActiva] || selectedProduct.image}
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover object-top"
                    />
                    {selectedProduct.hasOffer && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                        OFERTA
                      </span>
                    )}
                  </div>

                  {fotosDetalle.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {fotosDetalle.map((f: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setFotoActiva(i)}
                          className={`w-14 h-16 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                            fotoActiva === i ? 'border-black' : 'border-transparent opacity-60'
                          }`}
                        >
                          <img src={f} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info & Options */}
                <div className="flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {selectedProduct.category}
                    </span>
                    <h2
                      className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mt-1"
                      style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
                    >
                      {selectedProduct.title}
                    </h2>

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-gray-900">
                        S/ {Number(selectedProduct.price).toFixed(2)}
                      </span>
                      {selectedProduct.hasOffer && (
                        <span className="text-sm text-gray-400 line-through">
                          S/ {Number(selectedProduct.originalPrice).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed mt-4">
                      {selectedProduct.description}
                    </p>

                    {/* Size Selector */}
                    {selectedProduct.presentaciones && selectedProduct.presentaciones.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-800">
                            Talla disponible:
                          </label>
                          {selectedSize && (
                            <span className="text-[11px] font-semibold text-gray-500">
                              Seleccionada: <strong>{selectedSize}</strong>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.presentaciones.map((item: any) => {
                            const isSelected = selectedSize === item.label;
                            return (
                              <button
                                key={item.label}
                                onClick={() => setSelectedSize(item.label)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-black text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                }`}
                              >
                                {item.label}
                                {item.price && item.price !== selectedProduct.price && (
                                  <span className="ml-1 text-[10px] opacity-80">
                                    (S/ {Number(item.price).toFixed(2)})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity & Actions */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Cantidad:</span>
                      <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1">
                        <button
                          onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                          className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer shadow-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{detailQty}</span>
                        <button
                          onClick={() => setDetailQty(detailQty + 1)}
                          className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer shadow-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const matchedPres = (selectedProduct.presentaciones || []).find(
                            (p: any) => p.label === selectedSize
                          );
                          const unitPrice = matchedPres ? matchedPres.price : selectedProduct.price;
                          addToCart(selectedProduct, selectedSize, unitPrice, detailQty);
                          cerrarProducto();
                        }}
                        className="flex-1 py-3 px-4 rounded-2xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        style={{ backgroundColor: theme.primary || '#111827' }}
                      >
                        <span className="material-symbols-outlined text-base">shopping_bag</span>
                        <span>Añadir a la bolsa</span>
                      </button>

                      {whatsappVisible && (
                        <a
                          href={`https://wa.me/${(store.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Hola ${store.name}, deseo consultar por la prenda: ${selectedProduct.title}${
                              selectedSize ? ` en talla ${selectedSize}` : ''
                            } (Precio: S/ ${Number(selectedProduct.price).toFixed(2)})`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="Consultar por WhatsApp"
                        >
                          <span className="material-symbols-outlined text-lg">chat</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SLIDE-OVER BAG / CART DRAWER ────────────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              {/* Cart Drawer Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-gray-900">shopping_bag</span>
                  <h3
                    className="text-base font-extrabold text-gray-900"
                    style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
                  >
                    Bolsa de Compras
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                    {cartItemsCount}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-400">
                      <span className="material-symbols-outlined text-2xl">remove_shopping_cart</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800">Tu bolsa está vacía</p>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                      Explora el catálogo y elige tus prendas favoritas para agregarlas a la bolsa.
                    </p>
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const price = item.unitPrice ?? item.product.price;
                    return (
                      <div
                        key={`${item.product.id}-${item.size || ''}-${idx}`}
                        className="flex gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 relative group"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.title}
                          className="w-16 h-20 object-cover object-top rounded-xl bg-white shrink-0"
                        />

                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                                {item.product.title}
                              </h4>
                              <button
                                onClick={() => removeFromCart(item.product.id, item.size)}
                                className="text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>

                            {item.size && (
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                                Talla: {item.size}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-xs font-black text-gray-900">
                              S/ {(price * item.quantity).toFixed(2)}
                            </span>

                            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-0.5">
                              <button
                                onClick={() => updateQuantity(item.product.id, -1, item.size)}
                                className="text-gray-500 hover:text-black font-bold text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold w-3 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, 1, item.size)}
                                className="text-gray-500 hover:text-black font-bold text-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Cart Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-gray-100 bg-gray-50 space-y-4">
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900">S/ {cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coordinación de envío</span>
                      <span className="font-medium text-emerald-600">Por WhatsApp</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>S/ {cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={sendCartToWhatsApp}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                    <span>Enviar Pedido por WhatsApp</span>
                  </button>

                  <p className="text-[10px] text-gray-400 text-center">
                    Tus datos de entrega se solicitarán antes de enviar el mensaje a WhatsApp.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp and Cart Quick Access */}
      <StoreFloatingActions store={store} />
    </div>
  );
}
