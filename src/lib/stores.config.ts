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

export interface StoreConfig {
  slug: string;
  name: string;
  tagline: string;
  marketplaceCategory: string;
  template: 'sunset' | 'natura' | 'amazonia' | 'default' | 'sweetkittynails' | 'estilosmirka';
  theme: StoreTheme;
  heroImage: string;
  heroAlt: string;
  categories: { name: string; icon: string; href: string }[];
}

export const stores: Record<string, StoreConfig> = {
  sunset: {
    slug: 'sunset',
    name: 'Sunset Lounge',
    tagline: 'Bar & Café',
    marketplaceCategory: 'Restaurantes',
    template: 'sunset',
    heroImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBHmeiaOsTXv2-kWJBCWi9uFd37xlyoGDpux03IogklXq1QxJFIOqy45sOanh9a3GdXv0m0yRNtTOyLQwkBZNlFYd_y4eVOvViwD1pK4QFZXmJomFCUqGECObJ1Ix4Tdq9hGBTItdravESWy1zWgq4lP8_HewhOD6dfZgTM4uX7I-FGbDFXXMW5YlaAVBPtzWyKQxm8L1T8SnJYQsAiPTbpU98meANSMRdWExpDhL8gueDCH_6C4_xX0TYuw8Y8CTjTT0MYAg6hEjpT',
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
    slug: 'natura',
    name: 'Natura Market',
    tagline: 'Productos naturales amazónicos',
    marketplaceCategory: 'Salud y Bienestar',
    template: 'natura',
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
    slug: 'amazonia',
    name: 'Amazonia Market',
    tagline: 'Tesoros de la selva profunda',
    marketplaceCategory: 'Mercado',
    template: 'amazonia',
    heroImage: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
    heroAlt: 'productos amazónicos frescos',
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
  
  sweetkittynails: {
    slug: 'sweetkittynails',
    name: 'Sweet Kitty Nails',
    tagline: 'El arte en tus uñas con un toque de dulzura y estilo',
    marketplaceCategory: 'Moda y Belleza',
    template: 'sweetkittynails',
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
    slug: 'estilosmirka',
    name: 'Estilos Mirka',
    tagline: 'Moda elegante y sofisticada para mujeres que imponen tendencia',
    marketplaceCategory: 'Moda',
    template: 'estilosmirka',
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
};

export function getStore(slug: string): StoreConfig | null {
  return stores[slug] ?? null;
}
