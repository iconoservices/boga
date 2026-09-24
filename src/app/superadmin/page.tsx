'use client';

import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';
import { useUsuariosAdmin, ROLES, type UserRow, type UserRole } from './usuarios/useUsuariosAdmin';
import Toggle from '@/components/superadmin/Toggle';
import { type StoreConfig } from '@/lib/stores.config';
import { getTemplate, getDemoProducts, getAllTemplates } from '@/lib/templates.config';
import { useDemo } from '@/context/DemoContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { COLOR_PRESETS, getColorPreset } from '@/lib/colorPresets';
import { extractThemeFromImageClient } from '@/lib/extractThemeClient';
import { uploadFile } from '@/lib/uploadClient';
import { refrescarTienda } from '@/lib/refrescar';
import { useEsSuperadmin } from '@/lib/superadmin';
import type { StoreTheme } from '@/lib/templates.config';

// Correos con acceso al superadmin. A diferencia de /admin (donde cualquier
// cuenta puede entrar y solo ve sus propias tiendas), este panel puede editar
// y borrar CUALQUIER tienda del ecosistema — la lista, no solo estar logueado,
// es lo que decide el acceso. La lista vive en src/lib/superadmin.ts y tiene
// que coincidir con public.is_superadmin() en supabase_setup.sql (RLS).

const META: Record<string, { emoji: string; cat: string }> = {
  sunset:   { emoji: '🥂', cat: 'Bar & Café' },
  delva:    { emoji: '🌿', cat: 'Mercado' },
  natura:   { emoji: '🪴', cat: 'Salud' },
  amazonia: { emoji: '🏺', cat: 'Artesanía' },
  estilosmirka: { emoji: '👗', cat: 'Boutique' },
  sweetkittynails: { emoji: '💅', cat: 'Beauty' },
  menudirecto: { emoji: '🍔', cat: 'Restaurantes' },
  iniciocatalogo: { emoji: '🔥', cat: 'Restaurantes' },
  flores: { emoji: '🌸', cat: 'Comercio' },
};

const CATEGORY_ICONS: Record<string, string> = {
  'Comida': 'restaurant',
  'Bebidas': 'local_bar',
  'Mercado': 'store',
  'Salud': 'vaccines',
  'Moda': 'apparel',
  'Servicios': 'handyman',
  'Combos & Promos': 'local_offer',
  'default': 'category'
};

const STORE_DETAILS: Record<string, { location: string; date: string; icon: string }> = {
  sunset:   { location: 'Buenos Aires, AR', date: '12 Oct 2023', icon: 'storefront' },
  delva:    { location: 'Santiago, CL',     date: '14 Oct 2023', icon: 'shopping_bag' },
  natura:   { location: 'Bogotá, CO',        date: '15 Oct 2023', icon: 'bakery_dining' },
  amazonia: { location: 'Lima, PE',          date: '18 Oct 2023', icon: 'storefront' },
  estilosmirka: { location: 'Madrid, ES',    date: '20 Oct 2023', icon: 'shopping_bag' },
  sweetkittynails: { location: 'CDMX, MX',   date: '22 Oct 2023', icon: 'face' }
};

const NAV = [
  { id: 'tiendas',         icon: 'storefront',    label: 'Tiendas' },
  { id: 'usuarios',        icon: 'group',         label: 'Usuarios' },
] as const;




export default function AdminPage() {
  const { user, signOut } = useAuth();
  const { esSuperadmin: isSuperadmin, cargando: loading } = useEsSuperadmin();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (!isSuperadmin) { router.replace('/admin'); }
  }, [loading, user, isSuperadmin, router]);

  if (loading || !user || !isSuperadmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-2 border-[#c2c6d6] border-t-[#0058be] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <SuperadminDashboard onSignOut={async () => { await signOut(); router.replace('/login'); }} />
    </Suspense>
  );
}

