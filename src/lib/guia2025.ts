// ─────────────────────────────────────────────────────────────────────────────
// lib/guia2025.ts
// Datos seed para la Guía Comercial & Turística 2025: Lo mejor de Pucallpa
// ─────────────────────────────────────────────────────────────────────────────

export type Categoria2025 =
  | 'Gastronomía'
  | 'Hospedaje'
  | 'Turismo & Aventura'
  | 'Comercio'
  | 'Servicios'
  | 'Vida Nocturna';

export interface Negocio2025 {
  id: string;
  nombre: string;
  categoria: Categoria2025;
  img: string;
  descripcion: string;
  zona: string;
  whatsapp?: string;
  href?: string;
  precio: '$' | '$$' | '$$$';
  destacado?: boolean;
  badge?: string;
}

export const CATEGORIAS_2025: { id: Categoria2025; icon: string; color: string }[] = [
  { id: 'Gastronomía',        icon: 'ramen_dining', color: '#e8601c' },
  { id: 'Hospedaje',          icon: 'hotel',         color: '#0058be' },
  { id: 'Turismo & Aventura', icon: 'kayaking',      color: '#1a7a4a' },
  { id: 'Comercio',           icon: 'storefront',    color: '#7c3aed' },
  { id: 'Servicios',          icon: 'handyman',      color: '#b45309' },
  { id: 'Vida Nocturna',      icon: 'nightlife',     color: '#be185d' },
];

