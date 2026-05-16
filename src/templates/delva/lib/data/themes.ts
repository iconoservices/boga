export const STORE_THEMES = [
  { id: 'fashion-minimal', name: '👗 Moda & Estilo', primary: '#111111', bg: '#ffffff', surface: '#f9f9f9', font: 'Playfair Display', radius: '2px' },
  { id: 'organic-handmade', name: '🌿 Artesanal & Natural', primary: '#6d4c41', bg: '#ffffff', surface: '#fffaf0', font: 'Montserrat', radius: '20px' },
  { id: 'fresh-food', name: '🥗 Alimentos Frescos', primary: '#2e7d32', bg: '#f1f8e9', surface: '#ffffff', font: 'Outfit', radius: '15px' },
  { id: 'luxury-jewelry', name: '💎 Joyería & Lujo', primary: '#c5a059', bg: '#fcfaf7', surface: '#ffffff', font: 'Cinzel', radius: '4px' },
  { id: 'soft-beauty', name: '💄 Belleza & Cuidado', primary: '#d81b60', bg: '#fff5f8', surface: '#ffffff', font: 'Quicksand', radius: '30px' },
  { id: 'supermarket', name: '🛒 Supermercado Online', primary: '#00a651', bg: '#f5f5f5', surface: '#ffffff', font: 'Inter', radius: '4px' },
  { id: 'home-decor', name: '🛋️ Hogar & Decoración', primary: '#1b3a5c', bg: '#f9f9f7', surface: '#ffffff', font: 'Inter', radius: '6px' },
  { id: 'lux-gold', name: '✨ Boutique Exclusiva', primary: '#8a6d3b', bg: '#0a0a0a', surface: '#1a1a1a', font: 'Prata', radius: '0px' },
  { id: 'tech-neon', name: '🎮 Tecnología & Gaming', primary: '#00ffcc', bg: '#050a10', surface: '#0d1621', font: 'Orbitron', radius: '12px' },
  { id: 'fast-food', name: '🍗 Broaster & Grill', primary: '#ff5722', bg: '#fff8f1', surface: '#ffffff', font: 'Outfit', radius: '12px' },
];

export const THEME_DEFAULTS: Record<string, { categories: { id: string, name: string }[], tags: string[] }> = {
  'fashion-minimal': {
    categories: [{ id: 'mujer', name: 'Mujer' }, { id: 'hombre', name: 'Hombre' }, { id: 'accesorios', name: 'Accesorios' }, { id: 'calzado', name: 'Calzado' }, { id: 'bolso', name: 'Bolso' }],
    tags: ['nuevo', 'oferta', 'tendencia', 'exclusivo', 'temporada', 'outlet'],
  },
  'organic-handmade': {
    categories: [{ id: 'artesania', name: 'Artesanía' }, { id: 'natural', name: 'Natural' }, { id: 'planta', name: 'Planta' }, { id: 'textil', name: 'Textil' }],
    tags: ['hecho-a-mano', 'orgánico', 'natural', 'ecológico', 'limited'],
  },
  'fresh-food': {
    categories: [{ id: 'fruta', name: 'Fruta' }, { id: 'verdura', name: 'Verdura' }, { id: 'carne', name: 'Carne' }, { id: 'lacteo', name: 'Lácteo' }, { id: 'bebida', name: 'Bebida' }, { id: 'panaderia', name: 'Panadería' }, { id: 'snack', name: 'Snack' }],
    tags: ['fresco', 'orgánico', 'oferta', 'del-día', 'sin-gluten', 'vegano'],
  },
  'luxury-jewelry': {
    categories: [{ id: 'collar', name: 'Collar' }, { id: 'anillo', name: 'Anillo' }, { id: 'pulsera', name: 'Pulsera' }, { id: 'arete', name: 'Arete' }, { id: 'reloj', name: 'Reloj' }],
    tags: ['oro', 'plata', 'diamante', 'exclusivo', 'edición-limitada', 'personalizable'],
  },
  'soft-beauty': {
    categories: [{ id: 'maquillaje', name: 'Maquillaje' }, { id: 'skincare', name: 'Skincare' }, { id: 'cabello', name: 'Cabello' }, { id: 'una', name: 'Uña' }, { id: 'perfume', name: 'Perfume' }],
    tags: ['cruelty-free', 'vegano', 'natural', 'hidratante', 'profesional', 'novedad'],
  },
  'supermarket': {
    categories: [{ id: 'fruta-verdura', name: 'Fruta y Verdura' }, { id: 'carne-pescado', name: 'Carne y Pescado' }, { id: 'lacteo-huevo', name: 'Lácteo y Huevo' }, { id: 'bebida', name: 'Bebida' }, { id: 'snack-dulce', name: 'Snack y Dulce' }, { id: 'limpieza', name: 'Limpieza' }],
    tags: ['oferta', '2x1', 'fresco', 'importado', 'sin-gluten', 'orgánico'],
  },
  'home-decor': {
    categories: [{ id: 'sala', name: 'Sala' }, { id: 'dormitorio', name: 'Dormitorio' }, { id: 'cocina', name: 'Cocina' }, { id: 'bano', name: 'Baño' }, { id: 'exterior', name: 'Exterior' }, { id: 'iluminacion', name: 'Iluminación' }],
    tags: ['nuevo-diseño', 'oferta', 'exclusivo', 'importado', 'hecho-a-mano', 'madera'],
  },
  'lux-gold': {
    categories: [{ id: 'coleccion', name: 'Colección' }, { id: 'edicion-limitada', name: 'Edición Limitada' }, { id: 'accesorios', name: 'Accesorios' }, { id: 'exclusivo', name: 'Exclusivo' }],
    tags: ['luxury', 'premium', 'exclusivo', 'colección', 'artesanal', 'oro'],
  },
  'tech-neon': {
    categories: [{ id: 'periferico', name: 'Periférico' }, { id: 'pc-gaming', name: 'PC Gaming' }, { id: 'consola', name: 'Consola' }, { id: 'accesorio-tech', name: 'Accesorio' }, { id: 'audio', name: 'Audio' }],
    tags: ['gaming', 'nuevo', 'oferta', 'edición-limitada', 'rgb', 'inalámbrico'],
  },
  'fast-food': {
    categories: [{ id: 'combo', name: 'Combo' }, { id: 'pollo-broaster', name: 'Pollo Broaster' }, { id: 'salchipapa', name: 'Salchipapa' }, { id: 'hamburguesa', name: 'Hamburguesa' }, { id: 'bebida', name: 'Bebida' }, { id: 'extra', name: 'Extra' }],
    tags: ['picante', 'combo-familiar', 'oferta-dia', 'delivery-gratis', 'calentito', 'crunchy'],
  },
};
