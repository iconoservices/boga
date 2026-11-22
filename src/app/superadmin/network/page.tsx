'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';

type SolicitudRevendedor = {
  id: string;
  contact_name: string;
  business_name: string;
  whatsapp: string;
  city: string;
  email: string;
  interest: string;
  category: string;
  description: string;
  status: string; // 'pending' | 'approved' | 'rejected'
  created_at: string;
};

type TiendaStore = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  whatsapp?: string;
  user_id?: string;
  plan?: string;
  created_at?: string;
  tienda_proveedora?: string;
  modulos?: Record<string, any>;
  es_revendedor?: boolean;
  template?: string;
};

type TiendaItem = {
  id: string;
  solicitud?: SolicitudRevendedor;
  store?: TiendaStore;
  nombre: string;
  slug: string;
  estaActiva: boolean;
  fecha: string;
};

type PerfilAfiliadoGroup = {
  id: string;
  key: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  city: string;
  perfilSolicitud?: SolicitudRevendedor;
  estadoPerfil: 'approved' | 'pending';
  fechaRegistro: string;
  tiendas: TiendaItem[];
};

export default function SuperadminNetworkPage() {
  const router = useRouter();
  const { esSuperadmin, cargando } = useEsSuperadmin();

  const [solicitudes, setSolicitudes] = useState<SolicitudRevendedor[]>([]);
  const [stores, setStores] = useState<TiendaStore[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'con_tiendas' | 'sin_tiendas'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activas' | 'pendientes'>('todos');
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState('');
  const [tiendaDetalle, setTiendaDetalle] = useState<{
    tienda: TiendaItem;
    afiliado: PerfilAfiliadoGroup;
  } | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Redirigir si no es superadmin
  useEffect(() => {
    if (!cargando && !esSuperadmin) {
      router.replace('/login?redirect=/superadmin/network');
    }
  }, [cargando, esSuperadmin, router]);

  const getAuthToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  };

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const d = await res.json();
        setSolicitudes(d.solicitudes || []);
        setStores(d.stores || []);
      } else {
        const { data: reqData } = await supabase
          .from('store_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (reqData) setSolicitudes(reqData as SolicitudRevendedor[]);
      }
    } catch (err) {
      console.warn('Error al cargar datos en superadmin/network:', err);
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  useEffect(() => {
    if (esSuperadmin) {
      document.title = 'Boga Admin · Afiliados y Tiendas (Network)';
      cargarDatos();
    }
  }, [esSuperadmin, cargarDatos]);

  // Helper para verificar si un registro es de perfil de afiliado
  const esPerfilAfiliado = (sol: SolicitudRevendedor) => {
    return (
      sol.category === 'perfil' ||
      sol.description?.includes('Perfil de usuario activado en Boga Network') ||
      sol.description?.includes('Cuenta de dropshipping / revendedor activada desde Boga Network') ||
      sol.business_name?.startsWith('[Perfil]')
    );
  };

  const encontrarStore = (nombreTienda: string, slugDeseado: string, email?: string, wsp?: string) => {
    return stores.find((st) => {
      if (st.slug && slugDeseado && (st.slug === slugDeseado || st.slug === `${slugDeseado}-bm` || st.slug.replace(/-bm$/, '') === slugDeseado)) {
        return true;
      }
      if (st.name && nombreTienda && st.name.toLowerCase() === nombreTienda.toLowerCase()) {
        return true;
      }
      if (st.whatsapp && wsp && st.whatsapp.replace(/\D/g, '') === wsp.replace(/\D/g, '')) {
        return true;
      }
      return false;
    });
  };

  const obtenerSlug = (nombre: string, st?: TiendaStore) => {
    if (st?.slug) return st.slug;
    return (nombre || 'tienda')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // ── AGRUPAR POR CUENTA / PERFIL DE AFILIADO ──
  // Cada afiliado tiene 1 perfil y 0 o más tiendas de reventa asociadas
  const afiliadosAgrupados: PerfilAfiliadoGroup[] = useMemo(() => {
    const mapa = new Map<string, PerfilAfiliadoGroup>();

    solicitudes.forEach((sol) => {
      const emailKey = sol.email?.trim().toLowerCase();
      const wspKey = sol.whatsapp?.replace(/\D/g, '');
      const key = emailKey || (wspKey ? `wsp_${wspKey}` : `id_${sol.id}`);

      let grupo = mapa.get(key);
      if (!grupo) {
        const cleanName = sol.contact_name || sol.business_name.replace(/^\[Perfil\]\s*/i, '') || 'Usuario Network';
        grupo = {
          id: sol.id,
          key,
          contact_name: cleanName,
          email: sol.email || '',
          whatsapp: sol.whatsapp || '',
          city: sol.city || 'Pucallpa',
          estadoPerfil: 'pending',
          fechaRegistro: sol.created_at || '',
          tiendas: [],
        };
        mapa.set(key, grupo);
      }

      if (sol.contact_name) grupo.contact_name = sol.contact_name;
      if (sol.city) grupo.city = sol.city;
      if (sol.whatsapp && !grupo.whatsapp) grupo.whatsapp = sol.whatsapp;

      if (esPerfilAfiliado(sol)) {
        grupo.perfilSolicitud = sol;
        grupo.estadoPerfil = sol.status === 'approved' ? 'approved' : 'pending';
        if (sol.created_at) grupo.fechaRegistro = sol.created_at;
      } else {
        // Es una tienda de reventa
        const nombreTienda = sol.business_name;
        const slug = obtenerSlug(nombreTienda);
        const st = encontrarStore(nombreTienda, slug, sol.email, sol.whatsapp);
        const estaActiva = sol.status === 'approved' || st?.status === 'active';

        if (!grupo.tiendas.some((t) => t.id === sol.id || t.slug === slug)) {
          grupo.tiendas.push({
            id: sol.id,
            solicitud: sol,
            store: st,
            nombre: nombreTienda,
            slug,
            estaActiva,
            fecha: sol.created_at || '',
          });
        }
      }
    });

    // Agregar tiendas de stores que no estuvieran en store_requests
    stores.forEach((st) => {
      if (!st.es_revendedor && st.plan !== 'revendedor' && st.template !== 'network') return;
      if (st.name?.startsWith('[Perfil]')) return;

      const wspKey = st.whatsapp?.replace(/\D/g, '');
      const key = (wspKey ? `wsp_${wspKey}` : `store_${st.id}`);

      let grupo = mapa.get(key);
      if (!grupo) {
        grupo = {
          id: st.id,
          key,
          contact_name: st.name.replace(/\s+bm$/i, ''),
          email: '',
          whatsapp: st.whatsapp || '',
          city: 'Pucallpa',
          estadoPerfil: 'approved',
          fechaRegistro: st.created_at || '',
          tiendas: [],
        };
        mapa.set(key, grupo);
      }

      const slug = st.slug || obtenerSlug(st.name);
      if (!grupo.tiendas.some((t) => t.slug === slug || t.store?.id === st.id)) {
        grupo.tiendas.push({
          id: st.id,
          store: st,
          nombre: st.name,
          slug,
          estaActiva: st.status === 'active',
          fecha: st.created_at || '',
        });
      }
    });

    return Array.from(mapa.values());
  }, [solicitudes, stores]);

  // Métricas globales calculadas sobre los afiliados y tiendas
  const todasLasTiendas = useMemo(() => {
    return afiliadosAgrupados.flatMap((a) => a.tiendas);
  }, [afiliadosAgrupados]);

  const totalAfiliados = afiliadosAgrupados.length;
  const totalTiendas = todasLasTiendas.length;
  const totalTiendasActivas = todasLasTiendas.filter((t) => t.estaActiva).length;
  const totalTiendasGris = totalTiendas - totalTiendasActivas;

  // Filtrado de la lista
  const listaFiltrada = useMemo(() => {
    return afiliadosAgrupados.filter((af) => {
      // Filtro por tipo (con tiendas vs solo promotores)
      if (filtroTipo === 'con_tiendas' && af.tiendas.length === 0) return false;
      if (filtroTipo === 'sin_tiendas' && af.tiendas.length > 0) return false;

      // Filtro por estado de tiendas
      if (filtroEstado === 'activas') {
        const tieneActiva = af.tiendas.some((t) => t.estaActiva);
        if (!tieneActiva) return false;
      }
      if (filtroEstado === 'pendientes') {
        const tienePendiente = af.tiendas.some((t) => !t.estaActiva);
        if (!tienePendiente) return false;
      }

      // Filtro por búsqueda
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      const coincideAfiliado =
        af.contact_name?.toLowerCase().includes(q) ||
        af.email?.toLowerCase().includes(q) ||
        af.whatsapp?.includes(q) ||
        af.city?.toLowerCase().includes(q);

      const coincideTienda = af.tiendas.some(
        (t) => t.nombre.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
      );

      return coincideAfiliado || coincideTienda;
    });
  }, [afiliadosAgrupados, filtroTipo, filtroEstado, busqueda]);

  // ── ACCIONES PARA TIENDAS ──
  const handleActivarTienda = async (tienda: TiendaItem, af: PerfilAfiliadoGroup) => {
    setAccionEnCurso(tienda.id);
    setMensajeExito('');

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: 'activar',
          id: tienda.solicitud?.id || tienda.id,
          business_name: tienda.nombre,
          whatsapp: af.whatsapp,
          email: af.email,
          city: af.city,
          es_perfil: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al activar');

      setMensajeExito(data.mensaje || `¡Tienda "${tienda.nombre}" activada con éxito (Verde en Market)!`);
      await cargarDatos();
    } catch (err: any) {
      alert('Error al activar la tienda: ' + err.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleDesactivarTienda = async (tienda: TiendaItem) => {
    setAccionEnCurso(tienda.id);
    setMensajeExito('');

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: 'desactivar',
          id: tienda.solicitud?.id || tienda.id,
          business_name: tienda.nombre,
          es_perfil: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desactivar');

      setMensajeExito(data.mensaje || `Tienda "${tienda.nombre}" puesta en modo borrador (Gris).`);
      await cargarDatos();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleEliminarTienda = async (tienda: TiendaItem) => {
    if (!confirm(`¿Eliminar definitivamente la tienda virtual "${tienda.nombre}"?`)) return;

    setAccionEnCurso(tienda.id);
    setMensajeExito('');

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: 'eliminar',
          id: tienda.solicitud?.id || tienda.id,
          business_name: tienda.nombre,
          es_perfil: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');

      setMensajeExito(data.mensaje || `Tienda "${tienda.nombre}" eliminada con éxito.`);
      await cargarDatos();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  // ── ACCIONES PARA EL PERFIL DE AFILIADO ──
  const handleActivarPerfil = async (af: PerfilAfiliadoGroup) => {
    setAccionEnCurso(`perfil_${af.id}`);
    setMensajeExito('');

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: 'activar',
          id: af.perfilSolicitud?.id || af.id,
          business_name: `[Perfil] ${af.contact_name}`,
          whatsapp: af.whatsapp,
          email: af.email,
          city: af.city,
          es_perfil: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al activar perfil');

      setMensajeExito(`Perfil de afiliado "${af.contact_name}" activado en Boga Network.`);
      await cargarDatos();
    } catch (err: any) {
      alert('Error al activar perfil: ' + err.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleDesactivarPerfil = async (af: PerfilAfiliadoGroup) => {
    setAccionEnCurso(`perfil_${af.id}`);
    setMensajeExito('');

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: 'desactivar',
          id: af.perfilSolicitud?.id || af.id,
          business_name: `[Perfil] ${af.contact_name}`,
          es_perfil: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al pausar perfil');

      setMensajeExito(`Perfil de afiliado "${af.contact_name}" puesto en revisión.`);
      await cargarDatos();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const copiarLinkTienda = (slug: string) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `/${slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  };

  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex">
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0 sticky top-0">
        <SuperadminSidebarNav />
      </aside>

      <div className="flex-1 min-w-0 bg-background text-[#191b23] font-body-md flex flex-col">
        {/* Cabecera */}
        <header className="border-b border-[#c2c6d6]/50 bg-white sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/superadmin" className="text-[#424754] hover:text-[#0058be] text-xs font-semibold flex items-center gap-1 shrink-0">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Superadmin
              </Link>
              <span className="text-[#c2c6d6]">/</span>
              <span className="font-bold text-sm text-[#191b23] flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">hub</span>
                Boga Network · Afiliados y Tiendas de Reventa
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cargarDatos}
                disabled={cargandoDatos}
                className="px-3 py-1.5 rounded-lg border border-[#c2c6d6] hover:bg-slate-50 text-xs font-bold text-[#424754] flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[16px] ${cargandoDatos ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span className="hidden sm:inline">Refrescar</span>
              </button>
              <Link
                href="/network"
                target="_blank"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>Ver Landing Network</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 flex flex-col gap-6">
          
          {/* Mensaje de éxito */}
          {mensajeExito && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {mensajeExito}
              </span>
              <button onClick={() => setMensajeExito('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-[#c2c6d6]/60 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#424754]/70 uppercase tracking-wider">Afiliados / Perfiles</p>
                <p className="text-2xl font-black text-[#191b23] mt-0.5">{totalAfiliados}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Emprendedores en la red</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">badge</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tiendas Creadas</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{totalTiendas}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Tiendas de reventa</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">storefront</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Tiendas Activas</p>
                <p className="text-2xl font-black text-emerald-800 mt-0.5">{totalTiendasActivas}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">En verde / públicas</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">En Borrador / Gris</p>
                <p className="text-2xl font-black text-amber-900 mt-0.5">{totalTiendasGris}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Esperando activación</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">pending</span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-2xl border border-[#c2c6d6]/60 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por afiliado, tienda, email, WhatsApp..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>

            {/* Filtros de Pestañas */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFiltroTipo('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroTipo === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({afiliadosAgrupados.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('con_tiendas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    filtroTipo === 'con_tiendas' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">storefront</span>
                  <span>Con Tiendas ({afiliadosAgrupados.filter((a) => a.tiendas.length > 0).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('sin_tiendas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    filtroTipo === 'sin_tiendas' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">loyalty</span>
                  <span>Solo Promotores ({afiliadosAgrupados.filter((a) => a.tiendas.length === 0).length})</span>
                </button>
              </div>

              {/* Filtro por estado de tienda */}
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 cursor-pointer"
              >
                <option value="todos">Estado Tienda: Todos</option>
                <option value="activas">Tiendas Activas (Verde)</option>
                <option value="pendientes">Tiendas en Gris (Borrador)</option>
              </select>
            </div>
          </div>

          {/* Directorio de Afiliados y sus Tiendas */}
          <div className="bg-white rounded-2xl border border-[#c2c6d6]/60 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">groups</span>
                Directorio de Afiliados y Tiendas Vinculadas ({listaFiltrada.length})
              </span>
              <span className="text-[11px] text-slate-400">Las tiendas forman parte del perfil de cada usuario</span>
            </div>

            {cargandoDatos ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <span className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs text-slate-500 font-medium">Cargando directorio de afiliados...</p>
              </div>
            ) : listaFiltrada.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">person_off</span>
                <p className="text-xs font-bold text-slate-600">No se encontraron afiliados</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {busqueda ? 'Prueba con otro término de búsqueda.' : 'Los usuarios registrados en Boga Network aparecerán aquí.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80">
                {listaFiltrada.map((af) => {
                  const cleanWsp = af.whatsapp?.replace(/\D/g, '') || '';
                  const numWsp = cleanWsp.length === 9 ? `51${cleanWsp}` : cleanWsp;
                  const fecha = af.fechaRegistro
                    ? new Date(af.fechaRegistro).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Reciente';

                  return (
                    <div key={af.key} className="p-5 flex flex-col gap-4 hover:bg-slate-50/60 transition">
                      {/* ── CABECERA DEL AFILIADO / PROMOTOR ── */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg shrink-0 shadow-2xs">
                            {af.contact_name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                                <span>{af.contact_name}</span>
                              </h3>

                              {/* Badge de Afiliado Network */}
                              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">badge</span>
                                Afiliado Network
                              </span>

                              {af.estadoPerfil === 'approved' ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Cuenta Activa
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  En Revisión
                                </span>
                              )}

                              <span className="text-[10px] text-slate-400 capitalize">
                                · {af.city || 'Pucallpa'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                              {af.email && (
                                <span className="text-slate-700 font-medium flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px] text-slate-400">mail</span>
                                  {af.email}
                                </span>
                              )}
                              {af.whatsapp && (
                                <span className="text-slate-800 font-semibold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px] text-[#25D366]">chat</span>
                                  {af.whatsapp}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                Registrado: {fecha}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botones a nivel de perfil */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                          {af.whatsapp && (
                            <a
                              href={`https://wa.me/${numWsp}?text=${encodeURIComponent(
                                `Hola ${af.contact_name}! Te saludamos del equipo de Boga Network.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-[#25D366] hover:bg-emerald-50 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                              title="Escribir por WhatsApp al afiliado"
                            >
                              <span className="material-symbols-outlined text-[15px] text-[#25D366]">chat</span>
                              <span>WhatsApp</span>
                            </a>
                          )}

                          {af.estadoPerfil !== 'approved' ? (
                            <button
                              type="button"
                              disabled={accionEnCurso === `perfil_${af.id}`}
                              onClick={() => handleActivarPerfil(af)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-2xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">check</span>
                              <span>{accionEnCurso === `perfil_${af.id}` ? 'Activando...' : 'Aprobar Perfil'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={accionEnCurso === `perfil_${af.id}`}
                              onClick={() => handleDesactivarPerfil(af)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                              title="Poner cuenta de afiliado en revisión"
                            >
                              Pausar Perfil
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ── TIENDAS VIRTUALES ASOCIADAS A ESTE PERFIL ── */}
                      <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-emerald-600">storefront</span>
                            <span>Tiendas Virtuales de Reventa ({af.tiendas.length})</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {af.tiendas.length === 0 ? 'Solo promotor de catálogo' : 'Tiendas gestionadas por este usuario'}
                          </span>
                        </div>

                        {af.tiendas.length === 0 ? (
                          <div className="bg-white rounded-xl p-3 border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-slate-400 text-[18px]">info</span>
                              <span>Este afiliado aún no ha creado tiendas virtuales. Actualmente recomienda productos con enlaces de afiliado.</span>
                            </span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg shrink-0">
                              0 Tiendas
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {af.tiendas.map((t) => {
                              return (
                                <div
                                  key={t.id}
                                  className="bg-white rounded-xl p-3 border border-slate-200/90 hover:border-emerald-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                >
                                  {/* Info de la tienda */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                                      t.estaActiva ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      <span className="material-symbols-outlined text-[18px]">store</span>
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-xs sm:text-sm text-slate-900 capitalize">
                                          {t.nombre.replace(/\s+bm$/i, '')}
                                          <span className="text-slate-400 text-xs lowercase ml-1">bm</span>
                                        </span>

                                        {t.estaActiva ? (
                                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                            Activa (Verde)
                                          </span>
                                        ) : (
                                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-amber-500" />
                                            En Borrador (Gris)
                                          </span>
                                        )}

                                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                          /{t.slug}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Acciones de la tienda */}
                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setTiendaDetalle({ tienda: t, afiliado: af })}
                                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                      title="Ver detalles de esta tienda"
                                    >
                                      <span className="material-symbols-outlined text-[14px] text-emerald-600">info</span>
                                      <span>Detalles</span>
                                    </button>

                                    <a
                                      href={`/${t.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition cursor-pointer"
                                      title="Abrir tienda en nueva pestaña"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                    </a>

                                    {/* Botón Activar / Poner en Gris */}
                                    {t.estaActiva ? (
                                      <button
                                        type="button"
                                        disabled={accionEnCurso === t.id}
                                        onClick={() => handleDesactivarTienda(t)}
                                        className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                      >
                                        {accionEnCurso === t.id ? 'Guardando...' : 'Poner en Gris'}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={accionEnCurso === t.id}
                                        onClick={() => handleActivarTienda(t, af)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">check</span>
                                        <span>{accionEnCurso === t.id ? 'Activando...' : 'Activar (Verde)'}</span>
                                      </button>
                                    )}

                                    {/* Botón Eliminar Tienda */}
                                    <button
                                      type="button"
                                      disabled={accionEnCurso === t.id}
                                      onClick={() => handleEliminarTienda(t)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                      title="Eliminar tienda de reventa"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ MODAL DE DETALLES DE LA TIENDA REVENDEDORA ══ */}
          {tiendaDetalle && (() => {
            const { tienda, afiliado } = tiendaDetalle;
            const sol = tienda.solicitud;
            const st = tienda.store;
            const estaActiva = tienda.estaActiva;
            const cleanWsp = afiliado.whatsapp?.replace(/\D/g, '') || '';
            const numWsp = cleanWsp.length === 9 ? `51${cleanWsp}` : cleanWsp;
            const slug = tienda.slug;
            const fecha = tienda.fecha ? new Date(tienda.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente';

            // Margen y proveedor desde modulos
            const mod = (st?.modulos as any) || {};
            const proveedor = st?.tienda_proveedora || mod.tiendaProveedora || 'Delva';
            const tipoMargen = mod.tipo_margen || 'porcentaje';
            const valorMargen = mod.margen_ganancia || 15;
            const margenTexto = tipoMargen === 'fijo' ? `S/ ${Number(valorMargen).toFixed(2)} por producto` : `+${valorMargen}% sobre precio proveedor`;
            const productosCount = Array.isArray(mod.productos_seleccionados) ? `${mod.productos_seleccionados.length} seleccionados` : 'Todos del catálogo (42+)';

            return (
              <div
                className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                onClick={() => setTiendaDetalle(null)}
              >
                <div
                  className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Cabecera del Modal */}
                  <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-xs shrink-0 ${
                        estaActiva ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                      }`}>
                        {tienda.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-slate-900">
                            {tienda.nombre}
                          </h2>
                          {estaActiva ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Activa (Verde)
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Desactivada (Gris)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Tienda de Reventa · Creada por {afiliado.contact_name} · {afiliado.city}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTiendaDetalle(null)}
                      className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer border border-slate-200"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>

                  {/* Contenido del Modal */}
                  <div className="p-5 sm:p-6 flex flex-col gap-4">
                    {/* 1. Enlace Oficial y Accesos Rápidos */}
                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex flex-col gap-2.5">
                      <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-emerald-700">link</span>
                        Enlace de la Tienda
                      </span>
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900">
                        <span className="truncate">{typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `/${slug}`}</span>
                        <button
                          type="button"
                          onClick={() => copiarLinkTienda(slug)}
                          className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">{linkCopiado ? 'check' : 'content_copy'}</span>
                          <span>{linkCopiado ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={`/${slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          <span>Abrir Tienda</span>
                        </a>
                        <a
                          href="/network/panel"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">dashboard</span>
                          <span>Panel Network</span>
                        </a>
                      </div>
                    </div>

                    {/* 2. Ficha del Afiliado Propietario */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                        Afiliado / Dueño de la Tienda
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Responsable:</span>
                          <span className="font-bold text-slate-900">{afiliado.contact_name}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Email:</span>
                          <span className="font-semibold text-slate-800">{afiliado.email || 'No registrado'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">WhatsApp:</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-slate-900">{afiliado.whatsapp || 'Sin número'}</span>
                            {afiliado.whatsapp && (
                              <a
                                href={`https://wa.me/${numWsp}?text=${encodeURIComponent(
                                  `Hola ${afiliado.contact_name}! Te saludamos de Boga Network respecto a tu tienda "${tienda.nombre}".`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg transition"
                              >
                                <span className="material-symbols-outlined text-[12px]">chat</span>
                                <span>Escribir</span>
                              </a>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Ciudad de Entrega:</span>
                          <span className="font-semibold text-slate-800 capitalize">{afiliado.city || 'Pucallpa'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Fecha de Creación:</span>
                          <span className="text-slate-700">{fecha}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Estado del Afiliado:</span>
                          <span className="text-slate-700 font-semibold">{afiliado.estadoPerfil === 'approved' ? 'Activo en Network' : 'En Revisión'}</span>
                        </div>
                      </div>

                      {sol?.description && (
                        <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                          <span className="text-slate-400 block text-[11px]">Notas de Registro:</span>
                          <p className="mt-0.5 italic">{sol.description}</p>
                        </div>
                      )}
                    </div>

                    {/* 3. Configuración de Boga Network */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">tune</span>
                        Configuración de Reventa
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Proveedor Aliado:</span>
                          <span className="font-bold text-slate-900 capitalize">{proveedor}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Margen de Ganancia:</span>
                          <span className="font-bold text-emerald-700">{margenTexto}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Productos Activos:</span>
                          <span className="font-semibold text-slate-800">{productosCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Acciones de Control Superadmin */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      {estaActiva ? (
                        <button
                          type="button"
                          disabled={accionEnCurso === tienda.id}
                          onClick={() => {
                            handleDesactivarTienda(tienda);
                            setTiendaDetalle(null);
                          }}
                          className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">pause</span>
                          <span>Poner en Gris (Desactivar)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={accionEnCurso === tienda.id}
                          onClick={() => {
                            handleActivarTienda(tienda, afiliado);
                            setTiendaDetalle(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>Activar Tienda (Poner en Verde)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={accionEnCurso === tienda.id}
                        onClick={() => {
                          handleEliminarTienda(tienda);
                          setTiendaDetalle(null);
                        }}
                        className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>Eliminar Tienda</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
