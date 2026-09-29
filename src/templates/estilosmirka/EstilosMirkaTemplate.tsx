'use client';

import React, { useState, useEffect } from 'react';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';
import { conMarcaBlanca } from '@/lib/modulos';
import { StoreConfig } from '@/lib/stores.config';
import { fetchProductosDeTienda } from '@/lib/catalogo';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { estrellasDe } from '../shared/tokens';
import { useDetalleProducto } from '../shared/useDetalleProducto';
import { leerPresentaciones } from '@/lib/presentaciones';

interface EstilosMirkaTemplateProps {
  store: StoreConfig;
  initialProductId?: string;
}

export default function EstilosMirkaTemplate({ store, initialProductId }: EstilosMirkaTemplateProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [selectedSize, setSelectedSize] = useState('M');
  const [detailQty, setDetailQty] = useState(1);
  // Foto que se ve arriba en el detalle, cuando el producto tiene más de una.
  const [fotoActiva, setFotoActiva] = useState(0);

  // Cart State
  const [cart, setCart] = useState<{ product: any; quantity: number; size?: string; unitPrice?: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Dynamic Products from Supabase
  const [supabaseProducts, setSupabaseProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchSupabaseProducts = async () => {
      try {
        const data = await fetchProductosDeTienda(store.slug);
        const error = null;
        
        if (data && !error && data.length > 0) {
          const formatted = data.map((p) => ({
            id: p.id,
            title: p.name,
            price: p.price,
            originalPrice: p.price_anterior > 0 ? Number(p.price_anterior) : p.price,
            hasOffer: p.price_anterior > 0,
            category: p.category ? p.category.toLowerCase() : 'vestidos',
            image: p.image || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
            images: Array.isArray(p.images) && p.images.length > 1 ? p.images : undefined,
            description: p.description || 'Prenda exclusiva de Estilos Mirka.',
            presentaciones: leerPresentaciones(p.presentaciones),
          }));
          setSupabaseProducts(formatted);
        }
      } catch (err) {
        console.error('Error fetching Supabase products:', err);
      }
    };

    fetchSupabaseProducts();
  }, []);

  const theme = store.theme;
  const allProducts = supabaseProducts;

  // Detalle de producto con URL propia (/<tienda>/producto/<id>): compartible y
  // es lo que Google indexa, en vez de un modal que solo vivía en un useState.
  const { seleccionado: selectedProduct, abrir: abrirProducto, cerrar: cerrarProducto } = useDetalleProducto(store.slug, allProducts, initialProductId);

  // Al abrir otro producto se vuelve a la primera foto de su galería y se preselecciona la primera talla si tiene.
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
    ? (selectedProduct.images && selectedProduct.images.length > 1 ? selectedProduct.images : [selectedProduct.image])
    : [];

  // Categorias de la ficha real de la tienda (panel admin), no una lista fija
  // de rubro de ropa: antes "Faldas"/"Blazers" salian aunque la tienda hubiera
  // cargado categorias distintas, y las suyas no aparecian como filtro. Si la
  // tienda no configuro categorias, se deducen del catalogo (igual que hace
  // useCatalogo para el resto de plantillas) en vez de dejar un unico "Todo".
  const categoriasTienda = (store.categories || []).length
    ? (store.categories || []).map((c) => ({ id: c.href, label: c.name }))
    : [...new Set(allProducts.map((p) => p.category))]
        .filter(Boolean)
        .map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

  // Habia un filtro por searchTerm, pero nunca se construyo el input que lo
  // alimentara: el termino era siempre '' y la condicion siempre true.
  const filteredProducts = allProducts.filter(
    (prod) => activeCategory === 'all' || prod.category === activeCategory
  );

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
    const cliente = await pedirDatosCliente({ color: store.theme.primary, pedirEntrega: true, entregaDisponible: store.entrega });
    if (!cliente) return;
    const header = `*Pedido de ${store.name}*\n-------------------------\n`;
    const itemsText = cart.map(item => {
      const itemPrice = (item.unitPrice ?? item.product.price) * item.quantity;
      const tallaTexto = item.size ? ` (Talla: ${item.size})` : '';
      return `- ${item.product.title}${tallaTexto} (x${item.quantity}): S/ ${itemPrice.toFixed(2)}`;
    }).join('\n');
    const entregaTexto = cliente.entrega === 'recojo' ? 'Recojo en tienda' : cliente.entrega === 'delivery' ? `Delivery a: ${cliente.direccion}` : '';
    const footer = `\n-------------------------\n*Total:* S/ ${cartTotal.toFixed(2)}\n*Cliente:* ${cliente.nombre} (${cliente.telefono})${entregaTexto ? `\n*Entrega:* ${entregaTexto}` : ''}`;
    enviarPedidoPorWhatsApp(store, header + itemsText + footer, {
      items: cart.map((item) => ({ id: String(item.product.id), quantity: item.quantity })),
      cliente,
    });
  };

  return (
    <div style={{ background: theme.background, minHeight: '100vh', fontFamily: theme.fontBody, color: theme.onBackground, paddingBottom: '90px' }}>
      {/* External CSS imports */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── HEADER ─────────────────────────────────── */}
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
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}>
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
              <span className="material-symbols-outlined text-xl" style={{ color: theme.onSurface || '#1a0a0d' }}>favorite_border</span>
            </button>
            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-1.5 cursor-pointer hover:opacity-60 transition-opacity"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.onSurface || '#1a0a0d' }}>shopping_bag</span>
              {cartItemsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: theme.primary }}>
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ──────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ height: '52vw', maxHeight: '380px', minHeight: '220px' }}>
        {/* ── FLOATING SHARE / INSTALL — solo sobre el banner, se va con el scroll ── */}
        <StoreFloatingActions store={store} />
        <div className="absolute inset-0 z-0">
          <img 
            src={store.heroImage} 
            alt={store.heroAlt} 
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(61,13,24,0.88) 0%, rgba(61,13,24,0.55) 55%, rgba(61,13,24,0.10) 100%)' }} />
        </div>

        <div className="max-w-6xl mx-auto px-5 relative z-10 h-full flex flex-col justify-center">
          <div className="text-white space-y-3 max-w-[260px] sm:max-w-md md:max-w-xl lg:max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-white/70">Colección Exclusiva</p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight" style={{ fontFamily: theme.fontHeadline }}>
              {store.name}
            </h1>
            <p className="text-sm text-white/75 font-light leading-relaxed">
              {store.tagline}
            </p>
            {(store.rating != null || store.zona) && (
              <div className="flex items-center gap-3 text-white/85">
                {store.rating != null && (
                  <div className="flex items-center gap-1">
                    {[...Array(estrellasDe(store.rating).llenas)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1", color: '#f59e0b' }}>star</span>
                    ))}
                    <span className="text-xs font-semibold">{store.rating.toFixed(1)}</span>
                  </div>
                )}
                {store.zona && (
                  <span className="text-xs font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span>{store.zona}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              <button 
                onClick={() => {
                  const element = document.getElementById('catalog');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                style={{ background: theme.primary }}
              >
                Ver Colección
              </button>
            </div>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {[0,1,2,3].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? 'white' : 'rgba(255,255,255,0.35)' }} />
          ))}
        </div>
      </section>

      {/* ── MAIN CATALOG ────────────────────────────── */}
      <section id="catalog" className="max-w-6xl mx-auto px-4 py-8">
        {/* Search + title */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ fontFamily: theme.fontHeadline, color: theme.onBackground || '#1a0a0d' }}>
            Nuestra Colección
          </h2>
        </div>

        {/* Category Ribbon — categorias reales de la tienda */}
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
            <span className="material-symbols-outlined text-4xl mb-3 block" style={{ color: `${theme.onSurfaceVariant}80` }}>styler</span>
            <p className="font-semibold text-sm" style={{ color: theme.onSurface }}>Todavía no hay prendas en esta categoría</p>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => { abrirProducto(prod); setDetailQty(1); setSelectedSize('M'); }}
                    className="bg-white border border-black/5 overflow-hidden flex flex-col group relative cursor-pointer"
                    style={{ borderRadius: '4px' }}
                  >
                    {/* Badge Offer */}
                    {prod.hasOffer && (
                      <span className="absolute top-2 left-2 text-white text-[9px] font-black px-2 py-0.5 z-10 shadow uppercase tracking-wide" style={{ background: theme.primary, borderRadius: '2px' }}>
                        OFERTA
                      </span>
                    )}

                    {/* Portrait image — 3:4 ratio like fashion stores */}
                    <div className="overflow-hidden relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                      <img src={prod.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={prod.title} />
                      {/* Agregar rápido: sin entrar a la ficha, como en el resto de plantillas. */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); addToCart(prod); }}
                        aria-label={`Agregar ${prod.title} al carrito`}
                        className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center shadow-lg hover:opacity-90 active:scale-90 transition-all"
                        style={{ background: theme.primary, borderRadius: '2px' }}
                      >
                        <span className="material-symbols-outlined text-white text-lg">add</span>
                      </button>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="font-medium text-xs text-gray-900 leading-snug line-clamp-2 mb-2" style={{ fontFamily: theme.fontBody }}>
                        {prod.title}
                      </h4>
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                          {prod.hasOffer && prod.originalPrice && prod.originalPrice !== prod.price && (
                            <span className="text-[10px] text-gray-400 line-through">
                              S/ {prod.originalPrice.toFixed(2)}
                            </span>
                          )}
                          <span className="font-bold text-sm" style={{ color: theme.primary }}>
                            S/ {prod.price.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 border" style={{ color: theme.primary, borderColor: theme.primary, borderRadius: '2px' }}>
                          Ver
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
        </div>
      </section>

      {/* ── PRODUCT DETAIL SHEET ───────────────────────── */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-50 flex flex-col w-full h-full bg-white overflow-hidden animate-fade-in"
          style={{ background: theme.background }}
        >
          {/* Header/Top Bar */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-black/5 shrink-0 bg-white" style={{ background: theme.surface }}>
            <button
              onClick={() => cerrarProducto()}
              className="w-10 h-10 flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.primary }}>arrow_back</span>
            </button>
            <span className="font-bold text-xs uppercase tracking-widest" style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}>
              Detalle del Producto
            </span>
            <button
              onClick={() => { cerrarProducto(); setIsCartOpen(true); }}
              className="w-10 h-10 flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity relative"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.primary }}>shopping_bag</span>
              {cartItemsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: theme.primary }}>
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pb-28">
            {/* Image gallery (3:4 ratio for clothes) */}
            <div className="w-full relative bg-gray-100 aspect-[3/4] max-w-md mx-auto">
              <img
                src={fotosDetalle[fotoActiva] ?? selectedProduct.image}
                alt={selectedProduct.title}
                className="w-full h-full object-cover object-top"
              />
              {selectedProduct.hasOffer && (
                <span className="absolute top-4 left-4 text-white text-[10px] font-black px-3 py-1 shadow uppercase tracking-wide" style={{ background: theme.primary, borderRadius: '2px' }}>OFERTA</span>
              )}
              {/* Miniaturas: solo si hay más de una foto */}
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
                      style={{ borderColor: fotoActiva === i ? '#fff' : 'transparent', opacity: fotoActiva === i ? 1 : 0.7 }}
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
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.primary }}>
                  {selectedProduct.category}
                </span>
                <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}>
                  {selectedProduct.title}
                </h1>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black" style={{ color: theme.primary }}>S/ {selectedProduct.price.toFixed(2)}</span>
                  {selectedProduct.hasOffer && selectedProduct.originalPrice && selectedProduct.originalPrice !== selectedProduct.price && (
                    <span className="text-xs text-gray-400 line-through">S/ {selectedProduct.originalPrice.toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div className="border-t border-black/5 pt-4 mb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {/* Size selector: tallas reales configuradas del producto */}
              {(() => {
                const tallas = (selectedProduct.presentaciones && selectedProduct.presentaciones.length > 0)
                  ? selectedProduct.presentaciones
                  : [];
                if (tallas.length === 0) return null;
                return (
                  <div className="border-t border-black/5 pt-4 mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.onSurface || '#1a0a0d' }}>Talla</p>
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
                              <span className="text-[10px] opacity-80">S/ {item.price.toFixed(2)}</span>
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
          <div className="border-t border-black/5 px-5 py-4 flex gap-3 items-center bg-white shrink-0 mt-auto" style={{ background: theme.surface }}>
            {/* Qty */}
            <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1.5 shrink-0">
              <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined text-base" style={{ color: theme.onSurface || '#1a0a0d' }}>remove</span>
              </button>
              <span className="font-black text-sm w-4 text-center" style={{ color: theme.onSurface || '#1a0a0d' }}>{detailQty}</span>
              <button onClick={() => setDetailQty(detailQty + 1)} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined text-base" style={{ color: theme.onSurface || '#1a0a0d' }}>add</span>
              </button>
            </div>

            {/* Add to cart */}
            {(() => {
              const presSeleccionada = selectedProduct.presentaciones?.find((p: any) => p.label === selectedSize) || selectedProduct.presentaciones?.[0];
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

      {/* ── SHOPPING CART DRAWER ─────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div 
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Drawer Content */}
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
                    <div key={itemKey} className="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-black/5 relative">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border">
                        <img src={item.product.image} className="w-full h-full object-cover" alt={item.product.title} />
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h4 className="font-bold text-xs text-gray-900 truncate leading-snug">
                            {item.product.title}
                          </h4>
                          {item.size && (
                            <span className="text-[10px] font-semibold text-gray-500 block mt-0.5">Talla: {item.size}</span>
                          )}
                          <span className="font-black text-xs block mt-1" style={{ color: theme.primary }}>
                            S/ {itemPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity adjust */}
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

                          {/* Remove */}
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
                  <span className="text-lg" style={{ color: theme.primary }}>S/ {cartTotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={sendCartToWhatsApp}
                    className="w-full py-3 rounded-full text-xs font-black uppercase text-white shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-95 transition-all cursor-pointer bg-[#25D366]"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    Enviar Pedido vía WhatsApp
                  </button>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-3 rounded-full text-xs font-black uppercase bg-gray-900 hover:bg-black text-white text-center block transition-all cursor-pointer"
                  >
                    Seguir Comprando
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* ── CONTACTO ─────────────────────────────────── */}
      {(store.direccion || store.horario || telefonoVisible) && (
        <section id="contacto" className="max-w-6xl mx-auto px-4 py-10 border-t border-black/5 grid md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3 className="text-lg font-bold" style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}>
              Visítanos o Escríbenos
            </h3>
            <div className="space-y-3">
              {store.direccion && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg" style={{ color: theme.primary }}>location_on</span>
                  <span className="text-sm" style={{ color: theme.onSurfaceVariant }}>{store.direccion}</span>
                </div>
              )}
              {telefonoVisible && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg" style={{ color: theme.primary }}>call</span>
                  <span className="text-sm" style={{ color: theme.onSurfaceVariant }}>{telefonoVisible}</span>
                </div>
              )}
              {store.horario && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg" style={{ color: theme.primary }}>schedule</span>
                  <span className="text-sm" style={{ color: theme.onSurfaceVariant }}>{store.horario}</span>
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarPedidoPorWhatsApp(store, `Hola ${store.name}, soy ${contactoNombre} (${contactoTelefono}).\n\n${contactoMensaje}`);
            }}
            className="space-y-3 p-5 border border-black/5 rounded-lg"
            style={{ background: theme.surfaceContainer }}
          >
            <input
              type="text" required placeholder="Nombre completo"
              value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)}
              className="w-full border border-black/10 rounded-md px-3 py-2 text-sm bg-white outline-none focus:border-[currentColor]"
              style={{ color: theme.primary }}
            />
            <input
              type="tel" required placeholder="Tu teléfono"
              value={contactoTelefono} onChange={(e) => setContactoTelefono(e.target.value)}
              className="w-full border border-black/10 rounded-md px-3 py-2 text-sm bg-white outline-none"
            />
            <textarea
              required rows={3} placeholder="Mensaje o consulta"
              value={contactoMensaje} onChange={(e) => setContactoMensaje(e.target.value)}
              className="w-full border border-black/10 rounded-md px-3 py-2 text-sm bg-white outline-none"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-full text-xs font-bold uppercase text-white shadow-md active:scale-95 transition-all cursor-pointer"
              style={{ background: theme.primary }}
            >
              Enviar por WhatsApp
            </button>
            {!whatsappVisible && (
              <p className="text-[11px] text-center" style={{ color: theme.onSurfaceVariant }}>
                Esta tienda todavía no configuró su WhatsApp de pedidos.
              </p>
            )}
          </form>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="bg-gray-900 text-white/50 text-xs py-10 border-t border-white/5 mt-8">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: theme.fontHeadline, color: 'white' }}>
              {store.name}
            </span>
            <p className="text-[11px] leading-relaxed">
              {store.tagline || 'Tu boutique de moda de confianza.'}
            </p>
          </div>

          {store.horario && (
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Horario de Atención</h4>
              <p className="text-[11px]">{store.horario}</p>
            </div>
          )}

          {(store.direccion || telefonoVisible) && (
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Ubicación & Contacto</h4>
              <ul className="space-y-1 text-[11px]">
                {store.direccion && <li>📍 {store.direccion}</li>}
                {telefonoVisible && <li>📞 {telefonoVisible}</li>}
              </ul>
            </div>
          )}
        </div>
        <div className="max-w-6xl mx-auto px-4 border-t border-white/5 mt-8 pt-6 text-center text-[10px]">
          © {new Date().getFullYear()} {store.name}. Todos los derechos reservados. {!conMarcaBlanca(store.modulos) && 'Powered by Boga Market.'}
        </div>
      </footer>
    </div>
  );
}
