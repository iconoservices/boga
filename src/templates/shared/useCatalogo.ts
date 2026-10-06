'use client';

import { useState, useEffect, useMemo } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { fetchProductosDeTienda } from '@/lib/catalogo';
import { demoSlug } from '@/lib/demoPlantilla';
import { getDemoProducts } from '@/lib/templates.config';
import { debeMostrarDemo } from '@/lib/demo';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import { iconForCategory, type Producto, type Categoria } from './tokens';
import { formatearSoles, equivalenteEnMoneda } from '@/lib/monedas';
import { useMonedas } from '@/lib/useMoneda';
import { avisarAgregado } from './AddFeedback';
import { claveLinea, nombreConPresentacion, type Presentacion } from '@/lib/presentaciones';
import { useDetalleProducto } from './useDetalleProducto';

/** Una línea del carrito: el mismo producto en dos medidas distintas son dos líneas. */
type LineaCarrito = { clave: string; producto: Producto; pres?: Presentacion; qty: number; precio: number };

/**
 * El motor de las plantillas de comida: catalogo, categorias y carrito.
 *
 * Vive en un hook y no copiado en cada plantilla porque ya pasamos por eso:
 * la logica de instalar PWA estaba duplicada en tres plantillas y se
 * desincronizo. Aca, un arreglo del carrito o del mensaje de WhatsApp llega a
 * todas las plantillas que lo usan.
 */
