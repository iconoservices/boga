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
  /** Banner o portada personalizada para la tarjeta en /productos. Si no se pone, usa la foto de su primera plantilla. */
  banner?: string;
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
    plantillas: ['polleria', 'menudirecto', 'fichadigital', 'fichaplana', 'iniciocatalogo', 'sunset', 'helados'],
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
    plantillas: ['mercado', 'condimentos', 'estilosmirka', 'mirkavisual', 'atelier', 'lookbook', 'flores', 'bazar', 'tecnologia', 'detalles', 'natura', 'amazonia'],
    estado: 'listo',
  },
  {
    slug: 'catalogo-taller',
    icon: 'construction',
    titulo: 'Tu catálogo para fabricantes y talleres',
    gancho: 'Muestra tus trabajos y que te pidan cotización por WhatsApp.',
    para: 'Talleres, confecciones y fabricantes',
    descripcion: 'Para quienes fabrican o instalan a medida: uniformes, soportes, estructuras, muebles. Muestras tus modelos y trabajos con fotos grandes y el cliente te escribe para cotizar.',
    beneficios: ['Fotos grandes de tus modelos y trabajos', 'Cotización directa por WhatsApp', 'Se instala como app en el celular', 'Tu propio link para compartir'],
    plantillas: ['uniformes', 'rack', 'hogar'],
    estado: 'listo',
  },
  {
    slug: 'academia-deportiva',
    icon: 'sports_martial_arts',
    titulo: 'Tu academia deportiva con carnet QR',
    gancho: 'Alumnos, asistencia con QR y aviso al padre en el celular.',
    para: 'Academias deportivas y colegios',
    descripcion: 'Para academias de deporte, escuelas y colegios: registra a tus alumnos, dales su carnet con QR, toma asistencia en segundos y avisa al padre de familia.',
    beneficios: ['Carnet con QR para cada alumno', 'Asistencia en segundos', 'Aviso al padre de familia', 'Tu propio link para compartir'],
    plantillas: ['academia'],
    estado: 'listo',
  },
  {
    slug: 'pagina-empresa',
    icon: 'business_center',
    titulo: 'La página de tu empresa o servicio',
    gancho: 'Quiénes eres, qué haces y un botón para contactarte al instante.',
    para: 'Empresas y servicios',
    descripcion: 'Una página propia con tu presentación, tus servicios y tus datos de contacto, lista para compartir con clientes y aliados.',
    beneficios: ['Presentación de tu empresa', 'Tus servicios con fotos', 'Contacto directo por WhatsApp', 'Tu propio link para compartir'],
    plantillas: ['empresa', 'gas'],
    estado: 'listo',
  },
  {
    slug: 'salon-belleza',
    icon: 'content_cut',
    titulo: 'Tu salón de belleza en el celular',
    gancho: 'Tus servicios con fotos y precios, y un botón para reservar tu cita.',
    para: 'Salones, spas y uñas',
    descripcion: 'Muestra tus servicios (cortes, color, uñas, spa) con fotos y precios, y deja que tus clientas te escriban por WhatsApp para reservar su cita.',
    beneficios: ['Servicios con fotos y precios', 'Reservar cita por WhatsApp', 'Se instala como app en el celular', 'Tu propio link para compartir'],
    plantillas: ['belleza', 'sweetkittynails'],
    estado: 'listo',
  },
  {
    slug: 'discoteca-eventos',
    icon: 'nightlife',
    titulo: 'Tu discoteca o bar con eventos y botellas',
    gancho: 'Tus eventos, combos de botellas y entradas, y que reserven por WhatsApp.',
    para: 'Discotecas, bares y organizadores',
    descripcion: 'Una página para locales nocturnos: la cartelera de próximos eventos con fecha, tus combos de botellas, boxes VIP, tragos y entradas. El cliente reserva o pide directo por WhatsApp.',
    beneficios: ['Cartelera de próximos eventos', 'Combos, botellas y boxes VIP', 'Entradas y reservas por WhatsApp', 'Tu propio link para compartir'],
    plantillas: ['discoteca', 'cartelera'],
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
  {
    slug: 'medio-digital',
    icon: 'newspaper',
    titulo: 'Tu medio o periódico digital',
    gancho: 'Publica tus noticias y notas en una página propia, fáciles de compartir.',
    para: 'Medios, periodistas y revistas locales',
    descripcion: 'Un sitio para publicar noticias, crónicas y notas con fotos, ordenadas por secciones y listas para compartir por WhatsApp y redes.',
    beneficios: ['Notas con fotos y secciones', 'Pensado para compartir por WhatsApp y redes', 'Aparece en Google', 'Tu propio link para compartir'],
    plantillas: [],
    estado: 'proximamente',
    nota: 'Todavía la estamos armando.',
  },
];

export const getProductoMostrador = (slug: string) => PRODUCTOS_MOSTRADOR.find((p) => p.slug === slug) ?? null;

/** Plantillas del producto que existen de verdad en templates.config. */
export const plantillasDe = (p: ProductoMostrador): TemplateConfig[] =>
  p.plantillas.map((id) => getTemplate(id)).filter((t): t is TemplateConfig => !!t);

/** Foto de portada de la tarjeta: su banner propio si tiene, o la de su primera plantilla. */
export const portadaDe = (p: ProductoMostrador): string | null => p.banner ?? plantillasDe(p)[0]?.heroImage ?? null;