export const NEGOCIOS_2025: Negocio2025[] = [
  // GASTRONOMIA
  { id: 'g1', nombre: 'El Mirador de Yarina', categoria: 'Gastronomía', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', descripcion: 'Los mejores platos amazónicos con vista al lago Yarinacocha. Tacacho, juane y patarashca.', zona: 'Puerto Callao · Yarinacocha', whatsapp: '51916000001', precio: '$$', destacado: true, badge: 'Recomendado' },
  { id: 'g2', nombre: 'Huarike Doña Luz', categoria: 'Gastronomía', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80', descripcion: 'El menú más generoso del centro a S/. 5. Frijoles, chancho y caldo de gallina criolla desde las 7am.', zona: 'Jirón Tacna · Centro', precio: '$', badge: 'Clásico local' },
  { id: 'g3', nombre: 'Cevichería La Selva Marina', categoria: 'Gastronomía', img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80', descripcion: 'Ceviche de doncella y corvina del río Ucayali. Fresquísimo cada mañana, agotado al mediodía.', zona: 'Av. Centenario', whatsapp: '51916000002', precio: '$$' },
  { id: 'g4', nombre: 'Café Selva Verde', categoria: 'Gastronomía', img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', descripcion: 'Café de especialidad cultivado en Ucayali. Ambiente tranquilo, WiFi y pasteles caseros.', zona: 'Barrio San Martín', whatsapp: '51916000003', precio: '$$', badge: 'Nuevo 2025' },
  // HOSPEDAJE
  { id: 'h1', nombre: 'Hotel Amazónico', categoria: 'Hospedaje', img: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80', descripcion: 'El mejor hotel del centro con piscina, AC y desayuno incluido. A 5 min del aeropuerto.', zona: 'Av. Yarinacocha', whatsapp: '51916000004', precio: '$$$', destacado: true, badge: 'Premium' },
  { id: 'h2', nombre: 'Hospedaje Río Verde', categoria: 'Hospedaje', img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', descripcion: 'Habitaciones limpias a orillas del lago. Desayuno selvático incluido y lanchas a pedido.', zona: 'Puerto Callao · Yarinacocha', whatsapp: '51916000005', precio: '$', badge: 'Recomendado' },
  { id: 'h3', nombre: 'Apart Hotel El Ucayali', categoria: 'Hospedaje', img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80', descripcion: 'Suites con cocina equipada, ideal para estadías largas. Mejor zona residencial de Pucallpa.', zona: 'Urb. Los Jardines', whatsapp: '51916000006', precio: '$$' },
  // TURISMO
  { id: 't1', nombre: 'Tours Amazónicos Ucayali', categoria: 'Turismo & Aventura', img: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80', descripcion: 'Expediciones al lago, pesca de pirañas, delfines rosados y comunidades shipibo-conibo.', zona: 'Embarcadero Yarinacocha', whatsapp: '51916000007', precio: '$$', destacado: true, badge: 'Mejor valorado' },
  { id: 't2', nombre: 'Kayak & Selva Xtrema', categoria: 'Turismo & Aventura', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80', descripcion: 'Kayak en el lago, senderismo nocturno y avistamiento de caimanes al amanecer.', zona: 'Puerto Callao', whatsapp: '51916000008', precio: '$$', badge: 'Nuevo 2025' },
  { id: 't3', nombre: 'Artesanía Shipibo Betania', categoria: 'Turismo & Aventura', img: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&q=80', descripcion: 'Visita la comunidad de Betania, taller de cerámica y textiles shipibo. Compra directo al artesano.', zona: 'Comunidad Betania · Km 18', precio: '$' },
  // COMERCIO
  { id: 'c1', nombre: 'Ferretería El Constructor', categoria: 'Comercio', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80', descripcion: 'La mejor ferretería de Pucallpa con más de 10,000 productos. Entrega a domicilio en el día.', zona: 'Jr. Inca · Centro', whatsapp: '51916000009', precio: '$$', badge: 'Recomendado' },
  { id: 'c2', nombre: 'Moda Selvática Boutique', categoria: 'Comercio', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80', descripcion: 'Ropa con diseños inspirados en la Amazonía. Moda local de calidad.', zona: 'Centro Comercial Real Plaza', whatsapp: '51916000010', precio: '$$', badge: 'Nuevo 2025' },
  { id: 'c3', nombre: 'Mercado de Productores Ucayali', categoria: 'Comercio', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80', descripcion: 'Frutas exóticas y productos nativos directamente del productor al consumidor.', zona: 'Av. Inmaculada', precio: '$' },
  // SERVICIOS
  { id: 's1', nombre: 'Taller Automotriz Los Andes', categoria: 'Servicios', img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&q=80', descripcion: 'Mecánica general, planchado y pintura. 15 años de experiencia. Garantía en todos los trabajos.', zona: 'Av. San Martín · Callería', whatsapp: '51916000011', precio: '$$', badge: 'Recomendado' },
  { id: 's2', nombre: 'Clínica Dental Sonrisa Selva', categoria: 'Servicios', img: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=600&q=80', descripcion: 'Dentista de confianza con equipos modernos. Blanqueamiento, ortodoncia y urgencias.', zona: 'Jr. Progreso · Centro', whatsapp: '51916000012', precio: '$$' },
  { id: 's3', nombre: 'Imprenta & Diseño El Toco', categoria: 'Servicios', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', descripcion: 'Banners, tarjetas, volantes y uniformes. Diseño incluido. Entrega en 24 horas.', zona: 'Jr. Tarapacá', whatsapp: '51916000013', precio: '$', badge: 'Nuevo 2025' },
  // VIDA NOCTURNA
  { id: 'n1', nombre: 'Terraza La Anaconda', categoria: 'Vida Nocturna', img: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=80', descripcion: 'Cocteles amazónicos, música en vivo los viernes y sábados, y la mejor vista nocturna del Ucayali.', zona: 'Malecón Grau', whatsapp: '51916000014', precio: '$$', destacado: true, badge: 'Trending' },
  { id: 'n2', nombre: 'Pub Shipibo Roots', categoria: 'Vida Nocturna', img: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600&q=80', descripcion: 'Bar con identidad amazónica, icaro sessions y cervezas artesanales locales.', zona: 'Barrio San José', whatsapp: '51916000015', precio: '$$', badge: 'Nuevo 2025' },
];

export const PATROCINADORES_2025 = [
  { nombre: 'BogaHub', logo: '🌿', color: '#1a7a4a' },
  { nombre: 'Municipalidad de Coronel Portillo', logo: '🏛️', color: '#0058be' },
  { nombre: 'PromPerú Ucayali', logo: '🇵🇪', color: '#e8601c' },
];
