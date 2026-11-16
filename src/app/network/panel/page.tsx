'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { CIUDADES } from '@/lib/ciudades';

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

export default function RevendedorPanelPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Datos de la tienda del revendedor
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [ciudad, setCiudad] = useState('pucallpa');
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [tieneTienda, setTieneTienda] = useState(false);
  const [wspBoga, setWspBoga] = useState('51987911213');

  // Estado del panel
  const [pestañaActiva, setPestañaActiva] = useState<'catalogo' | 'preview' | 'afiliados' | 'ajustes'>('catalogo');
  const [modalAvisoAsesor, setModalAvisoAsesor] = useState(false);
  const [estadoTienda, setEstadoTienda] = useState<'desactivada' | 'activa'>('desactivada');
  const [copiado, setCopiado] = useState(false);
  const [guardandoEnNube, setGuardandoEnNube] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Link público y slug de la tienda
  const slugTienda = (nombreTienda || 'tienda')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const [origin, setOrigin] = useState('https://bogahub.app');
  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const linkTienda = `${origin}/${slugTienda}`;

  const copiarLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(linkTienda);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  // Catálogo y filtros
  const [tiendasAliadas, setTiendasAliadas] = useState<TiendaAliada[]>([]);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<string>('delva');
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

    // Cargar tiendas aliadas: delva siempre activa, resto solo si tienen permite_revendedores === true
    supabase
      .from('stores')
      .select('slug, name, marketplace_category, logo_image, notas_revendedores, permite_revendedores')
      .limit(30)
      .then(({ data }) => {
        const permitidas = (data || []).filter((s: any) => s.slug === 'delva' || s.permite_revendedores === true);
        const lista = permitidas.length > 0 ? permitidas : [{ slug: 'delva', name: 'delva', marketplace_category: 'Moda y Belleza' }];
        const mapped: TiendaAliada[] = lista.map((s: any) => ({
          slug: s.slug,
          name: s.name,
          category: s.marketplace_category || 'General',
          logo: s.logo_image,
          notas: s.notas_revendedores || 'Tienda aliada verificada en Pucallpa',
        }));
        setTiendasAliadas(mapped);
        if (mapped.length > 0) {
          setTiendaSeleccionada((prev) => prev || 'delva');
        }
      });

    // Activar delva en la base de datos
    supabase.from('stores').update({ permite_revendedores: true }).eq('slug', 'delva').then(() => {});
  }, []);

  // Cargar datos de la tienda vinculada
  useEffect(() => {
    if (authLoading) return;

    const userDraftKey = user ? `boga_revendedor_draft_${user.id}` : null;

    // Si el usuario tiene sesión, la base de datos es la única fuente de la verdad
    if (user?.email) {
      supabase
        .from('store_requests')
        .select('business_name, contact_name, whatsapp, city, description, status')
        .eq('email', user.email)
        .eq('interest', 'revendedor')
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0 && data[0].business_name) {
            const req = data[0];
            setNombreTienda(req.business_name);
            setNombre(req.contact_name || user.user_metadata?.full_name || '');
            setWhatsapp(req.whatsapp || '');
            if (req.city) setCiudad(req.city);
            if (req.status === 'approved') setEstadoTienda('activa');
            setTieneTienda(true);

            // Cargar preferencias locales (márgenes y productos elegidos)
            try {
              const raw = typeof window !== 'undefined'
                ? ((userDraftKey && localStorage.getItem(userDraftKey)) || localStorage.getItem('boga_revendedor_draft'))
                : null;
              if (raw) {
                const p = JSON.parse(raw);
                if (p.margenPorcentaje !== undefined) setMargenPorcentaje(p.margenPorcentaje);
                if (p.tiendaSeleccionada) setTiendaSeleccionada(p.tiendaSeleccionada);
                if (p.productosSeleccionados && Array.isArray(p.productosSeleccionados)) {
                  setProductosSeleccionados(new Set(p.productosSeleccionados));
                }
              }
            } catch (e) {
              console.warn('Error leyendo preferencias locales:', e);
            }

            // Sincronizar también con la configuración guardada en el servidor
            const sSlug = (req.business_name || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');

            fetch(`/api/network/tienda?slug=${sSlug}`)
              .then((r) => r.json())
              .then((res) => {
                if (res.ok && res.tienda) {
                  if (typeof res.tienda.margenPorcentaje === 'number') {
                    setMargenPorcentaje(res.tienda.margenPorcentaje);
                  }
                  if (res.tienda.tiendaProveedora) {
                    setTiendaSeleccionada(res.tienda.tiendaProveedora);
                  }
                  if (Array.isArray(res.tienda.productosSeleccionados) && res.tienda.productosSeleccionados.length > 0) {
                    setProductosSeleccionados(new Set(res.tienda.productosSeleccionados));
                  }
                }
              })
              .catch(() => {});
          } else {
            // NO EXISTE EN SUPABASE (Fue borrada por el Superadmin)
            try {
              if (userDraftKey) localStorage.removeItem(userDraftKey);
              localStorage.removeItem('boga_revendedor_draft');
            } catch {}
            setTieneTienda(false);
            setNombreTienda('');
          }
          setCargandoDatos(false);
        });
    } else {
      // Usuario anónimo / sin sesión: revisar borrador temporal en localStorage
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('boga_revendedor_draft') : null;
        if (raw) {
          const p = JSON.parse(raw);
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
            setTieneTienda(true);
          } else {
            setTieneTienda(false);
          }
        } else {
          setTieneTienda(false);
        }
      } catch {
        setTieneTienda(false);
      }
      setCargandoDatos(false);
    }
  }, [user, authLoading]);

  // Guardar configuración en la base de datos (para que la tienda pública la use siempre)
  const guardarEnServidor = useCallback(async () => {
    if (!tieneTienda || !nombreTienda) return;
    setGuardandoEnNube(true);
    try {
      await fetch('/api/network/tienda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slugTienda,
          nombreTienda,
          nombre,
          whatsapp,
          ciudad,
          margenPorcentaje,
          tiendaSeleccionada,
          productosSeleccionados: Array.from(productosSeleccionados),
        }),
      });
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 2500);
    } catch (e) {
      console.warn('Error guardando tienda en servidor:', e);
    } finally {
      setGuardandoEnNube(false);
    }
  }, [tieneTienda, nombreTienda, slugTienda, nombre, whatsapp, ciudad, margenPorcentaje, tiendaSeleccionada, productosSeleccionados]);

  // Persistir cambios en localStorage y en el servidor
  useEffect(() => {
    if (!tieneTienda || !nombreTienda) return;
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

    const timer = setTimeout(() => {
      guardarEnServidor();
    }, 1200);

    return () => clearTimeout(timer);
  }, [tieneTienda, nombre, whatsapp, nombreTienda, ciudad, margenPorcentaje, tiendaSeleccionada, productosSeleccionados, user, guardarEnServidor]);

  // Cargar productos del proveedor seleccionado (SIN filtro is_available para que carguen todos los productos de delva)
  useEffect(() => {
    if (!tiendaSeleccionada || !tieneTienda) return;
    setCargandoProductos(true);
    setFiltroCategoria('todas');
    setBusqueda('');

    supabase
      .from('products')
      .select('id, name, price, category, image, store, status')
      .eq('store', tiendaSeleccionada)
      .order('name')
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al cargar productos de proveedor:', error);
        }
        const prods = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          category: p.category || 'General',
          image: p.image,
          store: p.store,
        }));
        setProductosDisponibles(prods);

        setProductosSeleccionados((prev) => {
          if (prev.size === 0) {
            return new Set(prods.map((x) => x.id));
          }
          return prev;
        });

        setCargandoProductos(false);
      });
  }, [tiendaSeleccionada, tieneTienda]);

  // Categorías con conteo dinámico
  const categoriasDisponibles = useMemo(() => {
    const map: Record<string, number> = {};
    productosDisponibles.forEach((p) => {
      const cat = (p.category || 'General').trim();
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [productosDisponibles]);

  // Filtro de productos
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

  const handleRegistrarOtra = () => {
    if (confirm('¿Deseas salir de este panel para registrar una nueva tienda de reventa?')) {
      try {
        if (user?.id) localStorage.removeItem(`boga_revendedor_draft_${user.id}`);
        localStorage.removeItem('boga_revendedor_draft');
      } catch {}
      router.push('/network');
    }
  };

  // ── ESTADO DE CARGA ──
  if (authLoading || cargandoDatos) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <span className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-700">Cargando tu Panel de Revendedor...</p>
        <p className="text-[11px] text-slate-400 mt-1">Conectando con tu cuenta en Boga Network</p>
      </div>
    );
  }

  // ── SI NO TIENE TIENDA CREADA AÚN ──
  if (!tieneTienda) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
        <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
            <Link href="/network" className="flex items-center gap-2">
              <img src="/logo-mark.svg" alt="Boga Network" className="w-6 h-6" />
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">Boga Network</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Panel de Revendedor
              </span>
            </Link>
            <Link
              href="/network"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              <span>Ver Información</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">storefront</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Aún no tienes una tienda de reventa</h1>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Crea tu tienda con tu propia marca en solo 2 minutos. Elige productos locales de Pucallpa sin invertir en mercadería y fija tus ganancias.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 w-full">
            <Link
              href="/network"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md transition"
            >
              Crear Mi Tienda de Reventa Ahora →
            </Link>
            <Link
              href="/trabajos"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
            >
              Volver a bolsa de Trabajos
            </Link>
          </div>
        </main>

        <footer className="w-full py-3 text-center text-[10px] text-slate-400">
          © {new Date().getFullYear()} Boga Network Pucallpa
        </footer>
      </div>
    );
  }

  // ── PANEL PRINCIPAL ──
  const prodsElegidos = productosDisponibles.filter((p) => productosSeleccionados.has(p.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior del Admin del Revendedor ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-mark.svg" alt="Boga Network" className="w-7 h-7" />
              <span className="font-extrabold text-slate-900 text-sm tracking-tight hidden sm:inline">Boga Network</span>
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

            <Link
              href="/network"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition flex items-center gap-1"
              title="Ver página informativa pública"
            >
              <span className="material-symbols-outlined text-[15px]">info</span>
              <span className="hidden md:inline">Ver Info</span>
            </Link>

            <button
              type="button"
              onClick={handleRegistrarOtra}
              title="Salir y registrar otra tienda"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">add_business</span>
              <span className="hidden sm:inline">Nueva tienda</span>
            </button>

            {estadoTienda === 'activa' ? (
              <div className="flex items-center gap-1.5">
                <a
                  href={`/${slugTienda}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>Ver Mi Tienda</span>
                </a>
                <button
                  type="button"
                  onClick={copiarLink}
                  className="inline-flex items-center gap-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-2 rounded-xl shadow-2xs transition cursor-pointer"
                  title="Copiar link de mi tienda"
                >
                  <span className="material-symbols-outlined text-[16px]">{copiado ? 'check' : 'content_copy'}</span>
                  <span className="hidden sm:inline">{copiado ? '¡Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setModalAvisoAsesor(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>Asegurar activación con Asesor</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Banner de Estado en Gris / Borrador ── */}
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

      {/* ── Banner de Tienda Activa con Enlace Público ── */}
      {estadoTienda === 'activa' && (
        <div className="bg-emerald-50/90 border-b border-emerald-200 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-950 font-medium truncate">
              <span className="material-symbols-outlined text-emerald-600 text-[20px] shrink-0">verified</span>
              <span className="truncate">
                <b>¡Tu tienda está ACTIVA en Boga Market!</b> Link oficial:{' '}
                <a
                  href={`/${slugTienda}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-emerald-800 underline ml-1"
                >
                  {linkTienda}
                </a>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copiarLink}
                className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100/50 transition cursor-pointer flex items-center gap-1 shadow-2xs text-[11px]"
              >
                <span className="material-symbols-outlined text-[14px]">{copiado ? 'check' : 'content_copy'}</span>
                <span>{copiado ? '¡Copiado!' : 'Copiar'}</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `¡Hola! Ya abrí mi tienda virtual "${nombreTienda}". Puedes ver mi catálogo y hacer pedidos directo aquí: ${linkTienda}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold transition flex items-center gap-1 shadow-xs text-[11px]"
              >
                <span className="material-symbols-outlined text-[14px]">share</span>
                <span>Compartir</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de Pestañas: Continuidad de Opciones para Ganar Dinero ── */}
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
            {estadoTienda === 'activa' ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pública
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                Privada
              </span>
            )}
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
            {estadoTienda === 'activa' ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                Activa
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                En gris
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Contenido Principal según Pestaña ── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {/* ══ PESTAÑA 1: CATÁLOGO & PRODUCTOS (LAYOUT IZQ: OPCIONES | DER: PRODS) ══ */}
        {pestañaActiva === 'catalogo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUMNA IZQUIERDA: OPCIONES & FILTROS */}
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

                {/* Indicador de sincronización con la tienda online */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  {guardandoEnNube ? (
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] animate-spin text-emerald-600">progress_activity</span>
                      Sincronizando con tienda online...
                    </span>
                  ) : guardadoExitoso ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                      ¡Actualizado en tu tienda pública!
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={guardarEnServidor}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">cloud_done</span>
                      Guardar en tienda online
                    </button>
                  )}
                  <a
                    href={`/${slugTienda}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                  >
                    <span>Ver</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
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

            {/* COLUMNA DERECHA: GRILLA DE PRODUCTOS */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Barra de Búsqueda y Selección Rápida */}
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

        {/* ══ PESTAÑA 2: VISTA PREVIA DE MI TIENDA ══ */}
        {pestañaActiva === 'preview' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-5 animate-in fade-in">
            {estadoTienda === 'activa' ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">verified</span>
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                      ¡Tu tienda está ACTIVA y pública en internet!
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </p>
                    <p className="text-emerald-700 mt-0.5">
                      Link público:{' '}
                      <a
                        href={`/${slugTienda}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-bold underline text-emerald-900"
                      >
                        {linkTienda}
                      </a>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={copiarLink}
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100/50 transition cursor-pointer flex items-center gap-1.5 shadow-2xs text-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">{copiado ? 'check' : 'content_copy'}</span>
                    <span>{copiado ? '¡Copiado!' : 'Copiar Link'}</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `¡Hola! Ya abrí mi tienda virtual "${nombreTienda}". Puedes ver mi catálogo y hacer pedidos directo aquí: ${linkTienda}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold transition flex items-center gap-1.5 shadow-xs text-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    <span>Compartir en WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
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
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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

        {/* ══ PESTAÑA 3: GANAR CON AFILIADOS (OPCIONES CONTINUAS DE DINERO) ══ */}
        {pestañaActiva === 'afiliados' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      <span>Boga Network lo asesora y le crea su menú o catálogo.</span>
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
                    `Hola Boga Network! Soy ${nombre} (dueño de la tienda de reventa "${nombreTienda}", correo: ${user?.email || 'N/A'}). Quiero postular a un comercio o negocio local para ganar el bono de afiliado.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-sm transition active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Recomendar Comercio por WhatsApp</span>
                </a>
              </div>

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
                    `Hola Boga Network! Soy ${nombre} (dueño de la tienda de reventa "${nombreTienda}", correo: ${user?.email || 'N/A'}). Tengo choferes de taxi o mototaxi para registrar y quiero coordinar mi bono de afiliado.`
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

        {/* ══ PESTAÑA 4: AJUSTES & ESTADO (TIENDA EN GRIS / ACTIVACIÓN) ══ */}
        {pestañaActiva === 'ajustes' && (
          <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in">
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

              {estadoTienda === 'activa' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-700 text-lg">check_circle</span>
                      Tu tienda está activa y visible en Boga Market
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Online
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Tu Enlace Público Oficial:</p>
                      <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm truncate">{linkTienda}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={copiarLink}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition flex items-center gap-1 text-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">{copiado ? 'check' : 'content_copy'}</span>
                        <span>{copiado ? 'Copiado' : 'Copiar'}</span>
                      </button>
                      <a
                        href={`/${slugTienda}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1 text-xs shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                        <span>Abrir Tienda</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <>
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
                        Para que la tienda pase a <b>Activa (Verde)</b> y los clientes puedan encontrarte en Boga Market y pedirte por WhatsApp, el administrador de Boga Network debe aceptar y validar tu solicitud.
                      </p>
                    </div>
                  </div>

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
                </>
              )}
            </div>

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
                  <label className="block font-bold text-slate-500 mb-1">ID de Usuario Boga Network</label>
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
                <p className="text-xs text-slate-500 font-medium">Avisar al equipo de Boga Network por WhatsApp</p>
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
                  `Hola Boga Network! Acabo de crear mi tienda de reventa "${nombreTienda}" a nombre de ${nombre} (Correo: ${user?.email || 'N/A'}, WhatsApp: ${whatsapp}, Ciudad: ${ciudad}). Quiero asegurar la activación de mi tienda para que pase de gris a activa y empezar a vender.`
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
