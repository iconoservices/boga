'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CIUDADES } from '@/lib/ciudades';
import { detectarCiudad } from '@/lib/geo';

function waLink(numero: string, texto: string) {
  const clean = numero.replace(/\D/g, '');
  const num = clean.length === 9 ? `51${clean}` : clean;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

interface TiendaAliada {
  slug: string;
  name: string;
  category?: string;
  logo?: string;
  notas?: string;
}

interface ProductoProveedor {
  id: string | number;
  name: string;
  price: number;
  category?: string;
  image?: string;
  store: string;
}

export default function RevendedoresPage() {
  // Datos del formulario de alta
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [ciudad, setCiudad] = useState('pucallpa');
  const [detectando, setDetectando] = useState(false);
  const [geoAviso, setGeoAviso] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [wspBoga, setWspBoga] = useState('51987911213');

  // Estado del panel del revendedor
  const [modoPanel, setModoPanel] = useState(false);
  const [pestañaActiva, setPestañaActiva] = useState<'catalogo' | 'preview' | 'ajustes'>('catalogo');
  const [modalAvisoAsesor, setModalAvisoAsesor] = useState(false);
  const [estadoTienda, setEstadoTienda] = useState<'desactivada' | 'activa'>('desactivada');

  // Filtros y catálogo
  const [tiendasAliadas, setTiendasAliadas] = useState<TiendaAliada[]>([]);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<string>('');
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoProveedor[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<string | number>>(new Set());
  const [margenPorcentaje, setMargenPorcentaje] = useState<number>(15);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');

  useEffect(() => {
    fetch('/api/contacto')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (d?.whatsapp) setWspBoga(d.whatsapp);
      })
      .catch(() => {});

    // Restaurar sesión de tienda creada previamente en este navegador
    try {
      const guardado = typeof window !== 'undefined' ? localStorage.getItem('boga_revendedor_draft') : null;
      if (guardado) {
        const p = JSON.parse(guardado);
        if (p.nombreTienda && p.whatsapp) {
          setNombre(p.nombre || '');
          setWhatsapp(p.whatsapp || '');
          setNombreTienda(p.nombreTienda || '');
          setCiudad(p.ciudad || 'pucallpa');
          if (p.margenPorcentaje !== undefined) setMargenPorcentaje(p.margenPorcentaje);
          if (p.tiendaSeleccionada) setTiendaSeleccionada(p.tiendaSeleccionada);
          if (p.productosSeleccionados && Array.isArray(p.productosSeleccionados)) {
            setProductosSeleccionados(new Set(p.productosSeleccionados));
          }
          setModoPanel(true);
        }
      }
    } catch (e) {
      console.warn('Error leyendo borrador de revendedor:', e);
    }

    // Cargar tiendas aliadas que permiten revendedores
    supabase
      .from('stores')
      .select('slug, name, marketplace_category, logo_image, notas_revendedores, permite_revendedores')
      .limit(30)
      .then(({ data }) => {
        const permitidas = (data || []).filter((s: any) => s.permite_revendedores === true);
        const lista = permitidas.length > 0 ? permitidas : (data || []).slice(0, 10);
        const mapped: TiendaAliada[] = lista.map((s: any) => ({
          slug: s.slug,
          name: s.name,
          category: s.marketplace_category || 'General',
          logo: s.logo_image,
          notas: s.notas_revendedores || 'Tienda aliada verificada en Pucallpa',
        }));
        setTiendasAliadas(mapped);
        if (mapped.length > 0) {
          setTiendaSeleccionada((prev) => prev || mapped[0].slug);
        }
      });
  }, []);

  // Guardar automáticamente los cambios de productos/margen en localStorage
  useEffect(() => {
    if (!modoPanel || !nombreTienda) return;
    try {
      localStorage.setItem(
        'boga_revendedor_draft',
        JSON.stringify({
          nombre,
          whatsapp,
          nombreTienda,
          ciudad,
          margenPorcentaje,
          tiendaSeleccionada,
          productosSeleccionados: Array.from(productosSeleccionados),
        })
      );
    } catch {}
  }, [modoPanel, nombre, whatsapp, nombreTienda, ciudad, margenPorcentaje, tiendaSeleccionada, productosSeleccionados]);

  // Cargar productos de la tienda aliada elegida
  useEffect(() => {
    if (!tiendaSeleccionada || !modoPanel) return;
    setCargandoProductos(true);
    setFiltroCategoria('todas');
    setBusqueda('');

    supabase
      .from('products')
      .select('id, name, price, category, image, store')
      .eq('store', tiendaSeleccionada)
      .limit(80)
      .then(({ data, error }) => {
        if (!error && data) {
          const prods = data as ProductoProveedor[];
          setProductosDisponibles(prods);
          // Por defecto todos seleccionados
          setProductosSeleccionados(new Set(prods.map((p) => p.id)));
        }
        setCargandoProductos(false);
      });
  }, [tiendaSeleccionada, modoPanel]);

  // Categorías de la tienda proveedora actual (con conteo dinámico)
  const categoriasDisponibles = useMemo(() => {
    const map: Record<string, number> = {};
    productosDisponibles.forEach((p) => {
      const cat = (p.category || 'General').trim();
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [productosDisponibles]);

  // Productos filtrados por categoría y búsqueda
  const productosFiltrados = useMemo(() => {
    return productosDisponibles.filter((p) => {
      const catMatches =
        filtroCategoria === 'todas' ||
        (p.category && p.category.trim().toLowerCase() === filtroCategoria.toLowerCase());
      const searchMatches =
        !busqueda.trim() || p.name.toLowerCase().includes(busqueda.toLowerCase());
      return catMatches && searchMatches;
    });
  }, [productosDisponibles, filtroCategoria, busqueda]);

  const handleDetectarCiudad = async () => {
    setDetectando(true);
    setGeoAviso('');
    const res = await detectarCiudad();
    setDetectando(false);
    if (res.ok && res.slug) {
      setCiudad(res.slug);
    } else {
      setGeoAviso('Elige tu ciudad manualmente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !whatsapp.trim() || !nombreTienda.trim()) {
      setErrorMsg('Completa tu nombre, WhatsApp y el nombre de tu tienda.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const { error } = await supabase.from('store_requests').insert({
      business_name: nombreTienda.trim(),
      contact_name: nombre.trim(),
      whatsapp: whatsapp.trim(),
      city: ciudad || 'pucallpa',
      category: 'Catálogo Aliado',
      interest: 'revendedor',
      description: '[TIENDA DE REVENTA / DROPSHIPPING]',
    });

    setIsLoading(false);

    if (error) {
      console.error('Error al registrar revendedor:', error);
      setErrorMsg('Ocurrió un error. Por favor intenta de nuevo.');
      return;
    }

    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'generate_lead', {
      tipo: 'revendedor_dropshipping',
      ciudad,
    });

    // Guardar en localStorage para que en siguientes visitas entre directo al panel
    try {
      localStorage.setItem(
        'boga_revendedor_draft',
        JSON.stringify({
          nombre: nombre.trim(),
          whatsapp: whatsapp.trim(),
          nombreTienda: nombreTienda.trim(),
          ciudad: ciudad || 'pucallpa',
          margenPorcentaje,
          tiendaSeleccionada,
          productosSeleccionados: Array.from(productosSeleccionados),
        })
      );
    } catch {}

    // Entrar al Panel de Revendedor
    setModoPanel(true);
  };

  const handleRegistrarOtra = () => {
    if (confirm('¿Deseas salir de este panel para registrar una nueva tienda de reventa?')) {
      try {
        localStorage.removeItem('boga_revendedor_draft');
      } catch {}
      setModoPanel(false);
      setNombre('');
      setWhatsapp('');
      setNombreTienda('');
      setCiudad('pucallpa');
      setPestañaActiva('catalogo');
    }
  };

  const calcularPrecio = (base: number) => {
    const aumento = 1 + margenPorcentaje / 100;
    const final = Math.round(base * aumento * 10) / 10;
    return final.toFixed(2);
  };

  const calcularGanancia = (base: number) => {
    const final = parseFloat(calcularPrecio(base));
    return (final - base).toFixed(2);
  };

  const toggleProducto = (id: string | number) => {
    setProductosSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PANTALLA 2: PANEL DE REVENDEDOR CON LAYOUT OPCIONES (IZQ) / PRODUCTOS (DER)
  // ──────────────────────────────────────────────────────────────────────────
  if (modoPanel) {
    const prodsElegidos = productosDisponibles.filter((p) => productosSeleccionados.has(p.id));

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white">
        {/* Barra Superior del Panel */}
        <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo-mark.svg" alt="BogaHub" className="w-7 h-7" />
                <span className="font-extrabold text-slate-900 text-sm tracking-tight hidden sm:inline">BogaHub</span>
              </Link>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base">{nombreTienda}</span>
                {estadoTienda === 'desactivada' ? (
                  <span className="bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    Desactivada (En gris / Borrador)
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Activa en Boga Market
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRegistrarOtra}
                title="Salir y registrar otra tienda"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">add_business</span>
                <span className="hidden sm:inline">Nueva tienda</span>
              </button>

              <button
                type="button"
                onClick={() => setModalAvisoAsesor(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>Asegurar activación con Asesor</span>
              </button>
            </div>
          </div>
        </header>

        {/* Banner de Estado en Gris / Borrador */}
        {estadoTienda === 'desactivada' && (
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-xs">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="material-symbols-outlined text-slate-500 text-[18px] shrink-0">pause_circle</span>
                <span>
                  <b>Tienda en gris (desactivada):</b> Aún no aparece en Boga Market ni recibe pedidos hasta que el admin acepte tu solicitud.
                </span>
              </div>
              <button
                onClick={() => setModalAvisoAsesor(true)}
                className="font-bold text-emerald-700 hover:text-emerald-900 underline text-left shrink-0 cursor-pointer"
              >
                Avisar al asesor para que la acepte →
              </button>
            </div>
          </div>
        )}

        {/* Conmutador de Pestañas (Catálogo / Vista Previa / Ajustes) */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPestañaActiva('catalogo')}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'catalogo'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              <span>1. Catálogo & Productos</span>
              <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {productosSeleccionados.size}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPestañaActiva('preview')}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'preview'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              <span>2. Vista Previa de Mi Tienda</span>
              <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                Privada
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPestañaActiva('ajustes')}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'ajustes'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              <span>3. Ajustes & Estado</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                En gris
              </span>
            </button>
          </div>
        </div>

        {/* ── CONTENIDO PRINCIPAL SEGÚN PESTAÑA ── */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 1: CATÁLOGO (IZQUIERDA: OPCIONES / DERECHA: PRODUCTOS)
             ══════════════════════════════════════════════════════════════════ */}
          {pestañaActiva === 'catalogo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ── LADO IZQUIERDO: Opciones y Filtros ── */}
              <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20">
                {/* 1. Tienda Proveedora */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tienda Proveedora en Pucallpa
                  </label>
                  <select
                    value={tiendaSeleccionada}
                    onChange={(e) => setTiendaSeleccionada(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {tiendasAliadas.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Proveedor verificado con entrega local y stock disponible.
                  </p>
                </div>

                {/* 2. Tu Margen de Ganancia */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700">Tu Margen de Ganancia</label>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      +{margenPorcentaje}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {[0, 10, 15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setMargenPorcentaje(pct)}
                        className={`text-xs py-1.5 rounded-lg font-bold transition cursor-pointer ${
                          margenPorcentaje === pct
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {pct === 0 ? '0% (Costo)' : `+${pct}%`}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                    💡 Ejemplo: Producto de <b>S/ 50.00</b> → Lo vendes a <b>S/ {calcularPrecio(50)}</b> (Ganas <b>+S/ {calcularGanancia(50)}</b>).
                  </div>
                </div>

                {/* 3. Categorías de la Tienda (Filtro Vertical) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Categorías ({categoriasDisponibles.length})
                    </h4>
                    {filtroCategoria !== 'todas' && (
                      <button
                        type="button"
                        onClick={() => setFiltroCategoria('todas')}
                        className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Ver todas
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setFiltroCategoria('todas')}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer text-left ${
                        filtroCategoria === 'todas'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">grid_view</span>
                        Todas las categorías
                      </span>
                      <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        {productosDisponibles.length}
                      </span>
                    </button>

                    {categoriasDisponibles.map((c) => {
                      const isActiva = filtroCategoria.toLowerCase() === c.name.toLowerCase();
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setFiltroCategoria(c.name)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer text-left ${
                            isActiva
                              ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                            {c.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Resumen de Estado */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Estado de la tienda:</span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md">
                      ⚪ Desactivada
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Tu tienda está en gris (inactiva) hasta que el admin acepte tu solicitud.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalAvisoAsesor(true)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    <span>Avisar al Asesor para Activar</span>
                  </button>
                </div>
              </div>

              {/* ── LADO DERECHO: Productos Ordenados ── */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* Barra de Búsqueda y Acciones Rápidas */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:max-w-xs">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs text-slate-500 font-medium">
                      <b>{productosFiltrados.length}</b> productos en{' '}
                      <span className="font-bold text-slate-900 uppercase">
                        {filtroCategoria === 'todas' ? 'Todo' : filtroCategoria}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setProductosSeleccionados((prev) => {
                            const next = new Set(prev);
                            productosFiltrados.forEach((p) => next.add(p.id));
                            return next;
                          })
                        }
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Marcar categoría
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setProductosSeleccionados((prev) => {
                            const next = new Set(prev);
                            productosFiltrados.forEach((p) => next.delete(p.id));
                            return next;
                          })
                        }
                        className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid de Productos */}
                {cargandoProductos ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                    Cargando productos de la tienda aliada...
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                    No se encontraron productos en esta categoría o búsqueda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {productosFiltrados.map((p) => {
                      const isSelected = productosSeleccionados.has(p.id);
                      const basePrice = Number(p.price) || 0;
                      const ventaPrice = calcularPrecio(basePrice);
                      const ganancia = calcularGanancia(basePrice);

                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProducto(p.id)}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex gap-3 relative ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/25 shadow-2xs ring-1 ring-emerald-500/20'
                              : 'border-slate-200 bg-white opacity-60 hover:opacity-100'
                          }`}
                        >
                          {/* Foto */}
                          <div className="w-18 h-18 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-2xl">image</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase truncate">
                                  {p.category || 'General'}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                              </div>
                              <p className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">{p.name}</p>
                            </div>

                            <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-slate-100">
                              <div>
                                <span className="text-[10px] text-slate-400 block leading-none">Precio venta</span>
                                <span className="font-extrabold text-xs sm:text-sm text-slate-900">S/ {ventaPrice}</span>
                              </div>
                              {margenPorcentaje > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                  +S/ {ganancia}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer flotante con botón a Vista Previa */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-600 font-medium">
                    Tienes <b>{productosSeleccionados.size} productos seleccionados</b> listos para tu tienda.
                  </span>
                  <button
                    type="button"
                    onClick={() => setPestañaActiva('preview')}
                    className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <span>Ver cómo queda mi tienda</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 2: VISTA PREVIA DE LA TIENDA (PRIVADA / MOCKUP)
             ══════════════════════════════════════════════════════════════════ */}
          {pestañaActiva === 'preview' && (
            <div className="flex flex-col gap-4">
              {/* Aviso flotante de vista previa */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-amber-400 text-2xl">lock</span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">Vista previa privada para clientes</h4>
                    <p className="text-[11px] text-slate-400">
                      Esta pestaña es tu maqueta: así verán tu catálogo tus clientes una vez aceptada por el asesor.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAvisoAsesor(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0"
                >
                  Activar tienda oficial
                </button>
              </div>

              {/* Mockup de Tienda del Revendedor */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
                {/* Header Tienda */}
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
                    {nombreTienda.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900">{nombreTienda}</h2>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                        📍 {ciudad}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Catálogo exclusivo · Pedidos y entregas directas por WhatsApp ({whatsapp})
                    </p>
                  </div>
                </div>

                {/* Grid de Productos en la Tienda */}
                <div className="mt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Catálogo de Productos ({prodsElegidos.length})
                  </h3>

                  {prodsElegidos.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No has seleccionado productos aún. Ve a la pestaña "Catálogo & Productos" para agregarlos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {prodsElegidos.map((prod) => (
                        <div key={prod.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs flex flex-col justify-between">
                          <div className="h-32 bg-slate-100 overflow-hidden">
                            {prod.image ? (
                              <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-3xl">image</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{prod.category || 'Producto'}</span>
                            <h4 className="font-bold text-xs text-slate-900 truncate">{prod.name}</h4>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-extrabold text-sm text-slate-900">S/ {calcularPrecio(Number(prod.price) || 0)}</span>
                              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm">shopping_cart</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 3: AJUSTES & ESTADO (EXPLICACIÓN CLARA DEL ESTADO EN GRIS)
             ══════════════════════════════════════════════════════════════════ */}
          {pestañaActiva === 'ajustes' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-5">
              {/* Card de Estado Principal */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Estado de la Tienda en Boga Market</h3>
                    <p className="text-xs text-slate-500">Control de visibilidad y activación pública</p>
                  </div>
                  {estadoTienda === 'desactivada' ? (
                    <span className="bg-slate-100 text-slate-600 border border-slate-300 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Desactivada (En gris)
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Activa en Boga Market
                    </span>
                  )}
                </div>

                {/* Explicación Visual en Gris */}
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs flex gap-3.5 items-start">
                  <span className="material-symbols-outlined text-slate-500 text-2xl shrink-0">info</span>
                  <div className="text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-900 mb-1">
                      ¿Por qué mi tienda aparece en gris (desactivada)?
                    </p>
                    <p>
                      Tu tienda se encuentra en <b>modo borrador privado</b>. Esto te permite importar productos, cambiar tus márgenes y ver la vista previa sin que nadie te moleste.
                    </p>
                    <p className="mt-2">
                      Para que la tienda pase a <b>Activa (Verde)</b> y los clientes puedan encontrarte en Boga Market y pedirte por WhatsApp, el administrador de BogaHub debe aceptar y validar tu solicitud.
                    </p>
                  </div>
                </div>

                {/* Botón para solicitar activación */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAvisoAsesor(true)}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    <span>Avisar al Asesor para que la acepte y active</span>
                  </button>
                </div>
              </div>

              {/* Card de Datos de la Tienda */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col gap-4">
                <h3 className="text-base font-extrabold text-slate-900">Datos de tu Cuenta de Reventa</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Nombre de la tienda</label>
                    <p className="font-bold text-slate-900 text-sm">{nombreTienda}</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Responsable</label>
                    <p className="font-bold text-slate-900 text-sm">{nombre}</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">WhatsApp de pedidos</label>
                    <p className="font-bold text-slate-900 text-sm">{whatsapp}</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Ciudad / Distrito</label>
                    <p className="font-bold text-slate-900 text-sm capitalize">{ciudad}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">¿Quieres salir o registrar otra tienda?</span>
                  <button
                    type="button"
                    onClick={handleRegistrarOtra}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">logout</span>
                    Registrar otra tienda
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── Ventana Flotante: Aviso al Asesor ── */}
        {modalAvisoAsesor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setModalAvisoAsesor(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalAvisoAsesor(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">support_agent</span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Asegura la activación de tu tienda</h3>
                  <p className="text-xs text-slate-500 font-medium">Avisar al equipo de BogaHub por WhatsApp</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tienda:</span>
                  <span className="font-bold text-slate-900">{nombreTienda}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsable:</span>
                  <span className="font-bold text-slate-900">{nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">WhatsApp de ventas:</span>
                  <span className="font-bold text-slate-900">{whatsapp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ciudad:</span>
                  <span className="font-bold text-slate-900 capitalize">{ciudad}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Al enviar este mensaje, el asesor validará tu cuenta en la base de datos y activará tu catálogo para que tu tienda pase de <b>gris a verde</b> y puedas recibir pedidos sin trabas.
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={waLink(
                    wspBoga,
                    `Hola BogaHub! Acabo de crear mi tienda de reventa "${nombreTienda}" a nombre de ${nombre} (WhatsApp: ${whatsapp}, Ciudad: ${ciudad}). Quiero asegurar la activación de mi tienda para que pase de gris a activa y empezar a vender.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setModalAvisoAsesor(false)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold py-3 px-4 rounded-xl text-sm shadow-md transition"
                >
                  <span className="material-symbols-outlined text-lg">chat</span>
                  Enviar Mensaje por WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setModalAvisoAsesor(false)}
                  className="text-center text-xs text-slate-500 hover:text-slate-800 font-semibold py-1.5 transition cursor-pointer"
                >
                  Cerrar ventana y continuar en mi panel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PANTALLA 1: REGISTRO INICIAL (FORMULARIO ULTRA COMPACTO)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between overflow-y-auto lg:overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior Slim ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="BogaHub" className="w-6 h-6" />
            <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">BogaHub</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Reventa & Dropshipping
            </span>
          </Link>
          <Link
            href="/trabajos"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Volver a Trabajos
          </Link>
        </div>
      </header>

      {/* ── Contenido Principal (Fijo, Centrado y Sin Scroll) ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-3 w-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center w-full">
          
          {/* ── LADO IZQUIERDO: Propuesta de valor compacta ── */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5">
                <span className="material-symbols-outlined text-[12px]">payments</span>
                Emprende en Pucallpa sin stock
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Gana dinero vendiendo productos locales{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent block">
                  sin comprar mercadería
                </span>
              </h1>
              <p className="mt-1.5 text-slate-600 text-xs sm:text-[13px] font-normal leading-snug">
                Crea tu tienda con tu propia marca en 2 minutos. En el siguiente paso podrás elegir los productos de las tiendas aliadas de Pucallpa y regular tus precios.
              </p>
            </div>

            {/* 3 Beneficios en pastillas compactas */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">0 inversión en mercadería</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">No compras stock por adelantado.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">attach_money</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">Tú pones tu ganancia</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tú decides cuánto ganar por cada venta.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">Pedidos a tu WhatsApp</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tus clientes te escriben y pagan a ti.</p>
                </div>
              </div>
            </div>

            {/* Nota de catálogo */}
            <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-[10px] text-emerald-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-emerald-600 shrink-0">verified</span>
              <span>
                <b>Acceso inmediato:</b> Al darle a Crear Tienda ingresarás de inmediato a tu panel de borrador para elegir productos.
              </span>
            </div>
          </div>

          {/* ── LADO DERECHO: Formulario Compacto ── */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-5">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Formulario Rápido de Reventa</h2>
                    <p className="text-[10px] text-slate-500">Solo 4 datos para activar tu catálogo</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Paso único
                  </span>
                </div>

                {errorMsg && (
                  <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {errorMsg}
                  </div>
                )}

                {/* ── FILA 1: Nombre + WhatsApp (2 columnas) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Tu nombre completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Camila Salazar"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Tu WhatsApp de pedidos <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 987 654 321"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* ── FILA 2: Nombre de Tienda + Ciudad (2 columnas) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Nombre para tu tienda / catálogo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Camila Store, Ofertas Pucallpa"
                      value={nombreTienda}
                      onChange={(e) => setNombreTienda(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-bold text-slate-700">Tu ciudad / distrito</label>
                      <button
                        type="button"
                        onClick={handleDetectarCiudad}
                        disabled={detectando}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">my_location</span>
                        {detectando ? 'Ubicando...' : 'Ubicar GPS'}
                      </button>
                    </div>
                    <select
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                    >
                      {CIUDADES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nombre} ({c.region})
                        </option>
                      ))}
                    </select>
                    {geoAviso && <p className="text-[10px] text-amber-600">{geoAviso}</p>}
                  </div>
                </div>

                {/* ── Botón CTA de Envío ── */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span>Registrando tu tienda...</span>
                    ) : (
                      <>
                        <span>Crear Mi Tienda y Elegir Productos</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-slate-400 mt-1.5">
                    🔒 Sin costos ocultos · No compras mercadería por adelantado · Empiezas hoy
                  </p>
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* ── Pie de página sutil (sin scroll) ── */}
      <footer className="w-full py-2 text-center text-[10px] text-slate-400 shrink-0">
        <p>© {new Date().getFullYear()} BogaHub Pucallpa · Reventa & Dropshipping Local</p>
      </footer>
    </div>
  );
}
