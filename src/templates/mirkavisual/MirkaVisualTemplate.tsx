'use client';

import React, { useState, useEffect } from 'react';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';
import { StoreConfig } from '@/lib/stores.config';
import { getDemoProducts } from '@/lib/templates.config';
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
  product: ProductItem;
  quantity: number;
  size?: string;
  unitPrice?: number;
}

export default function MirkaVisualTemplate({ store, initialProductId }: MirkaVisualTemplateProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState('M');
  const [detailQty, setDetailQty] = useState(1);
  const [fotoActiva, setFotoActiva] = useState(0);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Dynamic Products from Supabase
  const [supabaseProducts, setSupabaseProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSupabaseProducts = async () => {
      try {
        const data = await fetchProductosDeTienda(store.slug);
        if (isMounted && data && data.length > 0) {
          const formatted: ProductItem[] = data.map((p) => ({
            id: String(p.id),
            title: p.name,
            price: Number(p.price) || 0,
            originalPrice: p.price_anterior > 0 ? Number(p.price_anterior) : Number(p.price) || 0,
            hasOffer: p.price_anterior > 0,
            category: p.category ? p.category.toLowerCase() : 'vestidos',
            image: p.image || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
            images: Array.isArray(p.images) && p.images.length > 1 ? p.images : undefined,
            description: p.description || 'Prenda exclusiva confeccionada con estilo sofisticado.',
            presentaciones: leerPresentaciones(p.presentaciones),
          }));
          setSupabaseProducts(formatted);
        }
      } catch (err) {
        console.error('Error fetching Supabase products:', err);
      }
    };

    fetchSupabaseProducts();
    return () => {
      isMounted = false;
    };
  }, [store.slug]);

  const theme = store.theme;

  // Fallback a productos demo si la tienda no tiene productos propios aún
  const allProducts: ProductItem[] = React.useMemo(() => {
    if (supabaseProducts.length > 0) return supabaseProducts;
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
        description: p.description || 'Prenda de alta calidad con acabados finos.',
        presentaciones: p.presentaciones || [
          { label: 'S', price: p.price },
          { label: 'M', price: p.price },
          { label: 'L', price: p.price },
        ],
      }));
    }
    return [];
  }, [supabaseProducts, (store as any).demoProducts, store.template]);

  // Detalle de producto con URL compartible /<tienda>/producto/<id>
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

  // Categorías de la tienda
  const categoriasTienda = React.useMemo(() => {
    if ((store.categories || []).length > 0) {
      return (store.categories || []).map((c) => ({ id: c.href.toLowerCase(), label: c.name }));
    }
    const unicas = [...new Set(allProducts.map((p: any) => p.category))].filter(Boolean);
    return unicas.map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
  }, [store.categories, allProducts]);

  const filteredProducts = allProducts.filter(
    (prod) => activeCategory === 'all' || prod.category === activeCategory
  );

  const whatsappVisible = tieneWhatsApp(store);
  const telefonoVisible = whatsappVisible ? `+${(store.whatsapp || '').replace(/\D/g, '')}` : null;

  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoMensaje, setContactoMensaje] = useState('');

  // Cart Handlers
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

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-black/8 transition-all duration-300 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo & Store Name */}
          <div className="flex items-center gap-3">
            {store.iconImage ? (
              <img
                src={store.iconImage}
                alt={store.name}
                className="w-9 h-9 rounded-full object-cover border border-black/10 shadow-2xs"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-2xs"
                style={{ backgroundColor: theme.primary }}
              >
                {store.name.charAt(0)}
              </div>
            )}
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}
            >
              {store.name}
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Wishlist Icon */}
            <button className="p-1.5 cursor-pointer hover:opacity-60 transition-opacity hidden md:block">
              <span className="material-symbols-outlined text-xl" style={{ color: theme.onSurface || '#1a0a0d' }}>
                favorite_border
              </span>
            </button>
            {/* Cart Icon */}
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

      {/* ── PORTADA 100% VISUAL (SIN LETRAS ENCIMA) ───────────────── */}
      {/* 
        Permite al negocio subir banners diseñados en Canva / Photoshop con sus logos 
        y promociones integradas sin que ningún texto superpuesto interfiera.
      */}
      <section className="w-full bg-black/5 border-b border-black/5">
        <div className="max-w-6xl mx-auto">
          <div className="w-full overflow-hidden shadow-xs">
            <img
              src={store.heroImage || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80'}
              alt={store.heroAlt || store.name}
              className="w-full h-auto max-h-[480px] object-cover object-center block"
            />
          </div>
        </div>
      </section>

      {/* ── BARRA DE DATOS DE LA BOUTIQUE (DEBAJO DE LA PORTADA) ──── */}
      {(store.rating != null || store.zona || store.horario || store.tagline) && (
        <section className="bg-white border-b border-black/5 py-3.5 px-4 shadow-2xs">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              {store.tagline && (
                <span className="font-medium text-gray-700 italic">
                  &ldquo;{store.tagline}&rdquo;
                </span>
              )}
              {store.zona && (
                <span className="flex items-center gap-1 font-semibold text-gray-600">
                  <span className="material-symbols-outlined text-sm" style={{ color: theme.primary }}>location_on</span>
                  {store.zona}
                </span>
              )}
              {store.rating != null && (
                <div className="flex items-center gap-1">
                  {[...Array(estrellasDe(store.rating).llenas)].map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1", color: '#f59e0b' }}
                    >
                      star
                    </span>
                  ))}
                  <span className="font-bold text-gray-800">{store.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {store.horario && (
              <div className="flex items-center gap-1 text-gray-500 font-medium">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>{store.horario}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── MAIN CATALOG ────────────────────────────── */}
      <section id="catalog" className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: theme.fontHeadline, color: theme.onBackground || '#1a0a0d' }}
          >
            Nuestra Colección
          </h2>
        </div>

        {/* Categories Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className="px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0"
            style={{
              background: activeCategory === 'all' ? theme.primary : '#ffffff',
              color: activeCategory === 'all' ? '#ffffff' : '#6b7280',
              border: activeCategory === 'all' ? 'none' : '1px solid #e5e7eb',
            }}
          >
            Todo
          </button>
          {categoriasTienda.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0"
              style={{
                background: activeCategory === cat.id ? theme.primary : '#ffffff',
                color: activeCategory === cat.id ? '#ffffff' : '#6b7280',
                border: activeCategory === cat.id ? 'none' : '1px solid #e5e7eb',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => {
            const hasSizes = Boolean(product.presentaciones && product.presentaciones.length > 0);
            return (
              <div
                key={product.id}
                onClick={() => abrirProducto(product)}
                className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer border border-black/5"
              >
                {/* Image */}
                <div className="relative aspect-4/5 overflow-hidden bg-gray-100">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.hasOffer && (
                    <span
                      className="absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white tracking-widest shadow-xs"
                      style={{ background: theme.primary }}
                    >
                      Oferta
                    </span>
                  )}
                  {/* Floating Add or Size Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasSizes) {
                        abrirProducto(product);
                      } else {
                        addToCart(product);
                      }
                    }}
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform cursor-pointer"
                    style={{ background: theme.primary }}
                    title={hasSizes ? 'Elegir talla' : 'Agregar a bolsa'}
                  >
                    <span className="material-symbols-outlined text-base">
                      {hasSizes ? 'straighten' : 'add'}
                    </span>
                  </button>
                </div>

                {/* Details */}
                <div className="p-3.5 flex flex-col justify-between flex-1">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
                      {product.category}
                    </p>
                    <h3
                      className="font-bold text-xs line-clamp-1 group-hover:opacity-75 transition-opacity"
                      style={{ color: '#1a0a0d' }}
                    >
                      {product.title}
                    </h3>
                  </div>

                  <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-black/5">
                    <div>
                      {product.hasOffer && (
                        <span className="text-[10px] text-gray-400 line-through mr-1">
                          S/ {Number(product.originalPrice).toFixed(2)}
                        </span>
                      )}
                      <span className="font-extrabold text-sm" style={{ color: theme.primary }}>
                        S/ {Number(product.price).toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirProducto(product);
                      }}
                      className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border border-black/10 hover:bg-black/5 transition-colors cursor-pointer"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── MODAL DETALLE DE PRODUCTO ───────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl relative"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-black/5">
              <button
                onClick={cerrarProducto}
                className="p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
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
                onClick={cerrarProducto}
                className="p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl text-gray-400">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5">
              {/* Fotos: principal + miniaturas si hay mas de una */}
              <div className="aspect-4/5 rounded-2xl overflow-hidden bg-gray-100 mb-2 relative">
                <img
                  src={fotosDetalle[fotoActiva] || selectedProduct.image}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover"
                />
                {selectedProduct.hasOffer && (
                  <span
                    className="absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-white tracking-widest shadow-md"
                    style={{ background: theme.primary }}
                  >
                    Oferta
                  </span>
                )}
              </div>

              {fotosDetalle.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                  {fotosDetalle.map((f: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFotoActiva(i)}
                      className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer"
                      style={{
                        borderColor: fotoActiva === i ? theme.primary : 'transparent',
                        opacity: fotoActiva === i ? 1 : 0.6,
                      }}
                    >
                      <img src={f} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Product Info */}
              <div className="space-y-2 mt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.primary }}>
                  {selectedProduct.category}
                </span>
                <h1
                  className="text-xl font-bold leading-tight"
                  style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}
                >
                  {selectedProduct.title}
                </h1>
                <div className="flex items-baseline gap-2 mt-1">
                  {selectedProduct.hasOffer && (
                    <span className="text-xs text-gray-400 line-through">
                      S/ {Number(selectedProduct.originalPrice).toFixed(2)}
                    </span>
                  )}
                  <span className="text-2xl font-black" style={{ color: theme.primary }}>
                    S/ {Number(selectedProduct.price).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed pt-2">
                  {selectedProduct.description}
                </p>
              </div>

              {/* Tallas disponibles */}
              {(() => {
                const tallas = (selectedProduct.presentaciones || []).filter(
                  (p: any) => typeof p.label === 'string' && p.label.trim().length > 0
                );
                if (tallas.length === 0) return null;
                return (
                  <div className="border-t border-black/5 pt-4 mb-5">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.onSurface || '#1a0a0d' }}>
                      Talla
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {tallas.map((item: any) => {
                        const sz = item.label;
                        const isSelected = selectedSize === sz;
                        return (
                          <button
                            key={sz}
                            onClick={() => setSelectedSize(sz)}
                            className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            style={{
                              background: isSelected ? theme.primary : '#f3f4f6',
                              color: isSelected ? '#ffffff' : '#374151',
                              boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                            }}
                          >
                            {sz}
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
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-black/5 bg-gray-50/50 flex items-center gap-3">
              {/* Qty */}
              <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1.5 shrink-0">
                <button
                  onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                  className="w-7 h-7 rounded-full bg-white shadow-2xs flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
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
                  className="w-7 h-7 rounded-full bg-white shadow-2xs flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <span className="material-symbols-outlined text-base" style={{ color: theme.onSurface || '#1a0a0d' }}>
                    add
                  </span>
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={() => {
                  const matchedPres = (selectedProduct.presentaciones || []).find(
                    (p: any) => p.label === selectedSize
                  );
                  const unitPrice = matchedPres ? matchedPres.price : selectedProduct.price;
                  addToCart(selectedProduct, selectedSize, unitPrice, detailQty);
                  cerrarProducto();
                }}
                className="flex-1 py-3 px-4 rounded-full text-xs font-bold text-white shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: theme.primary }}
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                <span>Añadir a la bolsa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHOPPING CART DRAWER ─────────────────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-2xs animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Cart Header */}
            <div className="p-4 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl" style={{ color: theme.primary }}>
                  shopping_bag
                </span>
                <span className="font-bold text-sm uppercase tracking-wider">Tu Bolsa</span>
                <span className="text-xs text-gray-400 font-semibold">({cartItemsCount})</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl text-gray-400">close</span>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
                  <span className="material-symbols-outlined text-5xl">shopping_basket</span>
                  <p className="text-sm font-semibold">Tu bolsa de compras está vacía</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-2 px-5 py-2 rounded-full text-xs font-bold border border-black/10 text-gray-700 cursor-pointer hover:bg-black/5"
                  >
                    Seguir viendo
                  </button>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${item.size || ''}-${idx}`}
                    className="flex gap-3 p-2.5 rounded-2xl border border-black/5 items-center"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="w-14 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs truncate">{item.product.title}</h4>
                      {item.size && (
                        <p className="text-[10px] text-gray-400 font-semibold">Talla: {item.size}</p>
                      )}
                      <p className="font-extrabold text-xs mt-1" style={{ color: theme.primary }}>
                        S/ {((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    {/* Controls */}
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1, item.size)}
                        className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold w-3 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1, item.size)}
                        className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.product.id, item.size)}
                      className="p-1 hover:text-red-500 transition-colors text-gray-400 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-black/5 bg-gray-50/50 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Subtotal
                  </span>
                  <span className="text-xl font-black" style={{ color: theme.primary }}>
                    S/ {cartTotal.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={sendCartToWhatsApp}
                  className="w-full py-3.5 rounded-full text-xs font-bold text-white shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ background: '#25D366' }}
                >
                  <span className="material-symbols-outlined text-base">chat</span>
                  <span>Pedir por WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTACT & STORE INFO ──────────────────────────────────── */}
      {(store.direccion || store.horario || telefonoVisible) && (
        <section id="contacto" className="max-w-6xl mx-auto px-4 py-10 border-t border-black/5 grid md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3
              className="text-lg font-bold"
              style={{ fontFamily: theme.fontHeadline, color: theme.onSurface || '#1a0a0d' }}
            >
              Visítanos o Escríbenos
            </h3>
            <div className="space-y-3">
              {store.direccion && (
                <div className="flex items-start gap-3 text-xs text-gray-600">
                  <span className="material-symbols-outlined text-base text-gray-400">location_on</span>
                  <span>{store.direccion}</span>
                </div>
              )}
              {store.horario && (
                <div className="flex items-start gap-3 text-xs text-gray-600">
                  <span className="material-symbols-outlined text-base text-gray-400">schedule</span>
                  <span>{store.horario}</span>
                </div>
              )}
              {telefonoVisible && (
                <div className="flex items-start gap-3 text-xs text-gray-600">
                  <span className="material-symbols-outlined text-base text-gray-400">call</span>
                  <span>{telefonoVisible}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-2xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
              ¿Tienes alguna duda sobre tu talla o pedido?
            </h4>
            <input
              type="text"
              placeholder="Tu Nombre"
              value={contactoNombre}
              onChange={(e) => setContactoNombre(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-black"
            />
            <input
              type="tel"
              placeholder="Tu Teléfono"
              value={contactoTelefono}
              onChange={(e) => setContactoTelefono(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-black"
            />
            <textarea
              placeholder="Mensaje o consulta sobre prendas..."
              rows={2}
              value={contactoMensaje}
              onChange={(e) => setContactoMensaje(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-black resize-none"
            />
            <button
              onClick={() => {
                if (!contactoNombre.trim() || !contactoMensaje.trim()) return;
                const texto = `Hola ${store.name}, soy ${contactoNombre}${
                  contactoTelefono ? ` (${contactoTelefono})` : ''
                }. ${contactoMensaje}`;
                enviarPedidoPorWhatsApp(store, texto);
              }}
              className="w-full py-2.5 rounded-full text-xs font-bold text-white shadow-xs cursor-pointer hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              style={{ background: theme.primary }}
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>Enviar consulta directa</span>
            </button>
          </div>
        </section>
      )}

      {/* Floating Actions */}
      <StoreFloatingActions store={store} />
    </div>
  );
}
