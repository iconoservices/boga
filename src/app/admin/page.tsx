'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { type StoreConfig } from '@/lib/stores.config';
import { getTemplate, getDemoProducts } from '@/lib/templates.config';
import StoreRenderer from '@/app/[slug]/StoreRenderer';
import { useDemo } from '@/context/DemoContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { supabase } from '@/lib/supabase';

const META: Record<string, { emoji: string; cat: string }> = {
  sunset:   { emoji: '🥂', cat: 'Bar & Café' },
  delva:    { emoji: '🌿', cat: 'Mercado' },
  natura:   { emoji: '🪴', cat: 'Salud' },
  amazonia: { emoji: '🏺', cat: 'Artesanía' },
  estilosmirka: { emoji: '👗', cat: 'Boutique' },
  sweetkittynails: { emoji: '💅', cat: 'Beauty' },
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

const INITIAL_CATEGORIES = [
  { id: 1, name: 'Comida', subs: ['Menú del Día', 'Criollo', 'Hamburguesas', 'Pizzas', 'Sándwiches'], storeSlugs: ['sunset'] },
  { id: 2, name: 'Bebidas', subs: ['Piqueos & Snacks', 'Cervezas', 'Licores', 'Jugos', 'Café'], storeSlugs: ['sunset'] },
  { id: 3, name: 'Mercado', subs: ['Frutas', 'Verduras', 'Carnes', 'Lácteos', 'Panadería'], storeSlugs: ['delva', 'amazonia'] },
  { id: 4, name: 'Salud', subs: ['Medicamentos', 'Cuidado Personal', 'Suplementos'], storeSlugs: ['natura'] },
  { id: 5, name: 'Moda', subs: ['Vestidos', 'Blusas', 'Accesorios', 'Relojes', 'Calzado'], storeSlugs: ['estilosmirka', 'sweetkittynails'] },
  { id: 6, name: 'Servicios', subs: ['Limpieza', 'Reparación', 'Delivery'], storeSlugs: [] },
  { id: 7, name: 'Combos & Promos', subs: ['Combos Comida', 'Packs Bebidas', 'Ofertas Flash'], storeSlugs: [] },
];

const mapFormCategoryToCategoryName = (formCat: string): string => {
  const mapping: Record<string, string> = {
    'Restaurantes': 'Comida',
    'Mercado': 'Mercado',
    'Salud y Bienestar': 'Salud',
    'Salud': 'Salud',
    'Moda y Belleza': 'Moda',
    'Moda': 'Moda',
    'Servicios': 'Servicios',
    'Tecnología': 'Servicios',
  };
  return mapping[formCat] || formCat;
};

const NAV = [
  { id: 'tiendas',         icon: 'storefront',    label: 'Tiendas' },
  { id: 'categorias',      icon: 'category',      label: 'Categorías' },
  { id: 'paquetes',        icon: 'inventory_2',   label: 'Paquetes' },
  { id: 'usuarios',        icon: 'group',         label: 'Usuarios' },
  { id: 'personalizacion', icon: 'tune',          label: 'Personalización' },
  { id: 'plantillas',      icon: 'layers',        label: 'Plantillas' },
  { id: 'facturacion',     icon: 'payments',      label: 'Facturación' },
  { id: 'mapa',            icon: 'account_tree',  label: 'Mapa de Apps' },
] as const;

interface Package {
  id: string | number;
  name: string;
  badge: string;
  features: string[];
  price: number;
  active: boolean;
  bannerUrl?: string;
  isPopular?: boolean;
}

// Mini image upload input
function ImageUploadInput({ value, onChange, placeholder }: { value: string; onChange: (url: string) => void; placeholder?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      alert('Error al subir: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder={placeholder || 'URL del banner...'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-white border border-[#c2c6d6] rounded-lg px-2.5 py-1.5 text-xs text-[#191b23] outline-none focus:border-[#0058be] transition-colors"
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-8 h-8 rounded-lg bg-[#ecedf7] hover:bg-[#e6e7f2] flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
        title="Subir imagen"
      >
        {uploading
          ? <span className="material-symbols-outlined text-sm animate-spin text-[#424754]">refresh</span>
          : <span className="material-symbols-outlined text-sm text-[#424754]">photo_camera</span>
        }
      </button>
      {value && (
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#c2c6d6] shrink-0">
          <img src={value} className="w-full h-full object-cover" alt="" />
        </div>
      )}
    </div>
  );
}

// Compact Toggle component matching redesign spec
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      type="button"
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        on ? 'bg-[#0058be]' : 'bg-[#c2c6d6]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'tiendas' | 'categorias' | 'usuarios' | 'personalizacion' | 'facturacion' | 'mapa' | 'paquetes' | 'plantillas'>('tiendas');
  const [search, setSearch] = useState('');
  
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

  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticStore, setDiagnosticStore] = useState<any | null>(null);

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
    active: true
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Send preview updates to iframe in real time
  const sendPreviewUpdate = React.useCallback(() => {
    if (!storeForm.slug) return;
    const templateKey = storeForm.template || 'default';
    const existingStoreObj = stores[storeForm.slug] || {};
    const tpl = getTemplate(templateKey);

    const resolvedBaseTheme =
      tpl?.theme ??
      {
        primary: '#0058be', onPrimary: '#ffffff', primaryContainer: '#2170e4',
        secondary: '#545f73', secondaryContainer: '#d5e0f8', background: '#f9f9ff',
        surface: '#ffffff', surfaceContainer: '#ecedf7', surfaceContainerLow: '#f2f3fd',
        surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#e6e7f2',
        onBackground: '#191b23', onSurface: '#191b23', onSurfaceVariant: '#424754',
        outlineVariant: '#c2c6d6', fontHeadline: "'Inter', sans-serif",
        fontBody: "'Inter', sans-serif", fontLabel: "'Inter', sans-serif",
      };

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
      heroImage: existingStoreObj.heroImage || tpl?.heroImage || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
      heroAlt: storeForm.name || 'store image',
      logoImage: logoPreview || undefined,
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
  }, [storeForm, stores, logoPreview]);

  React.useEffect(() => {
    sendPreviewUpdate();
  }, [sendPreviewUpdate]);

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

  // Verificar disponibilidad del slug
  React.useEffect(() => {
    if (!storeForm.slug || storeForm.slug.length < 2 || editingStore) {
      setSlugAvailable(editingStore ? true : null);
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
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingSubId, setEditingSubId] = useState<{catId: number, index: number} | null>(null);
  const [activeCategoryMenu, setActiveCategoryMenu] = useState<number | null>(null);

  // Usuarios state
  const ROLES = ['super_admin', 'store_admin'] as const;
  type UserRole = typeof ROLES[number];
  const [users, setUsers] = useState([
    { id: 1, email: 'tu@bogamarket.com',    name: 'Super Admin',      role: 'super_admin' as UserRole, store: '',       status: 'activo' },
    { id: 2, email: 'pedro@sunsetlounge.com', name: 'Pedro Ramírez',  role: 'store_admin' as UserRole, store: 'sunset', status: 'activo' },
    { id: 3, email: 'maria@delva.com',      name: 'María López',     role: 'store_admin' as UserRole, store: 'delva',  status: 'pendiente' },
  ]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStore, setInviteStore] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('store_admin');
  const [inviteSent, setInviteSent] = useState(false);
  const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null);

  // Paquetes state
  const [packages, setPackages] = useState<Package[]>([
    {
      id: 'starter',
      name: 'Starter Kit',
      badge: 'Entry Level',
      features: ['5 Users', 'Basic Analytics', 'Email Support'],
      price: 49,
      active: true,
      bannerUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKn9iOD2YOzoyu_3J71aa9z9RyJ3IfQV78LugrlEPkQNFCgDy-MnaS0g7s3nKXYulJhuJeY0JF69gjJo7xEerprAOkByz4HFKxNTw_bspTl4JL6BQ4NRADjhJe8LR4PTruCAcwipMaBqTM9YmKnPEVeXyhnJcd3DsN9GEFomdnMWqU21ild6RpWmeDmL57autUZD8geIwztAIFGBmaW_waD29_A3h1spjp4cS45g4cb1Si57yQ8Ht5IXYVEvO5_pZBFMSKneY35g'
    },
    {
      id: 'pro',
      name: 'Pro Bundle',
      badge: 'Most Popular',
      features: ['25 Users', 'Advanced Reporting', 'Priority Support', 'API Access'],
      price: 129,
      active: true,
      isPopular: true,
      bannerUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJ2Tu5eDKXgk1KbjBnNPspanHcYa6ep8ccDfoNrrYyUrX6GzTo8v35ey1bbR3UStCZFtFh53gmpz9yvzVB5xpflklrFPrbFexSnq_a-MIQk1Z9oIrB3CYFrmDHH11xmODufijFp4Z2UpBKojIZioNCNG-Av-RwP9HS-Z56MbJYA9C-D9xqYPMPnhz3aIL2sjiSJIcaTRV3ndkmxPnaisatJhyqcHaxpQpqtaYZVZBe7ZULQRWIZ0D81mzPVvLLNLKUi7K8euR9pQ'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      badge: 'Scale',
      features: ['Unlimited Users', 'Custom Dashboards', 'Dedicated Manager', 'SLA Guarantee'],
      price: 599,
      active: true,
      bannerUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9g-m183JnnrY_f0N5rXywD-xM13gkYKvVFKXrodlMe2Wl-cVJBt_FnbbOL6au82hjOYtmUSwIqKmxiEaV72Jc7jTvkYft1B57f1TDvU_1OaE4Vy6PL_ONz-APy0X1nepCQyhOsvc14BSmsgTB_W2VfezRBB-vXsIAI-SH5_4QCnyEV-4745oJKr5t8PWBcfvo1Hee7Q0dZHZe2e1wAGtUK1DoXwU3nnH9W3H_dMaXPzOjv7OKBH-CMZvQShSxIQeORMn2gqKR3w'
    }
  ]);
  const [archivedPackages, setArchivedPackages] = useState([
    { id: 'archive-1', name: 'Legacy Basic (v1)', price: 29, usersCount: '1,240', active: false },
    { id: 'archive-2', name: 'Early Adopter Special', price: 15, usersCount: '450', active: true },
  ]);

  // Packages management modals state
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [packageForm, setPackageForm] = useState({
    name: '',
    badge: '',
    price: 0,
    features: '',
    isPopular: false,
    active: true,
    bannerUrl: ''
  });

  // Plantillas state
  interface AdminTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    previewUrl: string;
  }

  const [adminTemplates, setAdminTemplates] = useState<AdminTemplate[]>([
    {
      id: 'default',
      name: 'Default Minimal',
      category: 'Negocios',
      description: 'Diseño minimalista que prioriza el contenido visual y la simplicidad estructural.',
      previewUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&q=80'
    },
    {
      id: 'sunset',
      name: 'Sunset Dark',
      category: 'Gourmet',
      description: 'Enfoque visual y misterioso en gastronomía y bar, ideal para restaurantes con menús dinámicos y luz tenue.',
      previewUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80'
    },
    {
      id: 'natura',
      name: 'Natura Organic',
      category: 'Salud',
      description: 'Estilo claro y fresco con toques verdes ideal para clínicas, consultorios y venta de productos orgánicos.',
      previewUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80'
    },
    {
      id: 'amazonia',
      name: 'Amazonia Fresh',
      category: 'Comercio',
      description: 'Experiencia de compra vibrante con galerías de alta resolución y colores inspirados en la naturaleza.',
      previewUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80'
    },
    {
      id: 'sweetkittynails',
      name: 'Kitty Beauty Pink',
      category: 'Salud',
      description: 'Estilo rosa pastel optimizado para reservas de citas y servicios estéticos o salones de belleza.',
      previewUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80'
    },
    {
      id: 'estilosmirka',
      name: 'Mirka Elegant',
      category: 'Comercio',
      description: 'Diseño de boutique de moda premium con gran espacio para fotos de prendas, catálogos y colecciones de temporada.',
      previewUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80'
    },
    {
      id: 'polleria',
      name: 'Pollería Bravoz',
      category: 'Gourmet',
      description: 'Estilo cálido y rústico optimizado para pollerías, parrilladas y restaurantes de comida rápida con fotos grandes y navegación fluida.',
      previewUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80'
    }
  ]);

  const [templateFilter, setTemplateFilter] = useState<string>('Todas');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdminTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    category: 'Comercio',
    description: '',
    previewUrl: ''
  });

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    setUsers(prev => [...prev, {
      id: Date.now(), email: inviteEmail, name: '(pendiente)',
      role: inviteRole, store: inviteStore, status: 'pendiente'
    }]);
    setInviteSent(true);
    setTimeout(() => {
      setShowInviteModal(false);
      setInviteEmail(''); setInviteStore(''); setInviteRole('store_admin'); setInviteSent(false);
    }, 1800);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
  };

  const { isDemoVisible, toggleDemoProducts } = useDemo();
  const { getSettings, updateSetting } = useStoreSettings();

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

          data.forEach(dbStore => {
            const slug = dbStore.slug;
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

          setCategories(prevCats => {
            return prevCats.map(c => {
              const currentSlugs = [...(c.storeSlugs || [])];
              data.forEach(dbStore => {
                const slug = dbStore.slug;
                const mappedCatName = mapFormCategoryToCategoryName(dbStore.marketplace_category || '');
                if (c.name === mappedCatName && !currentSlugs.includes(slug)) {
                  currentSlugs.push(slug);
                }
              });
              return { ...c, storeSlugs: currentSlugs };
            });
          });
        }
      } catch (err) {
        console.error('Error fetching stores from Supabase:', err);
      }
    };
    
    fetchDbStores();
  }, []);

  const handleLinkStoreToCategory = async (catId: number, catName: string, slug: string) => {
    setCategories(cats => cats.map(c => {
      if (c.id === catId) {
        const current = c.storeSlugs || [];
        if (!current.includes(slug)) {
          return { ...c, storeSlugs: [...current, slug] };
        }
      }
      return c;
    }));

    setStores(prev => {
      if (!prev[slug]) return prev;
      return {
        ...prev,
        [slug]: {
          ...prev[slug],
          marketplaceCategory: catName
        }
      };
    });

    try {
      await supabase
        .from('stores')
        .update({ marketplace_category: catName })
        .eq('slug', slug);
    } catch (err) {
      console.error('Error linking store to category:', err);
    }
  };

  const handleUnlinkStoreFromCategory = async (catId: number, slug: string) => {
    setCategories(cats => cats.map(c => {
      if (c.id === catId) {
        return { ...c, storeSlugs: (c.storeSlugs || []).filter(s => s !== slug) };
      }
      return c;
    }));

    setStores(prev => {
      if (!prev[slug]) return prev;
      return {
        ...prev,
        [slug]: {
          ...prev[slug],
          marketplaceCategory: ''
        }
      };
    });

    try {
      await supabase
        .from('stores')
        .update({ marketplace_category: '' })
        .eq('slug', slug);
    } catch (err) {
      console.error('Error unlinking store from category:', err);
    }
  };

  const storeList = Object.values(stores);
  const filtered = storeList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStore = (slug: string) =>
    setActiveStores((prev) => ({ ...prev, [slug]: !prev[slug] }));

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
    setStoreForm({
      slug: '',
      name: '',
      tagline: '',
      marketplaceCategory: 'Restaurantes',
      template: 'default',
      location: '',
      emoji: '🏪',
      tier: 'Basic Tier',
      active: true
    });
    setShowStoreModal(true);
  };

  const handleOpenEditStore = (store: any) => {
    const slug = store.slug;
    setEditingStore(store);
    setSlugManuallyEdited(true);
    setSlugAvailable(null);
    setLogoFile(null);
    setLogoPreview(store.logoImage || null);
    setLogoRemoved(false);
    setStoreForm({
      slug: store.slug,
      name: store.name,
      tagline: store.tagline || '',
      marketplaceCategory: store.marketplaceCategory || 'General',
      template: store.template || 'default',
      location: storeDetails[slug]?.location || '',
      emoji: storeMeta[slug]?.emoji || '🏪',
      tier: storeTiers[slug] || 'Basic Tier',
      active: !!activeStores[slug]
    });
    setShowStoreModal(true);
  };

  const handleDeleteStore = async (slug: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la tienda "${stores[slug]?.name || slug}"?`)) {
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
        
        setCategories(prevCats => {
          return prevCats.map(c => ({
            ...c,
            storeSlugs: (c.storeSlugs || []).filter(s => s !== slug)
          }));
        });
      } catch (err: any) {
        alert('Error al eliminar tienda de Supabase: ' + err.message);
      }
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.slug || !storeForm.name) return;
    if (saving) return;
    setSaving(true);
    
    const slug = storeForm.slug.trim().toLowerCase();
    const templateKey = storeForm.template as string;

    const existingStoreObj = stores[slug] || {};
    const tpl = getTemplate(templateKey);
    const resolvedBaseTheme =
      tpl?.theme ??
      {
        primary: '#0058be', onPrimary: '#ffffff', primaryContainer: '#2170e4',
        secondary: '#545f73', secondaryContainer: '#d5e0f8', background: '#f9f9ff',
        surface: '#ffffff', surfaceContainer: '#ecedf7', surfaceContainerLow: '#f2f3fd',
        surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#e6e7f2',
        onBackground: '#191b23', onSurface: '#191b23', onSurfaceVariant: '#424754',
        outlineVariant: '#c2c6d6', fontHeadline: "'Inter', sans-serif",
        fontBody: "'Inter', sans-serif", fontLabel: "'Inter', sans-serif",
      };

    const theme = {
      ...resolvedBaseTheme,
      location: storeForm.location,
      emoji: storeForm.emoji,
      tier: storeForm.tier
    };
    const heroImage = existingStoreObj.heroImage || tpl?.heroImage || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80';
    const heroAlt = existingStoreObj.heroAlt || 'store image';
    const categoriesList = existingStoreObj.categories || [];

    let logoUrl: string | null = null;
    if (logoFile && slug) {
      const ext = logoFile.name.split('.').pop();
      const path = `${slug}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('store-assets').upload(path, logoFile, { upsert: true });
      if (!upErr) {
        const { data: pubData } = supabase.storage.from('store-assets').getPublicUrl(path);
        logoUrl = pubData.publicUrl;
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
      status: storeForm.active ? 'active' : 'inactive'
    };
    if (logoUrl) {
      upsertData.logo_image = logoUrl;
    } else if (logoRemoved) {
      upsertData.logo_image = null;
    } else if (editingStore?.logoImage) {
      upsertData.logo_image = editingStore.logoImage;
    }

    try {
      const { error } = await supabase
        .from('stores')
        .upsert(upsertData, { onConflict: 'slug' });
        
      if (error) throw error;
      
      setStoreDetails(prev => ({
        ...prev,
        [slug]: {
          location: storeForm.location,
          date: editingStore ? (prev[slug]?.date || 'Hoy') : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          icon: 'storefront'
        }
      }));
      
      setStoreMeta(prev => ({
        ...prev,
        [slug]: {
          emoji: storeForm.emoji,
          cat: storeForm.marketplaceCategory
        }
      }));

      setStoreTiers(prev => ({
        ...prev,
        [slug]: storeForm.tier
      }));

      setActiveStores(prev => ({
        ...prev,
        [slug]: storeForm.active
      }));

      setStores(prev => {
        const updated = {
          ...existingStoreObj,
          slug,
          name: storeForm.name,
          tagline: storeForm.tagline,
          marketplaceCategory: storeForm.marketplaceCategory,
          template: storeForm.template,
          heroImage,
          heroAlt,
          categories: categoriesList,
          logoImage: logoUrl || (logoRemoved ? undefined : existingStoreObj.logoImage),
          theme
        };
        
        return {
          ...prev,
          [slug]: updated
        };
      });

      const oldSlug = editingStore?.slug;
      const mappedCatName = mapFormCategoryToCategoryName(storeForm.marketplaceCategory);
      setCategories(prevCats => {
        return prevCats.map(c => {
          let storeSlugs = c.storeSlugs || [];
          if (oldSlug) {
            storeSlugs = storeSlugs.filter(s => s !== oldSlug);
          }
          if (c.name === mappedCatName) {
            if (!storeSlugs.includes(slug)) {
              storeSlugs = [...storeSlugs, slug];
            }
          } else {
            storeSlugs = storeSlugs.filter(s => s !== slug);
          }
          return { ...c, storeSlugs };
        });
      });

      setShowStoreModal(false);

      // Si es una tienda nueva, insertar productos demo de la plantilla
      if (!editingStore) {
        const demoProducts = getDemoProducts(templateKey);
        if (demoProducts.length > 0) {
          const demoInserts = demoProducts.map(p => ({
            name: p.name,
            price: p.price,
            category: p.category,
            subcategory: p.subcategory || null,
            image: p.image,
            description: p.description || null,
            store: slug,
            stock: 0,
            status: 'Activo',
          }));
          await supabase.from('products').insert(demoInserts);
        }
      }
    } catch (err: any) {
      alert('Error al guardar en Supabase: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Package Actions
  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm({
      name: '',
      badge: '',
      price: 29,
      features: '10 Users, Core Analytics, Standard Support',
      isPopular: false,
      active: true,
      bannerUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKn9iOD2YOzoyu_3J71aa9z9RyJ3IfQV78LugrlEPkQNFCgDy-MnaS0g7s3nKXYulJhuJeY0JF69gjJo7xEerprAOkByz4HFKxNTw_bspTl4JL6BQ4NRADjhJe8LR4PTruCAcwipMaBqTM9YmKnPEVeXyhnJcd3DsN9GEFomdnMWqU21ild6RpWmeDmL57autUZD8geIwztAIFGBmaW_waD29_A3h1spjp4cS45g4cb1Si57yQ8Ht5IXYVEvO5_pZBFMSKneY35g'
    });
    setShowPackageModal(true);
  };

  const handleOpenEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      badge: pkg.badge,
      price: pkg.price,
      features: pkg.features.join(', '),
      isPopular: !!pkg.isPopular,
      active: pkg.active,
      bannerUrl: pkg.bannerUrl || ''
    });
    setShowPackageModal(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const splitFeatures = packageForm.features.split(',').map(f => f.trim()).filter(Boolean);
    
    if (editingPackage) {
      // Edit mode
      setPackages(prev => prev.map(p => p.id === editingPackage.id ? {
        ...p,
        name: packageForm.name,
        badge: packageForm.badge,
        price: Number(packageForm.price),
        features: splitFeatures,
        isPopular: packageForm.isPopular,
        active: packageForm.active,
        bannerUrl: packageForm.bannerUrl
      } : p));
    } else {
      // Create mode
      setPackages(prev => [...prev, {
        id: Date.now(),
        name: packageForm.name,
        badge: packageForm.badge,
        price: Number(packageForm.price),
        features: splitFeatures,
        isPopular: packageForm.isPopular,
        active: packageForm.active,
        bannerUrl: packageForm.bannerUrl
      }]);
    }
    setShowPackageModal(false);
  };

  const handleDeletePackage = (id: string | number) => {
    if (confirm('¿Estás seguro de que deseas eliminar este paquete?')) {
      setPackages(prev => prev.filter(p => p.id !== id));
    }
  };

  const togglePackageActive = (id: string | number) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  // Template Actions
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      id: '',
      name: '',
      category: 'Comercio',
      description: '',
      previewUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80'
    });
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplate = (tpl: AdminTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      description: tpl.description,
      previewUrl: tpl.previewUrl
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.id || !templateForm.name) return;

    if (editingTemplate) {
      setAdminTemplates(prev => prev.map(t => t.id === editingTemplate.id ? {
        ...t,
        id: templateForm.id,
        name: templateForm.name,
        category: templateForm.category,
        description: templateForm.description,
        previewUrl: templateForm.previewUrl
      } : t));
    } else {
      setAdminTemplates(prev => [...prev, {
        id: templateForm.id,
        name: templateForm.name,
        category: templateForm.category,
        description: templateForm.description,
        previewUrl: templateForm.previewUrl
      }]);
    }
    setShowTemplateModal(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la plantilla "${id}"?`)) {
      setAdminTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const getTemplateUsageCount = (tplId: string) => {
    return Object.values(stores).filter(s => s.template === tplId).length;
  };

  return (
    <>
      <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] flex overflow-hidden font-sans">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0">
        <div className="mb-6 px-2 py-1">
          <h1 className="text-xl font-bold tracking-tight text-[#0058be]">Boga Admin</h1>
          <p className="text-[#424754] text-xs font-semibold opacity-70">Feature Control</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((n) => {
            const isActive = activeTab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setActiveTab(n.id)}
                className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-all rounded-xl active:scale-95 duration-150 ${
                  isActive 
                    ? 'bg-[#2170e4] text-[#fefcff] shadow-[0_4px_12px_-2px_rgba(33,112,228,0.2)] font-bold' 
                    : 'text-[#424754] hover:bg-[#e6e7f2]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </nav>
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
            onClick={() => {
              if (activeTab === 'plantillas') {
                handleOpenCreateTemplate();
              } else if (activeTab === 'paquetes') {
                handleOpenCreatePackage();
              } else {
                setActiveTab('paquetes');
                setTimeout(handleOpenCreatePackage, 100);
              }
            }}
            className="w-full py-2.5 px-4 bg-[#0058be] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {activeTab === 'plantillas' ? 'Nueva Plantilla' : 'Nuevo Paquete'}
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
            <button className="p-1 text-[#424754] hover:bg-[#e1e2ec] hover:opacity-80 transition-all rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </button>
            <Link href="/" className="p-1 text-[#424754] hover:bg-[#e1e2ec] hover:text-[#ba1a1a] transition-all rounded-full flex items-center justify-center" title="Salir">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 md:p-8 max-w-[1200px] mx-auto w-full flex flex-col gap-6 md:gap-8">
          
          {/* ─── PAQUETES ─── */}
          {activeTab === 'paquetes' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b border-[#c2c6d6] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#191b23]">Niveles de Suscripción</h2>
                  <p className="text-xs text-[#424754] mt-1">Define y administra los paquetes comerciales para las tiendas del ecosistema.</p>
                </div>
                <button 
                  onClick={handleOpenCreatePackage}
                  className="h-10 px-4 bg-[#0058be] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:shadow-lg transition-all active:scale-95 shrink-0 self-start"
                >
                  <span className="material-symbols-outlined text-sm">add_box</span>
                  Crear Nuevo Paquete
                </button>
              </div>

              {/* Metrics Bento Grid */}
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 p-5 bg-white border border-[#c2c6d6] rounded-xl flex flex-col justify-between relative overflow-hidden">
                  <div className="z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Total de Paquetes</span>
                    <div className="text-2xl font-bold mt-1 text-[#191b23]">{packages.length}</div>
                    <div className="flex items-center gap-1 text-[#0058be] text-[10px] font-semibold mt-2">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      <span>+1 este mes</span>
                    </div>
                  </div>
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] pointer-events-none">
                    <span className="material-symbols-outlined text-[100px]">inventory_2</span>
                  </div>
                </div>

                <div className="p-5 bg-white border border-[#c2c6d6] rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Activos</span>
                    <div className="text-2xl font-bold mt-1 text-[#0058be]">{packages.filter(p => p.active).length}</div>
                  </div>
                  <div className="h-1.5 w-full bg-[#ecedf7] rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-[#0058be]" style={{ width: `${(packages.filter(p => p.active).length / packages.length) * 100}%` }}></div>
                  </div>
                </div>

                <div className="p-5 bg-white border border-[#c2c6d6] rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Inactivos</span>
                    <div className="text-2xl font-bold mt-1 text-[#595c5e]">{packages.filter(p => !p.active).length}</div>
                  </div>
                  <div className="h-1.5 w-full bg-[#ecedf7] rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-[#595c5e]" style={{ width: `${(packages.filter(p => !p.active).length / packages.length) * 100}%` }}></div>
                  </div>
                </div>
              </section>

              {/* Package Grid */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#191b23]">Tiers Publicados</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {packages.map((pkg) => {
                    const isPopular = pkg.isPopular;
                    return (
                      <div 
                        key={pkg.id} 
                        className={`group bg-white border rounded-xl overflow-hidden transition-all duration-200 flex flex-col hover:translate-y-[-2px] hover:shadow-md ${
                          isPopular ? 'border-[#0058be] ring-1 ring-[#0058be]' : 'border-[#c2c6d6]'
                        }`}
                      >
                        {/* Header banner */}
                        <div className={`h-24 p-4 flex items-end relative overflow-hidden ${isPopular ? 'bg-[#0058be]' : 'bg-[#f2f3fd]'}`}>
                          {pkg.bannerUrl && (
                            <img className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-25" src={pkg.bannerUrl} alt="" />
                          )}
                          <div className="z-10 flex flex-col">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold w-fit mb-1 ${
                              isPopular ? 'bg-white text-[#0058be]' : 'bg-[#2170e4] text-white'
                            }`}>
                              {pkg.badge}
                            </span>
                            <h4 className={`text-base font-bold leading-tight ${isPopular ? 'text-white' : 'text-[#191b23]'}`}>
                              {pkg.name}
                            </h4>
                          </div>
                        </div>

                        {/* Specs */}
                        <div className="p-4 flex flex-col gap-4 flex-1">
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.features.map((feat, idx) => (
                              <span 
                                key={idx} 
                                className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                                  isPopular 
                                    ? 'bg-[#d8e2ff] text-[#004395] border-[#adc6ff]' 
                                    : 'bg-[#ecedf7] text-[#424754] border-[#c2c6d6]'
                                }`}
                              >
                                {feat}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between mt-auto pt-2">
                            <div>
                              <span className="text-xl font-extrabold text-[#191b23]">${pkg.price}</span>
                              <span className="text-[10px] text-[#424754] font-medium">/mes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${pkg.active ? 'text-[#0058be]' : 'text-[#595c5e]'}`}>
                                {pkg.active ? 'Activo' : 'Inactivo'}
                              </span>
                              <Toggle on={pkg.active} onChange={() => togglePackageActive(pkg.id)} />
                            </div>
                          </div>
                        </div>

                        {/* Actions footer */}
                        <div className={`p-2 border-t flex justify-end gap-1 ${
                          isPopular ? 'bg-[#d8e2ff]/20 border-[#0058be]/20' : 'bg-[#f2f3fd]/50 border-[#c2c6d6]/50'
                        }`}>
                          <button 
                            onClick={() => handleOpenEditPackage(pkg)} 
                            className="p-1.5 text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded transition-colors flex items-center justify-center"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeletePackage(pkg.id)} 
                            className="p-1.5 text-[#424754] hover:text-[#ba1a1a] hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                            title="Eliminar"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Archive Table */}
              <section className="bg-white border border-[#c2c6d6] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#191b23]">Archivo e Historial de Paquetes</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-[#424754] border-b border-[#c2c6d6]">
                        <th className="px-4 py-2 font-semibold">Nombre del Paquete</th>
                        <th className="px-4 py-2 font-semibold">Precio Base</th>
                        <th className="px-4 py-2 font-semibold">Usuarios Registrados</th>
                        <th className="px-4 py-2 font-semibold">Estado</th>
                        <th className="px-4 py-2 font-semibold text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ecedf7]">
                      {archivedPackages.map((archive) => (
                        <tr key={archive.id} className="hover:bg-[#f9f9ff] transition-colors text-xs">
                          <td className="px-4 py-3 font-semibold text-[#191b23]">{archive.name}</td>
                          <td className="px-4 py-3 text-[#424754]">${archive.price}.00</td>
                          <td className="px-4 py-3 text-[#424754]">{archive.usersCount}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              archive.active ? 'bg-[#d8e2ff] text-[#004395]' : 'bg-[#e6e7f2] text-[#424754]'
                            }`}>
                              {archive.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="material-symbols-outlined text-[#424754] hover:text-[#0058be]">more_vert</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

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
                  className="bg-[#0058be] hover:bg-[#2170e4] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                  Registrar Nueva Tienda
                </button>
              </div>

              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-[#c2c6d6] p-4 rounded-xl flex flex-col gap-1 group hover:border-[#0058be] transition-colors">
                  <span className="text-[10px] font-bold text-[#424754] uppercase tracking-wider">Total Tiendas</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#191b23]">{storeList.length}</span>
                    <div className="w-10 h-10 bg-[#d5e0f8]/40 rounded-full flex items-center justify-center text-[#0058be]">
                      <span className="material-symbols-outlined text-[18px]">store</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-[#c2c6d6] p-4 rounded-xl flex flex-col gap-1 group hover:border-[#0058be] transition-colors">
                  <span className="text-[10px] font-bold text-[#424754] uppercase tracking-wider">Tiendas Activas</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#191b23]">{activeCount}</span>
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#c2c6d6] p-4 rounded-xl flex flex-col gap-1 group hover:border-[#0058be] transition-colors">
                  <span className="text-[10px] font-bold text-[#424754] uppercase tracking-wider">Tiendas en Pausa</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#191b23]">{pausedCount}</span>
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-700">
                      <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search & Filter bar */}
              <div className="bg-white border border-[#c2c6d6] rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#424754] text-[18px]">search</span>
                <input
                  placeholder="Buscar tienda por nombre o id..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-[#191b23] placeholder-[#c2c6d6]"
                />
              </div>

              {/* Stores Data Table */}
              <div className="bg-white border border-[#c2c6d6] rounded-xl overflow-hidden shadow-sm">
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
                                  onClick={() => handleDeleteStore(store.slug)}
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
              <div className="flex items-start gap-2 bg-[#f2f3fd]/60 border border-[#c2c6d6]/60 p-3.5 rounded-xl">
                <span className="material-symbols-outlined text-[#0058be] text-[16px] mt-0.5">info</span>
                <span className="text-[10px] text-[#424754] font-medium leading-relaxed">
                  <strong>Control Ecosistema:</strong> Puedes cambiar el estado de activación de cada comercio desde el formulario de edición. Las tiendas inactivas/pausadas no se listarán en el portal de Boga Market.
                </span>
              </div>
            </div>
          )}

          {/* ─── CATEGORIAS ─── */}
          {activeTab === 'categorias' && (
            <div className="space-y-6 animate-fade-in">
              {/* Metrics Summary */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Categorías */}
                <div className="bg-white border border-[#c2c6d6] p-4 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#2170e4] flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined text-lg">grid_view</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#424754] uppercase tracking-wide">Total Categorías</p>
                    <p className="text-xl font-extrabold text-[#191b23]">{categories.length}</p>
                  </div>
                </div>

                {/* Total Tiendas */}
                <div className="bg-white border border-[#c2c6d6] p-4 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#d5e0f8] flex items-center justify-center text-[#586377] shrink-0">
                    <span className="material-symbols-outlined text-lg">store</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#424754] uppercase tracking-wide">Total Tiendas</p>
                    <p className="text-xl font-extrabold text-[#191b23]">{Object.keys(stores).length}</p>
                  </div>
                </div>

                {/* Tiendas sin asignar */}
                {(() => {
                  const allCategoryStoreSlugs = new Set(categories.flatMap(c => c.storeSlugs || []));
                  const unassignedStores = Object.values(stores).filter(s => !allCategoryStoreSlugs.has(s.slug));
                  const count = unassignedStores.length;
                  return (
                    <div className="bg-white border border-[#c2c6d6] p-4 rounded-xl flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#ffdad6] flex items-center justify-center text-[#93000a] shrink-0">
                        <span className="material-symbols-outlined text-lg">warning</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#424754] uppercase tracking-wide">Tiendas sin asignar</p>
                        <p className={`text-xl font-extrabold ${count > 0 ? 'text-[#ba1a1a]' : 'text-emerald-700'}`}>{count}</p>
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* Categories Notion-style Database Table */}
              <section className="bg-white border border-[#c2c6d6] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="font-extrabold text-xs text-[#191b23] uppercase tracking-wider">Base de Datos de Categorías</h2>
                    <p className="text-[10px] text-[#424754] font-semibold mt-0.5">Estructura taxonómica del marketplace al estilo Notion.</p>
                  </div>
                  <button 
                    onClick={() => {
                      const newId = Math.max(...categories.map(c => c.id), 0) + 1;
                      setCategories(cats => [...cats, {
                        id: newId,
                        name: 'Nueva Categoría',
                        subs: ['General'],
                        storeSlugs: []
                      }]);
                      setEditingCatId(newId);
                    }}
                    className="bg-[#0058be] text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 hover:shadow transition-all text-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Nueva Categoría
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
                    <thead>
                      <tr className="bg-[#f2f3fd]/50 border-b border-[#c2c6d6] text-[10px] font-bold uppercase tracking-wider text-[#424754]">
                        <th className="px-4 py-3 w-[260px] font-bold">Categoría Principal</th>
                        <th className="px-4 py-3 w-[380px] font-bold">Subcategorías (Etiquetas Notion)</th>
                        <th className="px-4 py-3 w-[250px] font-bold">Tiendas Vinculadas</th>
                        <th className="px-4 py-3 w-[100px] text-right font-bold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ecedf7]">
                      {categories.map((cat, catIdx) => {
                        const iconName = CATEGORY_ICONS[cat.name] || CATEGORY_ICONS['default'];
                        
                        // Notion style tag colors
                        const colors = [
                          { bg: 'bg-[#ffdad6] text-[#93000a] border-[#ffb4a5]' }, // red
                          { bg: 'bg-[#d8e2ff] text-[#004395] border-[#adc6ff]' }, // blue
                          { bg: 'bg-[#d5e0f8] text-[#3c475a] border-[#bcc7de]' }, // slate
                          { bg: 'bg-[#d1f2e5] text-[#00513b] border-[#a3e5cb]' }, // green
                          { bg: 'bg-[#ffe8d6] text-[#803e00] border-[#ffd1a9]' }, // orange
                          { bg: 'bg-[#f3dbf5] text-[#5c006a] border-[#e8b5ed]' }, // purple
                        ];

                        return (
                          <tr key={cat.id} className="hover:bg-[#f9f9ff] transition-colors text-xs align-top">
                            {/* Column 1: Category Name & Icon */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#f2f3fd] border border-[#c2c6d6]/60 flex items-center justify-center text-[#0058be] shrink-0">
                                  <span className="material-symbols-outlined text-base">{iconName}</span>
                                </div>
                                <div className="space-y-1 w-full min-w-0">
                                  {editingCatId === cat.id ? (
                                    <input
                                      autoFocus
                                      value={cat.name}
                                      onChange={(e) => setCategories(cats => cats.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                                      onBlur={() => setEditingCatId(null)}
                                      onKeyDown={(e) => e.key === 'Enter' && setEditingCatId(null)}
                                      className="font-bold text-xs text-[#191b23] bg-white border border-[#0058be] rounded px-1.5 py-0.5 outline-none w-full"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1.5 group/title">
                                      <span 
                                        onClick={() => setEditingCatId(cat.id)} 
                                        className="font-bold text-xs text-[#191b23] cursor-pointer hover:underline truncate"
                                      >
                                        {cat.name}
                                      </span>
                                      <span className="text-[8px] font-bold bg-[#ecedf7] text-[#424754] px-1 py-0.2 rounded border border-[#c2c6d6]/40 shrink-0">ID:{cat.id}</span>
                                      <button 
                                        onClick={() => setEditingCatId(cat.id)}
                                        className="opacity-0 group-hover/title:opacity-100 text-[#424754] hover:text-[#0058be] transition-opacity shrink-0"
                                      >
                                        <span className="material-symbols-outlined text-[12px]">edit</span>
                                      </button>
                                    </div>
                                  )}
                                  <p className="text-[9px] text-[#424754] font-semibold">
                                    {(cat.storeSlugs || []).length} {(cat.storeSlugs || []).length === 1 ? 'tienda' : 'tiendas'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Column 2: Subcategories (Notion tags style) */}
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {cat.subs.map((sub, idx) => {
                                  const tagColor = colors[(catIdx + idx) % colors.length];
                                  return (
                                    <span 
                                      key={idx} 
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border transition-all ${tagColor.bg}`}
                                    >
                                      {editingSubId?.catId === cat.id && editingSubId?.index === idx ? (
                                        <input
                                          autoFocus
                                          value={sub}
                                          onChange={(e) => setCategories(cats => cats.map(c => {
                                            if (c.id !== cat.id) return c;
                                            const newSubs = [...c.subs];
                                            newSubs[idx] = e.target.value;
                                            return { ...c, subs: newSubs };
                                          }))}
                                          onBlur={() => setEditingSubId(null)}
                                          onKeyDown={(e) => e.key === 'Enter' && setEditingSubId(null)}
                                          className="text-[9px] font-extrabold text-[#191b23] bg-white border border-[#0058be] outline-none w-16 px-1 rounded"
                                        />
                                      ) : (
                                        <span 
                                          onClick={() => setEditingSubId({ catId: cat.id, index: idx })} 
                                          className="cursor-pointer hover:underline"
                                        >
                                          {sub}
                                        </span>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCategories(cats => cats.map(c => c.id === cat.id ? { ...c, subs: c.subs.filter((_, i) => i !== idx) } : c));
                                        }}
                                        className="opacity-70 hover:opacity-100 transition-opacity shrink-0 flex items-center"
                                        title="Eliminar"
                                      >
                                        <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                                      </button>
                                    </span>
                                  );
                                })}

                                <button 
                                  onClick={() => {
                                    setCategories(cats => cats.map(c => {
                                      if (c.id !== cat.id) return c;
                                      const newSubs = [...c.subs, 'Nueva Sub'];
                                      setEditingSubId({ catId: cat.id, index: newSubs.length - 1 });
                                      return { ...c, subs: newSubs };
                                    }));
                                  }}
                                  className="border border-dashed border-[#c2c6d6] hover:border-[#0058be] px-2 py-0.5 rounded-md text-[9px] font-bold text-[#0058be] hover:bg-[#d8e2ff]/40 transition-all flex items-center gap-0.5 cursor-pointer bg-white"
                                >
                                  <span className="material-symbols-outlined text-[11px]">add</span>
                                  Nueva
                                </button>
                              </div>
                            </td>

                            {/* Column 3: Linked Stores */}
                            <td className="px-4 py-3.5">
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1">
                                  {cat.storeSlugs.length === 0 ? (
                                    <span className="text-[10px] text-[#727785] italic font-semibold">Sin tiendas vinculadas</span>
                                  ) : (
                                    cat.storeSlugs.map(slug => (
                                      <span 
                                        key={slug} 
                                        className="inline-flex items-center gap-1 bg-[#f2f3fd] border border-[#c2c6d6] text-[#191b23] px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 shadow-xs hover:border-[#2170e4] transition-colors"
                                      >
                                        <span>{META[slug]?.emoji || '🏪'}</span>
                                        <span className="truncate max-w-[80px]">{stores[slug]?.name || slug}</span>
                                        <button 
                                          onClick={() => handleUnlinkStoreFromCategory(cat.id, slug)}
                                          className="text-[#424754] hover:text-[#ba1a1a] shrink-0 flex items-center ml-0.5"
                                          title="Desvincular"
                                        >
                                          <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                                        </button>
                                      </span>
                                    ))
                                  )}
                                </div>
                                
                                <select 
                                  value=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    handleLinkStoreToCategory(cat.id, cat.name, val);
                                  }}
                                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] text-[#424754] text-[9px] font-bold px-2 py-1 rounded-md outline-none focus:border-[#0058be] transition-colors cursor-pointer"
                                >
                                  <option value="">+ Vincular Tienda...</option>
                                  {Object.values(stores).filter(s => !(cat.storeSlugs || []).includes(s.slug)).map(s => (
                                    <option key={s.slug} value={s.slug}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* Column 4: Inline Actions */}
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => setEditingCatId(cat.id)}
                                  className="w-7 h-7 flex items-center justify-center text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded-lg transition-colors"
                                  title="Editar nombre"
                                >
                                  <span className="material-symbols-outlined text-base">edit</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                                      setCategories(cats => cats.filter(c => c.id !== cat.id));
                                    }
                                  }}
                                  className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#ba1a1a] hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar categoría"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Unassigned Stores Table */}
              {(() => {
                const allCategoryStoreSlugs = new Set(categories.flatMap(c => c.storeSlugs || []));
                const unlinkedStores = Object.values(stores).filter(s => !allCategoryStoreSlugs.has(s.slug));

                return (
                  <section className="bg-white border border-[#c2c6d6] rounded-xl overflow-hidden shadow-sm animate-fade-in">
                    <div className="p-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex justify-between items-center">
                      <h2 className="font-extrabold text-xs text-[#191b23] uppercase tracking-wider">Tiendas sin Categoría</h2>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        unlinkedStores.length > 0
                          ? 'bg-[#ffdad6] text-[#93000a] border-[#ffdad6]'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                      }`}>
                        {unlinkedStores.length} {unlinkedStores.length === 1 ? 'pendiente' : 'pendientes'}
                      </span>
                    </div>

                    {unlinkedStores.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#424754] font-semibold">
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                          <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
                        </div>
                        <p className="text-emerald-800 font-bold mb-1">¡Todo ordenado!</p>
                        <p>Todas las tiendas del ecosistema pertenecen a alguna categoría principal.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#f2f3fd]/40 border-b border-[#c2c6d6] text-[10px] font-bold uppercase tracking-wider text-[#424754]">
                              <th className="px-4 py-2.5 font-bold">Nombre de Tienda</th>
                              <th className="px-4 py-2.5 font-bold">Ubicación</th>
                              <th className="px-4 py-2.5 font-bold">Fecha de Registro</th>
                              <th className="px-4 py-2.5 font-bold">Estado</th>
                              <th className="px-4 py-2.5 font-bold text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ecedf7]">
                            {unlinkedStores.map((s) => {
                              const meta = META[s.slug] || { emoji: '🏪' };
                              const details = STORE_DETAILS[s.slug] || { location: 'Ecosistema, Global', date: '01 Ene 2024', icon: 'storefront' };
                              return (
                                <tr key={s.slug} className="hover:bg-[#f9f9ff] transition-colors text-xs">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-base shrink-0">{meta.emoji}</span>
                                      <div>
                                        <p className="font-bold text-[#191b23]">{s.name}</p>
                                        <p className="text-[9px] text-[#424754] font-medium leading-none">/{s.slug}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-[#424754] font-semibold">{details.location}</td>
                                  <td className="px-4 py-3 text-[#424754] font-semibold">{details.date}</td>
                                  <td className="px-4 py-3">
                                    <span className="bg-[#ecedf7] text-[#424754] border border-[#c2c6d6] text-[9px] font-bold px-2 py-0.5 rounded">
                                      Pendiente
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <select 
                                        value=""
                                        onChange={(e) => {
                                          const catId = Number(e.target.value);
                                          if (!catId) return;
                                          const catObj = categories.find(c => c.id === catId);
                                          if (catObj) {
                                            handleLinkStoreToCategory(catId, catObj.name, s.slug);
                                          }
                                        }}
                                        className="bg-[#d5e0f8] hover:bg-[#2170e4] hover:text-white text-[#0058be] text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-transparent outline-none transition-all cursor-pointer shadow-sm w-32"
                                      >
                                        <option value="" className="text-[#424754] font-semibold">Asignar...</option>
                                        {categories.map(cat => (
                                          <option key={cat.id} value={cat.id} className="text-[#191b23] font-bold">{cat.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                );
              })()}
            </div>
          )}

          {/* ─── USUARIOS ─── */}
          {activeTab === 'usuarios' && (
            <div className="flex flex-col lg:flex-row gap-6 items-start animate-fade-in">
              {/* Left: User Table */}
              <div className="flex-1 w-full min-w-0 space-y-3">
                <p className="text-xs text-[#424754] font-semibold">
                  {users.length} usuario{users.length !== 1 ? 's' : ''} con acceso al panel
                </p>
                <div className="bg-white rounded-xl border border-[#c2c6d6] shadow-sm overflow-hidden">
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }} className="px-4 py-2 bg-[#f2f3fd] border-b border-[#c2c6d6]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Nombre</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Email</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Tienda</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Acceso / Estado</span>
                    <span />
                  </div>
                  {/* Rows */}
                  {users.map((u) => (
                    <div 
                      key={u.id} 
                      style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }} 
                      className={`items-center px-4 py-3.5 border-b border-[#ecedf7] last:border-0 transition-colors group cursor-pointer ${ 
                        editingUser?.id === u.id ? 'bg-[#ecedf7]/30' : 'hover:bg-[#f2f3fd]/20'
                      }`}
                    >
                      <p className="font-bold text-xs text-[#191b23] truncate">{u.name}</p>
                      <p className="text-xs text-[#424754] font-semibold truncate">{u.email}</p>
                      <span className="text-xs font-semibold text-[#424754] truncate">
                        {u.store ? (stores[u.store]?.name || u.store) : <span className="text-[#c2c6d6] italic">Todas (Super)</span>}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                          u.role === 'super_admin' ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-[#e6e7f2] text-[#424754] border-[#c2c6d6]'
                        }`}>
                          {u.role === 'super_admin' ? 'Super' : 'Tienda'}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                          u.status === 'activo' 
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-700' 
                            : 'border-amber-100 bg-amber-50 text-amber-700'
                        }`}>
                          {u.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingUser({...u}); setInviteSent(false); }}
                          className="w-7 h-7 flex items-center justify-center text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded-lg transition-colors"
                          title="Editar usuario"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button
                          onClick={() => { setUsers(prev => prev.filter(x => x.id !== u.id)); if(editingUser?.id === u.id) setEditingUser(null); }}
                          className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#ba1a1a] hover:bg-red-50 rounded-lg transition-colors"
                          title="Revocar acceso"
                        >
                          <span className="material-symbols-outlined text-[15px]">person_remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info strip */}
                <div className="flex items-start gap-3 bg-[#d5e0f8]/30 border border-[#adc6ff] rounded-xl p-4">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] shrink-0 mt-0.5">info</span>
                  <p className="text-xs text-[#004395] font-semibold leading-relaxed">
                    Los <strong>Admin de Tienda</strong> solo ven y modifican los productos y la personalización de su tienda asignada. Los <strong>Super Admins</strong> tienen control absoluto sobre todo el ecosistema.
                  </p>
                </div>
              </div>

              {/* Right Panel (Edit / Invite Form) */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white rounded-xl border border-[#c2c6d6] shadow-sm overflow-hidden">
                  
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
                            <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Tienda Asignada</label>
                            <select value={editingUser.store} onChange={(e) => setEditingUser(prev => prev ? {...prev, store: e.target.value} : prev)}
                              className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors">
                              <option value="">Sin tienda asignada</option>
                              {Object.values(stores).map(s => (
                                <option key={s.slug} value={s.slug}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Estado</label>
                          <select value={editingUser.status} onChange={(e) => setEditingUser(prev => prev ? {...prev, status: e.target.value} : prev)}
                            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors">
                            <option value="activo">Activo</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="suspendido">Suspendido</option>
                          </select>
                        </div>
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
                    <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                        <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#191b23] mb-1">¡Invitación enviada!</h3>
                      <p className="text-xs text-[#424754] font-semibold">El usuario recibirá un email para configurar su acceso.</p>
                    </div>
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
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Correo Electrónico</label>
                          <input
                            type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="admin@sutienda.com"
                            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] focus:bg-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Rol</label>
                          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}
                            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors">
                            <option value="store_admin">Admin de Tienda</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                        {inviteRole === 'store_admin' && (
                          <div>
                            <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Asignar Comercio</label>
                            <select value={inviteStore} onChange={(e) => setInviteStore(e.target.value)}
                              className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors">
                              <option value="">Seleccionar tienda...</option>
                              {Object.values(stores).map(s => (
                                <option key={s.slug} value={s.slug}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button
                          onClick={handleSendInvite}
                          disabled={!inviteEmail || (inviteRole === 'store_admin' && !inviteStore)}
                          className="w-full py-2.5 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          Enviar Invitación
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* ─── PERSONALIZACION ─── */}
          {activeTab === 'personalizacion' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-[#c2c6d6] pb-4">
                <h2 className="text-xl font-bold text-[#191b23]">Personalización de Tiendas</h2>
                <p className="text-xs text-[#424754] mt-1">Ajusta la apariencia visual, banners promocionales y contenido demostrativo de cada comercio.</p>
              </div>

              <div className="bg-white rounded-xl border border-[#c2c6d6] overflow-hidden divide-y divide-[#ecedf7] shadow-sm">
                {storeList.map((store) => {
                  const settings = getSettings(store.slug);
                  const demoOn = isDemoVisible(store.slug);
                  return (
                    <div key={store.slug} className="p-5 flex flex-col lg:flex-row gap-6 lg:items-start justify-between hover:bg-[#f2f3fd]/10 transition-colors">
                      <div className="min-w-0 lg:w-1/3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-[#191b23]">{store.name}</span>
                          <span className="text-[9px] font-bold text-[#424754] bg-[#ecedf7] px-2 py-0.5 rounded-full border border-[#c2c6d6]">/{store.slug}</span>
                        </div>
                        <p className="text-[11px] text-[#424754] font-medium leading-relaxed">
                          Define el comportamiento de visualización del catálogo e imágenes para la tienda en su sitio independiente.
                        </p>
                      </div>

                      <div className="flex-1 flex flex-col gap-4">
                        {/* Option toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 bg-[#f2f3fd]/35 p-4 rounded-xl border border-[#c2c6d6]/60">
                          {[
                            { label: 'Productos Demo',   on: demoOn,                          toggle: () => toggleDemoProducts(store.slug) },
                            { label: 'Fotos Productos',  on: settings.showProductImages,       toggle: () => updateSetting(store.slug, 'showProductImages', !settings.showProductImages) },
                            { label: 'Splash Inicial',    on: settings.showSplash,             toggle: () => updateSetting(store.slug, 'showSplash', !settings.showSplash) },
                            { label: 'Imagen Splash',    on: settings.showHeroImage,          toggle: () => updateSetting(store.slug, 'showHeroImage', !settings.showHeroImage), disabled: !settings.showSplash },
                            { label: 'Auto-Banner Cat',  on: settings.useCategoryFeaturedImage, toggle: () => updateSetting(store.slug, 'useCategoryFeaturedImage', !settings.useCategoryFeaturedImage) },
                          ].map(item => (
                            <div key={item.label} className={`flex items-center justify-between gap-3 ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
                              <span className="text-[11px] font-bold text-[#424754]">{item.label}</span>
                              <Toggle on={item.on} onChange={item.toggle} />
                            </div>
                          ))}
                        </div>

                        {/* Manual Category Banners */}
                        {!settings.useCategoryFeaturedImage && (
                          <div className="bg-[#f2f3fd]/20 rounded-xl p-4 border border-[#c2c6d6] space-y-4">
                            <div className="border-b border-[#c2c6d6] pb-2 flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Banners Promocionales por Sección</span>
                              <span className="text-[9px] font-bold text-[#0058be] bg-[#d8e2ff] px-2 py-0.5 rounded">Manuales</span>
                            </div>
                            
                            {[{ href: 'all', name: 'Todas las secciones' }, ...store.categories].map(cat => (
                              <div key={cat.href} className="bg-white rounded-xl p-3 border border-[#c2c6d6] space-y-2.5 shadow-sm">
                                <p className="text-[10px] font-extrabold text-[#0058be] uppercase tracking-wide">{cat.name}</p>
                                <ImageUploadInput
                                  value={settings.categoryBannerUrls[cat.href] || ''}
                                  onChange={(url) => updateSetting(store.slug, 'categoryBannerUrls', { ...settings.categoryBannerUrls, [cat.href]: url })}
                                  placeholder="Imagen de banner (URL)..."
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      placeholder="Título del banner..."
                                      value={settings.categoryBannerTitles[cat.href] || ''}
                                      onChange={(e) => updateSetting(store.slug, 'categoryBannerTitles', { ...settings.categoryBannerTitles, [cat.href]: e.target.value })}
                                      className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-2.5 py-1.5 text-xs text-[#191b23] outline-none focus:border-[#0058be] transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Precio destacado..."
                                      value={settings.categoryBannerPrices[cat.href] || ''}
                                      onChange={(e) => updateSetting(store.slug, 'categoryBannerPrices', { ...settings.categoryBannerPrices, [cat.href]: e.target.value })}
                                      className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-2.5 py-1.5 text-xs text-[#191b23] outline-none focus:border-[#0058be] transition-colors"
                                    />
                                  </div>
                                  <div className="sm:col-span-3">
                                    <input
                                      type="text"
                                      placeholder="Descripción promocional..."
                                      value={settings.categoryBannerDescs[cat.href] || ''}
                                      onChange={(e) => updateSetting(store.slug, 'categoryBannerDescs', { ...settings.categoryBannerDescs, [cat.href]: e.target.value })}
                                      className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-2.5 py-1.5 text-xs text-[#191b23] outline-none focus:border-[#0058be] transition-colors"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Splash hero URL */}
                        <div className={`transition-opacity ${(!settings.showSplash || !settings.showHeroImage) ? 'opacity-30 pointer-events-none' : ''}`}>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#424754] mb-1.5 block">Imagen Splash de Bienvenida</label>
                          <ImageUploadInput
                            value={settings.customHeroUrl}
                            onChange={(url) => updateSetting(store.slug, 'customHeroUrl', url)}
                            placeholder="Predeterminada del sistema (dejar en blanco)..."
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── PLANTILLAS ─── */}
          {activeTab === 'plantillas' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b border-[#c2c6d6] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#191b23]">Gestión de Plantillas</h2>
                  <p className="text-xs text-[#424754] mt-1">Crea y personaliza la experiencia visual de los sitios del ecosistema.</p>
                </div>
                <button 
                  onClick={handleOpenCreateTemplate}
                  className="h-10 px-4 bg-[#0058be] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:shadow-lg transition-all active:scale-95 shrink-0 self-start"
                >
                  <span className="material-symbols-outlined text-sm">add_box</span>
                  Crear Nueva Plantilla
                </button>
              </div>

              {/* Summary Cards (Bento Style) */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-[#c2c6d6] rounded-xl flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Total Plantillas</span>
                    <div className="text-2xl font-bold mt-1 text-[#191b23]">{adminTemplates.length}</div>
                    <div className="flex items-center gap-1 text-[#0058be] text-[10px] font-semibold mt-2">
                      <span className="material-symbols-outlined text-[14px]">layers</span>
                      <span>Disponibles en el portal</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white border border-[#c2c6d6] rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Más Populares</span>
                    <div className="text-base font-bold mt-1 text-[#0058be] truncate">
                      {(() => {
                        const sorted = [...adminTemplates].sort((a, b) => getTemplateUsageCount(b.id) - getTemplateUsageCount(a.id));
                        return sorted[0] ? `${sorted[0].name} (${getTemplateUsageCount(sorted[0].id)} usos)` : 'Ninguna';
                      })()}
                    </div>
                    <span className="text-[10px] text-[#424754] mt-2 block">Mayor adopción por comercios</span>
                  </div>
                </div>

                <div className="p-5 bg-white border border-[#c2c6d6] rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Tasa de Adopción</span>
                    <div className="text-2xl font-bold mt-1 text-[#191b23]">
                      {(() => {
                        const totalStoresCount = Object.values(stores).length || 1;
                        const storesWithTemplate = Object.values(stores).filter(s => s.template && s.template !== 'default').length;
                        const pct = Math.round((storesWithTemplate / totalStoresCount) * 100);
                        return `${pct}% personalizadas`;
                      })()}
                    </div>
                    <span className="text-[10px] text-[#424754] mt-2 block">Uso de plantillas avanzadas</span>
                  </div>
                </div>
              </section>

              {/* Filter Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {['Todas', 'Comercio', 'Negocios', 'Gourmet', 'Tecnología', 'Salud'].map(cat => {
                  const isActive = templateFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setTemplateFilter(cat)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#0058be] text-white shadow-sm'
                          : 'bg-[#ecedf7] text-[#424754] hover:bg-[#e6e7f2]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Templates Grid */}
              <section className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {adminTemplates
                  .filter(t => templateFilter === 'Todas' || t.category === templateFilter)
                  .map((tpl) => {
                    const usage = getTemplateUsageCount(tpl.id);
                    return (
                      <div 
                        key={tpl.id}
                        className="group bg-white border border-[#c2c6d6] rounded-sm overflow-hidden hover:shadow-sm transition-all duration-200 flex flex-col"
                      >
                        {/* Preview Image */}
                        <div className="h-20 sm:h-16 lg:h-10 xl:h-[11px] overflow-hidden relative bg-neutral-100 shrink-0">
                          {tpl.previewUrl ? (
                            <img 
                              alt={tpl.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              src={tpl.previewUrl} 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#c2c6d6]">
                              <span className="material-symbols-outlined text-3xl">broken_image</span>
                            </div>
                          )}
                          <div className="absolute top-1 left-1">
                            <span className="bg-[#0058be]/90 text-white text-[7px] font-extrabold px-1 py-0.5 rounded backdrop-blur-xs uppercase tracking-wider">
                              {tpl.category}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-2 flex flex-col gap-1 flex-1">
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-[11px] font-bold text-[#191b23] leading-tight line-clamp-1">{tpl.name}</h4>
                            <span className="text-[7px] font-bold bg-[#f2f3fd] text-[#0058be] border border-[#c2c6d6]/60 px-1 py-0.2 rounded shrink-0">
                              {tpl.id}
                            </span>
                          </div>
                          <p className="text-[9px] text-[#424754] font-medium leading-normal line-clamp-2">
                            {tpl.description}
                          </p>
                          
                          <div className="flex items-center gap-1 mt-auto pt-1 text-[8px] font-bold text-[#424754]">
                            <span className="material-symbols-outlined text-xs text-[#0058be]">storefront</span>
                            <span>{usage} {usage === 1 ? 'tienda' : 'tiendas'}</span>
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="p-1 border-t border-[#ecedf7] bg-[#f2f3fd]/40 flex justify-end gap-0.5">
                          <a 
                            href={`/preview/${tpl.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-[#545f73] hover:text-[#0058be] hover:bg-[#ecedf7] rounded transition-colors flex items-center justify-center"
                            title="Ver Vista Previa / Demo"
                          >
                            <span className="material-symbols-outlined text-[12px]">visibility</span>
                          </a>

                          <button 
                            onClick={() => handleOpenEditTemplate(tpl)} 
                            className="p-1 text-[#545f73] hover:text-[#0058be] hover:bg-[#ecedf7] rounded transition-colors flex items-center justify-center"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[12px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteTemplate(tpl.id)} 
                            disabled={usage > 0}
                            className={`p-1 rounded transition-colors flex items-center justify-center ${
                              usage > 0 
                                ? 'text-[#c2c6d6] cursor-not-allowed opacity-50' 
                                : 'text-[#545f73] hover:text-[#ba1a1a] hover:bg-red-50'
                            }`}
                            title={usage > 0 ? "No se puede eliminar porque está en uso" : "Eliminar"}
                          >
                            <span className="material-symbols-outlined text-[12px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </section>
            </div>
          )}

          {/* ─── FACTURACION ─── */}
          {activeTab === 'facturacion' && (
            <div className="bg-white rounded-xl border border-[#c2c6d6] flex flex-col items-center justify-center py-16 px-4 gap-4 animate-fade-in">
              <div className="w-14 h-14 bg-[#d5e0f8] rounded-2xl flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-3xl text-[#0058be]">payments</span>
              </div>
              <div className="text-center max-w-[320px]">
                <h2 className="text-sm font-bold text-[#191b23]">Módulo de Facturación</h2>
                <p className="text-[#424754] text-xs font-semibold mt-2 leading-relaxed">
                  Las pasarelas de pago y las facturas se asocian directamente con los planes administrados en la pestaña de <button onClick={() => setActiveTab('paquetes')} className="text-[#0058be] hover:underline font-bold">Paquetes</button>.
                </p>
              </div>
            </div>
          )}

          {/* ─── MAPA DE APLICACIONES ─── */}
          {activeTab === 'mapa' && (
            <div className="space-y-4 animate-fade-in">
              {/* Global Ecosystem Stats */}
              <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-2xl p-5 shadow-lg border border-neutral-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-amber-400">gavel</span>
                      <h2 className="text-base font-extrabold tracking-tight">Reglas del Ecosistema Boga Market</h2>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 max-w-[650px] leading-relaxed">
                      Para asegurar que todas las tiendas se sientan como aplicaciones nativas, rápidas y profesionales, implementamos una taxonomía de cumplimiento. Monitorea y audita cada regla por tienda aquí.
                    </p>
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 shrink-0 text-center md:text-right">
                    <p className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 leading-none">Promedio Global</p>
                    <p className="text-2xl font-black text-white mt-1">83%</p>
                  </div>
                </div>
              </div>

              {/* Grid of Stores Compliancy Audit */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rules List Sidebar */}
                <div className="bg-white border border-[#c2c6d6] rounded-2xl p-4 shadow-sm space-y-4 col-span-1">
                  <h3 className="font-extrabold text-xs text-[#191b23] border-b border-[#ecedf7] pb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#424754] font-bold">menu_book</span>
                    Glosario de Reglas
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: "1. PWA para Formar Icono", desc: "Todas las tiendas deben tener PWA (Progressive Web App). Permite que la app se instale en el celular del cliente con su propio icono, sin ir a App Stores." },
                      { title: "2. Módulo de Productos", desc: "Estructura unificada de productos en base de datos. Cada producto debe estar enlazado a su respectiva tienda e incluir imágenes de alta resolución." },
                      { title: "3. Recuadro de Características", desc: "Los productos deben llevar especificaciones claras: tallas, colores, materiales, peso o descripciones ricas de ficha técnica." },
                      { title: "4. Categorías Estructuradas", desc: "Cada aplicación debe tener al menos 3 categorías en su menú para permitir navegación fluida (ej. Sunset: Cocina, Bar, Café)." },
                      { title: "5. Botón de Pedidos WhatsApp", desc: "Un botón activo de WhatsApp en el carrito/reserva para derivar la orden directamente al comercio y concretar la transacción." },
                      { title: "6. Estilos y Branding", desc: "Tema de color HSL único configurado en el archivo de diseño para adaptar la apariencia visual a la identidad de la tienda." }
                    ].map((rule, idx) => (
                      <div key={idx} className="space-y-1 bg-[#f2f3fd]/55 p-2.5 rounded-xl border border-[#c2c6d6]/65">
                        <p className="font-bold text-[11px] text-[#191b23]">{rule.title}</p>
                        <p className="text-[10px] text-[#424754] leading-relaxed font-semibold">{rule.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance Table / Status */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="bg-white border border-[#c2c6d6] rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-[#f2f3fd] border-b border-[#c2c6d6] flex justify-between items-center">
                      <h3 className="font-bold text-xs text-[#191b23]">Estado de Cumplimiento por Tienda</h3>
                      <span className="text-[9px] font-bold text-[#424754] bg-[#ecedf7] px-2 py-0.5 rounded border border-[#c2c6d6] leading-none">Auditoría Real</span>
                    </div>

                    <div className="divide-y divide-[#ecedf7]">
                      {[
                        {
                          slug: 'sunset',
                          name: 'Sunset Lounge',
                          checks: [true, true, false, true, true, true],
                          notes: 'Le falta agregar especificaciones de ingredientes/tallas en los platos.'
                        },
                        {
                          slug: 'delva',
                          name: 'Delva Market',
                          checks: [true, true, true, true, true, true],
                          notes: '¡Totalmente compatible! 100% de cumplimiento.'
                        },
                        {
                          slug: 'natura',
                          name: 'Natura Market',
                          checks: [true, false, true, true, false, false],
                          notes: 'Falta subir productos a Supabase (usa demo) y configurar número de WhatsApp corporativo.'
                        },
                        {
                          slug: 'amazonia',
                          name: 'Amazonia Market',
                          checks: [true, false, true, true, false, false],
                          notes: 'Pendiente de sincronizar catálogo de artesanías reales y personalizar paleta HSL.'
                        },
                        {
                          slug: 'sweetkittynails',
                          name: 'Sweet Kitty Nails',
                          checks: [true, true, true, true, true, true],
                          notes: 'Módulo de servicios y reservas de citas optimizado con éxito.'
                        },
                        {
                          slug: 'estilosmirka',
                          name: 'Estilos Mirka',
                          checks: [true, true, true, true, true, true],
                          notes: 'Boutique premium en línea. Cumple con todos los estándares.'
                        }
                      ].map((app) => {
                        const passedCount = app.checks.filter(Boolean).length;
                        const pct = Math.round((passedCount / app.checks.length) * 100);
                        const isGold = pct === 100;
                        return (
                          <div key={app.slug} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#f2f3fd]/10 transition-colors">
                            <div className="space-y-1 sm:max-w-[280px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">{META[app.slug]?.emoji || '🏪'}</span>
                                <span className="font-bold text-xs text-[#191b23]">{app.name}</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                                  isGold ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'
                                }`}>
                                  {pct}%
                                </span>
                              </div>
                              <p className="text-[10px] text-[#424754] font-semibold truncate leading-tight">/{app.slug} · {passedCount} de 6 reglas</p>
                              <p className="text-[10px] text-[#424754] leading-normal italic">{app.notes}</p>
                            </div>

                            {/* Interactive status indicators */}
                            <div className="flex flex-wrap items-center gap-1">
                              {[
                                { label: 'PWA', icon: 'phone_android' },
                                { label: 'PROD', icon: 'shopping_bag' },
                                { label: 'FICHA', icon: 'assignment' },
                                { label: 'CAT', icon: 'category' },
                                { label: 'WSP', icon: 'chat' },
                                { label: 'ESTILO', icon: 'palette' }
                              ].map((rule, idx) => {
                                const checked = app.checks[idx];
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold cursor-help transition-colors ${
                                      checked
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-red-50 border-red-200 text-[#ba1a1a]'
                                    }`}
                                    title={`${rule.label}: ${checked ? 'Cumplido' : 'Pendiente'}`}
                                  >
                                    <span className="material-symbols-outlined text-[10px] font-bold">
                                      {checked ? 'check' : 'warning'}
                                    </span>
                                    {rule.label}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>

    {/* ── CREATE / EDIT PACKAGE MODAL ── */}
    {showPackageModal && (
      <div className="fixed inset-0 z-[200] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[460px] max-w-[460px] max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between shrink-0">
            <h3 className="font-bold text-sm text-[#191b23]">
              {editingPackage ? 'Editar Nivel de Suscripción' : 'Crear Nuevo Nivel'}
            </h3>
            <button 
              onClick={() => setShowPackageModal(false)}
              className="w-7 h-7 flex items-center justify-center text-[#424754] hover:bg-[#e6e7f2] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          
          <form onSubmit={handleSavePackage} className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Nombre del Plan</label>
              <input
                type="text"
                required
                placeholder="Ej. Pro Bundle, Basic Tier"
                value={packageForm.name}
                onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Precio Mensual ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ej. 129"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Etiqueta</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Entry Level, Scale"
                  value={packageForm.badge}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, badge: e.target.value }))}
                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Características (separadas por comas)</label>
              <textarea
                required
                rows={2}
                placeholder="Ej. 25 Users, Priority Support, API Access"
                value={packageForm.features}
                onChange={(e) => setPackageForm(prev => ({ ...prev, features: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Imagen del Banner (URL)</label>
              <input
                type="text"
                placeholder="Ej. https://url-de-la-imagen.png"
                value={packageForm.bannerUrl}
                onChange={(e) => setPackageForm(prev => ({ ...prev, bannerUrl: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
            </div>

            <div className="space-y-3 bg-[#f2f3fd]/55 p-4 rounded-xl border border-[#c2c6d6]/60">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-[#424754]">¿Plan Destacado / Popular?</span>
                <Toggle on={packageForm.isPopular} onChange={() => setPackageForm(prev => ({ ...prev, isPopular: !prev.isPopular }))} />
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-[#c2c6d6]/40 pt-2">
                <span className="text-xs font-bold text-[#424754]">¿Plan Activo?</span>
                <Toggle on={packageForm.active} onChange={() => setPackageForm(prev => ({ ...prev, active: !prev.active }))} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setShowPackageModal(false)}
                className="flex-1 py-2.5 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs hover:bg-[#e6e7f2] transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-lg transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                Guardar Nivel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

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
              <div className="flex gap-1 bg-[#f2f4f8] p-1 rounded-xl">
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
                className="px-4 py-2 bg-[#0058be] text-white rounded-xl font-bold text-xs hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[14px]">{saving ? 'progress_activity' : 'publish'}</span>
                {saving ? 'Guardando...' : 'Publish Changes'}
              </button>
              <div className="w-8 h-8 rounded-xl border border-[#c2c6d6]/60 flex items-center justify-center bg-white cursor-pointer hover:bg-[#f2f3fd] transition-colors text-[#545f73]">
                <span className="material-symbols-outlined text-[18px]">notifications</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#0058be]/10 border border-[#0058be]/20 flex items-center justify-center text-xs font-bold text-[#0058be]">
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
                  
                  {/* OPTIMIZATION SCORE */}
                  <div className="border border-[#ecedf7] bg-[#f8fafc] rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-extrabold text-[#191b23]">Optimization Score</span>
                      <span className="text-sm font-black text-[#0058be]">75%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#d5e0f8] rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-[#0058be] rounded-full" style={{ width: '75%' }} />
                    </div>
                    <p className="text-[10px] text-[#545f73] font-medium leading-relaxed">
                      Your SEO and performance are looking good. Add alt text to images to reach 90%.
                    </p>
                  </div>

                  {/* LOGO Y MARCA */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">auto_awesome</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Logo y Marca</h3>
                    </div>

                    {/* Logo container box */}
                    <div className="border border-[#ecedf7] rounded-2xl p-4 bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
                      {logoPreview ? (
                        <img src={logoPreview} className="w-16 h-16 rounded-2xl object-cover border border-[#c2c6d6]/40 shadow-md" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-white border border-[#c2c6d6]/40 flex items-center justify-center text-3xl shadow-md">
                          {storeForm.emoji || '🏪'}
                        </div>
                      )}
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-[#c2c6d6] rounded-xl cursor-pointer hover:bg-[#f2f3fd] transition-colors text-xs font-bold text-[#545f73]">
                            <span className="material-symbols-outlined text-[16px]">upload</span>
                            Subir logo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
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

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Nombre de la Tienda</label>
                        <input
                          type="text"
                          required
                          value={storeForm.name}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-xl px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] focus:bg-white transition-all shadow-xs"
                          placeholder="Nombre comercial"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Lema / Subtítulo</label>
                        <input
                          type="text"
                          value={storeForm.tagline}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, tagline: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-xl px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] focus:bg-white transition-all shadow-xs"
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
                            className={`w-full bg-[#f8fafc] border rounded-xl px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:bg-white transition-all shadow-xs pr-8 ${
                              slugChecking ? 'border-[#c2c6d6]' :
                              slugAvailable === null ? 'border-[#ecedf7]' :
                              slugAvailable ? 'border-[#16a34a]' : 'border-[#dc2626]'
                            }`}
                            placeholder="enlace-tienda"
                            disabled={!!editingStore}
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
                      </div>
                    </div>
                  </section>

                  {/* PALETA DE COLORES */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">palette</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Paleta de Colores</h3>
                    </div>

                    {/* Color Swatches Grid from Template Theme */}
                    {(() => {
                      const tplKey = storeForm.template as string;
                      const tplTheme = getTemplate(tplKey)?.theme || {
                        primary: '#0058be', secondary: '#545f73', background: '#f9f9ff', surface: '#ffffff'
                      };
                      return (
                        <div className="space-y-3">
                          <div className="flex gap-2.5">
                            {[tplTheme.primary, tplTheme.secondary || '#545f73', tplTheme.background, tplTheme.surface].map((color, i) => (
                              <div
                                key={i}
                                className="w-10 h-10 rounded-xl border border-[#ecedf7] flex items-center justify-center shadow-xs cursor-pointer hover:scale-105 transition-transform"
                                style={{ backgroundColor: color }}
                                title={`Color ${i + 1}: ${color}`}
                              >
                                <div className="w-2.5 h-2.5 rounded-full bg-white/40 border border-white/60" />
                              </div>
                            ))}
                            {/* Dotted Plus Swatch */}
                            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[#c2c6d6] flex items-center justify-center text-[#727785] cursor-pointer hover:bg-[#f2f3fd] transition-colors">
                              <span className="material-symbols-outlined text-sm font-bold">add</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-[#f8fafc] rounded-2xl border border-[#ecedf7]">
                            <span className="text-[10px] font-bold text-[#424754] uppercase tracking-wider">Modo Oscuro</span>
                            <Toggle on={tplTheme.background === '#191b23' || tplTheme.background === '#121212'} onChange={() => {}} />
                          </div>
                        </div>
                      );
                    })()}
                  </section>

                  {/* TIPOGRAFÍA */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">font_download</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Tipografía</h3>
                    </div>

                    <div className="space-y-2">
                      {[
                        { name: 'Inter', desc: 'San Serif Moderno', fontClass: 'font-sans', selected: true },
                        { name: 'Playfair Display', desc: 'Elegante Serif', fontClass: 'font-serif', selected: false }
                      ].map((font) => (
                        <div
                          key={font.name}
                          className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            font.selected
                              ? 'border-[#0058be] bg-[#0058be]/5 ring-2 ring-[#0058be]/10'
                              : 'border-[#ecedf7] hover:border-[#0058be]/30'
                          }`}
                        >
                          <div>
                            <h4 className={`text-xs font-bold text-[#191b23] ${font.fontClass}`}>{font.name}</h4>
                            <p className="text-[9px] font-semibold text-[#727785] mt-0.5">{font.desc}</p>
                          </div>
                          {font.selected && (
                            <span className="material-symbols-outlined text-[#0058be] text-[16px]">check_circle</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ESTRUCTURA DE PÁGINA (PLANTILLAS ORIGINALES) */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#ecedf7] pb-2">
                      <span className="material-symbols-outlined text-[#0058be] text-[16px] font-bold">dashboard</span>
                      <h3 className="text-[10px] font-black text-[#424754] uppercase tracking-widest">Estructura de Página</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {adminTemplates.map((t) => {
                        const isSelected = storeForm.template === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setStoreForm(prev => ({ ...prev, template: t.id as any }))}
                            className={`rounded-2xl overflow-hidden border-2 cursor-pointer transition-all flex flex-col ${
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
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-xl px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
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
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Ubicación</label>
                        <input
                          type="text"
                          value={storeForm.location}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-xl px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                          placeholder="Ej: Bogotá, CO"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#545f73] uppercase tracking-wider mb-1">Paquete Comercial</label>
                        <select
                          value={storeForm.tier}
                          onChange={(e) => setStoreForm(prev => ({ ...prev, tier: e.target.value }))}
                          className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-xl px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
                        >
                          <option value="Basic Tier">Basic Tier</option>
                          <option value="Professional">Professional</option>
                          <option value="Enterprise Plus">Enterprise Plus</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-[#f2f3fd] rounded-2xl border border-[#c2c6d6]/60">
                        <span className="text-xs font-bold text-[#424754]">¿Tienda Activa?</span>
                        <Toggle on={storeForm.active} onChange={() => setStoreForm(prev => ({ ...prev, active: !prev.active }))} />
                      </div>
                    </div>
                  </section>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-[#ecedf7] bg-white shrink-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!storeForm.slug) { alert('Primero ingresa el nombre de la tienda'); return; }
                      if (confirm('¿Insertar productos demo de la plantilla? Los productos existentes no se borrarán.')) {
                        const demo = getDemoProducts(storeForm.template as string);
                        if (demo.length > 0) {
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
                            if (error) alert('Error: ' + error.message);
                            else alert(`✅ ${demo.length} productos demo insertados`);
                          });
                        }
                      }
                    }}
                    className="w-full py-3 bg-[#f0f7ff] border border-[#0058be]/20 text-[#0058be] rounded-xl font-bold text-xs hover:bg-[#e0efff] transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">playlist_add</span>
                    Insertar Productos Demo
                  </button>
                </div>
              </form>
            </aside>
          </div>
        </div>
    )}

    {/* ── DIAGNÓSTICO DE TIENDA ── */}
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
        <div className="bg-white rounded-2xl border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[460px] max-w-[460px] max-h-[90vh] overflow-hidden flex flex-col">
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

    {/* ── CREATE / EDIT TEMPLATE MODAL ── */}
    {showTemplateModal && (
      <div className="fixed inset-0 z-[200] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[460px] max-w-[460px] max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between shrink-0">
            <h3 className="font-bold text-sm text-[#191b23]">
              {editingTemplate ? 'Editar Plantilla Visual' : 'Crear Nueva Plantilla'}
            </h3>
            <button 
              onClick={() => setShowTemplateModal(false)}
              className="w-7 h-7 flex items-center justify-center text-[#424754] hover:bg-[#e6e7f2] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          
          <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Nombre de la Plantilla</label>
              <input
                type="text"
                required
                placeholder="Ej. Sunset Dark, Corporate Pro"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ 
                  ...prev, 
                  name: e.target.value,
                  id: editingTemplate ? prev.id : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Identificador (ID / Slug)</label>
              <input
                type="text"
                required
                disabled={!!editingTemplate}
                placeholder="Ej. sunset-dark"
                value={templateForm.id}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9\-]+/g, '') }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors disabled:bg-[#e6e7f2] disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Categoría Visual</label>
              <select
                value={templateForm.category}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              >
                <option value="Comercio">Comercio</option>
                <option value="Negocios">Negocios</option>
                <option value="Gourmet">Gourmet</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Salud">Salud</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Descripción</label>
              <textarea
                required
                rows={3}
                placeholder="Describe brevemente el estilo y para qué tipos de comercios se recomienda esta plantilla..."
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide font-sans">Imagen de Vista Previa (URL)</label>
              <input
                type="text"
                required
                placeholder="URL de la imagen (de Unsplash u otra fuente)..."
                value={templateForm.previewUrl}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, previewUrl: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
              {templateForm.previewUrl && (
                <div className="mt-2 w-full h-24 rounded-lg overflow-hidden border border-[#c2c6d6]">
                  <img src={templateForm.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 py-2.5 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs hover:bg-[#e6e7f2] transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-lg transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                Guardar Plantilla
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  );
}
