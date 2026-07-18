'use client';

import React, { useState, useEffect } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { useDemo } from '@/context/DemoContext';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';

interface SweetKittyNailsTemplateProps {
  store: StoreConfig;
}

const MOCK_SERVICES = [
  { id: 'manicura-gel', title: 'Manicura Gel Semi-Permanente Glossy', price: 55.00, duration: '45 min', category: 'manicura', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', description: 'Esmaltado semipermanente de alta duración con marcas importadas y curado LED. Incluye limado de uñas, perfilado morfológico y cuidado intensivo de cutículas.' },
  { id: 'acrilicas-esculpidas', title: 'Uñas Acrílicas Esculpidas Premium', price: 120.00, duration: '120 min', category: 'acrilicas', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80', description: 'Esculpido profesional con acrílico de alta calidad. Elige tu forma preferida (coffin, stiletto, almendrada o cuadrada), largo y esmaltado semipermanente de tu elección.' },
  { id: 'nailart-3d', title: 'Nail Art 3D & Pedrería Fina (x Mano)', price: 40.00, duration: '30 min', category: 'nailart', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', description: 'Diseño artístico tridimensional hecho a mano alzada. Incluye cristales Swarovsky genuinos, efectos holográficos, glitter encapsulado y stickers kawaii.' },
  { id: 'jelly-spa', title: 'Pedicura Jelly Spa Relajante & Exfoliante', price: 85.00, duration: '60 min', category: 'pedicura', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80', description: 'Baño de pies con gelatina termoterapéutica aromática, exfoliación profunda de sales marinas, mascarilla hidratante, masaje con aceites calientes y esmaltado.' },
  { id: 'kapping-gel', title: 'Kapping Gel Fortalecedor Protector', price: 80.00, duration: '60 min', category: 'manicura', image: 'https://images.unsplash.com/photo-1522337094846-8a81113521f0?w=400&q=80', description: 'Aplicación de una fina capa de gel protector directamente sobre tu uña natural para proporcionarle dureza, resistencia y evitar roturas o escamaciones.' },
  { id: 'retiro-nutricion', title: 'Retiro Seguro de Acrílico + Nutrición Coco', price: 30.00, duration: '30 min', category: 'manicura', image: 'https://images.unsplash.com/photo-1607875934601-e4129caf24e8?w=400&q=80', description: 'Retiro profesional libre de daños mecánicos empleando removedores especializados. Finaliza con pulido suave, base endurecedora y aceites de argán y coco.' }
];

const MOCK_PRODUCTS = [
  { id: 'aceite-cuticulas', title: 'Aceite de Cutículas Sweet Fruits & Rosas', price: 25.00, originalPrice: 32.00, hasOffer: true, category: 'manicura', image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80', rating: 5.0, reviews: 42, description: 'Fórmula nutritiva orgánica con vitamina E para unas cutículas súper hidratadas y suaves.' },
  { id: 'crema-velvet', title: 'Crema de Manos Velvet Silk Nutritiva', price: 38.00, originalPrice: 38.00, hasOffer: false, category: 'manicura', image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=400&q=80', rating: 4.9, reviews: 26, description: 'Hidratación ultra profunda que deja la piel con tacto aterciopelado sin sensación grasa.' },
  { id: 'esmalte-glossy', title: 'Esmalte Gel Sweet Kitty Glossy Pink Edition', price: 22.00, originalPrice: 30.00, hasOffer: true, category: 'nailart', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80', rating: 4.8, reviews: 19, description: 'Tono rosa icónico con brillo de larga duración y resistencia a rayaduras.' },
  { id: 'kit-limas', title: 'Kit de Limas Profesionales Zebra 100/180 x3', price: 15.00, originalPrice: 15.00, hasOffer: false, category: 'acrilicas', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', rating: 4.7, reviews: 11, description: 'Limas de grano profesional de larga duración ideales para dar forma a acrílico o uña natural.' }
];

const STYLISTS = [
  { id: 'kitty', name: 'Kitty (Fundadora & Master Artist)', role: 'Especialista en Acrílicos y Arte 3D', avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?w=150&q=80' },
  { id: 'mia', name: 'Mia Chang', role: 'Especialista en Manicura Gel & Kapping', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80' },
  { id: 'sofia', name: 'Sofía López', role: 'Experta en Jelly Spa & Diseños Kawaii', avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?w=150&q=80' }
];

const STORIES = [
  { id: 's1', title: 'Pink Coffin', type: 'Acrílicas', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&q=80' },
  { id: 's2', title: 'Cherry Jelly Spa', type: 'Tratamiento', img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&q=80' },
  { id: 's3', title: 'Diseño 3D', type: 'Kawaii Art', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80' },
  { id: 's4', title: 'Pastel French', type: 'Gel Glam', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=300&q=80' }
];

export default function SweetKittyNailsTemplate({ store }: SweetKittyNailsTemplateProps) {
  const { isDemoVisible } = useDemo();
  const [activeTab, setActiveTab] = useState<'servicios' | 'productos'>('servicios');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cart State
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Dynamic Products from Supabase
  const [supabaseProducts, setSupabaseProducts] = useState<any[]>([]);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedStylist, setSelectedStylist] = useState<any>(STYLISTS[0]);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState('');

  useEffect(() => {
    const fetchSupabaseProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('store', store.slug);
        
        if (data && !error && data.length > 0) {
          const formatted = data.map((p) => ({
            id: p.id,
            title: p.name,
            price: p.price,
            originalPrice: p.price,
            hasOffer: false,
            category: p.category ? p.category.toLowerCase() : 'manicura',
            image: p.image || 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80',
            rating: 4.9,
            reviews: 8,
            description: p.description || 'Producto exclusivo de Sweet Kitty Nails.'
          }));
          setSupabaseProducts(formatted);
        }
      } catch (err) {
        console.error('Error fetching Supabase products:', err);
      }
    };

    fetchSupabaseProducts();
  }, []);

  const theme = store.theme;
  const allProducts = isDemoVisible('sweetkittynails')
    ? [...supabaseProducts, ...MOCK_PRODUCTS]
    : supabaseProducts;

  // Filtering Logic
  const filteredServices = MOCK_SERVICES.filter((srv) => {
    const matchCat = activeCategory === 'all' || srv.category === activeCategory;
    const matchSearch = srv.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        srv.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredProducts = allProducts.filter((prod) => {
    const matchCat = activeCategory === 'all' || prod.category === activeCategory;
    const matchSearch = prod.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        prod.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  // Cart Handlers
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, amount: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + amount;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Booking Handlers
  const handleOpenBooking = (service?: any) => {
    if (service) {
      setSelectedService(service);
    } else {
      setSelectedService(MOCK_SERVICES[0]);
    }
    setBookingSuccess(false);
    setIsBookingOpen(true);
  };

  const submitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !bookingDate || !bookingTime) {
      alert('Por favor complete los campos requeridos.');
      return;
    }

    const code = 'SKN-' + Math.floor(100000 + Math.random() * 900000);
    setBookingCode(code);
    setBookingSuccess(true);
  };

  // WhatsApp integrations
  const sendCartToWhatsApp = () => {
    const header = `*Pedido de ${store.name}*\n-------------------------\n`;
    const itemsText = cart.map(item => `- ${item.product.title} (x${item.quantity}): S/ ${(item.product.price * item.quantity).toFixed(2)}`).join('\n');
    const footer = `\n-------------------------\n*Total:* S/ ${cartTotal.toFixed(2)}`;
    enviarPedidoPorWhatsApp(store, header + itemsText + footer);
  };

  const sendBookingToWhatsApp = () => {
    enviarPedidoPorWhatsApp(
      store,
      `*Nueva Reserva en ${store.name}*\n` +
      `-------------------------\n` +
      `*Código:* ${bookingCode}\n` +
      `*Servicio:* ${selectedService.title}\n` +
      `*Precio:* S/ ${selectedService.price.toFixed(2)}\n` +
      `*Fecha:* ${bookingDate}\n` +
      `*Hora:* ${bookingTime}\n` +
      `*Nail Artist:* ${selectedStylist.name}\n` +
      `*Cliente:* ${clientName}\n` +
      `*Teléfono:* ${clientPhone}\n` +
      `*Nota:* ${clientNote || 'Ninguna'}`
    );
  };

  return (
    <div style={{ background: theme.background, minHeight: '100vh', fontFamily: theme.fontBody, color: theme.onBackground, paddingBottom: '90px' }}>
      {/* External CSS imports */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Pacifico&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── HEADER ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-pink-100 shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {store.logoImage ? (
              <img src={store.logoImage} alt={store.name} className="w-9 h-9 rounded-full object-cover border border-pink-100 shadow" />
            ) : (
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg shadow-md animate-bounce" style={{ background: `linear-gradient(135deg, ${theme.primary}, #ffb3c6)` }}>
                🐈
              </span>
            )}
            <span style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: theme.fontHeadline, color: theme.primaryContainer, letterSpacing: '-0.8px' }} className="flex items-center gap-1.5">
              Sweet Kitty <span className="text-pink-400 font-normal font-['Pacifico']" style={{ fontSize: '1.25rem' }}>Nails</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-pink-50 transition-colors cursor-pointer flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: theme.primary }}>shopping_bag</span>
              {cartItemsCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-white shadow animate-pulse" style={{ backgroundColor: theme.primary }}>
                  {cartItemsCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => handleOpenBooking()}
              className="hidden md:flex items-center gap-1 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, #ff4f7b)` }}
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              Reservar Cita
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-pink-900 py-16 md:py-24">
        <div className="absolute inset-0 z-0">
          <img 
            src={store.heroImage} 
            alt={store.heroAlt} 
            className="w-full h-full object-cover opacity-50 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-pink-950/90 via-pink-950/70 to-transparent" />
        </div>

        {/* Floating Sparkles in CSS */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute top-10 left-1/4 text-white text-2xl animate-pulse">✨</div>
          <div className="absolute top-1/2 left-2/3 text-white text-xl animate-pulse delay-500">🌸</div>
          <div className="absolute bottom-10 left-1/3 text-white text-3xl animate-pulse delay-1000">✨</div>
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8 text-white space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[10px] font-bold text-white/95 uppercase tracking-widest border border-white/25">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-300" />
              Nail Art & Spa de Lujo
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight" style={{ fontFamily: theme.fontHeadline }}>
              El arte en tus uñas con un <br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${theme.primary}, #ffe5ec)` }}>toque de dulzura y estilo</span>
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-xl font-light">
              {store.tagline}. Descubre un oasis de ternura diseñado para brindarte las manicuras más bellas, uñas acrílicas impecables y diseños 3D personalizados.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button 
                onClick={() => handleOpenBooking()}
                className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider text-white shadow-xl cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, #ff4f7b)` }}
              >
                Reservar Cita Ahora
              </button>
              <button 
                onClick={() => {
                  const element = document.getElementById('catalog');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/30 cursor-pointer active:scale-95 transition-all"
              >
                Ver Servicios & Productos
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STORIES / TENDENCIAS ────────────────────── */}
      <section className="py-8 max-w-6xl mx-auto px-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-4 flex items-center gap-1">🌸 Galería de Diseños Recientes</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {STORIES.map((story) => (
            <div key={story.id} className="min-w-[120px] w-[120px] shrink-0 snap-start flex flex-col items-center gap-2 group cursor-pointer">
              <div className="relative w-20 h-20 rounded-full p-[3px] border-2 group-hover:scale-105 transition-transform duration-300 shadow-md" style={{ borderColor: theme.primary }}>
                <div className="w-full h-full rounded-full overflow-hidden bg-pink-50">
                  <img src={story.img} className="w-full h-full object-cover" alt={story.title} />
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-pink-100 shadow-sm text-center truncate w-[90px] whitespace-nowrap text-pink-700">
                  {story.type}
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-700 text-center tracking-tight truncate w-full">{story.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── MAIN TABS & CATALOG ───────────────────────── */}
      <section id="catalog" className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Tabs Bar */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border-b border-pink-100 pb-5 mb-8">
          {/* Tabs */}
          <div className="flex p-1 bg-pink-100/40 rounded-xl self-start border border-pink-100/50">
            <button
              onClick={() => { setActiveTab('servicios'); setActiveCategory('all'); }}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${activeTab === 'servicios' ? 'bg-white shadow text-pink-700 font-extrabold' : 'text-gray-500 hover:text-pink-700'}`}
            >
              <span className="material-symbols-outlined text-sm">dry_cleaning</span>
              Servicios de Manicura
            </button>
            <button
              onClick={() => { setActiveTab('productos'); setActiveCategory('all'); }}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${activeTab === 'productos' ? 'bg-white shadow text-pink-700 font-extrabold' : 'text-gray-500 hover:text-pink-700'}`}
            >
              <span className="material-symbols-outlined text-sm">shopping_bag</span>
              Productos de Cuidado
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-300 text-sm">🔍</span>
            <input
              type="text"
              placeholder={`Buscar en ${activeTab === 'servicios' ? 'servicios' : 'productos'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-200 focus:outline-none focus:ring-2 bg-white text-sm font-medium focus:border-pink-300"
              style={{ '--tw-ring-color': theme.primary } as any}
            />
          </div>
        </div>

        {/* Category Ribbon */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'all', label: '✨ Mostrar Todo' },
            { id: 'manicura', label: '💅 Manicura & Gel' },
            { id: 'acrilicas', label: '🖌️ Uñas Acrílicas' },
            { id: 'nailart', label: '🎨 Nail Art 3D' },
            { id: 'pedicura', label: '💆‍♀️ Pedicura Jelly Spa' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer"
              style={{
                backgroundColor: activeCategory === cat.id ? `${theme.primary}12` : 'white',
                color: activeCategory === cat.id ? theme.primary : '#7a5259',
                borderColor: activeCategory === cat.id ? theme.primary : 'rgba(255,133,162,0.15)',
                fontWeight: activeCategory === cat.id ? 800 : 600
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dynamic Display Grid */}
        {activeTab === 'servicios' ? (
          <div>
            {filteredServices.length === 0 ? (
              <div className="text-center py-16 opacity-50 bg-white rounded-3xl border border-pink-100 shadow-sm">
                <span className="material-symbols-outlined text-4xl mb-2 text-pink-300">search_off</span>
                <p className="font-bold text-gray-600">No se encontraron servicios de manicura.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredServices.map((srv) => (
                  <div key={srv.id} className="bg-white rounded-3xl p-5 shadow-sm border border-pink-50 flex flex-col md:flex-row gap-5 hover:shadow-md transition-shadow group">
                    <div className="w-full md:w-36 h-36 rounded-2xl overflow-hidden shrink-0 bg-pink-50 relative">
                      <img src={srv.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={srv.title} />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[9px] font-bold text-white flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">schedule</span> {srv.duration}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg text-gray-900 leading-snug group-hover:text-pink-500 transition-colors" style={{ fontFamily: theme.fontHeadline }}>
                          {srv.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {srv.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-pink-50 pt-3 mt-3">
                        <span className="font-black text-xl" style={{ color: theme.primary }}>
                          S/ {srv.price.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleOpenBooking(srv)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition-all cursor-pointer hover:brightness-105 active:scale-95 flex items-center gap-1"
                          style={{ background: `linear-gradient(135deg, ${theme.primary}, #ff4f7b)` }}
                        >
                          Reservar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 opacity-50 bg-white rounded-3xl border border-pink-100 shadow-sm">
                <span className="material-symbols-outlined text-4xl mb-2 text-pink-300">search_off</span>
                <p className="font-bold text-gray-600">No se encontraron productos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {filteredProducts.map((prod) => (
                  <div key={prod.id} className="bg-white rounded-3xl border border-pink-50 overflow-hidden shadow-sm flex flex-col group relative">
                    {/* Badge Offer */}
                    {prod.hasOffer && (
                      <span className="absolute top-3 left-3 bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow animate-bounce">
                        OFERTA
                      </span>
                    )}

                    <div className="aspect-square bg-pink-50/20 overflow-hidden relative">
                      <img src={prod.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={prod.title} />
                      <button
                        onClick={() => addToCart(prod)}
                        className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white hover:bg-pink-50 shadow-lg border border-pink-100 flex items-center justify-center text-pink-600 transition-all hover:scale-110 active:scale-90 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg">shopping_cart</span>
                      </button>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-pink-400 text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-[10px] font-bold text-gray-500">{prod.rating} <span className="opacity-60">({prod.reviews})</span></span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-800 leading-snug line-clamp-2">
                          {prod.title}
                        </h4>
                      </div>

                      <div className="flex items-end justify-between mt-3 pt-2 border-t border-pink-50">
                        <div className="flex flex-col">
                          {prod.hasOffer && prod.originalPrice && (
                            <span className="text-[10px] text-gray-400 line-through font-bold">
                              S/ {prod.originalPrice.toFixed(2)}
                            </span>
                          )}
                          <span className="font-black text-base text-gray-900">
                            S/ {prod.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── SHOPPING CART DRAWER ─────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div 
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-pink-950/20 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            {/* Cart Header */}
            <div className="p-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-pink-600">shopping_bag</span>
                <h3 className="font-bold text-gray-900">Tu Bolsa Sweet Kitty</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-16">
                  <span className="material-symbols-outlined text-5xl mb-2 text-pink-300">shopping_bag</span>
                  <p className="font-bold text-pink-700">Tu bolsa está vacía.</p>
                  <p className="text-xs text-gray-400 mt-1">Explora productos premium y añade brillo a tus uñas.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex gap-4 p-3 bg-pink-50/20 rounded-2xl border border-pink-100/30 relative">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border border-pink-100">
                      <img src={item.product.image} className="w-full h-full object-cover" alt={item.product.title} />
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 truncate leading-snug">
                          {item.product.title}
                        </h4>
                        <span className="font-black text-xs block text-pink-600 mt-1">
                          S/ {item.product.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity adjust */}
                        <div className="flex items-center bg-white border border-pink-100 rounded-lg p-0.5">
                          <button 
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-5 h-5 flex items-center justify-center font-bold text-xs text-pink-500 hover:text-pink-700 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-[11px] font-black text-gray-800">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-5 h-5 flex items-center justify-center font-bold text-xs text-pink-500 hover:text-pink-700 cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Remove */}
                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-[10px] font-bold text-pink-500 hover:underline cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-pink-100 bg-pink-50/30 space-y-4">
                <div className="flex items-center justify-between font-black text-gray-900 text-sm">
                  <span>Subtotal:</span>
                  <span className="text-lg" style={{ color: theme.primary }}>S/ {cartTotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={sendCartToWhatsApp}
                    className="w-full py-3 rounded-full text-xs font-black uppercase text-white shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-95 transition-all cursor-pointer bg-[#25D366]"
                  >
                    💬 Enviar Pedido vía WhatsApp
                  </button>
                  <button 
                    onClick={() => { setIsCartOpen(false); handleOpenBooking(); }}
                    className="w-full py-3 rounded-full text-xs font-black uppercase bg-pink-950 hover:bg-black text-white text-center block transition-all cursor-pointer"
                  >
                    Programar Cita Complementaria
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── APPOINTMENT BOOKING MODAL ────────────────── */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            onClick={() => setIsBookingOpen(false)}
            className="absolute inset-0 bg-pink-950/45 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 border border-pink-100">
            {/* Header */}
            <div className="p-5 border-b border-pink-100 flex items-center justify-between sticky top-0 bg-white z-20">
              <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: theme.fontHeadline }}>
                {bookingSuccess ? '¡Confirmación de Cita Sweet!' : 'Reservar Cita Sweet Kitty'}
              </h3>
              <button 
                onClick={() => setIsBookingOpen(false)}
                className="w-8 h-8 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              /* Booking Success view */
              <div className="p-6 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-pink-100 text-pink-600 mx-auto flex items-center justify-center text-3xl shadow-sm border border-pink-200">
                  🐈
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-gray-800" style={{ fontFamily: theme.fontHeadline }}>
                    ¡Tu cita está agendada!
                  </h4>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-black">
                    CÓDIGO DE RESERVA: <span style={{ color: theme.primary }}>{bookingCode}</span>
                  </p>
                </div>

                {/* Reservation Summary */}
                <div className="bg-pink-50/20 border border-pink-100 rounded-2xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-pink-50 pb-1.5">
                    <span className="text-pink-400 font-medium">Servicio:</span>
                    <span className="font-bold text-gray-800">{selectedService?.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-pink-50 pb-1.5">
                    <span className="text-pink-400 font-medium">Precio:</span>
                    <span className="font-bold text-pink-600">S/ {selectedService?.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-pink-50 pb-1.5">
                    <span className="text-pink-400 font-medium">Fecha & Hora:</span>
                    <span className="font-bold text-gray-800">{bookingDate} a las {bookingTime}</span>
                  </div>
                  <div className="flex justify-between border-b border-pink-50 pb-1.5">
                    <span className="text-pink-400 font-medium">Nail Artist:</span>
                    <span className="font-bold text-gray-800">{selectedStylist?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pink-400 font-medium">Cliente:</span>
                    <span className="font-bold text-gray-800">{clientName} ({clientPhone})</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed px-4">
                  ¡Qué emoción! Te esperamos 10 minutos antes en nuestro salón para consentir tus uñas y hacer magia. 💖
                </p>

                <div className="flex flex-col gap-2 pt-4">
                  <button 
                    onClick={sendBookingToWhatsApp}
                    className="w-full py-3 rounded-full text-xs font-black uppercase text-white shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-95 transition-all cursor-pointer bg-[#25D366]"
                  >
                    💬 Notificar a Kitty por WhatsApp
                  </button>
                  <button 
                    onClick={() => setIsBookingOpen(false)}
                    className="w-full py-3 rounded-full text-xs font-black uppercase bg-pink-50 hover:bg-pink-100 text-pink-700 transition-all cursor-pointer"
                  >
                    Volver a la Tienda
                  </button>
                </div>
              </div>
            ) : (
              /* Booking Form View */
              <form onSubmit={submitBooking} className="p-5 space-y-5">
                {/* Step 1: Service Selected */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-pink-400 uppercase tracking-wider block">1. Servicio Sweet Seleccionado</label>
                  <select
                    value={selectedService?.id || ''}
                    onChange={(e) => {
                      const s = MOCK_SERVICES.find(item => item.id === e.target.value);
                      if (s) setSelectedService(s);
                    }}
                    className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-xs font-semibold text-gray-800 focus:outline-none"
                  >
                    {MOCK_SERVICES.map((srv) => (
                      <option key={srv.id} value={srv.id}>{srv.title} - S/ {srv.price.toFixed(2)} ({srv.duration})</option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Select Stylist */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-pink-400 uppercase tracking-wider block">2. Selecciona tu Nail Artist Favorita</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {STYLISTS.map((sty) => (
                      <div 
                        key={sty.id}
                        onClick={() => setSelectedStylist(sty)}
                        className={`border rounded-2xl p-2.5 text-center cursor-pointer transition-all ${selectedStylist.id === sty.id ? 'border-2 shadow-sm bg-pink-50/20' : 'border-pink-100 hover:bg-pink-50/10'}`}
                        style={{ borderColor: selectedStylist.id === sty.id ? theme.primary : undefined }}
                      >
                        <img src={sty.avatar} className="w-10 h-10 rounded-full mx-auto object-cover border border-pink-100" alt={sty.name} />
                        <h4 className="text-[10px] font-black text-gray-900 mt-1.5 leading-snug truncate">{sty.name}</h4>
                        <p className="text-[8px] text-pink-400 mt-0.5 truncate">{sty.role}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 3: Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-pink-400 uppercase tracking-wider block">3. Selecciona una Fecha</label>
                    <input 
                      type="date" 
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-xs font-semibold text-gray-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-pink-400 uppercase tracking-wider block">4. Selecciona un Horario</label>
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      required
                      className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-xs font-semibold text-gray-800 focus:outline-none"
                    >
                      <option value="">Selecciona hora...</option>
                      {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 4: Contact Info */}
                <div className="space-y-3 pt-2 border-t border-pink-100">
                  <label className="text-xs font-bold text-pink-400 uppercase tracking-wider block">5. Tus Datos de Contacto</label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <input 
                        type="text" 
                        placeholder="Nombre Completo *"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                        className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-xs font-semibold text-gray-800 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <input 
                        type="tel" 
                        placeholder="Teléfono WhatsApp *"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        required
                        className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-xs font-semibold text-gray-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <textarea 
                    placeholder="Cuéntanos si tienes alguna idea para tus uñas o diseño especial que quieras..."
                    value={clientNote}
                    onChange={(e) => setClientNote(e.target.value)}
                    rows={2}
                    className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-xs font-semibold text-gray-800 focus:outline-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full text-xs font-black uppercase tracking-wider text-white shadow-xl cursor-pointer hover:brightness-105 active:scale-95 transition-all mt-4"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}, #ff4f7b)` }}
                >
                  Confirmar Reserva Sweet Kitty
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="bg-pink-950 text-white/50 text-xs py-10 border-t border-pink-900 mt-16">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: theme.fontHeadline, color: 'white' }}>
              Sweet Kitty <span className="text-pink-300 font-normal font-['Pacifico']">Nails</span>
            </span>
            <p className="text-[11px] leading-relaxed">
              Tu spa de uñas favorito. Brindamos esmaltados de alta calidad, esculpidos en acrílico y nail art personalizado con mucho amor y cuidado para tus manos.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Horario de Atención</h4>
            <ul className="space-y-1 text-[11px]">
              <li>Lunes a Sábado: 09:00 AM - 08:00 PM</li>
              <li>Domingos: Cerrado</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Ubicación & Contacto</h4>
            <ul className="space-y-1 text-[11px]">
              <li>📍 Av. Pardo 620, Miraflores, Lima, Perú</li>
              <li>📞 +51 999 999 999</li>
              <li>✉️ hello@sweetkittynails.com</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 border-t border-pink-900/50 mt-8 pt-6 text-center text-[10px]">
          © {new Date().getFullYear()} Sweet Kitty Nails. Todos los derechos reservados. Powered by Boga Market.
        </div>
      </footer>
    </div>
  );
}
