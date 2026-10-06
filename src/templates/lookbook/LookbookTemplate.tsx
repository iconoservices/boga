'use client';

import { useFavoritos } from '@/lib/useFavoritos';
import { useCustomerSession } from '@/context/CustomerSessionContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';
import { StoreConfig } from '@/lib/stores.config';
import { getDemoProducts } from '@/lib/templates.config';
import { debeMostrarDemo } from '@/lib/demo';
import OtrosPrecios, { preciosDeProducto } from '@/templates/shared/OtrosPrecios';
import type { PreciosMoneda } from '@/lib/preciosMoneda';
import { fetchProductosDeTienda } from '@/lib/catalogo';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import CustomerAccountButton from '@/components/CustomerAccountButton';
import { useDetalleProducto } from '../shared/useDetalleProducto';
import { leerPresentaciones } from '@/lib/presentaciones';
import { porcentajeOferta } from '@/lib/ofertas';
import BannerSlider from '../shared/BannerSlider';

interface LookbookTemplateProps {
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
  presentaciones?: { label: string; price: number; preciosMoneda?: PreciosMoneda }[];
  /** Precio en otras monedas, escrito por el dueño (lib/preciosMoneda.ts). */
  preciosMoneda?: PreciosMoneda;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
  size?: string;
  unitPrice?: number;
}

