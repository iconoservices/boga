'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { CIUDADES } from '@/lib/ciudades';
import { detectarCiudad } from '@/lib/geo';
import IconoWhatsApp from '@/templates/shared/IconoWhatsApp';
import { stockIlimitado } from '@/lib/stock';

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
  description?: string;
  afiliadoComision?: number | null;
  status?: string;
  stock?: number;
  agotado?: boolean;
}

function RevendedorPanelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Datos del perfil y tienda del revendedor
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [ciudad, setCiudad] = useState('pucallpa');
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [cuentaActiva, setCuentaActiva] = useState(false);
  const [tieneTienda, setTieneTienda] = useState(false);
  const [wspBoga, setWspBoga] = useState('51987911213');

  // Estado del panel (Pestañas limpias por tienda)
  const [pestañaActiva, setPestañaActiva] = useState<'inicio' | 'productos' | 'ventas' | 'preview' | 'afiliados' | 'ajustes'>('inicio');
  const [modalAvisoAsesor, setModalAvisoAsesor] = useState(false);
  const [modalCrearTienda, setModalCrearTienda] = useState(false);
  const [nuevoNombreTienda, setNuevoNombreTienda] = useState('');
  const [guardandoTienda, setGuardandoTienda] = useState(false);
  const [errorTiendaModal, setErrorTiendaModal] = useState('');
  const [estadoTienda, setEstadoTienda] = useState<'desactivada' | 'activa'>('desactivada');
  const [copiado, setCopiado] = useState(false);
  const [guardandoEnNube, setGuardandoEnNube] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Modal para activar cuenta de network (si el usuario no tiene tienda aún)
  const [modalRegistro, setModalRegistro] = useState(false);
  const [pasoRegistro, setPasoRegistro] = useState<'form' | 'exito'>('form');
  const [detectando, setDetectando] = useState(false);
  const [geoAviso, setGeoAviso] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [errorMsgActivacion, setErrorMsgActivacion] = useState('');

  // Leer pestaña desde query parameter (ej: ?tab=ventas, ?tab=preview, etc.)
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && ['inicio', 'productos', 'ventas', 'preview', 'afiliados', 'ajustes'].includes(tabParam)) {
      setPestañaActiva(tabParam as any);
    }
  }, [searchParams]);

  // Pedidos y control de recaudación en tiempo real
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [resumenVentas, setResumenVentas] = useState({
    totalRecaudado: 0,
    gananciasCobradas: 0,
    gananciasPendientes: 0,
    totalPedidos: 0,
    pedidosEntregados: 0,
    pedidosPendientes: 0,
  });
  const [filtroEstadoPedido, setFiltroEstadoPedido] = useState<'todos' | 'Pendiente' | 'Entregado' | 'Cancelado'>('todos');
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null);

  // Edición de WhatsApp / Enlace de Grupo de WhatsApp
  const [whatsappEditando, setWhatsappEditando] = useState('');
  const [guardandoWhatsapp, setGuardandoWhatsapp] = useState(false);
  const [whatsappGuardadoExito, setWhatsappGuardadoExito] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState('');

  // Precios personalizados: { [productoId]: precioPVP }
  const [preciosPersonalizados, setPreciosPersonalizados] = useState<Record<string, number>>({});

  // Lista de todas las tiendas creadas por el revendedor
  const [tiendasUsuario, setTiendasUsuario] = useState<any[]>([]);
  const [tiendaCopiadaSlug, setTiendaCopiadaSlug] = useState<string | null>(null);

  // Modal para administrar productos y precios de una tienda específica
  const [tiendaSeleccionadaParaEditar, setTiendaSeleccionadaParaEditar] = useState<any | null>(null);
  const [modalAdminTiendaCatalogo, setModalAdminTiendaCatalogo] = useState(false);
  const [tiendaProveedoraModal, setTiendaProveedoraModal] = useState<string>('delva');
  const [productosModalDisponibles, setProductosModalDisponibles] = useState<ProductoProveedor[]>([]);
  const [cargandoProductosModal, setCargandoProductosModal] = useState(false);
  const [prodsElegidosModal, setProdsElegidosModal] = useState<Set<string | number>>(new Set());
  const [margenModal, setMargenModal] = useState<number>(15);
  const [preciosModal, setPreciosModal] = useState<Record<string, number>>({});
  const [busquedaModal, setBusquedaModal] = useState('');
  const [filtroCatModal, setFiltroCatModal] = useState('todas');
  const [guardandoCatalogoModal, setGuardandoCatalogoModal] = useState(false);

  // Modal de Productos Individuales para Recomendar (Links de Referidos)
  const [modalProductosReferidos, setModalProductosReferidos] = useState(false);
  const [busquedaReferidos, setBusquedaReferidos] = useState('');
  const [filtroCatReferidos, setFiltroCatReferidos] = useState('todas');
  const [prodReferidoCopiadoId, setProdReferidoCopiadoId] = useState<string | number | null>(null);

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

  const copiarLinkDeTienda = (slug: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${origin}/${slug}`);
      setTiendaCopiadaSlug(slug);
      setTimeout(() => setTiendaCopiadaSlug(null), 2500);
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
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);

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

    const userDraftKey = user ? `boga_network_perfil_${user.id}` : null;

    // Si el usuario tiene sesión, la base de datos es la única fuente de la verdad
    if (user?.email) {
      supabase
        .from('store_requests')
        .select('id, business_name, contact_name, whatsapp, city, description, category, status, created_at')
        .eq('email', user.email)
        .eq('interest', 'revendedor')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            // El usuario ya activó su cuenta en Boga Network
            setCuentaActiva(true);

            // Obtener datos personales del perfil más reciente
            const ultimoRegistro = data[0];
            setNombre(ultimoRegistro.contact_name || user.user_metadata?.full_name || '');
            setWhatsapp(ultimoRegistro.whatsapp || '');
            if (ultimoRegistro.city) setCiudad(ultimoRegistro.city);

            // Filtrar SOLO las tiendas de reventa reales creadas explícitamente desde la pestaña de tiendas
            // (Excluyendo perfiles y tiendas generadas automáticamente en el registro de cuenta)
            const tiendasReales = data.filter((d: any) => {
              if (d.category === 'perfil') return false;
              if (d.description === 'Perfil de usuario activado en Boga Network') return false;
              if (d.description === 'Cuenta de dropshipping / revendedor activada desde Boga Network') return false;
              if (d.business_name?.startsWith('[Perfil]')) return false;
              return !!d.business_name;
            });

            setTiendasUsuario(tiendasReales);

            if (tiendasReales.length > 0) {
              const req = tiendasReales[0];
              setNombreTienda(req.business_name);
              if (req.status === 'approved') setEstadoTienda('activa');
              setTieneTienda(true);

              // Cargar preferencias locales (márgenes y productos elegidos)
              try {
                const legacyKey = user ? `boga_revendedor_draft_${user.id}` : null;
                const raw = typeof window !== 'undefined'
                  ? ((legacyKey && localStorage.getItem(legacyKey)) || localStorage.getItem('boga_revendedor_draft'))
                  : null;
                if (raw) {
                  const p = JSON.parse(raw);
                  if (p.margenPorcentaje !== undefined) setMargenPorcentaje(p.margenPorcentaje);
                  if (p.tiendaSeleccionada) setTiendaSeleccionada(p.tiendaSeleccionada);
                  if (p.productosSeleccionados && Array.isArray(p.productosSeleccionados)) {
                    setProductosSeleccionados(new Set(p.productosSeleccionados));
                  }
                  if (p.preciosPersonalizados && typeof p.preciosPersonalizados === 'object') {
                    setPreciosPersonalizados(p.preciosPersonalizados);
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
                    if (res.tienda.preciosPersonalizados && typeof res.tienda.preciosPersonalizados === 'object') {
                      setPreciosPersonalizados(res.tienda.preciosPersonalizados);
                    }
                  }
                })
                .catch(() => {});
            } else {
              // El usuario tiene perfil activo pero NO tiene tiendas creadas
              setTieneTienda(false);
              setNombreTienda('');
            }
          } else {
            // No existe en Supabase: revisar si tiene perfil guardado localmente
            try {
              const perfilRaw = typeof window !== 'undefined'
                ? ((userDraftKey && localStorage.getItem(userDraftKey)) || localStorage.getItem('boga_network_perfil'))
                : null;
              if (perfilRaw) {
                const p = JSON.parse(perfilRaw);
                if (p.nombre) setNombre(p.nombre);
                if (p.whatsapp) setWhatsapp(p.whatsapp);
                if (p.ciudad) setCiudad(p.ciudad);
                setCuentaActiva(true);
              } else {
                setCuentaActiva(false);
              }
            } catch {
              setCuentaActiva(false);
            }
            setTieneTienda(false);
            setNombreTienda('');
            setTiendasUsuario([]);
          }
          setCargandoDatos(false);
        });
    } else {
      // Usuario anónimo / sin sesión: revisar perfil local
      try {
        const perfilRaw = typeof window !== 'undefined' ? localStorage.getItem('boga_network_perfil') : null;
        if (perfilRaw) {
          const p = JSON.parse(perfilRaw);
          if (p.nombre) setNombre(p.nombre);
          if (p.whatsapp) setWhatsapp(p.whatsapp);
          if (p.ciudad) setCiudad(p.ciudad);
          setCuentaActiva(true);
        } else {
          setCuentaActiva(false);
        }
      } catch {
        setCuentaActiva(false);
      }
      setTieneTienda(false);
      setNombreTienda('');
      setTiendasUsuario([]);
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
          preciosPersonalizados,
        }),
      });
      setGuardadoExitoso(true);
      setHayCambiosSinGuardar(false);
      setTimeout(() => setGuardadoExitoso(false), 2500);
    } catch (e) {
      console.warn('Error guardando tienda en servidor:', e);
    } finally {
      setGuardandoEnNube(false);
    }
  }, [tieneTienda, nombreTienda, slugTienda, nombre, whatsapp, ciudad, margenPorcentaje, tiendaSeleccionada, productosSeleccionados, preciosPersonalizados]);

  // Persistir cambios en localStorage de manera inmediata y segura (sin consumir lecturas/escrituras en BD)
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
  }, [tieneTienda, nombre, whatsapp, nombreTienda, ciudad, margenPorcentaje, tiendaSeleccionada, productosSeleccionados, user]);

  // Sincronizar input de WhatsApp
  useEffect(() => {
    if (whatsapp) setWhatsappEditando(whatsapp);
  }, [whatsapp]);

  // Cargar pedidos y resumen de recaudación en vivo
  const cargarPedidos = useCallback(async () => {
    if (!slugTienda) return;
    setCargandoPedidos(true);
    try {
      const todosLosSlugs = Array.from(
        new Set([
          slugTienda,
          ...tiendasUsuario.map((t) =>
            (t.business_name || t.name || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
          ),
        ])
      )
        .filter(Boolean)
        .join(',');

      const res = await fetch(`/api/network/pedidos?slug=${encodeURIComponent(todosLosSlugs || slugTienda)}`);
      const data = await res.json();
      if (data.ok) {
        setPedidos(data.pedidos || []);
        setResumenVentas(
          data.resumen || {
            totalRecaudado: 0,
            gananciasCobradas: 0,
            gananciasPendientes: 0,
            totalPedidos: 0,
            pedidosEntregados: 0,
            pedidosPendientes: 0,
          }
        );
      }
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setCargandoPedidos(false);
    }
  }, [slugTienda, tiendasUsuario]);

  useEffect(() => {
    if (tieneTienda && slugTienda) {
      cargarPedidos();
    }
  }, [tieneTienda, slugTienda, cargarPedidos]);

  // Cambiar estado de un pedido (ej: marcar como Entregado y sumar dinero en mano)
  const handleCambiarEstadoPedido = async (id: string, nuevoEstado: string) => {
    setCambiandoEstadoId(id);
    try {
      const res = await fetch('/api/network/pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nuevoEstado }),
      });
      const data = await res.json();
      if (data.ok) {
        setPedidos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: nuevoEstado } : p))
        );
        cargarPedidos();
      } else {
        alert('No se pudo actualizar el estado: ' + (data.error || 'Error'));
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  // Crear un pedido de prueba / manual
  const handleCrearPedidoPrueba = async (nombreProducto?: string, precio?: number) => {
    try {
      const total = precio || 55.0;
      const res = await fetch('/api/network/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: slugTienda,
          customer_name: 'María Flores (WhatsApp)',
          customer_phone: '961234567',
          customer_address: 'Jr. Ucayali 450, Pucallpa',
          items: [{ name: nombreProducto || 'Reloj Clásico Elegante Delva', quantity: 1, price: total }],
          total_amount: total,
          status: 'Pendiente',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await cargarPedidos();
      }
    } catch (err) {
      console.error('Error creando pedido de prueba:', err);
    }
  };

  // Guardar WhatsApp o Link de Grupo desde Ajustes
  const handleGuardarNuevoWhatsapp = async () => {
    setGuardandoWhatsapp(true);
    try {
      const nuevo = whatsappEditando.trim();
      setWhatsapp(nuevo);
      await fetch('/api/network/tienda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slugTienda,
          nombreTienda,
          nombre,
          whatsapp: nuevo,
          ciudad,
          margenPorcentaje,
          tiendaSeleccionada,
          productosSeleccionados: Array.from(productosSeleccionados),
          preciosPersonalizados,
        }),
      });
      setWhatsappGuardadoExito(true);
      setTimeout(() => setWhatsappGuardadoExito(false), 2500);
    } catch {
      alert('Error al guardar el nuevo WhatsApp');
    } finally {
      setGuardandoWhatsapp(false);
    }
  };

  // Filtro de pedidos
  const pedidosFiltrados = useMemo(() => {
    if (filtroEstadoPedido === 'todos') return pedidos;
    if (filtroEstadoPedido === 'Pendiente')
      return pedidos.filter((p) => p.status !== 'Entregado' && p.status !== 'Cancelado');
    return pedidos.filter((p) => p.status === filtroEstadoPedido);
  }, [pedidos, filtroEstadoPedido]);

  // Cargar productos del proveedor seleccionado y productos de afiliado de toda la red
  useEffect(() => {
    if (!tiendaSeleccionada) return;
    setCargandoProductos(true);
    setFiltroCategoria('todas');
    setBusqueda('');

    const promTienda = supabase
      .from('products')
      .select('id, name, price, category, image, store, status, description, stock')
      .eq('store', tiendaSeleccionada)
      .order('name')
      .limit(100);

    const promAfiliados = supabase
      .from('products')
      .select('id, name, price, category, image, store, status, description, stock')
      .ilike('description', '%[afiliado:%')
      .limit(150);

    Promise.allSettled([promTienda, promAfiliados]).then(([resTienda, resAfiliados]) => {
      const dataTienda = resTienda.status === 'fulfilled' ? ((resTienda.value as any)?.data || []) : [];
      const dataAfiliados = resAfiliados.status === 'fulfilled' ? ((resAfiliados.value as any)?.data || []) : [];

      const mapProds = new Map<string | number, any>();

      // Helper para verificar stock respetando productos ilimitados del admin
      const verificarAgotado = (p: any) => {
        if (p.status === 'Agotado' || p.status === 'Inactivo') return true;
        if (stockIlimitado(p)) return false;
        return typeof p.stock === 'number' && p.stock <= 0;
      };

      // Primero productos con bono de afiliados de cualquier tienda aliada
      dataAfiliados.forEach((p: any) => {
        const comMatch = (p.description || '').match(/\[afiliado:(\d+)%?\]/i);
        const comision = p.afiliado_comision != null ? Number(p.afiliado_comision) : (comMatch ? parseInt(comMatch[1], 10) : null);
        mapProds.set(p.id, {
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          category: p.category || 'General',
          image: p.image,
          store: p.store,
          description: p.description,
          afiliadoComision: comision,
          status: p.status,
          stock: p.stock,
          agotado: verificarAgotado(p),
        });
      });

      // Luego productos de la tienda seleccionada
      dataTienda.forEach((p: any) => {
        if (!mapProds.has(p.id)) {
          const comMatch = (p.description || '').match(/\[afiliado:(\d+)%?\]/i);
          const comision = p.afiliado_comision != null ? Number(p.afiliado_comision) : (comMatch ? parseInt(comMatch[1], 10) : null);
          mapProds.set(p.id, {
            id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            category: p.category || 'General',
            image: p.image,
            store: p.store,
            description: p.description,
            afiliadoComision: comision,
            status: p.status,
            stock: p.stock,
            agotado: verificarAgotado(p),
          });
        }
      });

      const prods = Array.from(mapProds.values());
      // Ordenar: primero productos en stock, agotados al final, y con mayor bono
      prods.sort((a, b) => {
        if (a.agotado && !b.agotado) return 1;
        if (!a.agotado && b.agotado) return -1;
        const bonA = a.afiliadoComision || 0;
        const bonB = b.afiliadoComision || 0;
        if (bonB !== bonA) return bonB - bonA;
        return a.name.localeCompare(b.name);
      });

      setProductosDisponibles(prods);

      setProductosSeleccionados((prev) => {
        if (prev.size === 0) {
          return new Set(prods.map((x) => x.id));
        }
        return prev;
      });

      setCargandoProductos(false);
    });
  }, [tiendaSeleccionada]);

  // Categorías con conteo dinámico
  const categoriasDisponibles = useMemo(() => {
    const map: Record<string, number> = {};
    productosDisponibles.forEach((p) => {
      const cat = (p.category || 'General').trim();
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [productosDisponibles]);

  // Productos con bono especial de afiliado
  const productosConBono = useMemo(() => {
    return productosDisponibles.filter((p) => !!p.afiliadoComision);
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

  // Filtro de productos para recomendación individual (referidos)
  const productosReferidosFiltrados = useMemo(() => {
    return productosDisponibles.filter((p) => {
      const matchesSearch = !busquedaReferidos.trim() || p.name.toLowerCase().includes(busquedaReferidos.toLowerCase());
      const matchesCat =
        filtroCatReferidos === 'todas' ||
        (filtroCatReferidos === 'con-bono' && !!p.afiliadoComision) ||
        (p.category && p.category.trim().toLowerCase() === filtroCatReferidos.toLowerCase());
      return matchesSearch && matchesCat;
    });
  }, [productosDisponibles, busquedaReferidos, filtroCatReferidos]);

  const copiarLinkProductoReferido = (prodId: string | number) => {
    const link = `${origin}/${slugTienda}/producto/${prodId}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setProdReferidoCopiadoId(prodId);
      setTimeout(() => setProdReferidoCopiadoId(null), 2500);
    }
  };

  const calcularPrecio = (base: number, prodId?: string | number) => {
    if (prodId && preciosPersonalizados[String(prodId)] && preciosPersonalizados[String(prodId)] > 0) {
      return Number(preciosPersonalizados[String(prodId)]).toFixed(2);
    }
    const prod = prodId ? productosDisponibles.find((p) => String(p.id) === String(prodId)) : null;
    const margen = prod?.afiliadoComision ? prod.afiliadoComision : margenPorcentaje;
    const aumento = 1 + margen / 100;
    const final = Math.round(base * aumento * 10) / 10;
    return final.toFixed(2);
  };

  const calcularGanancia = (base: number, prodId?: string | number) => {
    const final = parseFloat(calcularPrecio(base, prodId));
    const ganancia = final - base;
    return (ganancia > 0 ? ganancia : 0).toFixed(2);
  };

  const handleEditarPrecioGlobal = (prodId: string | number, nuevoPrecio: number) => {
    setPreciosPersonalizados((prev) => {
      const next = { ...prev };
      if (nuevoPrecio <= 0 || isNaN(nuevoPrecio)) {
        delete next[String(prodId)];
      } else {
        next[String(prodId)] = nuevoPrecio;
      }
      return next;
    });
    setHayCambiosSinGuardar(true);
  };

  const handleResetPrecioGlobal = (prodId: string | number) => {
    setPreciosPersonalizados((prev) => {
      const next = { ...prev };
      delete next[String(prodId)];
      return next;
    });
    setHayCambiosSinGuardar(true);
  };

  const toggleProducto = (id: string | number) => {
    setProductosSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setHayCambiosSinGuardar(true);
  };

  const seleccionarTodosProductos = () => {
    setProductosSeleccionados(new Set(productosDisponibles.map((p) => p.id)));
    setHayCambiosSinGuardar(true);
  };

  const deseleccionarTodosProductos = () => {
    setProductosSeleccionados(new Set());
    setHayCambiosSinGuardar(true);
  };

  const cambiarMargen = (m: number) => {
    setMargenPorcentaje(m);
    setHayCambiosSinGuardar(true);
  };

  // ── FUNCIONES DE ADMINISTRACIÓN DE CATÁLOGO Y PRECIOS POR TIENDA (MODAL) ──
  const handleCambiarProveedorModal = async (nuevoSlug: string) => {
    setTiendaProveedoraModal(nuevoSlug);
    setFiltroCatModal('todas');
    setCargandoProductosModal(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category, image, store, status')
        .eq('store', nuevoSlug)
        .order('name')
        .limit(100);

      if (!error && data) {
        const prods: ProductoProveedor[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          category: p.category || 'General',
          image: p.image,
          store: p.store,
        }));
        setProductosModalDisponibles(prods);
        setProdsElegidosModal(new Set(prods.map((x) => x.id)));
        setPreciosModal({});
      } else {
        setProductosModalDisponibles([]);
        setProdsElegidosModal(new Set());
      }
    } catch {
      setProductosModalDisponibles([]);
    } finally {
      setCargandoProductosModal(false);
    }
  };

  const eliminarTiendaDeReventa = async (tiendaAEliminar: any) => {
    const tNombre = tiendaAEliminar.business_name || tiendaAEliminar.name || nombreTienda || 'esta tienda';
    if (!confirm(`¿Estás seguro de que deseas eliminar la tienda "${tNombre}"? Esta acción borrará la tienda de forma permanente.`)) {
      return;
    }

    try {
      if (tiendaAEliminar.id) {
        await supabase.from('store_requests').delete().eq('id', tiendaAEliminar.id);
      } else if (user?.email && tNombre) {
        await supabase.from('store_requests').delete().eq('email', user.email).eq('business_name', tNombre);
      }

      try {
        const uKey = user ? `boga_revendedor_draft_${user.id}` : null;
        if (uKey) localStorage.removeItem(uKey);
        localStorage.removeItem('boga_revendedor_draft');
      } catch {}

      setTiendasUsuario((prev) => {
        const rest = prev.filter((item) => (tiendaAEliminar.id ? item.id !== tiendaAEliminar.id : (item.business_name || item.name) !== tNombre));
        if (rest.length === 0) {
          setTieneTienda(false);
          setNombreTienda('');
        } else {
          setNombreTienda(rest[0].business_name || rest[0].name || '');
        }
        return rest;
      });

      alert(`La tienda "${tNombre}" fue eliminada.`);
    } catch (err: any) {
      console.error('Error al eliminar tienda:', err);
      alert('No se pudo eliminar la tienda: ' + (err?.message || 'Error desconocido'));
    }
  };

  const abrirModalAdminTienda = async (tiendaItem: any) => {
    setTiendaSeleccionadaParaEditar(tiendaItem);
    setBusquedaModal('');
    setFiltroCatModal('todas');
    setCargandoProductosModal(true);
    setModalAdminTiendaCatalogo(true);

    const sSlug = (tiendaItem.business_name || tiendaItem.name || nombreTienda || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let prov = tiendaItem.tienda_proveedora || tiendaSeleccionada || 'delva';
    let marg = margenPorcentaje;
    let elegidos: (string | number)[] = [];
    let precios: Record<string, number> = {};

    try {
      const res = await fetch(`/api/network/tienda?slug=${sSlug}`);
      const data = await res.json();
      if (data.ok && data.tienda) {
        if (data.tienda.tiendaProveedora) prov = data.tienda.tiendaProveedora;
        if (typeof data.tienda.margenPorcentaje === 'number') marg = data.tienda.margenPorcentaje;
        if (Array.isArray(data.tienda.productosSeleccionados)) elegidos = data.tienda.productosSeleccionados;
        if (data.tienda.preciosPersonalizados && typeof data.tienda.preciosPersonalizados === 'object') {
          precios = data.tienda.preciosPersonalizados;
        }
      }
    } catch {
      // Usar defaults
    }

    setTiendaProveedoraModal(prov);
    setMargenModal(marg);
    setPreciosModal(precios);

    // Cargar catálogo del proveedor vinculado a esta tienda
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category, image, store, status')
        .eq('store', prov)
        .order('name')
        .limit(100);

      if (!error && data) {
        const prods: ProductoProveedor[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          category: p.category || 'General',
          image: p.image,
          store: p.store,
        }));
        setProductosModalDisponibles(prods);

        if (elegidos.length > 0) {
          setProdsElegidosModal(new Set(elegidos));
        } else {
          setProdsElegidosModal(new Set(prods.map((x) => x.id)));
        }
      } else {
        setProductosModalDisponibles([]);
        setProdsElegidosModal(new Set());
      }
    } catch {
      setProductosModalDisponibles([]);
    } finally {
      setCargandoProductosModal(false);
    }
  };

  const categoriasModal = useMemo(() => {
    const prods = productosModalDisponibles.length > 0 ? productosModalDisponibles : productosDisponibles;
    const map: Record<string, number> = {};
    prods.forEach((p) => {
      const cat = (p.category || 'General').trim();
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [productosModalDisponibles, productosDisponibles]);

  const productosModalFiltrados = useMemo(() => {
    const prods = productosModalDisponibles.length > 0 ? productosModalDisponibles : productosDisponibles;
    return prods.filter((p) => {
      const matchesSearch = !busquedaModal.trim() || p.name.toLowerCase().includes(busquedaModal.toLowerCase());
      const matchesCat = filtroCatModal === 'todas' || (p.category && p.category.trim().toLowerCase() === filtroCatModal.toLowerCase());
      return matchesSearch && matchesCat;
    });
  }, [productosModalDisponibles, productosDisponibles, busquedaModal, filtroCatModal]);

  const calcularPrecioModal = (costoBase: number, prodId: string | number) => {
    const key = String(prodId);
    if (preciosModal[key] && preciosModal[key] > 0) {
      return Number(preciosModal[key]).toFixed(2);
    }
    const factor = 1 + (margenModal || 0) / 100;
    const final = Math.round(costoBase * factor * 10) / 10;
    return final.toFixed(2);
  };

  const calcularGananciaModal = (costoBase: number, prodId: string | number) => {
    const pvp = Number(calcularPrecioModal(costoBase, prodId));
    const ganancia = pvp - costoBase;
    return (ganancia > 0 ? ganancia : 0).toFixed(2);
  };

  const toggleProductoModal = (prodId: string | number) => {
    setProdsElegidosModal((prev) => {
      const next = new Set(prev);
      if (next.has(prodId)) next.delete(prodId);
      else next.add(prodId);
      return next;
    });
  };

  const handleCambiarPrecioModal = (prodId: string | number, nuevoPrecio: number) => {
    setPreciosModal((prev) => {
      const next = { ...prev };
      if (nuevoPrecio <= 0 || isNaN(nuevoPrecio)) {
        delete next[String(prodId)];
      } else {
        next[String(prodId)] = nuevoPrecio;
      }
      return next;
    });
  };

  const handleResetPrecioModal = (prodId: string | number) => {
    setPreciosModal((prev) => {
      const next = { ...prev };
      delete next[String(prodId)];
      return next;
    });
  };

  const handleGuardarCatalogoModal = async () => {
    if (!tiendaSeleccionadaParaEditar) return;
    setGuardandoCatalogoModal(true);

    const targetNombre = tiendaSeleccionadaParaEditar.business_name || tiendaSeleccionadaParaEditar.name || nombreTienda;
    const targetSlug = (targetNombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    try {
      await fetch('/api/network/tienda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: targetSlug,
          nombreTienda: targetNombre,
          nombre,
          whatsapp: tiendaSeleccionadaParaEditar.whatsapp || whatsapp,
          ciudad: tiendaSeleccionadaParaEditar.city || ciudad,
          margenPorcentaje: margenModal,
          tiendaSeleccionada: tiendaProveedoraModal,
          productosSeleccionados: Array.from(prodsElegidosModal),
          preciosPersonalizados: preciosModal,
        }),
      });

      if (targetNombre === nombreTienda) {
        setMargenPorcentaje(margenModal);
        setTiendaSeleccionada(tiendaProveedoraModal);
        setProductosSeleccionados(new Set(prodsElegidosModal));
        setPreciosPersonalizados(preciosModal);
      }

      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 2500);
      setModalAdminTiendaCatalogo(false);
    } catch (e) {
      console.warn('Error guardando catálogo de tienda:', e);
    } finally {
      setGuardandoCatalogoModal(false);
    }
  };

  const handleGuardarNuevaTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorTiendaModal('');
    if (!nuevoNombreTienda.trim() || nuevoNombreTienda.trim().length < 2) {
      setErrorTiendaModal('Por favor escribe un nombre para tu tienda.');
      return;
    }

    setGuardandoTienda(true);
    const nombreTiendaSinBm = nuevoNombreTienda.replace(/\s+bm$/i, '').trim();
    const nombreFinal = `${nombreTiendaSinBm} bm`;

    let nuevaFilaId: any = null;
    try {
      if (user?.email) {
        const { data: insData } = await supabase.from('store_requests').insert({
          contact_name: nombre.trim() || user.user_metadata?.full_name || 'Revendedor',
          business_name: nombreFinal,
          whatsapp: whatsapp.trim(),
          city: ciudad,
          interest: 'revendedor',
          email: user.email,
          category: 'tienda_revendedor',
          description: 'Tienda creada desde el Panel de Revendedor',
        }).select();
        if (insData && insData.length > 0) {
          nuevaFilaId = insData[0].id;
        }
      }
    } catch (e: any) {
      console.warn('Error al guardar en Supabase:', e);
    }

    const nuevaTiendaObj = {
      id: nuevaFilaId || `local_${Date.now()}`,
      business_name: nombreFinal,
      contact_name: nombre.trim() || user?.user_metadata?.full_name || 'Revendedor',
      whatsapp: whatsapp.trim(),
      city: ciudad,
      status: 'desactivada',
      category: 'tienda_revendedor',
      description: 'Tienda creada desde el Panel de Revendedor',
    };

    setTiendasUsuario((prev) => [nuevaTiendaObj, ...prev.filter(t => t.business_name !== nombreFinal)]);
    setNombreTienda(nombreFinal);
    setTieneTienda(true);
    setCuentaActiva(true);
    setGuardandoTienda(false);
    setModalCrearTienda(false);
    setNuevoNombreTienda('');
    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 2500);
  };

  const handleRegistrarOtra = () => {
    setPestañaActiva('preview');
    setModalCrearTienda(true);
  };

  const handleDetectarCiudad = async () => {
    setDetectando(true);
    setGeoAviso('');
    try {
      const res = await detectarCiudad();
      if (res.ok && res.slug) {
        setCiudad(res.slug);
        setGeoAviso(`Ubicado en ${res.nombreCrudo || res.slug}`);
      } else {
        setGeoAviso('No pudimos detectar tu ubicación.');
      }
    } catch {
      setGeoAviso('Permiso de GPS denegado.');
    } finally {
      setDetectando(false);
    }
  };

  const handleActivarCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsgActivacion('');

    if (!user) {
      router.push('/login?redirect=/network');
      return;
    }

    const cleanWsp = whatsapp.replace(/\D/g, '');
    if (!nombre.trim()) {
      setErrorMsgActivacion('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!whatsapp.trim() || cleanWsp.length < 9) {
      setErrorMsgActivacion('El número de WhatsApp es obligatorio (mínimo 9 dígitos) para comunicarnos y validar tu cuenta.');
      return;
    }

    setIsActivating(true);

    try {
      // Guardar el registro de perfil de promotor / afiliado Network en Supabase (SIN crear tienda virtual)
      const { error } = await supabase.from('store_requests').insert({
        contact_name: nombre.trim(),
        business_name: `[Perfil] ${nombre.trim()}`,
        whatsapp: whatsapp.trim(),
        city: ciudad,
        interest: 'revendedor',
        email: user.email || '',
        category: 'perfil',
        description: 'Perfil de usuario activado en Boga Network',
      });
      if (error) console.warn('Aviso al guardar perfil en Supabase:', error.message);
    } catch (err: any) {
      console.warn('Error no bloqueante al registrar perfil:', err?.message);
    }

    try {
      const perfilData = {
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        ciudad,
        email: user.email,
        cuentaActiva: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('boga_network_perfil', JSON.stringify(perfilData));
      if (user?.id) localStorage.setItem(`boga_network_perfil_${user.id}`, JSON.stringify(perfilData));
      // Limpiar cualquier borrador viejo que forzaba tiendas falsas
      localStorage.removeItem('boga_revendedor_draft');
      if (user?.id) localStorage.removeItem(`boga_revendedor_draft_${user.id}`);
    } catch {}

    setCuentaActiva(true);
    // IMPORTANTE: NO se crea tienda automáticamente aquí.
    // La tienda sólo se crea si el usuario le da a "Crear Tienda Virtual" en la pestaña 3 "Mis Tiendas".
    setTieneTienda(false);
    setNombreTienda('');
    setTiendasUsuario([]);
    setIsActivating(false);
    setPasoRegistro('exito');
  };

  // ── ESTADO DE CARGA ──
  if (authLoading || cargandoDatos) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <span className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-700">Cargando Boga Network...</p>
        <p className="text-[11px] text-slate-400 mt-1">Conectando con tu cuenta</p>
      </div>
    );
  }

  // ── PANEL PRINCIPAL UNIFICADO ──
  const prodsElegidos = productosDisponibles.filter((p) => productosSeleccionados.has(p.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior Slim Unificada (Solo un header ordenado) ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Izquierda: Marca y Tienda Activa */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <Link href="/network" className="flex items-center gap-1.5 shrink-0 hover:opacity-90 transition">
              <img src="/logo-mark.svg" alt="Boga Network" className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
              <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight shrink-0">Boga Network</span>
            </Link>

            {user && tieneTienda && (
              <>
                <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[110px] sm:max-w-[200px]"
                    title={nombreTienda}
                  >
                    {nombreTienda}
                  </span>
                  {estadoTienda === 'activa' ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Activa
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 border border-slate-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      Borrador
                    </span>
                  )}
                </div>
              </>
            )}

            {(!user || !tieneTienda) && (
              <span className="hidden md:inline-flex bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Gana Dinero · Reventa & Afiliados
              </span>
            )}
          </div>

          {/* Derecha: Acciones Ordenadas */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Pill de ganancias recaudadas en tiempo real (si está logueado y tiene tienda activa) */}
            {user && tieneTienda && (
              <button
                type="button"
                onClick={() => setPestañaActiva('ventas')}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black transition cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                title="Ver mis ventas y dinero recaudado"
              >
                <span className="material-symbols-outlined text-[15px] text-emerald-600">payments</span>
                <span className="hidden sm:inline">Ganancias: </span>
                <span>S/ {resumenVentas.gananciasCobradas.toFixed(2)}</span>
                {resumenVentas.pedidosPendientes > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">
                    {resumenVentas.pedidosPendientes}
                  </span>
                )}
              </button>
            )}

            {/* Botón WhatsApp Oficial */}
            <a
              href="https://chat.whatsapp.com/ClozDTrFdhH8cqJPziBYKQ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#25D366]/30 transition shrink-0"
              title="Unirte al grupo oficial de WhatsApp"
            >
              <IconoWhatsApp className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grupo WhatsApp</span>
            </a>

            {/* Usuario / Mi Cuenta o Ingresar */}
            {authLoading ? (
              <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/profile"
                  className="text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 px-2 sm:px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0"
                  title="Mi Cuenta"
                >
                  <span className="material-symbols-outlined text-[15px]">account_circle</span>
                  <span className="hidden sm:inline">
                    {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Mi Cuenta'}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/login?redirect=/network"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg"
                >
                  Ingresar
                </Link>
                <Link
                  href="/login?modo=registro&redirect=/network"
                  className="text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl transition shadow-xs shrink-0"
                >
                  Registrarse
                </Link>
              </div>
            )}

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Volver */}
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 p-1 sm:px-1.5 sm:py-1 rounded-lg shrink-0"
              title="Volver a Boga Market"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Barra de Pestañas a Pantalla Completa (Solo si ha iniciado sesión) ── */}
      {user && (
        <div className="bg-white border-b border-slate-200 sticky top-14 z-20 shadow-2xs w-full">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* PESTAÑA 1: INICIO */}
            <button
              type="button"
              onClick={() => setPestañaActiva('inicio')}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'inicio'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span>1. Inicio</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                Principal
              </span>
            </button>

            {/* PESTAÑA 2: PRODUCTOS DE AFILIADO */}
            <button
              type="button"
              onClick={() => setPestañaActiva('productos')}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'productos'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">loyalty</span>
              <span>2. Productos de Afiliado</span>
              {cuentaActiva ? (
                <span className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  Comisión por Venta
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  Vista Previa
                </span>
              )}
            </button>

            {/* PESTAÑA 3: MIS TIENDAS */}
            <button
              type="button"
              onClick={() => {
                if (!cuentaActiva) {
                  setPasoRegistro('form');
                  setModalRegistro(true);
                  return;
                }
                setPestañaActiva('preview');
              }}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'preview'
                  ? 'border-emerald-600 text-emerald-700'
                  : cuentaActiva
                  ? 'border-transparent text-slate-500 hover:text-slate-800'
                  : 'border-transparent text-slate-400 opacity-60 hover:opacity-90'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">store</span>
              <span>3. Mis Tiendas</span>
              {cuentaActiva && tieneTienda ? (
                estadoTienda === 'activa' ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Pública
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    Privada
                  </span>
                )
              ) : cuentaActiva ? (
                <span className="bg-slate-100 text-slate-500 border border-slate-200/80 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  Sin tiendas
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-400 border border-slate-200/80 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  Activar cuenta
                </span>
              )}
            </button>

            {/* PESTAÑA 4: MIS VENTAS & GANANCIAS */}
            <button
              type="button"
              onClick={() => {
                if (!cuentaActiva) {
                  setPasoRegistro('form');
                  setModalRegistro(true);
                  return;
                }
                setPestañaActiva('ventas');
              }}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'ventas'
                  ? 'border-emerald-600 text-emerald-700'
                  : cuentaActiva
                  ? 'border-transparent text-slate-500 hover:text-slate-800'
                  : 'border-transparent text-slate-400 opacity-60 hover:opacity-90'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              <span>4. Mis Ventas & Ganancias</span>
              {cuentaActiva ? (
                <>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    S/ {resumenVentas.gananciasCobradas.toFixed(2)}
                  </span>
                  {resumenVentas.pedidosPendientes > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {resumenVentas.pedidosPendientes} pendientes
                    </span>
                  )}
                </>
              ) : (
                <span className="bg-slate-100 text-slate-400 border border-slate-200/80 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  Activar cuenta
                </span>
              )}
            </button>

            {/* PESTAÑA 5: BONOS POR RECOMENDACIÓN */}
            <button
              type="button"
              onClick={() => {
                if (!cuentaActiva) {
                  setPasoRegistro('form');
                  setModalRegistro(true);
                  return;
                }
                setPestañaActiva('afiliados');
              }}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                pestañaActiva === 'afiliados'
                  ? 'border-slate-500 text-slate-800'
                  : cuentaActiva
                  ? 'border-transparent text-slate-400 hover:text-slate-600'
                  : 'border-transparent text-slate-400 opacity-60 hover:opacity-90'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">volunteer_activism</span>
              <span className="text-slate-500">5. Bonos por Recomendación</span>
              {cuentaActiva ? (
                <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  Próximamente
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-400 border border-slate-200/80 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  Activar cuenta
                </span>
              )}
            </button>

            {/* PESTAÑA 6: AJUSTES & CUENTA */}
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
              <span>6. Ajustes & Cuenta</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Contenido Principal a Pantalla Completa ── */}
      <main className="flex-1 w-full px-3 sm:px-6 xl:px-8 py-6">
        {/* ══ PESTAÑA 1: INICIO (HOME PRINCIPAL UNIFICADO) ══ */}
        {pestañaActiva === 'inicio' && (
          <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in">
            {/* DISEÑO PRINCIPAL DEL HOME: 2 COLUMNAS (IZQUIERDA PRESENTACIÓN Y MÉTRICAS, DERECHA LAS OPCIONES) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
              {/* ── COLUMNA IZQUIERDA: HERO, BIENVENIDA, MÉTRICAS Y BOTONES ── */}
              <div className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col items-start gap-4 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{user ? `¡Hola, ${nombre || user.user_metadata?.full_name || 'Emprendedor'}! 👋` : 'Oportunidades de Ingresos · Pucallpa'}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Gana dinero desde tu celular con{' '}
                  <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                    Boga Network
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {user && cuentaActiva
                    ? 'Bienvenido a tu centro de ingresos. Aquí tienes las formas oficiales de generar ganancias recomendando productos o con tu propia tienda virtual, sin invertir en mercadería.'
                    : 'Descubre las formas oficiales de generar ingresos hoy mismo sin jefes ni horarios. Elige la que mejor se adapte a ti o combínalas.'}
                </p>

                {/* Métricas rápidas integradas si el usuario tiene tienda */}
                {user && tieneTienda && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Tu Tienda:</span>
                      <span className="text-xs font-black text-slate-900 truncate block mt-0.5" title={nombreTienda}>
                        {nombreTienda || 'Mi Tienda'}
                      </span>
                      {estadoTienda === 'activa' ? (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Activa en internet
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          En Borrador (Gris)
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Tu Margen:</span>
                      <span className="text-xs font-black text-emerald-700 block mt-0.5">+{margenPorcentaje}%</span>
                      <span className="text-[10px] text-slate-500">Ganancia neta</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Catálogo:</span>
                      <span className="text-xs font-black text-slate-900 block mt-0.5">{productosSeleccionados.size || 42} productos</span>
                      <span className="text-[10px] text-slate-500">Listos para vender</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Proveedor:</span>
                      <span className="text-xs font-black text-slate-900 block mt-0.5 capitalize">{tiendaSeleccionada}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Stock en Pucallpa</span>
                    </div>
                  </div>
                )}

                {/* Botones de acción principales */}
                <div className="flex flex-col gap-2.5 w-full mt-1">
                  {user && cuentaActiva ? (
                    <button
                      type="button"
                      onClick={() => setPestañaActiva('productos')}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">loyalty</span>
                      <span>Ver Productos de Afiliado →</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) router.push('/login?redirect=/network');
                        else { setPasoRegistro('form'); setModalRegistro(true); }
                      }}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">badge</span>
                      <span>Activar Mi Cuenta Network →</span>
                    </button>
                  )}

                  <a
                    href="https://chat.whatsapp.com/ClozDTrFdhH8cqJPziBYKQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-5 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-black text-xs sm:text-sm border border-[#25D366]/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
                  >
                    <IconoWhatsApp className="w-4 h-4 shrink-0" />
                    <span>Únete al Grupo WhatsApp</span>
                  </a>
                </div>

                <p className="text-[11px] text-slate-400 font-medium">
                  🔒 Sin costos ocultos · Cero inversión en mercadería · Pagos directos
                </p>

                {/* Tarjeta de Beneficios y Confianza */}
                <div className="w-full bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5 mt-1">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[15px]">verified</span>
                    </span>
                    <span>Beneficios oficiales de la red</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                      <span>Proveedores con stock verificado en Pucallpa.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                      <span>Cobros inmediatos por Yape o Plin al entregar.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                      <span>Comunidad activa con soporte directo por WhatsApp.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* ── COLUMNA DERECHA: LAS 3 TARJETAS (ESTILO IMAGEN media_1794879485019_b5734ae9.png + TEXTO EXTRA media_1794879507585_6c55d750.png) ── */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* TARJETA 1: AFILIADO (RECOMIENDA PRODUCTOS O NEGOCIOS) */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3.5 hover:border-sky-300 hover:shadow-md transition">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center text-xs font-black shrink-0">
                          1
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
                          Afiliado (Recomienda Productos o Negocios)
                        </h3>
                      </div>
                      <span className="bg-sky-100 text-sky-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        Recomendado · Rápido
                      </span>
                    </div>

                    {/* Caja de Comisión */}
                    <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Comisión Directa</span>
                        <span className="text-lg font-black text-sky-800 block leading-tight">+10% a +30%</span>
                        <span className="text-[9px] text-slate-500">por cada producto o venta</span>
                      </div>
                      <div className="text-right bg-white/80 px-2.5 py-1.5 rounded-xl border border-sky-200/60 shrink-0">
                        <span className="text-[8px] font-bold text-slate-500 block uppercase">En Redes</span>
                        <span className="text-xs font-black text-slate-900 block leading-tight">1 Clic</span>
                        <span className="text-[8px] text-sky-700 font-bold">compartir</span>
                      </div>
                    </div>

                    {/* 3 Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">share</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Wsp y Redes</p>
                          <p className="text-[9px] text-slate-500 leading-tight">Compártelo en tus estados y redes.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">store</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Negocios o Productos</p>
                          <p className="text-[9px] text-slate-500 leading-tight">Links directos a productos y tiendas.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Gana por cada uno</p>
                          <p className="text-[9px] text-slate-500 leading-tight">Cobras al instante por Yape o Plin.</p>
                        </div>
                      </div>
                    </div>

                    {/* Texto y Checkmarks adicionales (de media_1794879507585_6c55d750.png) */}
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 text-xs flex flex-col gap-1.5 mt-0.5">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-sky-600 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-700 text-[11px]">Ideal para publicar en <b>Estados de WhatsApp</b> e historias.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-sky-600 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-700 text-[11px]">Comisiones desde <b>10%, 15%, 20% al 30%</b> por cada venta generada.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-sky-600 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-700 text-[11px]"><b>Cobras al instante</b> por Yape o Plin al concretarse la entrega.</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        router.push('/login?redirect=/network');
                      } else {
                        setPestañaActiva('productos');
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>{user ? 'Ir a Productos de Afiliado →' : 'Empezar como Afiliado →'}</span>
                  </button>
                </div>

                {/* TARJETA 2: TIENDA VIRTUAL PROPIA */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3.5 hover:border-emerald-300 hover:shadow-md transition">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0">
                          2
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
                          Tienda Virtual Propia
                        </h3>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        Tu Marca
                      </span>
                    </div>

                    {/* Caja de Margen */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Tu Margen</span>
                        <span className="text-lg font-black text-emerald-700 block leading-tight">+15% a +25%</span>
                        <span className="text-[9px] text-slate-500">sobre cada producto</span>
                      </div>
                      <div className="text-right bg-white/80 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 shrink-0">
                        <span className="text-[8px] font-bold text-slate-500 block uppercase">Estimado</span>
                        <span className="text-xs font-black text-slate-900 block leading-tight">S/ 600 - 1,200</span>
                        <span className="text-[8px] text-emerald-700 font-bold">mes</span>
                      </div>
                    </div>

                    {/* 3 Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">storefront</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Catálogo propio</p>
                          <p className="text-[9px] text-slate-500 leading-tight">Con tus fotos y precios.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Cero inversión</p>
                          <p className="text-[9px] text-slate-500 leading-tight">Proveedor despacha.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-[11px] leading-tight">A tu WhatsApp</p>
                          <p className="text-[9px] text-slate-500 leading-tight">Te pagan directamente.</p>
                        </div>
                      </div>
                    </div>

                    {/* Texto y Checkmarks adicionales (de media_1794879507585_6c55d750.png) */}
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      Tienes tu propia tienda online oficial ({nombreTienda ? <b>{nombreTienda}</b> : 'con tu propia marca'}) con catálogo completo de productos de proveedores de Pucallpa con entrega local.
                    </p>

                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 text-xs flex flex-col gap-1.5">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-700 text-[11px]">Tú fijas tu propio margen de ganancia (ej. <b>+{margenPorcentaje}%</b>).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-700 text-[11px]">Tus clientes arman carrito y te piden directo a tu <b>WhatsApp</b>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-700 text-[11px]"><b>Cero inversión previa:</b> tú solo compras al proveedor cuando ya te pagaron.</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        router.push('/login?redirect=/network');
                      } else if (!cuentaActiva) {
                        setPasoRegistro('form');
                        setModalRegistro(true);
                      } else if (!tieneTienda) {
                        setPestañaActiva('preview');
                        setModalCrearTienda(true);
                      } else {
                        setPestañaActiva('preview');
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">store</span>
                    <span>{tieneTienda ? 'Administrar Mi Tienda →' : 'Crear Tienda Virtual →'}</span>
                  </button>
                </div>

                {/* TARJETA 3: BONOS POR RECOMENDACIÓN (DESACTIVADO / PRÓXIMAMENTE) */}
                <div className="bg-slate-50/90 rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between gap-3.5 transition opacity-80">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">
                          3
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-slate-600 tracking-tight leading-snug">
                          Bonos por Recomendación
                        </h3>
                      </div>
                      <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        Próximamente
                      </span>
                    </div>

                    {/* Caja de Ganancia Desactivada */}
                    <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Bono por Referido</span>
                        <span className="text-lg font-black text-slate-600 block leading-tight">+S/ 20 a S/ 50</span>
                        <span className="text-[9px] text-slate-400">por cada referido activo</span>
                      </div>
                      <div className="text-right bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shrink-0">
                        <span className="text-[8px] font-bold text-slate-400 block uppercase">Estado</span>
                        <span className="text-xs font-black text-slate-600 block leading-tight">En pausa</span>
                        <span className="text-[8px] text-slate-400 font-bold">por ahora</span>
                      </div>
                    </div>

                    {/* 3 Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">store</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-700 text-[11px] leading-tight">Comercios</p>
                          <p className="text-[9px] text-slate-400 leading-tight">Pollerías, boutiques.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">local_taxi</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-700 text-[11px] leading-tight">Choferes</p>
                          <p className="text-[9px] text-slate-400 leading-tight">Taxi o mototaxis.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">group_add</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-700 text-[11px] leading-tight">Contactos</p>
                          <p className="text-[9px] text-slate-400 leading-tight">Amigos y revendedores.</p>
                        </div>
                      </div>
                    </div>

                    {/* Texto y Checkmarks adicionales */}
                    <div className="bg-white/80 rounded-2xl p-3 border border-slate-200/60 text-xs flex flex-col gap-1.5 mt-0.5">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-slate-400 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-600 text-[11px]"><b>Comercios BogaHub:</b> Recomienda negocios de Pucallpa para digitalizarse.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-slate-400 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-600 text-[11px]"><b>Choferes:</b> Recomienda conductores de taxi o mototaxi.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[15px] text-slate-400 shrink-0 mt-0.5">check_circle</span>
                        <span className="text-slate-600 text-[11px]">Bonos en efectivo por cada referido activo.</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs shadow-none cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    <span>Desactivado por ahora · Próximamente</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. PARTE DE ABAJO COMBINADA: GUÍA RÁPIDA EN 3 PASOS (media_1794879314322_c26b6a23.png) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs mt-2">
              <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-xl">rocket_launch</span>
                <span>Plan de Acción Rápido: Cómo hacer tus primeras ventas hoy</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center mb-2">
                      1
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Ajusta tu Margen & Catálogo</h4>
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                      Elige los productos que más te gusten y define tu porcentaje de ganancia (15% recomendado).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) router.push('/login?redirect=/network');
                      else if (!tieneTienda) { setPasoRegistro('form'); setModalRegistro(true); }
                      else setPestañaActiva('preview');
                    }}
                    className="mt-3 text-[11px] font-bold text-emerald-700 hover:underline text-left cursor-pointer"
                  >
                    Ir a Mis Tiendas →
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center mb-2">
                      2
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Publica en Estados de WhatsApp</h4>
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                      Comparte el enlace de tu tienda o producto estrella con tus contactos de Pucallpa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) router.push('/login?redirect=/network');
                      else setPestañaActiva('productos');
                    }}
                    className="mt-3 text-[11px] font-bold text-emerald-700 hover:underline text-left cursor-pointer"
                  >
                    Compartir ahora →
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center mb-2">
                      3
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">Recibe Pedidos y Cobra Ganancia</h4>
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                      Tu cliente te pide al WhatsApp, el proveedor entrega localmente y tú te quedas con tu margen neto.
                    </p>
                  </div>
                  {tieneTienda ? (
                    <a
                      href={`${origin}/${slugTienda}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 text-[11px] font-bold text-emerald-700 hover:underline text-left cursor-pointer"
                    >
                      Ver mi Tienda →
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) router.push('/login?redirect=/network');
                        else { setPasoRegistro('form'); setModalRegistro(true); }
                      }}
                      className="mt-3 text-[11px] font-bold text-emerald-700 hover:underline text-left cursor-pointer"
                    >
                      Crear mi Tienda →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ PESTAÑA 2: PRODUCTOS DE AFILIADO (COMISIÓN POR VENTA) ══ */}
        {pestañaActiva === 'productos' && (
          <div className="w-full flex flex-col lg:flex-row gap-6 items-start animate-in fade-in">
            {/* Columna Izquierda: Información, Búsqueda y Filtro de Categorías */}
            <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-4 lg:sticky lg:top-28">
              {/* Tarjeta Informativa / Banner Lateral */}
              <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-white text-[11px] font-black px-2.5 py-1 rounded-full mb-2.5 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px]">loyalty</span>
                  Links de Afiliado
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                  Productos Disponibles para Recomendar
                </h2>
                <p className="mt-2 text-white/90 text-xs leading-relaxed">
                  Copia tu enlace exclusivo o compártelo directo a WhatsApp. Al venderse, recibes tu ganancia neta en soles sin invertir en mercadería.
                </p>

                {/* Resumen métricas */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20">
                  <div className="bg-white/10 rounded-xl p-2 text-center">
                    <span className="text-[9px] text-sky-200 font-bold block uppercase">Catálogo</span>
                    <span className="text-xs font-black text-white mt-0.5 block">{productosDisponibles.length}</span>
                    <span className="text-[9px] text-white/70">ítems</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 text-center">
                    <span className="text-[9px] text-emerald-200 font-bold block uppercase">Margen</span>
                    <span className="text-xs font-black text-emerald-300 mt-0.5 block">+{margenPorcentaje}%</span>
                    <span className="text-[9px] text-white/70">neto</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2 text-center">
                    <span className="text-[9px] text-sky-200 font-bold block uppercase">Envío</span>
                    <span className="text-xs font-black text-white mt-0.5 block">Local</span>
                    <span className="text-[9px] text-white/70">Pucallpa</span>
                  </div>
                </div>
              </div>

              {/* Buscador */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={busquedaReferidos}
                    onChange={(e) => setBusquedaReferidos(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 shadow-2xs transition"
                  />
                  {busquedaReferidos && (
                    <button
                      type="button"
                      onClick={() => setBusquedaReferidos('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Categorías */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
                  Categorías
                </span>
                <div className="flex flex-wrap lg:flex-col gap-1.5 max-h-[35vh] lg:max-h-[45vh] overflow-y-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setFiltroCatReferidos('todas')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between text-left ${
                      filtroCatReferidos === 'todas'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Todas las categorías</span>
                    <span className="text-[10px] opacity-80">({productosDisponibles.length})</span>
                  </button>
                  {productosConBono.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFiltroCatReferidos('con-bono')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between text-left ${
                        filtroCatReferidos === 'con-bono'
                          ? 'bg-amber-500 text-white shadow-xs font-black'
                          : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
                      }`}
                    >
                      <span className="flex items-center gap-1 truncate mr-2">
                        <span>⭐</span> Con Bono Afiliado
                      </span>
                      <span className="text-[10px] opacity-90 shrink-0 font-black">({productosConBono.length})</span>
                    </button>
                  )}
                  {categoriasDisponibles.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setFiltroCatReferidos(cat.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between text-left ${
                        filtroCatReferidos.toLowerCase() === cat.name.toLowerCase()
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate mr-2">{cat.name}</span>
                      <span className="text-[10px] opacity-80 shrink-0">({cat.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip Pro */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">lightbulb</span>
                <p className="text-[11px] leading-relaxed">
                  <b>Tip pro:</b> Publica 1 producto en tus Estados de WhatsApp en la mañana y otro en la tarde para multiplicar tus ventas.
                </p>
              </div>
            </div>

            {/* Columna Derecha: Listado de Productos */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              {!cuentaActiva && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-2xs">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[22px]">lock</span>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-950">
                        Catálogo en modo vista previa (Cuenta no activada)
                      </h4>
                      <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                        Explora los productos y ganancias estimadas. Para generar tus links de afiliado exclusivos, compartirlos a WhatsApp y cobrar comisiones directas, activa tu cuenta.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) router.push('/login?redirect=/network');
                      else {
                        setPasoRegistro('form');
                        setModalRegistro(true);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition shrink-0 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    <span>Activar Cuenta Network →</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-600">
                  Mostrando <strong className="text-slate-900">{productosReferidosFiltrados.length}</strong> productos listos para compartir
                </span>
                {(busquedaReferidos || filtroCatReferidos !== 'todas') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedaReferidos('');
                      setFiltroCatReferidos('todas');
                    }}
                    className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              {cargandoProductos ? (
                <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
                  <span className="material-symbols-outlined text-4xl animate-spin text-sky-600">progress_activity</span>
                  <p className="text-xs font-bold mt-2">Cargando catálogo de productos...</p>
                </div>
              ) : productosReferidosFiltrados.length === 0 ? (
                <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                  <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
                  <p className="text-sm font-bold text-slate-700 mt-2">No se encontraron productos</p>
                  <p className="text-xs text-slate-500 mt-1">Prueba con otra palabra o categoría.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedaReferidos('');
                      setFiltroCatReferidos('todas');
                    }}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {productosReferidosFiltrados.map((prod) => {
                    const precioCliente = calcularPrecio(prod.price, prod.id);
                    const ganancia = calcularGanancia(prod.price, prod.id);
                    const storeSlug = prod.store || slugTienda;
                    const linkProd = `${origin}/${storeSlug}/producto/${prod.id}`;
                    const esCopiado = prodReferidoCopiadoId === prod.id;
                    const textoWsp = `¡Hola! Te recomiendo este producto en Pucallpa con entrega inmediata:\n\n*${prod.name}*\n💰 Precio: S/ ${precioCliente}\n\n👉 Pídelo directo aquí:\n${linkProd}`;

                    return (
                      <div
                        key={prod.id}
                        className={`rounded-3xl border shadow-xs hover:shadow-md transition p-4 sm:p-5 flex flex-col justify-between gap-3 group ${
                          prod.agotado
                            ? 'bg-slate-50/70 border-slate-200 opacity-65'
                            : 'bg-white border-slate-200/90'
                        }`}
                      >
                        {/* Fila superior: Texto a la izquierda y Foto a la derecha */}
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          {/* Izquierda: Texto, badges y precios */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg truncate max-w-[130px]">
                                {prod.category || 'Producto'}
                              </span>
                              {prod.store && (
                                <span className="bg-slate-50 text-slate-600 border border-slate-200/80 text-[10px] font-bold px-2 py-0.5 rounded-lg truncate max-w-[140px] flex items-center gap-0.5" title={`Tienda: ${prod.store}`}>
                                  <span className="material-symbols-outlined text-[11px] text-slate-500">storefront</span>
                                  <span>{prod.store}</span>
                                </span>
                              )}
                              {prod.agotado ? (
                                <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                                  <span className="material-symbols-outlined text-[13px]">block</span>
                                  <span>Sin Stock / Agotado</span>
                                </span>
                              ) : prod.afiliadoComision ? (
                                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                                  <span className="material-symbols-outlined text-[13px]">verified</span>
                                  <span>Bono {prod.afiliadoComision}% (+S/ {ganancia})</span>
                                </span>
                              ) : (
                                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                                  <span className="material-symbols-outlined text-[13px]">monetization_on</span>
                                  <span>+S/ {ganancia}</span>
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-2 leading-snug" title={prod.name}>
                              {prod.name}
                            </h4>

                            {/* Precios y Ganancia */}
                            <div className="mt-2.5 p-2 bg-emerald-50/70 rounded-xl border border-emerald-100/80 flex items-center gap-3">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-500 block">Precio</span>
                                <span className="text-xs font-black text-slate-900">S/ {precioCliente}</span>
                              </div>
                              <div className="border-l border-emerald-200/80 pl-3">
                                <span className="text-[9px] uppercase font-extrabold text-emerald-700 block">
                                  {prod.afiliadoComision ? `Comisión Afiliado (${prod.afiliadoComision}%)` : 'Tu Ganancia'}
                                </span>
                                <span className="text-xs font-black text-emerald-700">+S/ {ganancia}</span>
                              </div>
                            </div>
                          </div>

                          {/* Derecha: Imagen más chica */}
                          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative border border-slate-100 shadow-2xs">
                            {prod.agotado && (
                              <div className="absolute top-1.5 left-1.5 z-10 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                Agotado
                              </div>
                            )}
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-3xl">image</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fila inferior: Link y Botones de acción */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                          {prod.agotado ? (
                            <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-2.5 text-center text-xs text-rose-700 font-bold flex items-center justify-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-rose-600">inventory_2</span>
                              <span>Producto sin stock en tienda proveedora (No disponible)</span>
                            </div>
                          ) : cuentaActiva ? (
                            <>
                              <div className="bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-200/80">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                  Link de Afiliado Personalizado
                                </span>
                                <p className="text-[11px] text-sky-700 font-mono truncate select-all">
                                  {linkProd}
                                </p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => copiarLinkProductoReferido(prod.id)}
                                  className={`w-full py-2 px-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                                    esCopiado
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    {esCopiado ? 'check_circle' : 'content_copy'}
                                  </span>
                                  <span className="truncate">{esCopiado ? '¡Copiado!' : 'Copiar Link'}</span>
                                </button>

                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(textoWsp)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2 px-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                >
                                  <IconoWhatsApp className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">WhatsApp</span>
                                </a>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-slate-100/70 rounded-xl px-2.5 py-2 border border-slate-200/80 text-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                  Link de Afiliado Exclusivo
                                </span>
                                <p className="text-[11px] text-slate-400 font-medium italic flex items-center justify-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">lock</span>
                                  Bloqueado · Requiere activar cuenta Network
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (!user) router.push('/login?redirect=/network');
                                  else {
                                    setPasoRegistro('form');
                                    setModalRegistro(true);
                                  }
                                }}
                                className="w-full py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80 active:scale-95 shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-[15px] text-slate-500">lock</span>
                                <span>Activar cuenta para compartir enlace</span>
                              </button>
                            </>
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

        {/* ══ PESTAÑA 3: MIS TIENDAS (LISTA DE TIENDAS VINCULADAS) ══ */}
        {pestañaActiva === 'preview' && (
          <div className="w-full flex flex-col gap-6 animate-in fade-in">
            {!user ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">account_circle</span>
                </div>
                <h3 className="text-base font-black text-slate-800">Inicia sesión para usar esta cuenta</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Para ver, administrar o crear tus tiendas virtuales de reventa, inicia sesión con tu cuenta de Boga Network.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Link
                    href="/login?redirect=/network"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Iniciar Sesión</span>
                  </Link>
                  <Link
                    href="/login?modo=registro&redirect=/network"
                    className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-black transition cursor-pointer"
                  >
                    Crear Cuenta
                  </Link>
                </div>
              </div>
            ) : !cuentaActiva ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">storefront</span>
                </div>
                <h3 className="text-base font-black text-slate-800">Activa tu cuenta Network</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Para crear y administrar tus tiendas virtuales de reventa, primero activa tu cuenta Network.
                </p>
                <button
                  type="button"
                  onClick={() => { setPasoRegistro('form'); setModalRegistro(true); }}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  <span>Activar Mi Cuenta Network</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Mis Tiendas de Reventa
                    </h2>
                    <p className="text-xs text-slate-500">
                      Toca la tienda para abrirla directamente en internet o compartir tu enlace oficial.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalCrearTienda(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>{tiendasUsuario.length === 0 ? 'Crear mi primera tienda' : 'Crear otra tienda'}</span>
                  </button>
                </div>

                {/* Lista de Tiendas de Reventa */}
                <div className="flex flex-col gap-4">
                  {tiendasUsuario.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl">storefront</span>
                      </div>
                      <h3 className="text-base font-black text-slate-800">No tienes tiendas de reventa activas</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        Aún no tienes ninguna tienda creada o tu tienda anterior fue eliminada. Crea tu propia tienda online gratis en 1 clic.
                      </p>
                      <button
                        type="button"
                        onClick={() => setModalCrearTienda(true)}
                        className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        <span>Crear mi tienda virtual</span>
                      </button>
                    </div>
                  ) : (
                    tiendasUsuario.map((t, idx) => {
                      const tNombre = t.business_name || t.name || nombreTienda || 'Mi Tienda bm';
                      const tSlug = (tNombre || 'tienda')
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                      const tLink = `${origin}/${tSlug}`;
                      const tEstado = t.status === 'approved' || (tNombre === nombreTienda && estadoTienda === 'activa') ? 'activa' : 'desactivada';

                      return (
                        <div
                          key={t.id || tSlug || idx}
                          className="group bg-white rounded-3xl border border-slate-200 hover:border-emerald-500 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-600 group-hover:bg-emerald-500 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md ring-2 ring-emerald-100 transition">
                              {(tNombre || 'T').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition capitalize flex items-baseline gap-1">
                                  <span>{tNombre.replace(/\s+bm$/i, '')}</span>
                                  <span className="text-slate-400 font-bold text-xs lowercase">bm</span>
                                </h3>
                                {tEstado === 'activa' ? (
                                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Pública
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    En borrador (Privada)
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500 mt-1 truncate">
                                {t.contact_name || nombre ? `Catálogo de ${t.contact_name || nombre} · ` : ''}Envíos en {t.city || ciudad}
                              </p>

                              <a
                                href={`/${tSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono font-bold text-emerald-800 mt-1.5 flex items-center gap-1 hover:underline"
                              >
                                <span>{tLink}</span>
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                              </a>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* BOTÓN PROMINENTE QUE ABRE EL ADMINISTRADOR DE PRODUCTOS Y PRECIOS */}
                            <button
                              type="button"
                              onClick={() => abrirModalAdminTienda(t)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                              title="Administrar qué productos y qué precios tiene esta tienda"
                            >
                              <span className="material-symbols-outlined text-[16px]">tune</span>
                              <span>Administrar Catálogo & Precios</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => copiarLinkDeTienda(tSlug)}
                              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {tiendaCopiadaSlug === tSlug ? 'check' : 'content_copy'}
                              </span>
                              <span>{tiendaCopiadaSlug === tSlug ? '¡Copiado!' : 'Copiar Link'}</span>
                            </button>

                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `¡Hola! Ya abrí mi tienda virtual "${tNombre}". Puedes ver mi catálogo y hacer pedidos directo aquí: ${tLink}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                            >
                              <IconoWhatsApp className="w-4 h-4 text-white" />
                              <span>Compartir</span>
                            </a>

                            <a
                              href={`/${tSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                            >
                              <span>Abrir Tienda</span>
                              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                            </a>

                            {/* Botón para eliminar la tienda */}
                            <button
                              type="button"
                              onClick={() => eliminarTiendaDeReventa(t)}
                              className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                              title="Eliminar esta tienda de reventa"
                            >
                              <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ PESTAÑA 4: MIS VENTAS & GANANCIAS EN TIEMPO REAL ══ */}
        {pestañaActiva === 'ventas' && (
          <div className="w-full flex flex-col gap-6 animate-in fade-in">
            {!cuentaActiva ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                </div>
                <h3 className="text-base font-black text-slate-800">Activa tu cuenta Network</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Para registrar tus ventas por WhatsApp, controlar recaudaciones y cobrar tus ganancias en efectivo o Yape/Plin, activa tu cuenta Network.
                </p>
                <button
                  type="button"
                  onClick={() => { setPasoRegistro('form'); setModalRegistro(true); }}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  <span>Activar Mi Cuenta Network</span>
                </button>
              </div>
            ) : (
              <>
                {/* Header de la pestaña */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Control de Recaudación y Entregas
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Mis Ventas & Ganancias en Mano
                    </h2>
                    <p className="text-xs text-slate-500">
                      Monitorea los pedidos recibidos por WhatsApp, entrega los productos y marca cada pedido para cobrar tu margen.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cargarPedidos()}
                      disabled={cargandoPedidos}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Actualizar pedidos"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${cargandoPedidos ? 'animate-spin' : ''}`}>
                        refresh
                      </span>
                      <span>{cargandoPedidos ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCrearPedidoPrueba()}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title="Crear un pedido de prueba para ver el flujo"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>+ Simular Pedido</span>
                    </button>
                  </div>
                </div>

            {/* 4 Métricas de Recaudación */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Ganancias Cobradas
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-xl sm:text-3xl font-black text-emerald-700 block leading-tight">
                    S/ {resumenVentas.gananciasCobradas.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {resumenVentas.pedidosEntregados} pedidos entregados
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Ganancias por Cobrar
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">pending</span>
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-xl sm:text-3xl font-black text-amber-700 block leading-tight">
                    S/ {resumenVentas.gananciasPendientes.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {resumenVentas.pedidosPendientes} pedidos en curso
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Total Facturado
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-xl sm:text-3xl font-black text-slate-900 block leading-tight">
                    S/ {resumenVentas.totalRecaudado.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Venta bruta acumulada
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Total Pedidos
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-xl sm:text-3xl font-black text-slate-900 block leading-tight">
                    {resumenVentas.totalPedidos}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {resumenVentas.pedidosEntregados} cerrados con éxito
                  </span>
                </div>
              </div>
            </div>

            {/* Guía rápida de cómo funciona la recaudación */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl p-4 sm:p-5 border border-emerald-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-xl">help</span>
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    ¿Cómo funciona la entrega y el cobro de tu ganancia?
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                    1. El cliente pide por WhatsApp → 2. El proveedor despacha o coordinas la entrega → 3. Tocas <b>"✓ Marcar como Entregado"</b> aquí y el dinero de tu margen se suma inmediatamente a tus ganancias en mano.
                  </p>
                </div>
              </div>

              <a
                href="https://chat.whatsapp.com/ClozDTrFdhH8cqJPziBYKQ"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-black flex items-center gap-1.5 shrink-0 transition active:scale-95 shadow-xs"
              >
                <IconoWhatsApp className="w-4 h-4" />
                <span>Soporte en Grupo WhatsApp</span>
              </a>
            </div>

            {/* Filtros de Estado */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setFiltroEstadoPedido('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filtroEstadoPedido === 'todos'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Todos ({pedidos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstadoPedido('Pendiente')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filtroEstadoPedido === 'Pendiente'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Pendientes ({resumenVentas.pedidosPendientes})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstadoPedido('Entregado')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filtroEstadoPedido === 'Entregado'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Entregados ({resumenVentas.pedidosEntregados})
                </button>
              </div>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Mostrando {pedidosFiltrados.length} pedidos
              </span>
            </div>

            {/* Listado de Pedidos */}
            {pedidosFiltrados.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center flex flex-col items-center justify-center max-w-lg mx-auto w-full">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-3xl">inbox</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {filtroEstadoPedido === 'todos'
                    ? 'Aún no tienes pedidos registrados'
                    : `No hay pedidos en estado "${filtroEstadoPedido}"`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                  Cuando tus clientes armen su carrito o te pidan por WhatsApp desde tu tienda o enlaces de afiliado, aparecerán aquí automáticamente.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCrearPedidoPrueba()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    + Simular un pedido de prueba
                  </button>
                  <button
                    type="button"
                    onClick={() => setPestañaActiva('preview')}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Ver mis tiendas y links
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pedidosFiltrados.map((ped) => {
                  const items = Array.isArray(ped.items) ? ped.items : [];
                  const total = Number(ped.total_amount) || 0;
                  const ganancia = Number(ped.ganancia_estimada) || total * 0.15;
                  const esEntregado = ped.status === 'Entregado';
                  const fechaStr = ped.created_at
                    ? new Date(ped.created_at).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Reciente';

                  return (
                    <div
                      key={ped.id}
                      className={`bg-white rounded-3xl p-5 border flex flex-col justify-between gap-4 transition shadow-2xs ${
                        esEntregado
                          ? 'border-emerald-200 hover:border-emerald-300'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Cabecera del pedido */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="font-mono text-xs font-extrabold text-slate-800">
                              #{String(ped.id).slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{fechaStr}</span>
                          </div>

                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize ${
                              esEntregado
                                ? 'bg-emerald-100 text-emerald-800'
                                : ped.status === 'Cancelado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ped.status || 'Pendiente'}
                          </span>
                        </div>

                        {/* Datos del Cliente */}
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 truncate">
                              {ped.customer_name || 'Cliente WhatsApp'}
                            </span>
                            {ped.customer_phone && (
                              <a
                                href={waLink(
                                  ped.customer_phone,
                                  `¡Hola ${ped.customer_name || ''}! Te escribo respecto a tu pedido #${String(
                                    ped.id
                                  )
                                    .slice(0, 6)
                                    .toUpperCase()} en Boga Network.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5 shrink-0"
                              >
                                <IconoWhatsApp className="w-3 h-3" />
                                <span>Chatear</span>
                              </a>
                            )}
                          </div>
                          {ped.customer_phone && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              Tel: {ped.customer_phone}
                            </span>
                          )}
                          {ped.customer_address && (
                            <span className="text-[11px] text-slate-500 truncate">
                              📍 {ped.customer_address}
                            </span>
                          )}
                        </div>

                        {/* Productos */}
                        <div className="flex flex-col gap-1.5 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Productos ({items.length})
                          </span>
                          <div className="max-h-28 overflow-y-auto flex flex-col gap-1 pr-1">
                            {items.map((it: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] py-1 border-b border-slate-50 last:border-0"
                              >
                                <span className="text-slate-700 truncate pr-2">
                                  {it.quantity || 1}x {it.name || it.id || 'Producto'}
                                </span>
                                <span className="font-bold text-slate-900 shrink-0 font-mono">
                                  S/ {(Number(it.price) * (Number(it.quantity) || 1)).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Caja de Total y Ganancia */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-3 border border-emerald-200/80 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Total a Cobrar</span>
                            <span className="text-base font-black text-slate-900 font-mono leading-tight">
                              S/ {total.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                              Tu Ganancia Neta
                            </span>
                            <span className="text-sm font-black text-emerald-700 font-mono leading-tight">
                              +S/ {ganancia.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botón de acción */}
                      <div className="pt-1">
                        {esEntregado ? (
                          <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                                check_circle
                              </span>
                              <span>Entregado & Cobrado</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCambiarEstadoPedido(ped.id, 'Pendiente')}
                              disabled={cambiandoEstadoId === ped.id}
                              className="text-[10px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
                            >
                              Cambiar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCambiarEstadoPedido(ped.id, 'Entregado')}
                            disabled={cambiandoEstadoId === ped.id}
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>
                              {cambiandoEstadoId === ped.id ? 'Guardando...' : '✓ Marcar como Entregado'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* ══ PESTAÑA 5: BONOS POR RECOMENDACIÓN (DESACTIVADO / PRÓXIMAMENTE) ══ */}
        {pestañaActiva === 'afiliados' && (
          <div className="w-full flex flex-col gap-6 animate-in fade-in">
            {!cuentaActiva ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">volunteer_activism</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Activa tu cuenta para acceder a Bonos por Recomendación
                </h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                  Los bonos por recomendar comercios y choferes estarán disponibles para miembros con cuenta activa en Boga Network.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      router.push('/login?redirect=/network');
                    } else {
                      setPasoRegistro('form');
                      setModalRegistro(true);
                    }
                  }}
                  className="mt-6 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>Activar Mi Cuenta Network →</span>
                </button>
              </div>
            ) : (
              <>
                {/* Banner en tono gris oscuro / slate elegante de próximamente */}
                <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="relative z-10 max-w-3xl">
                <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-xs text-slate-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-3 border border-white/10">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Próximamente · Desactivado por ahora
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight text-white">
                  Bonos por recomendación de negocios y choferes
                </h2>
                <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                  Esta opción se encuentra en desarrollo y estará disponible muy pronto. Mientras tanto, puedes generar ingresos vendiendo con tu <b>Tienda Virtual</b> o recomendando <b>Productos de Afiliado</b>.
                </p>
              </div>

              {/* Badges de resumen en gris */}
              <div className="relative z-10 grid grid-cols-3 gap-2.5 shrink-0 sm:flex sm:items-center opacity-75">
                <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3 border border-white/10 text-center min-w-[110px]">
                  <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Comercios</span>
                  <span className="text-sm font-black text-white mt-0.5 block">Bono Yape</span>
                  <span className="text-[10px] text-slate-400">Próximamente</span>
                </div>
                <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3 border border-white/10 text-center min-w-[110px]">
                  <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Choferes</span>
                  <span className="text-sm font-black text-white mt-0.5 block">Bono Directo</span>
                  <span className="text-[10px] text-slate-400">Próximamente</span>
                </div>
                <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-3 border border-white/10 text-center min-w-[110px]">
                  <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Productos</span>
                  <span className="text-sm font-black text-white mt-0.5 block">+S/ Comisión</span>
                  <span className="text-[10px] text-slate-400">Activo (Pestaña 2)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
              {/* Tarjeta 1: Recomendar Comercios (Desactivada en Gris) */}
              <div className="bg-slate-50/80 rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between gap-5 opacity-80">
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">storefront</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-700">Recomendar Comercios</h3>
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Próximamente</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      ¿Conoces una pollería, restaurante, bodega, boutique de ropa o ferretería en Pucallpa que aún no vende por internet?
                    </p>
                  </div>

                  <ul className="text-xs text-slate-500 flex flex-col gap-1.5 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">check_circle</span>
                      <span>Nos pasas el número del dueño o negocio.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">check_circle</span>
                      <span>Boga Network lo asesora y le crea su catálogo.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">check_circle</span>
                      <span>Cobras tu bono en efectivo apenas se active.</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-200 text-slate-500 font-bold py-3 px-4 rounded-xl text-xs cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span>Opción en desarrollo · Próximamente</span>
                </button>
              </div>

              {/* Tarjeta 2: Recomendar Choferes (Desactivada en Gris) */}
              <div className="bg-slate-50/80 rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between gap-5 opacity-80">
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">local_taxi</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-700">Recomendar Choferes</h3>
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">Próximamente</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Invita a conductores de taxi auto o mototaxi en Pucallpa a recibir carreras seguras y directas con Boga Taxi.
                    </p>
                  </div>

                  <ul className="text-xs text-slate-500 flex flex-col gap-1.5 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">check_circle</span>
                      <span>Registras al conductor amigo o conocido.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">check_circle</span>
                      <span>Se valida su brevete y vehículo.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">check_circle</span>
                      <span>Ganas tu comisión en efectivo por su activación.</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-200 text-slate-500 font-bold py-3 px-4 rounded-xl text-xs cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span>Opción en desarrollo · Próximamente</span>
                </button>
              </div>

              {/* Tarjeta 3: Productos de Afiliado (Comisión por Venta - ACTIVO) */}
              <div className="bg-white rounded-3xl border border-sky-200 p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-sky-400 transition">
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">loyalty</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">Productos de Afiliado</h3>
                      <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Activo Ahora</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Comparte enlaces directos a productos populares de proveedores locales y gana dinero en efectivo por cada compra realizada.
                    </p>
                  </div>

                  <ul className="text-xs text-slate-600 flex flex-col gap-1.5 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-600 text-[16px]">check_circle</span>
                      <span><b>Ganancia clara</b> visible en cada producto (+S/ XX.XX).</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-600 text-[16px]">check_circle</span>
                      <span>Enlace único para compartir en Estados o grupos.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-600 text-[16px]">check_circle</span>
                      <span>Sin comprar mercadería por adelantado.</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setPestañaActiva('productos')}
                  className="w-full inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  <span>Ir a Productos de Afiliado (Pestaña 2) →</span>
                </button>
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
          </>
        )}
      </div>
    )}

        {/* ══ PESTAÑA 6: AJUSTES & ESTADO (TIENDA EN GRIS / ACTIVACIÓN) ══ */}
        {pestañaActiva === 'ajustes' && (
          <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in">
            {!user ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">settings</span>
                </div>
                <h3 className="text-base font-black text-slate-800">Inicia sesión para gestionar ajustes</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Inicia sesión con tu cuenta de Boga Network para configurar tus datos, WhatsApp y estado de tienda.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Link
                    href="/login?redirect=/network"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Iniciar Sesión</span>
                  </Link>
                </div>
              </div>
            ) : (
              <>
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
                <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-800 text-xs">
                      WhatsApp de pedidos o Enlace de Grupo
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Celular (9 dígitos) o enlace `chat.whatsapp.com/...`
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                        <IconoWhatsApp className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={whatsappEditando}
                        onChange={(e) => setWhatsappEditando(e.target.value)}
                        placeholder="Ej: 987654321 o https://chat.whatsapp.com/ClozDTrFdhH8cqJPziBYKQ"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-white font-medium"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGuardarNuevoWhatsapp}
                      disabled={guardandoWhatsapp || !whatsappEditando.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>{guardandoWhatsapp ? 'Guardando...' : 'Guardar WhatsApp'}</span>
                    </button>
                  </div>
                  {whatsappGuardadoExito && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>WhatsApp actualizado con éxito para todos tus pedidos.</span>
                    </p>
                  )}
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
              </>
            )}
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
      {/* ── MODAL CENTRADO: Crear / Nueva Tienda de Reventa (Dentro del Panel) ── */}
      {modalCrearTienda && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setModalCrearTienda(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalCrearTienda(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Crear Nueva Tienda Virtual</h3>
                <p className="text-xs text-slate-500 font-medium">Asigna un nombre a tu nuevo catálogo de ventas</p>
              </div>
            </div>

            {errorTiendaModal && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0">error</span>
                <span>{errorTiendaModal}</span>
              </div>
            )}

            <form onSubmit={handleGuardarNuevaTienda} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre para tu tienda <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="Ej: Camila Store, Moda Express"
                    value={nuevoNombreTienda}
                    onChange={(e) => setNuevoNombreTienda(e.target.value)}
                    className="w-full px-3 py-2 pr-12 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400 select-none pointer-events-none">
                    bm
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Se añade &ldquo;bm&rdquo; al final para identificar que es catálogo oficial.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCrearTienda(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTienda}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>{guardandoTienda ? 'Creando...' : 'Crear Tienda'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL: ADMINISTRAR PRODUCTOS Y PRECIOS DE UNA TIENDA ESPECÍFICA ── */}
      {modalAdminTiendaCatalogo && tiendaSeleccionadaParaEditar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setModalAdminTiendaCatalogo(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                  {(tiendaSeleccionadaParaEditar.business_name || 'T').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {tiendaSeleccionadaParaEditar.business_name || tiendaSeleccionadaParaEditar.name}
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                      Editando Catálogo & Precios
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Marca qué productos vender en esta tienda y ajusta sus precios finales.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalAdminTiendaCatalogo(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer transition shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* 1. Proveedor Aliado */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">storefront</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800">
                      Tienda Proveedora en Pucallpa:
                    </label>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {tiendasAliadas.length} aliada{tiendasAliadas.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Los productos de esta tienda saldrán del inventario de este comercio local.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={tiendaProveedoraModal}
                  onChange={(e) => handleCambiarProveedorModal(e.target.value)}
                  disabled={cargandoProductosModal}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:border-emerald-500 shadow-2xs text-slate-800 cursor-pointer"
                >
                  {tiendasAliadas.map((aliada) => (
                    <option key={aliada.slug} value={aliada.slug}>
                      {aliada.name} ({aliada.category || 'Aliada'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Categorías de la Tienda Proveedora (Chips Horizontales) */}
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 shrink-0 mr-1">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">category</span>
                <span>Categorías de {tiendasAliadas.find((t) => t.slug === tiendaProveedoraModal)?.name || tiendaProveedoraModal}:</span>
              </div>
              <button
                type="button"
                onClick={() => setFiltroCatModal('todas')}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                  filtroCatModal === 'todas'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Todas las categorías</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    filtroCatModal === 'todas' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {productosModalDisponibles.length}
                </span>
              </button>
              {categoriasModal.map((cat) => {
                const isSelected = filtroCatModal.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setFiltroCatModal(cat.name)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. Barra de Controles Rápidos (Margen general + Búsqueda + Filtros) */}
            <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
              {/* Margen general */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-700 shrink-0">Margen base:</span>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 10, 15, 20, 25].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMargenModal(m)}
                      className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                        margenModal === m
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      +{m}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Búsqueda */}
              <div className="relative w-full md:w-64">
                <span className="material-symbols-outlined text-slate-400 absolute left-2.5 top-2 text-[17px]">search</span>
                <input
                  type="text"
                  placeholder="Buscar en catálogo..."
                  value={busquedaModal}
                  onChange={(e) => setBusquedaModal(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              {/* Acciones de selección */}
              <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setProdsElegidosModal(new Set(productosModalDisponibles.map((p) => p.id)))}
                  className="text-emerald-700 hover:underline cursor-pointer"
                >
                  Marcar todos ({productosModalDisponibles.length})
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setProdsElegidosModal(new Set())}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Desmarcar
                </button>
                <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-full text-[11px] font-black border border-emerald-200">
                  {prodsElegidosModal.size} elegidos
                </span>
              </div>
            </div>

            {/* Grilla de Productos con Edición de Precio */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-slate-50">
              {cargandoProductosModal ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <span className="material-symbols-outlined text-3xl animate-spin text-emerald-600">progress_activity</span>
                  <span className="text-xs font-bold">Cargando catálogo del proveedor...</span>
                </div>
              ) : productosModalFiltrados.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">inventory_2</span>
                  <p className="text-xs font-bold">No se encontraron productos en esta categoría o búsqueda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {productosModalFiltrados.map((prod) => {
                    const isSelected = prodsElegidosModal.has(prod.id);
                    const precioPersonalizado = preciosModal[String(prod.id)];
                    const esPersonalizado = precioPersonalizado !== undefined && precioPersonalizado > 0;
                    const precioCalculado = calcularPrecioModal(prod.price, prod.id);
                    const ganancia = calcularGananciaModal(prod.price, prod.id);

                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleProductoModal(prod.id)}
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

                        {/* Espacio para editar los precios de los productos */}
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs flex flex-col gap-1.5 mt-auto">
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span>Costo proveedor:</span>
                            <span className="font-semibold">S/ {prod.price.toFixed(2)}</span>
                          </div>

                          <div
                            className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="text-slate-800 font-bold text-xs flex items-center gap-1">
                              <span>Precio cliente:</span>
                              {esPersonalizado && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1 rounded">
                                  Manual
                                </span>
                              )}
                            </label>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 font-bold">S/</span>
                              <input
                                type="number"
                                step="0.5"
                                min={prod.price}
                                value={precioPersonalizado !== undefined ? precioPersonalizado : precioCalculado}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  handleCambiarPrecioModal(prod.id, isNaN(val) ? 0 : val);
                                }}
                                className="w-20 px-2 py-0.5 text-right font-black text-xs rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-emerald-950 shadow-2xs"
                              />
                              {esPersonalizado && (
                                <button
                                  type="button"
                                  onClick={() => handleResetPrecioModal(prod.id)}
                                  title="Restablecer al margen porcentual"
                                  className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold pt-1 border-t border-slate-200/60">
                            <span>Tu ganancia:</span>
                            <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-black">
                              +S/ {ganancia}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer con Botón de Guardado */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 hidden sm:inline">
                {prodsElegidosModal.size} productos activos para esta tienda
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setModalAdminTiendaCatalogo(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarCatalogoModal}
                  disabled={guardandoCatalogoModal}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {guardandoCatalogoModal ? 'progress_activity' : 'save'}
                  </span>
                  <span>
                    {guardandoCatalogoModal
                      ? 'Guardando...'
                      : `Guardar Catálogo & Precios`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL DE PRODUCTOS CON LINKS DE REFERIDOS Y GANANCIA CLARA ══ */}
      {modalProductosReferidos && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden my-auto">
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-sky-50 flex items-start justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">loyalty</span>
                  </span>
                  <span className="bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Links de Afiliado & Comisión por Venta
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Recomienda Productos y Gana Dinero en Efectivo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                  Copia el enlace de cualquier producto o compártelo directo a WhatsApp. Al venderse desde tu link, recibes la ganancia neta en efectivo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalProductosReferidos(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Buscador y Filtro de Categorías */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={busquedaReferidos}
                  onChange={(e) => setBusquedaReferidos(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 shadow-2xs"
                />
                {busquedaReferidos && (
                  <button
                    type="button"
                    onClick={() => setBusquedaReferidos('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Categorías chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFiltroCatReferidos('todas')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    filtroCatReferidos === 'todas'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todas ({productosDisponibles.length})
                </button>
                {categoriasDisponibles.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setFiltroCatReferidos(cat.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      filtroCatReferidos.toLowerCase() === cat.name.toLowerCase()
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de Productos Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] bg-slate-50/50">
              {cargandoProductos ? (
                <div className="py-16 text-center text-slate-500">
                  <span className="material-symbols-outlined text-4xl animate-spin text-sky-600">progress_activity</span>
                  <p className="text-xs font-bold mt-2">Cargando productos de afiliados...</p>
                </div>
              ) : productosReferidosFiltrados.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
                  <p className="text-sm font-bold text-slate-700 mt-2">No se encontraron productos</p>
                  <p className="text-xs text-slate-500 mt-1">Prueba con otra palabra o categoría.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedaReferidos('');
                      setFiltroCatReferidos('todas');
                    }}
                    className="mt-4 px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productosReferidosFiltrados.map((prod) => {
                    const precioCliente = calcularPrecio(prod.price, prod.id);
                    const ganancia = calcularGanancia(prod.price, prod.id);
                    const storeSlug = prod.store || slugTienda;
                    const linkProd = `${origin}/${storeSlug}/producto/${prod.id}`;
                    const esCopiado = prodReferidoCopiadoId === prod.id;
                    const textoWsp = `¡Hola! Te recomiendo este producto en Pucallpa con entrega inmediata:\n\n*${prod.name}*\n💰 Precio: S/ ${precioCliente}\n\n👉 Pídelo directo aquí:\n${linkProd}`;

                    return (
                      <div
                        key={prod.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-3.5 sm:p-4 flex flex-col justify-between gap-3 group"
                      >
                        {/* Fila superior: Texto a la izquierda y Foto a la derecha */}
                        <div className="flex items-start justify-between gap-3">
                          {/* Izquierda: Texto, badges y precios */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                                {prod.category || 'Producto'}
                              </span>
                              {prod.store && (
                                <span className="bg-slate-50 text-slate-600 border border-slate-200/80 text-[10px] font-bold px-2 py-0.5 rounded-lg truncate max-w-[120px] flex items-center gap-0.5" title={`Tienda: ${prod.store}`}>
                                  <span className="material-symbols-outlined text-[11px] text-slate-500">storefront</span>
                                  <span>{prod.store}</span>
                                </span>
                              )}
                              {prod.afiliadoComision ? (
                                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                                  <span className="material-symbols-outlined text-[13px]">verified</span>
                                  <span>Bono {prod.afiliadoComision}% (+S/ {ganancia})</span>
                                </span>
                              ) : (
                                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                                  <span className="material-symbols-outlined text-[13px]">monetization_on</span>
                                  <span>+S/ {ganancia}</span>
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug" title={prod.name}>
                              {prod.name}
                            </h4>

                            {/* Precios y Ganancia */}
                            <div className="mt-2 p-1.5 bg-emerald-50/70 rounded-xl border border-emerald-100/80 flex items-center gap-2.5">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-500 block">Precio</span>
                                <span className="text-xs font-black text-slate-900">S/ {precioCliente}</span>
                              </div>
                              <div className="border-l border-emerald-200/80 pl-2.5">
                                <span className="text-[9px] uppercase font-extrabold text-emerald-700 block">Tu Ganancia</span>
                                <span className="text-xs font-black text-emerald-700">+S/ {ganancia}</span>
                              </div>
                            </div>
                          </div>

                          {/* Derecha: Imagen más chica */}
                          <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative border border-slate-100 shadow-2xs">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-3xl">image</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fila inferior: Link y Botones de acción */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                          <div className="bg-slate-50 rounded-lg px-2 py-1 border border-slate-200/80">
                            <p className="text-[10px] text-sky-700 font-mono truncate select-all">
                              {linkProd}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => copiarLinkProductoReferido(prod.id)}
                              className={`w-full py-1.5 px-2 rounded-lg font-black text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95 ${
                                esCopiado
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-sky-600 hover:bg-sky-700 text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {esCopiado ? 'check_circle' : 'content_copy'}
                              </span>
                              <span className="truncate">{esCopiado ? '¡Copiado!' : 'Copiar'}</span>
                            </button>

                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(textoWsp)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-1.5 px-2 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer text-center"
                            >
                              <IconoWhatsApp className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer con tip y botón de cerrar */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">lightbulb</span>
                <span>
                  <b>Tip pro:</b> Publica 1 producto diario en tus Estados de WhatsApp. Con solo 2 ventas al día puedes generar más de <b>S/ 600 al mes</b>.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setModalProductosReferidos(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {hayCambiosSinGuardar && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">
                Tienes cambios sin guardar
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {productosSeleccionados.size} productos · Margen +{margenPorcentaje}%
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={guardarEnServidor}
            disabled={guardandoEnNube}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 shadow-md flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">
              {guardandoEnNube ? 'progress_activity' : 'cloud_upload'}
            </span>
            <span>{guardandoEnNube ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      )}

      {/* ── MODAL: Activación de Cuenta y Confirmación con Grupo de WhatsApp ── */}
      {modalRegistro && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setModalRegistro(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-slate-900 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalRegistro(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {pasoRegistro === 'form' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">badge</span>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Activar Mi Cuenta Network</h3>
                    <p className="text-xs text-slate-500 font-medium">Completa tus datos para ingresar al panel y unirte a la red</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">contact_phone</span>
                  <span><b>Contacto directo:</b> Revisaremos tu solicitud y usaremos tu WhatsApp para validar tu cuenta.</span>
                </div>

                {errorMsgActivacion && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0">error</span>
                    <span>{errorMsgActivacion}</span>
                  </div>
                )}

                <form onSubmit={handleActivarCuenta} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tu nombre completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Camila Salazar"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tu WhatsApp de contacto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej: 987 654 321"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                      />
                      <p className="text-[10px] text-emerald-700 font-bold mt-1">
                        Número de 9 dígitos de celular
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Tu ciudad / distrito</label>
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                    >
                      {CIUDADES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nombre} ({c.region})
                        </option>
                      ))}
                    </select>
                    {geoAviso && <p className="text-[10px] text-amber-600 mt-1">{geoAviso}</p>}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isActivating}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isActivating ? (
                        <span>Activando tu cuenta...</span>
                      ) : (
                        <>
                          <span>Activar Cuenta y Continuar</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-2">
                      🔒 Sin costos ocultos · Al activar podrás ingresar a tu panel
                    </p>
                  </div>
                </form>
              </>
            ) : (
              /* PANTALLA DE ÉXITO */
              <div className="flex flex-col items-center text-center gap-4 py-2 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    ¡Solicitud Recibida con Éxito! 🚀
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm leading-relaxed">
                    Revisaremos tu solicitud y usaremos tu número de WhatsApp (<b>{whatsapp}</b>) para comunicarnos contigo y validar tu cuenta.
                  </p>
                </div>

                <div className="w-full bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm justify-center">
                    <span className="material-symbols-outlined text-[#25D366]">groups</span>
                    <span>Grupo Oficial de Emprendedores</span>
                  </div>
                  <p className="text-slate-600 text-xs">
                    Únete a nuestra comunidad oficial en WhatsApp para novedades de productos, tips de venta y soporte directo:
                  </p>
                  <a
                    href="https://chat.whatsapp.com/ClozDTrFdhH8cqJPziBYKQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <IconoWhatsApp className="w-4 h-4 shrink-0" />
                    <span>Unirme al Grupo Oficial de WhatsApp</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalRegistro(false);
                    setPestañaActiva('inicio');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Continuar a Mi Panel de Control</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RevendedorPanelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <span className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-700">Cargando Panel...</p>
        </div>
      }
    >
      <RevendedorPanelContent />
    </Suspense>
  );
}