function SuperadminDashboard({ onSignOut }: { onSignOut: () => void }) {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'tiendas' | 'usuarios'>(
    (searchParams.get('tab') as any) || 'tiendas'
  );
  React.useEffect(() => {
    const t = searchParams.get('tab');
    if (t && t !== activeTab) setActiveTab(t as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [search, setSearch] = useState('');
  
  // Lista de plantillas para el selector de "Estructura de Página" del
  // formulario de tienda. La gestión completa (overrides, destacadas, etc.)
  // vive aparte en /superadmin/plantillas — acá solo hace falta id/nombre/
  // categoría/imagen para elegir con cuál arranca una tienda.
  const templatesForStoreForm = React.useMemo(() => {
    const base = getTemplate('default');
    const todas = base ? [base, ...getAllTemplates()] : getAllTemplates();
    return todas.map(t => ({ id: t.id, name: t.name, category: t.category, previewUrl: t.heroImage }));
  }, []);

  // Dynamic stores states
  const [stores, setStores] = useState<Record<string, StoreConfig>>({});
  const [storeDetails, setStoreDetails] = useState<Record<string, { location: string; date: string; icon: string }>>(STORE_DETAILS);
  const [storeMeta, setStoreMeta] = useState<Record<string, { emoji: string; cat: string }>>(META);
  const [storeTiers, setStoreTiers] = useState<Record<string, string>>({
    sunset: 'Professional',
    delva: 'Enterprise Plus',
    natura: 'Basic Tier',
    amazonia: 'Professional',
    estilosmirka: 'Enterprise Plus',
    sweetkittynails: 'Basic Tier'
  });

  const [activeStores, setActiveStores] = useState<Record<string, boolean>>({});
  // id real de fila en Supabase por slug: sin esto, renombrar el slug de una
  // tienda existente no se puede distinguir de crear una tienda nueva (el
  // upsert por slug simplemente insertaria una fila aparte).
  const [storeIds, setStoreIds] = useState<Record<string, string>>({});

  // Solicitudes de negocios (formulario público /vende-con-boga)
  const [storeRequests, setStoreRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);


  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticStore, setDiagnosticStore] = useState<any | null>(null);


  // Borrar tienda: antes era un confirm() nativo, muy facil de tocar sin
  // querer. Ahora hay que escribir BORRAR a mano, como el borrado de un repo
  // en GitHub — la tienda no se va a poder recuperar ni sus productos quedan
  // enlazados a nada despues.
  const [deletingStoreSlug, setDeletingStoreSlug] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingStore, setIsDeletingStore] = useState(false);
  const [deletingStoreProductCount, setDeletingStoreProductCount] = useState(0);

  // Productos por tienda: para poder cargar la carta completa desde acá mismo
  // al crear una tienda, sin depender de /admin (que administra el dueño, no
  // siempre vos).
  const [productsStoreSlug, setProductsStoreSlug] = useState<string | null>(null);
  const [storeProductsList, setStoreProductsList] = useState<any[]>([]);
  const [isLoadingStoreProducts, setIsLoadingStoreProducts] = useState(false);
  const [newStoreProduct, setNewStoreProduct] = useState({ name: '', price: '', category: '', subcategory: '', desc: '' });
  const [newStoreProductFile, setNewStoreProductFile] = useState<File | null>(null);
  const [storeProductPreview, setStoreProductPreview] = useState<string | null>(null);
  const [isSavingStoreProduct, setIsSavingStoreProduct] = useState(false);
  const [deletingStoreProductId, setDeletingStoreProductId] = useState<string | null>(null);
  const [editingStoreProductId, setEditingStoreProductId] = useState<string | null>(null);
  const [showStoreProductForm, setShowStoreProductForm] = useState(false);
  const [storeProductSearch, setStoreProductSearch] = useState('');
  const [subdominioCopiado, setSubdominioCopiado] = useState(false);
  const [refrescandoTodo, setRefrescandoTodo] = useState(false);
  const refrescarTodo = async () => {
    setRefrescandoTodo(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/revalidate-todo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const j = await res.json().catch(() => ({}));
      alert(res.ok
        ? `Caché refrescada (${j.tiendas ?? 0} tiendas). Cloudflare: ${j.cloudflare ? 'borrada' : 'NO se pudo borrar'}.`
        : `No se pudo refrescar: ${j.error || res.status}`);
    } catch (err: any) {
      alert('No se pudo refrescar: ' + err.message);
    } finally {
      setRefrescandoTodo(false);
    }
  };
  const [editingStoreProductImage, setEditingStoreProductImage] = useState<string | null>(null);

  const handleOpenStoreProducts = async (slug: string) => {
    setProductsStoreSlug(slug);
    setEditingStoreProductId(null);
    setEditingStoreProductImage(null);
    setShowStoreProductForm(false);
    setStoreProductSearch('');
    setNewStoreProduct({ name: '', price: '', category: '', subcategory: '', desc: '' });
    setNewStoreProductFile(null);
    setStoreProductPreview(null);
    setIsLoadingStoreProducts(true);
    const { data, error } = await supabase.from('products').select('*').eq('store', slug).order('created_at', { ascending: false });
    setIsLoadingStoreProducts(false);
    if (error) { alert('No se pudieron cargar los productos: ' + error.message); return; }
    setStoreProductsList(data || []);
  };

  const handleStartEditStoreProduct = (p: any) => {
    setShowStoreProductForm(true);
    setEditingStoreProductId(p.id);
    setEditingStoreProductImage(p.image || null);
    setNewStoreProduct({
      name: p.name || '',
      price: String(p.price ?? ''),
      category: p.category || '',
      subcategory: p.subcategory || '',
      desc: p.description || '',
    });
    setNewStoreProductFile(null);
    setStoreProductPreview(p.image || null);
  };

  const handleCancelEditStoreProduct = () => {
    setShowStoreProductForm(false);
    setEditingStoreProductId(null);
    setEditingStoreProductImage(null);
    setNewStoreProduct({ name: '', price: '', category: '', subcategory: '', desc: '' });
    setNewStoreProductFile(null);
    setStoreProductPreview(null);
  };

  const handleAddStoreProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productsStoreSlug) return;
    if (!newStoreProduct.name.trim() || !newStoreProduct.price) {
      alert('Faltan el nombre o el precio.');
      return;
    }
    if (!newStoreProductFile && !editingStoreProductId) {
      alert('Selecciona una foto para el producto.');
      return;
    }
    setIsSavingStoreProduct(true);
    try {
      if (editingStoreProductId) {
        const imageUrl = newStoreProductFile
          ? await uploadFile(newStoreProductFile, `product-images/${productsStoreSlug}`)
          : editingStoreProductImage;
        const cambios = {
          name: newStoreProduct.name.trim(),
          price: parseFloat(newStoreProduct.price) || 0,
          category: newStoreProduct.category || null,
          subcategory: newStoreProduct.subcategory || null,
          image: imageUrl,
          description: newStoreProduct.desc || null,
        };
        const { error } = await supabase.from('products').update(cambios).eq('id', editingStoreProductId);
        if (error) throw error;
        setStoreProductsList(prev => prev.map(p => p.id === editingStoreProductId ? { ...p, ...cambios } : p));
        refrescarTienda(productsStoreSlug);
        handleCancelEditStoreProduct();
        return;
      }
      const imageUrl = await uploadFile(newStoreProductFile!, `product-images/${productsStoreSlug}`);
      const { data, error } = await supabase.from('products').insert([{
        name: newStoreProduct.name.trim(),
        store: productsStoreSlug,
        price: parseFloat(newStoreProduct.price) || 0,
        category: newStoreProduct.category || null,
        subcategory: newStoreProduct.subcategory || null,
        image: imageUrl,
        description: newStoreProduct.desc || null,
        stock: 0,
        status: 'Activo',
      }]).select();
      if (error) throw error;
      setStoreProductsList(prev => [...(data || []), ...prev]);
      refrescarTienda(productsStoreSlug);
      setNewStoreProduct({ name: '', price: '', category: '', subcategory: '', desc: '' });
      setNewStoreProductFile(null);
      setStoreProductPreview(null);
    } catch (err: any) {
      alert('No se pudo guardar el producto: ' + err.message);
    } finally {
      setIsSavingStoreProduct(false);
    }
  };

  const handleDeleteStoreProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    setDeletingStoreProductId(id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    setDeletingStoreProductId(null);
    if (error) { alert('No se pudo eliminar: ' + error.message); return; }
    setStoreProductsList(prev => prev.filter(p => p.id !== id));
    if (productsStoreSlug) refrescarTienda(productsStoreSlug);
    if (editingStoreProductId === id) handleCancelEditStoreProduct();
  };

  // Store modal states
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
  const [previewZoom, setPreviewZoom] = useState(60);
  const [editingStore, setEditingStore] = useState<any | null>(null);
  const [storeForm, setStoreForm] = useState({
    slug: '',
    name: '',
    tagline: '',
    marketplaceCategory: '',
    template: 'default' as any,
    location: '',
    emoji: '🏪',
    tier: 'Basic Tier',
    active: true,
    whatsapp: '',
    zona: '',
    direccion: '',
    horario: '',
    rating: '',
    metodosPago: [] as string[],
    facebook: '',
    instagram: '',
    tiktok: '',
    externalUrl: '',
      subdominioActivo: false,
      pushActivo: false,
    ownerEmail: ''
  });
  // Para saber si storeForm.ownerEmail realmente cambio al guardar (y no
  // reasignar la tienda en cada edicion solo porque el campo llega precargado).
  const [originalOwnerEmail, setOriginalOwnerEmail] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  // null = usar los colores que trae la plantilla elegida (comportamiento de
  // siempre). Con un id de preset, ese color pisa al de la plantilla. 'logo'
  // es un preset dinamico: el color sale de logoTheme, no de COLOR_PRESETS.
  const [colorPreset, setColorPreset] = useState<string | null>(null);
  const [logoTheme, setLogoTheme] = useState<StoreTheme | null>(null);
  const [extractingTheme, setExtractingTheme] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Refleja si la tienda ya tiene cargados los productos demo de su plantilla
  // (se detecta por nombre contra getDemoProducts). El switch inserta/borra.
  const [demoProductsActive, setDemoProductsActive] = useState(false);
  const [demoProductsBusy, setDemoProductsBusy] = useState(false);
  const [demoProductsChecking, setDemoProductsChecking] = useState(false);

  // Send preview updates to iframe in real time
  const sendPreviewUpdate = React.useCallback(() => {
    if (!storeForm.slug) return;
    const templateKey = storeForm.template || 'default';
    const existingStoreObj = stores[storeForm.slug] || {};
    const tpl = getTemplate(templateKey);
    const defaultTheme = {
      primary: '#0058be', onPrimary: '#ffffff', primaryContainer: '#2170e4',
      secondary: '#545f73', secondaryContainer: '#d5e0f8', background: '#f9f9ff',
      surface: '#ffffff', surfaceContainer: '#ecedf7', surfaceContainerLow: '#f2f3fd',
      surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#e6e7f2',
      onBackground: '#191b23', onSurface: '#191b23', onSurfaceVariant: '#424754',
      outlineVariant: '#c2c6d6', fontHeadline: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif", fontLabel: "'Inter', sans-serif",
    };

    // Mismo criterio que al guardar: un preset elegido pisa el color de la
    // plantilla, la tipografia sigue viniendo de la plantilla. Sin esto, el
    // preview de la derecha no reflejaba el preset recien tocado.
    const preset = colorPreset ? getColorPreset(colorPreset) : null;
    const resolvedBaseTheme = preset
      ? {
          ...preset.theme,
          fontHeadline: tpl?.theme.fontHeadline ?? defaultTheme.fontHeadline,
          fontBody: tpl?.theme.fontBody ?? defaultTheme.fontBody,
          fontLabel: tpl?.theme.fontLabel ?? defaultTheme.fontLabel,
        }
      : (tpl?.theme ?? defaultTheme);

    const previewTheme = {
      ...resolvedBaseTheme,
      location: storeForm.location,
      emoji: storeForm.emoji,
      tier: storeForm.tier
    };

    const activePreviewStore = {
      slug: storeForm.slug,
      name: storeForm.name || 'Mi Tienda',
      tagline: storeForm.tagline || '',
      marketplaceCategory: storeForm.marketplaceCategory || 'General',
      template: templateKey,
      heroImage: heroPreview || existingStoreObj.heroImage || tpl?.heroImage || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
      heroAlt: storeForm.name || 'store image',
      logoImage: logoPreview || undefined,
      whatsapp: storeForm.whatsapp || undefined,
      zona: storeForm.zona || undefined,
      direccion: storeForm.direccion || undefined,
      horario: storeForm.horario || undefined,
      rating: storeForm.rating !== '' ? Number(storeForm.rating) : undefined,
      theme: previewTheme,
      categories: existingStoreObj.categories || [
        { name: 'Entradas', icon: 'restaurant', href: '#entradas' },
        { name: 'Platos Fuertes', icon: 'local_bar', href: '#platos' }
      ]
    };

    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'BOGA_STORE_PREVIEW_UPDATE',
        store: activePreviewStore
      }, '*');
    }
  }, [storeForm, stores, logoPreview, heroPreview, colorPreset]);

  React.useEffect(() => {
    sendPreviewUpdate();
  }, [sendPreviewUpdate]);

  const fetchStoreRequests = React.useCallback(async () => {
    setRequestsLoading(true);
    const { data, error } = await supabase
      .from('store_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error && data) setStoreRequests(data);
    setRequestsLoading(false);
  }, []);

  React.useEffect(() => {
    fetchStoreRequests();
  }, [fetchStoreRequests]);

  const handleApproveRequest = (req: any) => {
    setEditingStore(null);
    setSlugManuallyEdited(false);
    setSlugAvailable(null);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(false);
    setStoreForm({
      slug: '',
      name: req.business_name || '',
      tagline: req.description || '',
      marketplaceCategory: req.category || 'Restaurantes',
      template: 'default',
      location: '',
      emoji: '🏪',
      tier: 'Basic Tier',
      active: true,
      // El comercio ya lo dejo en su solicitud (/vende-con-boga): que no lo tenga
      // que volver a escribir.
      whatsapp: req.whatsapp || '',
      zona: '',
      direccion: '',
      horario: '',
      rating: '',
      metodosPago: [],
      facebook: '',
      instagram: '',
      tiktok: '',
      externalUrl: '',
      subdominioActivo: false,
      pushActivo: false,
      // El correo de la solicitud: asi al guardar la tienda ya queda asignada
      // a quien la pidio, sin tener que ir despues a mano a "Usuarios".
      ownerEmail: req.email || '',
    });
    setOriginalOwnerEmail('');
    setShowStoreModal(true);
    supabase.from('store_requests').update({ status: 'approved' }).eq('id', req.id).then(() => {
      setStoreRequests(prev => prev.filter(r => r.id !== req.id));
    });
  };

  const handleRejectRequest = async (req: any) => {
    if (!confirm(`¿Rechazar la solicitud de "${req.business_name}"?`)) return;
    const { error } = await supabase.from('store_requests').update({ status: 'rejected' }).eq('id', req.id);
    if (!error) setStoreRequests(prev => prev.filter(r => r.id !== req.id));
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'BOGA_STORE_PREVIEW_READY') {
        sendPreviewUpdate();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendPreviewUpdate]);

  // Auto-generar slug desde el nombre
  React.useEffect(() => {
    if (!editingStore && !slugManuallyEdited && storeForm.name) {
      const generated = storeForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (generated !== storeForm.slug) {
        setStoreForm(prev => ({ ...prev, slug: generated }));
      }
    }
  }, [storeForm.name, editingStore, slugManuallyEdited]);

  // Verificar disponibilidad del slug. Al editar, el slug propio no cuenta
  // como "ocupado" (es la misma fila) — solo se consulta a Supabase cuando
  // realmente difiere del que tenia la tienda al abrir el editor.
  React.useEffect(() => {
    if (!storeForm.slug || storeForm.slug.length < 2) {
      setSlugAvailable(null);
      setSlugChecking(false);
      return;
    }
    if (editingStore && storeForm.slug === editingStore.slug) {
      setSlugAvailable(true);
      setSlugChecking(false);
      return;
    }
    setSlugChecking(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('stores').select('slug').eq('slug', storeForm.slug).maybeSingle();
      setSlugAvailable(!data);
      setSlugChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [storeForm.slug, editingStore]);

  // Categorias state


  // Usuarios y dueños de tienda: la lógica vive en usuarios/useUsuariosAdmin.tsx (la comparte /superadmin/usuarios).
  const {
    profiles, setProfiles, storeOwners, setStoreOwners, inviteEmail, setInviteEmail, inviteStore, setInviteStore, inviteRole, setInviteRole, inviteSent, setInviteSent, isSendingInvite, setIsSendingInvite, editingUser, setEditingUser, editingUserOriginalStore, setEditingUserOriginalStore, editingUserStores, setEditingUserStores, isCopyingLink, setIsCopyingLink, assignStoreSlug, setAssignStoreSlug, derivedUsers, groupedUsers, expandedUserIds, setExpandedUserIds, toggleExpandedUser, usuariosSinTienda, asignandoExistente, setAsignandoExistente, handleAsignarExistente, asignarTiendaInvitada, handleSendInvite, handleCopyInviteLink, abrirEditorUsuarioMulti, handleSaveUser, handleRevokeAccess, camposInvitacion, avisoInvitacionEnviada,
  } = useUsuariosAdmin({ stores, authUser });


  React.useEffect(() => {
    const fetchDbStores = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*');
          
        if (error) throw error;
        
        if (data) {
          const mergedStores = {} as Record<string, StoreConfig>;
          const mergedDetails = { ...STORE_DETAILS };
          const mergedMeta = { ...META };
          const mergedTiers = {} as Record<string, string>;
          const mergedActive = {} as Record<string, boolean>;
          const mergedIds = {} as Record<string, string>;
          const mergedOwners = {} as Record<string, string | null>;

          data.forEach(dbStore => {
            const slug = dbStore.slug;
            mergedIds[slug] = dbStore.id;
            mergedOwners[slug] = dbStore.user_id || null;
            const dbTheme = dbStore.theme || {};
            const location = dbTheme.location || 'Ecosistema, Global';
            const emoji = dbTheme.emoji || '🏪';
            const tier = dbTheme.tier || 'Basic Tier';

            mergedStores[slug] = {
              slug,
              name: dbStore.name,
              tagline: dbStore.tagline || '',
              marketplaceCategory: dbStore.marketplace_category || 'General',
              template: (dbStore.template || 'default') as any,
              heroImage: dbStore.hero_image || getTemplate(dbStore.template as string)?.heroImage || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
              heroAlt: dbStore.hero_alt || 'store image',
              logoImage: dbStore.logo_image || undefined,
              whatsapp: dbStore.whatsapp || undefined,
              zona: dbStore.zona || undefined,
              direccion: dbStore.direccion || undefined,
              horario: dbStore.horario || undefined,
              rating: dbStore.rating ?? undefined,
              metodosPago: dbStore.metodos_pago || undefined,
              facebook: dbStore.facebook || undefined,
              instagram: dbStore.instagram || undefined,
              tiktok: dbStore.tiktok || undefined,
              externalUrl: dbStore.external_url || undefined,
              subdominioActivo: dbStore.subdominio_activo ?? undefined,
              pushActivo: dbStore.push_activo ?? undefined,
              theme: (() => {
                if (dbStore.theme && Object.keys(dbStore.theme).length > 0) return dbStore.theme;
                const tmpl = dbStore.template as string;
                if (tmpl) { const tt = getTemplate(tmpl); if (tt) return tt.theme; }
                return {
                  primary: '#0058be', onPrimary: '#ffffff', primaryContainer: '#2170e4',
                  secondary: '#545f73', secondaryContainer: '#d5e0f8', background: '#f9f9ff',
                  surface: '#ffffff', surfaceContainer: '#ecedf7', surfaceContainerLow: '#f2f3fd',
                  surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#e6e7f2',
                  onBackground: '#191b23', onSurface: '#191b23', onSurfaceVariant: '#424754',
                  outlineVariant: '#c2c6d6', fontHeadline: "'Inter', sans-serif",
                  fontBody: "'Inter', sans-serif", fontLabel: "'Inter', sans-serif",
                };
              })(),
              categories: dbStore.categories || []
            };

            mergedDetails[slug] = {
              location,
              date: new Date(dbStore.created_at || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
              icon: 'storefront'
            };

            mergedMeta[slug] = {
              emoji,
              cat: dbStore.marketplace_category || 'General'
            };

            mergedTiers[slug] = tier;
            mergedActive[slug] = dbStore.status === 'active';
          });

          setStores(mergedStores);
          setStoreDetails(mergedDetails);
          setStoreMeta(mergedMeta);
          setStoreTiers(mergedTiers);
          setActiveStores(mergedActive);
          setStoreIds(mergedIds);
          setStoreOwners(mergedOwners);
        }
      } catch (err) {
        console.error('Error fetching stores from Supabase:', err);
      }
    };
    
    fetchDbStores();
  }, []);

  const storeList = Object.values(stores);
  const filtered = storeList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = storeList.filter(s => activeStores[s.slug]).length;
  const pausedCount = storeList.length - activeCount;

  // Store Actions
  const handleOpenCreateStore = () => {
    setEditingStore(null);
    setSlugManuallyEdited(false);
    setSlugAvailable(null);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(false);
    setHeroFile(null);
    setHeroPreview(null);
    setColorPreset(null);
    setLogoTheme(null);
    setDemoProductsActive(false);
    setStoreForm({
      slug: '',
      name: '',
      tagline: '',
      marketplaceCategory: 'Restaurantes',
      template: 'default',
      location: '',
      emoji: '🏪',
      tier: 'Basic Tier',
      active: true,
      whatsapp: '',
      zona: '',
      direccion: '',
      horario: '',
      rating: '',
      metodosPago: [],
      facebook: '',
      instagram: '',
      tiktok: '',
      externalUrl: '',
      subdominioActivo: false,
      pushActivo: false,
      ownerEmail: ''
    });
    setOriginalOwnerEmail('');
    setShowStoreModal(true);
  };

  const handleOpenEditStore = (store: any) => {
    const slug = store.slug;
    setEditingStore({ ...store, id: storeIds[slug] });
    setSlugManuallyEdited(true);
    setSlugAvailable(null);
    setLogoFile(null);
    setLogoPreview(store.logoImage || null);
    setLogoRemoved(false);
    setHeroFile(null);
    setHeroPreview(store.heroImage || null);
    // Si el primary guardado matchea un preset conocido, lo pre-selecciona.
    // Si no (viene de la plantilla o de extraccion automatica de imagen), el
    // picker arranca en "colores de la plantilla" para no falsear el origen.
    const matchedPreset = COLOR_PRESETS.find((p) => p.theme.primary === store.theme?.primary);
    setColorPreset(matchedPreset?.id ?? null);
    setLogoTheme(null);
    setStoreForm({
      slug: store.slug,
      name: store.name,
      tagline: store.tagline || '',
      marketplaceCategory: store.marketplaceCategory || 'General',
      template: store.template || 'default',
      location: storeDetails[slug]?.location || '',
      emoji: storeMeta[slug]?.emoji || '🏪',
      tier: storeTiers[slug] || 'Basic Tier',
      active: !!activeStores[slug],
      whatsapp: store.whatsapp || '',
      zona: store.zona || '',
      direccion: store.direccion || '',
      horario: store.horario || '',
      rating: store.rating != null ? String(store.rating) : '',
      metodosPago: store.metodosPago || [],
      facebook: store.facebook || '',
      instagram: store.instagram || '',
      tiktok: store.tiktok || '',
      externalUrl: store.externalUrl || '',
      subdominioActivo: store.subdominioActivo ?? false,
      pushActivo: store.pushActivo ?? false,
      // Sale del dueño actual, no de la tienda. Si lo dejan igual al guardar
      // no se reasigna nada (ver originalOwnerEmail en handleSaveStore).
      ownerEmail: profiles.find((p) => p.id === storeOwners[slug])?.email || ''
    });
    setOriginalOwnerEmail(profiles.find((p) => p.id === storeOwners[slug])?.email || '');
    setShowStoreModal(true);

    // Detecta si esta tienda ya tiene cargados los productos demo de su
    // plantilla actual (match por nombre) para arrancar el switch en la
    // posicion correcta. Mientras no se sabe, el switch queda deshabilitado
    // (si no, un click durante la carga podria insertar demo duplicados en
    // vez de borrar los que ya estaban).
    setDemoProductsActive(false);
    const demoNames = getDemoProducts(store.template || 'default').map(p => p.name);
    if (demoNames.length > 0) {
      setDemoProductsChecking(true);
      supabase
        .from('products')
        .select('name')
        .eq('store', slug)
        .in('name', demoNames)
        .then(({ data, error }) => {
          setDemoProductsChecking(false);
          if (error) { console.error('Error revisando productos demo:', error); return; }
          setDemoProductsActive(!!data && data.length > 0);
        });
    }
  };

  // Preset dinamico: saca la paleta de la imagen que ya cargo el comercio (logo
  // si tiene, si no el banner) en vez de un color fijo elegido a mano.
  const handlePickLogoColor = async () => {
    const imageUrl = logoPreview || heroPreview || getTemplate(storeForm.template as string)?.heroImage;
    if (!imageUrl) {
      alert('Subí un logo o un banner primero para poder sacar sus colores.');
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

  const handleDeleteStore = async (slug: string) => {
    setIsDeletingStore(true);
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('slug', slug);

      if (error) throw error;

      setStores(prev => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      setActiveStores(prev => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      setStoreDetails(prev => { const next = { ...prev }; delete next[slug]; return next; });
      setStoreMeta(prev => { const next = { ...prev }; delete next[slug]; return next; });
      setStoreTiers(prev => { const next = { ...prev }; delete next[slug]; return next; });
      setStoreIds(prev => { const next = { ...prev }; delete next[slug]; return next; });
      setDeletingStoreSlug(null);
      setDeleteConfirmText('');
    } catch (err: any) {
      alert('Error al eliminar tienda de Supabase: ' + err.message);
    } finally {
      setIsDeletingStore(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.slug || !storeForm.name) return;
    if (saving) return;
    setSaving(true);
    
    const slug = storeForm.slug.trim().toLowerCase();
    const templateKey = storeForm.template as string;
    const oldSlug = editingStore?.slug as string | undefined;
    const isRename = !!editingStore && !!oldSlug && oldSlug !== slug;

    // Si se esta renombrando, la fila vieja todavia vive bajo oldSlug: stores[slug]
    // (el slug nuevo) esta vacio hasta que se guarde. Usar editingStore como base
    // evita perder heroImage/categorias que ya tenia la tienda.
    const existingStoreObj = editingStore || stores[slug] || {};
    const tpl = getTemplate(templateKey);
    const defaultTheme = {
      primary: '#0058be', onPrimary: '#ffffff', primaryContainer: '#2170e4',
      secondary: '#545f73', secondaryContainer: '#d5e0f8', background: '#f9f9ff',
      surface: '#ffffff', surfaceContainer: '#ecedf7', surfaceContainerLow: '#f2f3fd',
      surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#e6e7f2',
      onBackground: '#191b23', onSurface: '#191b23', onSurfaceVariant: '#424754',
      outlineVariant: '#c2c6d6', fontHeadline: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif", fontLabel: "'Inter', sans-serif",
    };
    // Con un preset de color elegido (incluido "logo", el extraido de la
    // imagen), sus colores pisan a los de la plantilla; la tipografia sigue
    // viniendo de la plantilla (todavia no es algo que el comercio elija aparte).
    const preset = colorPreset && colorPreset !== 'logo' ? getColorPreset(colorPreset) : null;
    const chosenColors = colorPreset === 'logo' ? logoTheme : preset?.theme;
    const resolvedBaseTheme = chosenColors
      ? {
          ...chosenColors,
          fontHeadline: tpl?.theme.fontHeadline ?? defaultTheme.fontHeadline,
          fontBody: tpl?.theme.fontBody ?? defaultTheme.fontBody,
          fontLabel: tpl?.theme.fontLabel ?? defaultTheme.fontLabel,
        }
      : (tpl?.theme ?? defaultTheme);

    const theme = {
      ...resolvedBaseTheme,
      location: storeForm.location,
      emoji: storeForm.emoji,
      tier: storeForm.tier
    };
    const heroAlt = existingStoreObj.heroAlt || 'store image';
    const categoriesList = existingStoreObj.categories || [];

    // En paralelo: son subidas independientes, esperarlas en fila duplica lo
    // que tarda guardar cuando se cambian logo y portada a la vez.
    const [logoUrl, heroUrl] = await Promise.all([
      logoFile && slug
        ? uploadFile(logoFile, `store-assets/${slug}`).catch((err) => {
            console.error('Error subiendo logo:', err);
            return null;
          })
        : null,
      heroFile && slug
        ? uploadFile(heroFile, `store-assets/${slug}`).catch((err) => {
            console.error('Error subiendo portada:', err);
            return null;
          })
        : null,
    ]);
    const heroImage = heroUrl || existingStoreObj.heroImage || tpl?.heroImage || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80';

    // Si cargaron un correo de dueño nuevo (o distinto al que ya tenia la
    // tienda), lo resuelve con la service_role key -crea la cuenta si no
    // existia- y guarda su id junto con el resto de la tienda en un solo
    // paso. Sin esto, una tienda creada desde superadmin queda sin dueño
    // hasta que alguien vuelva a mano a "Usuarios" a asignarsela (ver
    // handleSendInvite mas arriba).
    const ownerEmailTrim = storeForm.ownerEmail.trim();
    let ownerUserId: string | null = null;
    let ownerInviteLink: string | null = null;
    if (ownerEmailTrim && ownerEmailTrim.toLowerCase() !== originalOwnerEmail.trim().toLowerCase()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/generate-invite-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ email: ownerEmailTrim, redirectTo: `${window.location.origin}/admin` }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo asignar el dueño');
        ownerUserId = data.userId;
        ownerInviteLink = data.link;
      } catch (err: any) {
        setSaving(false);
        alert('No se pudo asignar el dueño: ' + err.message + '\n\nLa tienda todavía no se guardó.');
        return;
      }
    }

    const upsertData: Record<string, any> = {
      slug,
      name: storeForm.name,
      tagline: storeForm.tagline,
      marketplace_category: storeForm.marketplaceCategory,
      template: storeForm.template,
      theme,
      hero_image: heroImage,
      hero_alt: heroAlt,
      categories: categoriesList,
      status: storeForm.active ? 'active' : 'inactive',
      whatsapp: storeForm.whatsapp || null,
      zona: storeForm.zona || null,
      direccion: storeForm.direccion || null,
      horario: storeForm.horario || null,
      rating: storeForm.rating !== '' ? Number(storeForm.rating) : null,
      metodos_pago: storeForm.metodosPago.length ? storeForm.metodosPago : null,
      facebook: storeForm.facebook || null,
      instagram: storeForm.instagram || null,
      tiktok: storeForm.tiktok || null,
      external_url: storeForm.externalUrl || null,
      subdominio_activo: !!storeForm.subdominioActivo,
      push_activo: !!storeForm.pushActivo,
    };
    if (ownerUserId) upsertData.user_id = ownerUserId;
    if (logoUrl) {
      upsertData.logo_image = logoUrl;
    } else if (logoRemoved) {
      upsertData.logo_image = null;
    } else if (editingStore?.logoImage) {
      upsertData.logo_image = editingStore.logoImage;
    }

    try {
      // Editar una tienda existente actualiza por id, no por slug: si se
      // renombra el slug, un upsert por slug no encontraria conflicto y
      // crearia una fila nueva, dejando la vieja huerfana con sus datos.
      // Crear tienda nueva si sigue usando upsert por slug (no hay id todavia).
      const writeStore = () =>
        editingStore?.id
          ? supabase.from('stores').update(upsertData).eq('id', editingStore.id).select('id')
          : supabase.from('stores').upsert(upsertData, { onConflict: 'slug' }).select('id');

      let { error, data: writeData } = await writeStore();

      // Mismo problema que ya paso con `whatsapp` en el panel del cliente: si una
      // columna nueva todavia no existe en la base, reintenta sin ella en vez de
      // perder el guardado completo de la tienda.
      const columnasOpcionales = ['whatsapp', 'zona', 'direccion', 'horario', 'rating', 'show_demo_products', 'metodos_pago', 'facebook', 'instagram', 'tiktok', 'external_url', 'subdominio_activo', 'push_activo'];
      const columnasFaltantes: string[] = [];
      let faltante = columnasOpcionales.find((col) => col in upsertData && new RegExp(col).test(error?.message || ''));
      while (error && faltante) {
        delete upsertData[faltante];
        columnasFaltantes.push(faltante);
        ({ error, data: writeData } = await writeStore());
        faltante = columnasOpcionales.find((col) => col in upsertData && new RegExp(col).test(error?.message || ''));
      }
      if (!error && columnasFaltantes.length) {
        alert(
          `Tienda guardada, pero estos campos todavía no se guardaron: ${columnasFaltantes.join(', ')}.\n\n` +
          'Corré la migración pendiente en el SQL editor de Supabase (ver supabase_setup.sql).'
        );
      }
      if (error) throw error;

      // Si Supabase acepta el request pero RLS bloquea la fila, no devuelve error:
      // simplemente no actualiza (ni crea) nada, y el panel seguiria de largo
      // como si hubiese guardado. Cortar aca y avisar en vez de mentirle al admin.
      if (!writeData || writeData.length === 0) {
        throw new Error(
          'Supabase no devolvió ninguna fila guardada. Probablemente una política de Row Level Security (RLS) de la tabla "stores" está bloqueando el guardado. Revisá las políticas de UPDATE/INSERT en el dashboard de Supabase.'
        );
      }

      // Subdominio propio: si el interruptor cambió, dar de alta / baja
      // <slug>.bogahub.app en Vercel y Cloudflare. No corta el guardado si falla.
      const antesActivo = !!editingStore?.subdominioActivo;
      const cambio = !!storeForm.subdominioActivo !== antesActivo;
      // Si está prendido se sincroniza en cada guardado (es idempotente): así una
      // tienda que quedó "activa" sin DNS —p. ej. porque se marcó antes de que
      // existiera el alta automática— se repara con solo guardarla de nuevo.
      if (cambio || storeForm.subdominioActivo) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('/api/subdominio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
            body: JSON.stringify({ slug, activo: !!storeForm.subdominioActivo }),
          });
          const j = await res.json().catch(() => ({}));
          const detalle = (j.detalle || [j.error]).filter(Boolean).join('\n');
          if (!res.ok) {
            alert(`La tienda se guardó, pero el subdominio NO se pudo ${storeForm.subdominioActivo ? 'activar' : 'desactivar'}:\n${detalle}`);
          } else if (cambio) {
            alert(`Subdominio ${storeForm.subdominioActivo ? 'activado' : 'desactivado'}:\n${detalle}`);
          }
        } catch (err: any) {
          alert('La tienda se guardó, pero falló el aviso del subdominio: ' + err.message);
        }
      }

      // Los productos se enlazan a la tienda por el texto del slug (columna
      // `store`), no por id. Si el slug cambio, hay que migrarlos o quedan
      // apuntando a un slug que ya no existe.
      if (isRename && oldSlug) {
        const { error: productsErr } = await supabase.from('products').update({ store: slug }).eq('store', oldSlug);
        if (productsErr) {
          alert(`Tienda renombrada, pero no se pudieron migrar sus productos: ${productsErr.message}\n\nMigralos a mano cambiando "store" de "${oldSlug}" a "${slug}" en la tabla products.`);
        }
      }

      // Al renombrar, sacar la clave vieja de cada mapa local ademas de poner
      // la nueva: si no, la fila queda duplicada en la UI hasta el proximo fetch.
      const rekey = <T,>(prev: Record<string, T>, value: T): Record<string, T> => {
        const next = { ...prev };
        if (isRename && oldSlug) delete next[oldSlug];
        next[slug] = value;
        return next;
      };

      setStoreDetails(prev => rekey(prev, {
        location: storeForm.location,
        date: editingStore ? (prev[oldSlug || slug]?.date || 'Hoy') : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        icon: 'storefront'
      }));

      setStoreMeta(prev => rekey(prev, {
        emoji: storeForm.emoji,
        cat: storeForm.marketplaceCategory
      }));

      setStoreTiers(prev => rekey(prev, storeForm.tier));

      setActiveStores(prev => rekey(prev, storeForm.active));

      if (ownerUserId) {
        setStoreOwners(prev => rekey(prev, ownerUserId as string));
      }

      if (editingStore?.id) {
        setStoreIds(prev => rekey(prev, editingStore.id));
      }

      setStores(prev => rekey(prev, {
        ...existingStoreObj,
        slug,
        subdominioActivo: !!storeForm.subdominioActivo,
        pushActivo: !!storeForm.pushActivo,
        name: storeForm.name,
        tagline: storeForm.tagline,
        marketplaceCategory: storeForm.marketplaceCategory,
        template: storeForm.template,
        heroImage,
        heroAlt,
        categories: categoriesList,
        logoImage: logoUrl || (logoRemoved ? undefined : existingStoreObj.logoImage),
        theme
      }));

      setShowStoreModal(false);

      if (ownerInviteLink) {
        try {
          await navigator.clipboard.writeText(ownerInviteLink);
          alert(`Tienda guardada y asignada a ${ownerEmailTrim}. Le copiamos un link de acceso al portapapeles — mandaselo por WhatsApp o correo para que entre a /admin.`);
        } catch {
          alert(`Tienda guardada y asignada a ${ownerEmailTrim}. Link de acceso: ${ownerInviteLink}`);
        }
      }
    } catch (err: any) {
      alert('Error al guardar en Supabase: ' + err.message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] flex overflow-hidden font-sans">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0">
        <SuperadminSidebarNav />
        <div className="mt-auto pt-4 border-t border-[#c2c6d6]">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#d5e0f8] flex items-center justify-center overflow-hidden">
              <img alt="User Profile Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDU9XKCXWTp7M3kewaM_tU4kVeCugFygQVD4Zz1MHiIyw1taUJ2eVleztB5DyudNlDge6datbYRc5eznXGt2Z4KMScIdX7bvEugn71EBwzK-KFOgi4ndBRv_yq0LdQ6Ea5qg6yU9KINLaMz6WTMh3E8VPB0jEfVrBHFUcZhA-qZcDcbrPRGuK_N4O-432Lg_lEg1yODht5mWfXymEclUyVr8yVu2_i2MKZvlfaQTulwljWdoHuSlZLU7G0aSgX7HLcHbZJi-HiE-Q"/>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-xs truncate">Admin User</span>
              <span className="text-[10px] text-[#424754] truncate">admin@system.com</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/superadmin/paquetes?nuevo=1')}
            className="w-full py-2.5 px-4 bg-[#0058be] text-white rounded-md font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo Paquete
          </button>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* TopAppBar */}
        <header className="flex justify-between items-center w-full px-6 h-12 bg-[#e1e2ec] border-b border-[#c2c6d6] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0058be] text-[18px]">
              {NAV.find(n => n.id === activeTab)?.icon || 'settings'}
            </span>
            <span className="font-bold text-xs text-[#0058be] uppercase tracking-wide">
              {NAV.find(n => n.id === activeTab)?.label || 'Panel de Administración'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refrescarTodo}
              disabled={refrescandoTodo}
              title="Borra la caché de la app y de Cloudflare. Úsalo después de cambiar datos directo en Supabase."
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#424754] hover:text-[#0058be] hover:bg-white/60 transition-all rounded-md disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${refrescandoTodo ? 'animate-spin' : ''}`}>sync</span>
              {refrescandoTodo ? 'Refrescando…' : 'Refrescar todo'}
            </button>
            <button className="p-1 text-[#424754] hover:bg-[#e1e2ec] hover:opacity-80 transition-all rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </button>
            <button onClick={onSignOut} className="p-1 text-[#424754] hover:bg-[#e1e2ec] hover:text-[#ba1a1a] transition-all rounded-full flex items-center justify-center" title="Salir">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 md:p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6 md:gap-8">
          
          {/* ─── PAQUETES ─── */}

          {/* ─── TIENDAS ─── */}
          {activeTab === 'tiendas' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Heading & CTA */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#191b23] tracking-tight">Gestión de Tiendas</h2>
                  <p className="text-xs text-[#424754]">Monitorea y administra el ecosistema global de comercios.</p>
                </div>
                <button
                  onClick={handleOpenCreateStore}
                  className="bg-[#0058be] hover:bg-[#2170e4] text-white px-4 py-2.5 rounded-md font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                  Registrar Nueva Tienda
                </button>
              </div>

              {/* Solicitudes Pendientes (formulario público /vende-con-boga) */}
              {!requestsLoading && storeRequests.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-amber-200 flex justify-between items-center bg-amber-100/60">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                      Solicitudes Pendientes
                    </span>
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{storeRequests.length}</span>
                  </div>
                  <div className="divide-y divide-amber-200/60">
                    {storeRequests.map((req) => (
                      <div key={req.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#191b23]">{req.business_name} <span className="font-medium text-[#745853]">· {req.category}</span></p>
                          <p className="text-[11px] text-[#424754] mt-0.5">{req.contact_name} · {req.whatsapp}{req.email ? ` · ${req.email}` : ''}</p>
                          {req.description && <p className="text-[11px] text-[#745853] mt-0.5 line-clamp-2">{req.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRejectRequest(req)}
                            className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors active:scale-95"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleApproveRequest(req)}
                            className="bg-[#0058be] hover:bg-[#2170e4] text-white px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors active:scale-95"
                          >
                            Aprobar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Métricas + buscador en una sola fila */}
              <div className="flex flex-col lg:flex-row lg:items-stretch gap-3">
                <div className="grid grid-cols-3 gap-2 lg:flex lg:gap-3 lg:shrink-0">
                  {([
                    ['Total', storeList.length, 'store', 'bg-[#d5e0f8]/40 text-[#0058be]', false],
                    ['Activas', activeCount, 'check_circle', 'bg-emerald-50 text-emerald-700', true],
                    ['En pausa', pausedCount, 'pause_circle', 'bg-red-50 text-red-700', false],
                  ] as const).map(([label, valor, icono, color, relleno]) => (
                    <div key={label} className="bg-white border border-[#c2c6d6] px-3 py-2.5 rounded-md flex items-center gap-2.5 lg:min-w-[132px] hover:border-[#0058be] transition-colors">
                      <div className={`hidden sm:flex w-8 h-8 rounded-full items-center justify-center shrink-0 ${color}`}>
                        <span className="material-symbols-outlined text-[16px]" style={relleno ? { fontVariationSettings: "'FILL' 1" } : {}}>{icono}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-[#424754] uppercase tracking-wider leading-tight">{label}</span>
                        <span className="block text-xl font-bold text-[#191b23] leading-tight">{valor}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex-1 min-w-0 bg-white border border-[#c2c6d6] rounded-md px-4 py-2.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#424754] text-[18px]">search</span>
                  <input
                    placeholder="Buscar tienda por nombre o id..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-semibold text-[#191b23] placeholder-[#c2c6d6]"
                  />
                </div>
              </div>

              {/* Stores Data Table */}
              <div className="bg-white border border-[#c2c6d6] rounded-md overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[#c2c6d6] flex justify-between items-center bg-[#f2f3fd]">
                  <span className="text-xs font-bold text-[#191b23] uppercase tracking-wider">Directorio de Comercios</span>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0058be] inline-block" />
                    <span className="text-[9px] text-[#424754] font-bold uppercase tracking-wider">
                      Modo Administrativo
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-[#ecedf7]">
                        <th className="px-5 py-3 text-[10px] font-bold text-[#424754] uppercase tracking-wider">Nombre de la Tienda</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#424754] uppercase tracking-wider">Categoría</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#424754] uppercase tracking-wider">Ubicación</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#424754] uppercase tracking-wider">Paquete</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#424754] uppercase tracking-wider">Estado</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#424754] uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ecedf7]">
                      {filtered.map((store) => {
                        const meta = storeMeta[store.slug] || { emoji: '🏪', cat: 'Tienda' };
                        const details = storeDetails[store.slug] || { location: '—', date: 'Hoy', icon: 'storefront' };
                        const tier = storeTiers[store.slug] || 'Basic Tier';
                        const storeOn = !!activeStores[store.slug];
                        // El dueño con fila propia en Usuarios: no lo hay si la tienda
                        // está sin asignar o si su user_id sos vos como super admin.
                        const storeAdmin = derivedUsers.find((u) => u.store === store.slug && u.role !== 'super_admin');

                        // Detectar tiendas incompletas
                        const missingFields: { field: string; label: string }[] = [];
                        if (!store.name) missingFields.push({ field: 'name', label: 'Nombre de tienda' });
                        if (!store.slug) missingFields.push({ field: 'slug', label: 'Slug / URL' });
                        if (!store.tagline) missingFields.push({ field: 'tagline', label: 'Frase corta / tagline' });
                        if (!store.marketplaceCategory || store.marketplaceCategory === 'General') missingFields.push({ field: 'categoría', label: 'Categoría en el marketplace' });
                        if (!store.template || store.template === 'default') missingFields.push({ field: 'template', label: 'Plantilla visual (usa default)' });
                        if (details.location === '—') missingFields.push({ field: 'location', label: 'Ubicación / dirección' });
                        const isIncomplete = missingFields.length > 0;

                        let tierBadgeClass = "bg-[#e0e3e5] text-[#444749]";
                        if (tier === 'Enterprise Plus' || tier === 'Enterprise') {
                          tierBadgeClass = "bg-[#d8e3fb] text-[#3c475a]";
                        } else if (tier === 'Professional') {
                          tierBadgeClass = "bg-[#d8e2ff] text-[#004395]";
                        }

                        return (
                          <tr key={store.slug} className={`hover:bg-[#f2f3fd]/40 transition-colors ${isIncomplete ? 'bg-amber-50/40' : ''}`}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 border border-[#c2c6d6]/60 bg-[#f9f9ff]">
                                  {meta.emoji}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-xs text-[#191b23]">{store.name}</p>
                                    {isIncomplete && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDiagnosticStore(store); setShowDiagnosticModal(true); }}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-bold uppercase tracking-wide border border-amber-200 hover:bg-amber-200 transition-colors cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[10px]">warning</span>
                                        Incompleta
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-[#424754] font-semibold tracking-wide">/{store.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs text-[#191b23] font-medium">
                              {store.marketplaceCategory && store.marketplaceCategory !== 'General'
                                ? store.marketplaceCategory
                                : <span className="text-amber-600 italic text-[10px] font-semibold">Sin categoría</span>}
                            </td>
                            <td className="px-5 py-3 text-xs text-[#191b23] font-medium">
                              {details.location !== '—' ? details.location : <span className="text-[#727785] italic text-[10px]">Sin ubicación</span>}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-tight ${tierBadgeClass}`}>
                                {tier}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              {storeOn ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  Activa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                  Pausada
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link 
                                  href={`/${store.slug}`}
                                  target="_blank" 
                                  className="material-symbols-outlined text-[18px] text-[#545f73] hover:text-[#0058be] transition-colors p-1 hover:bg-[#e6e7f2] rounded"
                                  title="Ver Tienda Pública"
                                >
                                  visibility
                                </Link>
                                <button
                                  onClick={() => handleOpenEditStore(store)}
                                  className="material-symbols-outlined text-[18px] text-[#545f73] hover:text-[#0058be] transition-colors p-1 hover:bg-[#e6e7f2] rounded"
                                  title="Editar Tienda"
                                >
                                  edit
                                </button>
                                <button
                                  onClick={() => handleOpenStoreProducts(store.slug)}
                                  className="material-symbols-outlined text-[18px] text-[#545f73] hover:text-[#0058be] transition-colors p-1 hover:bg-[#e6e7f2] rounded"
                                  title="Cargar Productos"
                                >
                                  restaurant_menu
                                </button>
                                <button
                                  onClick={() => {
                                    // Abre el modal de asignar/editar admin sin salir de esta
                                    // pestaña: si ya hay un admin de tienda lo carga para
                                    // editar, si no precarga la invitación con esta tienda.
                                    if (storeAdmin) {
                                      setEditingUser({ ...storeAdmin });
                                      setEditingUserOriginalStore(store.slug);
                                    } else {
                                      setEditingUser(null);
                                      setInviteEmail('');
                                      setInviteSent(false);
                                      setInviteStore(store.slug);
                                      setInviteRole('store_admin');
                                    }
                                    setAssignStoreSlug(store.slug);
                                  }}
                                  className="material-symbols-outlined text-[18px] text-[#545f73] hover:text-[#0058be] transition-colors p-1 hover:bg-[#e6e7f2] rounded"
                                  title={storeAdmin ? 'Editar Administrador' : 'Asignar Administrador'}
                                >
                                  manage_accounts
                                </button>
                                <button
                                  onClick={async () => {
                                    setDeletingStoreSlug(store.slug);
                                    setDeleteConfirmText('');
                                    setDeletingStoreProductCount(0);
                                    const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('store', store.slug);
                                    setDeletingStoreProductCount(count || 0);
                                  }}
                                  className="material-symbols-outlined text-[18px] text-[#545f73] hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                                  title="Eliminar Tienda"
                                >
                                  delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-xs font-semibold text-[#424754] italic">
                            No se encontraron tiendas que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-5 py-3 border-t border-[#c2c6d6] flex justify-between items-center bg-white">
                  <span className="text-[10px] font-bold text-[#424754]">
                    Mostrando {filtered.length} de {storeList.length} tiendas
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="p-1 rounded border border-[#c2c6d6] hover:bg-[#f2f3fd]/50 disabled:opacity-40" disabled>
                      <span className="material-symbols-outlined text-[16px] block">chevron_left</span>
                    </button>
                    <span className="text-[10px] font-bold px-1 text-[#191b23]">
                      Página 1 de 1
                    </span>
                    <button className="p-1 rounded border border-[#c2c6d6] hover:bg-[#f2f3fd]/50 disabled:opacity-40" disabled>
                      <span className="material-symbols-outlined text-[16px] block">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Legend info banner */}
              <div className="flex items-start gap-2 bg-[#f2f3fd]/60 border border-[#c2c6d6]/60 p-3.5 rounded-md">
                <span className="material-symbols-outlined text-[#0058be] text-[16px] mt-0.5">info</span>
                <span className="text-[10px] text-[#424754] font-medium leading-relaxed">
                  <strong>Control Ecosistema:</strong> Puedes cambiar el estado de activación de cada comercio desde el formulario de edición. Las tiendas inactivas/pausadas no se listarán en el portal de Boga Market.
                </span>
              </div>
            </div>
          )}

          {/* ─── USUARIOS ─── */}
          {activeTab === 'usuarios' && (
            <div className="flex flex-col lg:flex-row gap-6 items-start animate-fade-in">
              {/* Left: User Table */}
              <div className="flex-1 w-full min-w-0 space-y-3">
                <p className="text-xs text-[#424754] font-semibold">
                  {derivedUsers.length} usuario{derivedUsers.length !== 1 ? 's' : ''} con acceso al panel
                </p>
                <div className="bg-white rounded-md border border-[#c2c6d6] shadow-sm overflow-hidden">
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }} className="px-4 py-2 bg-[#f2f3fd] border-b border-[#c2c6d6]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Nombre</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Email</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Tienda</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Acceso / Estado</span>
                    <span />
                  </div>
                  {/* Rows — agrupadas por persona: quien administra varias tiendas
                      (vos, el superadmin, o cualquier dueño de multiples locales)
                      sale una sola vez, con la lista de tiendas plegable. */}
                  {groupedUsers.length === 0 && (
                    <div className="px-4 py-8 text-center text-xs text-[#727785] font-semibold italic">
                      Todavía no hay perfiles registrados.
                    </div>
                  )}
                  {groupedUsers.map((g) => {
                    // La fila "super_admin" (store: '') es la cuenta en si, no
                    // una tienda mas — no cuenta para "N tiendas" ni se lista
                    // aparte al expandir.
                    const tiendas = g.filas.filter((f) => f.store);
                    const multi = tiendas.length > 1;
                    const isExpanded = expandedUserIds.has(g.id);
                    const unica = tiendas[0] || g.filas[0];
                    return (
                      <React.Fragment key={g.id}>
                        <div
                          onClick={multi ? () => toggleExpandedUser(g.id) : undefined}
                          style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }}
                          className={`items-center px-4 py-3.5 border-b border-[#ecedf7] last:border-0 transition-colors group ${multi ? 'cursor-pointer' : 'cursor-default'} ${
                            editingUser?.id === g.id && !multi ? 'bg-[#ecedf7]/30' : 'hover:bg-[#f2f3fd]/20'
                          }`}
                        >
                          <p className="font-bold text-xs text-[#191b23] truncate">{g.name}</p>
                          <p className="text-xs text-[#424754] font-semibold truncate">{g.email}</p>
                          <span className="text-xs font-semibold text-[#424754] truncate flex items-center gap-1">
                            {multi ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] text-[#727785]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                {tiendas.length} tiendas
                              </>
                            ) : unica.store ? (
                              stores[unica.store]?.name || unica.store
                            ) : g.role === 'super_admin' ? (
                              <span className="text-[#c2c6d6] italic">Todas (Super)</span>
                            ) : (
                              <span className="text-[#c2c6d6] italic">Sin tienda</span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                              g.role === 'super_admin' ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-[#e6e7f2] text-[#424754] border-[#c2c6d6]'
                            }`}>
                              {g.role === 'super_admin' ? 'Super' : 'Tienda'}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                              g.status === 'activo'
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                : 'border-amber-100 bg-amber-50 text-amber-700'
                            }`}>
                              {g.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!multi && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); abrirEditorUsuarioMulti(unica); }}
                                  className="w-7 h-7 flex items-center justify-center text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded-lg transition-colors"
                                  title="Editar usuario"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRevokeAccess(unica); }}
                                  className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#ba1a1a] hover:bg-red-50 rounded-lg transition-colors"
                                  title="Revocar acceso"
                                >
                                  <span className="material-symbols-outlined text-[15px]">person_remove</span>
                                </button>
                              </>
                            )}
                            {multi && (
                              <button
                                onClick={(e) => { e.stopPropagation(); abrirEditorUsuarioMulti(g.filas[0]); }}
                                className="w-7 h-7 flex items-center justify-center text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded-lg transition-colors"
                                title="Editar tiendas asignadas"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {multi && isExpanded && tiendas.map((u) => (
                          <div
                            key={`${u.id}-${u.store}`}
                            style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }}
                            className={`items-center px-4 py-2.5 border-b border-[#ecedf7] last:border-0 bg-[#f9f9ff] transition-colors group ${
                              editingUser?.id === u.id && editingUserOriginalStore === u.store ? 'bg-[#ecedf7]/30' : 'hover:bg-[#f2f3fd]/40'
                            }`}
                          >
                            <span />
                            <span />
                            <span className="text-xs font-semibold text-[#545f73] truncate pl-1">↳ {stores[u.store]?.name || u.store}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap w-fit ${
                              u.status === 'activo'
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                : 'border-amber-100 bg-amber-50 text-amber-700'
                            }`}>
                              {u.status}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => abrirEditorUsuarioMulti(u)}
                                className="w-7 h-7 flex items-center justify-center text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded-lg transition-colors"
                                title="Editar usuario"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleRevokeAccess(u)}
                                className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#ba1a1a] hover:bg-red-50 rounded-lg transition-colors"
                                title="Revocar acceso"
                              >
                                <span className="material-symbols-outlined text-[15px]">person_remove</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Info strip */}
                <div className="flex items-start gap-3 bg-[#d5e0f8]/30 border border-[#adc6ff] rounded-md p-4">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] shrink-0 mt-0.5">info</span>
                  <p className="text-xs text-[#004395] font-semibold leading-relaxed">
                    Los <strong>Admin de Tienda</strong> solo ven y modifican los productos y la personalización de su tienda asignada. Los <strong>Super Admins</strong> tienen control absoluto sobre todo el ecosistema.
                  </p>
                </div>
              </div>

              {/* Right Panel (Edit / Invite Form) */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white rounded-md border border-[#c2c6d6] shadow-sm overflow-hidden">
                  
                  {/* EDIT USER */}
                  {editingUser ? (
                    <>
                      <div className="px-5 py-4 border-b border-[#c2c6d6] bg-amber-50/50 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-xs text-[#191b23] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-amber-600">manage_accounts</span>
                            Editar Usuario
                          </h3>
                          <p className="text-[10px] text-[#424754] font-semibold mt-0.5 truncate">{editingUser.email}</p>
                        </div>
                        <button onClick={() => setEditingUser(null)} className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#424754] hover:bg-[#ecedf7] rounded-lg transition-colors shrink-0">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Nombre</label>
                          <input
                            type="text" value={editingUser.name}
                            onChange={(e) => setEditingUser(prev => prev ? {...prev, name: e.target.value} : prev)}
                            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] focus:bg-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Rol</label>
                          <select value={editingUser.role} onChange={(e) => setEditingUser(prev => prev ? {...prev, role: e.target.value as any, store: e.target.value === 'super_admin' ? '' : prev.store} : prev)}
                            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors">
                            <option value="store_admin">Admin de Tienda</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                        {editingUser.role === 'store_admin' && (
                          <div>
                            <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">
                              Tiendas Asignadas {editingUserStores.size > 0 && `(${editingUserStores.size})`}
                            </label>
                            <div className="max-h-40 overflow-y-auto bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg divide-y divide-[#e6e7f2]">
                              {Object.values(stores).length === 0 && (
                                <p className="px-3 py-2 text-xs text-[#727785] italic">No hay tiendas creadas todavía.</p>
                              )}
                              {Object.values(stores).map(s => (
                                <label key={s.slug} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#191b23] cursor-pointer hover:bg-white/60 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={editingUserStores.has(s.slug)}
                                    onChange={(e) => setEditingUserStores(prev => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(s.slug); else next.delete(s.slug);
                                      return next;
                                    })}
                                    className="w-3.5 h-3.5 accent-[#0058be]"
                                  />
                                  {s.name}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setEditingUser(null)}
                            className="flex-1 py-2 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs hover:bg-[#e6e7f2] transition-colors">
                            Cancelar
                          </button>
                          <button onClick={handleSaveUser}
                            className="flex-1 py-2 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-md transition-all">
                            <span className="material-symbols-outlined text-[14px]">save</span>
                            Guardar
                          </button>
                        </div>
                      </div>
                    </>
                  ) : inviteSent ? (
                    avisoInvitacionEnviada(
                      inviteRole === 'store_admin' && inviteStore
                        ? `Ya le asignamos "${stores[inviteStore]?.name || inviteStore}". Recibió un correo con un link para entrar directo, sin contraseña.`
                        : 'Recibió un correo con un link para entrar directo, sin contraseña.'
                    )
                  ) : (
                    /* INVITE USER */
                    <>
                      <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd]">
                        <h3 className="font-bold text-xs text-[#191b23] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-[#424754]">person_add</span>
                          Invitar Usuario
                        </h3>
                        <p className="text-[10px] text-[#424754] font-semibold mt-0.5">Otorga credenciales de acceso al dashboard.</p>
                      </div>
                      {camposInvitacion(true)}
                    </>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* ─── PERSONALIZACION ─── */}

        </div>
      </main>
    </div>

    {/* ── ASIGNAR / EDITAR ADMINISTRADOR DE TIENDA (desde Gestión de Tiendas) ── */}
    {assignStoreSlug && (
      <div
        className="fixed inset-0 z-[200] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => { setAssignStoreSlug(null); setEditingUser(null); }}
      >
        <div
          className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {editingUser ? (
            <>
              <div className="px-5 py-4 border-b border-[#c2c6d6] bg-amber-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#191b23] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-amber-600">manage_accounts</span>
                    Administrador de {stores[assignStoreSlug]?.name || assignStoreSlug}
                  </h3>
                  <p className="text-[10px] text-[#424754] font-semibold mt-0.5 truncate">{editingUser.email}</p>
                </div>
                <button
                  onClick={() => { setAssignStoreSlug(null); setEditingUser(null); }}
                  className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#424754] hover:bg-[#ecedf7] rounded-lg transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Nombre</label>
                  <input
                    type="text" value={editingUser.name}
                    onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : prev)}
                    className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] focus:bg-white transition-colors"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { handleRevokeAccess(editingUser); setAssignStoreSlug(null); }}
                    className="flex-1 py-2 bg-red-50 text-[#ba1a1a] rounded-lg font-bold text-xs hover:bg-red-100 transition-colors"
                  >
                    Revocar acceso
                  </button>
                  <button
                    onClick={async () => { await handleSaveUser(); setAssignStoreSlug(null); }}
                    className="flex-1 py-2 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-md transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">save</span>
                    Guardar
                  </button>
                </div>
              </div>
            </>
          ) : inviteSent ? (
            avisoInvitacionEnviada(
              `Cuando entre por primera vez, volvé acá para confirmar que le quedó asignada "${stores[assignStoreSlug]?.name || assignStoreSlug}".`,
              () => { setAssignStoreSlug(null); setInviteSent(false); }
            )
          ) : (
            <>
              <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-[#191b23] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#424754]">person_add</span>
                    Asignar administrador
                  </h3>
                  <p className="text-[10px] text-[#424754] font-semibold mt-0.5">Para {stores[assignStoreSlug]?.name || assignStoreSlug}</p>
                </div>
                <button
                  onClick={() => setAssignStoreSlug(null)}
                  className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#424754] hover:bg-[#ecedf7] rounded-lg transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              {usuariosSinTienda.length > 0 && (
                <div className="px-4 pt-4">
                  <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">
                    O elegí una cuenta que ya existe
                  </label>
                  <div className="flex gap-2">
                    <select
                      value=""
                      onChange={(e) => e.target.value && handleAsignarExistente(e.target.value)}
                      disabled={asignandoExistente}
                      className="flex-1 bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors disabled:opacity-50"
                    >
                      <option value="">Seleccionar cuenta sin tienda...</option>
                      {usuariosSinTienda.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.role === 'super_admin' ? `Tú (Super Admin) — ${u.email}` : `${u.name} — ${u.email}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-[#424754] mt-1.5">Cuentas ya registradas que todavía no administran ninguna tienda.</p>
                </div>
              )}
              <div className="px-4 pb-1 pt-3">
                <div className="border-t border-[#ecedf7] pt-3 text-[10px] font-bold text-[#424754] uppercase tracking-wide text-center">
                  {usuariosSinTienda.length > 0 ? 'O invitar a alguien nuevo' : 'Invitar a alguien nuevo'}
                </div>
              </div>
              {camposInvitacion(false)}
            </>
          )}
        </div>
      </div>
    )}

    {/* ── CREATE / EDIT PACKAGE MODAL ── */}

    {/* ─── WEBARCHITECT-THEMED FULL-SCREEN STORE EDITOR ─── */}
    {showStoreModal && (
      <div className="fixed inset-0 z-[200] flex flex-col bg-[#f2f4f8] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

          {/* Topbar */}
          <header className="h-16 bg-white border-b border-[#ecedf7] flex items-center justify-between px-6 shrink-0 shadow-xs z-10">
            {/* Left: Back Arrow & Titles */}
            <div className="flex items-center gap-4">
              <button onClick={() => setShowStoreModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-[#191b23] hover:bg-[#f2f3fd] transition-colors -ml-2">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div className="border-l border-[#ecedf7] pl-4">
                <h1 className="text-sm font-black text-[#191b23]">Store Customizer</h1>
                <p className="text-[10px] text-[#727785] font-bold mt-0.5">{storeForm.name || 'Store Name'}</p>
              </div>
            </div>

            {/* Center: Device Selector */}
            <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
              <div className="flex gap-1 bg-[#f2f4f8] p-1 rounded-md">
                {[
                  { id: 'desktop', icon: 'desktop_windows' },
                  { id: 'tablet', icon: 'tablet' },
                  { id: 'mobile', icon: 'smartphone' }
                ].map(({ id, icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setPreviewDevice(id as any);
                      if (id === 'mobile') setPreviewZoom(60);
                      if (id === 'tablet') setPreviewZoom(50);
                      if (id === 'desktop') setPreviewZoom(100);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      previewDevice === id
                        ? 'bg-white text-[#0058be] shadow-sm'
                        : 'text-[#727785] hover:text-[#424754]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    <span className="capitalize">{id}</span>
                  </button>
                ))}
              </div>
              
              
              {/* Zoom Controls */}
              {previewDevice !== 'desktop' && (
                <div className="flex gap-1.5 pl-2">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(z => Math.max(20, z - 10))}
                    className="w-8 h-8 rounded-lg text-[#727785] hover:bg-[#f2f3fd] flex items-center justify-center transition-all"
                    title="Zoom Out"
                  >
                    <span className="material-symbols-outlined text-[16px]">remove</span>
                  </button>
                  <div className="w-10 h-8 flex items-center justify-center text-[11px] font-bold text-[#545f73]">
                    {previewZoom}%
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(z => Math.min(150, z + 10))}
                    className="w-8 h-8 rounded-lg text-[#727785] hover:bg-[#f2f3fd] flex items-center justify-center transition-all"
                    title="Zoom In"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right: User actions */}
            <div className="flex items-center gap-4">
              <div className="text-[10px] text-[#545f73] font-bold flex items-center gap-1.5 border-r border-[#ecedf7] pr-4">
                <span className="material-symbols-outlined text-[16px] text-[#727785]">visibility</span>
                Preview
              </div>
              <button
                type="button"
                onClick={() => {
                  const form = document.querySelector('form') as HTMLFormElement | null;
                  if (form && !form.reportValidity()) return;
                  handleSaveStore({ preventDefault: () => {} } as React.FormEvent);
                }}
                disabled={saving}
                className="px-4 py-2 bg-[#0058be] text-white rounded-md font-bold text-xs hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px]">{saving ? 'progress_activity' : 'publish'}</span>
                {saving ? 'Guardando...' : 'Publish Changes'}
              </button>
              <div className="w-8 h-8 rounded-md border border-[#c2c6d6]/60 flex items-center justify-center bg-white cursor-pointer hover:bg-[#f2f3fd] transition-colors text-[#545f73]">
                <span className="material-symbols-outlined text-[18px]">notifications</span>
              </div>
              <div className="w-8 h-8 rounded-md bg-[#0058be]/10 border border-[#0058be]/20 flex items-center justify-center text-xs font-bold text-[#0058be]">
                UA
              </div>
            </div>
          </header>

          {/* Sub-Editor Split Pane */}
          <div className="flex-1 flex flex-row-reverse overflow-hidden min-h-0">
            {/* RIGHT: Live Preview Canvas (Visually on Right due to flex-row-reverse) */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Canvas viewport container */}
              <div className="flex-1 overflow-auto bg-[#f2f4f8] flex justify-center py-6 px-2">
                <div
                  className="transition-all duration-300 origin-top flex-shrink-0"
                  style={{
                    transform: previewDevice === 'desktop' ? 'none' : `scale(${previewZoom / 100})`,
                    width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '390px',
                    height: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '1024px' : '844px',
                  }}
                >
                  {(() => {
                    const templateKey = storeForm.template || 'default';
                    const resolvedBaseTheme =
                      getTemplate(templateKey)?.theme ??
                      {
                        primary: '#0058be', onPrimary: '#ffffff', primaryContainer: '#2170e4',
                        secondary: '#545f73', secondaryContainer: '#d5e0f8', background: '#f9f9ff',
                        surface: '#ffffff', surfaceContainer: '#ecedf7', surfaceContainerLow: '#f2f3fd',
                        surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#e6e7f2',
                        onBackground: '#191b23', onSurface: '#191b23', onSurfaceVariant: '#424754',
                        outlineVariant: '#c2c6d6', fontHeadline: "'Inter', sans-serif",
                        fontBody: "'Inter', sans-serif", fontLabel: "'Inter', sans-serif",
                      };
                    const bg = resolvedBaseTheme.background || '#ffffff';
                    
                    const isDarkColor = (hexColor: string) => {
                      const color = hexColor.replace('#', '');
                      if (color.length === 3) {
                        const r = parseInt(color[0] + color[0], 16);
                        const g = parseInt(color[1] + color[1], 16);
                        const b = parseInt(color[2] + color[2], 16);
                        return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
                      } else if (color.length === 6) {
                        const r = parseInt(color.substring(0, 2), 16);
                        const g = parseInt(color.substring(2, 4), 16);
                        const b = parseInt(color.substring(4, 6), 16);
                        return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
                      }
                      return false;
                    };
                    const isDark = isDarkColor(bg);

                    return (
                      <div
                        className="shadow-2xl overflow-hidden flex flex-col relative w-full h-full mx-auto"
                        style={{
                          backgroundColor: previewDevice === 'mobile' ? bg : '#ffffff',
                          borderRadius: previewDevice === 'mobile' ? '44px' : previewDevice === 'tablet' ? '20px' : '12px',
                          border: previewDevice === 'mobile'
                            ? '14px solid #1a1a1a'
                            : previewDevice === 'tablet'
                            ? '10px solid #2a2a2a'
                            : '1px solid #c2c6d6',
                          boxShadow: previewDevice !== 'desktop'
                            ? '0 0 0 1px #333, 0 30px 60px -10px rgba(0,0,0,0.4)'
                            : '0 8px 32px rgba(0,0,0,0.12)',
                        }}
                      >
                        {/* ── DESKTOP: browser chrome bar ── */}
                        {previewDevice === 'desktop' && (
                          <div className="h-8 bg-[#ecedf7] border-b border-[#c2c6d6] px-4 flex items-center gap-2 select-none shrink-0">
                            <div className="flex gap-1.5 shrink-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                            </div>
                            <div className="flex-1 max-w-md mx-auto bg-white/70 rounded h-5 flex items-center justify-center text-[9px] text-[#545f73] border border-[#c2c6d6]/60">
                              bogamarket.com/{storeForm.slug || 'nueva-tienda'}
                            </div>
                          </div>
                        )}

                        {/* ── TABLET: top status bar ── */}
                        {previewDevice === 'tablet' && (
                          <div className="h-6 bg-[#191b23] text-white/80 px-4 flex items-center justify-between text-[10px] select-none shrink-0 rounded-t-[10px]">
                            <span className="font-semibold text-white">9:41</span>
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[10px] text-white">wifi</span>
                              <span className="text-[9px] font-bold text-white">100%</span>
                              <span className="material-symbols-outlined text-[10px] text-white">battery_full</span>
                            </div>
                          </div>
                        )}

                        {/* ── MOBILE: iPhone 13 Dynamic Island + Status Bar overlay ── */}
                        {previewDevice === 'mobile' && (
                          <>
                            {/* Dynamic Island */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-[90] flex items-center justify-center gap-3 shadow-lg" style={{ boxShadow: '0 0 0 1px #000' }}>
                              <div className="w-2 h-2 rounded-full bg-[#111] border border-[#333]" />
                              <div className="w-10 h-1 bg-[#111] rounded-full" />
                            </div>
                            {/* Status Bar overlay (sits on top of iframe) */}
                            <div className={`absolute top-0 left-0 right-0 h-12 px-7 flex items-end pb-1 justify-between ${isDark ? 'text-white' : 'text-[#191b23]'} text-[10px] font-bold z-[80] pointer-events-none select-none`}>
                              <span className="font-semibold text-[11px]">9:41</span>
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-end gap-[1.5px] h-3">
                                  <div className={`w-[2.5px] h-[4px] ${isDark ? 'bg-white' : 'bg-black'} rounded-sm opacity-40`} />
                                  <div className={`w-[2.5px] h-[6px] ${isDark ? 'bg-white' : 'bg-black'} rounded-sm opacity-60`} />
                                  <div className={`w-[2.5px] h-[8px] ${isDark ? 'bg-white' : 'bg-black'} rounded-sm opacity-80`} />
                                  <div className={`w-[2.5px] h-[10px] ${isDark ? 'bg-white' : 'bg-black'} rounded-sm`} />
                                </div>
                                <span className="text-[9px] font-black">5G</span>
                                <svg width="15" height="12" viewBox="0 0 24 24" fill={isDark ? "white" : "black"} className="opacity-90">
                                  <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.8M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" stroke={isDark ? "white" : "black"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                </svg>
                                <div className={`w-6 h-3 rounded-[3px] border ${isDark ? 'border-white/80' : 'border-black/80'} p-[1.5px] flex items-center relative`}>
                                  <div className={`h-full w-4 ${isDark ? 'bg-white' : 'bg-black'} rounded-[1px]`} />
                                  <div className={`w-[1.5px] h-[5px] ${isDark ? 'bg-white/70' : 'bg-black/70'} absolute -right-[2px] top-1/2 -translate-y-1/2 rounded-r-sm`} />
                                </div>
                              </div>
                            </div>
                            {/* Home Indicator */}
                            <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 ${isDark ? 'bg-white/30' : 'bg-black/30'} rounded-full z-[80] pointer-events-none`} />
                          </>
                        )}

                        {/* ── LIVE PREVIEW IFRAME (fully isolated CSS) ── */}
                        <iframe
                          key={`${storeForm.slug || 'preview'}-${previewDevice}`}
                          src={`/${storeForm.slug || 'default'}?preview=true`}
                          className="flex-1 w-full border-0"
                          style={{
                            marginTop: previewDevice === 'mobile' ? '44px' : 0,
                            marginBottom: previewDevice === 'mobile' ? '20px' : 0,
                            borderRadius: previewDevice === 'mobile' ? '0 0 30px 30px' : previewDevice === 'tablet' ? '0 0 10px 10px' : 0,
                            backgroundColor: bg,
                          }}
                          title={`Preview: ${storeForm.name || 'Tienda'}`}
                          sandbox="allow-scripts allow-same-origin allow-forms"
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* LEFT: Config Panel */}
            <aside className="w-[360px] shrink-0 bg-white border-r border-[#ecedf7] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-[#ecedf7] bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px]">tune</span>
                  <h2 className="font-bold text-sm text-[#191b23]">Configuración</h2>
                </div>
                <p className="text-[10px] text-[#727785] font-bold uppercase tracking-wider mt-0.5">
                  Personaliza cada detalle de tu tienda
                </p>
              </div>

              {/* Form Scroll Container */}
              <form onSubmit={handleSaveStore} className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-between">
                <div className="p-6 space-y-6">
                  
                  {/* COMPLETITUD DE LA TIENDA — calculado en vivo, antes decia "75%" fijo
                      sin importar la tienda. */}
                  <div className="border border-[#ecedf7] bg-[#f8fafc] rounded-lg p-4 shadow-sm">
                    {(() => {
                      const checks = [
                        !!storeForm.name,
                        !!storeForm.slug,
                        !!storeForm.tagline,
                        storeForm.template !== 'default',
                        !!storeForm.whatsapp,
                        !!logoPreview,
                        !!(storeForm.zona || storeForm.direccion),
                      ];
                      const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
                      const faltantes = [
                        !storeForm.tagline && 'un lema',
                        storeForm.template === 'default' && 'una plantilla visual',
                        !storeForm.whatsapp && 'el WhatsApp de pedidos',
                        !logoPreview && 'un logo',
                        !(storeForm.zona || storeForm.direccion) && 'la ficha del local',
                      ].filter(Boolean) as string[];
                      return (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-extrabold text-[#191b23]">Completitud de la Tienda</span>
                            <span className="text-sm font-black text-[#0058be]">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#d5e0f8] rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-[#0058be] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-[#545f73] font-medium leading-relaxed">
                            {faltantes.length === 0 ? 'Todo lo esencial está cargado.' : `Falta: ${faltantes.join(', ')}.`}
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  {/* LOGO Y MARCA */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">auto_awesome</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Logo y Marca</h3>
                    </div>

                    {/* Logo container box */}
                    <div className="border border-[#ecedf7] rounded-lg p-4 bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Vista previa del logo" className="w-16 h-16 rounded-lg object-cover border border-[#c2c6d6]/40 shadow-md" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white border border-[#c2c6d6]/40 flex items-center justify-center text-3xl shadow-md">
                          {storeForm.emoji || '🏪'}
                        </div>
                      )}
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-[#c2c6d6] rounded-md cursor-pointer hover:bg-[#f2f3fd] transition-colors text-xs font-bold text-[#545f73]">
                            <span className="material-symbols-outlined text-[16px]">upload</span>
                            Subir logo
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
                                  setLogoFile(file);
                                  setLogoPreview(URL.createObjectURL(file));
                                  setLogoRemoved(false);
                                }
                              }}
                            />
                          </label>
                          {logoPreview && (
                            <button
                              type="button"
                              onClick={() => { if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview); setLogoFile(null); setLogoPreview(null); setLogoRemoved(true); }}
                              className="p-2 text-[#dc2626] hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Banner / portada — es el fondo del hero de la tienda, sin esto
                        el comercio quedaba pegado a la foto de stock de Unsplash o a
                        la de la plantilla, sin forma de subir la suya. */}
                    <div className="border border-[#ecedf7] rounded-lg p-4 bg-[#f8fafc] flex flex-col gap-3">
                      <div className="w-full h-24 rounded-lg overflow-hidden border border-[#c2c6d6]/40 bg-white">
                        <img
                          src={heroPreview || getTemplate(storeForm.template as string)?.heroImage || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80'}
                          className="w-full h-full object-cover"
                          alt="Banner"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-[#c2c6d6] rounded-md cursor-pointer hover:bg-[#f2f3fd] transition-colors text-xs font-bold text-[#545f73]">
                          <span className="material-symbols-outlined text-[16px]">upload</span>
                          Subir banner
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (heroPreview?.startsWith('blob:')) URL.revokeObjectURL(heroPreview);
                                setHeroFile(file);
                                setHeroPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        {heroFile && (
                          <button
                            type="button"
                            onClick={() => {
                              if (heroPreview?.startsWith('blob:')) URL.revokeObjectURL(heroPreview);
                              setHeroFile(null);
                              setHeroPreview(stores[storeForm.slug]?.heroImage || null);
                            }}
                            className="p-2 text-[#dc2626] hover:bg-red-50 rounded-lg transition-colors"
                            title="Deshacer"
                          >
                            <span className="material-symbols-outlined text-[16px]">undo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Nombre de la Tienda</label>
                        <input
                          type="text"
                          required
                          value={storeForm.name}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] focus:bg-white transition-all shadow-xs"
                          placeholder="Nombre comercial"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Lema / Subtítulo</label>
                        <input
                          type="text"
                          value={storeForm.tagline}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, tagline: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] focus:bg-white transition-all shadow-xs"
                          placeholder="Lema de tu tienda"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Enlace Personalizado (Slug)</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={storeForm.slug}
                            onChange={(e) => { setSlugManuallyEdited(true); setStoreForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })); }}
                            className={`w-full bg-[#f8fafc] border rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:bg-white transition-all shadow-xs pr-8 ${
                              slugChecking ? 'border-[#c2c6d6]' :
                              slugAvailable === null ? 'border-[#ecedf7]' :
                              slugAvailable ? 'border-[#16a34a]' : 'border-[#dc2626]'
                            }`}
                            placeholder="enlace-tienda"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            {slugChecking ? (
                              <span className="material-symbols-outlined text-[16px] text-[#727785] animate-spin">sync</span>
                            ) : slugAvailable === true ? (
                              <span className="material-symbols-outlined text-[16px] text-[#16a34a]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            ) : slugAvailable === false ? (
                              <span className="material-symbols-outlined text-[16px] text-[#dc2626]" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                            ) : null}
                          </span>
                        </div>
                        {slugAvailable === false && (
                          <p className="text-[10px] font-bold text-[#dc2626] mt-1">Este enlace ya está en uso</p>
                        )}
                        {slugAvailable === true && (
                          <p className="text-[10px] font-bold text-[#16a34a] mt-1">Disponible</p>
                        )}
                        {editingStore && storeForm.slug !== editingStore.slug && slugAvailable === true && (
                          <p className="text-[10px] font-bold text-amber-600 mt-1">
                            Vas a renombrar /{editingStore.slug} → /{storeForm.slug}. Los links viejos con el slug anterior dejan de funcionar.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Correo del Dueño (Opcional)</label>
                        <input
                          type="email"
                          value={storeForm.ownerEmail}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, ownerEmail: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                          placeholder="dueño@negocio.com"
                        />
                        <p className="text-[10px] text-[#727785] font-semibold mt-1">
                          {storeForm.ownerEmail.trim() && storeForm.ownerEmail.trim().toLowerCase() !== originalOwnerEmail.trim().toLowerCase()
                            ? 'Al guardar: si el correo no tiene cuenta, se crea sola. Te copiamos un link de acceso para mandarle.'
                            : 'Si lo dejás vacío, la tienda queda sin dueño (solo vos la ves en /superadmin) hasta que se la asignes después.'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* PALETA DE COLORES — un preset con nombre pisa el color de la
                      plantilla elegida abajo (la tipografia sigue viniendo de la
                      plantilla). "Colores de la plantilla" deja el comportamiento
                      de siempre para quien no quiere elegir nada. */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">palette</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Paleta de Colores</h3>
                    </div>
                    <p className="text-[10px] text-[#727785] font-semibold -mt-2">
                      Elegí un color por rubro, o dejá los de la plantilla elegida en "Estructura de Página".
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setColorPreset(null)}
                        className={`flex flex-col items-center gap-1.5 group`}
                        title="Usar los colores de la plantilla"
                      >
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                            colorPreset === null ? 'ring-2 ring-offset-2 ring-[#0058be]' : 'hover:scale-105'
                          }`}
                          style={{ borderColor: '#c2c6d6', background: `conic-gradient(from 0deg, ${getTemplate(storeForm.template as string)?.theme.primary || '#0058be'}, ${getTemplate(storeForm.template as string)?.theme.secondary || '#545f73'})` }}
                        >
                          {colorPreset === null && <span className="material-symbols-outlined text-white text-[16px] drop-shadow">check</span>}
                        </div>
                        <span className="text-[8px] font-bold text-[#727785] uppercase tracking-wide">Plantilla</span>
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
                              colorPreset === p.id ? 'ring-2 ring-offset-2 ring-[#0058be]' : 'border-[#ecedf7] hover:scale-105'
                            }`}
                            style={{ background: p.swatch, borderColor: colorPreset === p.id ? p.swatch : '#ecedf7' }}
                          >
                            {colorPreset === p.id && <span className="material-symbols-outlined text-white text-[16px] drop-shadow">check</span>}
                          </div>
                          <span className="text-[8px] font-bold text-[#727785] uppercase tracking-wide">{p.name}</span>
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={handlePickLogoColor}
                        disabled={extractingTheme}
                        className="flex flex-col items-center gap-1.5 disabled:opacity-60"
                        title="Sacar los colores del logo o banner ya cargado"
                      >
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all bg-[conic-gradient(from_180deg,#f43f5e,#f59e0b,#22c55e,#3b82f6,#a855f7,#f43f5e)] ${
                            colorPreset === 'logo' ? 'ring-2 ring-offset-2 ring-[#0058be]' : 'border-[#ecedf7] hover:scale-105'
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
                        <span className="text-[8px] font-bold text-[#727785] uppercase tracking-wide">Del logo</span>
                      </button>
                    </div>
                  </section>

                  {/* TIPOGRAFÍA — igual que arriba, de solo lectura: es la que trae la
                      plantilla. Antes "Inter" salia siempre marcada como seleccionada y
                      "Playfair Display" siempre sin marcar, sin ningun onClick real. */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">font_download</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Tipografía</h3>
                    </div>
                    {(() => {
                      const tplTheme = getTemplate(storeForm.template as string)?.theme;
                      const headline = (tplTheme?.fontHeadline || "'Inter', sans-serif").replace(/['"]/g, '').split(',')[0];
                      const body = (tplTheme?.fontBody || "'Inter', sans-serif").replace(/['"]/g, '').split(',')[0];
                      return (
                        <div className="p-3 rounded-lg border-2 border-[#0058be] bg-[#0058be]/5">
                          <h4 className="text-xs font-bold text-[#191b23]">{headline}{body !== headline ? ` / ${body}` : ''}</h4>
                          <p className="text-[9px] font-semibold text-[#727785] mt-0.5">De la plantilla — elegir tipografía por tienda todavía no existe.</p>
                        </div>
                      );
                    })()}
                  </section>

                  {/* ESTRUCTURA DE PÁGINA (PLANTILLAS ORIGINALES) */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">dashboard</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Estructura de Página</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {templatesForStoreForm.map((t) => {
                        const isSelected = storeForm.template === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setStoreForm(prev => ({ ...prev, template: t.id as any }))}
                            className={`rounded-lg overflow-hidden border-2 cursor-pointer transition-all flex flex-col ${
                              isSelected
                                ? 'border-[#0058be] bg-[#0058be]/5 ring-2 ring-[#0058be]/10 shadow-xs'
                                : 'border-[#ecedf7] hover:border-[#0058be]/30 bg-white'
                            }`}
                          >
                            <img src={t.previewUrl} alt={t.name} className="w-full h-16 object-cover border-b border-[#ecedf7]" />
                            <div className="p-2 flex flex-col justify-between flex-1">
                              <span className="text-[9px] font-bold text-[#191b23] line-clamp-1">{t.name}</span>
                              <span className="text-[7px] text-[#727785] font-bold uppercase mt-0.5 tracking-wider">{t.category}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* INFO COMERCIAL */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">store</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Info Comercial</h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Categoría del Portal</label>
                        <select
                          value={storeForm.marketplaceCategory}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, marketplaceCategory: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                        >
                          <option value="Restaurantes">Restaurantes</option>
                          <option value="Mercado">Mercado</option>
                          <option value="Salud y Bienestar">Salud y Bienestar</option>
                          <option value="Moda y Belleza">Moda y Belleza</option>
                          <option value="Moda">Moda</option>
                          <option value="Servicios">Servicios</option>
                          <option value="Tecnología">Tecnología</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Ubicación (interna)</label>
                        <input
                          type="text"
                          value={storeForm.location}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                          placeholder="Ej: Bogotá, CO"
                        />
                        <p className="text-[9px] text-[#727785] font-semibold mt-1">Solo para vos, uso interno del ecosistema. No aparece en el sitio público de la tienda.</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">WhatsApp de Pedidos</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={storeForm.whatsapp}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                          placeholder="51987654321"
                        />
                        <p className="text-[9px] text-[#727785] font-semibold mt-1">Con código de país y sin espacios. El cliente puede cambiarlo despues desde su propio panel.</p>
                        {!storeForm.whatsapp && (
                          <p className="text-[10px] text-[#dc2626] font-bold mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
                            Sin esto, el botón de pedir de la tienda no le llega a nadie.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Link externo (opcional)</label>
                        <input
                          type="url"
                          value={storeForm.externalUrl}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, externalUrl: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                          placeholder="https://mitienda.vercel.app"
                        />
                        <p className="text-[9px] text-[#727785] font-semibold mt-1">
                          Para negocios que ya tienen su propia página armada. Si lo cargás, los links a esta tienda en todo el marketplace mandan ahí en vez de a la página de BogaHub.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Métodos de Pago que Acepta</label>
                        <div className="flex flex-wrap gap-2">
                          {['Efectivo', 'Yape/Plin', 'Transferencia', 'Visa', 'Mastercard'].map((metodo) => {
                            const activo = storeForm.metodosPago.includes(metodo);
                            return (
                              <button
                                key={metodo}
                                type="button"
                                onClick={() => setStoreForm(prev => ({
                                  ...prev,
                                  metodosPago: activo
                                    ? prev.metodosPago.filter((m) => m !== metodo)
                                    : [...prev.metodosPago, metodo],
                                }))}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                                  activo ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-[#f8fafc] text-[#545f73] border-[#ecedf7]'
                                }`}
                              >
                                {metodo}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-[#727785] font-semibold mt-1">Informativo: se muestra en la ficha de la tienda (solo en las plantillas que lo soportan). Si no elegís ninguno, se muestra solo Efectivo. Ningún pago se procesa en la app.</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Paquete Comercial</label>
                        <select
                          value={storeForm.tier}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, tier: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                        >
                          <option value="Basic Tier">Basic Tier</option>
                          <option value="Professional">Professional</option>
                          <option value="Enterprise Plus">Enterprise Plus</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-[#f2f3fd] rounded-lg border border-[#c2c6d6]/60">
                        <span className="text-xs font-bold text-[#424754]">¿Tienda Activa?</span>
                        <Toggle on={storeForm.active} onChange={() => setStoreForm(prev => ({ ...prev, active: !prev.active }))} />
                      </div>
                    </div>
                  </section>

                  {/* FICHA DEL LOCAL: publica, opcional. No confundir con "Ubicación (interna)" de
                      arriba, que es solo para el directorio del ecosistema. */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">location_on</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Ficha del Local (Opcional)</h3>
                    </div>
                    <p className="text-[10px] text-[#727785] font-semibold -mt-2">
                      Se ve en el sitio público de la tienda. Si no tiene local a la calle, dejalo vacío.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Zona / Distrito</label>
                        <input
                          type="text"
                          value={storeForm.zona}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, zona: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                          placeholder="Ej: Miraflores"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Calificación</label>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          step={0.1}
                          value={storeForm.rating}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, rating: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                          placeholder="Ej: 4.8"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Horario de Atención</label>
                      <input
                        type="text"
                        value={storeForm.horario}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, horario: e.target.value }))}
                        className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                        placeholder="Ej: Lun a Dom, 12pm - 11pm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Dirección Completa</label>
                      <input
                        type="text"
                        value={storeForm.direccion}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, direccion: e.target.value }))}
                        className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                        placeholder="Ej: Av. Larco 123, Miraflores, Lima"
                      />
                    </div>
                  </section>

                  {/* REDES SOCIALES: opcional, se muestran como links en la ficha publica */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">share</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Redes Sociales (Opcional)</h3>
                    </div>
                    <p className="text-[10px] text-[#727785] font-semibold -mt-2">
                      Pegá el link completo del perfil. Si dejás uno vacío, no se muestra.
                    </p>

                    <div>
                      <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Facebook</label>
                      <input
                        type="url"
                        value={storeForm.facebook}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, facebook: e.target.value }))}
                        className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                        placeholder="https://facebook.com/tu-negocio"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Instagram</label>
                      <input
                        type="url"
                        value={storeForm.instagram}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, instagram: e.target.value }))}
                        className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                        placeholder="https://instagram.com/tu-negocio"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">TikTok</label>
                      <input
                        type="url"
                        value={storeForm.tiktok}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, tiktok: e.target.value }))}
                        className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                        placeholder="https://tiktok.com/@tu-negocio"
                      />
                    </div>
                  </section>

                  <section className="p-4 bg-[#f0f7ff] rounded-lg border border-[#0058be]/20">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!storeForm.subdominioActivo}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, subdominioActivo: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-[#0058be]"
                      />
                      <span>
                        <span className="block text-xs font-black text-[#191b23]">Subdominio propio (plan de pago)</span>
                        <span className="block text-[10px] text-[#727785] font-semibold mt-0.5">
                          Activa <strong>{storeForm.slug || 'tu-tienda'}.bogahub.app</strong>. Apagado, esa dirección redirige a bogahub.app/{storeForm.slug || 'tu-tienda'}.
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `https://${storeForm.slug || 'tu-tienda'}.bogahub.app`;
                        navigator.clipboard?.writeText(url).then(() => {
                          setSubdominioCopiado(true);
                          setTimeout(() => setSubdominioCopiado(false), 1800);
                        });
                      }}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#0058be]/30 text-[#0058be] rounded-md font-bold text-[11px] hover:bg-[#f2f3fd] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">{subdominioCopiado ? 'check' : 'content_copy'}</span>
                      {subdominioCopiado ? 'Link copiado' : 'Copiar link'}
                    </button>
                  </section>

                  <section className="p-4 bg-[#f0f7ff] rounded-lg border border-[#0058be]/20">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!storeForm.pushActivo}
                        onChange={(e) => setStoreForm(prev => ({ ...prev, pushActivo: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-[#0058be]"
                      />
                      <span>
                        <span className="block text-xs font-black text-[#191b23]">Avisos push propios</span>
                        <span className="block text-[10px] text-[#727785] font-semibold mt-0.5">
                          Deja que esta tienda envíe notificaciones a quienes instalen su app (solo en su subdominio propio). 1 campaña por semana.
                        </span>
                      </span>
                    </label>
                  </section>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-[#ecedf7] bg-white shrink-0 space-y-2">
                  <div className="flex items-center justify-between p-3.5 bg-[#f0f7ff] rounded-lg border border-[#0058be]/20">
                    <div>
                      <span className="text-xs font-bold text-[#0058be] block">Productos Demo</span>
                      <span className="text-[10px] text-[#545f73] font-semibold">
                        {demoProductsChecking ? 'Comprobando…' : demoProductsActive ? 'Cargados en la tienda' : 'Sin cargar'}
                      </span>
                    </div>
                    <Toggle
                      on={demoProductsActive}
                      onChange={() => {
                        if (!storeForm.slug) { alert('Primero ingresa el nombre de la tienda'); return; }
                        if (demoProductsBusy || demoProductsChecking) return;
                        const demo = getDemoProducts(storeForm.template as string);
                        if (demo.length === 0) return;

                        if (!demoProductsActive) {
                          setDemoProductsBusy(true);
                          supabase.from('products').insert(
                            demo.map(p => ({
                              name: p.name,
                              price: p.price,
                              category: p.category,
                              subcategory: p.subcategory || null,
                              image: p.image,
                              description: p.description || null,
                              store: storeForm.slug,
                              stock: 0,
                              status: 'Activo',
                            }))
                          ).then(({ error }) => {
                            setDemoProductsBusy(false);
                            if (error) { alert('Error: ' + error.message); return; }
                            setDemoProductsActive(true);
                          });
                        } else {
                          if (!confirm('¿Quitar los productos demo de esta tienda?')) return;
                          setDemoProductsBusy(true);
                          supabase
                            .from('products')
                            .delete()
                            .eq('store', storeForm.slug)
                            .in('name', demo.map(p => p.name))
                            .then(({ error }) => {
                              setDemoProductsBusy(false);
                              if (error) { alert('Error: ' + error.message); return; }
                              setDemoProductsActive(false);
                            });
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={demoProductsBusy}
                    onClick={() => {
                      if (!storeForm.slug) { alert('Primero ingresa el nombre de la tienda'); return; }
                      if (!confirm('¿Borrar todos los productos demo de esta tienda (de cualquier plantilla)? Los productos reales no se tocan.')) return;
                      // Borra por nombre contra el demo set de TODAS las plantillas, no
                      // solo la actual: cubre el caso de haber insertado demo con una
                      // plantilla y despues cambiado a otra.
                      const allDemoNames = Array.from(new Set(
                        ['default', ...getAllTemplates().map(t => t.id)].flatMap(id => getDemoProducts(id).map(p => p.name))
                      ));
                      setDemoProductsBusy(true);
                      supabase
                        .from('products')
                        .delete()
                        .eq('store', storeForm.slug)
                        .in('name', allDemoNames)
                        .then(({ error }) => {
                          setDemoProductsBusy(false);
                          if (error) { alert('Error: ' + error.message); return; }
                          setDemoProductsActive(false);
                        });
                    }}
                    className="w-full py-2 text-[10px] font-bold text-[#a33] hover:underline disabled:opacity-50"
                  >
                    Borrar todos los productos demo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Restablecer todos los campos a sus valores por defecto? Se perderán los cambios no guardados.')) {
                        setStoreForm({
                          slug: editingStore ? storeForm.slug : '',
                          name: '',
                          tagline: '',
                          marketplaceCategory: 'Restaurantes',
                          template: 'default',
                          location: '',
                          emoji: '🏪',
                          tier: 'Basic Tier',
                          active: true,
                          whatsapp: '',
                          zona: '',
                          direccion: '',
                          horario: '',
                          rating: '',
                          metodosPago: [],
                          facebook: '',
                          instagram: '',
                          tiktok: '',
                          externalUrl: '',
      subdominioActivo: false,
      pushActivo: false,
                          ownerEmail: ''
                        });
                        setOriginalOwnerEmail('');
                        if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
                        setLogoFile(null);
                        setLogoPreview(null);
                        setLogoRemoved(false);
                        if (heroPreview?.startsWith('blob:')) URL.revokeObjectURL(heroPreview);
                        setHeroFile(null);
                        setHeroPreview(null);
                        setColorPreset(null);
                        setLogoTheme(null);
                      }
                    }}
                    className="w-full py-3 bg-white border border-[#c2c6d6] text-[#191b23] rounded-md font-bold text-xs hover:bg-[#f8fafc] hover:border-[#191b23] transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                    Restablecer valores por defecto
                  </button>
                </div>
              </form>
            </aside>
          </div>
        </div>
    )}

    {/* ── DIAGNÓSTICO DE TIENDA ── */}
    {/* ── BORRAR TIENDA: hay que escribir BORRAR, un confirm() nativo era muy facil de tocar sin querer ── */}
    {deletingStoreSlug && (() => {
      const targetStore = stores[deletingStoreSlug];
      const productCount = deletingStoreProductCount;
      return (
        <div className="fixed inset-0 z-[210] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[420px] max-w-[420px] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#c2c6d6] bg-red-50 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 text-base">warning</span>
              <h3 className="font-bold text-sm text-[#191b23]">Eliminar tienda</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-[#191b23] font-medium">
                Vas a eliminar <strong>{targetStore?.name || deletingStoreSlug}</strong> (/{deletingStoreSlug}) para siempre. No se puede deshacer.
              </p>
              {productCount > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  Tiene {productCount} {productCount === 1 ? 'producto cargado' : 'productos cargados'}. La tienda se borra, pero esos productos quedan huérfanos en la base (no se borran solos).
                </p>
              )}
              <div>
                <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">
                  Escribí BORRAR para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-red-500 transition-all"
                  placeholder="BORRAR"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#c2c6d6] flex justify-end gap-2 bg-[#f9f9ff]">
              <button
                onClick={() => { setDeletingStoreSlug(null); setDeleteConfirmText(''); }}
                className="px-4 py-2 rounded-md font-bold text-xs text-[#424754] hover:bg-[#e6e7f2] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteStore(deletingStoreSlug)}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'BORRAR' || isDeletingStore}
                className="px-4 py-2 bg-red-600 text-white rounded-md font-bold text-xs hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletingStore ? 'Eliminando…' : 'Eliminar para siempre'}
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* ── PRODUCTOS DE LA TIENDA: cargar la carta desde superadmin, sin pasar por /admin ── */}
    {productsStoreSlug && (
      <div className="fixed inset-0 z-[200] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[640px] max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-sm text-[#191b23]">Productos de {stores[productsStoreSlug]?.name || productsStoreSlug}</h3>
              <p className="text-[10px] text-[#727785] font-semibold">/{productsStoreSlug}</p>
            </div>
            <button
              onClick={() => setProductsStoreSlug(null)}
              className="w-7 h-7 flex items-center justify-center text-[#424754] hover:bg-[#e6e7f2] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-5">
            {/* Formulario para agregar / editar: cerrado hasta tocar el botón */}
            <div className="flex items-center gap-2">
              {!showStoreProductForm && (
                <button
                  type="button"
                  onClick={() => setShowStoreProductForm(true)}
                  className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] transition-colors"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Agregar producto
                </button>
              )}
              <div className="relative flex-1">
                <span className="material-symbols-outlined text-[16px] text-[#727785] absolute left-2.5 top-1/2 -translate-y-1/2">search</span>
                <input
                  type="search"
                  value={storeProductSearch}
                  onChange={(e) => setStoreProductSearch(e.target.value)}
                  placeholder="Buscar en la carta…"
                  className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md pl-8 pr-3 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                />
              </div>
            </div>
            {showStoreProductForm && (
            <form onSubmit={handleAddStoreProduct} className="space-y-3 pb-4 border-b border-[#ecedf7]">
              <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">{editingStoreProductId ? 'Editando producto' : 'Nuevo Producto'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#545f73] mb-1">Nombre</label>
                  <input
                    type="text" required
                    value={newStoreProduct.name}
                    onChange={(e) => setNewStoreProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                    placeholder="Ej: Cholao Original"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#545f73] mb-1">Precio (S/)</label>
                  <input
                    type="number" required min={0} step={0.1}
                    value={newStoreProduct.price}
                    onChange={(e) => setNewStoreProduct(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#545f73] mb-1">Categoría</label>
                  <select
                    value={newStoreProduct.category}
                    onChange={(e) => setNewStoreProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all appearance-none"
                  >
                    <option value="">Sin categoría</option>
                    {(stores[productsStoreSlug]?.categories || []).map((c) => (
                      <option key={c.href} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#545f73] mb-1">Sección (opcional)</label>
                  <input
                    type="text"
                    value={newStoreProduct.subcategory}
                    onChange={(e) => setNewStoreProduct(prev => ({ ...prev, subcategory: e.target.value }))}
                    className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                    placeholder="Ej: Entradas"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#545f73] mb-1">Descripción (opcional)</label>
                <textarea
                  value={newStoreProduct.desc}
                  onChange={(e) => setNewStoreProduct(prev => ({ ...prev, desc: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-medium text-[#191b23] outline-none focus:border-[#0058be] transition-all resize-none"
                  placeholder="Ingredientes, tamaño, etc."
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-[#c2c6d6] flex items-center justify-center cursor-pointer hover:bg-[#f2f3fd]/60 transition-colors overflow-hidden bg-[#f8fafc]">
                  {storeProductPreview ? (
                    <img src={storeProductPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[#727785] text-[20px]">add_a_photo</span>
                  )}
                  <input
                    type="file" accept="image/*" className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setNewStoreProductFile(file);
                      setStoreProductPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
                <p className="text-[10px] text-[#727785] font-semibold flex-1">{editingStoreProductId ? 'Toca la foto para cambiarla (opcional).' : 'Foto del producto (obligatoria).'}</p>
                {(
                  <button
                    type="button"
                    onClick={handleCancelEditStoreProduct}
                    className="px-3 py-2.5 border border-[#c2c6d6] text-[#424754] rounded-md font-bold text-xs hover:bg-[#f2f3fd] transition-colors shrink-0"
                  >
                    {editingStoreProductId ? 'Cancelar' : 'Cerrar'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingStoreProduct}
                  className="px-4 py-2.5 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] transition-colors disabled:opacity-50 shrink-0"
                >
                  {isSavingStoreProduct ? 'Guardando…' : editingStoreProductId ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
            )}

            {/* Lista de productos ya cargados */}
            <div>
              <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest mb-2">
                Carta actual ({storeProductsList.length})
              </p>
              {isLoadingStoreProducts ? (
                <p className="text-xs text-[#727785] italic py-4 text-center">Cargando…</p>
              ) : storeProductsList.length === 0 ? (
                <p className="text-xs text-[#727785] italic py-4 text-center">Todavía no hay productos cargados.</p>
              ) : (
                <div className="space-y-1.5">
                  {storeProductsList.filter((p) => {
                    const q = storeProductSearch.trim().toLowerCase();
                    return !q || `${p.name} ${p.category || ''} ${p.subcategory || ''}`.toLowerCase().includes(q);
                  }).map((p) => (
                    <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg border bg-[#f9f9ff] ${editingStoreProductId === p.id ? 'border-[#0058be]' : 'border-[#ecedf7]'}`}>
                      <img src={p.image} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 bg-[#e6e7f2]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#191b23] truncate">{p.name}</p>
                        <p className="text-[10px] text-[#727785] font-semibold">
                          S/ {Number(p.price).toFixed(2)}{p.category ? ` · ${p.category}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleStartEditStoreProduct(p)}
                        className="material-symbols-outlined text-[16px] text-[#727785] hover:text-[#0058be] transition-colors p-1 hover:bg-blue-50 rounded shrink-0"
                        title="Editar"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => handleDeleteStoreProduct(p.id)}
                        disabled={deletingStoreProductId === p.id}
                        className="material-symbols-outlined text-[16px] text-[#727785] hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded shrink-0"
                        title="Eliminar"
                      >
                        delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {showDiagnosticModal && diagnosticStore && (() => {
      const ds = diagnosticStore;
      const dMeta = storeMeta[ds.slug] || { emoji: '🏪', cat: 'Tienda' };
      const dDetails = storeDetails[ds.slug] || { location: '—', date: 'Hoy', icon: 'storefront' };
      const issues = [
        { ok: !!ds.name,         label: 'Nombre de tienda',     hint: 'Agrega un nombre para identificar la tienda' },
        { ok: !!ds.slug,         label: 'Slug / URL',           hint: 'Define un slug único para la URL de la tienda' },
        { ok: !!ds.tagline,      label: 'Frase corta (tagline)', hint: 'Una frase breve que describa tu negocio' },
        { ok: !!(ds.marketplaceCategory && ds.marketplaceCategory !== 'General'), label: 'Categoría en marketplace', hint: 'Elige una categoría específica para aparecer en explorar' },
        { ok: !!(ds.template && ds.template !== 'default'), label: 'Plantilla visual',  hint: 'Selecciona una plantilla que no sea "default" para personalizar' },
        { ok: dDetails.location !== '—', label: 'Ubicación / dirección', hint: 'Indica la ubicación física de tu tienda' },
      ];
      const missingCount = issues.filter(i => !i.ok).length;
      return (
      <div className="fixed inset-0 z-[200] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[460px] max-w-[460px] max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between shrink-0">
            <h3 className="font-bold text-sm text-[#191b23] flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-base">report</span>
              Diagnóstico de tienda
            </h3>
            <button 
              onClick={() => setShowDiagnosticModal(false)}
              className="w-7 h-7 flex items-center justify-center text-[#424754] hover:bg-[#e6e7f2] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          <div className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
            <div className="flex items-center gap-3 pb-2 border-b border-[#c2c6d6]">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 border border-[#c2c6d6]/60 bg-[#f9f9ff]">
                {dMeta.emoji}
              </div>
              <div>
                <p className="font-bold text-sm text-[#191b23]">{ds.name || 'Sin nombre'}</p>
                <p className="text-[10px] text-[#727785] font-semibold">/{ds.slug}</p>
              </div>
            </div>

            {missingCount === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
                <p className="text-xs font-bold text-[#191b23]">¡Tienda completa!</p>
                <p className="text-[10px] text-[#727785]">No se encontraron problemas.</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold text-[#424754] uppercase tracking-wide">
                  {missingCount} {missingCount === 1 ? 'pendiente' : 'pendientes'} por resolver
                </p>
                <div className="space-y-1.5">
                  {issues.map((issue, i) => (
                    <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs ${issue.ok ? 'bg-emerald-50/40' : 'bg-amber-50/60 border border-amber-200/60'}`}>
                      <span className={`material-symbols-outlined text-[14px] mt-0.5 ${issue.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {issue.ok ? 'check_circle' : 'error_outline'}
                      </span>
                      <div>
                        <p className={`font-bold ${issue.ok ? 'text-emerald-800' : 'text-amber-900'}`}>{issue.label}</p>
                        {!issue.ok && <p className="text-[10px] text-amber-700 mt-0.5">{issue.hint}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="px-5 py-3 border-t border-[#c2c6d6] flex justify-end bg-[#f9f9ff]">
            <button
              onClick={() => setShowDiagnosticModal(false)}
              className="px-4 py-2 bg-[#0058be] text-white rounded-lg font-bold text-xs hover:bg-[#004395] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
      );
    })()}

  </>
  );
}
