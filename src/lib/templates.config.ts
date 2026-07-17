export interface StoreTheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerLowest: string;
  surfaceContainerHigh: string;
  onBackground: string;
  onSurface: string;
  onSurfaceVariant: string;
  outlineVariant: string;
  fontHeadline: string;
  fontBody: string;
  fontLabel: string;
}

export interface DemoProduct {
  name: string;
  price: number;
  category: string;
  subcategory?: string;
  image: string;
  description?: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  category: string;
  theme: StoreTheme;
  heroImage: string;
  heroAlt: string;
  iconImage?: string;
  categories: { name: string; icon: string; href: string }[];
  demoProducts: DemoProduct[];
}

const TEMPLATES: Record<string, TemplateConfig> = {
  default: {
    id: 'default',
    name: 'Default Minimal',
    category: 'Negocios',
    heroImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&q=80',
    heroAlt: 'minimalist business storefront',
    theme: {
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
      fontHeadline: "'Outfit', sans-serif",
      fontBody: "'Outfit', sans-serif",
      fontLabel: "'Outfit', sans-serif",
    },
    categories: [],
    demoProducts: [
      { name: 'Producto Ejemplo', price: 25.00, category: 'General', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', description: 'Descripción del producto' },
      { name: 'Servicio Premium', price: 50.00, category: 'General', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80', description: 'Servicio profesional de alta calidad' },
    ],
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset Dark',
    category: 'Gourmet',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHmeiaOsTXv2-kWJBCWi9uFd37xlyoGDpux03IogklXq1QxJFIOqy45sOanh9a3GdXv0m0yRNtTOyLQwkBZNlFYd_y4eVOvViwD1pK4QFZXmJomFCUqGECObJ1Ix4Tdq9hGBTItdravESWy1zWgq4lP8_HewhOD6dfZgTM4uX7I-FGbDFXXMW5YlaAVBPtzWyKQxm8L1T8SnJYQsAiPTbpU98meANSMRdWExpDhL8gueDCH_6C4_xX0TYuw8Y8CTjTT0MYAg6hEjpT',
    heroAlt: 'moody high-end cocktail bar at dusk with warm golden lighting',
    theme: {
      primary: '#f2ca50',
      onPrimary: '#3c2f00',
      primaryContainer: '#d4af37',
      secondary: '#ffb77d',
      secondaryContainer: '#fd8b00',
      background: '#131313',
      surface: '#131313',
      surfaceContainer: '#201f1f',
      surfaceContainerLow: '#1c1b1b',
      surfaceContainerLowest: '#0e0e0e',
      surfaceContainerHigh: '#2a2a2a',
      onBackground: '#e5e2e1',
      onSurface: '#e5e2e1',
      onSurfaceVariant: '#d0c5af',
      outlineVariant: '#4d4635',
      fontHeadline: "'Noto Serif', serif",
      fontBody: "'Manrope', sans-serif",
      fontLabel: "'Manrope', sans-serif",
    },
    categories: [
      { name: 'Cocina', icon: 'restaurant', href: 'kitchen' },
      { name: 'Bar', icon: 'local_bar', href: 'bar' },
      { name: 'Café', icon: 'coffee', href: 'cafe' },
    ],
    demoProducts: [
      { name: 'Ribeye Steak', price: 45.00, category: 'Cocina', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80', description: 'Corte angus con guarnición' },
      { name: 'Mojito Clásico', price: 18.00, category: 'Bar', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f1c2?w=400&q=80', description: 'Ron, hierbabuena, limón' },
      { name: 'Café Especial', price: 12.00, category: 'Café', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80', description: 'Café de especialidad filtrado' },
    ],
  },

  natura: {
    id: 'natura',
    name: 'Natura Organic',
    category: 'Salud y Bienestar',
    heroImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
    heroAlt: 'selva amazónica exuberante',
    theme: {
      primary: '#00a651',
      onPrimary: '#ffffff',
      primaryContainer: '#2D6A4F',
      secondary: '#1B4332',
      secondaryContainer: '#1B4332',
      background: '#F8F9FA',
      surface: '#ffffff',
      surfaceContainer: '#f0f4f0',
      surfaceContainerLow: '#f8faf8',
      surfaceContainerLowest: '#ffffff',
      surfaceContainerHigh: '#e8ede8',
      onBackground: '#1A1A1A',
      onSurface: '#1A1A1A',
      onSurfaceVariant: '#444444',
      outlineVariant: '#d0d8d0',
      fontHeadline: "'Outfit', sans-serif",
      fontBody: "'Outfit', sans-serif",
      fontLabel: "'Outfit', sans-serif",
    },
    categories: [
      { name: 'Frutas', icon: 'nutrition', href: 'frutas' },
      { name: 'Verduras', icon: 'eco', href: 'verduras' },
      { name: 'Carnes', icon: 'set_meal', href: 'carnes' },
    ],
    demoProducts: [
      { name: 'Frutas del Día', price: 8.50, category: 'Frutas', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80', description: 'Selección de frutas frescas' },
      { name: 'Verduras Orgánicas', price: 12.00, category: 'Verduras', image: 'https://images.unsplash.com/photo-1557844352-761f2565b576?w=400&q=80', description: 'Pack de verduras de temporada' },
      { name: 'Carne de Res', price: 28.00, category: 'Carnes', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80', description: 'Carne de res premium 1kg' },
    ],
  },

  amazonia: {
    id: 'amazonia',
    name: 'Amazonia Fresh',
    category: 'Mercado',
    heroImage: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
    heroAlt: 'productos artesanales de la selva profunda',
    theme: {
      primary: '#b25329',
      onPrimary: '#ffffff',
      primaryContainer: '#8f3d1b',
      secondary: '#5c3d2e',
      secondaryContainer: '#5c3d2e',
      background: '#faf7f2',
      surface: '#ffffff',
      surfaceContainer: '#f5ede2',
      surfaceContainerLow: '#faf7f2',
      surfaceContainerLowest: '#ffffff',
      surfaceContainerHigh: '#ebddcb',
      onBackground: '#2c1e18',
      onSurface: '#2c1e18',
      onSurfaceVariant: '#66554d',
      outlineVariant: '#e6d7c5',
      fontHeadline: "'Outfit', sans-serif",
      fontBody: "'Outfit', sans-serif",
      fontLabel: "'Outfit', sans-serif",
    },
    categories: [
      { name: 'Artesanía', icon: 'interests', href: 'artesania' },
      { name: 'Bienestar', icon: 'spa', href: 'bienestar' },
      { name: 'Alimentos', icon: 'restaurant', href: 'alimentos' },
    ],
    demoProducts: [
      { name: 'Canasta Artesanal', price: 35.00, category: 'Artesanía', image: 'https://images.unsplash.com/photo-1590005354167-6da9783c12f4?w=400&q=80', description: 'Tejido a mano por artesanos locales' },
      { name: 'Aceite de Sacha Inchi', price: 22.00, category: 'Bienestar', image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&q=80', description: 'Aceite natural amazónico 250ml' },
      { name: 'Miel de Selva', price: 18.00, category: 'Alimentos', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80', description: 'Miel pura de abejas nativas' },
    ],
  },

  sweetkittynails: {
    id: 'sweetkittynails',
    name: 'Kitty Beauty Pink',
    category: 'Moda y Belleza',
    heroImage: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=1200&q=80',
    heroAlt: 'Sweet Kitty Nails premium pink glossy salon',
    theme: {
      primary: '#ff85a2',
      onPrimary: '#ffffff',
      primaryContainer: '#2c1015',
      secondary: '#ffccd5',
      secondaryContainer: '#fff0f3',
      background: '#fff5f6',
      surface: '#ffffff',
      surfaceContainer: '#ffe5ec',
      surfaceContainerLow: '#fff5f6',
      surfaceContainerLowest: '#ffffff',
      surfaceContainerHigh: '#ffd3e8',
      onBackground: '#2c1015',
      onSurface: '#2c1015',
      onSurfaceVariant: '#7a5259',
      outlineVariant: '#ffccd5',
      fontHeadline: "'Outfit', sans-serif",
      fontBody: "'Outfit', sans-serif",
      fontLabel: "'Outfit', sans-serif",
    },
    categories: [
      { name: 'Manicura Gel', icon: 'dry_cleaning', href: 'manicura' },
      { name: 'Uñas Acrílicas', icon: 'brush', href: 'acrilicas' },
      { name: 'Nail Art 3D', icon: 'palette', href: 'nailart' },
      { name: 'Pedicura Spa', icon: 'spa', href: 'pedicura' },
    ],
    demoProducts: [
      { name: 'Manicura Gel', price: 35.00, category: 'Manicura Gel', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80', description: 'Esmaltado en gel duradero' },
      { name: 'Uñas Acrílicas', price: 55.00, category: 'Uñas Acrílicas', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', description: 'Diseño personalizado' },
      { name: 'Nail Art 3D', price: 45.00, category: 'Nail Art 3D', image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&q=80', description: 'Decoración 3D exclusiva' },
    ],
  },

  estilosmirka: {
    id: 'estilosmirka',
    name: 'Estilos Mirka',
    category: 'Moda',
    heroImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80',
    heroAlt: 'Boutique de ropa premium con estilo sofisticado',
    theme: {
      primary: '#6B1A2C',
      onPrimary: '#ffffff',
      primaryContainer: '#3d0d18',
      secondary: '#c8a4ae',
      secondaryContainer: '#f5e8eb',
      background: '#fdf6f7',
      surface: '#ffffff',
      surfaceContainer: '#f5e8eb',
      surfaceContainerLow: '#fdf6f7',
      surfaceContainerLowest: '#ffffff',
      surfaceContainerHigh: '#ead4d9',
      onBackground: '#1a0a0d',
      onSurface: '#1a0a0d',
      onSurfaceVariant: '#6b3a42',
      outlineVariant: '#e0c4ca',
      fontHeadline: "'Playfair Display', serif",
      fontBody: "'Montserrat', sans-serif",
      fontLabel: "'Montserrat', sans-serif",
    },
    categories: [
      { name: 'Vestidos', icon: 'styler', href: 'vestidos' },
      { name: 'Blusas', icon: 'checkroom', href: 'blusas' },
      { name: 'Pantalones', icon: 'accessibility_new', href: 'pantalones' },
      { name: 'Accesorios', icon: 'diamond', href: 'accesorios' },
    ],
    demoProducts: [
      { name: 'Vestido Floral', price: 89.00, category: 'Vestidos', image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80', description: 'Vestido largo con estampado floral' },
      { name: 'Blusa Seda', price: 65.00, category: 'Blusas', image: 'https://images.unsplash.com/photo-1554568218-0f1715e72254?w=400&q=80', description: 'Blusa de seda natural' },
      { name: 'Pantalón Palazzo', price: 75.00, category: 'Pantalones', image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&q=80', description: 'Pantalón ancho de tiro alto' },
    ],
  },

  polleria: {
    id: 'polleria',
    name: 'Pollería Bravoz',
    category: 'Restaurantes',
    heroImage: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=1200&q=80',
    heroAlt: 'Pollo a la brasa dorado crujiente con papas fritas',
    iconImage: '/icons/polleria.svg',
    theme: {
      primary: '#a43800',
      onPrimary: '#ffffff',
      primaryContainer: '#ffdbce',
      secondary: '#7a574d',
      secondaryContainer: '#f8ded7',
      background: '#fdf8f6',
      surface: '#ffffff',
      surfaceContainer: '#fceee9',
      surfaceContainerLow: '#fdf8f6',
      surfaceContainerLowest: '#ffffff',
      surfaceContainerHigh: '#f3e0d8',
      onBackground: '#231a17',
      onSurface: '#231a17',
      onSurfaceVariant: '#53433e',
      outlineVariant: '#e8d0ca',
      fontHeadline: "'Plus Jakarta Sans', sans-serif",
      fontBody: "'Plus Jakarta Sans', sans-serif",
      fontLabel: "'Plus Jakarta Sans', sans-serif",
    },
    categories: [
      { name: 'Pollos a la Brasa', icon: 'local_fire_department', href: 'brasa' },
      { name: 'Combos', icon: 'takeout_dining', href: 'combos' },
      { name: 'Parrillas', icon: 'outdoor_grill', href: 'parrillas' },
      { name: 'Bebidas', icon: 'local_bar', href: 'bebidas' },
    ],
    demoProducts: [
      { name: '1/4 Pollo a la Brasa', price: 22.90, category: 'Pollos a la Brasa', image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80', description: 'Con papas y ensalada fresca' },
      { name: 'Combo 6 Alitas', price: 18.00, category: 'Combos', image: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?w=400&q=80', description: 'Bañadas en salsa BBQ o Spicy' },
      { name: 'Parrilla Mixta', price: 54.00, category: 'Parrillas', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', description: 'Pollo, res y embutidos' },
      { name: 'Inca Kola 1L', price: 7.00, category: 'Bebidas', image: 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=400&q=80', description: 'Gaseosa peruana bien helada' },
    ],
  },
};

export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATES).filter((t) => t.id !== 'default');
}

export function getTemplate(id: string): TemplateConfig | null {
  return TEMPLATES[id] ?? null;
}

export function getDemoProducts(templateId: string): DemoProduct[] {
  const tmpl = TEMPLATES[templateId];
  return tmpl?.demoProducts ?? [];
}
