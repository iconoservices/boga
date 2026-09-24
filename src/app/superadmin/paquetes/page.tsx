'use client';

// Extraído del page.tsx gigante de /superadmin (era la pestaña `paquetes`): paquetes comerciales
// y catálogo de módulos de expansión. Todo vive en memoria por ahora (no hay tablas todavía).

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import Toggle from '@/components/superadmin/Toggle';
import NivelesModulos from '@/components/superadmin/NivelesModulos';
import CatalogoOrdenado from '@/components/superadmin/CatalogoOrdenado';

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
    description: 'La extracción de colores de logo que hoy solo usas vos desde superadmin, self-service para el dueño: sube su logo o una foto de un plato y la tienda se retematiza sola, sin tener que pedírtelo.',
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

// useSearchParams (para ?nuevo=1) exige un Suspense a su alrededor al compilar.
export default function PaquetesAdmin() {
  return (
    <Suspense fallback={null}>
      <PaquetesContenido />
    </Suspense>
  );
}

function PaquetesContenido() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/paquetes');
  }, [cargando, esSuperadmin, router]);

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
  const [modules] = useState<StoreModule[]>(INITIAL_MODULES);

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

  // Desde el botón "Nuevo Paquete" del dashboard: /superadmin/paquetes?nuevo=1 abre el formulario.
  useEffect(() => {
    if (searchParams.get('nuevo') === '1') handleOpenCreatePackage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <SuperadminSubheader title="Paquetes" icon="inventory_2" />
      <main className="max-w-[900px] mx-auto px-4 py-8">
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

              {/* Niveles reales: los que prenden o apagan módulos en el panel del dueño */}
              <NivelesModulos />

              {/* Catálogo ordenado por qué tan real es cada módulo */}
              <CatalogoOrdenado modulos={modules} />

              {/* Lo anterior: paquetes de muestra (Starter/Pro/Enterprise), sin efecto real */}
              <details className="group border border-[#c2c6d6] rounded-md bg-white">
                <summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold text-[#424754] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] transition-transform group-open:rotate-90">chevron_right</span>
                  Paquetes de muestra anteriores (Starter Kit / Pro Bundle / Enterprise) — no gatean nada
                </summary>
                <div className="p-4 flex flex-col gap-6 border-t border-[#c2c6d6]">
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
              </details>
            </div>
      </main>

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
    </div>
  );
}
