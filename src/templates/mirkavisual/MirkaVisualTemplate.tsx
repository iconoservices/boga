'use client';

import React, { useState, useEffect } from 'react';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';
import { StoreConfig } from '@/lib/stores.config';
import { getDemoProducts } from '@/lib/templates.config';
import { debeMostrarDemo } from '@/lib/demo';
import OtrosPrecios, { preciosDeProducto } from '@/templates/shared/OtrosPrecios';
import type { PreciosMoneda } from '@/lib/preciosMoneda';
import { fetchProductosDeTienda } from '@/lib/catalogo';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { estrellasDe } from '../shared/tokens';
import { useDetalleProducto } from '../shared/useDetalleProducto';
import { leerPresentaciones } from '@/lib/presentaciones';

interface MirkaVisualTemplateProps {
  store: StoreConfig;
  initialProductId?: string;
}

export default function MirkaVisualTemplate({ store, initialProductId }: MirkaVisualTemplateProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(false);

  const [selectedSize, setSelectedSize] = useState('M');
  const [detailQty, setDetailQty] = useState(1);
  const [fotoActiva, setFotoActiva] = useState(0);

  // Cart State
  const [cart, setCart] = useState<{ product: any; quantity: number; size?: string; unitPrice?: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Dynamic Products from Supabase
  const [supabaseProducts, setSupabaseProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSupabaseProducts = async () => {
      try {
        const data = await fetchProductosDeTienda(store.slug);
        if (isMounted && data && data.length > 0) {
          const formatted = data.map((p) => ({
            id: p.id,
            title: p.name,
            price: Number(p.price) || 0,
            originalPrice: p.price_anterior > 0 ? Number(p.price_anterior) : Number(p.price) || 0,
            hasOffer: p.price_anterior > 0,
            category: p.category ? p.category.toLowerCase() : 'vestidos',
            image: p.image || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
            images: Array.isArray(p.images) && p.images.length > 1 ? p.images : undefined,
            description: p.description || 'Prenda exclusiva con acabados de alta calidad.',
            presentaciones: leerPresentaciones(p.presentaciones),
            preciosMoneda: p.preciosMoneda,
          }));
          setSupabaseProducts(formatted);
        }
      } catch (err) {
        console.error('Error fetching Supabase products:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSupabaseProducts();
    return () => {
      isMounted = false;
    };
  }, [store.slug]);

  const theme = store.theme;

  // Demo fallback: solo si la tienda lo pidió expresamente y ya se sabe que no tiene productos
  // propios (mientras isLoading es true, no se sabe todavía — mostrar demo ahí daba el efecto de
  // "aparece y después desaparece" apenas llegaban los productos reales).
  const allProducts = React.useMemo<any[]>(() => {
    if (supabaseProducts.length > 0) return supabaseProducts;
    if (isLoading || !debeMostrarDemo(store, 0)) return [];
    const demoList = (store as any).demoProducts || getDemoProducts(store.template || 'mirkavisual');
    if (demoList && demoList.length > 0) {
      return demoList.map((p: any, idx: number) => ({
        id: `demo-${idx + 1}`,
        title: p.name,
        price: p.price,
        originalPrice: p.originalPrice || p.price,
        hasOffer: Boolean(p.originalPrice && p.originalPrice > p.price),
        category: (p.category || 'vestidos').toLowerCase(),
        image: p.image,
        description: p.description || 'Prenda exclusiva con acabados de alta calidad.',
        presentaciones: p.presentaciones || [
          { label: 'S', price: p.price },
          { label: 'M', price: p.price },
          { label: 'L', price: p.price },
        ],
      }));
    }
    return [];
  }, [supabaseProducts, isLoading, store, (store as any).demoProducts, store.template]);

  // Detalle de producto con URL propia (/<tienda>/producto/<id>)
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

  // Solo mostrar categorías que realmente tienen productos en la tienda
  const categoriasTienda = React.useMemo(() => {
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
        return filtradas.map((c) => ({ id: c.href.toLowerCase().trim(), label: c.name }));
      }
    }

    const unicas = [...categoriasConProductos];
    return unicas.map((c: any) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
  }, [store.categories, allProducts]);

  const fotoDeCategoria = (catId: string, catLabel: string) => {
    const p = allProducts.find((item: any) => {
      const pc = (item.category || '').toLowerCase().trim();
      return pc === catId.toLowerCase().trim() || pc === catLabel.toLowerCase().trim();
    });
    return p?.image || store.heroImage || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80';
  };

  const productosDestacados = React.useMemo(() => {
    return allProducts.slice(0, 6);
  }, [allProducts]);

  const filteredProducts = React.useMemo(() => {
    return allProducts.filter((prod: any) => {
      const prodCat = (prod.category || '').toLowerCase().trim();
      const matchedCategory = categoriasTienda.find((c) => c.id === activeCategory);
      const matchCategory =
        activeCategory === 'all' ||
        (!matchedCategory
          ? prodCat === activeCategory
          : prodCat === matchedCategory.id || prodCat === matchedCategory.label.toLowerCase().trim());
      const matchSearch =
        !searchQuery.trim() ||
        (prod.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (prod.category || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchOffer = !onlyOffers || prod.hasOffer;
      return matchCategory && matchSearch && matchOffer;
    });
  }, [allProducts, activeCategory, searchQuery, onlyOffers, categoriasTienda]);

  const whatsappVisible = tieneWhatsApp(store);
  const telefonoVisible = whatsappVisible ? `+${(store.whatsapp || '').replace(/\D/g, '')}` : null;

  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoMensaje, setContactoMensaje] = useState('');

  // Cart Handlers
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

  const sendCartToWhatsApp = async () => {
    const cliente = await pedirDatosCliente({
      color: store.theme.primary,
      pedirEntrega: true,
      entregaDisponible: store.entrega,
    });
    if (!cliente) return;
    const header = `*Pedido de ${store.name}*\n-------------------------\n`;
    const itemsText = cart
      .map((item) => {
        const itemPrice = (item.unitPrice ?? item.product.price) * item.quantity;
        const tallaTexto = item.size ? ` (Talla: ${item.size})` : '';
        return `- ${item.product.title}${tallaTexto} (x${item.quantity}): S/ ${itemPrice.toFixed(2)}`;
      })
      .join('\n');
    const entregaTexto =
      cliente.entrega === 'recojo'
        ? 'Recojo en tienda'
        : cliente.entrega === 'delivery'
        ? `Delivery a: ${cliente.direccion}`
        : '';
    const footer = `\n-------------------------\n*Total:* S/ ${cartTotal.toFixed(2)}\n*Cliente:* ${cliente.nombre} (${cliente.telefono})${
      entregaTexto ? `\n*Entrega:* ${entregaTexto}` : ''
    }`;
    enviarPedidoPorWhatsApp(store, header + itemsText + footer, {
      items: cart.map((item) => ({ id: String(item.product.id), quantity: item.quantity })),
      cliente,
    });
  };

  return (
    <div
      style={{
        background: theme.background || '#fdf6f7',
        minHeight: '100vh',
        fontFamily: theme.fontBody || "'Montserrat', sans-serif",
        color: theme.onBackground || '#1a0a0d',
        paddingBottom: '90px',
      }}
    >
      {/* External CSS imports */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Montserrat:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── HEADER (TAL CUAL ESTILOS MIRKA) ───────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-black/8 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            {store.logoImage && (
              <img
                src={store.logoImage}
                alt={store.name}
                className="w-8 h-8 rounded-full object-cover border border-black/10"
              />
            )}
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}
            >
              {store.name}
            </span>
          </div>

          {/* Nav links — desktop only, categorias reales de la tienda */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveCategory('all')}
              className="text-xs font-semibold uppercase tracking-wider hover:opacity-60 transition-opacity cursor-pointer"
              style={{ color: theme.onBackground }}
            >
              Colección
            </button>
            {categoriasTienda.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="text-xs font-semibold uppercase tracking-wider hover:opacity-60 transition-opacity cursor-pointer"
                style={{ color: theme.onBackground }}
              >
                {cat.label}
              </button>
            ))}
            <button
              onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-xs font-semibold uppercase tracking-wider hover:opacity-60 transition-opacity cursor-pointer"
              style={{ color: theme.onBackground }}
            >
              Contacto
            </button>
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-3">
            {/* Wishlist */}
            <button className="p-1.5 cursor-pointer hover:opacity-60 transition-opacity hidden md:block">
              <span className="material-symbols-outlined text-xl" style={{ color: theme.onSurface || '#1a0a0d' }}>
                favorite_border
              </span>
            </button>
            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-1.5 cursor-pointer hover:opacity-60 transition-opacity"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.onSurface || '#1a0a0d' }}>
                shopping_bag
              </span>
              {cartItemsCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                  style={{ backgroundColor: theme.primary }}
                >
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── PORTADA 100% VISUAL (SOLO IMAGEN, SIN LETRAS ENCIMA) ───── */}
      <section className="overflow-hidden w-full bg-black/5">
        <div className="w-full max-w-7xl mx-auto relative">
          <StoreFloatingActions store={store} />
          <img
            src={store.heroImage || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80'}
            alt={store.heroAlt || store.name}
            className="w-full h-auto max-h-[500px] object-cover object-top block"
          />
        </div>
      </section>

      {/* ── BARRA DE BENEFICIOS BOUTIQUE (DEBAJO DEL BANNER) ──────── */}
      <section className="bg-white border-b border-black/8 py-3.5 px-4 shadow-2xs">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="flex items-center justify-center gap-2.5 py-1">
            <span className="material-symbols-outlined text-xl shrink-0" style={{ color: theme.primary }}>local_shipping</span>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-900 leading-tight">Envíos a Todo el Perú</p>
              <p className="text-[10px] text-gray-500 hidden sm:block">Rápidos y seguros</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2.5 py-1">
            <span className="material-symbols-outlined text-xl shrink-0" style={{ color: theme.primary }}>diamond</span>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-900 leading-tight">Prendas Exclusivas</p>
              <p className="text-[10px] text-gray-500 hidden sm:block">Confección y diseño</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2.5 py-1">
            <span className="material-symbols-outlined text-xl shrink-0" style={{ color: theme.primary }}>verified_user</span>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-900 leading-tight">Compra Segura</p>
              <p className="text-[10px] text-gray-500 hidden sm:block">Yape, Plin y Transferencia</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2.5 py-1">
            <span className="material-symbols-outlined text-xl shrink-0" style={{ color: theme.primary }}>chat</span>
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-900 leading-tight">Asesoría de Tallas</p>
              <p className="text-[10px] text-gray-500 hidden sm:block">Atención directa por WhatsApp</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BARRA DE PERFIL Y UBICACIÓN DEL LOCAL ─────────────────── */}
      <section className="bg-white/80 border-b border-black/8 py-2.5 px-4 text-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-gray-600">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Boutique Abierta</span>
            {store.zona && (
              <span className="text-gray-500 border-l border-black/10 pl-3 hidden sm:inline">
                📍 {store.zona}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-5 text-[11px]">
            {store.horario && (
              <div className="hidden sm:flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                <span>{store.horario}</span>
              </div>
            )}
            {store.entrega && (
              <span className="px-2 py-0.5 bg-black/5 rounded-xs font-semibold text-gray-700">
                {store.entrega === 'delivery' ? '🛵 Solo Delivery' : store.entrega === 'recojo' ? '🏢 Recojo en tienda' : '🛵 Delivery & Recojo'}
              </span>
            )}
            <span className="flex items-center gap-1 text-gray-800 font-semibold">
              <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span>{store.rating ? store.rating.toFixed(1) : '5.0'}</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── HISTORIAS CIRCULARES DE COLECCIONES ─────────────────────── */}
      {categoriasTienda.length > 0 && (
        <section className="bg-white border-b border-black/8 py-4 sm:py-5">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {/* Burbuja Todo */}
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setOnlyOffers(false);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105"
                  style={{
                    border: `2px solid ${activeCategory === 'all' && !onlyOffers ? theme.primary : 'rgba(0,0,0,0.12)'}`,
                  }}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center font-bold text-[11px] uppercase tracking-wider"
                    style={{
                      backgroundColor: activeCategory === 'all' && !onlyOffers ? theme.primary : '#ffffff',
                      color: activeCategory === 'all' && !onlyOffers ? '#ffffff' : '#333333',
                    }}
                  >
                    TODO
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-gray-800">Colección</span>
              </button>

              {/* Burbujas de categorías con foto real */}
              {categoriasTienda.map((cat) => {
                const fotoCat = fotoDeCategoria(cat.id, cat.label);
                const isActive = activeCategory === cat.id;
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
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-transform group-hover:scale-105"
                      style={{
                        border: `2px solid ${isActive ? theme.primary : 'rgba(0,0,0,0.12)'}`,
                        boxShadow: isActive ? `0 0 0 2px ${theme.primary}33` : 'none',
                      }}
                    >
                      <img
                        src={fotoCat}
                        alt={cat.label}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <span
                      className="text-[11px] font-medium whitespace-nowrap line-clamp-1 max-w-[70px] text-center"
                      style={{ color: isActive ? theme.primary : '#4b5563', fontWeight: isActive ? 700 : 500 }}
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

      {/* ── MAIN CATALOG (TARJETAS CUADRADAS TAL CUAL ESTILOS MIRKA) ── */}
      <section id="catalog" className="max-w-6xl mx-auto px-4 py-8">
        {/* Search + title + quick filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: theme.fontHeadline, color: theme.onBackground || '#1a0a0d' }}
            >
              Nuestra Colección
            </h2>
            <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-black/5 rounded-xs">
              {filteredProducts.length} prendas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar prenda o estilo..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-black/15 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-black/40 transition-all shadow-2xs"
                style={{ borderRadius: '2px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setOnlyOffers((v) => !v)}
              className={`px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                onlyOffers
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-gray-700 border-black/15 hover:border-black/30'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <span className="material-symbols-outlined text-sm text-rose-500">local_fire_department</span>
              <span>Ofertas</span>
            </button>
          </div>
        </div>

        {/* Category Ribbon — con estilo rectangular de Estilos Mirka */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6" style={{ scrollbarWidth: 'none' }}>
          {[{ id: 'all', label: 'Todo' }, ...categoriasTienda].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer"
              style={{
                backgroundColor: activeCategory === cat.id ? theme.primary : 'white',
                color: activeCategory === cat.id ? 'white' : '#555',
                borderColor: activeCategory === cat.id ? theme.primary : 'rgba(0,0,0,0.12)',
                borderRadius: '2px',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product Grid — 4 columns on desktop, 2 on mobile */}
        {filteredProducts.length === 0 && (
          <div className="py-16 text-center">
            <span
              className="material-symbols-outlined text-4xl mb-3 block"
              style={{ color: `${theme.onSurfaceVariant}80` }}
            >
              styler
            </span>
            <p className="font-semibold text-sm" style={{ color: theme.onSurface }}>
              Todavía no hay prendas en esta categoría
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              onClick={() => {
                abrirProducto(prod);
                setDetailQty(1);
                setSelectedSize(prod.presentaciones?.[0]?.label || 'M');
              }}
              className="bg-white border border-black/5 overflow-hidden flex flex-col group relative cursor-pointer"
              style={{ borderRadius: '4px' }}
            >
              {/* Badge Offer */}
              {prod.hasOffer && (
                <span
                  className="absolute top-2 left-2 text-white text-[9px] font-black px-2 py-0.5 z-10 shadow uppercase tracking-wide"
                  style={{ background: theme.primary, borderRadius: '2px' }}
                >
                  OFERTA
                </span>
              )}

              {/* Portrait image — 3:4 ratio like fashion stores */}
              <div className="overflow-hidden relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                <img
                  src={prod.image}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt={prod.title}
                />
                {/* Agregar rápido */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(prod);
                  }}
                  aria-label={`Agregar ${prod.title} al carrito`}
                  className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center shadow-lg hover:opacity-90 active:scale-90 transition-all cursor-pointer"
                  style={{ background: theme.primary, borderRadius: '2px' }}
                >
                  <span className="material-symbols-outlined text-white text-lg">add</span>
                </button>
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between">
                <h4
                  className="font-medium text-xs text-gray-900 leading-snug line-clamp-2 mb-2"
                  style={{ fontFamily: theme.fontBody }}
                >
                  {prod.title}
                </h4>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    {prod.hasOffer && prod.originalPrice && prod.originalPrice !== prod.price && (
                      <span className="text-[10px] text-gray-400 line-through">
                        S/ {Number(prod.originalPrice).toFixed(2)}
                      </span>
                    )}
                    <span className="font-bold text-sm" style={{ color: theme.primary }}>
                      S/ {Number(prod.price).toFixed(2)}
                    </span>
                    <OtrosPrecios precios={preciosDeProducto(prod)} className="text-[10px] text-gray-500" />
                  </div>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 border"
                    style={{ color: theme.primary, borderColor: theme.primary, borderRadius: '2px' }}
                  >
                    Ver
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCT DETAIL SHEET (TAL CUAL ESTILOS MIRKA) ───────── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex flex-col w-full h-full bg-white overflow-hidden animate-fade-in"
          style={{ background: theme.background }}
        >
          {/* Header/Top Bar */}
          <div
            className="flex items-center justify-between px-4 h-14 border-b border-black/5 shrink-0 bg-white"
            style={{ background: theme.surface }}
          >
            <button
              onClick={() => cerrarProducto()}
              className="w-10 h-10 flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.primary }}>
                arrow_back
              </span>
            </button>
            <span
              className="font-bold text-xs uppercase tracking-widest"
              style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}
            >
              Detalle del Producto
            </span>
            <button
              onClick={() => {
                cerrarProducto();
                setIsCartOpen(true);
              }}
              className="w-10 h-10 flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity relative"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.primary }}>
                shopping_bag
              </span>
              {cartItemsCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                  style={{ backgroundColor: theme.primary }}
                >
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pb-28">
            {/* Image gallery (3:4 ratio for clothes) */}
            <div className="w-full relative bg-gray-100 aspect-3/4 max-w-md mx-auto">
              <img
                src={fotosDetalle[fotoActiva] ?? selectedProduct.image}
                alt={selectedProduct.title}
                className="w-full h-full object-cover object-top"
              />
              {selectedProduct.hasOffer && (
                <span
                  className="absolute top-4 left-4 text-white text-[10px] font-black px-3 py-1 shadow uppercase tracking-wide"
                  style={{ background: theme.primary, borderRadius: '2px' }}
                >
                  OFERTA
                </span>
              )}
              {fotosDetalle.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4 flex-wrap">
                  {fotosDetalle.map((foto: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFotoActiva(i)}
                      aria-label={`Ver foto ${i + 1} de ${selectedProduct.title}`}
                      aria-current={fotoActiva === i}
                      className="w-11 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-all active:scale-95"
                      style={{
                        borderColor: fotoActiva === i ? '#fff' : 'transparent',
                        opacity: fotoActiva === i ? 1 : 0.7,
                      }}
                    >
                      <img src={foto} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="max-w-md mx-auto px-5 py-6">
              {/* Title + Price */}
              <div className="flex flex-col gap-2 mb-4">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest opacity-60"
                  style={{ color: theme.primary }}
                >
                  {selectedProduct.category}
                </span>
                <h1
                  className="text-xl font-bold leading-tight"
                  style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}
                >
                  {selectedProduct.title}
                </h1>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black" style={{ color: theme.primary }}>
                    S/ {Number(selectedProduct.price).toFixed(2)}
                  </span>
                  {selectedProduct.hasOffer &&
                    selectedProduct.originalPrice &&
                    selectedProduct.originalPrice !== selectedProduct.price && (
                      <span className="text-xs text-gray-400 line-through">
                        S/ {Number(selectedProduct.originalPrice).toFixed(2)}
                      </span>
                    )}
                </div>
                <OtrosPrecios precios={preciosDeProducto(selectedProduct, selectedSize)} className="text-sm text-gray-500" />
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div className="border-t border-black/5 pt-4 mb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {/* Size selector: tallas reales configuradas del producto */}
              {(() => {
                const tallas =
                  selectedProduct.presentaciones && selectedProduct.presentaciones.length > 0
                    ? selectedProduct.presentaciones
                    : [];
                if (tallas.length === 0) return null;
                return (
                  <div className="border-t border-black/5 pt-4 mb-5">
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-3"
                      style={{ color: theme.onSurface || '#1a0a0d' }}
                    >
                      Talla
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {tallas.map((item: any) => {
                        const sz = item.label;
                        const isSelected = (selectedSize || tallas[0]?.label) === sz;
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className="px-3.5 h-10 min-w-10 text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            style={{
                              borderRadius: '2px',
                              background: isSelected ? theme.primary : 'white',
                              color: isSelected ? 'white' : '#555',
                              borderColor: isSelected ? theme.primary : 'rgba(0,0,0,0.15)',
                            }}
                          >
                            <span>{sz}</span>
                            {item.price && item.price !== selectedProduct.price && (
                              <span className="text-[10px] opacity-80">S/ {Number(item.price).toFixed(2)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Fixed bottom bar */}
          <div
            className="border-t border-black/5 px-5 py-4 flex gap-3 items-center bg-white shrink-0 mt-auto"
            style={{ background: theme.surface }}
          >
            {/* Qty */}
            <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1.5 shrink-0">
              <button
                onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined text-base" style={{ color: theme.onSurface || '#1a0a0d' }}>
                  remove
                </span>
              </button>
              <span className="font-black text-sm w-4 text-center" style={{ color: theme.onSurface || '#1a0a0d' }}>
                {detailQty}
              </span>
              <button
                onClick={() => setDetailQty(detailQty + 1)}
                className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
              >
                <span className="material-symbols-outlined text-base" style={{ color: theme.onSurface || '#1a0a0d' }}>
                  add
                </span>
              </button>
            </div>

            {/* Add to cart */}
            {(() => {
              const presSeleccionada =
                selectedProduct.presentaciones?.find((p: any) => p.label === selectedSize) ||
                selectedProduct.presentaciones?.[0];
              const precioUnitario = presSeleccionada?.price || selectedProduct.price;
              const tallaElegida = presSeleccionada?.label || selectedSize || undefined;

              return (
                <button
                  onClick={() => {
                    addToCart(selectedProduct, tallaElegida, precioUnitario, detailQty);
                    cerrarProducto();
                  }}
                  className="flex-1 h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  style={{ background: theme.primary }}
                >
                  <span className="material-symbols-outlined text-lg">shopping_bag</span>
                  Añadir · S/ {(precioUnitario * detailQty).toFixed(2)}
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── SHOPPING CART DRAWER (TAL CUAL ESTILOS MIRKA) ───────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          />

          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            {/* Cart Header */}
            <div className="p-4 border-b border-black/5 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-700">shopping_bag</span>
                <h3 className="font-bold text-gray-900">Tu Bolsa de Compras</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-16">
                  <span className="material-symbols-outlined text-5xl mb-2 text-gray-400">shopping_bag</span>
                  <p className="font-bold text-gray-500">Tu bolsa está vacía.</p>
                  <p className="text-xs text-gray-400 mt-1">Explora productos premium y añádelos aquí.</p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemKey = `${item.product.id}-${item.size || 'default'}`;
                  const itemPrice = item.unitPrice ?? item.product.price;
                  return (
                    <div
                      key={itemKey}
                      className="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-black/5 relative"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border">
                        <img
                          src={item.product.image}
                          className="w-full h-full object-cover"
                          alt={item.product.title}
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h4 className="font-bold text-xs text-gray-900 truncate leading-snug">
                            {item.product.title}
                          </h4>
                          {item.size && (
                            <span className="text-[10px] font-semibold text-gray-500 block mt-0.5">
                              Talla: {item.size}
                            </span>
                          )}
                          <span className="font-black text-xs block mt-1" style={{ color: theme.primary }}>
                            S/ {itemPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-white border rounded-lg p-0.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1, item.size)}
                              className="w-5 h-5 flex items-center justify-center font-bold text-xs text-gray-500 hover:text-black cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 text-[11px] font-black text-gray-800">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1, item.size)}
                              className="w-5 h-5 flex items-center justify-center font-bold text-xs text-gray-500 hover:text-black cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.product.id, item.size)}
                            className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-black/5 bg-gray-50 space-y-4">
                <div className="flex items-center justify-between font-black text-gray-900 text-sm">
                  <span>Subtotal:</span>
                  <span className="text-lg" style={{ color: theme.primary }}>
                    S/ {cartTotal.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={sendCartToWhatsApp}
                    className="w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer"
                    style={{ background: '#25D366' }}
                  >
                    <span>Pedir por WhatsApp</span>
                    <span className="material-symbols-outlined text-lg">chat</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTACT SECTION (TAL CUAL ESTILOS MIRKA) ────────────── */}
      {(store.direccion || store.horario || telefonoVisible) && (
        <section
          id="contacto"
          className="max-w-6xl mx-auto px-4 py-10 border-t border-black/5 grid md:grid-cols-2 gap-10"
        >
          <div className="space-y-4">
            <h3
              className="text-lg font-bold"
              style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}
            >
              Visítanos o Escríbenos
            </h3>
            <div className="space-y-3">
              {store.direccion && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg" style={{ color: theme.primary }}>
                    location_on
                  </span>
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-gray-900">Nuestra Tienda</p>
                    <p className="text-gray-500">{store.direccion}</p>
                  </div>
                </div>
              )}
              {store.horario && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg" style={{ color: theme.primary }}>
                    schedule
                  </span>
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-gray-900">Horario de Atención</p>
                    <p className="text-gray-500">{store.horario}</p>
                  </div>
                </div>
              )}
              {telefonoVisible && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg" style={{ color: theme.primary }}>
                    call
                  </span>
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-gray-900">Teléfono / WhatsApp</p>
                    <a
                      href={`https://wa.me/${(store.whatsapp || '').replace(/\D/g, '')}`}
                      className="text-gray-500 hover:underline"
                    >
                      {telefonoVisible}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3
              className="text-lg font-bold"
              style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}
            >
              Envíanos un mensaje
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Tu nombre"
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-black/30"
              />
              <input
                type="tel"
                placeholder="Tu teléfono (WhatsApp)"
                value={contactoTelefono}
                onChange={(e) => setContactoTelefono(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-black/30"
              />
              <textarea
                rows={3}
                placeholder="¿En qué podemos ayudarte?"
                value={contactoMensaje}
                onChange={(e) => setContactoMensaje(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-black/30 resize-none"
              />
              <button
                onClick={() => {
                  if (!contactoNombre.trim() || !contactoMensaje.trim()) return;
                  const texto = `Hola ${store.name}, soy ${contactoNombre}${
                    contactoTelefono ? ` (${contactoTelefono})` : ''
                  }. ${contactoMensaje}`;
                  enviarPedidoPorWhatsApp(store, texto);
                }}
                className="w-full py-2.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: theme.primary }}
              >
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
