'use client';

import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';
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
  { id: 'paquetes',        icon: 'inventory_2',   label: 'Paquetes' },
  { id: 'usuarios',        icon: 'group',         label: 'Usuarios' },
  { id: 'personalizacion', icon: 'tune',          label: 'Personalización' },
] as const;

interface StoreModule {
  id: string;
  name: string;
  icon: string;
  price: string;
  description: string;
  active: boolean;
  // Desde qué plan de Paquetes conviene ofrecerlo — sugerencia editorial, no
  // gatea nada todavía (Paquetes sigue con sus features sueltas, sin leer
  // esto). Sirve para ordenar la matriz visual de abajo.
  tier: 'Basic' | 'Pro' | 'Enterprise';
  // Qué tan real es hoy en el código, no en la idea. 'parcial' = ya existe
  // algo funcionando por debajo (aunque no esté conectado al toggle de acá);
  // 'no_construido' = es puro catálogo comercial, cero código todavía.
  buildStatus: 'parcial' | 'no_construido';
  buildNote: string;
}

const NO_CODE_YET = 'Todavía no tiene código — es puro catálogo comercial por ahora.';

const INITIAL_MODULES: StoreModule[] = [
  {
    id: 'franquicias',
    name: 'Módulo de Franquicias',
    icon: 'account_tree',
    price: 'S/ 299 /mes',
    description: 'El dueño ve cuánto vende cada sede desde su celular: ranking entre locales y comparativas. Solo tiene sentido una vez que hay más de una sede.',
    active: true,
    tier: 'Enterprise',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'facturacion-electronica',
    name: 'Facturación Electrónica SUNAT',
    icon: 'receipt_long',
    price: 'S/ 0.15 /boleta',
    description: 'Emisión de boletas y facturas electrónicas directo a SUNAT por cada venta procesada en el sistema. Se cobra por boleta enviada, no por mes.',
    active: true,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'business-intelligence',
    name: 'Business Intelligence',
    icon: 'insights',
    price: 'S/ 199 /mes',
    description: 'Predicción de demanda: qué días y en qué sedes conviene contratar más personal, según el historial de ventas.',
    active: false,
    tier: 'Enterprise',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'inventario-inteligente',
    name: 'Inventario Inteligente',
    icon: 'inventory',
    price: 'S/ 149 /mes',
    description: 'No solo dice "hay 10 pollos": avisa "según tus ventas de los últimos 3 viernes, mañana te quedas sin papas a las 8pm — compra más ahora". Alerta predictiva por insumo, no solo conteo de stock.',
    active: false,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'repartidores-propios',
    name: 'Repartidores Propios',
    icon: 'moped',
    price: 'S/ 249 /mes',
    description: 'App mini para que los motorizados del local vean su ruta y marquen "entregado", con mapa en tiempo real para el cliente — un Uber Eats propio del negocio, sin comisión a terceros.',
    active: false,
    tier: 'Enterprise',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'marketing-automatizado',
    name: 'Marketing Automatizado',
    icon: 'campaign',
    price: 'S/ 129 /mes',
    description: 'Correos y SMS automáticos por fecha o comportamiento: "Feliz cumpleaños Juan, hoy tu cuarto de pollo es gratis" o reactivación de clientes que no piden hace semanas.',
    active: false,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'presencia-marketplace',
    name: 'Presencia en el Marketplace BogaHub',
    icon: 'storefront',
    price: 'S/ 99 /mes',
    description: 'Aparecer también en el marketplace compartido de BogaHub (búsqueda y categorías cruzadas entre tiendas), no solo en la tienda propia del negocio. Más alcance, pero comparte vidriera con otros comercios.',
    active: true,
    tier: 'Basic',
    buildStatus: 'parcial',
    buildNote: 'El listado de /market ya muestra todas las tiendas — falta el flag is_public para que activar/desactivar esto cambie algo de verdad.',
  },
  {
    id: 'notificaciones-inteligentes',
    name: 'Notificaciones Inteligentes ("Vecino Cercano")',
    icon: 'notifications_active',
    price: 'S/ 179 /mes',
    description: 'Geofencing: si el cliente pasa a 300m del local, le llega "estás a 2 minutos, ven ahora y te regalamos el café". Es lo mismo que hace Starbucks y les sale carísimo — acá viene incluido. Gamificación: "te faltan 2 pedidos para ser Cliente Oro" — el cliente abre la app solo, sin invadir por WhatsApp.',
    active: false,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'lealtad-digital',
    name: 'Sistema de Lealtad Digital ("Socio Fiel")',
    icon: 'military_tech',
    price: 'S/ 99 /mes',
    description: 'La tarjeta de cartón que sellan y se pierde, digital y sin que se pierda nunca: compra 5 y el 6to gratis, o 1 sol = 1 punto canjeable por extras. Niveles Bronce/Plata/Oro según cuánto vuelve. El valor real para el dueño: "Juan ya tiene 4 sellos, mandale una notificación ahora para que venga hoy por el 5to" — reactivación con nombre y apellido, no un descuento genérico.',
    active: false,
    tier: 'Basic',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'racha-envio-gratis',
    name: 'Racha de Envío Gratis',
    icon: 'local_fire_department',
    price: 'S/ 89 /mes',
    description: 'Mientras el cliente mantenga su racha de pedidos (ej. 1 por semana) tiene envío gratis. Si la corta, la pierde y tiene que reconstruirla desde cero — el mismo gancho que hace que nadie quiera perder su racha en Duolingo.',
    active: false,
    tier: 'Basic',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'app-nativa',
    name: 'App Nativa (Play Store / App Store)',
    icon: 'apps',
    price: 'S/ 1,500 pago único + S/ 79 /mes',
    description: 'Va más allá del PWA (que ya es gratis para todos): empaqueta la tienda como app real, publicada en Google Play y App Store con su propio ícono y ficha. El mantenimiento mensual cubre las actualizaciones que piden ambas tiendas cada tanto.',
    active: false,
    tier: 'Enterprise',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'pasarela-pago-propia',
    name: 'Pasarela de Pago Propia',
    icon: 'credit_card',
    price: 'S/ 0.30 /transacción',
    description: 'Checkout con tarjeta dentro de la misma app (Culqi/Niubiz) en vez de derivar todo a WhatsApp para coordinar el pago. Se cobra por transacción procesada, no por mes.',
    active: false,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: 'Hoy el 100% del checkout de cualquier tienda es "mandale un WhatsApp al dueño" (ver lib/whatsapp.ts) — cero pagos reales todavía.',
  },
  {
    id: 'reservas-citas',
    name: 'Reservas y Citas',
    icon: 'calendar_month',
    price: 'S/ 129 /mes',
    description: 'Calendario de turnos con hora fija en vez de solo catálogo de productos — pensado para salones, clínicas y servicios con cita previa.',
    active: false,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'programa-referidos',
    name: 'Programa de Referidos',
    icon: 'group_add',
    price: 'S/ 89 /mes',
    description: '"Invita a un amigo y ambos ganan": código de referido con recompensa automática tanto para quien invita como para el invitado en su primer pedido.',
    active: false,
    tier: 'Basic',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'marca-blanca-total',
    name: 'Marca 100% Blanca',
    icon: 'visibility_off',
    price: 'S/ 149 /mes',
    description: 'Saca cualquier rastro de "Powered by BogaHub" de la tienda — para el comercio que no quiere que se note qué tecnología usa por debajo.',
    active: false,
    tier: 'Enterprise',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'resenas-reales',
    name: 'Reseñas Reales de Clientes',
    icon: 'rate_review',
    price: 'S/ 79 /mes',
    description: 'Hoy el rating de cada tienda lo carga el comercio a mano en el panel — no sale de compras reales. Este módulo pide reseña al cliente después de cada pedido y calcula el promedio solo, con historial de comentarios.',
    active: false,
    tier: 'Basic',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'analitica-favoritos',
    name: 'Analítica de Favoritos',
    icon: 'favorite',
    price: 'S/ 119 /mes',
    description: 'Los "Me Gusta" del cliente hoy quedan solo en el celular de quien los guardó — el dueño nunca se entera. Este módulo los sincroniza y le muestra qué productos guarda la gente pero no compra: la señal de remarketing más barata que existe.',
    active: false,
    tier: 'Pro',
    buildStatus: 'parcial',
    buildNote: 'Los favoritos ya existen (guardados en el celular del cliente, ver app/orders/page.tsx) — falta sincronizarlos a Supabase para que el dueño los vea.',
  },
  {
    id: 'auto-branding-ia',
    name: 'Auto-Branding con IA',
    icon: 'auto_awesome',
    price: 'S/ 59 /mes',
    description: 'La extracción de colores de logo que hoy solo usás vos desde superadmin, self-service para el dueño: sube su logo o una foto de un plato y la tienda se retematiza sola, sin tener que pedírtelo.',
    active: false,
    tier: 'Basic',
    buildStatus: 'parcial',
    buildNote: 'El motor ya existe y funciona (lib/extractThemeClient.ts) — hoy solo lo usa superadmin, falta exponérselo al dueño.',
  },
  {
    id: 'delivery-zonas-dinamico',
    name: 'Delivery por Zonas con Tarifa Dinámica',
    icon: 'pin_drop',
    price: 'S/ 99 /mes',
    description: 'La "zona" de cada tienda hoy es un texto decorativo. Este módulo la convierte en zonas reales de reparto, cada una con su propio costo de envío y tiempo estimado — en vez de un dato suelto que no cobra nada.',
    active: false,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'happy-hour-automatico',
    name: 'Happy Hour Automático',
    icon: 'bolt',
    price: 'S/ 139 /mes',
    description: 'Detecta las horas muertas del local (ej. martes 3-5pm) y lanza sola un 2x1 o descuento por los próximos 60 minutos. Liquida stock que se iba a malograr y llena el local en horarios flojos, sin que el dueño tenga que acordarse de activarlo.',
    active: false,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'suscripcion-vip',
    name: 'Suscripción VIP (estilo Amazon Prime)',
    icon: 'workspace_premium',
    price: 'S/ 199 /mes + 5% de lo cobrado en suscripciones',
    description: 'El cliente le paga al comercio, por ejemplo S/ 20/mes, y a cambio tiene delivery gratis siempre + 10% de descuento fijo. El dueño gana ingreso asegurado todos los meses aunque el cliente no compre; vos ganás una comisión por administrar esa suscripción dentro de tu plataforma.',
    active: false,
    tier: 'Enterprise',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'reserva-y-pide',
    name: 'Reserva y Pide (Pre-order)',
    icon: 'restaurant_menu',
    price: 'S/ 129 /mes',
    description: '"Llego en 15 minutos, quiero mi pedido servido apenas me siente". El cliente paga desde la app, la cocina recibe la orden al toque, y cuando llega la comida ya está lista — cero colas, cero espera.',
    active: false,
    tier: 'Pro',
    buildStatus: 'no_construido',
    buildNote: NO_CODE_YET,
  },
  {
    id: 'sitio-web-propio',
    name: 'Página Web / Sitio Propio',
    icon: 'language',
    price: 'Desde S/ 199 pago único + S/ 39 /mes',
    description: 'Landing page o catálogo con dominio propio, fuera del ecosistema BogaHub — para SEO y para compartir un link "serio" en redes. El esfuerzo no es el mismo para todos los rubros: una carta de restaurante con pocos platos es mucho más simple que un catálogo de ecommerce con cientos de productos, así que el precio final se cotiza según cuánto tiene la tienda.',
    active: false,
    tier: 'Pro',
    buildStatus: 'parcial',
    buildNote: 'Cada tienda ya tiene su link propio (/slug) que cumple parte de esto — falta el dominio 100% propio y la ficha SEO dedicada.',
  },
];

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
      const url = await uploadFile(file, 'product-images/banners');
      onChange(url);
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
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
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
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'tiendas' | 'usuarios' | 'personalizacion' | 'paquetes'>(
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

  // Banners del carrusel de /market: antes vivian hardcodeados en el codigo
  // (BANNERS_RAW), ahora se editan aca y /market los lee de la tabla
  // market_banners (via el mismo endpoint cacheado /api/catalog).
  const [marketBanners, setMarketBanners] = useState<any[]>([]);
  const [isLoadingMarketBanners, setIsLoadingMarketBanners] = useState(true);
  // Que carrusel se esta editando: /market o el de Inicio "/". Misma tabla,
  // solo cambia el filtro y a que pagina se le asigna lo nuevo.
  const [bannerPageTab, setBannerPageTab] = useState<'market' | 'home'>('market');
  const visibleMarketBanners = React.useMemo(
    () => marketBanners.filter(b => (b.page || 'market') === bannerPageTab),
    [marketBanners, bannerPageTab]
  );
  // Estilo visual de cada carrusel completo (no de cada banner): 'center'
  // (el look de siempre de /market) o 'bottom' (el look de siempre del
  // Inicio). Tabla banner_page_settings, una fila por pagina.
  const [bannerStyles, setBannerStyles] = useState<Record<string, 'center' | 'bottom'>>({ market: 'center', home: 'bottom' });
  const fetchBannerStyles = async () => {
    const { data } = await supabase.from('banner_page_settings').select('page,style');
    if (!data) return;
    setBannerStyles(prev => {
      const next = { ...prev };
      data.forEach((row: any) => { next[row.page] = row.style; });
      return next;
    });
  };
  // /api/catalog cachea hasta ~12 min (s-maxage=120 + stale-while-revalidate=600).
  // Sin esto, guardar/borrar/reordenar un banner (o cambiar el estilo) podia
  // tardar todo eso en verse reflejado en /market, /explore o el Inicio.
  const revalidarCatalogo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/revalidate-catalog', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    } catch { /* no bloquea el guardado si esto falla */ }
  };

  const handleSetBannerStyle = async (style: 'center' | 'bottom') => {
    setBannerStyles(prev => ({ ...prev, [bannerPageTab]: style }));
    const { error } = await supabase.from('banner_page_settings').upsert({ page: bannerPageTab, style }, { onConflict: 'page' });
    if (error) { alert('No se pudo guardar el estilo: ' + error.message); return; }
    await revalidarCatalogo();
  };
  const [editingMarketBannerId, setEditingMarketBannerId] = useState<string | 'new' | null>(null);
  const [marketBannerForm, setMarketBannerForm] = useState({ tag: '', title1: '', title2: '', sub: '', link: '', active: true, showText: true });
  const [marketBannerImageFile, setMarketBannerImageFile] = useState<File | null>(null);
  const [marketBannerImagePreview, setMarketBannerImagePreview] = useState<string | null>(null);
  const [isSavingMarketBanner, setIsSavingMarketBanner] = useState(false);

  const fetchMarketBanners = async () => {
    setIsLoadingMarketBanners(true);
    const { data, error } = await supabase.from('market_banners').select('*').order('sort_order', { ascending: true });
    setIsLoadingMarketBanners(false);
    if (error) { console.error('Error cargando banners:', error); return; }
    setMarketBanners(data || []);
  };

  React.useEffect(() => { fetchMarketBanners(); fetchBannerStyles(); }, []);

  const handleOpenNewMarketBanner = () => {
    setEditingMarketBannerId('new');
    setMarketBannerForm({ tag: '', title1: '', title2: '', sub: '', link: '', active: true, showText: true });
    setMarketBannerImageFile(null);
    setMarketBannerImagePreview(null);
  };

  const handleOpenEditMarketBanner = (b: any) => {
    setEditingMarketBannerId(b.id);
    setMarketBannerForm({ tag: b.tag || '', title1: b.title1 || '', title2: b.title2 || '', sub: b.sub || '', link: b.link || '', active: b.active !== false, showText: b.show_text !== false });
    setMarketBannerImageFile(null);
    setMarketBannerImagePreview(b.image || null);
  };

  const handleSaveMarketBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    // El titulo es opcional a proposito: si la imagen ya trae el texto
    // dibujado (un flyer armado en Canva, etc.), forzar un titulo aca
    // terminaba dibujando el texto de la web ENCIMA del de la imagen,
    // pisados los dos.
    const isNew = editingMarketBannerId === 'new';
    const current = !isNew ? marketBanners.find(b => b.id === editingMarketBannerId) : null;
    if (!marketBannerImageFile && !current?.image) { alert('Falta la imagen del banner.'); return; }
    setIsSavingMarketBanner(true);
    try {
      let imageUrl = current?.image || '';
      if (marketBannerImageFile) {
        imageUrl = await uploadFile(marketBannerImageFile, 'store-assets/market-banners');
      }
      const payload = {
        image: imageUrl,
        tag: marketBannerForm.tag || null,
        title1: marketBannerForm.title1.trim(),
        title2: marketBannerForm.title2 || null,
        sub: marketBannerForm.sub || null,
        link: marketBannerForm.link || null,
        active: marketBannerForm.active,
        show_text: marketBannerForm.showText,
      };
      const fullPayload: Record<string, any> = isNew
        ? { ...payload, sort_order: visibleMarketBanners.reduce((max, b) => Math.max(max, b.sort_order || 0), 0) + 1, page: bannerPageTab }
        : payload;

      const escribir = () =>
        isNew
          ? supabase.from('market_banners').insert([fullPayload])
          : supabase.from('market_banners').update(fullPayload).eq('id', editingMarketBannerId);

      let { error } = await escribir();

      // Mismo problema de siempre: si `show_text` o `page` todavia no existen
      // en la base (falta correr la migracion), reintenta sin esa columna en
      // vez de que el banner entero no se pueda guardar.
      const columnasOpcionales = ['show_text', 'page'];
      const columnasFaltantes: string[] = [];
      let faltante = columnasOpcionales.find((col) => col in fullPayload && new RegExp(col).test(error?.message || ''));
      while (error && faltante) {
        delete fullPayload[faltante];
        columnasFaltantes.push(faltante);
        ({ error } = await escribir());
        faltante = columnasOpcionales.find((col) => col in fullPayload && new RegExp(col).test(error?.message || ''));
      }
      if (!error && columnasFaltantes.length) {
        alert(`Banner guardado, pero faltó correr una migración pendiente en Supabase para: ${columnasFaltantes.join(', ')}.`);
      }
      if (error) throw error;

      setEditingMarketBannerId(null);
      await fetchMarketBanners();
      await revalidarCatalogo();
    } catch (err: any) {
      alert('No se pudo guardar el banner: ' + err.message);
    } finally {
      setIsSavingMarketBanner(false);
    }
  };

  const handleDeleteMarketBanner = async (id: string) => {
    if (!confirm('¿Eliminar este banner?')) return;
    const { error } = await supabase.from('market_banners').delete().eq('id', id);
    if (error) { alert('No se pudo eliminar: ' + error.message); return; }
    setMarketBanners(prev => prev.filter(b => b.id !== id));
    await revalidarCatalogo();
  };

  const handleMoveMarketBanner = async (id: string, direction: -1 | 1) => {
    const idx = visibleMarketBanners.findIndex(b => b.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= visibleMarketBanners.length) return;
    const a = visibleMarketBanners[idx];
    const b = visibleMarketBanners[swapIdx];
    setMarketBanners(prev => prev.map(x => {
      if (x.id === a.id) return { ...x, sort_order: b.sort_order };
      if (x.id === b.id) return { ...x, sort_order: a.sort_order };
      return x;
    }));
    await Promise.all([
      supabase.from('market_banners').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('market_banners').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    await revalidarCatalogo();
  };

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


  // Usuarios state — se arma de datos reales (perfiles + dueños de tienda), no
  // de una lista inventada: ver `derivedUsers` mas abajo.
  const ROLES = ['super_admin', 'store_admin'] as const;
  type UserRole = typeof ROLES[number];
  interface UserRow { id: string; email: string; name: string; role: UserRole; store: string; status: 'activo' | 'pendiente' }
  const [profiles, setProfiles] = useState<{ id: string; email: string; name: string | null }[]>([]);
  const [storeOwners, setStoreOwners] = useState<Record<string, string | null>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStore, setInviteStore] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('store_admin');
  const [inviteSent, setInviteSent] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editingUserOriginalStore, setEditingUserOriginalStore] = useState('');
  // Solo se usa en el panel de Usuarios (no en el modal de "administrador de
  // esta tienda puntual", que sigue siendo de una sola por diseño): las
  // tiendas que va a terminar administrando esta persona al guardar.
  const [editingUserStores, setEditingUserStores] = useState<Set<string>>(new Set());
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  // Slug de la tienda cuyo modal de "Asignar/Editar Administrador" está
  // abierto (se abre desde la fila en Gestión de Tiendas, sin cambiar de
  // pestaña). Reutiliza el mismo estado de invitación/edición que Usuarios.
  const [assignStoreSlug, setAssignStoreSlug] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.from('profiles').select('*').then(({ data, error }) => {
      if (error) { console.error('Error fetching profiles:', error); return; }
      setProfiles(data || []);
    });
  }, []);

  // Un usuario real (con cuenta) por fila: primero vos como superadmin,
  // despues una fila por cada tienda que administra cada quien, y por ultimo
  // quien ya tiene cuenta pero todavia no administra ninguna tienda (se
  // registro solo, o vos lo invitaste y ya entro).
  //
  // Solo aparece TU fila de superadmin: quien manda es public.is_superadmin()
  // en la base, y esa funcion contesta por el usuario actual, no devuelve la
  // lista. Es el precio de no tener los correos escritos en el navegador. Si
  // algun dia hay mas de un superadmin, conviene moverlos a una tabla.
  const derivedUsers = React.useMemo<UserRow[]>(() => {
    const rows: UserRow[] = [];
    const idsConFila = new Set<string>();

    if (authUser?.id && authUser.email) {
      const p = profiles.find((pr) => pr.id === authUser.id);
      rows.push({ id: authUser.id, email: authUser.email, name: p?.name || 'Super Admin', role: 'super_admin', store: '', status: 'activo' });
      idsConFila.add(authUser.id);
    }

    // Una fila por cada tienda asignada, incluidas las que te asignaste a vos
    // mismo como superadmin: si no, la tienda parece sin dueño de nuevo (el
    // botón vuelve a decir "Asignar" en vez de "Editar") apenas te la asignás.
    Object.entries(storeOwners).forEach(([slug, ownerId]) => {
      if (!ownerId) return;
      const p = profiles.find((pr) => pr.id === ownerId);
      rows.push({ id: ownerId, email: p?.email || ownerId, name: p?.name || p?.email || '(sin perfil todavía)', role: 'store_admin', store: slug, status: 'activo' });
      idsConFila.add(ownerId);
    });

    // Tiene cuenta pero ninguna tienda todavia: aca es donde vos lo "ascendes"
    // con Editar, sin mandarle nada de nuevo.
    profiles.forEach((p) => {
      if (idsConFila.has(p.id)) return;
      rows.push({ id: p.id, email: p.email, name: p.name || p.email, role: 'store_admin', store: '', status: 'activo' });
    });

    return rows;
  }, [profiles, storeOwners, authUser]);

  // Agrupa las filas de derivedUsers por persona: antes un dueño de varias
  // tiendas (ej. vos, el superadmin) aparecia como el mismo correo repetido
  // una vez por tienda, como si fueran cuentas distintas.
  const groupedUsers = React.useMemo(() => {
    const porId = new Map<string, { id: string; email: string; name: string; role: UserRole; status: UserRow['status']; filas: UserRow[] }>();
    derivedUsers.forEach((u) => {
      const g = porId.get(u.id);
      if (g) g.filas.push(u);
      else porId.set(u.id, { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, filas: [u] });
    });
    return Array.from(porId.values());
  }, [derivedUsers]);
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const toggleExpandedUser = (id: string) => setExpandedUserIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Cuentas que ya existen (se registraron solo, o vos las invitaste y ya
  // entraron) pero todavía no administran ninguna tienda. Sirve para poder
  // asignarle una tienda a alguien que ya tiene cuenta, en vez de mandarle
  // siempre una invitación nueva por correo.
  // Incluye también al superadmin: puede querer administrar una tienda
  // puntual desde el /admin normal, aparte de su acceso total en /superadmin.
  const usuariosSinTienda = React.useMemo(
    () => derivedUsers.filter((u) => !u.store),
    [derivedUsers]
  );

  const [asignandoExistente, setAsignandoExistente] = useState(false);
  const handleAsignarExistente = async (usuarioId: string) => {
    if (!assignStoreSlug || !usuarioId) return;
    setAsignandoExistente(true);
    const { error } = await supabase.from('stores').update({ user_id: usuarioId }).eq('slug', assignStoreSlug);
    setAsignandoExistente(false);
    if (error) { alert('No se pudo asignar: ' + error.message); return; }
    setStoreOwners((prev) => ({ ...prev, [assignStoreSlug]: usuarioId }));
    setAssignStoreSlug(null);
  };

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
  // Fijos: nada los modifica, solo se listan.
  const archivedPackages = [
    { id: 'archive-1', name: 'Legacy Basic (v1)', price: 29, usersCount: '1,240', active: false },
    { id: 'archive-2', name: 'Early Adopter Special', price: 15, usersCount: '450', active: true },
  ];

  // Módulos de expansión + qué tiendas los tienen activos. Igual que
  // "packages", vive solo en memoria por ahora (no hay tabla en Supabase
  // todavía) — se resetea al recargar. Cuando haya que persistirlo de verdad,
  // es una tabla store_modules (store_id, module_id, active).
  const [modules, setModules] = useState<StoreModule[]>(INITIAL_MODULES);
  const [moduleStoreLinks, setModuleStoreLinks] = useState<Record<string, string[]>>({});

  const toggleModuleActive = (id: string) => {
    setModules(prev => prev.map(m => (m.id === id ? { ...m, active: !m.active } : m)));
  };

  const toggleModuleForStore = (moduleId: string, slug: string) => {
    setModuleStoreLinks(prev => {
      const current = prev[moduleId] || [];
      const next = current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug];
      return { ...prev, [moduleId]: next };
    });
  };

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

  // Ademas de mandar/copiar el link, si se eligio tienda le asigna el user_id
  // ya mismo: generateLink (con la service_role key, solo en /api) resuelve o
  // crea la cuenta y devuelve su id de una, sin esperar a que la persona
  // toque el link. Antes esto quedaba pendiente ("volvé a mano despues").
  const asignarTiendaInvitada = async (userId: string | null | undefined) => {
    if (!userId || inviteRole !== 'store_admin' || !inviteStore) return;
    const { error } = await supabase.from('stores').update({ user_id: userId }).eq('slug', inviteStore);
    if (error) { alert(`Se invitó, pero no se pudo asignar la tienda: ${error.message}`); return; }
    setStoreOwners(prev => ({ ...prev, [inviteStore]: userId }));
  };

  // Manda un link de acceso real por correo (magic link: si el correo no
  // tiene cuenta, Supabase la crea sola al tocarlo).
  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setIsSendingInvite(true);
    const redirectTo = `${window.location.origin}${inviteRole === 'super_admin' ? '/superadmin' : '/admin'}`;
    const { error } = await supabase.auth.signInWithOtp({ email: inviteEmail, options: { emailRedirectTo: redirectTo } });
    if (error) {
      setIsSendingInvite(false);
      alert('No se pudo enviar la invitación: ' + error.message);
      return;
    }
    // signInWithOtp no devuelve el id del usuario (a proposito, para no poder
    // enumerar correos desde el cliente): se resuelve aparte por /api con la
    // service_role key, solo para asignar la tienda ya mismo.
    if (inviteRole === 'store_admin' && inviteStore) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/generate-invite-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ email: inviteEmail, redirectTo }),
        });
        const data = await res.json();
        if (res.ok) await asignarTiendaInvitada(data.userId);
      } catch { /* la invitacion ya se mando; la asignacion se puede hacer a mano despues */ }
    }
    setIsSendingInvite(false);
    setInviteSent(true);
    setTimeout(() => {
      setInviteEmail(''); setInviteStore(''); setInviteRole('store_admin'); setInviteSent(false);
    }, 2600);
  };

  // Alternativa a mandar el correo: genera el mismo link de acceso y lo
  // copia, para poder mandarlo vos por WhatsApp. Pasa por /api porque hace
  // falta la service_role key, que nunca debe tocar el navegador.
  const handleCopyInviteLink = async (linkType: 'login' | 'password' = 'login') => {
    if (!inviteEmail) return;
    setIsCopyingLink(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // 'login': entra directo, sin contraseña. 'password': cae en
      // /reset-password para que la persona elija su propia contraseña (y
      // de ahi en mas pueda entrar por /login con correo + clave, sin
      // depender de un link nuevo cada vez).
      const redirectTo = linkType === 'password'
        ? `${window.location.origin}/reset-password`
        : `${window.location.origin}${inviteRole === 'super_admin' ? '/superadmin' : '/admin'}`;
      const res = await fetch('/api/generate-invite-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: inviteEmail, redirectTo, linkType }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'No se pudo generar el link'); return; }
      await asignarTiendaInvitada(data.userId);
      await navigator.clipboard.writeText(data.link);
      alert(linkType === 'password'
        ? 'Link copiado — al tocarlo va a poder crear su propia contraseña.'
        : 'Link copiado — mandalo por WhatsApp o donde prefieras.');
    } catch (err: any) {
      alert('No se pudo copiar el link: ' + err.message);
    } finally {
      setIsCopyingLink(false);
    }
  };

  // Abre el panel de Usuarios (no el modal de una tienda puntual) precargando
  // TODAS las tiendas que esta persona ya administra, para el checklist de
  // "Tiendas Asignadas".
  const abrirEditorUsuarioMulti = (u: UserRow) => {
    // Fuerza 'store_admin' aca: esto solo edita que tiendas administra, no el
    // rol — si dejara 'super_admin' (la fila del superadmin mismo), el guard
    // de handleSaveUser bloquearia el guardado por completo.
    setEditingUser({ ...u, role: 'store_admin' });
    setEditingUserOriginalStore(u.store);
    setEditingUserStores(new Set(
      Object.entries(storeOwners).filter(([, id]) => id === u.id).map(([slug]) => slug)
    ));
    setInviteSent(false);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    if (editingUser.role === 'super_admin') {
      alert(
        'El acceso de Super Admin sale de la función is_superadmin() en la base de datos, no de esta tabla.\n\n' +
        'Para dar acceso total a otra persona hay que editar esa función en el SQL editor de Supabase — avisame y lo hago.'
      );
      return;
    }
    await supabase.from('profiles').update({ name: editingUser.name }).eq('id', editingUser.id);

    if (assignStoreSlug) {
      // Modal de "administrador de esta tienda puntual": una sola, como siempre.
      if (editingUserOriginalStore && editingUserOriginalStore !== editingUser.store) {
        await supabase.from('stores').update({ user_id: null }).eq('slug', editingUserOriginalStore);
      }
      if (editingUser.store) {
        const { error } = await supabase.from('stores').update({ user_id: editingUser.id }).eq('slug', editingUser.store);
        if (error) { alert('No se pudo guardar: ' + error.message); return; }
      }
      setStoreOwners(prev => {
        const next = { ...prev };
        if (editingUserOriginalStore) next[editingUserOriginalStore] = null;
        if (editingUser.store) next[editingUser.store] = editingUser.id;
        return next;
      });
    } else {
      // Panel de Usuarios: puede quedar administrando varias tiendas a la vez.
      const actuales = new Set(
        Object.entries(storeOwners).filter(([, id]) => id === editingUser.id).map(([slug]) => slug)
      );
      const aAsignar = [...editingUserStores].filter((slug) => !actuales.has(slug));
      const aQuitar = [...actuales].filter((slug) => !editingUserStores.has(slug));
      for (const slug of aAsignar) {
        const { error } = await supabase.from('stores').update({ user_id: editingUser.id }).eq('slug', slug);
        if (error) { alert(`No se pudo asignar "${stores[slug]?.name || slug}": ${error.message}`); return; }
      }
      for (const slug of aQuitar) {
        const { error } = await supabase.from('stores').update({ user_id: null }).eq('slug', slug);
        if (error) { alert(`No se pudo quitar "${stores[slug]?.name || slug}": ${error.message}`); return; }
      }
      setStoreOwners(prev => {
        const next = { ...prev };
        aAsignar.forEach((slug) => { next[slug] = editingUser.id; });
        aQuitar.forEach((slug) => { next[slug] = null; });
        return next;
      });
    }

    setProfiles(prev => prev.map(p => p.id === editingUser.id ? { ...p, name: editingUser.name } : p));
    setEditingUser(null);
  };

  // "Revocar" acá significa quitarle la tienda asignada — no se puede borrar
  // la cuenta de auth.users desde el navegador sin la service_role key.
  const handleRevokeAccess = async (u: UserRow) => {
    if (u.role === 'super_admin') {
      alert('El acceso de Super Admin sale de is_superadmin() en la base de datos, no se puede revocar desde acá.');
      return;
    }
    if (!confirm(`¿Quitarle a ${u.email} el acceso a "${stores[u.store]?.name || u.store}"?`)) return;
    const { error } = await supabase.from('stores').update({ user_id: null }).eq('slug', u.store);
    if (error) { alert('No se pudo revocar: ' + error.message); return; }
    setStoreOwners(prev => ({ ...prev, [u.store]: null }));
    if (editingUser?.id === u.id) setEditingUser(null);
  };

  // Los campos de invitación se usan en dos lados: el panel de la pestaña
  // Usuarios y el modal que se abre desde Gestión de Tiendas. La única
  // diferencia real es que el panel deja elegir rol y tienda, y el modal ya
  // sabe de qué tienda se trata. Es una función y no un componente a propósito:
  // así el JSX queda inline y el input no pierde el foco al re-renderizar.
  const camposInvitacion = (conSelectores: boolean) => {
    const faltaTienda = conSelectores && inviteRole === 'store_admin' && !inviteStore;
    return (
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Correo Electrónico</label>
          <input
            type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="admin@sutienda.com"
            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] focus:bg-white transition-colors"
          />
        </div>
        {conSelectores && (
          <>
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
          </>
        )}
        <div className={`flex gap-2 ${conSelectores ? 'mt-2' : ''}`}>
          <button
            onClick={handleSendInvite}
            disabled={isSendingInvite || !inviteEmail || faltaTienda}
            className="flex-1 py-2.5 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSendingInvite ? 'animate-spin' : ''}`}>{isSendingInvite ? 'progress_activity' : 'send'}</span>
            {isSendingInvite ? 'Enviando...' : 'Enviar por correo'}
          </button>
          <button
            onClick={() => handleCopyInviteLink('login')}
            disabled={isCopyingLink || !inviteEmail || faltaTienda}
            title="Copiar link de acceso directo, sin contraseña (para mandar por WhatsApp)"
            className="w-11 shrink-0 py-2.5 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs flex items-center justify-center hover:bg-[#e6e7f2] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[16px] ${isCopyingLink ? 'animate-spin' : ''}`}>{isCopyingLink ? 'progress_activity' : 'content_copy'}</span>
          </button>
          <button
            onClick={() => handleCopyInviteLink('password')}
            disabled={isCopyingLink || !inviteEmail || faltaTienda}
            title="Copiar link para que elija su propia contraseña (para mandar por WhatsApp)"
            className="w-11 shrink-0 py-2.5 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs flex items-center justify-center hover:bg-[#e6e7f2] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[16px] ${isCopyingLink ? 'animate-spin' : ''}`}>{isCopyingLink ? 'progress_activity' : 'key'}</span>
          </button>
        </div>
      </div>
    );
  };

  // Mismo aviso de "ya salió el link" para los dos lados; cambia el texto y, en
  // el modal, un botón para cerrarlo.
  const avisoInvitacionEnviada = (mensaje: string, alCerrar?: () => void) => (
    <div className="p-6 text-center">
      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
        <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
      </div>
      <h3 className="text-sm font-bold text-[#191b23] mb-1">¡Link enviado!</h3>
      <p className="text-xs text-[#424754] font-semibold">{mensaje}</p>
      {alCerrar && (
        <button
          onClick={alCerrar}
          className="mt-4 w-full py-2 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs hover:bg-[#e6e7f2] transition-colors"
        >
          Cerrar
        </button>
      )}
    </div>
  );

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
      const columnasOpcionales = ['whatsapp', 'zona', 'direccion', 'horario', 'rating', 'show_demo_products', 'metodos_pago', 'facebook', 'instagram', 'tiktok', 'external_url', 'subdominio_activo'];
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
      if (!!storeForm.subdominioActivo !== antesActivo) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('/api/subdominio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
            body: JSON.stringify({ slug, activo: !!storeForm.subdominioActivo }),
          });
          const j = await res.json().catch(() => ({}));
          const detalle = (j.detalle || [j.error]).filter(Boolean).join('\n');
          alert(res.ok
            ? `Subdominio ${storeForm.subdominioActivo ? 'activado' : 'desactivado'}:\n${detalle}`
            : `La tienda se guardó, pero el subdominio NO se pudo ${storeForm.subdominioActivo ? 'activar' : 'desactivar'}:\n${detalle}`);
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
            onClick={() => {
              if (activeTab === 'paquetes') {
                handleOpenCreatePackage();
              } else {
                setActiveTab('paquetes');
                setTimeout(handleOpenCreatePackage, 100);
              }
            }}
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
                  className="h-10 px-4 bg-[#0058be] text-white font-bold text-xs rounded-md flex items-center gap-1.5 hover:shadow-lg transition-all active:scale-95 shrink-0 self-start"
                >
                  <span className="material-symbols-outlined text-sm">add_box</span>
                  Crear Nuevo Paquete
                </button>
              </div>

              {/* Metrics Bento Grid */}
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 p-5 bg-white border border-[#c2c6d6] rounded-md flex flex-col justify-between relative overflow-hidden">
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

                <div className="p-5 bg-white border border-[#c2c6d6] rounded-md flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Activos</span>
                    <div className="text-2xl font-bold mt-1 text-[#0058be]">{packages.filter(p => p.active).length}</div>
                  </div>
                  <div className="h-1.5 w-full bg-[#ecedf7] rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-[#0058be]" style={{ width: `${(packages.filter(p => p.active).length / packages.length) * 100}%` }}></div>
                  </div>
                </div>

                <div className="p-5 bg-white border border-[#c2c6d6] rounded-md flex flex-col justify-between">
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
                        className={`group bg-white border rounded-md overflow-hidden transition-all duration-200 flex flex-col hover:translate-y-[-2px] hover:shadow-md ${
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

              {/* Qué incluye cada plan: cruza los paquetes de arriba con el catálogo de
                  módulos pagos de "Módulos y Estrategia" (modules.tier los ordena). Los
                  ids 'starter'/'pro'/'enterprise' son los 3 paquetes de fábrica — si se
                  borran o renombran, cae al nombre genérico Basic/Pro/Enterprise. */}
              <section className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#191b23]">¿Qué Incluye Cada Plan?</h3>
                  <p className="text-xs text-[#424754] mt-1">
                    Cruce entre estos paquetes y el catálogo de módulos pagos (pestaña "Módulos y Estrategia"). Sugerencia editorial: todavía no gatea nada automáticamente.
                  </p>
                </div>

                <div className="bg-[#f2f3fd] border border-[#c2c6d6] rounded-md p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#0058be] shrink-0">check_circle</span>
                  <p className="text-[10px] text-[#424754] leading-relaxed">
                    <span className="font-bold text-[#191b23]">Incluido siempre, en cualquier plan: </span>
                    App Instalable (PWA), Catálogo de Productos, Categorías Estructuradas, Botón de WhatsApp, Estilos y Branding — el detalle está en el Glosario de Reglas, dentro de Mapa de Apps.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['Basic', 'Pro', 'Enterprise'] as const).map((tier) => {
                    const packageIdByTier: Record<'Basic' | 'Pro' | 'Enterprise', string> = { Basic: 'starter', Pro: 'pro', Enterprise: 'enterprise' };
                    const linkedPackage = packages.find(p => p.id === packageIdByTier[tier]);
                    const tierMods = modules.filter(m => m.tier === tier);
                    const cumulativeCount = modules.filter(m =>
                      tier === 'Basic' ? m.tier === 'Basic' :
                      tier === 'Pro' ? (m.tier === 'Basic' || m.tier === 'Pro') :
                      true
                    ).length;
                    return (
                      <div key={tier} className="bg-white border border-[#c2c6d6] rounded-md overflow-hidden flex flex-col">
                        <div className={`px-4 py-3 border-b border-[#c2c6d6] ${
                          tier === 'Basic' ? 'bg-emerald-50' : tier === 'Pro' ? 'bg-amber-50' : 'bg-violet-50'
                        }`}>
                          <p className="text-xs font-bold text-[#191b23]">{linkedPackage?.name || tier}</p>
                          {linkedPackage && <p className="text-[9px] text-[#424754] font-semibold">${linkedPackage.price}/mes · {cumulativeCount} módulos disponibles</p>}
                          {!linkedPackage && <p className="text-[9px] text-[#424754] font-semibold">{cumulativeCount} módulos disponibles</p>}
                        </div>
                        <div className="p-3 flex flex-col gap-2">
                          {tier !== 'Basic' && (
                            <p className="text-[9px] italic text-[#424754]">Todo lo de {tier === 'Pro' ? 'Basic' : 'Pro'}, más:</p>
                          )}
                          {tierMods.map((m) => (
                            <div key={m.id} className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px] text-[#0058be] shrink-0">{m.icon}</span>
                              <span className="text-[10px] font-semibold text-[#191b23]">{m.name}</span>
                            </div>
                          ))}
                          {tierMods.length === 0 && (
                            <p className="text-[10px] text-[#424754] italic">Sin módulos propios en este nivel.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Catálogo de módulos de expansión */}
              <section className="flex flex-col gap-4">
                <div className="border-b border-[#c2c6d6] pb-4">
                  <h2 className="text-xl font-bold text-[#191b23]">Módulos de Expansión</h2>
                  <p className="text-xs text-[#424754] mt-1">Lo que se cobra aparte cuando el negocio crece y necesita más que el catálogo básico. El porqué de cada uno está en "Módulos y Estrategia".</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {modules.map((mod) => {
                    const linkedSlugs = moduleStoreLinks[mod.id] || [];
                    return (
                      <div key={mod.id} className="bg-white border border-[#c2c6d6] rounded-md p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-md bg-[#d5e0f8] flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[18px] text-[#0058be]">{mod.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#191b23] truncate">{mod.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[10px] font-bold text-[#0058be]">{mod.price}</p>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border leading-none ${
                                  mod.tier === 'Basic' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                                  mod.tier === 'Pro' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                                  'bg-violet-50 text-violet-800 border-violet-100'
                                }`}>
                                  desde {mod.tier}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Toggle on={mod.active} onChange={() => toggleModuleActive(mod.id)} />
                        </div>
                        <p className="text-[11px] text-[#424754] leading-relaxed">{mod.description}</p>

                        <div className={`flex items-start gap-1.5 p-2 rounded-md border ${
                          mod.buildStatus === 'parcial' ? 'bg-sky-50 border-sky-100' : 'bg-[#f9f9ff] border-[#ecedf7]'
                        }`}>
                          <span className={`material-symbols-outlined text-[13px] shrink-0 mt-px ${
                            mod.buildStatus === 'parcial' ? 'text-sky-700' : 'text-[#424754]'
                          }`}>
                            {mod.buildStatus === 'parcial' ? 'construction' : 'draft'}
                          </span>
                          <p className={`text-[9px] leading-snug font-semibold ${mod.buildStatus === 'parcial' ? 'text-sky-800' : 'text-[#424754]'}`}>
                            <span className="font-bold uppercase tracking-wider">{mod.buildStatus === 'parcial' ? 'Parcialmente construido: ' : 'Sin construir: '}</span>
                            {mod.buildNote}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-[#ecedf7] flex flex-col gap-2">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-[#424754]">
                            {linkedSlugs.length} de {storeList.length} tiendas con este módulo
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {storeList.length === 0 && (
                              <span className="text-[10px] text-[#424754] italic">Todavía no hay tiendas cargadas.</span>
                            )}
                            {storeList.map((s) => {
                              const on = linkedSlugs.includes(s.slug);
                              return (
                                <button
                                  key={s.slug}
                                  type="button"
                                  onClick={() => toggleModuleForStore(mod.id, s.slug)}
                                  disabled={!mod.active}
                                  className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                    on
                                      ? 'bg-[#0058be] border-[#0058be] text-white'
                                      : 'bg-[#f2f3fd] border-[#c2c6d6] text-[#424754] hover:border-[#0058be]'
                                  }`}
                                  title={mod.active ? (on ? `Quitar de ${s.name}` : `Activar en ${s.name}`) : 'Activá el módulo primero'}
                                >
                                  {storeMeta[s.slug]?.emoji || '🏪'} {s.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Archive Table */}
              <section className="bg-white border border-[#c2c6d6] rounded-md overflow-hidden">
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
          {activeTab === 'personalizacion' && (
            <div className="space-y-6 animate-fade-in">
              {/* Banners de los carruseles de portada — no son de una tienda puntual, son del sitio entero */}
              <div className="bg-white rounded-md border border-[#c2c6d6] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[#c2c6d6] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#191b23]">Banners de Portada</h2>
                    <p className="text-[11px] text-[#424754] mt-0.5">Los carruseles de /market y del Inicio — son del sitio entero, no de una tienda.</p>
                  </div>
                  <button
                    onClick={handleOpenNewMarketBanner}
                    className="px-3 py-2 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Nuevo Banner
                  </button>
                </div>

                <div className="px-5 pt-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-1.5">
                    {([['market', 'Market'], ['home', 'Inicio']] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setBannerPageTab(id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          bannerPageTab === id ? 'bg-[#0058be] text-white' : 'bg-[#f2f3fd] text-[#545f73] hover:bg-[#e6e7f2]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#727785] uppercase tracking-wide">Estilo del carrusel:</span>
                    <div className="flex gap-1 bg-[#f2f3fd] p-0.5 rounded-full">
                      {([['center', 'Centrado'], ['bottom', 'Abajo']] as const).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => handleSetBannerStyle(id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            (bannerStyles[bannerPageTab] || 'center') === id ? 'bg-white text-[#0058be] shadow-sm' : 'text-[#727785] hover:text-[#424754]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="px-5 pb-1 text-[10px] text-[#727785] font-semibold">
                  Afecta a TODOS los banners de {bannerPageTab === 'market' ? '/market' : 'el Inicio'}, no solo al que estés editando.
                </p>

                <div className="p-4">
                  {editingMarketBannerId && (
                    <form onSubmit={handleSaveMarketBanner} className="mb-4 p-4 bg-[#f2f3fd]/40 rounded-lg border border-[#c2c6d6] space-y-3">
                      <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">
                        {editingMarketBannerId === 'new' ? 'Nuevo banner' : 'Editar banner'}
                      </p>
                      <p className="text-[10px] text-[#727785] font-semibold -mt-1.5">
                        Si tu imagen ya tiene el texto dibujado (un flyer armado en Canva u otra herramienta), dejá el tag y los títulos vacíos — si los llenás, la web dibuja ese texto ENCIMA del de tu imagen y se pisan.
                      </p>
                      <div className="flex gap-3">
                        <label className="shrink-0 w-20 h-14 rounded-lg border-2 border-dashed border-[#c2c6d6] flex items-center justify-center cursor-pointer hover:bg-white transition-colors overflow-hidden bg-white">
                          {marketBannerImagePreview ? (
                            <img src={marketBannerImagePreview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[#727785] text-[20px]">add_a_photo</span>
                          )}
                          <input
                            type="file" accept="image/*" className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setMarketBannerImageFile(file);
                              setMarketBannerImagePreview(URL.createObjectURL(file));
                            }}
                          />
                        </label>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text" placeholder="Tag (opcional, ej: Promo Exclusiva)"
                            value={marketBannerForm.tag}
                            onChange={(e) => setMarketBannerForm(prev => ({ ...prev, tag: e.target.value }))}
                            className="col-span-2 bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                          />
                          <input
                            type="text" placeholder="Título línea 1 (ej: 2X1 EN) — opcional"
                            value={marketBannerForm.title1}
                            onChange={(e) => setMarketBannerForm(prev => ({ ...prev, title1: e.target.value }))}
                            className="bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                          />
                          <input
                            type="text" placeholder="Título línea 2 (ej: HAMBURGUESAS)"
                            value={marketBannerForm.title2}
                            onChange={(e) => setMarketBannerForm(prev => ({ ...prev, title2: e.target.value }))}
                            className="bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                          />
                        </div>
                      </div>
                      <input
                        type="text" placeholder="Descripción corta (ej: Solo por hoy en locales seleccionados)"
                        value={marketBannerForm.sub}
                        onChange={(e) => setMarketBannerForm(prev => ({ ...prev, sub: e.target.value }))}
                        className="w-full bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-medium text-[#191b23] outline-none focus:border-[#0058be]"
                      />
                      <input
                        type="text" placeholder="Link opcional al tocarlo (ej: /promotions o una url)"
                        value={marketBannerForm.link}
                        onChange={(e) => setMarketBannerForm(prev => ({ ...prev, link: e.target.value }))}
                        className="w-full bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-medium text-[#191b23] outline-none focus:border-[#0058be]"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-[11px] font-bold text-[#424754] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={marketBannerForm.active}
                              onChange={(e) => setMarketBannerForm(prev => ({ ...prev, active: e.target.checked }))}
                              className="w-4 h-4 accent-[#0058be]"
                            />
                            Visible en {bannerPageTab === 'market' ? '/market' : 'el Inicio'}
                          </label>
                          <label className="flex items-center gap-2 text-[11px] font-bold text-[#424754] cursor-pointer" title="Desmarcá esto si tu imagen ya trae el texto dibujado — el tag/título/descripción quedan guardados pero no se dibujan encima.">
                            <input
                              type="checkbox"
                              checked={marketBannerForm.showText}
                              onChange={(e) => setMarketBannerForm(prev => ({ ...prev, showText: e.target.checked }))}
                              className="w-4 h-4 accent-[#0058be]"
                            />
                            Mostrar texto encima
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingMarketBannerId(null)} className="px-3 py-2 rounded-md font-bold text-xs text-[#424754] hover:bg-[#e6e7f2] transition-colors">
                            Cancelar
                          </button>
                          <button type="submit" disabled={isSavingMarketBanner} className="px-4 py-2 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] transition-colors disabled:opacity-50">
                            {isSavingMarketBanner ? 'Guardando…' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {isLoadingMarketBanners ? (
                    <p className="text-xs text-[#727785] italic py-3 text-center">Cargando…</p>
                  ) : visibleMarketBanners.length === 0 ? (
                    <p className="text-xs text-[#727785] italic py-3 text-center">
                      Sin banners cargados para {bannerPageTab === 'market' ? '/market' : 'el Inicio'} — muestra los de ejemplo por defecto.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {visibleMarketBanners.map((b, idx) => (
                        <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#ecedf7]">
                          <img src={b.image} alt="" className="w-16 h-9 rounded-md object-cover shrink-0 bg-[#e6e7f2]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#191b23] truncate">
                              {b.title1} {b.title2}
                              {!b.active && <span className="ml-2 text-[9px] font-bold text-amber-600 uppercase">Oculto</span>}
                            </p>
                            <p className="text-[10px] text-[#727785] truncate">{b.sub}{b.link ? ` · → ${b.link}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => handleMoveMarketBanner(b.id, -1)} disabled={idx === 0} className="material-symbols-outlined text-[16px] text-[#727785] hover:text-[#0058be] p-1 hover:bg-[#e6e7f2] rounded disabled:opacity-30 disabled:pointer-events-none">arrow_upward</button>
                            <button onClick={() => handleMoveMarketBanner(b.id, 1)} disabled={idx === visibleMarketBanners.length - 1} className="material-symbols-outlined text-[16px] text-[#727785] hover:text-[#0058be] p-1 hover:bg-[#e6e7f2] rounded disabled:opacity-30 disabled:pointer-events-none">arrow_downward</button>
                            <button onClick={() => handleOpenEditMarketBanner(b)} className="material-symbols-outlined text-[16px] text-[#727785] hover:text-[#0058be] p-1 hover:bg-[#e6e7f2] rounded">edit</button>
                            <button onClick={() => handleDeleteMarketBanner(b.id)} className="material-symbols-outlined text-[16px] text-[#727785] hover:text-red-600 p-1 hover:bg-red-50 rounded">delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-b border-[#c2c6d6] pb-4">
                <h2 className="text-xl font-bold text-[#191b23]">Personalización de Tiendas</h2>
                <p className="text-xs text-[#424754] mt-1">Ajusta la apariencia visual, banners promocionales y contenido demostrativo de cada comercio.</p>
              </div>

              <div className="bg-white rounded-md border border-[#c2c6d6] overflow-hidden divide-y divide-[#ecedf7] shadow-sm">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 bg-[#f2f3fd]/35 p-4 rounded-md border border-[#c2c6d6]/60">
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
                          <div className="bg-[#f2f3fd]/20 rounded-md p-4 border border-[#c2c6d6] space-y-4">
                            <div className="border-b border-[#c2c6d6] pb-2 flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Banners Promocionales por Sección</span>
                              <span className="text-[9px] font-bold text-[#0058be] bg-[#d8e2ff] px-2 py-0.5 rounded">Manuales</span>
                            </div>
                            
                            {[{ href: 'all', name: 'Todas las secciones' }, ...store.categories].map(cat => (
                              <div key={cat.href} className="bg-white rounded-md p-3 border border-[#c2c6d6] space-y-2.5 shadow-sm">
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
    {showPackageModal && (
      <div className="fixed inset-0 z-[200] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[460px] max-w-[460px] max-h-[90vh] overflow-hidden flex flex-col">
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

            <div className="space-y-3 bg-[#f2f3fd]/55 p-4 rounded-md border border-[#c2c6d6]/60">
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
                        <img src={logoPreview} className="w-16 h-16 rounded-lg object-cover border border-[#c2c6d6]/40 shadow-md" />
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
