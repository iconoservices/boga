"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type StoreConfig } from '@/lib/stores.config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import PerfilEmpresaEditor from './PerfilEmpresaEditor';
import { normalizarPerfilEmpresa, type PerfilEmpresa } from '@/lib/perfilEmpresa';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@supabase/supabase-js';
import { COLOR_PRESETS, getColorPreset } from '@/lib/colorPresets';
import { extractThemeFromImageClient } from '@/lib/extractThemeClient';
import { uploadFile } from '@/lib/uploadClient';
import { refrescarTienda } from '@/lib/refrescar';
import { useEsSuperadmin } from '@/lib/superadmin';
import type { StoreTheme } from '@/lib/templates.config';
import { getTemplate } from '@/lib/templates.config';
import { iconForCategory } from '@/templates/shared/tokens';
import { moduloActivo, STOCK_BAJO, type ModuloId } from '@/lib/modulos';
import { fechaLima, hoyLima } from '@/lib/fechaLima';
import { moverStock, registrarMovimientos, stockIlimitado } from '@/lib/stock';
import PedidosTab, { type Pedido } from '@/components/admin/PedidosTab';
import CategoriasTab from '@/components/admin/CategoriasTab';
import HistorialStock from '@/components/admin/HistorialStock';
import LoyverseSyncModal from '@/components/admin/LoyverseSyncModal';
import MiPlan from '@/components/admin/MiPlan';
import CobroOnline from '@/components/admin/CobroOnline';
import { COLS_OFERTA, precioOfertaVigente, porcentajeOferta } from '@/lib/ofertas';
import { COL_PRESENTACIONES, presentacionesSugeridas, textosPresentacion, leerPresentaciones, precioDesde, tipoPresentacionDe, UNIDADES_DE_MEDIDA, completarMedida, ordenarPresentaciones, type ModoMedida } from '@/lib/presentaciones';

interface Product {
  id: string;
  name: string;
  store: string;
  price: number;
  category: string;
  subcategory?: string;
  stock: number;
  status: string;
  image: string;
  /** Todas las fotos en orden (la [0] es `image`). Sin lista, el producto tiene una sola foto. */
  images?: string[] | null;
  description?: string;
  created_at: string;
  /** Precio rebajado y último día de la oferta (SQL «OFERTAS EN PRODUCTOS»). Sin oferta = null. */
  precio_oferta?: number | null;
  oferta_hasta?: string | null;
  /** Medidas o tamaños con su precio (100 g / 250 g / 1 kg…). Sin lista = un solo precio. */
  presentaciones?: { label: string; price: number }[] | null;
  /** true = es un servicio (se reserva/consulta, no se agrega al carrito). Decide si sale en el toggle "Servicios" del Market. */
  es_servicio?: boolean | null;
  /** true = es un combo o paquete promocional con sello propio y presencia en Promociones. */
  es_combo?: boolean | null;
}

type TabId = 'inicio' | 'products' | 'categories' | 'orders' | 'pos' | 'metrics' | 'stores';

// Orden canónico de la navegación. La sidebar de escritorio, la barra inferior
// móvil, el menú Perfil y las tarjetas de "Gestión" del Inicio se arman TODAS
// desde acá: así no se desincronizan ni quedan en distinto orden.
const NAV_TABS: { id: TabId; label: string; icon: string; sub: string; inBottomBar: boolean }[] = [
  { id: 'inicio',   label: 'Inicio',       icon: 'home',          sub: 'Resumen de tu carta',        inBottomBar: true },
  { id: 'products', label: 'Productos',    icon: 'inventory_2',   sub: 'Añade o modifica ítems',     inBottomBar: true },
  { id: 'categories', label: 'Categorías', icon: 'category',     sub: 'Ordena los rubros de tu carta', inBottomBar: false },
  { id: 'orders',   label: 'Pedidos',      icon: 'receipt_long',  sub: 'Gestiona los pedidos',       inBottomBar: true },
  { id: 'pos',      label: 'Vender (POS)', icon: 'point_of_sale', sub: 'Caja rápida en el local',    inBottomBar: true },
  { id: 'metrics',  label: 'Métricas',     icon: 'bar_chart',     sub: 'Rendimiento del negocio',    inBottomBar: false },
  { id: 'stores',   label: 'Mis Tiendas',  icon: 'store',         sub: 'Administra tus sucursales',  inBottomBar: false },
];

// Métodos de pago que una carta puede aceptar. Un solo lugar: lo usan el editor
// de tienda (qué acepta el negocio) y la caja POS (cómo se pagó esta venta).
const PAYMENT_METHODS: { id: string; label: string; icon: string; color: string }[] = [
  { id: 'Efectivo',      label: 'Efectivo',      icon: 'payments',       color: '#16a34a' },
  { id: 'Yape/Plin',     label: 'Yape / Plin',   icon: 'qr_code_2',      color: '#7c3aed' },
  { id: 'Transferencia', label: 'Transferencia', icon: 'account_balance',color: '#0ea5e9' },
  { id: 'Visa',          label: 'Visa',          icon: 'credit_card',    color: '#1d4ed8' },
  { id: 'Mastercard',    label: 'Mastercard',    icon: 'credit_card',    color: '#ea580c' },
];

// Cómo se cobró una venta en el POS. "Tarjeta" agrupa Visa/Mastercard.
const POS_PAYMENT_METHODS: { id: 'Efectivo' | 'Yape/Plin' | 'Tarjeta'; label: string; icon: string; color: string }[] = [
  { id: 'Efectivo',  label: 'Efectivo',    icon: 'payments',    color: '#16a34a' },
  { id: 'Yape/Plin', label: 'Yape / Plin', icon: 'qr_code_2',   color: '#7c3aed' },
  { id: 'Tarjeta',   label: 'Tarjeta',     icon: 'credit_card', color: '#1d4ed8' },
];

// Enlace de Google Maps dentro de la descripción de un terreno (ver templates/terrenos/useTerrenos.ts).
const RE_MAPS = /https?:\/\/(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s)]*/i;

// Constructor de "Horario de atención": arma el texto (ej. "Lun a Vie: 9:00 am – 6:00 pm") a partir
// de los días marcados y la hora elegida. `horario` en la base sigue siendo un texto libre.
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
function formatHora12(hhmm: string): string {
  const [hStr, m] = hhmm.split(':');
  let h = parseInt(hStr, 10) % 24;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
function formatDiasHorario(seleccionados: string[]): string {
  const idx = DIAS_SEMANA.map((d, i) => (seleccionados.includes(d) ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) return '';
  if (idx.length === 7) return 'Todos los días';
  const grupos: number[][] = [];
  let actual: number[] = [idx[0]];
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] === idx[i - 1] + 1) actual.push(idx[i]);
    else { grupos.push(actual); actual = [idx[i]]; }
  }
  grupos.push(actual);
  const partes = grupos.map((g) =>
    g.length === 1 ? DIAS_SEMANA[g[0]]
    : g.length === 2 ? `${DIAS_SEMANA[g[0]]} y ${DIAS_SEMANA[g[1]]}`
    : `${DIAS_SEMANA[g[0]]} a ${DIAS_SEMANA[g[g.length - 1]]}`
  );
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}
function formatearHorario(dias: string[], desde: string, hasta: string): string {
  const textoDias = formatDiasHorario(dias);
  return textoDias ? `${textoDias}: ${formatHora12(desde)} – ${formatHora12(hasta)}` : '';
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-2 border-[#c2c6d6] border-t-[var(--tienda-color)] rounded-full animate-spin" />
      </div>
    );
  }

  return <AdminDashboard user={user} />;
}

