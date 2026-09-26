'use client';

import { useState, useEffect, useMemo } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { fetchProductosDeTienda } from '@/lib/catalogo';
import { demoSlug } from '@/lib/demoPlantilla';
import { getDemoProducts } from '@/lib/templates.config';
import { debeMostrarDemo } from '@/lib/demo';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import { soles, iconForCategory, type Producto, type Categoria } from './tokens';
import { avisarAgregado } from './AddFeedback';

/**
 * El motor de las plantillas de comida: catalogo, categorias y carrito.
 *
 * Vive en un hook y no copiado en cada plantilla porque ya pasamos por eso:
 * la logica de instalar PWA estaba duplicada en tres plantillas y se
 * desincronizo. Aca, un arreglo del carrito o del mensaje de WhatsApp llega a
 * todas las plantillas que lo usan.
 */
export function useCatalogo(store: StoreConfig) {
  const demoPermitido = store.showDemoProducts !== false;

  const [products, setProducts] = useState<Producto[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  // id del producto -> cantidad. Antes era un contador suelto y el resumen del
  // pedido mostraba siempre el mismo plato sin importar que agregaras.
  const [cart, setCart] = useState<Record<string, number>>({});

  // Clave estable de las categorias: store.categories es un array nuevo en cada
  // render del padre y como dependencia reejecutaba la carga sin parar.
  const catsKey = JSON.stringify(store.categories ?? []);
  const categorias = useMemo(
    () => JSON.parse(catsKey) as { name: string; icon: string; href: string }[],
    [catsKey]
  );

  // ── Carga de productos ──
  // Los demo salen de templates.config (getDemoProducts) y no de una lista
  // propia por plantilla: esas listas se desincronizaban del config y dejaban
  // categorias enteras vacias.
  useEffect(() => {
    const hrefDeCategoria = (nombre: string) =>
      categorias.find((c) => c.name === nombre)?.href ?? (nombre || '').toLowerCase();

    const cargar = async () => {
      const data = await fetchProductosDeTienda(store.demoDePlantilla ? demoSlug(store.slug) : store.slug);

      const deLaBase: Producto[] = data
        ? data.map((p) => ({
            id: String(p.id),
            name: p.name,
            desc: p.description || '',
            price: Number(p.price) || 0,
            priceAnterior: Number(p.price_anterior) > 0 ? Number(p.price_anterior) : undefined,
            category: hrefDeCategoria(p.category),
            image: p.image || store.heroImage,
            extra: p.subcategory ? { area: String(p.subcategory) } : undefined,
          }))
        : [];

      // Los demo solo entran si la tienda esta vacia: si ya cargo lo suyo, el
      // cliente final no puede terminar pidiendo un plato que no existe.
      const demo: Producto[] = debeMostrarDemo({ showDemoProducts: demoPermitido }, deLaBase.length)
        ? getDemoProducts(store.template).map((p, i) => ({
            id: `demo-${i}`,
            name: p.name,
            desc: p.description || '',
            price: p.price,
            category: hrefDeCategoria(p.category),
            image: p.image,
            extra: p.subcategory ? { area: String(p.subcategory) } : undefined,
          }))
        : [];

      setProducts([...deLaBase, ...demo]);
    };

    cargar();
  }, [store.slug, store.template, store.heroImage, demoPermitido, categorias]);

  // ── Carrito derivado ──
  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ producto: products.find((p) => p.id === id), qty }))
        .filter((l): l is { producto: Producto; qty: number } => Boolean(l.producto)),
    [cart, products]
  );
  const cartCount = cartItems.reduce((n, l) => n + l.qty, 0);
  const subtotal = cartItems.reduce((n, l) => n + l.producto.price * l.qty, 0);

  const addToCart = (p: Producto) => {
    setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
    avisarAgregado(p.name);
  };
  const removeFromCart = (id: string) =>
    setCart((c) => {
      const qty = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  const vaciarCarrito = () => setCart({});

  // Cobro online (tarjeta / Yape por Izipay): solo si la tienda lo tiene activo (módulo + claves), y no con productos de muestra.
  const [cobraOnline, setCobraOnline] = useState(false);
  useEffect(() => {
    if (store.demoDePlantilla) return;
    let vivo = true;
    fetch(`/api/pagos/estado?store=${encodeURIComponent(store.slug)}`)
      .then((r) => r.json())
      .then((d) => { if (vivo) setCobraOnline(d?.activo === true); })
      .catch(() => { /* sin cobro online: queda el pedido por WhatsApp */ });
    return () => { vivo = false; };
  }, [store.slug, store.demoDePlantilla]);

  const pagarOnline = async (datos: { nombre: string; telefono: string; entrega: 'delivery' | 'recojo'; direccion: string }) => {
    if (cartItems.some((l) => l.producto.id.startsWith('demo-'))) {
      alert('Esos productos son de muestra: no se pueden pagar.');
      return;
    }
    try {
      const r = await fetch('/api/pagos/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: store.slug,
          items: cartItems.map((l) => ({ id: l.producto.id, quantity: l.qty })),
          cliente: { nombre: datos.nombre, telefono: datos.telefono, entrega: datos.entrega, direccion: datos.direccion },
        }),
      });
      const d = await r.json().catch(() => ({} as { ok?: boolean; codigo?: string; motivo?: string; producto?: string }));
      if (d.ok && d.codigo) { window.location.href = `/pagar/${d.codigo}`; return; }
      alert(
        d.motivo === 'agotado' ? `«${d.producto}» está agotado. Quítalo del carrito para continuar.`
        : d.motivo === 'stock' ? `No hay stock suficiente de «${d.producto}».`
        : d.motivo === 'limite' ? 'Demasiados intentos seguidos. Espera unos minutos.'
        : 'No se pudo abrir el pago. Intenta de nuevo o confirma tu pedido por WhatsApp.'
      );
    } catch {
      alert('No se pudo abrir el pago. Revisa tu conexión e intenta de nuevo.');
    }
  };

  const confirmarPedido = (datos: { nombre: string; telefono: string; entrega: 'delivery' | 'recojo'; direccion: string }) => {
    const lineas = cartItems
      .map((l) => `• ${l.qty}x ${l.producto.name} — ${soles(l.producto.price * l.qty)}`)
      .join('\n');
    const entregaTexto = datos.entrega === 'delivery'
      ? `Delivery a: ${datos.direccion}`
      : 'Recojo en tienda';
    enviarPedidoPorWhatsApp(
      store,
      `¡Hola ${store.name}! Soy ${datos.nombre} (${datos.telefono}). Quiero hacer este pedido:\n\n${lineas}\n\nTotal: ${soles(subtotal)}\n\n${entregaTexto}`,
      {
        items: cartItems.map((l) => ({ id: l.producto.id, quantity: l.qty })),
        cliente: { nombre: datos.nombre, telefono: datos.telefono, entrega: datos.entrega, direccion: datos.direccion },
      },
    );
  };

  // ── Categorias ──
  // Salen de las categorias reales de la tienda; si no cargo ninguna, se
  // deducen del catalogo para no dejar el menu con un unico chip "Todos".
  const categoriasEfectivas: Categoria[] = categorias.length
    ? categorias.map((c) => ({
        id: c.href,
        label: c.name,
        // 'category' es el icono generico que se guardaba antes por defecto
        // para toda categoria nueva; se recalcula para no dejarlo pegado.
        icon: c.icon && c.icon !== 'category' ? c.icon : iconForCategory(c.name),
      }))
    : [...new Set(products.map((p) => p.category))]
        .filter(Boolean)
        .map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1), icon: iconForCategory(c) }));

  const categoryTabs: Categoria[] = [{ id: 'all', label: 'Todos', icon: 'apps' }, ...categoriasEfectivas];

  const filtered = activeCategory === 'all'
    ? products
    : products.filter((p) => p.category === activeCategory);

  /** Categorias con una foto real del catalogo, para las tarjetas del inicio. */
  const categoriasConFoto = (limite = 3) =>
    categoriasEfectivas.slice(0, limite).map((c) => ({
      ...c,
      image: products.find((p) => p.category === c.id)?.image || store.heroImage,
    }));

  const whatsappVisible = tieneWhatsApp(store);
  const telefonoVisible = whatsappVisible ? `+${(store.whatsapp || '').replace(/\D/g, '')}` : null;

  return {
    products,
    filtered,
    activeCategory,
    setActiveCategory,
    categoriasEfectivas,
    categoryTabs,
    categoriasConFoto,
    cartItems,
    cartCount,
    subtotal,
    addToCart,
    removeFromCart,
    vaciarCarrito,
    confirmarPedido,
    cobraOnline,
    pagarOnline,
    whatsappVisible,
    telefonoVisible,
  };
}

export type Catalogo = ReturnType<typeof useCatalogo>;
