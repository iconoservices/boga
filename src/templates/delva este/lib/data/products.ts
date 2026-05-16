export interface Product {
    id: string;
    sku?: string;
    slug?: string;
    title: string;
    category: string;
    categoryId: string;
    price: number;
    image: string;
    description?: string; // 👈 ¡LISTO! El guardia ya tiene este nombre en la lista
    waNumber?: string;
    gallery?: string[];
    colors?: string[];
    tags?: string[];
    details?: string[];
    subCategoryId?: string;
    subSubCategoryId?: string;
    userId?: string;
    hasOffer?: boolean;
    originalPrice?: number;
    costPrice?: number;
    stock?: number;
    createdAt?: string;
    viewCount?: number;
    approvalRate?: number;
}

export const CATEGORIES = [
    { id: 'all', name: 'Todos' }
];

export const products: Product[] = [
    {
        id: '1',
        title: 'Sombrero Amazonía "Río Claro"',
        category: 'Moda Selva',
        categoryId: 'moda-selva',
        price: 120.00,
        image: 'https://picsum.photos/seed/delva1/800/1000',
        colors: ['#D2B48C', '#8B4513'],
        subCategoryId: 'sombreros',
        description: 'Hecho a mano con fibras de palma real. Ala ancha para máxima protección solar. Cinta de cuero legítimo. Fresco y ligero para el calor de Satipo.'
    },
    {
        id: '2',
        title: 'Café Esmeralda - Tueste Oscuro',
        category: 'Café Premium',
        categoryId: 'cafe',
        price: 45.00,
        image: 'https://picsum.photos/seed/delva2/800/800',
        description: 'Café de altura cultivado a 1500 msnm. Notas de chocolate amargo y frutos secos. Tueste artesanal en lotes pequeños. Aroma intenso y cuerpo robusto.'
    },
    {
        id: '3',
        title: 'Collar de Semillas Huayruro',
        category: 'Artesanías',
        categoryId: 'artesania',
        price: 35.00,
        image: 'https://picsum.photos/seed/delva3/800/1200',
        colors: ['#FF0000', '#000000'],
        description: 'Semillas seleccionadas de la selva central. Hilo encerado de alta resistencia. Diseño tradicional Asháninka. Amuleto de protección y buena suerte.'
    },
    // ... los demás siguen igual, TypeScript ya no se quejará de ellos
    {
        id: '4',
        title: 'Camisa Lino Tropical "Brisa"',
        category: 'Moda Selva',
        categoryId: 'moda-selva',
        price: 180.00,
        image: 'https://picsum.photos/seed/delva4/800/900',
        colors: ['#FFFFFF', '#F5F5DC']
    },
    {
        id: '5',
        title: 'Pack Presets "Jungle Glow"',
        category: 'Presets Visuales',
        categoryId: 'visuals',
        price: 89.00,
        image: 'https://picsum.photos/seed/delva5/800/800',
    },
    {
        id: '6',
        title: 'Bolso de Paja "Iquitos"',
        category: 'Moda Selva',
        categoryId: 'moda-selva',
        price: 150.00,
        image: 'https://picsum.photos/seed/delva6/800/1100',
        colors: ['#E3C16F']
    },
    {
        id: '7',
        title: 'Vasija de Barro Pintada',
        category: 'Artesanías',
        categoryId: 'artesania',
        price: 85.00,
        image: 'https://picsum.photos/seed/delva7/800/1000',
    },
    {
        id: '8',
        title: 'Café Grano Entero',
        category: 'Café Premium',
        categoryId: 'cafe',
        price: 55.00,
        image: 'https://picsum.photos/seed/delva8/800/850',
    },
    {
        id: '9',
        title: 'Lentes de Sol "Tucán"',
        category: 'Moda Selva',
        categoryId: 'moda',
        price: 199.00,
        image: 'https://picsum.photos/seed/delva9/800/950',
        colors: ['#000000', '#4B5320'],
        subCategoryId: 'lentes'
    },
    {
        id: '10',
        title: 'Filtro Vintage "Amazonia 90s"',
        category: 'Presets Visuales',
        categoryId: 'visuals',
        price: 49.00,
        image: 'https://picsum.photos/seed/delva10/800/1200',
    },
    {
        id: '11',
        title: 'Vestido "Atardecer Loretano"',
        category: 'Moda Selva',
        categoryId: 'moda',
        price: 220.00,
        image: 'https://picsum.photos/seed/delva11/800/1000',
        colors: ['#FF7F50', '#8FBC8F']
    },
    {
        id: '12',
        title: 'Pack Degustación 3 Cafés',
        category: 'Café Premium',
        categoryId: 'cafe',
        price: 110.00,
        image: 'https://picsum.photos/seed/delva12/800/800',
    },
    {
        id: '13',
        title: 'Brazalete Tejido a Mano',
        category: 'Artesanías',
        categoryId: 'artesania',
        price: 25.00,
        image: 'https://picsum.photos/seed/delva13/800/1150',
    },
    {
        id: '14',
        title: 'Sombrero Panamá "Export"',
        category: 'Moda Selva',
        categoryId: 'moda',
        price: 185.00,
        image: 'https://picsum.photos/seed/delva14/800/900',
    },
    {
        id: '15',
        title: 'LUT Color Video "Deep Green"',
        category: 'Presets Visuales',
        categoryId: 'visuals',
        price: 120.00,
        image: 'https://picsum.photos/seed/delva15/800/1050',
    },
    {
        id: '16',
        title: 'Prensa Francesa Bambú',
        category: 'Café Premium',
        categoryId: 'cafe',
        price: 95.00,
        image: 'https://picsum.photos/seed/delva16/800/950',
    },
    {
        id: '17',
        title: 'Tapiz Mural Shipibo',
        category: 'Artesanías',
        categoryId: 'artesania',
        price: 350.00,
        image: 'https://picsum.photos/seed/delva17/800/1250',
    },
    {
        id: '18',
        title: 'Casaca "Explorador"',
        category: 'Moda Selva',
        categoryId: 'moda',
        price: 299.00,
        image: 'https://picsum.photos/seed/delva18/800/1000',
        colors: ['#4A5D23', '#C19A6B']
    },
    {
        id: '19',
        title: 'Taza de Cerámica Rústica',
        category: 'Café Premium',
        categoryId: 'cafe',
        price: 35.00,
        image: 'https://picsum.photos/seed/delva19/800/850',
    },
    {
        id: '20',
        title: 'Zapatillas de Lona Orgánica',
        category: 'Moda Selva',
        categoryId: 'moda',
        price: 160.00,
        image: 'https://picsum.photos/seed/delva20/800/900',
        colors: ['#FFFFFF', '#2F4F4F']
    },
    {
        id: 's1',
        title: 'Asesoría en Marca Personal',
        category: 'Servicios Profesionales',
        categoryId: 'services',
        price: 250.00,
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
        tags: ['coach', 'negocios', 'premium']
    },
    {
        id: 's2',
        title: 'Sesión Fotográfica "Urban Selva"',
        category: 'Servicios Profesionales',
        categoryId: 'services',
        price: 450.00,
        image: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&q=80',
        tags: ['foto', 'evento', 'pro']
    }
];