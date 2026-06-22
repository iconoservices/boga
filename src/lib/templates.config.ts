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

export interface TemplateConfig {
  id: string;
  name: string;
  category: string;
  theme: StoreTheme;
  heroImage: string;
  heroAlt: string;
  categories: { name: string; icon: string; href: string }[];
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
  },

  polleria: {
    id: 'polleria',
    name: 'Pollería Bravoz',
    category: 'Restaurantes',
    heroImage: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=1200&q=80',
    heroAlt: 'Pollo a la brasa dorado crujiente con papas fritas',
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
  },
};

export function getTemplate(id: string): TemplateConfig | null {
  return TEMPLATES[id] ?? null;
}
