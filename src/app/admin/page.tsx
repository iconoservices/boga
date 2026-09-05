"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type StoreConfig } from '@/lib/stores.config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@supabase/supabase-js';
import { COLOR_PRESETS, getColorPreset } from '@/lib/colorPresets';
import { extractThemeFromImageClient } from '@/lib/extractThemeClient';
import { uploadFile } from '@/lib/uploadClient';
import type { StoreTheme } from '@/lib/templates.config';

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
  description?: string;
  created_at: string;
}

type TabId = 'inicio' | 'products' | 'orders' | 'pos' | 'metrics' | 'stores';

// Orden canónico de la navegación. La sidebar de escritorio, la barra inferior
// móvil, el menú Perfil y las tarjetas de "Gestión" del Inicio se arman TODAS
// desde acá: así no se desincronizan ni quedan en distinto orden.
const NAV_TABS: { id: TabId; label: string; icon: string; sub: string; inBottomBar: boolean }[] = [
  { id: 'inicio',   label: 'Inicio',       icon: 'home',          sub: 'Resumen de tu carta',        inBottomBar: true },
  { id: 'products', label: 'Productos',    icon: 'inventory_2',   sub: 'Añade o modifica ítems',     inBottomBar: true },
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

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-2 border-[#c2c6d6] border-t-[#b8130e] rounded-full animate-spin" />
      </div>
    );
  }

  return <AdminDashboard user={user} />;
}

