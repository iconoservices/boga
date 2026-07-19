'use client';

import { useState, useEffect, useMemo } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { getDemoProducts } from '@/lib/templates.config';
import { debeMostrarDemo } from '@/lib/demo';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import { soles, type Producto, type Categoria } from './tokens';

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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store', store.slug);

      const deLaBase: Producto[] = data && !error
        ? data.map((p) => ({
            id: String(p.id),
            name: p.name,
            desc: p.description || '',
            price: Number(p.price) || 0,
            category: hrefDeCategoria(p.category),
            image: p.image || store.heroImage,
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

  const addToCart = (p: Producto) => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
  const removeFromCart = (id: string) =>
    setCart((c) => {
      const qty = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  const vaciarCarrito = () => setCart({});

  const confirmarPedido = () => {
    const lineas = cartItems
      .map((l) => `• ${l.qty}x ${l.producto.name} — ${soles(l.producto.price * l.qty)}`)
      .join('\n');
    enviarPedidoPorWhatsApp(
      store,
      `¡Hola ${store.name}! Quiero hacer este pedido:\n\n${lineas}\n\nTotal: ${soles(subtotal)}`
    );
  };

  // ── Categorias ──
  // Salen de las categorias reales de la tienda; si no cargo ninguna, se
  // deducen del catalogo para no dejar el menu con un unico chip "Todos".
  const categoriasEfectivas: Categoria[] = categorias.length
    ? categorias.map((c) => ({ id: c.href, label: c.name, icon: c.icon }))
    : [...new Set(products.map((p) => p.category))]
        .filter(Boolean)
        .map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1), icon: 'category' }));

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
    whatsappVisible,
    telefonoVisible,
  };
}

export type Catalogo = ReturnType<typeof useCatalogo>;