function AdminDashboard({ user }: { user: User }) {
  const { signOut } = useAuth();
  // "Ver como su dueño": el superadmin abre /admin?como=<tienda> y ve el panel exacto de esa tienda. Solo con la sesión
  // de superadmin (para cualquier otra persona el parámetro no hace nada).
  const { esSuperadmin } = useEsSuperadmin();
  const [comoSlug, setComoSlug] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setComoSlug(new URLSearchParams(window.location.search).get('como'));
  }, []);
  const viendoComo = esSuperadmin && comoSlug ? comoSlug : null;
  const router = useRouter();
  // El QR y los links a las tiendas apuntan al dominio real donde corre la app
  // (antes estaba escrito 'https://boga.com' fijo, que no es el dominio en uso).
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pedidoOcupado, setPedidoOcupado] = useState<string | null>(null);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isLoyverseOpen, setIsLoyverseOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('all');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  // A qué sección del editor de tienda saltar al abrirlo desde las tarjetas
  // del Inicio (Datos del negocio / Horarios / Métodos de pago / Avisos).
  const [storeEditorSection, setStoreEditorSection] = useState<string | null>(null);

  // POS (Caja Rápida) States
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Efectivo' | 'Yape/Plin' | 'Tarjeta'>('Efectivo');
  const [posSeller, setPosSeller] = useState('Administrador');
  const [customSeller, setCustomSeller] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posProductSearch, setPosProductSearch] = useState('');
  const [posProductCategory, setPosProductCategory] = useState('all');
  const [isPosSaving, setIsPosSaving] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  const [isMobileCheckoutOpen, setIsMobileCheckoutOpen] = useState(false);
  const [isEquipoOpen, setIsEquipoOpen] = useState(false);
  const [nuevoVendedor, setNuevoVendedor] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  // "Crear y hacer otro igual": tras guardar, el formulario sigue abierto con lo mismo (categoría, precio, presentaciones…) y solo falta el nombre y la foto.
  const crearOtroRef = useRef(false);
  // Cómo vende el producto (para elegir primero y ver solo los atajos que corresponden): por unidades o por peso.
  const [modoPres, setModoPres] = useState<ModoMedida | null>(null);
  const [avisoCreado, setAvisoCreado] = useState('');
  const storeLogoInputRef = useRef<HTMLInputElement>(null);
  const storeHeroInputRef = useRef<HTMLInputElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dbStores, setDbStores] = useState<any[]>([]);

  // Tiendas que este usuario administra: las que tienen su user_id en la
  // base (RLS ya solo deja editar las propias). Antes esto era una lista
  // guardada en localStorage sin ninguna verificacion real de dueño — cualquiera
  // que abriera /admin podia "elegir" y editar la tienda de otro comercio.
  const [isStorePickerOpen, setIsStorePickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<string[]>([]);
  const [claiming, setClaiming] = useState(false);

  // Tiendas donde este usuario es co-administrador (store_admins), además de las que tiene como
  // dueño (user_id) — una tienda ahora puede tener más de una persona con el mismo acceso.
  const [coAdminSlugs, setCoAdminSlugs] = useState<string[]>([]);
  useEffect(() => {
    let vivo = true;
    supabase.from('store_admins').select('store').eq('user_id', user.id).then(({ data, error }) => {
      // Tabla nueva: si el SQL todavía no se corrió, sigue funcionando como antes (solo dueño).
      if (!vivo || error) return;
      setCoAdminSlugs((data ?? []).map((r: any) => r.store));
    });
    return () => { vivo = false; };
  }, [user.id]);

  const myStoreSlugs = React.useMemo(
    () => viendoComo
      ? dbStores.filter((s: any) => s.slug === viendoComo).map((s: any) => s.slug)
      : dbStores.filter((s: any) => s.user_id === user.id || coAdminSlugs.includes(s.slug)).map((s: any) => s.slug),
    [dbStores, user.id, viendoComo, coAdminSlugs]
  );
  const unclaimedStores = React.useMemo(
    () => dbStores.filter((s: any) => !s.user_id),
    [dbStores]
  );
  const managedSlugs = myStoreSlugs.length > 0 ? myStoreSlugs : null;

  // Ya no se ofrece "reclamar" una tienda sin dueño: las tiendas las asigna el equipo de BogaHub (superadmin).

  const claimStores = async (slugs: string[]) => {
    if (slugs.length === 0) return;
    setClaiming(true);
    const { error } = await supabase.from('stores').update({ user_id: user.id }).in('slug', slugs);
    setClaiming(false);
    if (error) { alert('No se pudo reclamar la tienda: ' + error.message); return; }
    await fetchStores();
    setIsStorePickerOpen(false);
  };

  const visibleDbStores = React.useMemo(() => {
    if (!managedSlugs) return [];
    return dbStores.filter((s: any) => managedSlugs.includes(s.slug));
  }, [dbStores, managedSlugs]);

  const stores = React.useMemo<Record<string, StoreConfig>>(() => {
    const merged = {} as Record<string, StoreConfig>;
    visibleDbStores.forEach(s => {
      if (!merged[s.slug]) {
        merged[s.slug] = {
          slug: s.slug,
          name: s.name,
          tagline: s.tagline || '',
          marketplaceCategory: s.marketplace_category || 'General',
          template: (s.template || 'default') as any,
          heroImage: s.hero_image || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
          heroAlt: s.hero_alt || 'store image',
          logoImage: s.logo_image || undefined,
          whatsapp: s.whatsapp || undefined,
          horario: s.horario || undefined,
          metodosPago: s.metodos_pago || undefined,
          facebook: s.facebook || undefined,
          instagram: s.instagram || undefined,
          tiktok: s.tiktok || undefined,
          // Sin categorías propias guardadas: cae a las de fábrica de su plantilla (ej. Estilos Mirka nunca las tuvo en la BD).
          categories: (s.categories && s.categories.length ? s.categories : getTemplate(s.template)?.categories) || [],
          theme: s.theme || {
            primary: '#0058be',
            onPrimary: '#ffffff',
            primaryContainer: '#2170e4',
            secondary: '#545f73',
            secondaryContainer: '#d5e0f8',
            background: '#f9f9ff',
            surface: '#ffffff',
            surfaceContainer: '#ecedf7',
            surfaceContainerLow: '#f2f3fd',
            surfaceContainerLowest: '#ffffff',
            surfaceContainerHigh: '#e6e7f2',
            onBackground: '#191b23',
            onSurface: '#191b23',
            onSurfaceVariant: '#424754',
            outlineVariant: '#c2c6d6',
            fontHeadline: "'Inter', sans-serif",
            fontBody: "'Inter', sans-serif",
            fontLabel: "'Inter', sans-serif",
          },
          modulos: s.modulos || {},
        };
      }
    });
    return merged;
  }, [visibleDbStores]);

  // Productos visibles: solo los de las tiendas que administra este cliente
  const visibleProducts = React.useMemo(() => {
    if (!managedSlugs) return [];
    return products.filter(p => managedSlugs.includes(p.store));
  }, [products, managedSlugs]);

  // Las pantallas que operan sobre UNA sola carta (Inicio, POS) usan esto:
  // con "Todas mis tiendas" elegido cae a la primera. Así el carrito del POS
  // no puede mezclar tiendas y el Inicio siempre muestra una carta concreta.
  // Módulos (POS, inventario) que el superadmin prendió por tienda. Ver src/lib/modulos.ts.
  // Sin tienda elegida todavía (ej. "Nuevo producto" con "Todas mis tiendas"), vale si alguna de las mías lo tiene.
  const tiendaTiene = (slug: string, modulo: ModuloId) => {
    if (!slug) return visibleDbStores.length === 0 || visibleDbStores.some((s: any) => moduloActivo(s.modulos, modulo));
    return moduloActivo(dbStores.find((s: any) => s.slug === slug)?.modulos, modulo);
  };
  // Una pestaña/sección se muestra según la tienda elegida en el selector: con una tienda puntual elegida, decide
  // SOLO esa tienda (antes se prendía si CUALQUIER otra tienda mía tenía el módulo, y un cliente con varios rubros
  // veía el POS de una tienda en la que no existía). Con "Todas mis tiendas" alcanza con que alguna lo tenga.
  // Mientras las tiendas todavía no cargaron, NO se asume que sí (antes hacía eso, y a una tienda con el módulo
  // apagado le salía el tab un instante para luego desaparecer apenas llegaban los datos reales).
  const algunaTiene = (modulo: ModuloId) => {
    if (selectedStore !== 'all') {
      const s = dbStores.find((s: any) => s.slug === selectedStore);
      if (!s) return false;
      return moduloActivo(s.modulos, modulo);
    }
    if (visibleDbStores.length === 0) return false;
    return visibleDbStores.some((s: any) => moduloActivo(s.modulos, modulo));
  };
  const posOn = algunaTiene('pos');
  const inventarioOn = algunaTiene('inventario');
  // Pedidos es para todos: los pedidos de la carta ahora se registran. Caja y Métricas de ventas son del módulo de ventas.
  const navTabs = NAV_TABS.filter(t => !['pos', 'metrics'].includes(t.id) || posOn);

  const focusedStore = selectedStore === 'all'
    ? ((activeTab === 'pos' ? Object.keys(stores).find(k => tiendaTiene(k, 'pos')) : undefined) ?? Object.keys(stores)[0] ?? '')
    : selectedStore;
  const posDisponible = !!focusedStore && tiendaTiene(focusedStore, 'pos');
  // Si apagan el POS mientras está abierto, volver al Inicio.
  useEffect(() => {
    if ((activeTab === 'pos' || activeTab === 'metrics') && !posOn) setActiveTab('inicio');
  }, [activeTab, posOn]);

  // Datos derivados para la pestaña Inicio (una sola carta).
  const inicioStore = stores[focusedStore];
  // Tiendas de tipo "empresa" (plantilla de servicios): el catálogo se llama "servicios", no "productos".
  const esEmpresa = stores[focusedStore]?.template === 'empresa';
  const inicioDb = dbStores.find((s: any) => s.slug === focusedStore);
  const inicioActiva = (inicioDb?.status ?? 'active') === 'active';
  const inicioNombre = (user.user_metadata?.name as string | undefined)?.split(' ')[0];
  // Color de la marca del panel. Antes del primer dato de la tienda salía el rojo de BogaHub un instante;
  // ahora se usa el último color que tuvo este navegador, y si no hay, un gris neutro (ya no hay rojo por defecto).
  const [colorGuardado] = useState<string>(() => {
    try { return localStorage.getItem('boga_admin_color') || ''; } catch { return ''; }
  });
  const colorPanel = inicioStore?.theme?.primary || colorGuardado || '#52525b';
  // WhatsApp del asesor de BogaHub (lo edita el superadmin en Paquetes): para pedir que le asignen la tienda.
  const [waAsesor, setWaAsesor] = useState('');
  useEffect(() => {
    let vivo = true;
    fetch('/api/contacto').then(r => (r.ok ? r.json() : null)).then(d => { if (vivo && d?.whatsapp) setWaAsesor(d.whatsapp); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    const c = inicioStore?.theme?.primary;
    if (c) { try { localStorage.setItem('boga_admin_color', c); } catch { /* sin storage: no se recuerda */ } }
  }, [inicioStore?.theme?.primary]);
  // Con subdominio propio activo, el link/QR/compartir apuntan ahí en vez de a bogahub.app/<tienda>
  // (mismo criterio que el QR de abajo, que sí lo revisaba — este no, y por eso quedaban distintos).
  // Una sola función para todos los lados (ver tienda, QR, compartir): subdominio si lo tiene activo, ruta si no.
  const urlDeTienda = (slug: string) => {
    if (dbStores.find((x: any) => x.slug === slug)?.subdominio_activo === true) {
      try {
        const u = new URL(siteOrigin);
        // En local (localhost) el subdominio <tienda>.localhost no lo atiende el proxy y cae en el inicio de BogaHub:
        // allá se usa la ruta normal /<tienda>.
        if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return `${u.protocol}//${slug}.${u.host}`;
      } catch { /* siteOrigin vacío en el primer render del servidor: cae al de abajo */ }
    }
    return `${siteOrigin}/${slug}`;
  };
  const inicioUrl = inicioStore ? urlDeTienda(inicioStore.slug) : '';
  // Producto "sin categoría": no tiene o tiene una que ya no existe en su tienda. A los clientes solo les sale
  // bajo "Todos", sin sección propia, así que conviene que el dueño lo vea y lo arregle.
  const sinCategoria = (p: Product) =>
    !p.category?.trim() ||
    !stores[p.store]?.categories?.some((c) => c.name.trim().toLowerCase() === p.category.trim().toLowerCase());
  const inicioOrders = inicioStore ? orders.filter(o => o.store === inicioStore.slug) : [];
  const compartirCarta = async () => {
    if (typeof navigator === 'undefined') return;
    if (navigator.share) { try { await navigator.share({ title: inicioStore?.name, url: inicioUrl }); } catch {} }
    else if (navigator.clipboard) { await navigator.clipboard.writeText(inicioUrl); alert('Link copiado: ' + inicioUrl); }
  };

  // Pedidos visibles: solo los de las tiendas que administra este cliente, y
  // acotados a la tienda elegida en el selector "Todas mis tiendas".
  const visibleOrders = React.useMemo(() => {
    if (!managedSlugs) return [];
    const scoped = orders.filter(o => managedSlugs.includes(o.store));
    return selectedStore === 'all' ? scoped : scoped.filter(o => o.store === selectedStore);
  }, [orders, managedSlugs, selectedStore]);

  // Pedidos por atender (de todas mis tiendas): globito en el menú y aviso cuando llega uno nuevo.
  const pedidosPendientes = React.useMemo(
    () => (managedSlugs ? orders.filter(o => managedSlugs.includes(o.store) && o.status === 'Pendiente').length : 0),
    [orders, managedSlugs]
  );

  const [isStoreEditorOpen, setIsStoreEditorOpen] = useState(false);
  const [editingStoreSlug, setEditingStoreSlug] = useState<string | null>(null);
  const [isStoreSaving, setIsStoreSaving] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', tagline: '', marketplace_category: '', whatsapp: '', show_demo_products: false, hide_hero_text: false, zona: '', direccion: '', horario: '', rating: '', metodos_pago: [] as string[], facebook: '', instagram: '', tiktok: '', latitud: null as number | null, longitud: null as number | null, mostrar_ubicacion: false, entrega: 'ambos' as 'delivery' | 'recojo' | 'ambos', perfil_empresa: {} as PerfilEmpresa });
  // Constructor de horario a golpe de clic: arma el texto de storeForm.horario a partir de los días
  // y la hora elegidos, en vez de que el dueño tenga que escribirlo a mano. El campo de texto sigue
  // ahí para ajustarlo o escribir algo distinto (ej. "Cerramos los feriados").
  type BloqueHorario = { dias: string[]; desde: string; hasta: string };
  const BLOQUE_VACIO: BloqueHorario = { dias: [], desde: '09:00', hasta: '18:00' };
  const [horarioBloques, setHorarioBloques] = useState<BloqueHorario[]>([BLOQUE_VACIO]);
  // Un mismo día no puede estar en dos bloques a la vez (¿cuál horario valdría?): el JSX
  // deshabilita el botón de ese día en los demás bloques mientras esté marcado en uno.
  const actualizarBloques = (bloques: BloqueHorario[]) => {
    setHorarioBloques(bloques);
    const texto = bloques.map((b) => formatearHorario(b.dias, b.desde, b.hasta)).filter(Boolean).join(' · ');
    setStoreForm((prev) => ({ ...prev, horario: texto || prev.horario }));
  };
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null);
  const [storeHeroFile, setStoreHeroFile] = useState<File | null>(null);
  const [storeLogoPreview, setStoreLogoPreview] = useState<string | null>(null);
  const [storeHeroPreview, setStoreHeroPreview] = useState<string | null>(null);
  const [storeCategories, setStoreCategories] = useState<{ name: string; icon: string; href: string }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  // null = no tocar el color: se deja el que ya tenia (de la plantilla o de
  // un preset elegido antes). Con un id, ese preset pisa el primary al guardar.
  // 'logo' es dinamico: el color sale de logoTheme (extraido de una imagen),
  // no de COLOR_PRESETS.
  const [colorPreset, setColorPreset] = useState<string | null>(null);
  const [logoTheme, setLogoTheme] = useState<StoreTheme | null>(null);
  const [extractingTheme, setExtractingTheme] = useState(false);

  // Fotos del producto en el formulario: la [0] es la portada. `file` solo está en las
  // recién elegidas (aún no subidas); las que ya venían del producto solo traen `url`.
  const [fotos, setFotos] = useState<{ url: string; file?: File }[]>([]);
  const agregarFotos = (archivos: File[]) => {
    const imagenes = archivos.filter((f) => f.type.startsWith('image/'));
    if (imagenes.length === 0) return;
    setFotos((prev) => [...prev, ...imagenes.map((file) => ({ url: URL.createObjectURL(file), file }))]);
  };

  const [newProduct, setNewProduct] = useState({
    name: '',
    // "all" sin tienda propia que asumir, salvo que solo administres una: ahí no hay ambigüedad.
    store: selectedStore === 'all' ? (Object.keys(stores).length === 1 ? Object.keys(stores)[0] : '') : selectedStore,
    price: '',
    category: '',
    subcategory: '',
    image: '',
    desc: '',
    stockType: 'ilimitado' as 'ilimitado' | 'limitado',
    stockQuantity: '',
    status: 'Activo',
    ubicacion: '',
    precioOferta: '',
    ofertaHasta: '',
    presentaciones: [] as { label: string; price: string; promo?: boolean }[],
    esServicio: false,
    esCombo: false,
  });

  // Tiendas de terrenos: "Subcategoría" pasa a ser el área, y aparece un campo para la ubicación (enlace de Maps).
  const esTerreno = ['terreno1', 'terreno2'].includes(String((stores as any)[newProduct.store]?.template ?? ''));
  // Gas: los productos se publican sin precio (el cliente consulta por WhatsApp).
  // Vocabulario del formulario: según la tienda a la que se asigna el ítem.
  const formEmpresa = (stores as any)[newProduct.store]?.template === 'empresa';
  const precioOpcional = (stores as any)[newProduct.store]?.template === 'gas' || (stores as any)[newProduct.store]?.template === 'empresa';

  const resetForm = () => {
    setModoPres(null);
    setEditingProductId(null);
    setNewProduct({
      name: '',
      // "all" sin tienda propia que asumir, salvo que solo administres una: ahí no hay ambigüedad.
      store: selectedStore === 'all' ? (Object.keys(stores).length === 1 ? Object.keys(stores)[0] : '') : selectedStore,
      price: '',
      category: '',
      subcategory: '',
      image: '',
      desc: '',
      stockType: 'ilimitado',
      stockQuantity: '',
      status: 'Activo',
      ubicacion: '',
      precioOferta: '',
      ofertaHasta: '',
      presentaciones: [],
      esServicio: false,
      esCombo: false,
    });
    setFotos([]);
  };

  // Tiendas y pedidos al iniciar (los pedidos ya vienen filtrados por dueño desde la base).
  useEffect(() => {
    fetchStores();
    fetchOrders();
  }, []);

  // Los pedidos de la carta llegan solos: se vuelve a mirar cada 45 s mientras el panel está a la vista.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') fetchOrders(); }, 45_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avisa (pitido corto y número en la pestaña) cuando sube la cantidad de pedidos pendientes.
  const pendientesAntes = useRef<number | null>(null);
  useEffect(() => {
    if (pendientesAntes.current !== null && pedidosPendientes > pendientesAntes.current) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; gain.gain.value = 0.08;
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      } catch { /* el navegador puede bloquear el sonido: no pasa nada */ }
    }
    pendientesAntes.current = pedidosPendientes;
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = pedidosPendientes > 0 ? `(${pedidosPendientes}) ${base}` : base;
  }, [pedidosPendientes]);

  // Productos: solo los de MIS tiendas. Antes se bajaba el catálogo de TODAS las tiendas y se filtraba
  // acá (más datos por cada dueño que abría el panel, y crece con cada tienda nueva).
  useEffect(() => {
    fetchProducts(myStoreSlugs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStoreSlugs.join(',')]);

  // Al abrir el editor desde una tarjeta del Inicio, saltar a esa sección.
  useEffect(() => {
    if (!isStoreEditorOpen || !storeEditorSection) return;
    const t = setTimeout(() => {
      document.getElementById(`editor-${storeEditorSection}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => clearTimeout(t);
  }, [isStoreEditorOpen, storeEditorSection]);

  const fetchProducts = async (slugs: string[] = myStoreSlugs, enSilencio = false) => {
    if (slugs.length === 0) {
      setProducts([]);
      if (dbStores.length > 0) setIsLoading(false);   // ya cargaron las tiendas y no hay ninguna propia
      return;
    }
    if (!enSilencio) setIsLoading(true);
    const base = 'id,name,store,price,category,subcategory,stock,status,image,description,created_at';
    let { data, error } = await supabase
      .from('products')
      .select(`${base},images,${COLS_OFERTA},${COL_PRESENTACIONES},es_servicio,es_combo`)
      .in('store', slugs)
      .order('created_at', { ascending: false });
    // Si el SQL de "es_combo" aún no se corrió, se pide sin esa columna.
    if (error) ({ data, error } = await supabase.from('products').select(`${base},images,${COLS_OFERTA},${COL_PRESENTACIONES},es_servicio`).in('store', slugs).order('created_at', { ascending: false }) as any);
    // Si el SQL de "fotos extra" (galería) aún no se corrió, se pide sin esa columna.
    if (error) ({ data, error } = await supabase.from('products').select(`${base},${COLS_OFERTA},${COL_PRESENTACIONES},es_servicio`).in('store', slugs).order('created_at', { ascending: false }) as any);
    // Si el SQL de "es_servicio" aún no se corrió, se pide sin esa columna.
    if (error) ({ data, error } = await supabase.from('products').select(`${base},${COLS_OFERTA},${COL_PRESENTACIONES}`).in('store', slugs).order('created_at', { ascending: false }) as any);
    // Si el SQL de presentaciones aún no se corrió, se pide sin esa columna.
    if (error) ({ data, error } = await supabase.from('products').select(`${base},${COLS_OFERTA}`).in('store', slugs).order('created_at', { ascending: false }) as any);
    // Si el SQL de ofertas aún no se corrió, esas columnas no existen: se pide lo de siempre.
    if (error) ({ data, error } = await supabase.from('products').select(base).in('store', slugs).order('created_at', { ascending: false }) as any);

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
  };

  // Cancelar un pedido devuelve al inventario lo que ese pedido había descontado (según el historial de stock).
  const devolverStockDePedido = async (o: Pedido) => {
    const { data: movs, error } = await supabase
      .from('stock_movements')
      .select('product_id,product_name,delta,motivo')
      .eq('pedido_id', o.id);
    if (error || !movs) return;                                  // sin historial no se sabe qué se descontó
    if (movs.some(m => m.motivo === 'cancelacion')) return;      // ya se devolvió
    const ventas = movs.filter(m => String(m.motivo).startsWith('venta') && m.delta < 0);
    if (ventas.length === 0) return;
    await moverStock(supabase, {
      store: o.store,
      motivo: 'cancelacion',
      pedidoId: o.id,
      usuario: user.email ?? null,
      lineas: ventas.map(m => ({ id: m.product_id, name: m.product_name, delta: -m.delta })),
    });
    refrescarTienda(o.store);
    await fetchProducts();
  };

  const cambiarEstadoPedido = async (o: Pedido, estado: string) => {
    if (o.status === estado) return;
    setPedidoOcupado(o.id);
    const { error } = await supabase.from('orders').update({ status: estado }).eq('id', o.id);
    if (error) {
      alert('No se pudo cambiar el estado del pedido: ' + error.message);
      setPedidoOcupado(null);
      return;
    }
    if (estado === 'Cancelado') await devolverStockDePedido(o);
    await fetchOrders();
    setPedidoOcupado(null);
  };

  // Borra un pedido para siempre. Solo el superadmin y solo si ya está cancelado: sirve para limpiar pedidos de prueba.
  const eliminarPedido = async (o: Pedido) => {
    if (o.status !== 'Cancelado' || !esSuperadmin) return;
    setPedidoOcupado(o.id);
    const { error } = await supabase.from('orders').delete().eq('id', o.id);
    setPedidoOcupado(null);
    if (error) {
      alert('No se pudo eliminar el pedido: ' + error.message);
      return;
    }
    setOrders((prev) => prev.filter((x: any) => x.id !== o.id));
  };

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('*');
    if (data) setDbStores(data);
  };

  // "Carta activa": prende/apaga la tienda. Si está inactiva sigue existiendo
  // pero no recibe pedidos (lo respeta cada plantilla al leer el status).
  const [togglingActive, setTogglingActive] = useState(false);
  const toggleStoreActive = async (slug: string, activa: boolean) => {
    setTogglingActive(true);
    setDbStores(prev => prev.map((s: any) => s.slug === slug ? { ...s, status: activa ? 'active' : 'inactive' } : s));
    const { error } = await supabase.from('stores').update({ status: activa ? 'active' : 'inactive' }).eq('slug', slug);
    if (error) {
      setDbStores(prev => prev.map((s: any) => s.slug === slug ? { ...s, status: activa ? 'inactive' : 'active' } : s));
      alert('No se pudo cambiar el estado de la carta: ' + error.message);
    } else {
      refrescarTienda(slug);
    }
    setTogglingActive(false);
  };

  const addToCart = (product: Product) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      // Un producto Agotado no se vende; con inventario tampoco más unidades de las que hay.
      if (product.status === 'Agotado') return prev;
      if (tiendaTiene(product.store, 'inventario') && !stockIlimitado(product) && (existing?.quantity ?? 0) + 1 > product.stock) return prev;
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      // Entra con el precio vigente (oferta si la hay): de ahí salen el total, el pedido guardado y el ticket.
      return [...prev, { product: { ...product, price: precioOfertaVigente(product) ?? product.price }, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const handlePosCheckout = async () => {
    if (posCart.length === 0 || !focusedStore || !posDisponible) return;
    setIsPosSaving(true);
    const cartTotal = posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const saleDetails = {
      store: focusedStore,
      customer_name: posCustomerName.trim() || 'Cliente Local (POS)',
      customer_phone: posCustomerPhone.trim() || null,
      items: posCart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      total_amount: cartTotal,
      status: 'Entregado',
      payment_method: posPaymentMethod,
      seller_name: posSeller === 'Otro' ? customSeller.trim() || 'Otro' : posSeller,
      order_source: 'POS'
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([saleDetails])
      .select('*')
      .single();

    if (error) {
      console.error('Error saving POS sale:', error);
      alert('Hubo un error al registrar la venta: ' + error.message);
    } else {
      if (tiendaTiene(focusedStore, 'inventario')) await descontarStock(posCart, data?.id ?? null);
      setLastCompletedSale(data || { ...saleDetails, id: 'POS-' + Math.floor(Math.random() * 90000 + 10000), created_at: new Date().toISOString() });
      setPosCart([]);
      setPosCustomerName('');
      setPosCustomerPhone('');
      setIsTicketModalOpen(true);
      fetchOrders();
    }
    setIsPosSaving(false);
  };

  // Boleta de la venta del POS en PDF (formato ticket 80mm). El modal ya tiene
  // "Imprimir" (window.print) y "Compartir por WhatsApp" en texto; esto agrega
  // un archivo descargable/archivable.
  const descargarBoletaPDF = (venta: any) => {
    const storeName = stores[venta.store]?.name || String(venta.store).toUpperCase();
    const items = Array.isArray(venta.items)
      ? venta.items
      : typeof venta.items === 'string' ? JSON.parse(venta.items) : [];

    const W = 80;
    const doc = new jsPDF({ unit: 'mm', format: [W, 297] });
    const M = 6;
    let y = 10;
    const line = (txt: string, opts: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; gap?: number } = {}) => {
      doc.setFontSize(opts.size ?? 8);
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      const x = opts.align === 'center' ? W / 2 : opts.align === 'right' ? W - M : M;
      doc.text(txt, x, y, { align: opts.align ?? 'left' });
      y += opts.gap ?? 4.2;
    };
    const rule = () => { doc.setLineDashPattern([0.6, 0.6], 0); doc.line(M, y, W - M, y); y += 3; };
    const row = (l: string, r: string, bold = false) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(l, M, y);
      doc.text(r, W - M, y, { align: 'right' });
      y += 4.2;
    };

    line('BOGA MARKET', { size: 12, bold: true, align: 'center', gap: 4.5 });
    line(storeName, { size: 8, bold: true, align: 'center' });
    line('TICKET DE VENTA LOCAL', { size: 7, align: 'center', gap: 5 });
    rule();
    row('ID Venta:', '#' + String(venta.id).substring(0, 8));
    row('Fecha:', new Date(venta.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    row('Vendedor:', venta.seller_name || '-');
    row('Pago:', venta.payment_method || '-');
    if (venta.customer_name && venta.customer_name !== 'Cliente Local (POS)') row('Cliente:', venta.customer_name);
    rule();
    items.forEach((it: any) => {
      row(`${it.quantity}x ${it.name}`.slice(0, 32), `S/ ${(it.price * it.quantity).toFixed(2)}`);
    });
    rule();
    row('TOTAL', `S/ ${Number(venta.total_amount).toFixed(2)}`, true);
    y += 4;
    line('¡Gracias por su compra!', { size: 7, align: 'center' });

    doc.save(`Boleta_${storeName.replace(/\s+/g, '_')}_${String(venta.id).substring(0, 8)}.pdf`);
  };

  const openStoreEditor = (slug: string, section: string | null = null) => {
    const config = stores[slug];
    const dbData = dbStores.find((s: any) => s.slug === slug);
    setStoreEditorSection(section);
    setEditingStoreSlug(slug);
    setStoreForm({
      name: dbData?.name || config?.name || '',
      tagline: dbData?.tagline || config?.tagline || '',
      marketplace_category: dbData?.marketplace_category || config?.marketplaceCategory || '',
      whatsapp: dbData?.whatsapp || '',
      show_demo_products: dbData?.show_demo_products ?? false,
      hide_hero_text: dbData?.hide_hero_text === true || config?.hideHeroText === true,
      zona: dbData?.zona || config?.zona || '',
      direccion: dbData?.direccion || config?.direccion || '',
      horario: dbData?.horario || config?.horario || '',
      rating: dbData?.rating != null ? String(dbData.rating) : (config?.rating != null ? String(config.rating) : ''),
      metodos_pago: dbData?.metodos_pago || config?.metodosPago || [],
      facebook: dbData?.facebook || config?.facebook || '',
      instagram: dbData?.instagram || config?.instagram || '',
      tiktok: dbData?.tiktok || config?.tiktok || '',
      latitud: typeof dbData?.latitud === 'number' ? dbData.latitud : null,
      longitud: typeof dbData?.longitud === 'number' ? dbData.longitud : null,
      mostrar_ubicacion: dbData?.mostrar_ubicacion === true,
      entrega: dbData?.entrega === 'delivery' || dbData?.entrega === 'recojo' ? dbData.entrega : 'ambos',
      perfil_empresa: normalizarPerfilEmpresa(dbData?.perfil_empresa) ?? {},
    });
    // El constructor de horario arranca en blanco: no intenta adivinar los días/hora desde el texto libre que ya tenía.
    setHorarioBloques([BLOQUE_VACIO]);
    setStoreHeroPreview(dbData?.hero_image || config?.heroImage || null);
    setStoreLogoPreview(dbData?.logo_image || config?.logoImage || null);
    setStoreLogoFile(null);
    setStoreHeroFile(null);
    setStoreCategories(dbData?.categories || config?.categories || []);
    setNewCategoryName('');
    const currentPrimary = (dbData?.theme || config?.theme)?.primary;
    setColorPreset(COLOR_PRESETS.find((p) => p.theme.primary === currentPrimary)?.id ?? null);
    setLogoTheme(null);
    setIsStoreEditorOpen(true);
  };

  // Preset dinamico: saca la paleta de la imagen que el comercio ya cargo
  // (logo si tiene, si no el banner) en vez de un color fijo elegido a mano.
  const handlePickLogoColor = async () => {
    const imageUrl = storeLogoPreview || storeHeroPreview;
    if (!imageUrl) {
      alert('Sube un logo o una portada primero para poder sacar sus colores.');
      return;
    }
    setExtractingTheme(true);
    const extracted = await extractThemeFromImageClient(imageUrl);
    setExtractingTheme(false);
    if (!extracted) {
      alert('No se pudieron sacar colores de esa imagen. Prueba con otra.');
      return;
    }
    setLogoTheme(extracted);
    setColorPreset('logo');
  };

  const handleStoreSave = async () => {
    if (!editingStoreSlug) return;
    setIsStoreSaving(true);
    try {
      let logoUrl: string | null = storeLogoPreview;
      let heroUrl: string | null = storeHeroPreview;

      // En paralelo: son subidas independientes, esperarlas en fila duplica lo
      // que tarda guardar cuando el comercio cambia logo y portada a la vez.
      const [logoSubido, heroSubido] = await Promise.all([
        storeLogoFile
          ? uploadFile(storeLogoFile, `store-assets/${editingStoreSlug}`).catch((err) => {
              console.error('Error subiendo logo:', err);
              return null;
            })
          : null,
        storeHeroFile
          ? uploadFile(storeHeroFile, `store-assets/${editingStoreSlug}`).catch((err) => {
              console.error('Error subiendo portada:', err);
              return null;
            })
          : null,
      ]);
      if (logoSubido) logoUrl = logoSubido;
      if (heroSubido) heroUrl = heroSubido;

      const upsertData: any = {
        slug: editingStoreSlug,
        name: storeForm.name,
        tagline: storeForm.tagline,
        marketplace_category: storeForm.marketplace_category,
        whatsapp: storeForm.whatsapp || null,
        show_demo_products: storeForm.show_demo_products,
        hide_hero_text: storeForm.hide_hero_text,
        zona: storeForm.zona || null,
        direccion: storeForm.direccion || null,
        horario: storeForm.horario || null,
        rating: storeForm.rating !== '' ? Number(storeForm.rating) : null,
        metodos_pago: storeForm.metodos_pago.length ? storeForm.metodos_pago : null,
        entrega: storeForm.entrega,
        facebook: storeForm.facebook || null,
        instagram: storeForm.instagram || null,
        tiktok: storeForm.tiktok || null,
        categories: storeCategories,
        status: 'active',
      };
      // Perfil de empresa: solo se manda en tiendas con esa plantilla o que ya tenían uno (así guardar otra tienda no depende del SQL).
      const tienePerfilEmpresa = stores[editingStoreSlug]?.template === 'empresa' || !!dbStores.find((x: any) => x.slug === editingStoreSlug)?.perfil_empresa;
      if (tienePerfilEmpresa) upsertData.perfil_empresa = normalizarPerfilEmpresa(storeForm.perfil_empresa);
      // Ubicación: solo se manda si la tienda tiene o tuvo una (así, sin correr el SQL, guardar la tienda no avisa nada).
      const tuvoUbicacion = typeof dbStores.find((x: any) => x.slug === editingStoreSlug)?.latitud === 'number';
      if (storeForm.latitud != null || tuvoUbicacion) {
        upsertData.latitud = storeForm.latitud;
        upsertData.longitud = storeForm.longitud;
        upsertData.mostrar_ubicacion = storeForm.latitud != null && storeForm.longitud != null && storeForm.mostrar_ubicacion;
      }
      if (heroUrl) upsertData.hero_image = heroUrl;
      if (logoUrl) upsertData.logo_image = logoUrl;

      // Solo se manda el theme si el comercio eligio un preset (incluido "logo",
      // el extraido de una imagen): sin esto, no tocar el color no rompe el que
      // ya venia de la plantilla o de un preset anterior (el upsert es parcial,
      // no pisa columnas que no se incluyen).
      if (colorPreset) {
        const preset = colorPreset !== 'logo' ? getColorPreset(colorPreset) : null;
        const chosenColors = colorPreset === 'logo' ? logoTheme : preset?.theme;
        const currentTheme = stores[editingStoreSlug]?.theme;
        if (chosenColors) {
          upsertData.theme = {
            ...chosenColors,
            fontHeadline: currentTheme?.fontHeadline ?? chosenColors.fontHeadline,
            fontBody: currentTheme?.fontBody ?? chosenColors.fontBody,
            fontLabel: currentTheme?.fontLabel ?? chosenColors.fontLabel,
          };
        }
      }

      let { error } = await supabase.from('stores').upsert(upsertData, { onConflict: 'slug' });

      // Si alguna columna nueva todavia no existe en la base, reintenta sin ella
      // en vez de perder todo el guardado. Paso exactamente esto con `whatsapp`:
      // el panel quedo sin poder guardar NADA de ninguna tienda hasta correr la
      // migracion. Columnas opcionales porque llegaron despues del lanzamiento.
      const columnasOpcionales = ['show_demo_products', 'hide_hero_text', 'zona', 'direccion', 'horario', 'rating', 'metodos_pago', 'categories', 'facebook', 'instagram', 'tiktok', 'latitud', 'longitud', 'mostrar_ubicacion', 'perfil_empresa'];
      const columnasFaltantes: string[] = [];
      let faltante = columnasOpcionales.find((col) => col in upsertData && new RegExp(col).test(error?.message || ''));
      while (error && faltante) {
        delete upsertData[faltante];
        columnasFaltantes.push(faltante);
        ({ error } = await supabase.from('stores').upsert(upsertData, { onConflict: 'slug' }));
        faltante = columnasOpcionales.find((col) => col in upsertData && new RegExp(col).test(error?.message || ''));
      }
      if (!error && columnasFaltantes.length) {
        alert(
          `Tienda guardada, pero estos campos todavía no se guardaron: ${columnasFaltantes.join(', ')}.\n\n` +
          'Corré la migración pendiente en el SQL editor de Supabase (ver supabase_setup.sql).'
        );
      }
      if (error) throw error;

      refrescarTienda(String(upsertData.slug));
      await fetchStores();
      setIsStoreEditorOpen(false);
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsStoreSaving(false);
    }
  };

  // Reiniciar el DISEÑO: vuelve a los colores y las categorías de la plantilla. La tienda NO se borra: se queda con su
  // nombre, logo, portada, WhatsApp, módulos, dueño y productos. (Antes este botón borraba la fila entera de la tienda.)
  const handleStoreReset = async () => {
    if (!editingStoreSlug) return;
    if (!window.confirm('¿Reiniciar el diseño? Los colores y las categorías vuelven a los de la plantilla. Tu nombre, logo, portada, WhatsApp y productos NO se tocan.')) return;
    setIsStoreSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ theme: {}, categories: [], hide_hero_text: false })
        .eq('slug', editingStoreSlug);
      if (error) throw error;
      refrescarTienda(editingStoreSlug);
      await fetchStores();
      setIsStoreEditorOpen(false);
    } catch (err: any) {
      alert('Error al reiniciar: ' + err.message);
    } finally {
      setIsStoreSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Activo' ? 'Agotado' : 'Activo';
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    try {
      const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      const tiendaDelProducto = products.find(p => p.id === id)?.store;
      if (tiendaDelProducto) refrescarTienda(tiendaDelProducto);
    } catch (error) {
      console.error('Error updating status:', error);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: currentStatus } : p));
      alert('Error al actualizar el estado.');
    }
  };

  // Equipo de la caja: los vendedores propios de cada negocio (columna stores.vendedores).
  const equipo: string[] = (dbStores.find((s: any) => s.slug === focusedStore)?.vendedores as string[] | null | undefined) ?? [];
  const guardarEquipo = async (lista: string[]) => {
    const { error } = await supabase.from('stores').update({ vendedores: lista }).eq('slug', focusedStore);
    if (error) { alert('No se pudo guardar el equipo: ' + error.message + '\n\nSi dice que falta la columna "vendedores", falta correr la migración (supabase_setup.sql).'); return; }
    setDbStores(prev => prev.map((s: any) => s.slug === focusedStore ? { ...s, vendedores: lista } : s));
  };
  const agregarVendedor = async () => {
    const nombre = nuevoVendedor.trim();
    if (!nombre || equipo.some(n => n.toLowerCase() === nombre.toLowerCase()) || nombre.toLowerCase() === 'administrador') { setNuevoVendedor(''); return; }
    await guardarEquipo([...equipo, nombre]);
    setPosSeller(nombre);
    setNuevoVendedor('');
  };
  const quitarVendedor = async (nombre: string) => {
    await guardarEquipo(equipo.filter(n => n !== nombre));
    if (posSeller === nombre) setPosSeller('Administrador');
  };
  // Al cambiar de tienda, el vendedor elegido ya no aplica.
  useEffect(() => { setPosSeller('Administrador'); setIsEquipoOpen(false); }, [focusedStore]);

  const panelEquipo = isEquipoOpen ? (
    <div className="p-2 border-b border-[#e1e3e4]/10 bg-white flex flex-col gap-1.5">
      <h4 className="text-[8px] font-extrabold text-gray-400 uppercase tracking-widest">Mi equipo</h4>
      {equipo.length === 0 ? (
        <p className="text-[10px] text-gray-500">Agrega a quienes cobran en tu local. Aparecerán como vendedor en cada boleta.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {equipo.map(n => (
            <span key={n} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-[#ffece9]/60 border border-[#e1e3e4]/40 rounded-full text-[10px] font-semibold text-gray-700">
              {n}
              <button type="button" onClick={() => quitarVendedor(n)} title={`Quitar a ${n}`} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white text-gray-400 hover:text-[#8c0009] cursor-pointer">
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          type="text"
          value={nuevoVendedor}
          onChange={(e) => setNuevoVendedor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarVendedor(); } }}
          placeholder="Nombre del vendedor"
          className="flex-1 min-w-0 px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)] h-7"
        />
        <button type="button" onClick={agregarVendedor} className="px-2 h-7 rounded bg-[var(--tienda-color)] text-white text-[10px] font-bold cursor-pointer">Agregar</button>
      </div>
    </div>
  ) : null;

  // Inventario: "Ingresar mercadería" suma unidades al stock de un producto con stock controlado.
  // Si estaba Agotado por llegar a 0, vuelve a Activo.
  const agregarStock = async (p: Product) => {
    const txt = window.prompt(`¿Cuántas unidades entraron de "${p.name}"?`, '10');
    if (txt == null) return;
    const n = parseInt(txt, 10);
    if (isNaN(n) || n <= 0) { alert('Escribe un número mayor a 0.'); return; }
    const { fallidos } = await moverStock(supabase, {
      store: p.store,
      motivo: 'ingreso',
      usuario: user.email ?? null,
      lineas: [{ id: p.id, name: p.name, delta: n }],
    });
    if (fallidos.length) { alert('No se pudo ingresar la mercadería. Inténtalo de nuevo.'); return; }
    refrescarTienda(p.store);
    await fetchProducts();
  };

  // Inventario: descuenta lo vendido en el POS y lo deja en el historial (ver lib/stock.ts).
  const descontarStock = async (items: { product: Product; quantity: number }[], pedidoId?: string | null) => {
    const { fallidos, cambiados } = await moverStock(supabase, {
      store: focusedStore,
      motivo: 'venta_pos',
      pedidoId: pedidoId ?? null,
      usuario: user.email ?? null,
      lineas: items.map(({ product, quantity }) => ({ id: product.id, name: product.name, delta: -quantity })),
    });
    if (cambiados.length > 0) refrescarTienda(focusedStore);
    await fetchProducts();
    if (fallidos.length) alert('La venta se registró, pero no se pudo descontar el stock de: ' + fallidos.join(', ') + '. Revísalo en Productos.');
  };

  // Celda de stock de la tabla y de las tarjetas de Productos (solo con el módulo de inventario).
  const celdaStock = (p: Product) => {
    if (!tiendaTiene(p.store, 'inventario')) return <span className="text-xs text-gray-300">—</span>;
    if (stockIlimitado(p)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/80">
          <span className="material-symbols-outlined text-[13px]">all_inclusive</span>
          Ilimitado
        </span>
      );
    }
    const sin = p.stock <= 0;
    const bajo = !sin && p.stock <= STOCK_BAJO;
    const estilo = sin
      ? 'bg-red-50 text-red-600 border-red-100/80'
      : bajo ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-100/80';
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${estilo}`}>
          <span className="material-symbols-outlined text-[13px]">{sin ? 'block' : bajo ? 'warning' : 'inventory_2'}</span>
          {sin ? 'Sin stock' : bajo ? `Quedan ${p.stock}` : `${p.stock} unid.`}
        </span>
        <button
          type="button"
          onClick={() => agregarStock(p)}
          title="Ingresar mercadería"
          className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-[var(--tienda-color)] hover:border-[var(--tienda-color)]/40 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
        </button>
      </span>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) agregarFotos(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fotos.length === 0) {
      alert("Por favor selecciona al menos una foto");
      return;
    }
    setIsSaving(true);

    try {
      // 1. Subir las fotos nuevas (las que ya venían del producto no se vuelven a subir)
      const folder = `product-images/${newProduct.store.replace(/\s+/g, '-').toLowerCase()}`;
      const urlsFotos = await Promise.all(fotos.map((f) => (f.file ? uploadFile(f.file, folder) : Promise.resolve(f.url))));
      const finalImageUrl = urlsFotos[0];

      // 2. Calcular stock y status
      let finalStock: number | null = null;
      let finalStatus = newProduct.status || 'Activo';

      if (newProduct.stockType === 'limitado' && tiendaTiene(newProduct.store, 'inventario')) {
        const parsed = parseInt(newProduct.stockQuantity, 10);
        finalStock = isNaN(parsed) ? 0 : Math.max(0, parsed);
        if (finalStock === 0) {
          finalStatus = 'Agotado';
        } else if (finalStatus === 'Agotado' && editingProductId) {
          // Si estaba Agotado porque se le acabó el stock y ahora le cargan unidades, vuelve a Activo.
          const antes = products.find(x => x.id === editingProductId);
          if (antes && antes.status === 'Agotado' && !(antes.stock > 0)) finalStatus = 'Activo';
        }
      } else {
        finalStock = null; // null = ilimitado / siempre disponible
      }

      // El enlace de ubicación de un terreno se guarda al final de la descripción (la plantilla lo detecta
      // y lo usa en "Ver ubicación" sin mostrarlo como texto).
      const descripcionFinal = esTerreno && newProduct.ubicacion.trim()
        ? `${newProduct.desc.trim()}\n${newProduct.ubicacion.trim()}`.trim()
        : newProduct.desc;

      // Oferta: precio rebajado (menor al normal) y, si quiere, hasta qué día. Los campos solo se mandan si hay
      // oferta o si el producto tenía una que se está quitando (así guardar un producto normal no depende del SQL).
      // Presentaciones (100 g / 250 g / 1 kg…): filas con etiqueta y precio válidos. Si hay, `price` guarda la más barata
      // ("Desde S/ …") y no se usa oferta (cada medida ya tiene su precio).
      // Se guardan de menor a mayor cantidad (1 unidad, 2, 3, 12…), sin importar el orden en que se escribieron.
      const presLimpias = ordenarPresentaciones(leerPresentaciones(newProduct.presentaciones.map((x) => ({ label: x.label, price: parseFloat(x.price), promo: x.promo === true }))));
      if (newProduct.presentaciones.some((x) => (x.label.trim() || x.price.trim()) && !(x.label.trim() && parseFloat(x.price) > 0))) {
        throw new Error('Cada presentación necesita un nombre (ej. 250 g) y un precio mayor a 0. Completa o quita las filas vacías.');
      }
      const hayPres = presLimpias.length > 0;
      const precioNormal = hayPres ? precioDesde(presLimpias) : (precioOpcional ? (parseFloat(newProduct.price) || 0) : parseFloat(newProduct.price));
      const precioOfertaNum = hayPres ? 0 : parseFloat(newProduct.precioOferta);
      const hayOferta = !hayPres && newProduct.precioOferta.trim() !== '' && precioOfertaNum > 0;
      if (hayOferta && !(precioOfertaNum < precioNormal)) throw new Error('El precio en oferta debe ser menor al precio normal.');
      const productoPrevio = editingProductId ? products.find(x => x.id === editingProductId) : undefined;
      const camposOferta = hayOferta || productoPrevio?.precio_oferta
        ? { precio_oferta: hayOferta ? precioOfertaNum : null, oferta_hasta: hayOferta && newProduct.ofertaHasta ? newProduct.ofertaHasta : null }
        : {};
      // Igual que la oferta: la columna solo se manda si hay presentaciones o si el producto tenía y se le quitan.
      const camposPres = hayPres || (productoPrevio?.presentaciones?.length ?? 0) > 0
        ? { [COL_PRESENTACIONES]: hayPres ? presLimpias : null }
        : {};
      // Igual que arriba: la columna solo se manda si está marcado o si el producto ya la tenía (para poder destildarla).
      const camposServicio = newProduct.esServicio || productoPrevio?.es_servicio
        ? { es_servicio: newProduct.esServicio }
        : {};
      // Combo: la columna solo se manda si está marcado o si el producto ya la tenía (para poder destildarla).
      const camposCombo = newProduct.esCombo || productoPrevio?.es_combo
        ? { es_combo: newProduct.esCombo }
        : {};
      // Igual que arriba: solo se manda si hay más de una foto o si el producto ya tenía galería (para poder achicarla a una sola).
      const camposFotos = urlsFotos.length > 1 || (productoPrevio?.images?.length ?? 0) > 0
        ? { images: urlsFotos.length > 1 ? urlsFotos : null }
        : {};

      // 3. Guardar en la base de datos
      if (editingProductId) {
        const { error: dbError } = await supabase.from('products').update({
          name: newProduct.name,
          store: newProduct.store,
          price: precioNormal,
          category: newProduct.category,
          subcategory: newProduct.subcategory,
          image: finalImageUrl,
          description: descripcionFinal,
          ...camposOferta,
          ...camposPres,
          ...camposServicio,
          ...camposCombo,
          ...camposFotos,
          // Sin módulo de inventario no se toca el stock guardado (por si lo vuelven a prender).
          ...(tiendaTiene(newProduct.store, 'inventario') ? { stock: finalStock } : {}),
          status: finalStatus,
        }).eq('id', editingProductId);

        if (dbError) throw dbError;

        // Se ve el cambio de inmediato en la lista, sin esperar a volver a pedirla.
        setProducts((prev) => prev.map((x) => x.id !== editingProductId ? x : {
          ...x,
          name: newProduct.name,
          store: newProduct.store,
          price: precioNormal,
          category: newProduct.category,
          subcategory: newProduct.subcategory,
          image: finalImageUrl,
          description: descripcionFinal,
          status: finalStatus,
          ...(tiendaTiene(newProduct.store, 'inventario') ? { stock: finalStock as number } : {}),
          ...camposOferta,
          ...camposPres,
          ...camposServicio,
          ...camposCombo,
          ...camposFotos,
        } as Product));

        // Con inventario, un cambio de stock hecho a mano queda como "ajuste" en el historial.
        if (tiendaTiene(newProduct.store, 'inventario')) {
          const antes = products.find(x => x.id === editingProductId);
          if (antes && finalStock !== null && !stockIlimitado(antes) && finalStock !== antes.stock) {
            await registrarMovimientos(supabase, [{
              store: newProduct.store,
              product_id: editingProductId,
              product_name: newProduct.name,
              delta: finalStock - (antes.stock || 0),
              stock_despues: finalStock,
              motivo: 'ajuste',
              usuario: user.email ?? null,
            }]);
          }
        }
      } else {
        const { data: creado, error: dbError } = await supabase.from('products').insert([
          {
            name: newProduct.name,
            store: newProduct.store,
            price: precioNormal,
            category: newProduct.category,
            subcategory: newProduct.subcategory,
            image: finalImageUrl,
            description: descripcionFinal,
            ...camposOferta,
            ...camposPres,
            ...camposServicio,
            ...camposCombo,
            ...camposFotos,
            stock: finalStock,
            status: finalStatus,
          }
        ]).select().single();

        if (dbError) throw dbError;
        // Aparece en la lista de inmediato, sin esperar a que se vuelva a pedir todo.
        if (creado) setProducts((prev) => [creado as Product, ...prev.filter((x) => x.id !== (creado as Product).id)]);
      }

      // Éxito: se cierra el formulario ya (antes esperaba a volver a pedir TODA la lista) y se refresca en segundo plano.
      const tiendaGuardada = newProduct.store;
      const seguir = crearOtroRef.current && !editingProductId;
      crearOtroRef.current = false;
      if (seguir) {
        // Se queda abierto con los mismos datos: solo cambian el nombre y la foto del siguiente producto.
        setAvisoCreado(newProduct.name);
        setNewProduct((prev) => ({ ...prev, name: '', image: '' }));
        setFotos([]);
        document.getElementById('form-producto-dueno')?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setAvisoCreado('');
        setIsModalOpen(false);
        resetForm();
      }
      refrescarTienda(tiendaGuardada);
      fetchProducts(undefined, true);
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert('Hubo un error al guardar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    // stock 0 con estado Activo = "no se cargó" (es el valor por defecto de la base), no "agotado": abrirlo a
    // editar no debe convertirlo en stock limitado con 0 (al guardar quedaría marcado como Agotado).
    const hasFixedStock = !stockIlimitado(product);
    setNewProduct({
      name: product.name,
      store: product.store,
      price: product.price.toString(),
      category: product.category,
      subcategory: product.subcategory || '',
      image: product.image,
      desc: (product.description || '').replace(RE_MAPS, '').trim(),
      stockType: hasFixedStock ? 'limitado' : 'ilimitado',
      stockQuantity: hasFixedStock ? product.stock.toString() : '',
      status: product.status || 'Activo',
      ubicacion: (product.description || '').match(RE_MAPS)?.[0] ?? '',
      precioOferta: product.precio_oferta ? String(product.precio_oferta) : '',
      ofertaHasta: product.oferta_hasta ? product.oferta_hasta.slice(0, 10) : '',
      presentaciones: leerPresentaciones(product.presentaciones).map((x) => ({ label: x.label, price: String(x.price), promo: x.promo === true })),
      esServicio: product.es_servicio === true,
      esCombo: product.es_combo === true,
    });
    setFotos(
      product.images?.length ? product.images.map((url) => ({ url })) : product.image ? [{ url: product.image }] : []
    );
    setIsModalOpen(true);
  };

  // Duplicar: abre el formulario con todo lo del producto (categoría, precio, presentaciones, oferta, combo…) pero como
  // producto NUEVO y sin foto. Sirve para el mismo producto en otro color o sabor: solo cambian el nombre y la foto.
  const handleDuplicate = (product: Product) => {
    handleEdit(product);
    setEditingProductId(null);
    setNewProduct((prev) => ({ ...prev, name: `${product.name} (copia)`, image: '' }));
    setFotos([]);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"? Esta acción no se puede deshacer.`)) {
      setIsDeleting(id);
      try {
        const tiendaDelProducto = products.find(p => p.id === id)?.store;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        if (tiendaDelProducto) refrescarTienda(tiendaDelProducto);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        fetchProducts(undefined, true);
      } catch (error: any) {
        alert('Error al eliminar: ' + error.message);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const getBase64Image = async (url: string): Promise<string | null> => {
    try {
      // fotos.bogahub.app (R2) no manda cabeceras CORS: pedir la imagen directo desde el navegador
      // falla siempre ("Failed to fetch"), por eso el PDF salía sin fotos. Mismo arreglo que ya
      // existe para sacar la paleta de colores del logo (ver lib/extractThemeClient.ts).
      const remota = /^https?:\/\//i.test(url) && typeof window !== 'undefined' && new URL(url).origin !== window.location.origin;
      const res = await fetch(remota ? `/api/img-proxy?u=${encodeURIComponent(url)}` : url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const exportStoreMenuPDF = async (storeSlug: string) => {
    if (isExporting) return;
    const storeObj = Object.values(stores).find(s => s.slug === storeSlug);
    if (!storeObj) return;

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(20, 20, 20);
      doc.text(`Menú - ${storeObj.name}`, 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(storeObj.tagline, 14, 28);
      
      let yOffset = 35;
      const storeProducts = products.filter(p => p.store === storeSlug);

      // Preload all images
      const imagesMap: Record<string, string> = {};
      await Promise.all(storeProducts.map(async (p) => {
        if (p.image) {
          const b64 = await getBase64Image(p.image);
          if (b64) imagesMap[p.id] = b64;
        }
      }));
      
      // Se agrupa por la categoría real de cada producto. El array
      // storeObj.categories solo lleva iconos y orden para la vitrina; el PDF
      // no los necesita, y las tiendas de la DB suelen tenerlo vacío.
      const categorias = Array.from(new Set(storeProducts.map(p => p.category || 'Sin categoría')));

      categorias.forEach(cat => {
        const catProducts = storeProducts.filter(p => (p.category || 'Sin categoría') === cat);
        if (catProducts.length === 0) return;

        autoTable(doc, {
          startY: yOffset,
          head: [['', cat.toUpperCase(), 'Descripción', 'Precio']],
          body: catProducts.map(p => [
            '', // placeholder for image
            p.name + (p.subcategory ? `\n(Subcategoría: ${p.subcategory})` : ''),
            p.description || '-', 
            `S/ ${Number(p.price).toFixed(2)}`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 4, minCellHeight: 18, valign: 'middle' },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 45, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
          },
          margin: { top: 10, left: 14, right: 14 },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const product = catProducts[data.row.index];
              const b64 = imagesMap[product.id];
              if (b64) {
                try {
                  // The image format can usually be detected, but we specify 'JPEG' as a fallback
                  doc.addImage(b64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 14, 14);
                } catch {}
              }
            }
          }
        });
        
        yOffset = (doc as any).lastAutoTable.finalY + 15;
        
        // Add page if needed
        if (yOffset > 270) {
          doc.addPage();
          yOffset = 20;
        }
      });
      
      doc.save(`Menu_${storeObj.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      data-admin-root
      className="min-h-screen md:h-screen md:overflow-hidden bg-[#f8f9fa] font-['Outfit'] flex flex-col md:flex-row"
      // Todo el rojo fijo del panel (bg-[var(--tienda-color)], text-[var(--tienda-color)]...) ahora
      // toma la marca de la tienda que se está viendo; sin tienda (o sin color propio) cae al rojo de BogaHub.
      style={{ '--tienda-color': colorPanel } as React.CSSProperties}
    >
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Sidebar (Visible en Desktop) — el padre ya no scrollea (md:overflow-hidden),
          asi que se queda fijo sin depender de `sticky`: antes se despegaba al
          bajar con la rueda del mouse porque el documento entero scrolleaba. */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-gray-100 flex-col h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
          <div className="w-8 h-8 rounded-lg bg-[var(--tienda-color)] text-white flex items-center justify-center font-bold text-xl">B</div>
          <span className="font-extrabold text-xl tracking-tight text-gray-900">Workspace</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold transition-colors ${activeTab === t.id ? 'bg-[var(--tienda-color)] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.id === 'products' && esEmpresa ? 'Servicios' : t.label}
              {t.id === 'orders' && pedidosPendientes > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center">{pedidosPendientes}</span>
              )}
            </button>
          ))}

          {/* Static Install Button */}
          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('bogadash_pwa_stats');
                window.location.reload();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[var(--tienda-color)] hover:bg-[var(--tienda-color)]/10 rounded-md font-bold transition-colors mt-4"
          >
            <span className="material-symbols-outlined text-[20px]">install_mobile</span>
            Instalar App
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-1">
          <p className="px-4 text-[11px] text-gray-400 font-semibold truncate">{user.email}</p>
          {inicioStore && (
            <a href={inicioUrl} className="flex items-center gap-3 px-4 py-3 text-[var(--tienda-color)] hover:text-gray-900 font-bold transition-colors">
              <span className="material-symbols-outlined text-[20px]">storefront</span>
              Volver a mi tienda
            </a>
          )}
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 font-semibold transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Volver a BogaHub
          </Link>
          <button
            onClick={async () => { await signOut(); router.replace('/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      {/* min-w-0: sin esto el flex item no baja de su ancho de contenido y desborda la pagina */}
      <main className={`flex-1 min-w-0 px-3 py-4 md:p-6 w-full pb-28 md:pb-6 md:h-screen md:overflow-y-auto ${activeTab === 'pos' ? 'max-w-none md:px-6' : 'max-w-7xl mx-auto'}`}>
        {viendoComo && (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900">
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            <span>
              Modo superadmin: estás viendo el panel de <b>{dbStores.find((s: any) => s.slug === viendoComo)?.name || viendoComo}</b> tal como lo ve su dueño.
              Lo que cambies aquí se guarda de verdad.
            </span>
            <Link href="/superadmin" className="ml-auto underline font-bold">Volver al superadmin</Link>
          </div>
        )}
        <header className={`hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 ${activeTab === 'pos' ? 'mb-2' : 'mb-6'}`}>
          <div>
            <h1 className={`${activeTab === 'pos' ? 'text-lg font-black' : 'text-2xl font-extrabold'} text-gray-900 tracking-tight`}>
              {activeTab === 'inicio' ? 'Inicio' : activeTab === 'products' ? (esEmpresa ? 'Gestión de Servicios' : 'Gestión de Productos') : activeTab === 'categories' ? 'Categorías' : activeTab === 'orders' ? 'Gestión de Pedidos' : activeTab === 'stores' ? 'Mis Tiendas' : activeTab === 'pos' ? 'Caja Rápida (POS)' : 'Métricas y Rendimiento'}
              {(activeTab === 'pos' || activeTab === 'inicio') && stores[focusedStore] && (
                <span className="ml-2 text-gray-400 font-semibold">· {stores[focusedStore].name}</span>
              )}
            </h1>
            {activeTab !== 'pos' && activeTab !== 'inicio' && (
              <p className="text-gray-500 text-sm font-medium mt-1">
                {activeTab === 'products' ? (esEmpresa ? 'Administra los servicios de tu empresa.' : inventarioOn ? 'Administra el inventario de tus tiendas.' : 'Administra la carta de tus tiendas.') : activeTab === 'categories' ? 'Crea, ordena y renombra los rubros de tu carta.' : activeTab === 'orders' ? 'Gestiona los pedidos de tus clientes.' : activeTab === 'stores' ? 'Administra la información de tus sucursales.' : 'Analiza el rendimiento de tu negocio.'}
              </p>
            )}
          </div>
          <div className="hidden md:flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-1.5">
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className={`bg-white border border-gray-200 text-gray-900 rounded-md font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5 cursor-pointer ${activeTab === 'pos' ? 'px-3 py-1.5 text-xs h-9' : 'px-4 py-2.5 text-sm'}`}
              >
                <option value="all">Todas mis tiendas</option>
                {Object.values(stores).map(s => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </div>
            {/* Cada pestaña muestra solo su accion principal */}
            {activeTab === 'pos' ? (
              <button
                onClick={() => setPosCart([])}
                className="flex items-center justify-center gap-1.5 bg-white text-[#8c0009] border border-[#8c0009]/25 hover:bg-[#8c0009]/5 px-3.5 py-1.5 rounded-md font-bold text-xs transition-all w-full md:w-auto h-9 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                Limpiar Carrito
              </button>
            ) : activeTab === 'products' ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setIsLoyverseOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-md font-bold hover:bg-emerald-100 transition-all text-sm w-full md:w-auto cursor-pointer shadow-sm"
                  title="Sincronizar con punto de venta Loyverse POS"
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">sync_alt</span>
                  Loyverse POS
                </button>
                <button
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                  className="flex items-center justify-center gap-2 bg-[var(--tienda-color)] text-white px-5 py-2.5 rounded-md font-bold shadow-lg shadow-[var(--tienda-color)]/20 hover:shadow-[var(--tienda-color)]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full md:w-auto"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Nuevo Producto
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {activeTab === 'inicio' && !inicioStore && (
          <div className="max-w-md mx-auto py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-[28px]">storefront</span>
            </div>
            <h3 className="font-bold text-gray-900">Todavía no tienes ninguna carta</h3>
            <p className="text-gray-500 text-sm mt-1">Las tiendas ya no se reclaman solas: el equipo de BogaHub la asigna a tu correo.</p>
            <p className="text-gray-700 text-sm mt-3 font-semibold">Tu correo: {user.email}</p>
            <p className="text-gray-500 text-sm mt-3">Escríbenos por WhatsApp con ese correo y el nombre de tu negocio. Apenas la asignemos, recarga esta página y ya la ves.</p>
            <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
              {waAsesor && (
                <a
                  href={`https://wa.me/${waAsesor}?text=${encodeURIComponent(`Hola, quiero que me asignen mi tienda en BogaHub. Mi correo es ${user.email}. Mi negocio se llama: `)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-[#25D366] text-white font-bold rounded-md text-sm inline-flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>Escribir por WhatsApp
                </a>
              )}
              <button onClick={() => window.location.reload()} className="px-4 py-2.5 bg-[var(--tienda-color)] text-white font-bold rounded-md text-sm">Ya me la asignaron, recargar</button>
              <button onClick={async () => { await signOut(); router.replace('/login'); }} className="px-4 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-md text-sm">Entrar con otro correo</button>
            </div>
          </div>
        )}

        {activeTab === 'inicio' && inicioStore && (() => {
          // ── Datos del día (hora de Perú). Las canceladas no cuentan como venta. ──
          const hoy = hoyLima();
          const validas = inicioOrders.filter(o => o.status !== 'Cancelado');
          const deHoy = validas.filter(o => fechaLima(o.created_at) === hoy);
          const ventasHoy = deHoy.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
          const deMes = validas.filter(o => fechaLima(o.created_at).slice(0, 7) === hoy.slice(0, 7));
          const ventasMes = deMes.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
          const pendientes = inicioOrders.filter(o => o.status === 'Pendiente');
          // Pedidos por atender en las OTRAS tiendas que administra: el globito del menú cuenta todas, y sin
          // este aviso parecía que esta tienda tenía pedidos cuando en realidad eran de otra.
          const otrasPendientes = (() => {
            const porTienda: Record<string, number> = {};
            orders.forEach(o => {
              if (o.status !== 'Pendiente' || o.store === inicioStore.slug) return;
              if (managedSlugs && !managedSlugs.includes(o.store)) return;
              porTienda[o.store] = (porTienda[o.store] || 0) + 1;
            });
            return Object.entries(porTienda).map(([slug, n]) => ({ nombre: stores[slug]?.name || slug, n }));
          })();
          const misProductos = products.filter(p => p.store === inicioStore.slug);

          // ── "Completa tu tienda": lo que falta para vender bien, con un toque para arreglarlo ──
          const tareas = [
            { ok: !!inicioStore.logoImage, icon: 'add_photo_alternate', titulo: 'Sube tu logo', sub: 'Tus clientes te reconocen al instante', ir: () => openStoreEditor(inicioStore.slug, 'portada') },
            { ok: misProductos.length >= 3, icon: 'inventory_2', titulo: esEmpresa ? 'Carga al menos 3 servicios' : 'Carga al menos 3 productos', sub: `Tienes ${misProductos.length}`, ir: () => { resetForm(); setNewProduct(prev => ({ ...prev, store: inicioStore.slug })); setIsModalOpen(true); } },
            { ok: !!inicioStore.whatsapp, icon: 'chat', titulo: 'Agrega tu WhatsApp de pedidos', sub: 'Sin él, los pedidos no llegan a ti', ir: () => openStoreEditor(inicioStore.slug, 'avisos') },
            { ok: !!inicioStore.horario, icon: 'schedule', titulo: 'Define tu horario', sub: 'Para que sepan cuándo atiendes', ir: () => openStoreEditor(inicioStore.slug, 'horario') },
            { ok: (inicioStore.metodosPago?.length ?? 0) > 0, icon: 'payments', titulo: 'Elige cómo te pagan', sub: 'Efectivo, Yape, tarjeta…', ir: () => openStoreEditor(inicioStore.slug, 'pagos') },
          ];
          const hechas = tareas.filter(t => t.ok).length;
          const faltan = tareas.filter(t => !t.ok);

          const fila = 'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors';
          const icono = 'w-9 h-9 rounded-lg bg-[var(--tienda-color)]/10 text-[var(--tienda-color)] flex items-center justify-center shrink-0';
          const titulo = 'text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-2 px-1';

          return (
          <div className="max-w-md md:max-w-2xl lg:max-w-5xl mx-auto flex flex-col gap-4 pb-24 md:pb-4">
            {/* Tu tienda: logo, selector, enlace y el interruptor "activa" */}
            <div className="rounded-xl p-3.5 text-white shadow-sm flex items-center gap-3" style={{ background: inicioStore.theme?.primary || 'var(--tienda-color)' }}>
              <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 overflow-hidden flex items-center justify-center shrink-0">
                {inicioStore.logoImage
                  ? <img src={inicioStore.logoImage} alt={inicioStore.name} className="w-full h-full object-cover" />
                  : <span className="material-symbols-outlined text-white text-[20px]">storefront</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white/70 text-[11px] font-semibold leading-none">Hola{inicioNombre ? `, ${inicioNombre}` : ''}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <select
                    value={selectedStore === 'all' ? inicioStore.slug : selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="max-w-full bg-transparent text-white font-black text-base leading-tight truncate focus:outline-none cursor-pointer appearance-none"
                  >
                    {Object.values(stores).map(s => (
                      <option key={s.slug} value={s.slug} className="text-gray-900">{s.name}</option>
                    ))}
                  </select>
                  {Object.keys(stores).length > 1 && <span className="material-symbols-outlined text-white/70 text-[18px] shrink-0">unfold_more</span>}
                </div>
                <p className="text-white/70 text-[11px] truncate">{inicioUrl.replace(/^https?:\/\//, '')}</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleStoreActive(inicioStore.slug, !inicioActiva)}
                  disabled={togglingActive}
                  title={inicioActiva ? 'Carta activa — recibe pedidos' : 'Carta inactiva'}
                  className={`relative w-11 h-6 rounded-full transition-colors ${inicioActiva ? 'bg-[#25D366]' : 'bg-white/30'} disabled:opacity-60`}
                  aria-pressed={inicioActiva}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${inicioActiva ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-white/90 text-[10px] font-bold">{inicioActiva ? 'Abierta' : 'Cerrada'}</span>
              </div>
            </div>

            {/* Acceso directo a la tienda: misma pestaña, así en la app instalada se puede volver con "atrás" */}
            <a href={inicioUrl} className="flex items-center justify-center gap-2 bg-white border-2 border-[var(--tienda-color)] text-[var(--tienda-color)] rounded-xl py-3 font-extrabold text-sm shadow-sm hover:bg-[var(--tienda-color)]/5 active:scale-[0.99] transition">
              <span className="material-symbols-outlined text-[20px]">storefront</span>
              Ver mi tienda
            </a>

            {/* Pantalla ancha: dos columnas (lo de hoy a la izquierda; completar y configurar a la derecha).
                En celular y tablet es una sola columna en el mismo orden. */}
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
            <div className="flex flex-col gap-4">
            {/* Hoy: lo que importa de un vistazo */}
            <div>
              <p className={titulo}>Hoy</p>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <p className="text-[11px] font-semibold text-gray-400">Ventas</p>
                  <p className="text-xl font-black text-gray-900 leading-tight mt-1">S/ {ventasHoy.toFixed(2)}</p>
                  <p className="text-[10px] font-semibold text-gray-400 mt-1.5">Mes: S/ {ventasMes.toFixed(2)}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <p className="text-[11px] font-semibold text-gray-400">Pedidos</p>
                  <p className="text-xl font-black text-gray-900 leading-tight mt-1">{deHoy.length}</p>
                  <p className="text-[10px] font-semibold text-gray-400 mt-1.5">Mes: {deMes.length}</p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`rounded-xl p-3 shadow-sm text-left border transition-colors ${pendientes.length > 0 ? 'bg-[var(--tienda-color)] border-[var(--tienda-color)] text-white' : 'bg-white border-gray-100 text-gray-900'}`}
                >
                  <p className={`text-[11px] font-semibold ${pendientes.length > 0 ? 'text-white/80' : 'text-gray-400'}`}>Por atender</p>
                  <p className="text-xl font-black leading-tight mt-1">{pendientes.length}</p>
                </button>
              </div>
            </div>

            {/* Pedidos por atender (los más recientes), o aviso de que está todo al día */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              {pendientes.length === 0 ? (
                <div className="px-4 py-4 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[20px]">task_alt</span></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm">Todo al día</p>
                    <p className="text-[11px] text-gray-500">No tienes pedidos por atender. Cuando llegue uno, aparece aquí.</p>
                    {otrasPendientes.length > 0 && (
                      <p className="text-[11px] font-semibold text-orange-700 mt-1">
                        Pendientes en otras tiendas: {otrasPendientes.map(x => `${x.nombre} (${x.n})`).join(', ')}
                      </p>
                    )}
                  </div>
                  <button onClick={() => { if (otrasPendientes.length > 0) setSelectedStore('all'); setActiveTab('orders'); }} className="text-xs font-bold text-[var(--tienda-color)] shrink-0">Ver pedidos</button>
                </div>
              ) : (
                <>
                  <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                    <p className="font-bold text-gray-900 text-sm">Pedidos por atender</p>
                    <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-[var(--tienda-color)]">Ver todos ({pendientes.length})</button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {pendientes.slice(0, 3).map(o => (
                      <button key={o.id} onClick={() => setActiveTab('orders')} className={fila}>
                        <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[20px]">schedule</span></span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-gray-900 text-sm truncate">{o.customer_name || 'Cliente'}</span>
                          <span className="block text-[11px] text-gray-500">{new Date(o.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })} · {o.customer_address || 'Recojo'}</span>
                        </span>
                        <span className="font-black text-gray-900 text-sm shrink-0">S/ {(Number(o.total_amount) || 0).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Acciones rápidas: lo que más se hace, a un toque */}
            <div>
              <p className={titulo}>Acciones rápidas</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: 'add_circle', t: esEmpresa ? 'Agregar servicio' : 'Agregar producto', s: esEmpresa ? 'Súbelo con su foto y descripción' : 'Súbelo con su foto y precio', on: () => { resetForm(); setNewProduct(prev => ({ ...prev, store: inicioStore.slug })); setIsModalOpen(true); } },
                  ...(posOn ? [{ icon: 'point_of_sale', t: 'Nueva venta', s: 'Caja rápida en el local', on: () => setActiveTab('pos') }] : []),
                  { icon: 'share', t: 'Compartir mi tienda', s: 'Envía tu enlace por WhatsApp', on: compartirCarta },
                  { icon: 'qr_code_2', t: 'Código QR', s: 'Para tus mesas o tu puerta', on: () => { setSelectedStore(inicioStore.slug); setIsQRModalOpen(true); } },
                  ...(inicioDb?.push_activo ? [{ icon: 'notifications', t: 'Notificaciones', s: 'Avisa a tus clientes de una oferta', on: () => { window.location.href = '/admin/notificaciones'; } }] : []),
                ].map(a => (
                  <button key={a.t} onClick={a.on} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-left hover:shadow-md hover:border-gray-200 transition-all flex flex-col gap-2 active:scale-[0.98]">
                    <span className={icono}><span className="material-symbols-outlined text-[20px]">{a.icon}</span></span>
                    <span className="font-bold text-gray-900 text-sm leading-tight">{a.t}</span>
                    <span className="text-[11px] text-gray-500 leading-snug">{a.s}</span>
                  </button>
                ))}
              </div>
            </div>

            </div>
            <div className="flex flex-col gap-4">
            {/* Completa tu tienda: solo mientras falte algo */}
            {faltan.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900 text-sm">Completa tu tienda</p>
                    <span className="text-xs font-bold text-gray-500">{hechas} de {tareas.length}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--tienda-color)] transition-all" style={{ width: `${(hechas / tareas.length) * 100}%` }} />
                  </div>
                </div>
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {faltan.map(tarea => (
                    <button key={tarea.titulo} onClick={tarea.ir} className={fila}>
                      <span className={icono}><span className="material-symbols-outlined text-[20px]">{tarea.icon}</span></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-gray-900 text-sm leading-tight">{tarea.titulo}</span>
                        <span className="block text-[11px] text-gray-500 leading-snug">{tarea.sub}</span>
                      </span>
                      <span className="material-symbols-outlined text-gray-300 text-[20px] shrink-0">chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Configuración y herramientas: lista compacta (lo de gestión ya está en el menú, no se repite) */}
            <div>
              <p className={titulo}>Configura tu tienda</p>
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                {[
                  { icon: 'palette', t: 'Personaliza tu tienda', s: 'Logo, portada, datos, horario y pagos', on: () => openStoreEditor(inicioStore.slug) },
                  { icon: 'category', t: 'Categorías', s: 'Crea y ordena los rubros de tu carta', on: () => setActiveTab('categories') },
                  { icon: 'notifications', t: 'Avisos de pedidos', s: 'WhatsApp y correo donde los recibes', on: () => openStoreEditor(inicioStore.slug, 'avisos') },
                  ...(inicioDb?.push_activo ? [{ icon: 'campaign', t: 'Notificaciones a clientes', s: 'Envía avisos a quienes instalaron tu app', on: () => router.push('/admin/notificaciones') }] : []),
                  { icon: 'picture_as_pdf', t: 'Exportar catálogo en PDF', s: 'Descarga tu carta para compartirla', on: () => { setSelectedStore(inicioStore.slug); setIsPDFModalOpen(true); } },
                  { icon: 'store', t: 'Mis Tiendas', s: 'Todas tus sucursales, una por una', on: () => setActiveTab('stores') },
                ].map(f => (
                  <button key={f.t} onClick={f.on} className={fila}>
                    <span className={icono}><span className="material-symbols-outlined text-[20px]">{f.icon}</span></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-gray-900 text-sm leading-tight">{f.t}</span>
                      <span className="block text-[11px] text-gray-500 leading-snug">{f.s}</span>
                    </span>
                    <span className="material-symbols-outlined text-gray-300 text-[20px] shrink-0">chevron_right</span>
                  </button>
                ))}
                <a href={inicioUrl} target="_blank" rel="noopener noreferrer" className={fila}>
                  <span className={icono}><span className="material-symbols-outlined text-[20px]">open_in_new</span></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-gray-900 text-sm leading-tight">Ver mi tienda</span>
                    <span className="block text-[11px] text-gray-500 leading-snug">Tal como la ven tus clientes</span>
                  </span>
                  <span className="material-symbols-outlined text-gray-300 text-[20px] shrink-0">chevron_right</span>
                </a>
              </div>
            </div>

            {/* Tu plan: nivel, cuánto paga y hasta cuándo (solo si tiene costo o fecha de pago) */}
            <MiPlan slug={focusedStore} modulos={inicioDb?.modulos} subdominioActivo={inicioDb?.subdominio_activo} />
            </div>
            </div>
          </div>
          );
        })()}

        {activeTab === 'products' && (
          <>
            {/* Store Selector Global for Dashboard */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSelectedStore('all')}
                className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  selectedStore === 'all' 
                    ? 'bg-[var(--tienda-color)] text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                Todas las tiendas
              </button>
              {Object.values(stores).map((store) => (
                <button
                  key={store.slug}
                  onClick={() => setSelectedStore(store.slug)}
                  className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 border ${
                    selectedStore === store.slug 
                      ? 'bg-[var(--tienda-color)] text-white border-[var(--tienda-color)] shadow-md' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {store.name}
                </button>
              ))}
            </div>

            {/* Stats Row */}
            {(() => {
              const storeFiltered = selectedStore === 'all' ? visibleProducts : visibleProducts.filter(p => p.store === selectedStore);
              const availableCategories = Array.from(new Set(storeFiltered.map(p => p.category)));
              
              const filteredProducts = storeFiltered.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      (p.subcategory || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = selectedFilterCategory === 'all' || (selectedFilterCategory === '__sin__' ? sinCategoria(p) : p.category === selectedFilterCategory);
                return matchesSearch && matchesCategory;
              });

              return (
                <>
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3 min-w-[150px] flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium text-[11px] mb-0.5">Total Productos</p>
                        <h3 className="text-xl font-extrabold text-gray-900 leading-none">{storeFiltered.length}</h3>
                      </div>
                    </div>
                    {selectedStore === 'all' && (
                      <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3 min-w-[150px] flex-1">
                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">storefront</span>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium text-[11px] mb-0.5">Tiendas Activas</p>
                          <h3 className="text-xl font-extrabold text-gray-900 leading-none">
                            {new Set(visibleProducts.map(p => p.store)).size || 0}
                          </h3>
                        </div>
                      </div>
                    )}
                    {inventarioOn ? (() => {
                      const bajos = storeFiltered.filter(p => tiendaTiene(p.store, 'inventario') && !stockIlimitado(p) && p.stock <= STOCK_BAJO).length;
                      return (
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3 min-w-[150px] flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bajos ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
                            <span className="material-symbols-outlined text-[18px]">warning</span>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium text-[11px] mb-0.5">Poco stock</p>
                            <h3 className="text-xl font-extrabold text-gray-900 leading-none">{bajos}</h3>
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="hidden lg:block flex-1 border-2 border-dashed border-gray-200 rounded-md bg-transparent"></div>
                    )}
                  </div>

                  {/* Products Table */}
                  <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex flex-col gap-4 bg-white">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <h2 className="text-base font-bold text-gray-900">Catálogo Actual {selectedStore !== 'all' ? `- ${stores[selectedStore]?.name}` : ''}</h2>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest leading-none select-none">Acciones</span>
                          <div className="flex flex-row items-center gap-1.5">
                            <button
                              onClick={() => setIsQRModalOpen(true)}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 bg-[var(--tienda-color)] text-white hover:bg-[#8f0f0b] whitespace-nowrap active:scale-95 cursor-pointer shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                              Código QR
                            </button>
                            <button
                              onClick={() => setIsPDFModalOpen(true)}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 bg-white text-[#8c0009] hover:bg-[#8c0009]/5 whitespace-nowrap active:scale-95 cursor-pointer border border-[#8c0009]/25 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                              Exportar PDF
                            </button>
                            {inventarioOn && (
                              <button
                                onClick={() => setIsHistorialOpen(true)}
                                className="px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap active:scale-95 cursor-pointer border border-gray-200 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[14px]">history</span>
                                Historial de stock
                              </button>
                            )}
                            <button
                              onClick={() => setIsLoyverseOpen(true)}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 whitespace-nowrap active:scale-95 cursor-pointer border border-emerald-200 shadow-sm"
                              title="Sincronizar catálogo con Loyverse POS"
                            >
                              <span className="material-symbols-outlined text-[14px] text-emerald-600">sync_alt</span>
                              Loyverse POS
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Search and Filters */}
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="relative w-full md:w-96 shrink-0">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                          <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar nombre o categoría..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                          />
                        </div>
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 md:pb-0" style={{ scrollbarWidth: 'none' }}>
                          <button 
                            onClick={() => setSelectedFilterCategory('all')}
                            className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors uppercase tracking-wider border ${
                              selectedFilterCategory === 'all' 
                                ? 'bg-[var(--tienda-color)] text-white border-transparent' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            Todos
                          </button>
                          {storeFiltered.some(sinCategoria) && (
                            <button
                              onClick={() => setSelectedFilterCategory('__sin__')}
                              className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap uppercase tracking-wider transition-colors border flex items-center gap-1 ${
                                selectedFilterCategory === '__sin__'
                                  ? 'bg-amber-500 text-white border-transparent'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                              Sin categoría ({storeFiltered.filter(sinCategoria).length})
                            </button>
                          )}
                          {availableCategories.map(cat => (
                            <button 
                              key={cat}
                              onClick={() => setSelectedFilterCategory(cat)}
                              className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap uppercase tracking-wider transition-colors border ${
                                selectedFilterCategory === cat 
                                  ? 'bg-[var(--tienda-color)] text-white border-transparent' 
                                  : 'bg-transparent text-gray-600 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-400">esEmpresa ? 'Cargando servicios...' : 'Cargando productos...'</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-gray-400">inventory_2</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{esEmpresa ? 'No hay servicios' : 'No hay productos'}</h3>
                      <p className="text-gray-500 text-sm max-w-sm">{esEmpresa ? 'No se encontraron servicios para esta tienda. Empieza añadiendo el primero.' : 'No se encontraron productos para esta tienda. Empieza añadiendo el primero.'}</p>
                      <button 
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="mt-6 px-4 py-2 bg-[var(--tienda-color)] text-white font-semibold rounded-lg hover:bg-[#8f0f0b] transition-colors"
                      >
                        Añadir Producto
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-[#f8f9fa] text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                              <th className="p-3 font-bold w-1/3">{esEmpresa ? 'Servicio' : 'Producto'}</th>
                              {selectedStore === 'all' && <th className="p-3 font-bold">Tienda</th>}
                              <th className="p-3 font-bold">Categoría</th>
                              {inventarioOn && <th className="p-3 font-bold">Stock</th>}
                              <th className="p-3 font-bold">Estado</th>
                              <th className="p-3 font-bold">Precio</th>
                              <th className="p-3 font-bold text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProducts.map((p) => (
                              <tr key={p.id} className={`group border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${p.status === 'Agotado' ? 'opacity-70' : ''}`}>
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                      {p.image ? (
                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <span className="material-symbols-outlined text-gray-400">image</span>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                                        {p.name}
                                        {p.es_combo && (
                                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase">
                                            🔥 Combo
                                          </span>
                                        )}
                                      </p>
                                      {p.subcategory && (
                                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100 mt-1 inline-block">
                                          {p.subcategory}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {selectedStore === 'all' && (
                                  <td className="p-3">
                                    <span className="text-sm font-medium text-gray-600">{stores[p.store]?.name || p.store}</span>
                                  </td>
                                )}
                                <td className="p-3">
                                  {sinCategoria(p) ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Este producto no tiene una categoría válida: a tus clientes solo les sale en Todos">
                                      <span className="material-symbols-outlined text-[13px]">warning</span>
                                      Sin categoría
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                      {p.category}
                                    </span>
                                  )}
                                </td>
                                {inventarioOn && <td className="p-3">{celdaStock(p)}</td>}
                                <td className="p-3">
                                  <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                      <input type="checkbox" className="sr-only" checked={p.status === 'Activo'} onChange={() => toggleStatus(p.id, p.status)} />
                                      <div className={`block w-10 h-6 rounded-full transition-colors ${p.status === 'Activo' ? 'bg-[#25D366]' : 'bg-red-500'}`}></div>
                                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${p.status === 'Activo' ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className={`ml-2 text-xs font-bold ${p.status === 'Activo' ? 'text-green-700' : 'text-red-600'}`}>{p.status === 'Activo' ? 'ACTIVO' : 'AGOTADO'}</span>
                                  </label>
                                </td>
                                <td className="p-3 font-bold text-gray-900">
                                  {precioOfertaVigente(p) !== null ? (
                                    <>
                                      S/ {precioOfertaVigente(p)!.toFixed(2)}
                                      <span className="block text-[11px] font-medium text-gray-400 line-through">S/ {Number(p.price).toFixed(2)}</span>
                                    </>
                                  ) : (
                                    <>S/ {Number(p.price).toFixed(2)}</>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => handleEdit(p)}
                                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Editar"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDuplicate(p)}
                                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Duplicar (mismo producto en otro color o sabor)"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(p.id, p.name)}
                                      disabled={isDeleting === p.id}
                                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#8c0009] hover:bg-[#8c0009]/8 rounded-lg transition-colors"
                                      title="Eliminar"
                                    >
                                      <span className={`material-symbols-outlined text-[18px] ${isDeleting === p.id ? 'animate-spin' : ''}`}>
                                        {isDeleting === p.id ? 'refresh' : 'delete'}
                                      </span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards View */}
                      <div className="md:hidden flex flex-col p-4 gap-3">
                        {filteredProducts.map((p) => (
                          <div key={p.id} className={`bg-white border border-gray-100 rounded-md p-3 flex gap-4 shadow-sm relative ${p.status === 'Agotado' ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                            {/* Image */}
                            <div className="w-20 h-20 rounded-md bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-gray-400">image</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Details */}
                            <div className="flex flex-col flex-1 min-w-0 py-0.5">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-2">
                                  {p.es_combo && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide uppercase mr-1 inline-block align-middle">
                                      🔥 Combo
                                    </span>
                                  )}
                                  {p.name}
                                </h3>
                                <span className="font-bold text-primary text-[13px] whitespace-nowrap">
                                  {precioOfertaVigente(p) !== null ? (
                                    <>S/ {precioOfertaVigente(p)!.toFixed(2)} <span className="text-[10px] font-medium text-gray-400 line-through">S/ {Number(p.price).toFixed(2)}</span></>
                                  ) : (
                                    <>S/ {Number(p.price).toFixed(2)}</>
                                  )}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                {sinCategoria(p) ? (
                                  <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 uppercase font-bold tracking-wider flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">warning</span>
                                    Sin categoría
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider truncate">
                                    {p.category} {p.subcategory ? `• ${p.subcategory}` : ''}
                                  </span>
                                )}
                                {tiendaTiene(p.store, 'inventario') && (
                                  <>
                                    <span className="text-[10px] text-gray-300">•</span>
                                    {celdaStock(p)}
                                  </>
                                )}
                              </div>
                              
                              <div className="flex justify-between items-center mt-auto">
                                <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={p.status === 'Activo'} onChange={() => toggleStatus(p.id, p.status)} />
                                    <div className={`block w-8 h-5 rounded-full transition-colors ${p.status === 'Activo' ? 'bg-[#25D366]' : 'bg-red-500'}`}></div>
                                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${p.status === 'Activo' ? 'translate-x-3' : ''}`}></div>
                                  </div>
                                  <span className={`ml-1.5 text-[9px] font-extrabold ${p.status === 'Activo' ? 'text-green-700' : 'text-red-600'}`}>
                                    {p.status === 'Activo' ? 'ACTIVO' : 'AGOTADO'}
                                  </span>
                                </label>
                                
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                  </button>
                                  <button onClick={() => handleDuplicate(p)} title="Duplicar" className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                  </button>
                                  <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-gray-400 hover:text-[#8c0009] rounded-lg hover:bg-[#8c0009]/8 transition-colors">
                                    <span className={`material-symbols-outlined text-[16px] ${isDeleting === p.id ? 'animate-spin' : ''}`}>
                                      {isDeleting === p.id ? 'refresh' : 'delete'}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          );
        })()}
          </>
        )}

        {activeTab === 'categories' && (() => {
          const tienda = stores[focusedStore];
          if (!tienda) return <p className="text-sm text-gray-400">No hay una tienda seleccionada.</p>;
          const conteos: Record<string, number> = {};
          products.filter((p) => p.store === tienda.slug).forEach((p) => { conteos[p.category] = (conteos[p.category] || 0) + 1; });
          return (
            <CategoriasTab
              key={tienda.slug}
              nombreTienda={tienda.name}
              categorias={tienda.categories}
              conteos={conteos}
              onGuardar={async (lista) => {
                const { error } = await supabase.from('stores').update({ categories: lista }).eq('slug', tienda.slug);
                if (error) { alert('No se pudo guardar: ' + error.message); return false; }
                setDbStores((prev) => prev.map((x: any) => x.slug === tienda.slug ? { ...x, categories: lista } : x));
                return true;
              }}
              onRenombrarProductos={async (viejo, nuevo) => {
                const { error } = await supabase.from('products').update({ category: nuevo }).eq('store', tienda.slug).eq('category', viejo);
                if (error) { alert('La categoría cambió, pero no se pudieron mover los productos: ' + error.message); return false; }
                setProducts((prev) => prev.map((p) => p.store === tienda.slug && p.category === viejo ? { ...p, category: nuevo } : p));
                return true;
              }}
            />
          );
        })()}

        {activeTab === 'orders' && (
          <PedidosTab
            pedidos={visibleOrders as Pedido[]}
            nombreTienda={(slug) => stores[slug]?.name || slug}
            mostrarTienda={selectedStore === 'all' && Object.keys(stores).length > 1}
            cambiarEstado={cambiarEstadoPedido}
            eliminar={eliminarPedido}
            puedeEliminar={esSuperadmin}
            ocupado={pedidoOcupado}
          />
        )}

        {activeTab === 'stores' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">Mis Tiendas</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Personaliza el perfil y apariencia de cada sucursal.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.values(stores).filter(store => dbStores.find((s: any) => s.slug === store.slug)).map((store) => {
                const dbStore = dbStores.find((s: any) => s.slug === store.slug);
                const displayName = dbStore?.name || store.name;
                const displayTagline = dbStore?.tagline || store.tagline;
                const heroImg = dbStore?.hero_image || store.heroImage;
                const productCount = products.filter(p => p.store === store.slug).length;
                return (
                  <div key={store.slug} className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                    {/* Hero */}
                    <div className="h-36 relative overflow-hidden bg-gray-100">
                      {heroImg && <img src={heroImg} alt={displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold text-white bg-green-500/90 backdrop-blur-sm px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-extrabold text-base leading-tight drop-shadow">{displayName}</h3>
                        <p className="text-white/75 text-[11px] font-medium mt-0.5">{displayTagline}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                          {store.marketplaceCategory}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400">
                          {productCount} producto{productCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <a 
                          href={urlDeTienda(store.slug)}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver tienda"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                        <button
                          onClick={() => {
                            setSelectedStore(store.slug);
                            setIsQRModalOpen(true);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="Código QR"
                        >
                          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                        </button>
                        <button
                          onClick={() => exportStoreMenuPDF(store.slug)}
                          disabled={isExporting}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#8c0009] hover:bg-[#8c0009]/8 rounded-lg transition-colors disabled:opacity-50"
                          title="Exportar PDF"
                        >
                          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        </button>
                        <button
                          onClick={() => openStoreEditor(store.slug)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar tienda"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info banner */}
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--tienda-color)]/10 text-[var(--tienda-color)] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Personaliza cada tienda</h4>
                <p className="text-sm text-gray-500 mt-1">Haz clic en <strong>Editar</strong> para cambiar el nombre, slogan, foto de portada y logo de cada tienda. Los cambios se guardan en la nube y se reflejan en el marketplace automáticamente.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="flex flex-col gap-6">
            {/* El titulo de la seccion ya lo pone el header de la pagina */}

            {(() => {
              // Ventas registradas en la caja (POS), en hora de Perú. Las canceladas no cuentan.
              const validas = visibleOrders.filter(o => o.status !== 'Cancelado');
              const hoy = hoyLima();
              const mes = hoy.slice(0, 7);
              const total = (lista: any[]) => lista.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
              const deHoy = validas.filter(o => fechaLima(o.created_at) === hoy);
              const delMes = validas.filter(o => fechaLima(o.created_at).slice(0, 7) === mes);

              // Más vendidos del mes, por unidades.
              const porProducto = new Map<string, { name: string; unidades: number; monto: number }>();
              delMes.forEach(o => {
                const items = Array.isArray(o.items) ? o.items : typeof o.items === 'string' ? (() => { try { return JSON.parse(o.items); } catch { return []; } })() : [];
                items.forEach((it: any) => {
                  const clave = String(it.id ?? it.name);
                  const previo = porProducto.get(clave) ?? { name: it.name, unidades: 0, monto: 0 };
                  previo.unidades += Number(it.quantity) || 0;
                  previo.monto += (Number(it.price) || 0) * (Number(it.quantity) || 0);
                  porProducto.set(clave, previo);
                });
              });
              const masVendidos = Array.from(porProducto.values()).sort((a, b) => b.unidades - a.unidades).slice(0, 5);

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">payments</span>
                      </div>
                      <p className="text-sm font-bold text-gray-500">Ventas de Hoy</p>
                      <h3 className="text-3xl font-black text-gray-900 mt-1">S/ {total(deHoy).toFixed(2)}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">shopping_bag</span>
                      </div>
                      <p className="text-sm font-bold text-gray-500">Ventas Registradas Hoy</p>
                      <h3 className="text-3xl font-black text-gray-900 mt-1">{deHoy.length}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined">calendar_month</span>
                      </div>
                      <p className="text-sm font-bold text-gray-500">Ventas del Mes</p>
                      <h3 className="text-3xl font-black text-gray-900 mt-1">S/ {total(delMes).toFixed(2)}</h3>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm mt-4">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <h3 className="font-bold text-gray-900">Productos Más Vendidos del Mes</h3>
                    </div>
                    {masVendidos.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-gray-500">Todavía no hay ventas este mes. Cuando cobres en la caja, aquí verás qué se vende más.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {masVendidos.map((m, idx) => (
                          <li key={m.name + idx} className="flex items-center gap-3 px-4 py-3">
                            <span className="w-6 h-6 rounded-full bg-[var(--tienda-color)]/10 text-[var(--tienda-color)] text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                            <span className="flex-1 min-w-0 truncate text-sm font-bold text-gray-900">{m.name}</span>
                            <span className="text-xs font-semibold text-gray-500">{m.unidades} unid.</span>
                            <span className="text-sm font-extrabold text-gray-900">S/ {m.monto.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Install App Card for Mobile users */}
            <div className="md:hidden bg-[var(--tienda-color)] text-white p-6 rounded-md shadow-md mt-2 flex flex-col items-center text-center">
              <span className="material-symbols-outlined text-4xl mb-2">install_mobile</span>
              <h3 className="font-bold text-lg mb-1">Instalar Boga Dash</h3>
              <p className="text-white/80 text-sm mb-4">Instala la app en tu celular para una experiencia más rápida y nativa.</p>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('bogadash_pwa_stats');
                    window.location.reload();
                  }
                }}
                className="w-full py-3 bg-white text-[var(--tienda-color)] rounded-md font-bold hover:bg-gray-50 transition-colors"
              >
                Instalar Ahora
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pos' && !posDisponible && (
          <div className="p-12 text-center flex flex-col items-center justify-center bg-white border border-gray-100 rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">lock</span>
            <p className="text-gray-700 font-bold text-sm">Esta tienda no tiene la caja (POS) activada.</p>
            <p className="text-gray-500 text-xs mt-1">Elige otra tienda arriba o pídenos activarla.</p>
          </div>
        )}

        {activeTab === 'pos' && posDisponible && (
          <div className="flex flex-col lg:flex-row gap-3 w-full items-stretch lg:items-start bg-[#f8f9fa] p-2 md:p-3 min-h-[calc(100vh-100px)] rounded-lg">
            {/* Catalog Grid (Left Side) — min-w-0 para que ceda espacio al carrito
                en vez de empujarlo fuera de la pantalla */}
            <div className="flex-1 min-w-0 w-full flex flex-col gap-3 pb-60 lg:pb-0">
              {/* Row 1: Unified Search Bar & Categories */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full gap-2 bg-white p-1 md:p-1.5 rounded-md border border-[#e1e3e4]/40 shadow-sm shrink-0">
                <div className="relative w-full sm:w-56 shrink-0 group">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
                  <input 
                    type="text" 
                    value={posProductSearch}
                    onChange={(e) => setPosProductSearch(e.target.value)}
                    placeholder="Buscar productos..." 
                    className="w-full h-8 pl-8 pr-2.5 bg-gray-50 border border-[#e1e3e4]/40 rounded-lg focus:ring-1 focus:ring-[var(--tienda-color)] focus:border-[var(--tienda-color)] focus:outline-none transition-all text-xs font-medium text-[#191c1d]"
                  />
                </div>
                <div className="flex-1 flex gap-1 overflow-x-auto hide-scrollbar py-0.5" style={{ scrollbarWidth: 'none' }}>
                  <button 
                    onClick={() => setPosProductCategory('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                      posProductCategory === 'all' 
                        ? 'bg-[var(--tienda-color)] text-white border-transparent shadow-sm' 
                        : 'bg-transparent text-gray-600 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    Todos
                  </button>
                  {Array.from(new Set(visibleProducts.filter(p => p.store === focusedStore).map(p => p.category))).map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setPosProductCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                        posProductCategory === cat 
                          ? 'bg-[var(--tienda-color)] text-white border-transparent shadow-sm' 
                          : 'bg-transparent text-gray-600 border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {(() => {
                const posFilteredStoreProducts = visibleProducts.filter(p => p.store === focusedStore);
                const posProducts = posFilteredStoreProducts.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(posProductSearch.toLowerCase()) ||
                                        p.category.toLowerCase().includes(posProductSearch.toLowerCase());
                  const matchesCategory = posProductCategory === 'all' || p.category === posProductCategory;
                  return matchesSearch && matchesCategory;
                });

                if (posProducts.length === 0) {
                  return (
                    <div className="p-12 text-center flex flex-col items-center justify-center bg-white border border-[#e1e3e4]/40 rounded-lg shadow-sm">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">shopping_basket</span>
                      <p className="text-gray-500 font-bold text-sm">No se encontraron productos.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2">
                    {posProducts.map(p => {
                      const cartItem = posCart.find(item => item.product.id === p.id);
                      const quantity = cartItem?.quantity || 0;
                      const conInventario = tiendaTiene(p.store, 'inventario');
                      const limitado = conInventario && !stockIlimitado(p);
                      const agotado = p.status === 'Agotado' || (limitado && p.stock <= 0);
                      const enMaximo = limitado && quantity >= p.stock;
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => { if (!agotado) addToCart(p); }}
                          className={`product-card text-left flex flex-col bg-white border rounded-md overflow-hidden transition-all group ${
                            agotado ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm active:scale-[0.98] cursor-pointer'
                          } ${
                            quantity > 0 ? 'border-[var(--tienda-color)] ring-1 ring-[var(--tienda-color)]/20' : 'border-[#e1e3e4]/30'
                          }`}
                        >
                          <div className="h-20 w-full bg-[#ffece9] relative overflow-hidden shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <span className="material-symbols-outlined text-xl">image</span>
                              </div>
                            )}
                            {(agotado || quantity > 0 || limitado) && (
                              <div className={`absolute top-1 right-1 px-1 py-0.5 backdrop-blur rounded font-bold text-[7px] ${agotado ? 'bg-[#8c0009] text-white' : 'bg-white/90 text-[var(--tienda-color)]'}`}>
                                {agotado ? 'AGOTADO' : enMaximo ? `${quantity} EN CARRO · MÁX.` : quantity > 0 ? `${quantity} EN CARRO` : `QUEDAN ${p.stock}`}
                              </div>
                            )}
                          </div>
                          <div className="p-1.5 flex-1 flex flex-col justify-between">
                            <h3 className="font-bold text-[11px] text-[#191c1d] truncate leading-tight" title={p.name}>{p.name}</h3>
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-extrabold text-xs text-[var(--tienda-color)]">
                                S/ {(precioOfertaVigente(p) ?? p.price).toFixed(2)}
                                {precioOfertaVigente(p) !== null && <span className="ml-1 text-[9px] font-medium text-gray-400 line-through">S/ {p.price.toFixed(2)}</span>}
                              </p>
                              {quantity > 0 && (
                                <div className="flex items-center gap-0.5 bg-[#ffece9] border border-[#e1e3e4]/20 p-0.5 rounded" onClick={e => e.stopPropagation()}>
                                  <button 
                                    onClick={() => removeFromCart(p.id)}
                                    className="text-gray-500 hover:text-[#8c0009] transition-colors flex items-center justify-center font-bold text-[10px] bg-white rounded shadow-sm cursor-pointer"
                                    style={{ width: '18px', height: '18px' }}
                                  >
                                    -
                                  </button>
                                  <span className="text-[10px] font-black text-[#191c1d] w-3 text-center">{quantity}</span>
                                  <button 
                                    onClick={() => addToCart(p)}
                                    className="text-gray-500 hover:text-[var(--tienda-color)] transition-colors flex items-center justify-center font-bold text-[10px] bg-white rounded shadow-sm cursor-pointer"
                                    style={{ width: '18px', height: '18px' }}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Sidebar (Right Side) - Desktop Only */}
            <aside className="hidden lg:flex w-full lg:w-[320px] lg:h-[calc(100vh-100px)] lg:sticky lg:top-[80px] bg-white border border-[#e1e3e4]/40 rounded-lg flex-col shrink-0 overflow-hidden shadow-sm">
              {/* Receipt Header */}
              <div className="p-2 border-b border-[#e1e3e4]/30 bg-[#f8f9fa]">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-[11px] text-[#191c1d]">Venta Actual</h2>
                  <button 
                    onClick={() => setPosCart([])}
                    className="text-[#8c0009] hover:text-[#6b0007] font-bold text-[9px] hover:underline cursor-pointer"
                  >
                    Limpiar Todo
                  </button>
                </div>
                <button 
                  onClick={() => setIsCustomerDetailsOpen(!isCustomerDetailsOpen)}
                  className="flex items-center gap-1 text-[var(--tienda-color)] font-bold text-[9px] mt-0.5 hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">person_add</span>
                  {posCustomerName ? `${posCustomerName} (${posCustomerPhone || 'Sin Celular'})` : 'Agregar Cliente'}
                </button>
              </div>

              {/* Collapsible Customer Form */}
              {isCustomerDetailsOpen && (
                <div className="p-2 border-b border-[#e1e3e4]/20 bg-white flex flex-col gap-1">
                  <h4 className="text-[7px] font-extrabold text-gray-400 uppercase tracking-widest">Datos del Cliente</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="text" 
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      placeholder="Nombre" 
                      className="w-full px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)] h-7"
                    />
                    <input 
                      type="text" 
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      placeholder="WhatsApp" 
                      className="w-full px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)] h-7"
                    />
                  </div>
                </div>
              )}

              {/* Seller Selection */}
              <div className="p-2 border-b border-[#e1e3e4]/10 bg-white/65 flex items-center justify-between gap-2 shrink-0">
                <span className="text-[8px] font-extrabold text-gray-400 uppercase tracking-widest shrink-0">Vendedor:</span>
                <div className="flex-1 flex gap-1 justify-end">
                  <select 
                    value={posSeller} 
                    onChange={(e) => setPosSeller(e.target.value)}
                    className="px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)] cursor-pointer h-7"
                  >
                    <option value="Administrador">Admin</option>
                    {equipo.map(n => <option key={n} value={n}>{n}</option>)}
                    <option value="Otro">Otro...</option>
                  </select>
                  {posSeller === 'Otro' && (
                    <input 
                      type="text" 
                      value={customSeller}
                      onChange={(e) => setCustomSeller(e.target.value)}
                      placeholder="Nombre" 
                      className="w-24 px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)] h-7"
                    />
                  )}
                  <button type="button" onClick={() => setIsEquipoOpen(v => !v)} title="Mi equipo" className="w-7 h-7 shrink-0 flex items-center justify-center rounded border border-[#e1e3e4]/40 text-gray-500 hover:text-[var(--tienda-color)] cursor-pointer">
                    <span className="material-symbols-outlined text-[15px]">group</span>
                  </button>
                </div>
              </div>
              {panelEquipo}

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[90px] custom-scrollbar bg-white/20">
                {posCart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-4">
                    <span className="material-symbols-outlined text-xl mb-1">shopping_basket</span>
                    <p className="text-[10px] font-semibold">El carrito está vacío</p>
                  </div>
                ) : (
                  posCart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between gap-2 pb-1.5 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-[#191c1d] truncate">{item.product.name}</h4>
                        <p className="text-[10px] text-gray-500">S/ {item.product.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-xs text-[#191c1d]">S/ {(item.product.price * item.quantity).toFixed(2)}</span>
                        <div className="flex items-center gap-0.5 bg-[#ffece9] border border-[#e1e3e4]/20 p-0.5 rounded">
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-gray-500 hover:text-[#8c0009] transition-colors flex items-center justify-center font-bold text-[10px] bg-white rounded shadow-sm cursor-pointer"
                            style={{ width: '18px', height: '18px' }}
                          >
                            -
                          </button>
                          <span className="text-[10px] font-black text-[#191c1d] w-3 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => addToCart(item.product)}
                            className="text-gray-500 hover:text-[var(--tienda-color)] transition-colors flex items-center justify-center font-bold text-[10px] bg-white rounded shadow-sm cursor-pointer"
                            style={{ width: '18px', height: '18px' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Summary Footer */}
              <div className="p-2 bg-[#f8f9fa] border-t border-[#e1e3e4]/30">
                <div className="space-y-0.5 mb-1.5">
                  <div className="flex justify-between text-gray-500 font-semibold text-[9px]">
                    <span>Subtotal</span>
                    <span>S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold text-[9px]">
                    <span>IGV (18% Incluido)</span>
                    <span>S/ {(posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 0.18 / 1.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#191c1d] font-black text-[11px] mt-0.5 pt-0.5 border-t border-[#e1e3e4]/20">
                    <span>Total</span>
                    <span>S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[8px] font-extrabold text-gray-400 uppercase tracking-widest">Método de Pago</h4>
                    <div className="grid grid-cols-3 gap-1">
                      {POS_PAYMENT_METHODS.map(m => {
                        const on = posPaymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPosPaymentMethod(m.id)}
                            className="py-1.5 px-1 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer bg-white"
                            style={on ? { borderColor: m.color, background: `${m.color}0d`, color: m.color } : { borderColor: '#e5e7eb', color: '#6b7280' }}
                          >
                            <span className="material-symbols-outlined text-[15px]">{m.icon}</span>
                            <span className="text-[10px] font-bold">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={handlePosCheckout}
                    disabled={posCart.length === 0 || isPosSaving}
                    className="w-full py-2 bg-[var(--tienda-color)] text-white rounded-lg font-bold text-[13px] shadow-lg shadow-[var(--tienda-color)]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isPosSaving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[15px]">refresh</span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                        Cobrar y Generar Ticket
                      </>
                    )}
                  </button>
                </div>
              </div>
            </aside>

            {/* Mobile Pinned Checkout Bar */}
            <div className="lg:hidden fixed bottom-[76px] md:bottom-0 left-0 right-0 bg-white border-t border-[#e1e3e4]/20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-3 z-40 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total</span>
                <span className="text-base font-black text-[var(--tienda-color)]">S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setIsMobileCheckoutOpen(true)}
                disabled={posCart.length === 0}
                className="bg-[var(--tienda-color)] text-white px-5 py-2.5 rounded-md font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-transform disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                Cobrar ({posCart.reduce((sum, item) => sum + item.quantity, 0)})
              </button>
            </div>

            {/* Mobile Checkout Drawer */}
            {isMobileCheckoutOpen && (
              <div className="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex flex-col justify-end" onClick={() => setIsMobileCheckoutOpen(false)}>
                <div className="bg-white rounded-t-[24px] shadow-2xl flex flex-col max-h-[85vh] w-full" onClick={e => e.stopPropagation()}>
                  {/* Drawer Header */}
                  <div className="p-4 border-b border-[#e1e3e4]/30 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--tienda-color)] text-[20px]">shopping_cart</span>
                      <h3 className="font-extrabold text-base text-[#191c1d]">Confirmar Venta</h3>
                    </div>
                    <button onClick={() => setIsMobileCheckoutOpen(false)} className="text-gray-400 hover:text-black">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {/* Drawer Scrollable Content */}
                  <div className="overflow-y-auto flex-1 bg-[#f8f9fa]">
                    {/* Receipt Header Actions (like Limpiar Todo) */}
                    <div className="p-3 border-b border-[#e1e3e4]/30 bg-white flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">Detalles de Venta</span>
                      <button 
                        onClick={() => {
                          setPosCart([]);
                          setIsMobileCheckoutOpen(false);
                        }}
                        className="text-[#8c0009] hover:text-[#6b0007] font-bold text-xs hover:underline cursor-pointer"
                      >
                        Limpiar Todo
                      </button>
                    </div>

                    {/* Client Add button & form */}
                    <div className="p-3 border-b border-[#e1e3e4]/30 bg-white">
                      <button 
                        onClick={() => setIsCustomerDetailsOpen(!isCustomerDetailsOpen)}
                        className="flex items-center gap-1 text-[var(--tienda-color)] font-bold text-xs hover:underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        {posCustomerName ? `${posCustomerName} (${posCustomerPhone || 'Sin Celular'})` : 'Agregar Cliente'}
                      </button>
                      {isCustomerDetailsOpen && (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              value={posCustomerName}
                              onChange={(e) => setPosCustomerName(e.target.value)}
                              placeholder="Nombre" 
                              className="w-full px-2.5 py-1.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)]"
                            />
                            <input 
                              type="text" 
                              value={posCustomerPhone}
                              onChange={(e) => setPosCustomerPhone(e.target.value)}
                              placeholder="WhatsApp" 
                              className="w-full px-2.5 py-1.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Seller Selector */}
                    <div className="p-3 border-b border-[#e1e3e4]/10 bg-white flex flex-col gap-1.5">
                      <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Vendedor</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={posSeller} 
                          onChange={(e) => setPosSeller(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)] cursor-pointer"
                        >
                          <option value="Administrador">Administrador</option>
                          {equipo.map(n => <option key={n} value={n}>{n}</option>)}
                          <option value="Otro">Otro...</option>
                        </select>
                        {posSeller === 'Otro' && (
                          <input 
                            type="text" 
                            value={customSeller}
                            onChange={(e) => setCustomSeller(e.target.value)}
                            placeholder="Nombre" 
                            className="w-full px-2.5 py-1.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--tienda-color)]"
                          />
                        )}
                      </div>
                      <button type="button" onClick={() => setIsEquipoOpen(v => !v)} className="self-start flex items-center gap-1 text-[var(--tienda-color)] font-bold text-[10px] hover:underline cursor-pointer">
                        <span className="material-symbols-outlined text-[14px]">group</span>
                        {isEquipoOpen ? 'Cerrar mi equipo' : 'Mi equipo'}
                      </button>
                    </div>
                    {panelEquipo}

                    {/* Cart Items List */}
                    <div className="p-3 bg-white border-b border-[#e1e3e4]/10 space-y-3">
                      <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Productos</h4>
                      {posCart.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between gap-3 group">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-xs text-[#191c1d] truncate">{item.product.name}</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">S/ {item.product.price.toFixed(2)} x {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-xs text-[#191c1d]">S/ {(item.product.price * item.quantity).toFixed(2)}</span>
                            <div className="flex items-center gap-0.5 bg-[#ffece9] border border-[#e1e3e4]/20 p-0.5 rounded-lg">
                              <button 
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-gray-500 hover:text-[#8c0009] transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="text-[11px] font-black text-[#191c1d] w-3 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => addToCart(item.product)}
                                className="text-gray-500 hover:text-[var(--tienda-color)] transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment & Action Footer */}
                  <div className="p-4 bg-white border-t border-[#e1e3e4]/30 shrink-0">
                      <div className="space-y-1 mb-2.5">
                        <div className="flex justify-between text-gray-500 font-semibold text-[11px]">
                          <span>Subtotal</span>
                          <span>S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 font-semibold text-[11px]">
                          <span>IGV (18% Incluido)</span>
                          <span>S/ {(posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 0.18 / 1.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[#191c1d] font-black text-sm mt-1.5 pt-1.5 border-t border-[#e1e3e4]/20">
                          <span>Total</span>
                          <span>S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment Actions */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Método de Pago</h4>
                          <div className="grid grid-cols-3 gap-1.5">
                            {POS_PAYMENT_METHODS.map(m => {
                              const on = posPaymentMethod === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setPosPaymentMethod(m.id)}
                                  className="py-1.5 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer bg-white"
                                  style={on ? { borderColor: m.color, background: `${m.color}0d`, color: m.color } : { borderColor: '#e5e7eb', color: '#6b7280' }}
                                >
                                  <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                                  <span className="text-[9px] font-bold">{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            await handlePosCheckout();
                            setIsMobileCheckoutOpen(false);
                          }}
                          disabled={posCart.length === 0 || isPosSaving}
                          className="w-full py-3 bg-[var(--tienda-color)] text-white rounded-lg font-bold text-sm shadow-lg shadow-[var(--tienda-color)]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isPosSaving ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                              Cobrar y Generar Ticket
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </div>
        )}

      </main>

      {/* Modal for New Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)}></div>
          
          <div className="relative bg-white w-[90vw] md:w-[980px] md:max-w-[95vw] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Mismo formato que el formulario de productos del superadmin: las acciones van ARRIBA y fijas (no hay que bajar
                hasta el final del formulario) y en escritorio la foto queda a la izquierda y los campos a la derecha. */}
            <div className="px-6 py-4 md:px-8 border-b border-gray-100 flex justify-between items-center gap-3 bg-white sticky top-0 z-10">
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight truncate">{editingProductId ? (formEmpresa ? 'Editar Servicio' : 'Editar Producto') : (formEmpresa ? 'Añadir Servicio' : 'Añadir Producto')}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { if (!isSaving) { setIsModalOpen(false); setAvisoCreado(''); resetForm(); } }}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-md font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                {!editingProductId && (
                  <button
                    type="submit"
                    form="form-producto-dueno"
                    disabled={isSaving}
                    onClick={() => { crearOtroRef.current = true; }}
                    title="Guarda este producto y deja el formulario abierto con los mismos datos, para crear otro igual (otro color o sabor)"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-md font-bold text-sm text-[var(--tienda-color)] border border-[var(--tienda-color)]/40 hover:bg-[var(--tienda-color)]/5 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    Crear y hacer otro igual
                  </button>
                )}
                <button
                  type="submit"
                  form="form-producto-dueno"
                  disabled={isSaving}
                  onClick={() => { crearOtroRef.current = false; }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--tienda-color)] text-white rounded-md font-bold text-sm shadow-md shadow-[var(--tienda-color)]/20 hover:bg-[#8f0f0b] transition-colors disabled:opacity-70"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                      Guardando...
                    </>
                  ) : editingProductId ? (
                    'Guardar Cambios'
                  ) : (
                    (formEmpresa ? 'Crear Servicio' : 'Crear Producto')
                  )}
                </button>
              </div>
            </div>

            {avisoCreado && (
              <div className="px-6 md:px-8 py-2.5 bg-green-50 border-b border-green-200 text-sm font-semibold text-green-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                «{avisoCreado}» creado. Escribe el nombre y sube la foto del siguiente.
              </div>
            )}

            <form id="form-producto-dueno" onSubmit={handleSave} className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-8 md:items-start">
              
              {/* Fotos del producto: la primera es la portada. Se pueden elegir/soltar/pegar varias de una sola vez. */}
              <div className="mb-8 md:mb-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="sr-only"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  tabIndex={0}
                  onPaste={(e) => {
                    const archivos = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
                    if (archivos.length) { e.preventDefault(); agregarFotos(archivos); }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    agregarFotos(Array.from(e.dataTransfer.files));
                  }}
                  className="w-full h-48 md:h-auto md:aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors cursor-pointer bg-gray-50/50 overflow-hidden relative group focus:outline-none focus:border-black"
                >
                  {fotos[0] ? (
                    <>
                      <img src={fotos[0].url} alt="Portada" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity text-center px-2">
                        Agregar más fotos
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-4xl mb-2">add_a_photo</span>
                      <span className="font-bold text-sm">Clic para subir foto(s)</span>
                      <span className="text-xs mt-1 opacity-70">Puedes elegir varias a la vez</span>
                    </>
                  )}
                </div>

                {fotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {fotos.map((foto, i) => (
                      <div key={foto.url} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0 group/thumb">
                        <img src={foto.url} alt={i === 0 ? 'Portada' : `Foto ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5">PORTADA</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                          aria-label={`Quitar foto ${i + 1}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-200 hover:border-black hover:text-black flex items-center justify-center text-gray-400 transition-colors shrink-0"
                      aria-label="Agregar más fotos"
                    >
                      <span className="material-symbols-outlined text-xl">add</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{formEmpresa ? 'Nombre del Servicio' : 'Nombre del Producto'}</label>
                  <input 
                    required
                    type="text" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Ej: Sunset Ribeye"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descripción Corta</label>
                  <textarea
                    value={newProduct.desc}
                    onChange={(e) => setNewProduct({...newProduct, desc: e.target.value})}
                    placeholder="Breve descripción de los ingredientes o detalles..."
                    rows={2}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none"
                  />
                </div>

                {/* Servicio: se reserva o se consulta, no se "agrega al carrito" como un producto normal. Decide si la tienda aparece en el toggle "Servicios" de BogaHub. */}
                <label className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProduct.esServicio}
                    onChange={(e) => setNewProduct({ ...newProduct, esServicio: e.target.checked })}
                    className="w-5 h-5 accent-[var(--tienda-color)] shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-gray-500">handyman</span>
                      Es un servicio, no un producto
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">Ej. un corte, una consulta, una reserva. En tu tienda no tendrá carrito: el cliente te consulta por WhatsApp.</span>
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Precio (S/){precioOpcional && <span className="font-medium text-gray-400"> · opcional, no se muestra</span>}</label>
                    <input
                      required={newProduct.presentaciones.length === 0 && !precioOpcional}
                      disabled={newProduct.presentaciones.length > 0}
                      type="number"
                      step="0.10"
                      value={newProduct.presentaciones.length > 0 ? '' : newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder={newProduct.presentaciones.length > 0 ? 'Según presentaciones' : '0.00'}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black transition-all disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asignar a Tienda</label>
                    <select
                      required
                      value={newProduct.store}
                      onChange={(e) => {
                        const newStore = e.target.value;
                        const storeObj = Object.values(stores).find(s => s.slug === newStore);
                        setNewProduct({
                          ...newProduct, 
                          store: newStore,
                          // Seleccionar la primera categoría por defecto si cambia de tienda
                          category: storeObj?.categories[0]?.name || ''
                        });
                      }}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'black\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                    >
                      <option value="" disabled>Selecciona...</option>
                      {Object.values(stores).map(store => (
                        <option key={store.slug} value={store.slug}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Presentaciones: tallas, tamaños de vaso, medidas o peso con su precio */}
                {(() => {
                  const storeObj = Object.values(stores).find(s => s.slug === newProduct.store);
                  const infoPres = textosPresentacion(newProduct.category, storeObj?.template);
                  const tipoPres = tipoPresentacionDe(newProduct.category, storeObj?.template);
                  const usaModo = tipoPres === 'unidades' || tipoPres === 'peso';
                  // Por defecto: bodega -> unidades; plantillas de comida -> tamaño o porción; el resto -> peso. Siempre se puede cambiar.
                  const esDeComida = ['helados', 'menudirecto', 'polleria', 'iniciocatalogo', 'fichadigital', 'fichaplana'].includes(String(storeObj?.template));
                  const modo: ModoMedida = modoPres ?? (tipoPres === 'unidades' ? 'unidades' : esDeComida ? 'tamano' : 'peso');
                  const medidaElegida = UNIDADES_DE_MEDIDA.find((m) => m.id === modo);
                  const sugeridas = usaModo
                    ? (medidaElegida?.sugeridas ?? [])
                    : presentacionesSugeridas(newProduct.category, storeObj?.template);
                  return (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                      <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-gray-600 text-[18px]">{infoPres.icono}</span>
                        {infoPres.titulo}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {infoPres.subtitulo}
                      </p>

                      {newProduct.presentaciones.length > 0 && (
                        <div className="flex flex-col gap-2 mt-3">
                          {newProduct.presentaciones.map((x, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                value={x.label}
                                maxLength={30}
                                onChange={(e) => setNewProduct({...newProduct, presentaciones: newProduct.presentaciones.map((y, j) => j === i ? { ...y, label: e.target.value } : y)})}
                                placeholder={infoPres.ejemploLabel}
                                // Si escribe solo el número, se completa con la unidad elegida: "12" -> "12 unidades".
                                onBlur={(e) => {
                                  const completo = completarMedida(e.target.value, usaModo ? modo : null);
                                  if (completo !== e.target.value) setNewProduct((prev) => ({ ...prev, presentaciones: prev.presentaciones.map((y, j) => j === i ? { ...y, label: completo } : y) }));
                                }}
                                className="flex-1 min-w-0 px-3 py-3 bg-white border border-gray-200 rounded-md font-medium focus:outline-none focus:border-black transition-all"
                              />
                              <div className="relative w-32 shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">S/</span>
                                <input
                                  type="number"
                                  step="0.10"
                                  min="0"
                                  value={x.price}
                                  onChange={(e) => setNewProduct({...newProduct, presentaciones: newProduct.presentaciones.map((y, j) => j === i ? { ...y, price: e.target.value } : y)})}
                                  placeholder="0.00"
                                  className="w-full pl-9 pr-2 py-3 bg-white border border-gray-200 rounded-md font-medium focus:outline-none focus:border-black transition-all"
                                />
                              </div>
                              <button
                                type="button"
                                aria-label={x.promo ? 'Quitar la marca de promo' : 'Marcar como promo'}
                                title={x.promo ? 'Promo: toca para quitar la marca' : 'Marcar esta opción como promo (precio por cantidad)'}
                                aria-pressed={x.promo === true}
                                onClick={() => setNewProduct({...newProduct, presentaciones: newProduct.presentaciones.map((y, j) => j === i ? { ...y, promo: !y.promo } : y)})}
                                className={`h-10 shrink-0 px-2.5 rounded-md border flex items-center justify-center gap-1 text-xs font-bold transition-colors ${x.promo ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-300'}`}
                              >
                                <span className="text-[15px] leading-none" style={{ filter: x.promo ? 'none' : 'grayscale(1)', opacity: x.promo ? 1 : 0.7 }}>🔥</span>
                                <span className="hidden sm:inline">Promo</span>
                              </button>
                              <button
                                type="button"
                                aria-label="Quitar opción"
                                onClick={() => setNewProduct({...newProduct, presentaciones: newProduct.presentaciones.filter((_, j) => j !== i)})}
                                className="w-10 h-10 shrink-0 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {newProduct.presentaciones.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const precioSugerido = newProduct.presentaciones[newProduct.presentaciones.length - 1]?.price || newProduct.price || '';
                            setNewProduct({ ...newProduct, presentaciones: [...newProduct.presentaciones, { label: '', price: precioSugerido }] });
                          }}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-md border-2 border-dashed border-gray-300 text-sm font-bold text-gray-600 hover:border-black hover:text-black hover:bg-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          Agregar otra opción
                        </button>
                      )}

                      {usaModo && (
                        <div className="mt-3">
                          <p className="text-[11px] font-bold text-gray-500 mb-1.5">¿En qué unidad de medida lo vendes?</p>
                          <div className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-0.5">
                            {UNIDADES_DE_MEDIDA.map(({ id, label, icono }) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setModoPres(id)}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${modo === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                              >
                                <span className="material-symbols-outlined text-[16px]">{icono}</span>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {usaModo && medidaElegida && (
                        <p className="text-[11px] text-gray-500 font-medium mt-2">
                          {medidaElegida.id === 'otra'
                            ? <>Escribe tu propia medida con <strong>+ Otra</strong> y ponle su precio.</>
                            : <>{medidaElegida.ayuda}. Toca un atajo, o escribe solo el número en una fila y se completa con la unidad.</>}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {sugeridas.filter((l) => !newProduct.presentaciones.some((x) => x.label.trim().toLowerCase() === l.toLowerCase())).map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => {
                              const precioSugerido = newProduct.price || (newProduct.presentaciones[0]?.price ?? '');
                              setNewProduct({...newProduct, presentaciones: [...newProduct.presentaciones, { label: l, price: precioSugerido }]});
                            }}
                            className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-black"
                          >
                            + {l}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const precioSugerido = newProduct.price || (newProduct.presentaciones[0]?.price ?? '');
                            setNewProduct({...newProduct, presentaciones: [...newProduct.presentaciones, { label: '', price: precioSugerido }]});
                          }}
                          className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-black"
                        >
                          + Otra
                        </button>
                      </div>

                      {newProduct.presentaciones.length > 0 && (
                        <p className="text-xs mt-2 font-medium text-gray-600">
                          Tus clientes verán «Desde S/ {(() => {
                            const precios = newProduct.presentaciones.map((x) => parseFloat(x.price)).filter((n) => n > 0);
                            return precios.length ? Math.min(...precios).toFixed(2) : '0.00';
                          })()}» y elegirán la opción al pedir.
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                    <select
                      required
                      value={newProduct.category}
                      onChange={async (e) => {
                        if (e.target.value !== '__nueva__') { setNewProduct({ ...newProduct, category: e.target.value }); return; }
                        const nombre = window.prompt('Nombre de la nueva categoría (ej: Bebidas)')?.trim();
                        if (!nombre) return;
                        const href = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        const tienda = Object.values(stores).find((s) => s.slug === newProduct.store);
                        if (!tienda) return;
                        // Ya existe con ese mismo nombre (mismo enlace): no se duplica, solo se selecciona.
                        // Se compara por nombre (no por enlace): "Racks" y "Racks para TV" son categorías distintas.
                        const existente = tienda.categories.find((c) => c.name.trim().toLowerCase() === nombre.toLowerCase());
                        if (existente) { setNewProduct({ ...newProduct, category: existente.name }); return; }
                        let hrefUnico = href || 'categoria';
                        for (let n = 2; tienda.categories.some((c) => c.href === hrefUnico); n++) hrefUnico = `${href || 'categoria'}-${n}`;
                        const categoriasNuevas = [...tienda.categories, { name: nombre, icon: iconForCategory(nombre), href: hrefUnico }];
                        const { error } = await supabase.from('stores').update({ categories: categoriasNuevas }).eq('slug', newProduct.store);
                        if (error) { alert('No se pudo crear la categoría: ' + error.message); return; }
                        setDbStores((prev) => prev.map((s: any) => s.slug === newProduct.store ? { ...s, categories: categoriasNuevas } : s));
                        setNewProduct({ ...newProduct, category: nombre });
                      }}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'black\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                    >
                      <option value="" disabled>Selecciona...</option>
                      {Object.values(stores).find(s => s.slug === newProduct.store)?.categories.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                      <option value="__nueva__">+ Nueva categoría...</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => { setIsModalOpen(false); setActiveTab('categories'); }}
                      className="mt-2 text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">category</span>
                      Administrar categorías
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{esTerreno ? 'Área del terreno' : 'Subcategoría (Ej: Entradas)'}</label>
                    <input 
                      type="text" 
                      list="existing-subcategories"
                      value={newProduct.subcategory}
                      onChange={(e) => setNewProduct({...newProduct, subcategory: e.target.value})}
                      placeholder={esTerreno ? 'Ej. 200 m² o 1 hectárea' : 'Título separador...'}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black transition-all"
                    />
                    <datalist id="existing-subcategories">
                      {Array.from(new Set(products.filter(p => p.store === newProduct.store && p.category === newProduct.category && p.subcategory).map(p => p.subcategory))).map(sub => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Oferta: aparece en tu tienda con el precio anterior tachado y en la página Promos de BogaHub */}
                {newProduct.presentaciones.length === 0 && (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">local_offer</span>
                    ¿Está en oferta? <span className="font-medium text-gray-500">(opcional)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Precio en oferta (S/)</label>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={newProduct.precioOferta}
                        onChange={(e) => setNewProduct({...newProduct, precioOferta: e.target.value})}
                        placeholder="Déjalo vacío si no"
                        className="w-full px-3 py-3 bg-white border border-gray-200 rounded-md font-medium focus:outline-none focus:border-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Hasta el día</label>
                      <input
                        type="date"
                        value={newProduct.ofertaHasta}
                        onChange={(e) => setNewProduct({...newProduct, ofertaHasta: e.target.value})}
                        className="w-full px-3 py-3 bg-white border border-gray-200 rounded-md font-medium focus:outline-none focus:border-black transition-all"
                      />
                    </div>
                  </div>
                  {newProduct.precioOferta && parseFloat(newProduct.precioOferta) > 0 && parseFloat(newProduct.price) > 0 && (
                    <p className="text-xs mt-2 font-medium" style={{ color: parseFloat(newProduct.precioOferta) < parseFloat(newProduct.price) ? '#15803d' : '#b91c1c' }}>
                      {parseFloat(newProduct.precioOferta) < parseFloat(newProduct.price)
                        ? `Tus clientes verán S/ ${parseFloat(newProduct.precioOferta).toFixed(2)} y el precio normal tachado (${porcentajeOferta(parseFloat(newProduct.price), parseFloat(newProduct.precioOferta))}). Sin fecha, la oferta dura hasta que la quites.`
                        : 'El precio en oferta tiene que ser menor al precio normal.'}
                    </p>
                  )}
                </div>
                )}

                {/* Combo / Pack: solo si la tienda tiene el módulo 'promociones' activo (o si es superadmin) */}
                {(tiendaTiene(newProduct.store, 'promociones') || esSuperadmin) && (
                  <label className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 cursor-pointer hover:bg-amber-50/90 transition-colors">
                    <input
                      type="checkbox"
                      checked={newProduct.esCombo}
                      onChange={(e) => setNewProduct({ ...newProduct, esCombo: e.target.checked })}
                      className="w-5 h-5 accent-amber-600 shrink-0"
                    />
                    <span>
                      <span className="block text-sm font-bold text-amber-950 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-amber-600">takeout_dining</span>
                        🔥 Es un Combo / Pack
                      </span>
                      <span className="block text-xs text-amber-800/80 mt-0.5">
                        Ideal para paquetes de comida (pollerías, combos familiares) o packs. Se destaca en tu carta con sello especial y aparece en Promociones de BogaHub.
                      </span>
                    </span>
                  </label>
                )}
                {/* Aviso: un producto con precios por cantidad (incluida 1 sola unidad) no es un combo. */}
                {newProduct.esCombo && newProduct.presentaciones.some((x) => /^1\s*(unidad|und|u)?$/i.test(x.label.trim())) && (
                  <div className="-mt-3 rounded-lg border border-amber-300 bg-amber-100/60 px-4 py-3 text-xs font-semibold text-amber-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">info</span>
                    <span>
                      Este producto tiene <strong>1 unidad</strong> entre sus opciones, así que se vende por cantidad: no es un combo. Un combo es un paquete fijo
                      (por ejemplo "Escoba + recogedor"). Si lo dejas marcado, saldrá en Promociones con el precio de 1 unidad. Mejor desmárcalo.
                    </span>
                  </div>
                )}

                {esTerreno && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Ubicación (enlace de Google Maps)</label>
                    <input
                      value={newProduct.ubicacion}
                      onChange={(e) => setNewProduct({ ...newProduct, ubicacion: e.target.value })}
                      placeholder="https://maps.app.goo.gl/…"
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Abre el terreno en Google Maps, toca Compartir y copia el enlace. Aparece como &quot;Ver ubicación&quot; en la tarjeta.
                    </p>
                  </div>
                )}

                {/* Disponibilidad e Inventario (solo con el módulo de inventario) */}
                {tiendaTiene(newProduct.store, 'inventario') && (
                <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-[var(--tienda-color)]">inventory_2</span>
                        Disponibilidad e Inventario
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">Define si el producto tiene stock controlado o siempre está disponible</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewProduct({ ...newProduct, stockType: 'ilimitado' })}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                        newProduct.stockType === 'ilimitado'
                          ? 'border-[var(--tienda-color)] bg-white ring-2 ring-[var(--tienda-color)]/10 shadow-sm'
                          : 'border-gray-200 bg-white/50 hover:bg-white text-gray-600'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${newProduct.stockType === 'ilimitado' ? 'text-[var(--tienda-color)]' : 'text-gray-400'}`}>
                        all_inclusive
                      </span>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Siempre disponible</p>
                        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Ideal para comida, menús o servicios bajo pedido</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewProduct({ ...newProduct, stockType: 'limitado', stockQuantity: newProduct.stockQuantity || '10' })}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                        newProduct.stockType === 'limitado'
                          ? 'border-[var(--tienda-color)] bg-white ring-2 ring-[var(--tienda-color)]/10 shadow-sm'
                          : 'border-gray-200 bg-white/50 hover:bg-white text-gray-600'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${newProduct.stockType === 'limitado' ? 'text-[var(--tienda-color)]' : 'text-gray-400'}`}>
                        inventory
                      </span>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Stock controlado</p>
                        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Para prendas, abarrotes o unidades exactas</p>
                      </div>
                    </button>
                  </div>

                  {newProduct.stockType === 'limitado' && (
                    <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">Cantidad de unidades en stock</label>
                        <p className="text-[11px] text-gray-500">Si llega a 0, se marcará automáticamente como Agotado</p>
                      </div>
                      <div className="w-32 shrink-0">
                        <input
                          type="number"
                          min="0"
                          value={newProduct.stockQuantity}
                          onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-center font-bold text-gray-900 focus:outline-none focus:border-[var(--tienda-color)]"
                          placeholder="Ej: 15"
                        />
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            </form>
            
          </div>
        </div>
      )}

      {/* Store Editor Modal */}
      {isStoreEditorOpen && editingStoreSlug && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isStoreSaving && setIsStoreEditorOpen(false)} />
          <div className="relative bg-white w-[90vw] md:w-[560px] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Editar Tienda</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-medium">{stores[editingStoreSlug]?.name} <span className="text-gray-400">· {editingStoreSlug} · plantilla {stores[editingStoreSlug]?.template}</span></p>
              </div>
              <button
                onClick={() => setIsStoreEditorOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                disabled={isStoreSaving}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              {/* Hero Image Upload */}
              <div id="editor-portada" className="scroll-mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">Foto de Portada</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={storeForm.hide_hero_text} onChange={e => setStoreForm({ ...storeForm, hide_hero_text: e.target.checked })} className="w-4 h-4 rounded text-black focus:ring-black border-gray-300 accent-black" />
                    <span className="text-xs font-semibold text-gray-600">Ocultar texto sobre banner (Modo Flyer)</span>
                  </label>
                </div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Foto de Portada</label>
                <input type="file" ref={storeHeroInputRef} onChange={e => { if (e.target.files?.[0]) { setStoreHeroFile(e.target.files[0]); setStoreHeroPreview(URL.createObjectURL(e.target.files[0])); }}} accept="image/*" className="sr-only" />
                <div
                  onClick={() => storeHeroInputRef.current?.click()}
                  tabIndex={0}
                  onPaste={(e) => {
                    const file = Array.from(e.clipboardData.files)[0]
                      || Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile();
                    if (file) { setStoreHeroFile(file); setStoreHeroPreview(URL.createObjectURL(file)); }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) { setStoreHeroFile(file); setStoreHeroPreview(URL.createObjectURL(file)); }
                  }}
                  className="w-full h-36 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer relative group hover:border-black transition-colors bg-gray-50 focus:outline-none focus:border-black"
                >
                  {storeHeroPreview ? (
                    <>
                      <img src={storeHeroPreview} className="w-full h-full object-cover" alt="Hero preview" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity">
                        Cambiar Portada
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <span className="material-symbols-outlined text-3xl mb-1">landscape</span>
                      <span className="text-sm font-bold">Clic para subir portada</span>
                      <span className="text-xs opacity-70">Imagen panorámica (16:9)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Logo / Miniatura</label>
                <input type="file" ref={storeLogoInputRef} onChange={e => { if (e.target.files?.[0]) { setStoreLogoFile(e.target.files[0]); setStoreLogoPreview(URL.createObjectURL(e.target.files[0])); }}} accept="image/*" className="sr-only" />
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => storeLogoInputRef.current?.click()}
                    tabIndex={0}
                    onPaste={(e) => {
                      const file = Array.from(e.clipboardData.files)[0]
                        || Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))?.getAsFile();
                      if (file) { setStoreLogoFile(file); setStoreLogoPreview(URL.createObjectURL(file)); }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) { setStoreLogoFile(file); setStoreLogoPreview(URL.createObjectURL(file)); }
                    }}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer relative group hover:border-black transition-colors bg-gray-50 shrink-0 focus:outline-none focus:border-black"
                  >
                    {storeLogoPreview ? (
                      <>
                        <img src={storeLogoPreview} className="w-full h-full object-cover" alt="Logo" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity text-xs text-center rounded-lg">
                          Cambiar
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">Logo cuadrado</p>
                    <p className="text-xs text-gray-500 mt-1">Aparece como miniatura en el marketplace. Recomendado: 200×200px, fondo transparente o color sólido.</p>
                  </div>
                </div>
              </div>

              {/* Categorias del menu (chips que filtran el catalogo publico) */}
              <div id="editor-categorias" className="scroll-mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Categorías del Menú</label>
                <p className="text-xs text-gray-500 mb-3">
                  Los rubros de tu carta (ej: Bebidas, Comidas, Postres). Al agregar un producto, eliges a cuál pertenece.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {storeCategories.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Todavía no agregaste ninguna categoría.</span>
                  )}
                  {storeCategories.map((cat, idx) => (
                    <span
                      key={cat.href + idx}
                      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-700"
                    >
                      {cat.name}
                      <button
                        type="button"
                        onClick={() => {
                          const usados = products.filter(p => p.store === editingStoreSlug && p.category === cat.name).length;
                          if (usados > 0) { alert(`"${cat.name}" tiene ${usados} producto${usados !== 1 ? 's' : ''}. Pásalos a otra categoría desde la pestaña Categorías antes de quitarla.`); return; }
                          setStoreCategories(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        aria-label={`Quitar ${cat.name}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const name = newCategoryName.trim();
                      if (!name) return;
                      const href = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                      if (storeCategories.some(c => c.name.trim().toLowerCase() === name.toLowerCase())) { setNewCategoryName(''); return; }
                      let hu = href || 'categoria'; for (let n = 2; storeCategories.some(c => c.href === hu); n++) hu = `${href || 'categoria'}-${n}`;
                      setStoreCategories(prev => [...prev, { name, icon: iconForCategory(name), href: hu }]);
                      setNewCategoryName('');
                    }}
                    placeholder="Ej: Bebidas"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md font-medium text-sm focus:bg-white focus:outline-none focus:border-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const name = newCategoryName.trim();
                      if (!name) return;
                      const href = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                      if (storeCategories.some(c => c.name.trim().toLowerCase() === name.toLowerCase())) { setNewCategoryName(''); return; }
                      let hu = href || 'categoria'; for (let n = 2; storeCategories.some(c => c.href === hu); n++) hu = `${href || 'categoria'}-${n}`;
                      setStoreCategories(prev => [...prev, { name, icon: iconForCategory(name), href: hu }]);
                      setNewCategoryName('');
                    }}
                    className="px-4 py-2.5 bg-black text-white rounded-md font-bold text-sm hover:bg-gray-800 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Paleta de colores */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Color de la Tienda</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setColorPreset(null)}
                    className="flex flex-col items-center gap-1.5"
                    title="Dejar el color actual"
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                        colorPreset === null ? 'ring-2 ring-offset-2 ring-black' : 'border-gray-200 hover:scale-105'
                      }`}
                      style={{ background: stores[editingStoreSlug || '']?.theme?.primary || '#0058be' }}
                    >
                      {colorPreset === null && <span className="material-symbols-outlined text-white text-[16px] drop-shadow">check</span>}
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Actual</span>
                  </button>

                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setColorPreset(p.id)}
                      className="flex flex-col items-center gap-1.5"
                      title={p.name}
                    >
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                          colorPreset === p.id ? 'ring-2 ring-offset-2 ring-black' : 'border-gray-200 hover:scale-105'
                        }`}
                        style={{ background: p.swatch }}
                      >
                        {colorPreset === p.id && <span className="material-symbols-outlined text-white text-[16px] drop-shadow">check</span>}
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{p.name}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handlePickLogoColor}
                    disabled={extractingTheme}
                    className="flex flex-col items-center gap-1.5 disabled:opacity-60"
                    title="Sacar los colores del logo o portada ya cargados"
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all bg-[conic-gradient(from_180deg,#f43f5e,#f59e0b,#22c55e,#3b82f6,#a855f7,#f43f5e)] ${
                        colorPreset === 'logo' ? 'ring-2 ring-offset-2 ring-black' : 'border-gray-200 hover:scale-105'
                      }`}
                    >
                      {extractingTheme ? (
                        <span className="material-symbols-outlined text-white text-[16px] animate-spin drop-shadow">progress_activity</span>
                      ) : colorPreset === 'logo' ? (
                        <span className="material-symbols-outlined text-white text-[16px] drop-shadow">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-white text-[16px] drop-shadow">colorize</span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Del logo</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div id="editor-datos" className="scroll-mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Tienda</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={e => setStoreForm({...storeForm, name: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="Ej: Sunset Lounge"
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Slogan / Descripción Corta</label>
                <input
                  type="text"
                  value={storeForm.tagline}
                  onChange={e => setStoreForm({...storeForm, tagline: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="Ej: Bar & Café"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Categoría en el Marketplace</label>
                <p className="text-xs text-gray-500 mb-2">Decide en qué sección de Explorar aparece tu tienda.</p>
                <select
                  value={storeForm.marketplace_category}
                  onChange={e => setStoreForm({...storeForm, marketplace_category: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'black\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                >
                  <option value="" disabled>Selecciona...</option>
                  <option value="Restaurantes">Restaurantes</option>
                  <option value="Mercado">Mercado</option>
                  <option value="Salud y Bienestar">Salud y Bienestar</option>
                  <option value="Moda y Belleza">Moda y Belleza</option>
                  <option value="Moda">Moda</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Regalos y Detalles">Regalos y Detalles</option>
                </select>
              </div>

              {/* WhatsApp de pedidos */}
              <div id="editor-avisos" className="scroll-mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp de Pedidos</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={storeForm.whatsapp}
                  onChange={e => setStoreForm({ ...storeForm, whatsapp: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="51987654321"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Con código de país y sin espacios ni signos. Es el número al que te llegan los pedidos de tu tienda.
                </p>
                {!storeForm.whatsapp && (
                  <p className="text-xs text-[#8c0009] font-semibold mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Sin este número, el botón de pedir de tu tienda no llega a nadie.
                  </p>
                )}
              </div>

              {/* Metodos de pago: solo informativos, el pago se coordina por WhatsApp */}
              <div id="editor-pagos" className="scroll-mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Métodos de Pago que Aceptas</label>
                <p className="text-xs text-gray-500 mb-3">
                  Se muestran en tu tienda como referencia. El pago se coordina por WhatsApp{dbStores.find((s: any) => s.slug === editingStoreSlug)?.modulos?.pasarela_pago === true ? ', salvo el cobro online de más abajo' : ''}.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PAYMENT_METHODS.map((m) => {
                    const activo = storeForm.metodos_pago.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setStoreForm({
                          ...storeForm,
                          metodos_pago: activo
                            ? storeForm.metodos_pago.filter((x) => x !== m.id)
                            : [...storeForm.metodos_pago, m.id],
                        })}
                        className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all bg-white hover:border-gray-300"
                        style={activo
                          ? { borderColor: m.color, background: `${m.color}0d` }
                          : { borderColor: '#e5e7eb' }}
                      >
                        {activo && (
                          <span className="material-symbols-outlined absolute top-1 right-1 text-[16px]" style={{ color: m.color }}>check_circle</span>
                        )}
                        <span
                          className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{ background: `${m.color}1a`, color: m.color }}
                        >
                          {m.id === 'Visa' ? (
                            <span className="italic font-black text-[11px] tracking-tight" style={{ color: m.color }}>VISA</span>
                          ) : m.id === 'Mastercard' ? (
                            <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
                              <circle cx="8" cy="7" r="7" fill="#eb001b" />
                              <circle cx="14" cy="7" r="7" fill="#f79e1b" fillOpacity="0.85" />
                            </svg>
                          ) : (
                            <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                          )}
                        </span>
                        <span className="text-xs font-bold" style={{ color: activo ? m.color : '#374151' }}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                {storeForm.metodos_pago.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">Si no eliges ninguno, tu tienda muestra solo Efectivo.</p>
                )}

                <label className="block text-sm font-bold text-gray-700 mt-6 mb-1">¿Cómo entregas tus pedidos?</label>
                <p className="text-xs text-gray-500 mb-3">Define qué le ofrece el carrito al cliente al confirmar su pedido.</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {([
                    { id: 'ambos', label: 'Ambos', icon: 'sync_alt' },
                    { id: 'delivery', label: 'Solo delivery', icon: 'moped' },
                    { id: 'recojo', label: 'Solo recojo', icon: 'storefront' },
                  ] as const).map((op) => {
                    const activo = storeForm.entrega === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setStoreForm({ ...storeForm, entrega: op.id })}
                        className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all bg-white hover:border-gray-300"
                        style={activo ? { borderColor: '#111827', background: '#1118270d' } : { borderColor: '#e5e7eb' }}
                      >
                        {activo && <span className="material-symbols-outlined absolute top-1 right-1 text-[16px] text-gray-900">check_circle</span>}
                        <span className="material-symbols-outlined text-[20px] text-gray-700">{op.icon}</span>
                        <span className="text-xs font-bold text-gray-700">{op.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cobro online (Izipay): solo con el módulo «pasarela_pago» prendido por el superadmin */}
              {editingStoreSlug && dbStores.find((s: any) => s.slug === editingStoreSlug)?.modulos?.pasarela_pago === true && (
                <div id="editor-cobro" className="scroll-mt-4">
                  <CobroOnline slug={editingStoreSlug} />
                </div>
              )}

              {/* Ficha del local: todo opcional, para negocios sin sede fisica (puro delivery) */}
              <div id="editor-horario" className="space-y-4 pt-2 border-t border-gray-100 scroll-mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ficha del local (opcional)</label>
                  <p className="text-xs text-gray-500">
                    Si tu negocio no tiene local a la calle o no quieres mostrar estos datos, déjalos vacíos: tu tienda simplemente no los muestra.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Zona / Distrito</label>
                  <input
                    type="text"
                    value={storeForm.zona}
                    onChange={e => setStoreForm({ ...storeForm, zona: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="Ej: Miraflores"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Horario de atención</label>
                  <div className="space-y-3">
                    {horarioBloques.map((bloque, idx) => {
                      // Un día ya usado en otro bloque no se puede volver a marcar aquí (evita dos horarios para el mismo día).
                      const diasUsadosEnOtros = new Set(horarioBloques.flatMap((b, j) => (j === idx ? [] : b.dias)));
                      return (
                        <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1.5">
                              {DIAS_SEMANA.map((dia) => {
                                const activo = bloque.dias.includes(dia);
                                const usadoEnOtro = diasUsadosEnOtros.has(dia);
                                return (
                                  <button
                                    key={dia}
                                    type="button"
                                    disabled={usadoEnOtro}
                                    onClick={() => {
                                      const dias = activo ? bloque.dias.filter((d) => d !== dia) : [...bloque.dias, dia];
                                      actualizarBloques(horarioBloques.map((b, j) => (j === idx ? { ...b, dias } : b)));
                                    }}
                                    className={`w-9 h-8 rounded-lg text-xs font-bold transition-colors ${
                                      usadoEnOtro ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : activo ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                  >
                                    {dia}
                                  </button>
                                );
                              })}
                            </div>
                            {horarioBloques.length > 1 && (
                              <button
                                type="button"
                                onClick={() => actualizarBloques(horarioBloques.filter((_, j) => j !== idx))}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                aria-label="Quitar este horario"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={bloque.desde}
                              onChange={(e) => actualizarBloques(horarioBloques.map((b, j) => (j === idx ? { ...b, desde: e.target.value } : b)))}
                              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md font-medium text-sm focus:outline-none focus:border-black transition-all"
                            />
                            <span className="text-xs font-bold text-gray-400 shrink-0">a</span>
                            <input
                              type="time"
                              value={bloque.hasta}
                              onChange={(e) => actualizarBloques(horarioBloques.map((b, j) => (j === idx ? { ...b, hasta: e.target.value } : b)))}
                              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md font-medium text-sm focus:outline-none focus:border-black transition-all"
                            />
                          </div>
                        </div>
                      );
                    })}
                    {horarioBloques.some((b) => b.dias.length) && horarioBloques.length < 7 && (
                      <button
                        type="button"
                        onClick={() => setHorarioBloques([...horarioBloques, { ...BLOQUE_VACIO }])}
                        className="text-xs font-bold text-gray-600 hover:text-black flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Agregar otro horario (ej. fin de semana distinto)
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={storeForm.horario}
                    onChange={e => setStoreForm({ ...storeForm, horario: e.target.value })}
                    className="w-full px-4 py-3 mt-2 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="Ej: Lun a Dom, 12pm - 11pm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Marca los días y la hora, o escribe el texto tal como quieres que se vea.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Dirección completa</label>
                  <input
                    type="text"
                    value={storeForm.direccion}
                    onChange={e => setStoreForm({ ...storeForm, direccion: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="Ej: Av. Larco 123, Miraflores, Lima"
                  />
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ubicación de tu local (opcional)</label>
                    <p className="text-xs text-gray-500">
                      Estando en tu local, toca el botón y se guarda el punto exacto. Es <b>privada</b>: solo sirve para calcular distancias.
                      Si prendes el interruptor de abajo, tus clientes verán un botón «Cómo llegar».
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) { alert('Este dispositivo no permite ubicarte.'); return; }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => setStoreForm(prev => ({ ...prev, latitud: Number(pos.coords.latitude.toFixed(6)), longitud: Number(pos.coords.longitude.toFixed(6)) })),
                        () => alert('No pudimos ubicarte. Activa el permiso de ubicación del navegador e inténtalo de nuevo.'),
                        { enableHighAccuracy: true, timeout: 15000 },
                      );
                    }}
                    className="px-4 py-2.5 bg-black text-white rounded-md text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]">my_location</span>
                    {storeForm.latitud != null ? 'Actualizar con mi ubicación actual' : 'Ubicar mi tienda'}
                  </button>
                  {storeForm.latitud != null && storeForm.longitud != null ? (
                    <div className="flex flex-wrap items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0">check_circle</span>
                      <span className="text-xs font-bold text-green-800">Ubicación guardada</span>
                      <span className="text-[10px] text-green-700/70 font-mono">{storeForm.latitud}, {storeForm.longitud}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <a
                          href={`https://www.google.com/maps?q=${storeForm.latitud},${storeForm.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-50 transition-colors"
                        >
                          Ver en el mapa
                        </a>
                        <button
                          type="button"
                          onClick={() => setStoreForm(prev => ({ ...prev, latitud: null, longitud: null, mostrar_ubicacion: false }))}
                          className="text-xs font-bold text-red-600 bg-white border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-50 transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400">Todavía no ubicaste tu tienda.</p>
                  )}
                  <label className={`flex items-start gap-2 text-xs ${storeForm.latitud == null ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={storeForm.latitud == null}
                      checked={storeForm.mostrar_ubicacion}
                      onChange={e => setStoreForm(prev => ({ ...prev, mostrar_ubicacion: e.target.checked }))}
                      className="mt-0.5"
                    />
                    <span><b>Mostrar «Cómo llegar»</b> a mis clientes (abre Google Maps con la ruta a tu local). Déjalo apagado si atiendes desde tu casa.</span>
                  </label>
                </div>
              </div>

              {/* Redes sociales: opcional, se muestran como links en la ficha de contacto */}
              {stores[editingStoreSlug ?? '']?.template === 'empresa' && (
                <PerfilEmpresaEditor perfil={storeForm.perfil_empresa} onChange={(perfil_empresa) => setStoreForm(prev => ({ ...prev, perfil_empresa }))} />
              )}

              <div id="editor-redes" className="space-y-4 pt-2 border-t border-gray-100 scroll-mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Redes sociales (opcional)</label>
                  <p className="text-xs text-gray-500">
                    Pega el link completo de tu perfil. Si dejas uno vacío, tu tienda simplemente no lo muestra.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Facebook</label>
                    <input
                      type="url"
                      value={storeForm.facebook}
                      onChange={e => setStoreForm({ ...storeForm, facebook: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      placeholder="https://facebook.com/tu-negocio"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Instagram</label>
                    <input
                      type="url"
                      value={storeForm.instagram}
                      onChange={e => setStoreForm({ ...storeForm, instagram: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      placeholder="https://instagram.com/tu-negocio"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">TikTok</label>
                    <input
                      type="url"
                      value={storeForm.tiktok}
                      onChange={e => setStoreForm({ ...storeForm, tiktok: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      placeholder="https://tiktok.com/@tu-negocio"
                    />
                  </div>
                </div>
              </div>

              {/* Productos de ejemplo */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeForm.show_demo_products}
                    onChange={e => setStoreForm({ ...storeForm, show_demo_products: e.target.checked })}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-black"
                  />
                  <span>
                    <span className="block text-sm font-bold text-gray-700">
                      Mostrar productos de ejemplo mientras mi tienda está vacía
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">
                      Sirve para ver cómo queda el diseño antes de cargar tu catálogo. En cuanto
                      subas tu primer producto propio, los de ejemplo dejan de mostrarse solos.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Footer: en celular "Guardar" va arriba y a todo el ancho; Cancelar y Reiniciar diseño debajo, a mitades */}
            <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/90 backdrop-blur grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 sticky bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleStoreSave}
                disabled={isStoreSaving}
                className="order-1 sm:order-3 col-span-2 flex items-center justify-center gap-2 px-8 py-3.5 bg-[var(--tienda-color)] text-white rounded-xl sm:rounded-md font-bold shadow-lg shadow-[var(--tienda-color)]/20 hover:shadow-[var(--tienda-color)]/30 transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {isStoreSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                    Guardando...
                  </>
                ) : 'Guardar Cambios'}
              </button>
              <button
                onClick={() => setIsStoreEditorOpen(false)}
                disabled={isStoreSaving}
                className="order-2 sm:order-2 sm:ml-auto px-6 py-3 rounded-xl sm:rounded-md font-bold text-gray-600 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleStoreReset}
                disabled={isStoreSaving}
                className="order-3 sm:order-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl sm:rounded-md font-bold text-gray-600 bg-white border border-gray-200 sm:border-transparent sm:bg-transparent hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Reiniciar diseño
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsQRModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col w-[350px]" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center border-b border-gray-100 relative">
              <button onClick={() => setIsQRModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Código QR</h2>
              <p className="text-xs text-gray-500 mt-1">Imprímelo para tus mesas o local</p>
            </div>
            <div className="p-8 flex flex-col items-center gap-6" id="qr-container">
              <div className="p-4 bg-white rounded-md shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="text-lg font-black tracking-tight mb-4">{selectedStore !== 'all' ? stores[selectedStore]?.name : 'Boga Market'}</div>
                <QRCodeSVG
                  value={(() => {
                    if (selectedStore === 'all') return `${siteOrigin}/explore`;
                    return urlDeTienda(selectedStore);
                  })()}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
                <div className="text-[10px] text-gray-400 mt-4 font-bold tracking-widest uppercase">Escanéame para ordenar</div>
              </div>
              <button 
                onClick={() => {
                  const svg = document.querySelector('#qr-container svg');
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const img = new Image();
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx?.drawImage(img, 0, 0);
                      const pngFile = canvas.toDataURL("image/png");
                      const downloadLink = document.createElement("a");
                      downloadLink.download = `QR_${selectedStore === 'all' ? 'boga-market' : selectedStore}.png`;
                      downloadLink.href = `${pngFile}`;
                      downloadLink.click();
                    };
                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-[var(--tienda-color)] text-white px-5 py-3 rounded-md font-bold shadow-lg hover:shadow-[var(--tienda-color)]/30 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Descargar PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      {isPDFModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsPDFModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 relative text-center">
              <button onClick={() => setIsPDFModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Exportar Catálogo PDF</h2>
              <p className="text-xs text-gray-500 mt-1">Selecciona qué tienda deseas descargar en PDF</p>
            </div>
            <div className="p-6 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {Object.values(stores)
                .filter(store => selectedStore === 'all' || store.slug === selectedStore)
                .map(store => (
                  <button
                    key={store.slug}
                    onClick={() => {
                      exportStoreMenuPDF(store.slug);
                      setIsPDFModalOpen(false);
                    }}
                    disabled={isExporting}
                    className="w-full flex items-center justify-between p-4 bg-[#f8f9fa] hover:bg-[var(--tienda-color)]/5 border border-gray-100 hover:border-[var(--tienda-color)]/20 rounded-lg transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-white border border-gray-100 flex items-center justify-center text-red-500 shadow-sm">
                        <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">{store.name}</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">Catálogo listo para descargar</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-[var(--tienda-color)] transition-colors">download</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      {activeTab === 'products' && (
        <div className="md:hidden fixed right-4 bottom-24 z-40">
          <button 
            onClick={() => { setIsModalOpen(true); resetForm(); }}
            className="w-14 h-14 bg-[var(--tienda-color)] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#8f0f0b] transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation — en todas las pantallas, Inicio incluido (antes se ocultaba ahí porque el Inicio era
          un menú de tarjetas; ahora es un panel de trabajo y la barra tiene que estar a mano). */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 flex justify-around items-center z-50 rounded-t-2xl shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {navTabs.filter(t => t.inBottomBar).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex flex-col items-center gap-1 w-16 py-2 rounded-[20px] transition-all ${activeTab === t.id ? 'bg-[var(--tienda-color)] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            {t.id === 'orders' && pedidosPendientes > 0 && (
              <span className="absolute top-0.5 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">{pedidosPendientes}</span>
            )}
            <span className="material-symbols-outlined text-[22px]">{t.icon}</span>
            <span className="text-[10px] font-bold">{t.id === 'pos' ? 'Vender' : t.id === 'products' && esEmpresa ? 'Servicios' : t.label}</span>
          </button>
        ))}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 w-16 py-2 transition-all text-gray-500 hover:bg-gray-50 rounded-[20px]"
        >
          <span className="material-symbols-outlined text-[22px]">apps</span>
          <span className="text-[10px] font-bold">Más</span>
        </button>
      </div>


      {isHistorialOpen && (
        <HistorialStock
          slugs={selectedStore === 'all' ? myStoreSlugs : [selectedStore]}
          nombreTienda={(slug) => stores[slug]?.name || slug}
          onClose={() => setIsHistorialOpen(false)}
        />
      )}

      {isLoyverseOpen && (
        <LoyverseSyncModal
          store={stores[selectedStore !== 'all' ? selectedStore : (focusedStore || myStoreSlugs[0])] || { slug: selectedStore !== 'all' ? selectedStore : (focusedStore || myStoreSlugs[0] || ''), name: 'Mi Tienda' }}
          allStores={myStoreSlugs.map((slug) => ({
            slug,
            name: stores[slug]?.name || slug,
            modulos: stores[slug]?.modulos || {},
          }))}
          onClose={() => setIsLoyverseOpen(false)}
          onSyncComplete={async () => {
            await fetchProducts();
            if (selectedStore !== 'all') {
              refrescarTienda(selectedStore);
            } else {
              myStoreSlugs.forEach((s) => refrescarTienda(s));
            }
          }}
        />
      )}

      {/* Mobile Profile Menu Modal */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative bg-white w-full rounded-t-lg sm:rounded-lg sm:w-[400px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[slideDown_0.3s_ease-out]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Menú</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {/* Tiendas: tarjetas con logo en vez del selector nativo. Con una sola tienda no hace falta elegir. */}
              <div className="mb-6">
                <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">
                  {Object.keys(stores).length > 1 ? 'Tus tiendas' : 'Tu tienda'}
                </p>
                <div className="flex flex-col gap-2">
                  {(Object.keys(stores).length > 1 ? [{ slug: 'all', name: 'Todas mis tiendas', logo: '' }] : [])
                    .concat(Object.values(stores).map(s => ({ slug: s.slug, name: s.name, logo: s.logoImage || '' })))
                    .map(t => {
                      const activa = t.slug === 'all' ? selectedStore === 'all' : (selectedStore === t.slug || (selectedStore === 'all' && Object.keys(stores).length === 1));
                      return (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => { setSelectedStore(t.slug); setIsMobileMenuOpen(false); }}
                          className={`flex items-center gap-3 w-full text-left rounded-2xl border-2 px-3 py-2.5 transition active:scale-[0.99] ${activa ? 'border-[var(--tienda-color)] bg-[var(--tienda-color)]/5' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                        >
                          <span className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                            {t.logo
                              ? <img src={t.logo} alt="" className="w-full h-full object-cover" />
                              : <span className="material-symbols-outlined text-gray-400 text-[20px]">{t.slug === 'all' ? 'apps' : 'storefront'}</span>}
                          </span>
                          <span className="min-w-0 flex-1 font-bold text-sm text-gray-900 truncate">{t.name}</span>
                          {activa && <span className="material-symbols-outlined text-[var(--tienda-color)] text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Cuadros en vez de lista: más fáciles de tocar y se ve todo de un vistazo */}
              {(() => {
                const cuadro = 'aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 p-2 text-center text-[12px] font-bold leading-tight transition active:scale-95';
                const normal = `${cuadro} bg-gray-50 border border-gray-100 text-gray-700 hover:bg-gray-100`;
                const destacado = `${cuadro} bg-[var(--tienda-color)] text-white shadow-md`;
                const suave = `${cuadro} bg-[var(--tienda-color)]/10 text-[var(--tienda-color)]`;
                const ico = (n: string) => <span className="material-symbols-outlined text-[28px]">{n}</span>;
                return (
                  <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-6">
                    {/* Misma pestaña (no _blank): en la app instalada es la forma de regresar a la tienda desde donde se entró */}
                    {inicioStore && (
                      <a href={inicioUrl} className={destacado}>{ico('storefront')}Volver a mi tienda</a>
                    )}
                    {/* Secciones que no entran en la barra inferior, en el mismo orden */}
                    {navTabs.filter(t => !t.inBottomBar).map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setActiveTab(t.id); setIsMobileMenuOpen(false); }}
                        className={activeTab === t.id ? destacado : normal}
                      >
                        {ico(t.icon)}{t.id === 'products' && esEmpresa ? 'Servicios' : t.label}
                      </button>
                    ))}
                    {inicioStore && (
                      <>
                        <a href={inicioUrl} target="_blank" rel="noopener noreferrer" className={normal}>{ico('open_in_new')}Ver enlace de mi carta</a>
                        <button onClick={() => { openStoreEditor(inicioStore.slug, 'datos'); setIsMobileMenuOpen(false); }} className={normal}>
                          {ico('edit')}Editar perfil
                        </button>
                      </>
                    )}
                    <Link href="/" className={normal}>{ico('arrow_back')}Volver a BogaHub</Link>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('bogadash_pwa_stats');
                          window.location.reload();
                        }
                      }}
                      className={suave}
                    >
                      {ico('install_mobile')}Instalar App
                    </button>
                    <button onClick={async () => { await signOut(); router.replace('/login'); }} className={`${normal} text-red-600`}>
                      {ico('logout')}Cerrar sesión
                    </button>
                    <p className="col-span-3 text-center text-[11px] text-gray-400 font-semibold truncate">{user.email}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {isTicketModalOpen && lastCompletedSale && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col w-full max-w-[400px] max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-green-600">check_circle</span>
                Venta Registrada
              </h3>
              <button 
                onClick={() => setIsTicketModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Receipt Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar flex flex-col items-center bg-gray-50/50">
              {/* Receipt Visual Container */}
              <div 
                id="thermal-ticket"
                className="bg-white border border-gray-200 shadow-sm rounded-md p-5 w-full font-mono text-xs text-gray-800 flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Decorative cut details */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-200 via-transparent to-transparent"></div>
                
                {/* Header info */}
                <div className="text-center flex flex-col items-center border-b border-dashed border-gray-200 pb-4">
                  <span className="font-black text-lg text-gray-900 tracking-tight">BOGA MARKET</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">{stores[lastCompletedSale.store]?.name || lastCompletedSale.store}</span>
                  <span className="text-[10px] text-gray-400 mt-2">TICKET DE VENTA LOCAL</span>
                </div>

                {/* Meta details */}
                <div className="flex flex-col gap-1.5 border-b border-dashed border-gray-200 pb-3 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID Venta:</span>
                    <span className="font-bold text-gray-900">#{lastCompletedSale.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha:</span>
                    <span className="font-bold text-gray-900">
                      {new Date(lastCompletedSale.created_at).toLocaleDateString('es-PE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vendedor:</span>
                    <span className="font-bold text-gray-900">{lastCompletedSale.seller_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pago:</span>
                    <span className="font-bold text-gray-900">{lastCompletedSale.payment_method}</span>
                  </div>
                  {lastCompletedSale.customer_name && lastCompletedSale.customer_name !== 'Cliente Local (POS)' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cliente:</span>
                      <span className="font-bold text-gray-900">{lastCompletedSale.customer_name}</span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="flex flex-col gap-2 border-b border-dashed border-gray-200 pb-4">
                  <div className="grid grid-cols-12 font-bold text-[10px] text-gray-400 uppercase">
                    <span className="col-span-2">Cant</span>
                    <span className="col-span-6">Producto</span>
                    <span className="col-span-4 text-right">Subtotal</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(() => {
                      const items = Array.isArray(lastCompletedSale.items) 
                        ? lastCompletedSale.items 
                        : typeof lastCompletedSale.items === 'string' 
                          ? JSON.parse(lastCompletedSale.items) 
                          : [];
                      return items.map((item: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 text-[11px] leading-tight">
                          <span className="col-span-2 font-bold">{item.quantity}x</span>
                          <span className="col-span-6 truncate pr-1">{item.name}</span>
                          <span className="col-span-4 text-right">S/ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-1">
                  <span>TOTAL</span>
                  <span>S/ {lastCompletedSale.total_amount.toFixed(2)}</span>
                </div>

                {/* Footer text */}
                <div className="text-center text-[10px] text-gray-400 border-t border-dashed border-gray-200 pt-3 mt-1 uppercase font-bold tracking-widest">
                  ¡Gracias por su compra!
                </div>
              </div>
            </div>

            {/* Print and Share Actions */}
            <div className="p-6 border-t border-gray-100 flex flex-col gap-3 bg-white sticky bottom-0">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.print();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--tienda-color)] text-white hover:bg-[#8f0f0b] font-bold rounded-md transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Imprimir Ticket (Impresora Térmica)
              </button>

              <button
                onClick={() => descargarBoletaPDF(lastCompletedSale)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white hover:bg-black font-bold rounded-md transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                Descargar boleta (PDF)
              </button>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const items = Array.isArray(lastCompletedSale.items) 
                      ? lastCompletedSale.items 
                      : typeof lastCompletedSale.items === 'string' 
                        ? JSON.parse(lastCompletedSale.items) 
                        : [];
                    
                    const storeName = stores[lastCompletedSale.store]?.name || lastCompletedSale.store.toUpperCase();
                    let ticketText = `*TICKET DE VENTA LOCAL*\n`;
                    ticketText += `*Tienda:* ${storeName}\n`;
                    ticketText += `*Venta ID:* #${lastCompletedSale.id.substring(0, 8)}\n`;
                    ticketText += `*Vendedor:* ${lastCompletedSale.seller_name}\n`;
                    ticketText += `*Método de Pago:* ${lastCompletedSale.payment_method}\n`;
                    ticketText += `---------------------------\n`;
                    items.forEach((item: any) => {
                      ticketText += `• ${item.quantity}x ${item.name} - S/ ${(item.price * item.quantity).toFixed(2)}\n`;
                    });
                    ticketText += `---------------------------\n`;
                    ticketText += `*TOTAL:* S/ ${lastCompletedSale.total_amount.toFixed(2)}\n\n`;
                    ticketText += `¡Gracias por su compra en ${storeName}!`;

                    const phone = lastCompletedSale.customer_phone ? lastCompletedSale.customer_phone.replace(/\D/g, '') : '';
                    const encodedText = encodeURIComponent(ticketText);
                    const whatsappUrl = phone 
                      ? `https://wa.me/${phone.startsWith('51') ? phone : '51' + phone}?text=${encodedText}` 
                      : `https://wa.me/?text=${encodedText}`;
                    
                    window.open(whatsappUrl, '_blank');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white hover:bg-[#20ba59] font-bold rounded-md transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                Compartir por WhatsApp
              </button>
            </div>
          </div>
          {/* Custom Print Style */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #thermal-ticket, #thermal-ticket * {
                visibility: visible !important;
              }
              #thermal-ticket {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 10px !important;
                margin: 0 !important;
                font-size: 11px !important;
              }
            }
          `}} />
        </div>
      )}

      {/* ── Selector de Tiendas Administradas ── */}
      {isStorePickerOpen && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-[420px] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-extrabold text-lg text-gray-900">¿Cuál es tu tienda?</h3>
              <p className="text-gray-500 text-xs font-medium mt-1">
                Reclama la tienda que te creó el equipo de BogaHub: queda asociada a tu cuenta ({user.email}) y nadie más va a poder editarla.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {unclaimedStores.map((s: any) => {
                const checked = pickerDraft.includes(s.slug);
                return (
                  <label
                    key={s.slug}
                    className={`flex items-center gap-3 p-3 rounded-md border-2 cursor-pointer transition-all ${
                      checked ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setPickerDraft(prev =>
                        checked ? prev.filter(x => x !== s.slug) : [...prev, s.slug]
                      )}
                      className="w-4 h-4 accent-black cursor-pointer shrink-0"
                    />
                    {(s.logo_image || s.hero_image) ? (
                      <img src={s.logo_image || s.hero_image} alt={s.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">🏪</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-gray-900 truncate">{s.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium truncate">/{s.slug} · {s.marketplace_category || 'General'}</p>
                    </div>
                    {checked && <span className="material-symbols-outlined text-[18px] text-black shrink-0">check_circle</span>}
                  </label>
                );
              })}
              {dbStores.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-6 font-medium">Cargando tiendas...</p>
              )}
              {dbStores.length > 0 && unclaimedStores.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-6 font-medium">
                  No hay tiendas sin reclamar. Si el equipo de BogaHub ya te creó la tuya y no aparece acá, escribile para que la verifique.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-gray-400">
                {pickerDraft.length} {pickerDraft.length === 1 ? 'tienda seleccionada' : 'tiendas seleccionadas'}
              </span>
              <div className="flex items-center gap-2">
                {managedSlugs !== null && (
                  <button
                    onClick={() => setIsStorePickerOpen(false)}
                    className="px-4 py-2.5 rounded-md font-bold text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => claimStores(pickerDraft)}
                  disabled={pickerDraft.length === 0 || claiming}
                  className={`px-5 py-2.5 rounded-md font-bold text-xs transition-all ${
                    pickerDraft.length === 0 || claiming
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[var(--tienda-color)] text-white shadow-lg shadow-[var(--tienda-color)]/20 hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {claiming ? 'Reclamando...' : 'Reclamar tienda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