export default function LookbookTemplate({ store, initialProductId }: LookbookTemplateProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(false);
  // Aviso al agregar a la bolsa (antes la bolsa se abría sola y cortaba la compra).
  const [avisoBolsa, setAvisoBolsa] = useState<{ titulo: string; talla?: string; image: string } | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Favoritos ligados a la cuenta: sin sesión se abre el modal de entrar / crear cuenta
  const { esFavorito, alternar: alternarFav } = useFavoritos();
  const { setModalAbierto: abrirModalCuenta } = useCustomerSession();

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
          const formatted: ProductItem[] = data.map((p) => ({
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
            preciosMoneda: p.preciosMoneda,
          }));
          setSupabaseProducts(formatted);
        }
      } catch (err) {
        console.error('Error cargando catálogo en LookbookTemplate:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [store.slug]);

  // Demo fallback: solo si la tienda lo pidió expresamente y ya se sabe que no tiene productos
  // propios (mientras isLoading es true, no se sabe todavía — mostrar demo ahí daba el efecto de
  // "aparece y después desaparece" apenas llegaban los productos reales).
  const allProducts = useMemo<ProductItem[]>(() => {
    if (supabaseProducts.length > 0) return supabaseProducts;
    if (isLoading || !debeMostrarDemo(store, 0)) return [];
    const demoList = (store as any).demoProducts || getDemoProducts(store.template || 'lookbook');
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
  }, [supabaseProducts, isLoading, store, (store as any).demoProducts, store.template]);

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

  // Categorías: solo mostrar las que tienen productos reales en catálogo
  const categoriasTienda = useMemo(() => {
    const categoriasConProductos = new Set(
      allProducts.map((p: any) => (p.category || '').toLowerCase().trim()).filter(Boolean)
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
          icon: c.icon || 'checkroom',
        }));
      }
    }

    const unicas = [...categoriasConProductos];
    return unicas.map((c) => ({
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
      icon: 'checkroom',
    }));
  }, [store.categories, allProducts]);

  const hayOfertas = allProducts.some((prod) => prod.hasOffer);

  // Banners que rotan: primero el de la dueña (se ve entero, sin texto encima) y después, solos, hasta 3 de sus prendas con más descuento.
  const slidesPortada = [
    {
      key: 'portada',
      contenido: (
        <img
          src={store.heroImage || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=85'}
          alt={store.heroAlt || store.name}
          className="w-full h-auto max-h-[500px] object-cover object-center block"
        />
      ),
    },
    ...allProducts
      .filter((prod) => prod.hasOffer)
      .sort((x, y) => y.originalPrice / (y.price || 1) - x.originalPrice / (x.price || 1))
      .slice(0, 3)
      .map((prod) => ({
        key: `oferta-${prod.id}`,
        contenido: (
          <button
            type="button"
            onClick={() => abrirProducto(prod)}
            className="relative overflow-hidden w-full h-full min-h-[220px] grid grid-cols-2 grid-rows-1 items-stretch text-left text-white"
            style={{ background: `linear-gradient(135deg, ${theme.primary || '#18181b'}, ${theme.secondary || theme.primary || '#18181b'})` }}
          >
            <span className="p-5 md:p-10 flex flex-col justify-center gap-2 min-w-0">
              <span className="self-start text-[11px] font-black px-2 py-0.5 rounded-md bg-white/25 tracking-wider">🔥 OFERTA {porcentajeOferta(prod.originalPrice, prod.price)}</span>
              <span className="text-lg md:text-3xl font-bold leading-tight line-clamp-3" style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}>{prod.title}</span>
              <span className="text-xl md:text-2xl font-black">
                S/ {prod.price.toFixed(2)} <span className="text-sm font-medium line-through opacity-75">S/ {prod.originalPrice.toFixed(2)}</span>
              </span>
              <span className="self-start text-xs font-bold px-4 py-2 rounded-full bg-white" style={{ color: theme.primary || '#18181b' }}>Ver prenda</span>
            </span>
            <span className="relative min-h-0">
              <img src={prod.image} alt={prod.title} className="absolute inset-0 w-full h-full object-cover object-top" />
            </span>
          </button>
        ),
      })),
  ];

  // Filtrado
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
      const matchOffer = !onlyOffers || prod.hasOffer;
      const matchFav = !onlyFavs || esFavorito(store.slug, prod.id);
      return matchCategory && matchSearch && matchOffer && matchFav;
    });
  }, [allProducts, activeCategory, searchQuery, onlyOffers, onlyFavs, esFavorito, store.slug, categoriasTienda]);

  // Wishlist toggle
  const toggleWishlist = (product: ProductItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = alternarFav({ store: store.slug, id: product.id, name: product.title, price: product.price, image: product.image });
    if (!ok) abrirModalCuenta(true);
  };


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
    setAvisoBolsa({ titulo: product.title, talla: size, image: product.image });
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAvisoBolsa(null), 3500);
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
  const cartAhorro = cart.reduce((acc, item) => {
    const normal = item.product.originalPrice || item.product.price;
    const pagado = item.unitPrice ?? item.product.price;
    return acc + Math.max(0, normal - pagado) * item.quantity;
  }, 0);

  // WhatsApp checkout
  const sendCartToWhatsApp = async () => {
    const cliente = await pedirDatosCliente({
      color: theme.primary || '#18181b',
      pedirEntrega: true,
      entregaDisponible: store.entrega,
    });
    if (!cliente) return;

    const header = `🛍️ *PEDIDO — ${store.name}*\n────────────────────────\n`;
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

    const footer = `\n────────────────────────\n💰 *Total:* S/ ${cartTotal.toFixed(2)}\n👤 *Cliente:* ${cliente.nombre}\n📱 *Teléfono:* ${cliente.telefono}${entregaTexto ? `\n📍 *Entrega:* ${entregaTexto}` : ''}\n\n_Por favor confirmar disponibilidad._`;

    enviarPedidoPorWhatsApp(store, header + itemsText + footer, {
      items: cart.map((item) => ({ id: String(item.product.id), quantity: item.quantity })),
      cliente,
    });
  };

  const whatsappVisible = tieneWhatsApp(store);
  const telefonoVisible = whatsappVisible ? `+${(store.whatsapp || '').replace(/\D/g, '')}` : null;
  const whatsappUrl = whatsappVisible
    ? `https://wa.me/${(store.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${store.name}, vi su catálogo y me gustaría hacer una consulta.`
      )}`
    : null;

  return (
    <div
      style={{
        backgroundColor: theme.background || '#ffffff',
        color: theme.onBackground || '#18181b',
        fontFamily: theme.fontBody || "'Plus Jakarta Sans', sans-serif",
      }}
      className="min-h-screen flex flex-col selection:bg-black selection:text-white pb-16 md:pb-0"
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── STICKY NAVBAR ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            {store.logoImage || store.iconImage ? (
              <img
                src={store.logoImage || store.iconImage}
                alt={store.name}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border border-gray-200 shadow-2xs"
              />
            ) : (
              <div
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-2xs"
                style={{ backgroundColor: theme.primary || '#18181b' }}
              >
                {store.name.charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              <span
                className="text-base sm:text-xl font-extrabold tracking-tight text-gray-900"
                style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
              >
                {store.name}
              </span>
              {store.tagline && (
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium line-clamp-1">
                  {store.tagline}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bag Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-white transition-transform active:scale-95 shadow-xs cursor-pointer"
              style={{ backgroundColor: theme.primary || '#18181b' }}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">shopping_bag</span>
              <span className="text-xs sm:text-sm font-bold">{cartItemsCount}</span>
              {cartTotal > 0 && (
                <span className="hidden sm:inline text-xs font-semibold border-l border-white/20 pl-2">
                  S/ {cartTotal.toFixed(2)}
                </span>
              )}
            </button>
            <CustomerAccountButton variant="encabezado" />
          </div>
        </div>
      </header>

      {/* ── PORTADA 100% VISUAL (SIN TEXTOS SUPERPUESTOS) ───────────── */}
      {/* 
        El cliente puede diseñar libremente su banner en Canva / Photoshop con sus logos, 
        promociones y tipografías sin que el sistema le superponga textos encima.
      */}
      <section className="w-full bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-0 sm:px-4 sm:py-4">
          <div className="w-full overflow-hidden sm:rounded-3xl shadow-sm bg-gray-100 relative">
            <StoreFloatingActions store={store} />
            <BannerSlider slides={slidesPortada} />
          </div>
        </div>
      </section>

      {/* ── INFO BAR DEL LOCAL / BOUTIQUE (DEBAJO DEL BANNER) ────────── */}
      <section className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
              Catálogo de Temporada
            </span>
            {store.zona && (
              <span className="text-xs text-gray-500 border-l border-gray-200 pl-3">
                📍 {store.zona}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            {store.horario && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                <span>{store.horario}</span>
              </div>
            )}
            {store.entrega && (
              <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                {store.entrega === 'delivery'
                  ? '🛵 Solo Delivery'
                  : store.entrega === 'recojo'
                  ? '🏢 Recojo en tienda'
                  : '🛵 Delivery & Recojo'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── HISTORIAS CIRCULARES DE CATEGORÍAS ──────────────────────── */}
      {categoriasTienda.length > 0 && (
        <section className="bg-gray-50/60 py-4 sm:py-5 border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pt-2 pb-2 px-2 -mx-2 scrollbar-none">
              {/* Botón Todo */}
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setOnlyOffers(false);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                    activeCategory === 'all' && !onlyOffers
                      ? 'ring-2 ring-offset-2 ring-black bg-black'
                      : 'border border-gray-300 bg-white'
                  }`}
                >
                  <div
                    className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                      activeCategory === 'all' && !onlyOffers
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-800'
                    }`}
                  >
                    TODO
                  </div>
                </div>
                <span className="text-[11px] font-bold tracking-wider text-gray-700 uppercase">
                  Todos
                </span>
              </button>

              {/* Ofertas: va al principio (antes quedaba al final de la fila, fuera de pantalla en el celular) y solo si hay prendas en oferta */}
              {hayOfertas && (
                <button
                  onClick={() => {
                    setOnlyOffers(true);
                    setActiveCategory('all');
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
                >
                  <div
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                      onlyOffers ? 'ring-2 ring-offset-2 ring-rose-600 bg-rose-600' : 'bg-gradient-to-br from-rose-500 to-orange-400 shadow-md shadow-rose-300/60'
                    }`}
                  >
                    <div
                      className={`w-full h-full rounded-full flex items-center justify-center ${
                        onlyOffers ? 'bg-rose-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl sm:text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    </div>
                    {/* Cuántas prendas están en oferta */}
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-rose-600 text-[10px] font-black flex items-center justify-center shadow border border-rose-200">
                      {allProducts.filter((prod) => prod.hasOffer).length}
                    </span>
                  </div>
                  <span className="text-[11px] font-black tracking-wider text-rose-600 uppercase">
                    Ofertas
                  </span>
                </button>
              )}

              {/* Categorías dinámicas de la tienda */}
              {categoriasTienda.map((cat) => {
                const isActive = activeCategory === cat.id && !onlyOffers;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setOnlyOffers(false);
                    }}
                    className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                        isActive
                          ? 'ring-2 ring-offset-2 ring-black bg-black'
                          : 'border border-gray-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-full h-full rounded-full flex items-center justify-center ${
                          isActive ? 'bg-black text-white' : 'bg-white text-gray-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl sm:text-2xl">{cat.icon}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap ${
                        isActive ? 'text-black font-extrabold' : 'text-gray-600'
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

      {/* ── CATÁLOGO DE PRENDAS (3:4 RATIO) ─────────────────────────── */}
      <main id="catalogo" className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Barra de Filtro y Buscador */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pb-6 border-b border-gray-100">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900"
              style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
            >
              {onlyFavs ? 'Mis favoritas' : onlyOffers ? 'Prendas con Descuento' : activeCategory === 'all' ? 'Nuestra Colección' : `Colección ${activeCategory}`}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {filteredProducts.length} prenda{filteredProducts.length === 1 ? '' : 's'} disponible{filteredProducts.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar prenda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-full border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            {onlyFavs && (
              <button
                onClick={() => setOnlyFavs(false)}
                className="px-3 py-2 rounded-full bg-gray-900 text-white text-xs font-bold hover:bg-gray-700 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>Favoritas</span>
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}

            {onlyOffers && (
              <button
                onClick={() => setOnlyOffers(false)}
                className="px-3 py-2 rounded-full bg-rose-100 text-rose-700 text-xs font-bold hover:bg-rose-200 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>Ofertas</span>
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Grilla de Prendas (Proporción vertical 3:4) */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <span className="material-symbols-outlined text-2xl">checkroom</span>
            </div>
            <h3 className="text-base font-bold text-gray-800">No encontramos prendas en esta selección</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Prueba cambiando la categoría o borrando el texto de búsqueda.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
                setOnlyOffers(false);
              }}
              className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-800"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
            {filteredProducts.map((product) => {
              const hasSizes = Boolean(product.presentaciones && product.presentaciones.length > 0);
              const isWishlisted = esFavorito(store.slug, product.id);

              return (
                <article
                  key={product.id}
                  onClick={() => abrirProducto(product)}
                  className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer relative"
                >
                  {/* Foto con aspecto 3:4 */}
                  <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Badges */}
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

                    {/* Botón Favorito */}
                    <button
                      onClick={(e) => toggleWishlist(product, e)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-700 hover:text-rose-500 transition-colors shadow-2xs cursor-pointer z-10"
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

                    {/* Tallas disponibles flotantes */}
                    {hasSizes && product.presentaciones && (
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 bg-black/70 backdrop-blur-md rounded-lg py-1 px-2 text-white text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Tallas:</span>
                        {product.presentaciones.slice(0, 4).map((p) => (
                          <span key={p.label} className="bg-white/20 px-1 rounded">
                            {p.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Info de la Prenda */}
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
                        <OtrosPrecios precios={preciosDeProducto(product)} className="text-[10px] text-gray-500" />
                      </div>

                      {/* Botón rápido */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasSizes && product.presentaciones && product.presentaciones.length === 1) {
                            // Una sola talla/presentación: no hay nada que elegir, se agrega directo
                            const unica = product.presentaciones[0];
                            addToCart(product, unica.label, unica.price);
                          } else if (hasSizes) {
                            abrirProducto(product);
                          } else {
                            addToCart(product);
                          }
                        }}
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-2xs"
                        style={{ backgroundColor: theme.primary || '#18181b' }}
                        title="Añadir a la bolsa"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── BENEFICIOS Y GARANTÍAS ──────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-8 my-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-gray-800">local_shipping</span>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Envíos Rápidos</h4>
                <p className="text-[11px] text-gray-500">Entrega local o a agencias</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-gray-800">straighten</span>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Asesoría de Tallas</h4>
                <p className="text-[11px] text-gray-500">Te ayudamos por WhatsApp</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-gray-800">verified</span>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Prendas de Calidad</h4>
                <p className="text-[11px] text-gray-500">Confección y acabados finos</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-gray-800">payments</span>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Yape, Plin y Más</h4>
                <p className="text-[11px] text-gray-500">Pagas al coordinar el pedido</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER Y DATOS DE LA TIENDA ─────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300 py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-gray-800">
          <div className="space-y-2">
            <h3
              className="text-lg font-extrabold text-white"
              style={{ fontFamily: theme.fontHeadline || "'Outfit', sans-serif" }}
            >
              {store.name}
            </h3>
            {store.tagline && <p className="text-xs text-gray-400">{store.tagline}</p>}
            {whatsappVisible && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] text-emerald-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Pedidos activos por WhatsApp
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs text-gray-400">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Atención y Local</h4>
            {store.direccion && (
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-gray-500">location_on</span>
                <span>{store.direccion}</span>
              </p>
            )}
            {store.horario && (
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-gray-500">schedule</span>
                <span>{store.horario}</span>
              </p>
            )}
            {telefonoVisible && (
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-gray-500">call</span>
                <span>{telefonoVisible}</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Contacto Directo</h4>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Escribir por WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500">
          <p>© {new Date().getFullYear()} {store.name}.</p>
          <p>Potenciado por Boga Market</p>
        </div>
      </footer>

      {/* ── MODAL DETALLE DE PRENDA ─────────────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl relative"
          >
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

            <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Fotos */}
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

                {/* Info & Selector de Tallas */}
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
                    <OtrosPrecios precios={preciosDeProducto(selectedProduct, selectedSize)} className="text-sm text-gray-500 mt-0.5" />

                    <p className="text-xs text-gray-600 leading-relaxed mt-4">
                      {selectedProduct.description}
                    </p>

                    {/* Selector de Tallas */}
                    {selectedProduct.presentaciones && selectedProduct.presentaciones.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-800">
                            Talla disponible:
                          </label>
                          {selectedSize && (
                            <span className="text-[11px] font-semibold text-gray-500">
                              Elegida: <strong>{selectedSize}</strong>
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

                  {/* Cantidad y Agregar */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Cantidad:</span>
                      <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1">
                        <button
                          onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                          className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer shadow-2xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{detailQty}</span>
                        <button
                          onClick={() => setDetailQty(detailQty + 1)}
                          className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => {
                          const matchedPres = (selectedProduct.presentaciones || []).find(
                            (p: any) => p.label === selectedSize
                          );
                          const unitPrice = matchedPres ? matchedPres.price : selectedProduct.price;
                          addToCart(selectedProduct, selectedSize, unitPrice, detailQty);
                          cerrarProducto();
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        style={{ backgroundColor: theme.primary || '#18181b' }}
                      >
                        <span className="material-symbols-outlined text-base">shopping_bag</span>
                        <span>Añadir a la bolsa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOLSA DE COMPRAS (DRAWER) ───────────────────────────────── */}
      {/* ── BARRA INFERIOR (solo celular): lo que más se usa, al alcance del pulgar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 flex items-stretch bg-white/95 backdrop-blur border-t border-gray-200"
        aria-label="Navegación de la tienda"
      >
        {([
          { id: 'inicio', icon: 'home', label: 'Inicio', activo: !onlyFavs && !onlyOffers && activeCategory === 'all' && !isCartOpen,
            on: () => { setOnlyFavs(false); setOnlyOffers(false); setActiveCategory('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
          { id: 'favoritos', icon: 'favorite', label: 'Favoritos', activo: onlyFavs,
            on: () => { setOnlyFavs(true); setOnlyOffers(false); setActiveCategory('all'); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
          { id: 'bolsa', icon: 'shopping_bag', label: 'Bolsa', activo: isCartOpen, badge: cartItemsCount, on: () => setIsCartOpen(true) },
          { id: 'contacto', icon: 'chat', label: 'Contacto', activo: false,
            on: () => { if (tieneWhatsApp(store)) enviarPedidoPorWhatsApp(store, `Hola ${store.name}, quisiera hacerles una consulta.`); else document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }); } },
        ] as const).map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={b.on}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform cursor-pointer"
            style={{ color: b.activo ? (theme.primary || '#18181b') : '#6b7280' }}
          >
            <span className="relative">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: b.activo ? "'FILL' 1" : "'FILL' 0" }}>{b.icon}</span>
              {'badge' in b && b.badge > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: theme.primary || '#18181b' }}>
                  {b.badge}
                </span>
              )}
            </span>
            <span className="text-[10px] font-bold">{b.label}</span>
          </button>
        ))}
      </nav>

      {/* Aviso al agregar: se queda unos segundos y deja seguir comprando o ir a la bolsa. */}
      {avisoBolsa && !isCartOpen && (
        <div className="fixed left-3 right-3 bottom-20 md:left-auto md:right-6 md:bottom-6 md:w-96 z-[45] animate-fade-in">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-900 text-white p-2.5 pr-3 shadow-2xl">
            <img src={avisoBolsa.image} alt="" className="w-11 h-14 rounded-lg object-cover object-top shrink-0 bg-gray-700" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Agregado a tu bolsa
              </p>
              <p className="text-xs font-semibold truncate">{avisoBolsa.titulo}{avisoBolsa.talla ? ` · ${avisoBolsa.talla}` : ''}</p>
            </div>
            <button
              type="button"
              onClick={() => { setAvisoBolsa(null); setIsCartOpen(true); }}
              className="shrink-0 px-3 py-2 rounded-full bg-white text-gray-900 text-[11px] font-black uppercase tracking-wide active:scale-95 transition-transform cursor-pointer"
            >
              Ver bolsa
            </button>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-2xs transition-opacity"
          />

          <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 flex md:max-w-full md:pl-10">
            <div className="w-full md:w-screen md:max-w-md bg-white shadow-2xl flex flex-col max-h-[88vh] md:max-h-none rounded-t-3xl md:rounded-none overflow-hidden">
              <div className="md:hidden pt-2.5 pb-1 flex justify-center"><span className="w-10 h-1 rounded-full bg-gray-300" /></div>
              <div className="px-5 py-4 md:p-5 border-b border-gray-100 flex items-center justify-between">
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
                    <div className="flex flex-col items-center gap-2 pt-3">
                      <button
                        onClick={() => { setIsCartOpen(false); setOnlyOffers(false); setOnlyFavs(false); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                        className="px-6 py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
                        style={{ backgroundColor: theme.primary || '#18181b' }}
                      >
                        Ver prendas
                      </button>
                      {hayOfertas && (
                        <button
                          onClick={() => { setIsCartOpen(false); setOnlyOffers(true); setActiveCategory('all'); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                          className="px-6 py-2.5 rounded-full border border-rose-300 text-rose-600 text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
                        >
                          🔥 Ver ofertas
                        </button>
                      )}
                    </div>
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

              {cart.length > 0 && (
                <div className="p-5 border-t border-gray-100 bg-gray-50 space-y-4">
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900">S/ {(cartTotal + cartAhorro).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coordinación de entrega</span>
                      <span className="font-medium text-emerald-600">Por WhatsApp</span>
                    </div>
                    {cartAhorro > 0.009 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>🔥 Ahorras con tus ofertas</span>
                        <span>- S/ {cartAhorro.toFixed(2)}</span>
                      </div>
                    )}
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
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800 py-1 cursor-pointer"
                  >
                    Seguir comprando
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

    </div>
  );
}
