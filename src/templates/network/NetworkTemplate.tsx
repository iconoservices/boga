'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import IconoWhatsApp from '@/templates/shared/IconoWhatsApp';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  initialTab?: string;
}

interface ProductoRed {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  images?: string[];
  description?: string;
  store: string;
}

interface ItemCarrito {
  producto: ProductoRed;
  qty: number;
  precioFinal: number;
}

export default function NetworkTemplate({ store, initialProductId }: Props) {
  const [productos, setProductos] = useState<ProductoRed[]>([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');
  const [productoModal, setProductoModal] = useState<ProductoRed | null>(null);

  // Carrito de compras
  const [carrito, setCarrito] = useState<Record<string, ItemCarrito>>({});
  const [modalCarritoAbierto, setModalCarritoAbierto] = useState(false);
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');

  // Datos dinámicos del revendedor
  const [nombreContacto, setNombreContacto] = useState<string>(
    (store.modulos as any)?.nombreContacto || ''
  );
  const [whatsappNumero, setWhatsappNumero] = useState<string>(
    store.whatsapp || '987911213'
  );
  const [ciudad, setCiudad] = useState<string>(
    store.zona || (store.modulos as any)?.ciudad || 'pucallpa'
  );
  const [margenPorcentaje, setMargenPorcentaje] = useState<number>(
    typeof (store.modulos as any)?.margenPorcentaje === 'number'
      ? (store.modulos as any).margenPorcentaje
      : 15
  );
  const [tiendaProveedora, setTiendaProveedora] = useState<string>(
    store.tiendaProveedora || (store.modulos as any)?.tiendaSeleccionada || 'delva'
  );
  const [productosFiltradosIds, setProductosFiltradosIds] = useState<Set<string>>(
    new Set(
      Array.isArray((store.modulos as any)?.productosSeleccionados)
        ? (store.modulos as any).productosSeleccionados
        : []
    )
  );
  const [preciosPersonalizados, setPreciosPersonalizados] = useState<Record<string, number>>(
    (store.modulos as any)?.preciosPersonalizados || {}
  );

  // 1. Cargar configuración guardada de la tienda desde el endpoint API
  useEffect(() => {
    fetch(`/api/network/tienda?slug=${encodeURIComponent(store.slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.tienda) {
          const t = data.tienda;
          if (t.nombreContacto) setNombreContacto(t.nombreContacto);
          if (t.whatsapp) setWhatsappNumero(t.whatsapp);
          if (t.ciudad) setCiudad(t.ciudad);
          if (typeof t.margenPorcentaje === 'number') setMargenPorcentaje(t.margenPorcentaje);
          if (t.tiendaProveedora) setTiendaProveedora(t.tiendaProveedora);
          if (Array.isArray(t.productosSeleccionados) && t.productosSeleccionados.length > 0) {
            setProductosFiltradosIds(new Set(t.productosSeleccionados));
          }
          if (t.preciosPersonalizados && typeof t.preciosPersonalizados === 'object') {
            setPreciosPersonalizados(t.preciosPersonalizados);
          }
        }
      })
      .catch((err) => console.warn('Error sincronizando config de red:', err));
  }, [store.slug]);

  // 2. Cargar los productos del catálogo del proveedor (Delva)
  useEffect(() => {
    setCargando(true);
    const prov = tiendaProveedora || 'delva';

    supabase
      .from('products')
      .select('id, name, price, category, image, images, description, store, status')
      .eq('store', prov)
      .order('name')
      .limit(150)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error cargando productos de red:', error);
        }
        const prods: ProductoRed[] = (data || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          price: Number(p.price) || 0,
          category: p.category || 'General',
          image: p.image || (Array.isArray(p.images) && p.images[0]) || undefined,
          images: Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
          description: p.description || '',
          store: p.store,
        }));

        setProductos(prods);

        // Si llegó un id inicial para abrir modal
        if (initialProductId) {
          const initP = prods.find((x) => x.id === initialProductId);
          if (initP) setProductoModal(initP);
        }

        setCargando(false);
      });
  }, [tiendaProveedora, initialProductId]);

  // Calcular precio final con margen o precio personalizado
  const calcularPrecio = (costoBase: number, prodId?: string | number) => {
    if (prodId && preciosPersonalizados[String(prodId)] && preciosPersonalizados[String(prodId)] > 0) {
      return Number(preciosPersonalizados[String(prodId)]).toFixed(2);
    }
    const factor = 1 + (margenPorcentaje || 0) / 100;
    const final = Math.round(costoBase * factor * 10) / 10;
    return final.toFixed(2);
  };

  // Funciones del Carrito
  const agregarAlCarrito = (prod: ProductoRed, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const precioFinal = Number(calcularPrecio(prod.price, prod.id));
    setCarrito((prev) => {
      const actual = prev[prod.id];
      return {
        ...prev,
        [prod.id]: {
          producto: prod,
          qty: (actual?.qty || 0) + 1,
          precioFinal,
        },
      };
    });
    setToastMensaje(`+1 "${prod.name}" al carrito`);
    setTimeout(() => setToastMensaje(null), 2200);
  };

  const restarDelCarrito = (prodId: string) => {
    setCarrito((prev) => {
      const actual = prev[prodId];
      if (!actual) return prev;
      if (actual.qty <= 1) {
        const nuevo = { ...prev };
        delete nuevo[prodId];
        return nuevo;
      }
      return {
        ...prev,
        [prodId]: { ...actual, qty: actual.qty - 1 },
      };
    });
  };

  const eliminarDelCarrito = (prodId: string) => {
    setCarrito((prev) => {
      const nuevo = { ...prev };
      delete nuevo[prodId];
      return nuevo;
    });
  };

  const vaciarCarrito = () => setCarrito({});

  const itemsCarrito = useMemo(() => Object.values(carrito), [carrito]);
  const totalUnidades = useMemo(
    () => itemsCarrito.reduce((acc, it) => acc + it.qty, 0),
    [itemsCarrito]
  );
  const totalPrecio = useMemo(
    () => itemsCarrito.reduce((acc, it) => acc + it.qty * it.precioFinal, 0),
    [itemsCarrito]
  );

  // Enviar pedido completo del carrito por WhatsApp
  const enviarPedidoCarritoWhatsApp = () => {
    if (itemsCarrito.length === 0) return;
    const num = whatsappNumero.replace(/\D/g, '');
    const cleanNum = num.startsWith('51') ? num : `51${num}`;

    let texto = `¡Hola ${store.name}! Quiero realizar el siguiente pedido desde su catálogo online:\n\n🛒 *DETALLE DEL PEDIDO:*\n`;
    itemsCarrito.forEach((it) => {
      texto += `• ${it.qty}x ${it.producto.name} - S/ ${(it.qty * it.precioFinal).toFixed(2)}\n`;
    });
    texto += `\n💰 *TOTAL A PAGAR:* S/ ${totalPrecio.toFixed(2)}`;
    texto += `\n📍 *Ciudad de entrega:* ${ciudad}`;
    if (nombreCliente.trim()) {
      texto += `\n👤 *Cliente:* ${nombreCliente.trim()}`;
    }
    if (direccionCliente.trim()) {
      texto += `\n🏠 *Dirección:* ${direccionCliente.trim()}`;
    }

    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  // Filtrar productos seleccionados por el revendedor
  const productosVisibles = useMemo(() => {
    return productos.filter((p) => {
      if (productosFiltradosIds.size > 0 && !productosFiltradosIds.has(p.id)) {
        return false;
      }
      if (categoriaSeleccionada !== 'todas' && p.category !== categoriaSeleccionada) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const enNombre = p.name.toLowerCase().includes(q);
        const enCat = p.category.toLowerCase().includes(q);
        if (!enNombre && !enCat) return false;
      }
      return true;
    });
  }, [productos, productosFiltradosIds, categoriaSeleccionada, busqueda]);

  // Categorías dinámicas
  const categorias = useMemo(() => {
    const mapa: Record<string, number> = {};
    productos.forEach((p) => {
      if (productosFiltradosIds.size === 0 || productosFiltradosIds.has(p.id)) {
        mapa[p.category] = (mapa[p.category] || 0) + 1;
      }
    });
    return Object.entries(mapa).map(([nombre, count]) => ({ nombre, count }));
  }, [productos, productosFiltradosIds]);

  // Enviar mensaje directo de 1 solo producto por WhatsApp
  const pedirPorWhatsApp = (prod: ProductoRed, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const precio = calcularPrecio(prod.price, prod.id);
    const num = whatsappNumero.replace(/\D/g, '');
    const cleanNum = num.startsWith('51') ? num : `51${num}`;
    const texto = `¡Hola ${store.name}! Quiero pedir el producto: *${prod.name}* (Precio: S/ ${precio}).\n\n¿Tienen disponibilidad para envío en ${ciudad}?`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const inicial = (store.name || 'T').trim().charAt(0).toUpperCase();
  const nombreBase = store.name.replace(/\s+bm$/i, '').trim();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans pb-24 sm:pb-28">
      {/* ══ TOAST NOTIFICACIÓN AL AGREGAR ══ */}
      {toastMensaje && (
        <div className="fixed top-4 inset-x-4 max-w-sm mx-auto z-50 animate-in fade-in slide-in-from-top-4 pointer-events-none">
          <div className="bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 backdrop-blur-xs text-xs font-bold">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">shopping_cart</span>
            <span className="truncate">{toastMensaje}</span>
          </div>
        </div>
      )}

      {/* ══ HEADER OFICIAL DE TIENDA DE NETWORK (SIN BANNER, SIN BOTÓN WSP ARRIBA) ══ */}
      <header className="w-full bg-[#0d1527] border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Identidad de la Tienda */}
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              {store.logoImage ? (
                <img
                  src={store.logoImage}
                  alt={store.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shrink-0 shadow-md ring-2 ring-emerald-400/30"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-md ring-2 ring-emerald-400/30 select-none">
                  {inicial}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white capitalize flex items-baseline gap-1.5">
                    <span>{nombreBase}</span>
                    <span className="text-slate-400 font-bold text-xs sm:text-sm lowercase tracking-normal">bm</span>
                  </h1>
                  <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[11px] font-black px-2.5 py-0.5 rounded-full select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Tienda Oficial
                  </span>
                </div>

                <p className="text-slate-300 text-xs sm:text-sm mt-1 truncate">
                  {nombreContacto
                    ? `Catálogo de ${nombreContacto} · Envíos en ${ciudad}`
                    : `Catálogo Oficial en Boga Network · Envíos en ${ciudad}`}
                </p>
              </div>
            </div>

            {/* Acceso rápido a carrito si hay productos */}
            {totalUnidades > 0 && (
              <button
                type="button"
                onClick={() => setModalCarritoAbierto(true)}
                className="self-start sm:self-auto inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                <span>{totalUnidades} {totalUnidades === 1 ? 'item' : 'items'}</span>
                <span className="bg-emerald-700 px-1.5 py-0.5 rounded-md font-mono">S/ {totalPrecio.toFixed(2)}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ══ BARRA DE FILTROS & BÚSQUEDA ══ */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Categorías deslizables */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setCategoriaSeleccionada('todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                categoriaSeleccionada === 'todas'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos ({productosFiltradosIds.size > 0 ? productosFiltradosIds.size : productos.length})
            </button>

            {categorias.map((cat) => (
              <button
                key={cat.nombre}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat.nombre)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  categoriaSeleccionada === cat.nombre
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.nombre} ({cat.count})
              </button>
            ))}
          </div>

          {/* Campo de búsqueda */}
          <div className="relative w-full sm:w-64 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar en el catálogo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* ══ CATÁLOGO DE PRODUCTOS ══ */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Cabecera de la sección */}
        <div className="flex items-center justify-between gap-2 mb-5">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>Productos Disponibles</span>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-black">
              {productosVisibles.length}
            </span>
          </h2>

          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            Precios finales para clientes · Envíos en {ciudad}
          </span>
        </div>

        {/* Estado de Carga */}
        {cargando ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-4xl text-emerald-600 animate-spin">
              progress_activity
            </span>
            <p className="text-xs text-slate-500 font-bold">Cargando catálogo oficial de la tienda...</p>
          </div>
        ) : productosVisibles.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-5xl text-slate-300">inventory_2</span>
            <p className="text-sm font-bold text-slate-800">No hay productos en esta categoría</p>
            <p className="text-xs text-slate-500">Prueba cambiando de categoría o borrando la búsqueda.</p>
          </div>
        ) : (
          /* Grid de Productos */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4.5">
            {productosVisibles.map((prod) => {
              const precio = calcularPrecio(prod.price, prod.id);
              const enCarrito = carrito[prod.id];

              return (
                <div
                  key={prod.id}
                  onClick={() => setProductoModal(prod)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 flex flex-col justify-between transition-all hover:shadow-md hover:border-emerald-300 group select-none cursor-pointer"
                >
                  <div>
                    {/* Imagen del Producto */}
                    <div className="w-full aspect-square rounded-xl bg-slate-50 overflow-hidden relative mb-2.5">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-4xl">image</span>
                        </div>
                      )}
                    </div>

                    {/* Categoría */}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">
                      {prod.category}
                    </span>

                    {/* Título */}
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition mt-0.5">
                      {prod.name}
                    </h3>
                  </div>

                  {/* Precios & Botones: WhatsApp + Agregar Carrito */}
                  <div className="pt-3 mt-auto">
                    <div className="text-sm sm:text-base font-black text-emerald-700">
                      S/ {precio}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2.5">
                      {/* Botón WhatsApp de Verdad */}
                      <button
                        type="button"
                        onClick={(e) => pedirPorWhatsApp(prod, e)}
                        className="flex-1 py-2 px-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer truncate"
                        title="Pedir este producto directo al WhatsApp"
                      >
                        <IconoWhatsApp className="w-3.5 h-3.5 shrink-0 text-white" />
                        <span className="truncate">Pedir</span>
                      </button>

                      {/* Botón + para agregar al Carrito */}
                      <button
                        type="button"
                        onClick={(e) => agregarAlCarrito(prod, e)}
                        className={`w-9 h-9 shrink-0 rounded-xl font-bold flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer relative ${
                          enCarrito
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                        title="Agregar al carrito (+)"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        {enCarrito && (
                          <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                            {enCarrito.qty}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ══ BARRA FLOTANTE DE CARRITO (CUANDO HAY PRODUCTOS) ══ */}
      {totalUnidades > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-5">
          <div
            onClick={() => setModalCarritoAbierto(true)}
            className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-850 transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs relative">
                <span className="material-symbols-outlined text-xl">shopping_cart</span>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-emerald-900 text-[11px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {totalUnidades}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-300 truncate">
                  {totalUnidades} {totalUnidades === 1 ? 'producto' : 'productos'} en el carrito
                </p>
                <p className="text-sm font-black text-emerald-400">
                  Total: S/ {totalPrecio.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition shrink-0"
            >
              <span>Ver Carrito</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ══ MODAL DE DETALLE DE PRODUCTO ══ */}
      {productoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setProductoModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Modal */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                {productoModal.category}
              </span>
              <button
                type="button"
                onClick={() => setProductoModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="overflow-y-auto p-5 sm:p-6 flex flex-col gap-4">
              <div className="w-full aspect-square rounded-2xl bg-slate-50 overflow-hidden relative border border-slate-100">
                {productoModal.image ? (
                  <img
                    src={productoModal.image}
                    alt={productoModal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-5xl">image</span>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {productoModal.name}
                </h2>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                  S/ {calcularPrecio(productoModal.price, productoModal.id)}
                </div>
              </div>

              {productoModal.description && (
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  {productoModal.description}
                </div>
              )}

              <div className="bg-emerald-50/80 rounded-2xl p-3.5 border border-emerald-100 text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
                  <span>Garantía y entrega local en {ciudad}</span>
                </div>
                <p className="text-emerald-700 text-[11px]">
                  Coordina tu pedido directamente por WhatsApp con {store.name}. Pagos seguros contra entrega o Yape/Plin.
                </p>
              </div>

              {/* Botones del Modal: WhatsApp Directo o Agregar al Carrito */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => pedirPorWhatsApp(productoModal)}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <IconoWhatsApp className="w-4 h-4 text-white" />
                  <span>Pedir directo al WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    agregarAlCarrito(productoModal);
                    setProductoModal(null);
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                  <span>+ Agregar al Carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL / DRAWER DE CARRITO DE COMPRAS ══ */}
      {modalCarritoAbierto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setModalCarritoAbierto(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Carrito */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Tu Carrito de Pedido
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {totalUnidades} {totalUnidades === 1 ? 'producto' : 'productos'} seleccionados
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalCarritoAbierto(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer border border-slate-200"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Listado de Productos en el Carrito */}
            <div className="overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 flex-1 divide-y divide-slate-100">
              {itemsCarrito.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-4xl text-slate-300">remove_shopping_cart</span>
                  <p className="text-xs font-bold text-slate-700">Tu carrito está vacío</p>
                  <p className="text-[11px] text-slate-400">Toca el botón (+) en cualquier producto para sumarlo.</p>
                </div>
              ) : (
                itemsCarrito.map((it) => (
                  <div key={it.producto.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {it.producto.image ? (
                        <img
                          src={it.producto.image}
                          alt={it.producto.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-xl">image</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {it.producto.name}
                        </h4>
                        <p className="text-xs font-black text-emerald-700 mt-0.5">
                          S/ {it.precioFinal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Controles de Cantidad */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => restarDelCarrito(it.producto.id)}
                          className="w-7 h-7 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900">
                          {it.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => agregarAlCarrito(it.producto)}
                          className="w-7 h-7 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => eliminarDelCarrito(it.producto.id)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 transition flex items-center justify-center cursor-pointer"
                        title="Quitar"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Formulario de Entrega Rápida */}
              {itemsCarrito.length > 0 && (
                <div className="pt-4 flex flex-col gap-2.5">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">local_shipping</span>
                    <span>Datos para tu envío en {ciudad} (Opcional):</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Tu nombre completo"
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Dirección o referencia"
                      value={direccionCliente}
                      onChange={(e) => setDireccionCliente(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Carrito con Total y Enviar WhatsApp */}
            {itemsCarrito.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold">Total a Pagar:</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-800 font-mono">
                    S/ {totalPrecio.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={enviarPedidoCarritoWhatsApp}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <IconoWhatsApp className="w-5 h-5 text-white" />
                  <span>Enviar Pedido por WhatsApp (S/ {totalPrecio.toFixed(2)})</span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <button
                    type="button"
                    onClick={vaciarCarrito}
                    className="hover:text-red-600 underline cursor-pointer"
                  >
                    Vaciar carrito
                  </button>
                  <span>Envíos rápidos en {ciudad}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ PIE DE PÁGINA OFICIAL ══ */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-xs text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">{store.name}</span>
            <span>· Catálogo oficial en Boga Network</span>
          </div>
          <p className="text-slate-500">
            Envíos y entregas en {ciudad} · Pedidos coordinados por WhatsApp
          </p>
        </div>
      </footer>
    </div>
  );
}
