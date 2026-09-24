import { getTemplate, type TemplateConfig } from '@/lib/templates.config';

// Catálogo de Productos: cada "producto" es algo que BogaHub arma para un
// negocio (una página de terrenos, la app de una veterinaria, una carta con QR…).
// Cada uno tiene una ficha introductoria (/productos/<slug>) donde se ven las
// plantillas disponibles con su vista previa (/preview/<id>).
//
// `estado: 'proximamente'` = todavía no se puede contratar completo; igual se
// muestra la ficha (y las plantillas que ya existan como vista previa) sin botón
// de contratar, para no vender algo que aún no funciona.

export type ProductoMostrador = {
  slug: string;
  icon: string;
  /** Lo que ve el cliente en la tarjeta: en primera persona y como acción. */
  titulo: string;
  gancho: string;
  /** Para qué tipo de negocio es (etiqueta chica sobre el título). */
  para: string;
  descripcion: string;
  beneficios: string[];
  /** ids de templates.config: se muestran como plantillas con vista previa. */
  plantillas: string[];
  estado: 'listo' | 'proximamente';
  /** Solo para 'proximamente': qué falta, dicho sin rodeos. */
  nota?: string;
};

export const PRODUCTOS_MOSTRADOR: ProductoMostrador[] = [
  {
    slug: 'terrenos',
    icon: 'landscape',
    titulo: 'Vende tu terreno con Boga',
    gancho: 'Tu página de terrenos, con buscador por zona y contacto directo por WhatsApp.',
    para: 'Terrenos y lotes',
    descripcion: 'Publica tus terrenos, lotes o chacras en una página propia, con fotos grandes, el precio a la vista y un botón para que el interesado te escriba al instante.',
    beneficios: ['Buscador por zona', 'Fotos grandes y precio a la vista', 'Botón de consultar por WhatsApp en cada terreno', 'Tu propio link para compartir'],
    plantillas: ['terreno1', 'terreno2'],
    estado: 'listo',
  },
  {
    slug: 'carta-digital',
    icon: 'qr_code_2',
    titulo: 'Tu carta digital con QR',
    gancho: 'Tu carta con fotos y precios; el cliente arma su pedido y te llega por WhatsApp.',
    para: 'Restaurantes y pollerías',
    descripcion: 'Reemplaza la carta de papel o el PDF. La compartes por link o QR y el cliente pide desde su celular.',
    beneficios: ['Fotos y precios siempre al día', 'Pedido directo a tu WhatsApp', 'QR listo para imprimir', 'Sin comisión por venta'],
    plantillas: ['polleria', 'menudirecto', 'fichadigital', 'fichaplana', 'iniciocatalogo', 'sunset'],
    estado: 'listo',
  },
  {
    slug: 'tienda',
    icon: 'storefront',
    titulo: 'Tu tienda en el celular',
    gancho: 'Tu tienda como app que tus clientes instalan y te piden por WhatsApp.',
    para: 'Bodegas, tiendas y boutiques',
    descripcion: 'Un catálogo con carrito, instalable como app. Tú vendes y cobras directo; BogaHub solo cobra el plan.',
    beneficios: ['Catálogo con carrito', 'Se instala como app en el celular', 'Módulos que sumas al crecer', 'Tu dirección propia'],
    plantillas: ['mercado', 'estilosmirka', 'flores', 'natura', 'amazonia', 'sweetkittynails'],
    estado: 'listo',
  },
  {
    slug: 'veterinaria',
    icon: 'pets',
    titulo: 'La app de tu veterinaria',
    gancho: 'Tu tienda y la cartilla digital de cada mascota, con semáforo de vacunas.',
    para: 'Veterinarias y pet shops',
    descripcion: 'Vende alimento y accesorios, y dale a cada dueño la cartilla de su perrito en el celular: vacunas, historial de visitas y un botón para pedir cita o baño por WhatsApp.',
    beneficios: ['Cartilla digital de cada mascota', 'Semáforo: al día, pronto o vence', 'Historial de visitas', 'Pedir baño o cita por WhatsApp'],
    plantillas: ['veterinaria'],
    estado: 'proximamente',
    nota: 'La plantilla ya se puede ver. La carga de mascotas y vacunas reales llega pronto: hoy la cartilla muestra un ejemplo.',
  },
  {
    slug: 'invitacion-de-boda',
    icon: 'favorite',
    titulo: 'Tu invitación digital de boda',
    gancho: 'Fotos, cuenta regresiva, ubicación y confirmación de asistencia por WhatsApp.',
    para: 'Bodas y eventos',
    descripcion: 'Una invitación que se comparte por link, con todo lo que tus invitados necesitan saber.',
    beneficios: ['Fotos y cuenta regresiva', 'Ubicación en el mapa', 'Confirmación de asistencia por WhatsApp'],
    plantillas: [],
    estado: 'proximamente',
    nota: 'Todavía la estamos armando.',
  },
  {
    slug: 'botica',
    icon: 'medication',
    titulo: 'La app de tu botica',
    gancho: 'Catálogo de productos y pedidos, con una interfaz pensada para farmacia.',
    para: 'Boticas y farmacias',
    descripcion: 'Tu botica en el celular de tus clientes, con catálogo y pedidos por WhatsApp.',
    beneficios: ['Catálogo de productos', 'Pedidos por WhatsApp', 'Interfaz pensada para farmacia'],
    plantillas: [],
    estado: 'proximamente',
    nota: 'Todavía la estamos armando.',
  },
];

export const getProductoMostrador = (slug: string) => PRODUCTOS_MOSTRADOR.find((p) => p.slug === slug) ?? null;

/** Plantillas del producto que existen de verdad en templates.config. */
export const plantillasDe = (p: ProductoMostrador): TemplateConfig[] =>
  p.plantillas.map((id) => getTemplate(id)).filter((t): t is TemplateConfig => !!t);

/** Foto de portada de la tarjeta: la de su primera plantilla, si tiene. */
export const portadaDe = (p: ProductoMostrador): string | null => plantillasDe(p)[0]?.heroImage ?? null;