export function useCatalogo(store: StoreConfig, initialProductId?: string) {
  const demoPermitido = store.showDemoProducts === true;
  // Moneda elegida por el cliente: suscribe a toda la plantilla para que los precios se vuelvan a pintar al cambiarla.
  useMonedas(store.slug, store.monedas);
  // Distribuidoras de gas: ningún producto muestra precio, se consulta por WhatsApp. En las demás plantillas, solo el producto con precio 0.
  const sinPrecioTodo = store.template === 'gas' || store.template === 'empresa';

  const [products, setProducts] = useState<Producto[]>([]);
  // Falso cuando ya llego la respuesta del catalogo (para mostrar esqueletos en vez de "sin productos" mientras carga).
  const [cargando, setCargando] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  // clave de la linea -> cantidad. La clave es el id del producto, o "id|medida" si se pidio una presentacion
  // (ver claveLinea). Antes era un contador suelto y el resumen del pedido mostraba siempre el mismo plato.
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
            images: Array.isArray(p.images) && p.images.length > 1 ? p.images : undefined,
            extra: p.subcategory ? { area: String(p.subcategory) } : undefined,
            presentaciones: Array.isArray(p.presentaciones) && p.presentaciones.length ? p.presentaciones : undefined,
            esServicio: p.es_servicio === true,
            sinPrecio: sinPrecioTodo || !(Number(p.price) > 0),
            esCombo: p.es_combo === true,
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
            presentaciones: p.presentaciones,
            esServicio: p.esServicio,
            esCombo: p.esCombo,
            priceAnterior: p.priceAnterior,
            sinPrecio: sinPrecioTodo || !(p.price > 0),
          }))
        : [];

      setProducts([...deLaBase, ...demo]);
      setCargando(false);
    };

    cargar();
  }, [store.slug, store.template, store.heroImage, demoPermitido, categorias, sinPrecioTodo]);

  // ── Carrito derivado ──
  const cartItems = useMemo<LineaCarrito[]>(() => {
    const out: LineaCarrito[] = [];
    for (const [clave, qty] of Object.entries(cart)) {
      const corte = clave.indexOf('|');
      const id = corte < 0 ? clave : clave.slice(0, corte);
      const label = corte < 0 ? '' : clave.slice(corte + 1);
      const producto = products.find((p) => p.id === id);
      if (!producto) continue;
      const pres = label ? producto.presentaciones?.find((x) => x.label === label) : undefined;
      if (label && !pres) continue;   // la medida ya no existe: la linea se descarta
      out.push({ clave, producto, pres, qty, precio: pres?.price ?? producto.price });
    }
    return out;
  }, [cart, products]);
  const cartCount = cartItems.reduce((n, l) => n + l.qty, 0);
  const subtotal = cartItems.reduce((n, l) => n + l.precio * l.qty, 0);

  // Con presentaciones, quien llama elige la medida (el modal del producto); si no llega ninguna, va la primera.
  const addToCart = (p: Producto, pres?: Presentacion, cantidad = 1) => {
    const medida = pres ?? p.presentaciones?.[0];
    const clave = claveLinea(p.id, medida?.label);
    const n = Math.max(1, Math.floor(cantidad) || 1);
    setCart((c) => ({ ...c, [clave]: (c[clave] ?? 0) + n }));
    avisarAgregado(medida ? nombreConPresentacion(p.name, medida.label) : p.name);
  };
  // `clave` es el id del producto (igual que siempre) o, con presentacion, "id|medida".
  const removeFromCart = (clave: string) =>
    setCart((c) => {
      const qty = (c[clave] ?? 0) - 1;
      const next = { ...c };
      if (qty <= 0) delete next[clave];
      else next[clave] = qty;
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
          items: cartItems.map((l) => ({ id: l.producto.id, quantity: l.qty, pres: l.pres?.label })),
          cliente: { nombre: datos.nombre, telefono: datos.telefono, entrega: datos.entrega, direccion: datos.direccion },
        }),
      });
      const d = await r.json().catch(() => ({} as { ok?: boolean; codigo?: string; motivo?: string; producto?: string }));
      if (d.ok && d.codigo) {
        // El pago corre en el sitio principal (Izipay vuelve ahí). En una tienda con dominio propio (mitienda.pe), /pagar no existe.
        const sitio = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
        const h = window.location.hostname;
        const principal = !sitio || h === new URL(sitio).hostname || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.vercel.app');
        window.location.href = `${principal ? '' : sitio}/pagar/${d.codigo}`;
        return;
      }
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
      .map((l) => `• ${l.qty}x ${l.producto.esCombo ? '🔥 [COMBO] ' : ''}${l.pres ? nombreConPresentacion(l.producto.name, l.pres.label) : l.producto.name} — ${formatearSoles(l.precio * l.qty)}`)
      .join('\n');
    const entregaTexto = datos.entrega === 'delivery'
      ? `Delivery a: ${datos.direccion}`
      : 'Recojo en tienda';
    enviarPedidoPorWhatsApp(
      store,
      `¡Hola ${store.name}! Soy ${datos.nombre} (${datos.telefono}). Quiero hacer este pedido:\n\n${lineas}\n\nTotal: ${formatearSoles(subtotal)}${equivalenteEnMoneda(subtotal)}\n\n${entregaTexto}`,
      {
        items: cartItems.map((l) => ({ id: l.producto.id, quantity: l.qty, pres: l.pres?.label })),
        cliente: { nombre: datos.nombre, telefono: datos.telefono, entrega: datos.entrega, direccion: datos.direccion },
      },
    );
  };

  // ── Categorias ──
  // Salen de las categorias reales de la tienda; si no cargo ninguna, se
  // deducen del catalogo para no dejar el menu con un unico chip "Todos".
  // En ambos casos se filtran las que no tienen ni un producto todavia: una
  // categoria vacia en el menu del cliente parece un error, no un catalogo
  // en construccion (mientras carga, `cargando` ya evita este filtro raro).
  const categoriasEfectivas: Categoria[] = categorias.length
    ? categorias
        .filter((c) =>
          cargando ||
          products.some((p) => {
            const pc = (p.category || '').toLowerCase().trim();
            const ch = (c.href || '').toLowerCase().trim();
            const cn = (c.name || '').toLowerCase().trim();
            return pc === ch || pc === cn;
          })
        )
        .map((c) => ({
          id: c.href,
          label: c.name,
          // 'category' es el icono generico que se guardaba antes por defecto
          // para toda categoria nueva; se recalcula para no dejarlo pegado.
          icon: c.icon && c.icon !== 'category' ? c.icon : iconForCategory(c.name),
        }))
    : [...new Set(products.map((p) => p.category))]
        .filter(Boolean)
        .map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1), icon: iconForCategory(c) }));

  const combosYOfertas = useMemo(() => {
    return products.filter((p) => p.esCombo || (Boolean(p.priceAnterior) && p.priceAnterior! > p.price));
  }, [products]);

  const tieneCombos = combosYOfertas.some((p) => p.esCombo);
  const tieneOfertas = combosYOfertas.some((p) => Boolean(p.priceAnterior) && p.priceAnterior! > p.price);
  const comboLabel = tieneCombos && tieneOfertas
    ? 'Combos & Ofertas 🔥'
    : tieneCombos
      ? 'Combos 🔥'
      : 'Ofertas 🔥';

  const comboTab: Categoria[] = combosYOfertas.length > 0 ? [{ id: '__combos__', label: comboLabel, icon: 'takeout_dining' }] : [];
  const categoryTabs: Categoria[] = [{ id: 'all', label: 'Todos', icon: 'apps' }, ...comboTab, ...categoriasEfectivas];

  const filtered = activeCategory === 'all'
    ? products
    : activeCategory === '__combos__'
      ? combosYOfertas
      : products.filter((p) => {
          const pc = (p.category || '').toLowerCase().trim();
          const cat = categoriasEfectivas.find((c) => c.id === activeCategory);
          if (!cat) return pc === activeCategory.toLowerCase().trim();
          return pc === cat.id.toLowerCase().trim() || pc === cat.label.toLowerCase().trim();
        });

  /** Categorias con una foto real del catalogo, para las tarjetas del inicio. */
  const categoriasConFoto = (limite = 3) =>
    categoriasEfectivas.slice(0, limite).map((c) => ({
      ...c,
      image: products.find((p) => p.category === c.id)?.image || store.heroImage,
    }));

  const whatsappVisible = tieneWhatsApp(store);
  const telefonoVisible = whatsappVisible ? `+${(store.whatsapp || '').replace(/\D/g, '')}` : null;

  // Detalle de producto con URL propia (/<tienda>/producto/<id>): compartible y
  // es lo que Google indexa, en vez de un modal que solo vivía en un useState.
  const { seleccionado: detalle, abrir: abrirProducto, cerrar: cerrarProducto } = useDetalleProducto(store.slug, products, initialProductId);

  return {
    products,
    cargando,
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
    detalle,
    abrirProducto,
    cerrarProducto,
    combosYOfertas,
    comboLabel,
  };
}

export type Catalogo = ReturnType<typeof useCatalogo>;