function AdminDashboard({ user }: { user: User }) {
  const { signOut } = useAuth();
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
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'Pendiente' | 'Enviado' | 'Entregado'>('all');
  const [orderSearch, setOrderSearch] = useState('');
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

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const myStoreSlugs = React.useMemo(
    () => dbStores.filter((s: any) => s.user_id === user.id).map((s: any) => s.slug),
    [dbStores, user.id]
  );
  const unclaimedStores = React.useMemo(
    () => dbStores.filter((s: any) => !s.user_id),
    [dbStores]
  );
  const managedSlugs = myStoreSlugs.length > 0 ? myStoreSlugs : null;

  // Si todavia no tiene ninguna tienda propia, ofrecer reclamar una sin dueño.
  useEffect(() => {
    if (myStoreSlugs.length === 0 && dbStores.length > 0 && !isStorePickerOpen) {
      setPickerDraft([]);
      setIsStorePickerOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStoreSlugs.length, dbStores.length]);

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
          categories: s.categories || [],
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
          }
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
  const focusedStore = selectedStore === 'all' ? (Object.keys(stores)[0] ?? '') : selectedStore;

  // Datos derivados para la pestaña Inicio (una sola carta).
  const inicioStore = stores[focusedStore];
  const inicioDb = dbStores.find((s: any) => s.slug === focusedStore);
  const inicioActiva = (inicioDb?.status ?? 'active') === 'active';
  const inicioNombre = (user.user_metadata?.name as string | undefined)?.split(' ')[0];
  const inicioUrl = inicioStore ? `${siteOrigin}/${inicioStore.slug}` : '';
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

  const filteredOrders = React.useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return visibleOrders.filter(o => {
      const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      const matchesSearch = !q || o.id.toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [visibleOrders, orderStatusFilter, orderSearch]);

  // KPIs de la pestaña Pedidos: se calculan de todos los pedidos visibles
  // (sin el filtro de estado/busqueda de la tabla), como en cualquier dashboard.
  const ordersRevenue = React.useMemo(() => visibleOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0), [visibleOrders]);
  const ordersActiveCount = React.useMemo(() => visibleOrders.filter(o => o.status !== 'Entregado' && o.status !== 'Cancelado').length, [visibleOrders]);
  const ordersPendingCount = React.useMemo(() => visibleOrders.filter(o => o.status === 'Pendiente').length, [visibleOrders]);
  const ordersCancelledCount = React.useMemo(() => visibleOrders.filter(o => o.status === 'Cancelado').length, [visibleOrders]);
  const ordersAvgTicket = visibleOrders.length > 0 ? ordersRevenue / visibleOrders.length : 0;
  const ordersReturnRate = visibleOrders.length > 0 ? (ordersCancelledCount / visibleOrders.length) * 100 : 0;

  const orderStatusStyle = (status: string) => {
    if (status === 'Entregado') return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' };
    if (status === 'Cancelado') return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' };
    if (status === 'Enviado' || status === 'Preparando' || status === 'Listo') return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500' };
    return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500' };
  };

  const formatOrderDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  const inicialesDeCliente = (nombre: string) =>
    (nombre || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const [isStoreEditorOpen, setIsStoreEditorOpen] = useState(false);
  const [editingStoreSlug, setEditingStoreSlug] = useState<string | null>(null);
  const [isStoreSaving, setIsStoreSaving] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', tagline: '', marketplace_category: '', whatsapp: '', show_demo_products: true, zona: '', direccion: '', horario: '', rating: '', metodos_pago: [] as string[] });
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null);
  const [storeHeroFile, setStoreHeroFile] = useState<File | null>(null);
  const [storeLogoPreview, setStoreLogoPreview] = useState<string | null>(null);
  const [storeHeroPreview, setStoreHeroPreview] = useState<string | null>(null);
  // null = no tocar el color: se deja el que ya tenia (de la plantilla o de
  // un preset elegido antes). Con un id, ese preset pisa el primary al guardar.
  // 'logo' es dinamico: el color sale de logoTheme (extraido de una imagen),
  // no de COLOR_PRESETS.
  const [colorPreset, setColorPreset] = useState<string | null>(null);
  const [logoTheme, setLogoTheme] = useState<StoreTheme | null>(null);
  const [extractingTheme, setExtractingTheme] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    store: selectedStore === 'all' ? '' : selectedStore,
    price: '',
    category: '',
    subcategory: '',
    image: '',
    desc: '',
  });

  const resetForm = () => {
    setEditingProductId(null);
    setNewProduct({ name: '', store: selectedStore === 'all' ? '' : selectedStore, price: '', category: '', subcategory: '', image: '', desc: '' });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Cargar productos al iniciar
  useEffect(() => {
    fetchProducts();
    fetchStores();
    fetchOrders();
  }, []);

  // Al abrir el editor desde una tarjeta del Inicio, saltar a esa sección.
  useEffect(() => {
    if (!isStoreEditorOpen || !storeEditorSection) return;
    const t = setTimeout(() => {
      document.getElementById(`editor-${storeEditorSection}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => clearTimeout(t);
  }, [isStoreEditorOpen, storeEditorSection]);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

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
    }
    setTogglingActive(false);
  };

  const addToCart = (product: Product) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
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
    if (posCart.length === 0 || !focusedStore) return;
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
      setLastCompletedSale(data || { ...saleDetails, id: 'POS-' + Math.floor(Math.random() * 90000 + 10000), created_at: new Date().toISOString() });
      setPosCart([]);
      setPosCustomerName('');
      setPosCustomerPhone('');
      setIsTicketModalOpen(true);
      fetchOrders();
    }
    setIsPosSaving(false);
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
      show_demo_products: dbData?.show_demo_products ?? true,
      zona: dbData?.zona || config?.zona || '',
      direccion: dbData?.direccion || config?.direccion || '',
      horario: dbData?.horario || config?.horario || '',
      rating: dbData?.rating != null ? String(dbData.rating) : (config?.rating != null ? String(config.rating) : ''),
      metodos_pago: dbData?.metodos_pago || config?.metodosPago || [],
    });
    setStoreHeroPreview(dbData?.hero_image || config?.heroImage || null);
    setStoreLogoPreview(dbData?.logo_image || config?.logoImage || null);
    setStoreLogoFile(null);
    setStoreHeroFile(null);
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
      alert('Subí un logo o una portada primero para poder sacar sus colores.');
      return;
    }
    setExtractingTheme(true);
    const extracted = await extractThemeFromImageClient(imageUrl);
    setExtractingTheme(false);
    if (!extracted) {
      alert('No se pudieron sacar colores de esa imagen. Probá con otra.');
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

      if (storeLogoFile) {
        try {
          logoUrl = await uploadFile(storeLogoFile, `store-assets/${editingStoreSlug}`);
        } catch (err) {
          console.error('Error subiendo logo:', err);
        }
      }

      if (storeHeroFile) {
        try {
          heroUrl = await uploadFile(storeHeroFile, `store-assets/${editingStoreSlug}`);
        } catch (err) {
          console.error('Error subiendo portada:', err);
        }
      }

      const upsertData: any = {
        slug: editingStoreSlug,
        name: storeForm.name,
        tagline: storeForm.tagline,
        marketplace_category: storeForm.marketplace_category,
        whatsapp: storeForm.whatsapp || null,
        show_demo_products: storeForm.show_demo_products,
        zona: storeForm.zona || null,
        direccion: storeForm.direccion || null,
        horario: storeForm.horario || null,
        rating: storeForm.rating !== '' ? Number(storeForm.rating) : null,
        metodos_pago: storeForm.metodos_pago.length ? storeForm.metodos_pago : null,
        status: 'active',
      };
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
      const columnasOpcionales = ['show_demo_products', 'zona', 'direccion', 'horario', 'rating', 'metodos_pago'];
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

      await fetchStores();
      setIsStoreEditorOpen(false);
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsStoreSaving(false);
    }
  };

  const handleStoreReset = async () => {
    if (!editingStoreSlug) return;
    if (!window.confirm('¿Estás seguro? Se eliminarán los datos personalizados y la tienda volverá a su configuración por defecto.')) return;
    setIsStoreSaving(true);
    try {
      const { error } = await supabase.from('stores').delete().eq('slug', editingStoreSlug);
      if (error) throw error;
      await fetchStores();
      setIsStoreEditorOpen(false);
    } catch (err: any) {
      alert('Error al resetear: ' + err.message);
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
    } catch (error) {
      console.error('Error updating status:', error);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: currentStatus } : p));
      alert('Error al actualizar el estado.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !editingProductId) {
      alert("Por favor selecciona una imagen");
      return;
    }
    setIsSaving(true);

    try {
      let finalImageUrl = newProduct.image;

      // 1. Subir la imagen si hay una nueva
      if (selectedFile) {
        const folder = `product-images/${newProduct.store.replace(/\s+/g, '-').toLowerCase()}`;
        finalImageUrl = await uploadFile(selectedFile, folder);
      }

      // 2. Guardar en la base de datos
      if (editingProductId) {
        const { error: dbError } = await supabase.from('products').update({
          name: newProduct.name,
          store: newProduct.store,
          price: parseFloat(newProduct.price),
          category: newProduct.category,
          subcategory: newProduct.subcategory,
          image: finalImageUrl,
          description: newProduct.desc,
        }).eq('id', editingProductId);

        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from('products').insert([
          {
            name: newProduct.name,
            store: newProduct.store,
            price: parseFloat(newProduct.price),
            category: newProduct.category,
            subcategory: newProduct.subcategory,
            image: finalImageUrl,
            description: newProduct.desc,
            stock: 0,
            status: 'Activo'
          }
        ]);

        if (dbError) throw dbError;
      }

      // Éxito: Limpiar formulario y recargar
      await fetchProducts();
      setIsModalOpen(false);
      resetForm();
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert('Hubo un error al guardar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      store: product.store,
      price: product.price.toString(),
      category: product.category,
      subcategory: product.subcategory || '',
      image: product.image,
      desc: product.description || '',
    });
    setPreviewUrl(product.image);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"? Esta acción no se puede deshacer.`)) {
      setIsDeleting(id);
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        await fetchProducts();
      } catch (error: any) {
        alert('Error al eliminar: ' + error.message);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const getBase64Image = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
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
            p.name + (p.subcategory ? `\n(Sección: ${p.subcategory})` : ''), 
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
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#f8f9fa] font-['Outfit'] flex flex-col md:flex-row">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Sidebar (Visible en Desktop) — el padre ya no scrollea (md:overflow-hidden),
          asi que se queda fijo sin depender de `sticky`: antes se despegaba al
          bajar con la rueda del mouse porque el documento entero scrolleaba. */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-gray-100 flex-col h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
          <div className="w-8 h-8 rounded-lg bg-[#b8130e] text-white flex items-center justify-center font-bold text-xl">B</div>
          <span className="font-extrabold text-xl tracking-tight text-gray-900">Workspace</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {NAV_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold transition-colors ${activeTab === t.id ? 'bg-[#b8130e] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
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
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[#b8130e] hover:bg-[#b8130e]/10 rounded-md font-bold transition-colors mt-4"
          >
            <span className="material-symbols-outlined text-[20px]">install_mobile</span>
            Instalar App
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-1">
          <p className="px-4 text-[11px] text-gray-400 font-semibold truncate">{user.email}</p>
          <Link href="/market" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 font-semibold transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Volver a Boga
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
        <header className={`hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 ${activeTab === 'pos' ? 'mb-2' : 'mb-6'}`}>
          <div>
            <h1 className={`${activeTab === 'pos' ? 'text-lg font-black' : 'text-2xl font-extrabold'} text-gray-900 tracking-tight`}>
              {activeTab === 'inicio' ? 'Inicio' : activeTab === 'products' ? 'Gestión de Productos' : activeTab === 'orders' ? 'Gestión de Pedidos' : activeTab === 'stores' ? 'Mis Tiendas' : activeTab === 'pos' ? 'Caja Rápida (POS)' : 'Métricas y Rendimiento'}
              {(activeTab === 'pos' || activeTab === 'inicio') && stores[focusedStore] && (
                <span className="ml-2 text-gray-400 font-semibold">· {stores[focusedStore].name}</span>
              )}
            </h1>
            {activeTab !== 'pos' && activeTab !== 'inicio' && (
              <p className="text-gray-500 text-sm font-medium mt-1">
                {activeTab === 'products' ? 'Administra el inventario de tus tiendas.' : activeTab === 'orders' ? 'Gestiona los pedidos de tus clientes.' : activeTab === 'stores' ? 'Administra la información de tus sucursales.' : 'Analiza el rendimiento de tu negocio.'}
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
              <button
                onClick={() => { setPickerDraft([]); setIsStorePickerOpen(true); }}
                title="Reclamar otra tienda"
                className={`bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 rounded-md shadow-sm transition-colors flex items-center justify-center shrink-0 ${activeTab === 'pos' ? 'w-9 h-9' : 'w-11 h-11'}`}
              >
                <span className="material-symbols-outlined text-[18px]">checklist</span>
              </button>
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
              <button
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="flex items-center justify-center gap-2 bg-[#b8130e] text-white px-5 py-2.5 rounded-md font-bold shadow-lg shadow-[#b8130e]/20 hover:shadow-[#b8130e]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full md:w-auto"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nuevo Producto
              </button>
            ) : null}
          </div>
        </header>

        {activeTab === 'inicio' && !inicioStore && (
          <div className="max-w-md mx-auto py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-[28px]">storefront</span>
            </div>
            <h3 className="font-bold text-gray-900">Todavía no tenés ninguna carta</h3>
            <p className="text-gray-500 text-sm mt-1">Reclamá la que te creó el equipo de Boga para empezar.</p>
            <button
              onClick={() => { setPickerDraft([]); setIsStorePickerOpen(true); }}
              className="mt-5 px-4 py-2.5 bg-[#b8130e] text-white font-bold rounded-md text-sm"
            >
              Reclamar mi carta
            </button>
          </div>
        )}

        {activeTab === 'inicio' && inicioStore && (
          <div className="max-w-md md:max-w-2xl mx-auto flex flex-col gap-3 pb-4">
            {/* Acciones rápidas */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => { setPickerDraft([]); setIsStorePickerOpen(true); }} className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50">
                <span className="material-symbols-outlined text-[16px]">menu_book</span>Mis cartas
              </button>
              <a href={inicioUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50">
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>Ver enlace
              </a>
              <button onClick={() => openStoreEditor(inicioStore.slug, 'datos')} className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50">
                <span className="material-symbols-outlined text-[16px]">edit</span>Editar perfil
              </button>
              <button onClick={async () => { await signOut(); router.replace('/login'); }} className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-[#8c0009] hover:bg-[#8c0009]/5">
                <span className="material-symbols-outlined text-[16px]">logout</span>Cerrar sesión
              </button>
            </div>

            {/* Fila 1: header con color de la carta — logo, selector, URL, y a la
                derecha el toggle "activa" y el botón de compartir. */}
            <div className="rounded-xl p-3.5 text-white shadow-sm flex items-center gap-3" style={{ background: inicioStore.theme?.primary || '#b8130e' }}>
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
                <button onClick={compartirCarta} title="Compartir link de la carta" className="flex items-center gap-1 text-white/90 text-[10px] font-bold hover:text-white">
                  <span className="material-symbols-outlined text-[15px]">share</span>Compartir
                </button>
              </div>
            </div>

            {/* Fila 2: resumen de pedidos */}
            <button onClick={() => setActiveTab('orders')} className="w-full bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-left hover:border-gray-200 transition-colors">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 text-sm">Pedidos del negocio</h4>
                <span className="material-symbols-outlined text-[#b8130e] text-[20px]">arrow_forward</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                {[
                  { k: 'Total', v: inicioOrders.length },
                  { k: 'Pendientes', v: inicioOrders.filter(o => o.status === 'Pendiente').length },
                  { k: 'Entregados', v: inicioOrders.filter(o => o.status === 'Entregado').length },
                ].map(s => (
                  <div key={s.k}>
                    <p className="text-xl font-black text-gray-900 leading-none">{s.v}</p>
                    <p className="text-[11px] font-semibold text-gray-400 mt-1">{s.k}</p>
                  </div>
                ))}
              </div>
            </button>

            {/* Gestión — mismas secciones y mismo orden que la sidebar / barra inferior */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-2 px-1">Gestión</p>
              <div className="grid grid-cols-2 gap-3">
                {NAV_TABS.filter(t => t.id !== 'inicio' && t.id !== 'stores').map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-left hover:shadow-md hover:border-gray-200 transition-all flex flex-col gap-2">
                    <span className="w-9 h-9 rounded-lg bg-[#b8130e]/10 text-[#b8130e] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                    </span>
                    <span className="font-bold text-gray-900 text-sm leading-tight">{t.label}</span>
                    <span className="text-[11px] text-gray-500 leading-snug">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Herramientas */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-2 px-1">Herramientas</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setSelectedStore(inicioStore.slug); setIsQRModalOpen(true); }} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-left hover:shadow-md hover:border-gray-200 transition-all flex flex-col gap-2">
                  <span className="w-9 h-9 rounded-lg bg-[#b8130e]/10 text-[#b8130e] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                  </span>
                  <span className="font-bold text-gray-900 text-sm leading-tight">Código QR</span>
                  <span className="text-[11px] text-gray-500 leading-snug">Genéralo y compártelo para tus mesas</span>
                </button>
                <button onClick={() => { setSelectedStore(inicioStore.slug); setIsPDFModalOpen(true); }} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-left hover:shadow-md hover:border-gray-200 transition-all flex flex-col gap-2">
                  <span className="w-9 h-9 rounded-lg bg-[#b8130e]/10 text-[#b8130e] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                  </span>
                  <span className="font-bold text-gray-900 text-sm leading-tight">Exportar PDF</span>
                  <span className="text-[11px] text-gray-500 leading-snug">Descarga tu carta como catálogo</span>
                </button>
              </div>
            </div>

            {/* Configuración de la carta */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-2 px-1">Configuración de la carta</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: 'wallpaper', titulo: 'Editar portada', sub: 'Diseño y elementos visibles', section: 'portada' },
                  { icon: 'storefront', titulo: 'Datos del negocio', sub: 'Información principal y redes', section: 'datos' },
                  { icon: 'schedule', titulo: 'Horarios', sub: 'Define apertura y cierre', section: 'horario' },
                  { icon: 'payments', titulo: 'Métodos de pago', sub: 'Configura opciones', section: 'pagos' },
                  { icon: 'notifications', titulo: 'Avisos y notificaciones', sub: 'WhatsApp y correo donde recibís tus pedidos', section: 'avisos' },
                ].map(c => (
                  <button key={c.section} onClick={() => openStoreEditor(inicioStore.slug, c.section)} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-left hover:shadow-md hover:border-gray-200 transition-all flex flex-col gap-2">
                    <span className="w-9 h-9 rounded-lg bg-[#b8130e]/10 text-[#b8130e] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                    </span>
                    <span className="font-bold text-gray-900 text-sm leading-tight">{c.titulo}</span>
                    <span className="text-[11px] text-gray-500 leading-snug">{c.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <>
            {/* Store Selector Global for Dashboard */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSelectedStore('all')}
                className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  selectedStore === 'all' 
                    ? 'bg-[#b8130e] text-white shadow-md' 
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
                      ? 'bg-[#b8130e] text-white border-[#b8130e] shadow-md' 
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
                const matchesCategory = selectedFilterCategory === 'all' || p.category === selectedFilterCategory;
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
                    <div className="hidden lg:block flex-1 border-2 border-dashed border-gray-200 rounded-md bg-transparent"></div>
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
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 bg-[#b8130e] text-white hover:bg-[#8f0f0b] whitespace-nowrap active:scale-95 cursor-pointer shadow-sm"
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
                                ? 'bg-[#b8130e] text-white border-transparent' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            Todos
                          </button>
                          {availableCategories.map(cat => (
                            <button 
                              key={cat}
                              onClick={() => setSelectedFilterCategory(cat)}
                              className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap uppercase tracking-wider transition-colors border ${
                                selectedFilterCategory === cat 
                                  ? 'bg-[#b8130e] text-white border-transparent' 
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
                    <div className="p-8 text-center text-gray-400">Cargando productos...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-gray-400">inventory_2</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">No hay productos</h3>
                      <p className="text-gray-500 text-sm max-w-sm">No se encontraron productos para esta tienda. Empieza añadiendo el primero.</p>
                      <button 
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="mt-6 px-4 py-2 bg-[#b8130e] text-white font-semibold rounded-lg hover:bg-[#8f0f0b] transition-colors"
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
                              <th className="p-3 font-bold w-1/3">Producto</th>
                              {selectedStore === 'all' && <th className="p-3 font-bold">Tienda</th>}
                              <th className="p-3 font-bold">Categoría</th>
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
                                      <p className="font-bold text-gray-900">{p.name}</p>
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
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                    {p.category}
                                  </span>
                                </td>
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
                                  S/ {Number(p.price).toFixed(2)}
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
                                <h3 className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-2">{p.name}</h3>
                                <span className="font-bold text-primary text-[13px] whitespace-nowrap">S/ {Number(p.price).toFixed(2)}</span>
                              </div>
                              
                              <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider truncate">
                                {p.category} {p.subcategory ? `• ${p.subcategory}` : ''}
                              </p>
                              
                              <div className="flex justify-between items-center mt-auto">
                                <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={p.status === 'Activo'} onChange={() => toggleStatus(p.id, p.status)} />
                                    <div className={`block w-8 h-5 rounded-full transition-colors ${p.status === 'Activo' ? 'bg-[#25D366]' : 'bg-red-500'}`}></div>
                                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${p.status === 'Activo' ? 'translate-x-3' : ''}`}></div>
                                  </div>
                                  <span className={`ml-1.5 text-[9px] font-extrabold ${p.status === 'Activo' ? 'text-green-700' : 'text-red-600'}`}>
                                    {p.status === 'Activo' ? 'STOCK' : 'AGOTADO'}
                                  </span>
                                </label>
                                
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
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

        {activeTab === 'orders' && (
          <>
            {/* Mobile View (Stich Dash Mobile UI) */}
            <div className="flex flex-col gap-4 w-full md:hidden">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Buscar ID de Pedido, Cliente..."
                  className="w-full h-12 pl-11 pr-4 bg-white border border-[#e1e3e4]/60 rounded-md focus:ring-2 focus:ring-[#b8130e] focus:border-transparent focus:outline-none transition-all text-sm font-medium text-[#191c1d]"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {(['all', 'Pendiente', 'Enviado', 'Entregado'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setOrderStatusFilter(f)}
                    className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                      orderStatusFilter === f ? 'bg-[#b8130e] text-white' : 'bg-[#e1e3e4] text-[#5f5e5e]'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f}
                  </button>
                ))}
              </div>

              <h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mt-2">Pedidos Recientes</h3>

              <div className="flex flex-col gap-3">
                {filteredOrders.length === 0 ? (
                  <div className="bg-white rounded-md border border-gray-100 p-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-gray-300 mb-2 block">receipt_long</span>
                    <p className="text-gray-500 font-semibold text-sm">
                      {visibleOrders.length === 0 ? 'Todavía no tienes pedidos.' : 'Ningún pedido coincide con este filtro.'}
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((o) => {
                    const st = orderStatusStyle(o.status);
                    const itemCount = Array.isArray(o.items) ? o.items.length : 0;
                    return (
                      <div key={o.id} className="bg-white rounded-md border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-[#b8130e] font-bold text-xs tracking-wide">#{o.id.slice(0, 8).toUpperCase()}</span>
                            <span className="text-gray-900 font-extrabold text-base mt-1">{o.customer_name}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${st.bg} ${st.text} ${st.border}`}>{o.status}</span>
                        </div>
                        <div className="flex justify-between items-end mt-1">
                          <span className="text-gray-500 text-xs font-medium">{formatOrderDate(o.created_at)} • {itemCount} {itemCount === 1 ? 'Ítem' : 'Ítems'}</span>
                          <span className="text-gray-900 font-black text-xl">S/ {Number(o.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Desktop View (Stich Dash PC UI) */}
            <div className="hidden md:flex flex-col gap-6 w-full">
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-full max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Buscar ID de Pedido, Cliente..."
                    className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#b8130e] focus:border-transparent focus:outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'Pendiente', 'Enviado', 'Entregado'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderStatusFilter(f)}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
                        orderStatusFilter === f
                          ? 'bg-[#b8130e] text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'Todos los Pedidos' : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-md p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-1">Ingresos Totales</h4>
                    <span className="text-3xl font-black text-gray-900">S/ {ordersRevenue.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-gray-400 font-bold text-[13px]">
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    {visibleOrders.length} {visibleOrders.length === 1 ? 'pedido' : 'pedidos'} en total
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-md p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-1">Pedidos Activos</h4>
                    <span className="text-3xl font-black text-gray-900">{ordersActiveCount}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-gray-500 font-bold text-[13px]">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {ordersPendingCount} {ordersPendingCount === 1 ? 'pedido requiere' : 'pedidos requieren'} atención
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-md p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-1">Ticket Promedio</h4>
                    <span className="text-3xl font-black text-gray-900">S/ {ordersAvgTicket.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-gray-400 font-bold text-[13px]">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Por pedido
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-md p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-1">Tasa de Cancelación</h4>
                    <span className="text-3xl font-black text-gray-900">{ordersReturnRate.toFixed(1)}%</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-gray-400 font-bold text-[13px]">
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    {ordersCancelledCount} {ordersCancelledCount === 1 ? 'cancelado' : 'cancelados'}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-gray-100 rounded-md shadow-sm overflow-hidden mt-2">
                {filteredOrders.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">receipt_long</span>
                    <p className="text-gray-500 font-bold text-sm">
                      {visibleOrders.length === 0 ? 'Todavía no tienes pedidos.' : 'Ningún pedido coincide con este filtro.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          <th className="p-4">ID Pedido</th>
                          <th className="p-4">Nombre del Cliente</th>
                          <th className="p-4">Fecha</th>
                          <th className="p-4">Ítems</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-medium">
                        {filteredOrders.map((o) => {
                          const st = orderStatusStyle(o.status);
                          const itemCount = Array.isArray(o.items) ? o.items.length : 0;
                          return (
                            <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                              <td className="p-4 text-[#b8130e] font-bold">#{o.id.slice(0, 8).toUpperCase()}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#b8130e]/10 text-[#b8130e] flex items-center justify-center font-bold text-xs shrink-0">
                                    {inicialesDeCliente(o.customer_name)}
                                  </div>
                                  <span className="text-gray-900">{o.customer_name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-gray-500">{formatOrderDate(o.created_at)}</td>
                              <td className="p-4 text-gray-500">{itemCount} {itemCount === 1 ? 'Ítem' : 'Ítems'}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.text} ${st.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span> {o.status}
                                </span>
                              </td>
                              <td className="p-4 text-right text-gray-900 font-bold">S/ {Number(o.total_amount).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                      <span className="text-sm text-gray-500">Mostrando {filteredOrders.length} de {visibleOrders.length} pedidos</span>
                    </div>
                  </>
                )}
              </div>

              {/* Promotional Cards Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
                <div className="lg:col-span-2 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-md p-6 shadow-sm flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Automatizar Etiquetas de Envío</h3>
                  <p className="text-sm text-gray-500 mb-4 w-full">Conecta tu proveedor preferido para generar etiquetas de envío automáticamente tan pronto como un pedido sea marcado como 'Empacado'.</p>
                  <a href="#" className="text-[#b8130e] font-bold text-sm flex items-center gap-1 hover:underline">
                    Ver integraciones <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
                <div className="bg-[#b8130e] rounded-md p-6 shadow-md text-white flex flex-col justify-between relative overflow-hidden">
                  <span className="material-symbols-outlined absolute -right-4 -top-4 text-7xl opacity-10">verified_user</span>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-2">Protección contra Fraude</h3>
                    <p className="text-sm text-white/80 mb-4 w-full">Tu cuenta está cubierta actualmente por detección de fraude con IA para todos los pedidos.</p>
                  </div>
                  <button className="relative z-10 w-full py-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg font-bold text-sm backdrop-blur-sm">
                    Ver Reporte de Seguridad
                  </button>
                </div>
              </div>
            </div>
          </>
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
                          href={`/${store.slug}`} 
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
              <div className="w-10 h-10 rounded-full bg-[#b8130e]/10 text-[#b8130e] flex items-center justify-center shrink-0">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <p className="text-sm font-bold text-gray-500">Ventas de Hoy</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">S/ 0.00</h3>
              </div>
              <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">shopping_bag</span>
                </div>
                <p className="text-sm font-bold text-gray-500">Pedidos Completados</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">0</h3>
              </div>
              <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">visibility</span>
                </div>
                <p className="text-sm font-bold text-gray-500">Vistas del Perfil</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">24</h3>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm mt-4">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-900">Productos Más Vendidos</h3>
              </div>
              <div className="p-8 text-center">
                <p className="text-gray-500">Aún no hay suficientes datos para mostrar métricas. ¡Comparte tu código QR para recibir más pedidos!</p>
              </div>
            </div>

            {/* Install App Card for Mobile users */}
            <div className="md:hidden bg-[#b8130e] text-white p-6 rounded-md shadow-md mt-2 flex flex-col items-center text-center">
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
                className="w-full py-3 bg-white text-[#b8130e] rounded-md font-bold hover:bg-gray-50 transition-colors"
              >
                Instalar Ahora
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
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
                    className="w-full h-8 pl-8 pr-2.5 bg-gray-50 border border-[#e1e3e4]/40 rounded-lg focus:ring-1 focus:ring-[#b8130e] focus:border-[#b8130e] focus:outline-none transition-all text-xs font-medium text-[#191c1d]"
                  />
                </div>
                <div className="flex-1 flex gap-1 overflow-x-auto hide-scrollbar py-0.5" style={{ scrollbarWidth: 'none' }}>
                  <button 
                    onClick={() => setPosProductCategory('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                      posProductCategory === 'all' 
                        ? 'bg-[#b8130e] text-white border-transparent shadow-sm' 
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
                          ? 'bg-[#b8130e] text-white border-transparent shadow-sm' 
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
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => addToCart(p)}
                          className={`product-card text-left flex flex-col bg-white border rounded-md overflow-hidden hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer group ${
                            quantity > 0 ? 'border-[#b8130e] ring-1 ring-[#b8130e]/20' : 'border-[#e1e3e4]/30'
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
                            <div className="absolute top-1 right-1 px-1 py-0.5 bg-white/90 backdrop-blur rounded font-bold text-[7px] text-[#b8130e]">
                              {quantity > 0 ? `${quantity} EN CARRO` : 'EN STOCK'}
                            </div>
                          </div>
                          <div className="p-1.5 flex-1 flex flex-col justify-between">
                            <h3 className="font-bold text-[11px] text-[#191c1d] truncate leading-tight" title={p.name}>{p.name}</h3>
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-extrabold text-xs text-[#b8130e]">S/ {p.price.toFixed(2)}</p>
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
                                    className="text-gray-500 hover:text-[#b8130e] transition-colors flex items-center justify-center font-bold text-[10px] bg-white rounded shadow-sm cursor-pointer"
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
                  className="flex items-center gap-1 text-[#b8130e] font-bold text-[9px] mt-0.5 hover:underline cursor-pointer"
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
                      className="w-full px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#b8130e] h-7"
                    />
                    <input 
                      type="text" 
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      placeholder="WhatsApp" 
                      className="w-full px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#b8130e] h-7"
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
                    className="px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#b8130e] cursor-pointer h-7"
                  >
                    <option value="Administrador">Admin</option>
                    <option value="Juan">Juan</option>
                    <option value="María">María</option>
                    <option value="Pedro">Pedro</option>
                    <option value="Sofía">Sofía</option>
                    <option value="Otro">Otro...</option>
                  </select>
                  {posSeller === 'Otro' && (
                    <input 
                      type="text" 
                      value={customSeller}
                      onChange={(e) => setCustomSeller(e.target.value)}
                      placeholder="Nombre" 
                      className="w-24 px-1.5 py-0.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#b8130e] h-7"
                    />
                  )}
                </div>
              </div>

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
                            className="text-gray-500 hover:text-[#b8130e] transition-colors flex items-center justify-center font-bold text-[10px] bg-white rounded shadow-sm cursor-pointer"
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
                    className="w-full py-2 bg-[#b8130e] text-white rounded-lg font-bold text-[13px] shadow-lg shadow-[#b8130e]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
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
                <span className="text-base font-black text-[#b8130e]">S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setIsMobileCheckoutOpen(true)}
                disabled={posCart.length === 0}
                className="bg-[#b8130e] text-white px-5 py-2.5 rounded-md font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-transform disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer shadow-md"
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
                      <span className="material-symbols-outlined text-[#b8130e] text-[20px]">shopping_cart</span>
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
                        className="flex items-center gap-1 text-[#b8130e] font-bold text-xs hover:underline cursor-pointer"
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
                              className="w-full px-2.5 py-1.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#b8130e]"
                            />
                            <input 
                              type="text" 
                              value={posCustomerPhone}
                              onChange={(e) => setPosCustomerPhone(e.target.value)}
                              placeholder="WhatsApp" 
                              className="w-full px-2.5 py-1.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#b8130e]"
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
                          className="w-full px-2.5 py-1.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#b8130e] cursor-pointer"
                        >
                          <option value="Administrador">Administrador</option>
                          <option value="Juan">Juan</option>
                          <option value="María">María</option>
                          <option value="Pedro">Pedro</option>
                          <option value="Sofía">Sofía</option>
                          <option value="Otro">Otro...</option>
                        </select>
                        {posSeller === 'Otro' && (
                          <input 
                            type="text" 
                            value={customSeller}
                            onChange={(e) => setCustomSeller(e.target.value)}
                            placeholder="Nombre" 
                            className="w-full px-2.5 py-1.5 bg-[#ffece9]/40 border border-[#e1e3e4]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#b8130e]"
                          />
                        )}
                      </div>
                    </div>

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
                                className="text-gray-500 hover:text-[#b8130e] transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs"
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
                          className="w-full py-3 bg-[#b8130e] text-white rounded-lg font-bold text-sm shadow-lg shadow-[#b8130e]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
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
          
          <div className="relative bg-white w-[90vw] md:w-[550px] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{editingProductId ? 'Editar Producto' : 'Añadir Producto'}</h2>
              <button 
                onClick={() => { if (!isSaving) { setIsModalOpen(false); resetForm(); } }}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                disabled={isSaving}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Image Uploader */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-200 rounded-lg mb-8 flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors cursor-pointer bg-gray-50/50 overflow-hidden relative group"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity">
                      Cambiar Imagen
                    </div>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-4xl mb-2">add_a_photo</span>
                    <span className="font-bold text-sm">Clic para subir foto</span>
                    <span className="text-xs mt-1 opacity-70">Recomendado cuadrado (1:1)</span>
                  </>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Producto</label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Precio (S/)</label>
                    <input 
                      required
                      type="number" 
                      step="0.10"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asignar a Tienda</label>
                    <select 
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
                      {Object.values(stores).map(store => (
                        <option key={store.slug} value={store.slug}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                    <select 
                      required
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'black\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                    >
                      <option value="" disabled>Selecciona...</option>
                      {Object.values(stores).find(s => s.slug === newProduct.store)?.categories.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Sección (Ej: Entradas)</label>
                    <input 
                      type="text" 
                      list="existing-subcategories"
                      value={newProduct.subcategory}
                      onChange={(e) => setNewProduct({...newProduct, subcategory: e.target.value})}
                      placeholder="Título separador..."
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black transition-all"
                    />
                    <datalist id="existing-subcategories">
                      {Array.from(new Set(products.filter(p => p.store === newProduct.store && p.category === newProduct.category && p.subcategory).map(p => p.subcategory))).map(sub => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 sticky bottom-0">
              <button 
                type="button"
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                disabled={isSaving}
                className="px-6 py-3.5 rounded-md font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3.5 bg-[#b8130e] text-white rounded-md font-bold shadow-lg shadow-[#b8130e]/20 hover:shadow-[#b8130e]/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                    Guardando...
                  </>
                ) : editingProductId ? (
                  'Guardar Cambios'
                ) : (
                  'Crear Producto'
                )}
              </button>
            </div>
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
                <p className="text-sm text-gray-500 mt-0.5 font-medium">{stores[editingStoreSlug]?.name}</p>
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
                <label className="block text-sm font-bold text-gray-700 mb-2">Foto de Portada</label>
                <input type="file" ref={storeHeroInputRef} onChange={e => { if (e.target.files?.[0]) { setStoreHeroFile(e.target.files[0]); setStoreHeroPreview(URL.createObjectURL(e.target.files[0])); }}} accept="image/*" className="hidden" />
                <div
                  onClick={() => storeHeroInputRef.current?.click()}
                  className="w-full h-36 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer relative group hover:border-black transition-colors bg-gray-50"
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
                <input type="file" ref={storeLogoInputRef} onChange={e => { if (e.target.files?.[0]) { setStoreLogoFile(e.target.files[0]); setStoreLogoPreview(URL.createObjectURL(e.target.files[0])); }}} accept="image/*" className="hidden" />
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => storeLogoInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer relative group hover:border-black transition-colors bg-gray-50 shrink-0"
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
              <div>
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
                <input
                  type="text"
                  value={storeForm.marketplace_category}
                  onChange={e => setStoreForm({...storeForm, marketplace_category: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="Ej: Restaurantes, Moda, Salud..."
                />
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
                  Se muestran en tu tienda como referencia. Ningún pago se procesa en la app: se coordina por WhatsApp.
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
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: `${m.color}1a`, color: m.color }}
                        >
                          <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                        </span>
                        <span className="text-xs font-bold" style={{ color: activo ? m.color : '#374151' }}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                {storeForm.metodos_pago.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">Si no elegís ninguno, tu tienda muestra solo Efectivo.</p>
                )}
              </div>

              {/* Ficha del local: todo opcional, para negocios sin sede fisica (puro delivery) */}
              <div id="editor-horario" className="space-y-4 pt-2 border-t border-gray-100 scroll-mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ficha del local (opcional)</label>
                  <p className="text-xs text-gray-500">
                    Si tu negocio no tiene local a la calle o no querés mostrar estos datos, dejalos vacíos: tu tienda simplemente no los muestra.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <input
                      type="text"
                      value={storeForm.horario}
                      onChange={e => setStoreForm({ ...storeForm, horario: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      placeholder="Ej: Lun a Dom, 12pm - 11pm"
                    />
                  </div>
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
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Calificación (0 a 5, opcional)</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={storeForm.rating}
                    onChange={e => setStoreForm({ ...storeForm, rating: e.target.value })}
                    className="w-full sm:w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-md font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="Ej: 4.8"
                  />
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

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between gap-3 sticky bottom-0">
              <button
                onClick={handleStoreReset}
                disabled={isStoreSaving}
                className="flex items-center gap-1.5 px-4 py-3.5 rounded-md font-bold text-[#8c0009] hover:bg-[#8c0009]/8 transition-colors disabled:opacity-50 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Resetear
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsStoreEditorOpen(false)}
                  disabled={isStoreSaving}
                  className="px-6 py-3.5 rounded-md font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStoreSave}
                  disabled={isStoreSaving}
                  className="flex items-center gap-2 px-8 py-3.5 bg-[#b8130e] text-white rounded-md font-bold shadow-lg shadow-[#b8130e]/20 hover:shadow-[#b8130e]/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {isStoreSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                      Guardando...
                    </>
                  ) : 'Guardar Cambios'}
                </button>
              </div>
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
                  value={selectedStore !== 'all' ? `${siteOrigin}/${selectedStore}` : `${siteOrigin}/explore`}
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
                className="w-full flex items-center justify-center gap-2 bg-[#b8130e] text-white px-5 py-3 rounded-md font-bold shadow-lg hover:shadow-[#b8130e]/30 transition-all"
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
                    className="w-full flex items-center justify-between p-4 bg-[#f8f9fa] hover:bg-[#b8130e]/5 border border-gray-100 hover:border-[#b8130e]/20 rounded-lg transition-all text-left group cursor-pointer"
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
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-[#b8130e] transition-colors">download</span>
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
            className="w-14 h-14 bg-[#b8130e] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#8f0f0b] transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation — no aparece en el Inicio: ahí es un hub, la
          barra sale recién al entrar a una sección de trabajo. */}
      {activeTab !== 'inicio' && (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 flex justify-around items-center z-50 rounded-t-2xl shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {NAV_TABS.filter(t => t.inBottomBar).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center gap-1 w-16 py-2 rounded-[20px] transition-all ${activeTab === t.id ? 'bg-[#b8130e] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[22px]">{t.icon}</span>
            <span className="text-[10px] font-bold">{t.id === 'pos' ? 'Vender' : t.label}</span>
          </button>
        ))}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 w-16 py-2 transition-all text-gray-500 hover:bg-gray-50 rounded-[20px]"
        >
          <div className="w-6 h-6 rounded-full bg-[#b8130e] text-white flex items-center justify-center font-bold text-xs mb-[2px]">B</div>
          <span className="text-[10px] font-bold">Perfil</span>
        </button>
      </div>
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
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Tienda</label>
                <select
                  value={selectedStore}
                  onChange={(e) => {
                    setSelectedStore(e.target.value);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-md font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="all">Todas mis tiendas</option>
                  {Object.values(stores).map(s => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setPickerDraft([]); setIsStorePickerOpen(true); setIsMobileMenuOpen(false); }}
                  className="mt-2 text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">checklist</span>
                  Reclamar otra tienda
                </button>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-6">
                {/* Secciones que no entran en la barra inferior, en el mismo orden */}
                {NAV_TABS.filter(t => !t.inBottomBar).map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTab(t.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-semibold transition-colors ${activeTab === t.id ? 'bg-[#b8130e] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}

                <Link href="/market" className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-md font-semibold transition-colors">
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  Volver a Boga
                </Link>
                
                <button 
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('bogadash_pwa_stats');
                      window.location.reload();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[#b8130e] bg-[#b8130e]/5 hover:bg-[#b8130e]/10 rounded-md font-bold transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">install_mobile</span>
                  Instalar App
                </button>

                <div className="pt-2 mt-2 border-t border-gray-100">
                  <p className="px-4 text-[11px] text-gray-400 font-semibold truncate">{user.email}</p>
                  <button
                    onClick={async () => { await signOut(); router.replace('/login'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-md font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Cerrar sesión
                  </button>
                </div>
              </div>
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
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#b8130e] text-white hover:bg-[#8f0f0b] font-bold rounded-md transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Imprimir Ticket (Impresora Térmica)
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
                Reclama la tienda que te creó el equipo de Boga: queda asociada a tu cuenta ({user.email}) y nadie más va a poder editarla.
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
                  No hay tiendas sin reclamar. Si el equipo de Boga ya te creó la tuya y no aparece acá, escribile para que la verifique.
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
                      : 'bg-[#b8130e] text-white shadow-lg shadow-[#b8130e]/20 hover:-translate-y-0.5 active:translate-y-0'
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
