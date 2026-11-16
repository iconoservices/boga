'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';

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

export default function NetworkTemplate({ store, initialProductId }: Props) {
  const [productos, setProductos] = useState<ProductoRed[]>([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');
  const [productoModal, setProductoModal] = useState<ProductoRed | null>(null);

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

  // Calcular precio final con margen
  const calcularPrecio = (costoBase: number) => {
    const factor = 1 + (margenPorcentaje || 0) / 100;
    const final = Math.round(costoBase * factor * 10) / 10;
    return final.toFixed(2);
  };

  // Filtrar productos seleccionados por el revendedor
  const productosVisibles = useMemo(() => {
    return productos.filter((p) => {
      // Si el revendedor marcó productos específicos, respetarlos; si no, mostrar todos
      if (productosFiltradosIds.size > 0 && !productosFiltradosIds.has(p.id)) {
        return false;
      }
      // Filtro de categoría
      if (categoriaSeleccionada !== 'todas' && p.category !== categoriaSeleccionada) {
        return false;
      }
      // Filtro de búsqueda
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

  // Enviar mensaje de WhatsApp
  const abrirWhatsAppGeneral = () => {
    const num = whatsappNumero.replace(/\D/g, '');
    const cleanNum = num.startsWith('51') ? num : `51${num}`;
    const texto = `¡Hola ${store.name}! Quiero hacer una consulta sobre los productos de su catálogo en Boga Market.`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const pedirPorWhatsApp = (prod: ProductoRed, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const precio = calcularPrecio(prod.price);
    const num = whatsappNumero.replace(/\D/g, '');
    const cleanNum = num.startsWith('51') ? num : `51${num}`;
    const texto = `¡Hola ${store.name}! Quiero pedir el producto: *${prod.name}* (Precio: S/ ${precio}).\n\n¿Tienen disponibilidad para envío en ${ciudad}?`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const inicial = (store.name || 'T').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* ══ HEADER OFICIAL DE TIENDA DE NETWORK (SIN BANNER) ══ */}
      <header className="w-full bg-[#0d1527] border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
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
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white capitalize">
                    {store.name}
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

            {/* Botón WhatsApp de Cabecera */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={abrirWhatsAppGeneral}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs sm:text-sm px-4.5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-md transition active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
                <span>Pedir al WhatsApp: {whatsappNumero}</span>
              </button>
            </div>
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
              const precio = calcularPrecio(prod.price);

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

                  {/* Precios & Botón Pedir */}
                  <div className="pt-3 mt-auto">
                    <div className="text-sm sm:text-base font-black text-emerald-700">
                      S/ {precio}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => pedirPorWhatsApp(prod, e)}
                      className="mt-2 w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white font-extrabold text-xs flex items-center justify-center gap-1.5 border border-emerald-200/80 transition active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      <span>Pedir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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
                  S/ {calcularPrecio(productoModal.price)}
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

              <button
                type="button"
                onClick={() => pedirPorWhatsApp(productoModal)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
                <span>Pedir por WhatsApp ahora (S/ {calcularPrecio(productoModal.price)})</span>
              </button>
            </div>
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
