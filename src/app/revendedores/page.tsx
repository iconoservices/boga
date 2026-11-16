'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
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
  const { user, loading: authLoading } = useAuth();

  // Opciones de la Home (antes de crear tienda): 'reventa' o 'afiliados'
  const [opcionHome, setOpcionHome] = useState<'reventa' | 'afiliados'>('reventa');

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
  const [pestañaActiva, setPestañaActiva] = useState<'catalogo' | 'preview' | 'afiliados' | 'ajustes'>('catalogo');
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

  // Restaurar sesión de tienda vinculada a este usuario o borrador previo
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (!nombre) {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        if (metaName) setNombre(metaName);
      }

      const userDraftKey = `boga_revendedor_draft_${user.id}`;
      let recuperado = false;
      try {
        const guardado = typeof window !== 'undefined'
          ? (localStorage.getItem(userDraftKey) || localStorage.getItem('boga_revendedor_draft'))
          : null;

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
            recuperado = true;
          }
        }
      } catch (e) {
        console.warn('Error leyendo borrador de revendedor:', e);
      }

      // Si no hay borrador local, buscar si ya solicitó tienda en Supabase
      if (!recuperado && user.email) {
        supabase
          .from('store_requests')
          .select('business_name, contact_name, whatsapp, city, description')
          .eq('email', user.email)
          .eq('interest', 'revendedor')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) {
              const req = data[0];
              if (req.business_name) {
                setNombreTienda(req.business_name);
                setNombre(req.contact_name || user.user_metadata?.full_name || '');
                setWhatsapp(req.whatsapp || '');
                if (req.city) setCiudad(req.city);
                setModoPanel(true);
              }
            }
          });
      }
    } else {
      // Usuario no logueado: verificar borrador general
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
      } catch {}
    }
  }, [user, authLoading]);

  // Guardar automáticamente los cambios de productos/margen en localStorage
  useEffect(() => {
    if (!modoPanel || !nombreTienda) return;
    try {
      const payload = JSON.stringify({
        nombre,
        whatsapp,
        nombreTienda,
        ciudad,
        margenPorcentaje,
        tiendaSeleccionada,
        productosSeleccionados: Array.from(productosSeleccionados),
      });
      if (user?.id) {
        localStorage.setItem(`boga_revendedor_draft_${user.id}`, payload);
      }
      localStorage.setItem('boga_revendedor_draft', payload);
    } catch {}
  }, [modoPanel, nombre, whatsapp, nombreTienda, ciudad, margenPorcentaje, tiendaSeleccionada, productosSeleccionados, user]);

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
      .eq('is_available', true)
      .order('name')
      .limit(60)
      .then(({ data }) => {
        const prods = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          category: p.category || 'General',
          image: p.image,
          store: p.store,
        }));
        setProductosDisponibles(prods);

        // Si no tenía productos seleccionados para esta tienda, pre-seleccionar todos
        setProductosSeleccionados((prev) => {
          if (prev.size === 0) {
            return new Set(prods.map((x) => x.id));
          }
          return prev;
        });

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
    if (!user) {
      setErrorMsg('Debes iniciar sesión con tu correo para vincular tu tienda.');
      return;
    }
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
      email: user.email,
      description: `[TIENDA DE REVENTA / DROPSHIPPING] [user_id: ${user.id}] [margen: ${margenPorcentaje}%] [proveedor: ${tiendaSeleccionada || 'general'}]`,
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
      email: user.email,
    });

    // Guardar en localStorage para que en siguientes visitas entre directo al panel
    try {
      const payload = JSON.stringify({
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        nombreTienda: nombreTienda.trim(),
        ciudad: ciudad || 'pucallpa',
        margenPorcentaje,
        tiendaSeleccionada,
        productosSeleccionados: Array.from(productosSeleccionados),
      });
      localStorage.setItem(`boga_revendedor_draft_${user.id}`, payload);
      localStorage.setItem('boga_revendedor_draft', payload);
    } catch {}

    // Entrar al Panel de Revendedor
    setModoPanel(true);
  };

  const handleRegistrarOtra = () => {
    if (confirm('¿Deseas salir de este panel para registrar una nueva tienda de reventa?')) {
      try {
        if (user?.id) localStorage.removeItem(`boga_revendedor_draft_${user.id}`);
        localStorage.removeItem('boga_revendedor_draft');
      } catch {}
      setModoPanel(false);
      setNombre(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
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
  // PANTALLA 2: PANEL DE REVENDEDOR (OPCIONES CONTINUAS PARA HACER DINERO)
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
              {user?.email && (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="truncate max-w-[150px]">{user.email}</span>
                </div>
              )}

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

        {/* Conmutador de Pestañas: Continuidad de opciones para hacer dinero */}
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
              onClick={() => setPestañaActiva('afiliados')}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'afiliados'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
              <span>3. Ganar con Afiliados</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                Bono en efectivo
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
              <span>4. Ajustes & Cuenta</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                En gris
              </span>
            </button>
          </div>
        </div>

        {/* Contenido Principal según la pestaña activa */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 1: CATÁLOGO & PRODUCTOS (LAYOUT IZQ: OPCIONES | DER: PRODS)
             ══════════════════════════════════════════════════════════════════ */}
          {pestañaActiva === 'catalogo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ── COLUMNA IZQUIERDA: OPCIONES & FILTROS ── */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* 1. Proveedor */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[16px]">storefront</span>
                      <span>Tienda Proveedora en Pucallpa</span>
                    </label>
                    <span className="text-[10px] font-bold text-slate-500">
                      {tiendasAliadas.length} aliada{tiendasAliadas.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <select
                    value={tiendaSeleccionada}
                    onChange={(e) => setTiendaSeleccionada(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500 bg-slate-50"
                  >
                    {tiendasAliadas.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name} ({t.category || 'Variados'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Los productos que elijas saldrán del inventario de este proveedor local con entrega rápida en Pucallpa.
                  </p>
                </div>

                {/* 2. Margen de Ganancia */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[16px]">trending_up</span>
                      <span>Tu Margen de Ganancia</span>
                    </label>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      +{margenPorcentaje}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Este porcentaje se suma al costo del proveedor. Tú cobras el precio final a tu cliente y te quedas con la ganancia.
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 10, 15, 20, 25].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMargenPorcentaje(m)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                          margenPorcentaje === m
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m === 0 ? '0%' : `+${m}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Categorías de la Tienda (Conteo dinámico) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[16px]">category</span>
                      <span>Categorías de {tiendasAliadas.find((t) => t.slug === tiendaSeleccionada)?.name || 'la tienda'}</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {categoriasDisponibles.length} rubros
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setFiltroCategoria('todas')}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                        filtroCategoria === 'todas'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>Todas las categorías</span>
                      <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full">
                        {productosDisponibles.length}
                      </span>
                    </button>
                    {categoriasDisponibles.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setFiltroCategoria(cat.name)}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                          filtroCategoria.toLowerCase() === cat.name.toLowerCase()
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full">
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Resumen de Selección */}
                <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/80 p-4 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-950">Productos seleccionados:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {productosSeleccionados.size} de {productosDisponibles.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 leading-snug">
                    Solo los productos marcados aparecerán en tu catálogo público para tus clientes.
                  </p>
                </div>
              </div>

              {/* ── COLUMNA DERECHA: GRILLA DE PRODUCTOS ── */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* Barra de Búsqueda y Botones de Selección Rápida */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <span className="material-symbols-outlined text-slate-400 absolute left-3 top-2.5 text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 bg-slate-50"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setProductosSeleccionados(new Set(productosDisponibles.map((p) => p.id)))}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                    >
                      Marcar todos ({productosDisponibles.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setProductosSeleccionados(new Set())}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      Desmarcar todos
                    </button>
                  </div>
                </div>

                {/* Listado de Productos */}
                {cargandoProductos ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-emerald-600 animate-spin">
                      progress_activity
                    </span>
                    <p className="text-xs text-slate-500 font-medium">Cargando productos de la tienda aliada...</p>
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
                    <p className="text-sm font-bold text-slate-700">No hay productos con este filtro</p>
                    <p className="text-xs text-slate-400 mt-1">Prueba con otra categoría o borra el término de búsqueda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {productosFiltrados.map((prod) => {
                      const isSelected = productosSeleccionados.has(prod.id);
                      const precioPVP = calcularPrecio(prod.price);
                      const ganancia = calcularGanancia(prod.price);

                      return (
                        <div
                          key={prod.id}
                          onClick={() => toggleProducto(prod.id)}
                          className={`rounded-2xl border p-3 flex flex-col justify-between transition cursor-pointer bg-white relative select-none ${
                            isSelected
                              ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                              : 'border-slate-200 opacity-60 hover:opacity-90'
                          }`}
                        >
                          {/* Checkbox superior */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                              {prod.category || 'General'}
                            </span>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                                isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && (
                                <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                              )}
                            </div>
                          </div>

                          {/* Imagen y Nombre */}
                          <div className="flex items-center gap-2.5 mb-2.5">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-12 h-12 object-cover rounded-xl bg-slate-100 shrink-0 border border-slate-100"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <span className="material-symbols-outlined text-xl">image</span>
                              </div>
                            )}
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                              {prod.name}
                            </h4>
                          </div>

                          {/* Precios: Costo Proveedor + Venta al Cliente + Ganancia */}
                          <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-xs flex flex-col gap-1 mt-auto">
                            <div className="flex items-center justify-between text-slate-500 text-[11px]">
                              <span>Costo proveedor:</span>
                              <span className="font-semibold">S/ {prod.price.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-900 font-extrabold">
                              <span>Precio al cliente:</span>
                              <span className="text-emerald-700 font-black">S/ {precioPVP}</span>
                            </div>
                            {margenPorcentaje > 0 && (
                              <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold pt-1 border-t border-slate-200/60">
                                <span>Tu ganancia:</span>
                                <span className="bg-emerald-100 px-1.5 py-0.2 rounded">+S/ {ganancia}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 2: VISTA PREVIA DE MI TIENDA (PRIVADA)
             ══════════════════════════════════════════════════════════════════ */}
          {pestañaActiva === 'preview' && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-amber-900 font-medium">
                  <span className="material-symbols-outlined text-amber-700 text-xl shrink-0">visibility</span>
                  <span>
                    <b>Simulación Privada:</b> Así verán tus clientes tu catálogo en internet una vez que el administrador active tu tienda.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAvisoAsesor(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition shrink-0 cursor-pointer"
                >
                  Solicitar Activación
                </button>
              </div>

              {/* Maqueta de la tienda pública */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Cabecera de la tienda simulada */}
                <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md">
                      {nombreTienda.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black">{nombreTienda}</h2>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Tienda Oficial
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Catálogo de {nombre} · Envíos en {ciudad}
                      </p>
                    </div>
                  </div>

                  <a
                    href={waLink(whatsapp, `Hola ${nombreTienda}, quiero consultar por un producto de tu catálogo.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-[#20ba5a] transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>Pedir al WhatsApp: {whatsapp}</span>
                  </a>
                </div>

                {/* Catálogo de la tienda simulada */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Productos Disponibles ({prodsElegidos.length})
                    </h3>
                    <span className="text-xs text-slate-500">Precios finales para clientes</span>
                  </div>

                  {prodsElegidos.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 font-semibold">
                        Aún no has marcado productos para tu tienda.
                      </p>
                      <button
                        onClick={() => setPestañaActiva('catalogo')}
                        className="mt-2 text-xs font-bold text-emerald-700 underline cursor-pointer"
                      >
                        Ir a elegir productos →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                      {prodsElegidos.map((prod) => (
                        <div
                          key={prod.id}
                          className="bg-white rounded-2xl border border-slate-100 p-2.5 shadow-2xs flex flex-col justify-between"
                        >
                          <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2">
                            {prod.image ? (
                              <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-2xl">image</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              {prod.category}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{prod.name}</h4>
                            <p className="text-sm font-black text-emerald-700 mt-1">
                              S/ {calcularPrecio(prod.price)}
                            </p>
                          </div>
                          <a
                            href={waLink(
                              whatsapp,
                              `Hola ${nombreTienda}! Quiero comprar "${prod.name}" a S/ ${calcularPrecio(prod.price)}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2.5 w-full py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366] text-[#128C7E] hover:text-white text-[11px] font-bold text-center transition flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">chat</span>
                            <span>Pedir</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 3: GANAR CON AFILIADOS (OPCIONES CONTINUAS DE DINERO)
             ══════════════════════════════════════════════════════════════════ */}
          {pestañaActiva === 'afiliados' && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in">
              {/* Banner Encabezado */}
              <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 max-w-xl">
                  <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-3">
                    <span className="material-symbols-outlined text-[14px]">payments</span>
                    Ingresos Adicionales en Efectivo
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                    Multiplica tus ganancias recomendando negocios y choferes
                  </h2>
                  <p className="mt-2 text-white/90 text-xs sm:text-sm leading-relaxed">
                    Además de vender productos con tu catálogo de revendedor, puedes ganar bonos en efectivo directo a tu Yape o Plin por cada comercio o conductor que invites a la plataforma.
                  </p>
                </div>
              </div>

              {/* 2 Opciones de Afiliación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Opción 1: Recomendar Comercios */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-emerald-300 transition">
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">storefront</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">Recomendar Comercios</h3>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Bono Directo</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        ¿Conoces una pollería, restaurante, bodega, boutique de ropa o ferretería en Pucallpa que aún no vende por internet?
                      </p>
                    </div>

                    <ul className="text-xs text-slate-600 flex flex-col gap-1.5 pt-1">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                        <span>Nos pasas el número del dueño o negocio.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                        <span>BogaHub lo asesora y le crea su menú o catálogo.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                        <span><b>Cobras tu bono en efectivo</b> apenas se active.</span>
                      </li>
                    </ul>
                  </div>

                  <a
                    href={waLink(
                      wspBoga,
                      `Hola BogaHub! Soy ${nombre} (dueño de la tienda de reventa "${nombreTienda}", correo: ${user?.email || 'N/A'}). Quiero postular a un comercio o negocio local para ganar el bono de afiliado.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-sm transition active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>Recomendar Comercio por WhatsApp</span>
                  </a>
                </div>

                {/* Opción 2: Recomendar Conductores */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-emerald-300 transition">
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">local_taxi</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">Recomendar Choferes</h3>
                        <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Taxi / Mototaxi</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Invita a conductores de taxi auto o mototaxi en Pucallpa a recibir carreras seguras y directas con Boga Taxi.
                      </p>
                    </div>

                    <ul className="text-xs text-slate-600 flex flex-col gap-1.5 pt-1">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-600 text-[16px]">check_circle</span>
                        <span>Registras al conductor amigo o conocido.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-600 text-[16px]">check_circle</span>
                        <span>Se valida su brevete y vehículo.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-600 text-[16px]">check_circle</span>
                        <span><b>Ganas tu comisión en efectivo</b> por su activación.</span>
                      </li>
                    </ul>
                  </div>

                  <a
                    href={waLink(
                      wspBoga,
                      `Hola BogaHub! Soy ${nombre} (dueño de la tienda de reventa "${nombreTienda}", correo: ${user?.email || 'N/A'}). Tengo choferes de taxi o mototaxi para registrar y quiero coordinar mi bono de afiliado.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-sm transition active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>Recomendar Chofer por WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Cómo se pagan los bonos */}
              <div className="bg-slate-100 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-600 text-3xl">currency_exchange</span>
                  <div className="text-xs">
                    <p className="font-extrabold text-slate-900">¿Cómo cobro mis bonos?</p>
                    <p className="text-slate-600">Se abonan directamente a tu Yape, Plin o cuenta bancaria sin demoras tras la activación del comercio o chofer.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAvisoAsesor(true)}
                  className="bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition shrink-0 cursor-pointer"
                >
                  Consultar con Asesor
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              PESTAÑA 4: AJUSTES & ESTADO (TIENDA EN GRIS / ACTIVACIÓN)
             ══════════════════════════════════════════════════════════════════ */}
          {pestañaActiva === 'ajustes' && (
            <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in">
              {/* Tarjeta de Estado de la Tienda */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900">Estado de tu Tienda</h3>
                  {estadoTienda === 'desactivada' ? (
                    <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Desactivada (En gris / Borrador)
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
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
                    <label className="block font-bold text-slate-500 mb-1">Cuenta vinculada (Correo)</label>
                    <p className="font-bold text-emerald-800 text-sm">{user?.email || 'Guardado local'}</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">WhatsApp de pedidos</label>
                    <p className="font-bold text-slate-900 text-sm">{whatsapp}</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Ciudad / Distrito</label>
                    <p className="font-bold text-slate-900 text-sm capitalize">{ciudad}</p>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">ID de Usuario BogaHub</label>
                    <p className="font-mono text-slate-600 text-xs truncate">{user?.id || 'Sesión anónima'}</p>
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
                {user?.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cuenta / Correo:</span>
                    <span className="font-bold text-emerald-700">{user.email}</span>
                  </div>
                )}
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
                    `Hola BogaHub! Acabo de crear mi tienda de reventa "${nombreTienda}" a nombre de ${nombre} (Correo: ${user?.email || 'N/A'}, WhatsApp: ${whatsapp}, Ciudad: ${ciudad}). Quiero asegurar la activación de mi tienda para que pase de gris a activa y empezar a vender.`
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
  // PANTALLA 1: HOME DE GANAR DINERO (CONMUTADOR REVENTA / AFILIADOS)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between overflow-y-auto lg:overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior Slim con Autenticación ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="BogaHub" className="w-6 h-6" />
            <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">BogaHub</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gana Dinero · Reventa & Afiliados
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 hidden sm:inline">
                  Hola, <b>{user.user_metadata?.full_name || user.email?.split('@')[0]}</b>
                </span>
                <Link
                  href="/profile"
                  className="text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">account_circle</span>
                  <span>Mi Cuenta</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login?redirect=/revendedores"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/login?modo=registro&redirect=/revendedores"
                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition shadow-xs hidden sm:inline-block"
                >
                  Crear Cuenta
                </Link>
              </div>
            )}

            <div className="h-4 w-px bg-slate-200" />

            <Link
              href="/trabajos"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              <span className="hidden sm:inline">Volver a</span> Trabajos
            </Link>
          </div>
        </div>
      </header>

      {/* ── Contenido Principal ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-3 w-full flex flex-col justify-center">
        {/* Conmutador de Opciones para hacer Dinero */}
        <div className="flex items-center justify-center mb-3">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setOpcionHome('reventa')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                opcionHome === 'reventa'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span>1. Catálogo de Reventa (Dropshipping)</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">Sin inversión</span>
            </button>
            <button
              type="button"
              onClick={() => setOpcionHome('afiliados')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                opcionHome === 'afiliados'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">volunteer_activism</span>
              <span>2. Programa de Afiliados</span>
              <span className="bg-teal-100 text-teal-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">Bono efectivo</span>
            </button>
          </div>
        </div>

        {/* ── OPCIÓN 1: CATÁLOGO DE REVENTA / DROPSHIPPING ── */}
        {opcionHome === 'reventa' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center w-full animate-in fade-in">
            {/* LADO IZQUIERDO: Propuesta de valor compacta */}
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

            {/* LADO DERECHO: Formulario con Auth Gate Obligatorio */}
            <div className="lg:col-span-7">
              {authLoading ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8 flex flex-col items-center justify-center min-h-[260px]">
                  <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Verificando tu sesión en BogaHub...</p>
                </div>
              ) : !user ? (
                /* Auth Gate: Solicitar inicio de sesión para ligar la tienda */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex items-start gap-3.5 border-b border-slate-100 pb-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">lock</span>
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Requisito para activar catálogo
                      </span>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                        Inicia sesión para crear tu tienda de reventa
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Para que tu tienda, catálogo y ganancias queden <b>vinculados a tu correo</b> y puedas administrarlos desde tu celular o computadora.
                      </p>
                    </div>
                  </div>

                  {/* 3 Beneficios del login */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">devices</span>
                      <p className="font-bold text-slate-900 text-[11px] mt-1">Multi-dispositivo</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Tu catálogo guardado en tu cuenta.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">shield_person</span>
                      <p className="font-bold text-slate-900 text-[11px] mt-1">100% Tuyo</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Solo tú manejas tus márgenes.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                      <p className="font-bold text-slate-900 text-[11px] mt-1">Activación Rápida</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Aprobación directa con tu correo.</p>
                    </div>
                  </div>

                  {/* Botón de Inicio de Sesión */}
                  <div className="pt-1 flex flex-col gap-2">
                    <Link
                      href="/login?redirect=/revendedores"
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">login</span>
                      <span>Iniciar Sesión con mi Correo</span>
                    </Link>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-0.5">
                      <span>¿No tienes cuenta aún?</span>
                      <Link
                        href="/login?modo=registro&redirect=/revendedores"
                        className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        Registrarme gratis →
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                /* Formulario cuando SÍ tiene sesión iniciada */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-5">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {/* Badge de cuenta vinculada */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(user.email?.[0] || 'U').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">Tu tienda quedará vinculada a:</p>
                          <p className="font-extrabold text-slate-900 truncate text-[11px] sm:text-xs">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                        Verificado ✓
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
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

                    {/* FILA 1: Nombre + WhatsApp (2 columnas) */}
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

                    {/* FILA 2: Nombre de Tienda + Ciudad (2 columnas) */}
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

                    {/* Botón CTA de Envío */}
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
              )}
            </div>
          </div>
        )}

        {/* ── OPCIÓN 2: PROGRAMA DE AFILIADOS (BONOS EN EFECTIVO) ── */}
        {opcionHome === 'afiliados' && (
          <div className="max-w-4xl mx-auto w-full py-1 animate-in fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-md flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-1.5">
                    <span className="material-symbols-outlined text-[13px]">payments</span>
                    Programa de Afiliados Oficial BogaHub
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                    Gana bonos en efectivo recomendando negocios y choferes
                  </h2>
                  <p className="mt-1 text-slate-600 text-xs">
                    Recomienda comercios o conductores en Pucallpa y recibe tu bono directo a Yape o Plin por cada activación confirmada.
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
                    Bonos ilimitados
                  </span>
                </div>
              </div>

              {/* 2 Tarjetas de Recomendación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-xl">storefront</span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Recomienda Comercios Locales</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Restaurantes, pollerías, bodegas, boutiques de moda o servicios. Conectamos su negocio con miles de pucallpinos.
                    </p>
                    <div className="text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      💰 Bono en efectivo directo por comercio activado
                    </div>
                  </div>
                  <a
                    href={waLink(
                      wspBoga,
                      `Hola BogaHub! Quiero recomendar un comercio local para que forme parte de BogaHub y coordinar mi bono de afiliado.${user?.email ? ` (Mi correo: ${user.email})` : ''}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    <span>Recomendar Comercio por WhatsApp</span>
                  </a>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-xl">local_taxi</span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Recomienda Choferes (Taxi / Mototaxi)</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Conductores con brevete y vehículo propio que quieran carreras seguras con tarifas justas y pagos al instante.
                    </p>
                    <div className="text-[11px] text-teal-800 font-bold bg-teal-50 border border-teal-200 px-2 py-1 rounded-lg">
                      🚗 Bono por cada conductor verificado y activado
                    </div>
                  </div>
                  <a
                    href={waLink(
                      wspBoga,
                      `Hola BogaHub! Quiero recomendar a un conductor de taxi o mototaxi para Boga Taxi y coordinar mi bono de afiliado.${user?.email ? ` (Mi correo: ${user.email})` : ''}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    <span>Recomendar Chofer por WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* 3 Pasos sencillos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Contactas a tu conocido o dueño del local.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>El equipo de BogaHub valida y da de alta su cuenta.</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span><b>Recibes tu bono por Yape / Plin al instante.</b></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Pie de página sutil (sin scroll) ── */}
      <footer className="w-full py-2 text-center text-[10px] text-slate-400 shrink-0">
        <p>© {new Date().getFullYear()} BogaHub Pucallpa · Reventa & Afiliados</p>
      </footer>
    </div>
  );
}
