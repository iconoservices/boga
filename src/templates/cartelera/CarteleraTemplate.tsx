'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { fetchProductosDeTienda } from '@/lib/catalogo';
import { getDemoProducts } from '@/lib/templates.config';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { leerPresentaciones, Presentacion } from '@/lib/presentaciones';
import { fetchEventos, Evento } from '@/lib/eventos';

interface CarteleraTemplateProps {
  store: StoreConfig;
  initialProductId?: string;
}

export interface EventoItem {
  id: string;
  titulo: string;
  fechaTexto: string; // ej. "Sábado 04 Octubre"
  diaNum: string;     // ej. "04"
  mesTexto: string;   // ej. "OCT"
  diaSemana: string;  // ej. "SÁBADO"
  hora: string;       // ej. "10:00 PM"
  lugar?: string;
  flyer: string;
  genero?: string;    // ej. "Urban & Reggaeton Old School"
  lineup?: string;    // ej. "DJ Aldo + DJ Residente"
  descripcion?: string;
  precioDesde: number;
  precioTexto?: string; // ej. "Desde S/ 30.00"
  entradas?: { label: string; price: number; aforo?: string }[];
  isDestacado?: boolean;
  statusBadge?: string; // ej. "PREVENTA ACTIVA", "ÚLTIMAS ENTRADAS"
  ordenFecha: string;  // YYYY-MM-DD para ordenar
}

interface ProductItem {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  hasOffer?: boolean;
  category: string;
  image: string;
  images?: string[];
  description?: string;
  presentaciones?: Presentacion[];
}

// Eventos de muestra si la tienda o Supabase aún no tienen eventos propios
const DEMO_EVENTOS_CARTELERA: EventoItem[] = [
  {
    id: 'evt-1',
    titulo: 'NEON GLOW PARTY 2026',
    fechaTexto: 'Viernes 03 de Octubre',
    diaNum: '03',
    mesTexto: 'OCT',
    diaSemana: 'VIERNES',
    hora: '10:00 PM',
    lugar: 'Main Stage VIP',
    flyer: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=85',
    genero: 'Electro & Tech House',
    lineup: 'Guest DJ Marco + Visual Light Show 360°',
    descripcion: 'Pintura neón en puerta, cotillón lumínico, pulsera LED de regalo y la mejor selección de música electrónica hasta las 6:00 AM.',
    precioDesde: 30,
    precioTexto: 'Desde S/ 30.00',
    statusBadge: 'PREVENTA 1 ACTIVA',
    isDestacado: true,
    ordenFecha: '2026-10-03',
    entradas: [
      { label: 'General + 1 Trago', price: 30 },
      { label: 'VIP Fast Pass + Barra Libre 1h', price: 60 },
      { label: 'Box Platinum (8 Personas + 2 Botellas)', price: 750 },
    ],
  },
  {
    id: 'evt-2',
    titulo: 'NOCHE DE BELLAKEO & CLÁSICOS',
    fechaTexto: 'Sábado 04 de Octubre',
    diaNum: '04',
    mesTexto: 'OCT',
    diaSemana: 'SÁBADO',
    hora: '09:30 PM',
    lugar: 'Pista Central & Terraza',
    flyer: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=85',
    genero: 'Reggaeton 2000s & Éxitos Actuales',
    lineup: 'DJ Peligro Style + Animación en Vivo',
    descripcion: 'Todos los clásicos que te sabes de memoria. Promociones en baldes de cerveza y tragos antes de la medianoche.',
    precioDesde: 25,
    precioTexto: 'Desde S/ 25.00',
    statusBadge: 'ÚLTIMOS BOXES',
    isDestacado: true,
    ordenFecha: '2026-10-04',
    entradas: [
      { label: 'General Preventa', price: 25 },
      { label: 'VIP Segundo Nivel', price: 50 },
      { label: 'Box Gold (10 Personas + 2 Whisky)', price: 850 },
    ],
  },
  {
    id: 'evt-3',
    titulo: 'HALLOWEEN HORROR FEST (EDICIÓN ESPECIAL)',
    fechaTexto: 'Sábado 31 de Octubre',
    diaNum: '31',
    mesTexto: 'OCT',
    diaSemana: 'SÁBADO',
    hora: '09:00 PM',
    lugar: 'Discoteca Completa (2 Zonas)',
    flyer: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=900&q=85',
    genero: 'Crossover, Pachanga & Top Hits',
    lineup: 'Premio S/ 2,000 al Mejor Disfraz + 3 DJs en Cabina',
    descripcion: 'La fiesta temática más grande del año. Decoración inmersiva de terror, máquinas de humo criogénico y barra libre para los mejores disfraces.',
    precioDesde: 40,
    precioTexto: 'Desde S/ 40.00',
    statusBadge: 'EVENTO EXCLUSIVO',
    isDestacado: true,
    ordenFecha: '2026-10-31',
    entradas: [
      { label: 'Early Bird General', price: 40 },
      { label: 'VIP Pass All Night', price: 80 },
      { label: 'Box Ultra Lounge (12 Personas + All Inclusive)', price: 1200 },
    ],
  },
  {
    id: 'evt-4',
    titulo: 'FIESTA RETRO 90S & 2000S LIVE',
    fechaTexto: 'Viernes 07 de Noviembre',
    diaNum: '07',
    mesTexto: 'NOV',
    diaSemana: 'VIERNES',
    hora: '10:00 PM',
    lugar: 'Terraza Lounge',
    flyer: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=85',
    genero: 'Rock, Pop Latino & Disco Hits',
    lineup: 'Banda en Vivo + DJ Set Retro',
    descripcion: 'Un viaje en el tiempo con lo mejor del pop, rock y dance de dos décadas doradas con sonido y luces retro.',
    precioDesde: 35,
    precioTexto: 'Desde S/ 35.00',
    statusBadge: 'CONFIRMADO',
    isDestacado: false,
    ordenFecha: '2026-11-07',
    entradas: [
      { label: 'Entrada General', price: 35 },
      { label: 'Mesa Alta Reservada (4 personas)', price: 200 },
    ],
  },
];

export default function CarteleraTemplate({ store, initialProductId }: CarteleraTemplateProps) {
  // Pestaña principal: "eventos" o "carta"
  const [tabActiva, setTabActiva] = useState<'eventos' | 'carta'>('eventos');

  // Eventos state
  const [eventosLista, setEventosLista] = useState<EventoItem[]>([]);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [filtroEventos, setFiltroEventos] = useState<'todos' | 'proximos'>('todos');

  // Modal de Evento Seleccionado
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoItem | null>(null);
  const [entradaSeleccionada, setEntradaSeleccionada] = useState<string>('');
  const [cantEntradas, setCantEntradas] = useState(1);

  // Productos de la carta / botellas
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [supabaseProducts, setSupabaseProducts] = useState<ProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [detailQty, setDetailQty] = useState(1);

  // Cart State (soporta entradas y bebidas/boxes)
  const [cart, setCart] = useState<
    {
      isTicket?: boolean;
      ticketDetails?: { eventTitle: string; eventDate: string; ticketType: string };
      product: ProductItem;
      quantity: number;
      size?: string;
      unitPrice?: number;
    }[]
  >([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const theme = store.theme;
  const primaryColor = theme?.primary || '#8b5cf6'; // Violeta eléctrico
  const secondaryColor = theme?.secondary || '#06b6d4'; // Cyan neon

  // Cargar productos y eventos
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // 1. Cargar productos de la tienda
        const prods = await fetchProductosDeTienda(store.slug);
        if (isMounted && prods && prods.length > 0) {
          const formatted: ProductItem[] = prods.map((p) => ({
            id: String(p.id),
            title: p.name,
            price: Number(p.price) || 0,
            originalPrice: p.price_anterior > 0 ? Number(p.price_anterior) : Number(p.price) || 0,
            hasOffer: Boolean(p.price_anterior && Number(p.price_anterior) > Number(p.price)),
            category: (p.category || 'botellas').toLowerCase(),
            image: p.image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
            images: Array.isArray(p.images) && p.images.length > 1 ? p.images : undefined,
            description: p.description || '',
            presentaciones: leerPresentaciones(p.presentaciones),
          }));
          setSupabaseProducts(formatted);
        }

        // 2. Cargar eventos de Supabase o filtrar por tienda
        const evts = await fetchEventos();
        if (isMounted) {
          // Filtrar eventos que coincidan con el nombre de la tienda o su slug
          const matchTienda = evts.filter((e) => {
            const org = (e.organiza || '').toLowerCase();
            const nom = (store.name || '').toLowerCase();
            const slug = (store.slug || '').toLowerCase();
            return org.includes(nom) || org.includes(slug) || nom.includes(org);
          });

          if (matchTienda.length > 0) {
            const formateados: EventoItem[] = matchTienda.map((e) => {
              const precioNum = parseFloat(e.precio.replace(/[^\d.]/g, '')) || 25;
              return {
                id: e.id,
                titulo: e.titulo,
                fechaTexto: `${e.dia} de ${e.mes}`,
                diaNum: e.dia || '01',
                mesTexto: (e.mes || 'OCT').toUpperCase().slice(0, 3),
                diaSemana: 'EVENTO',
                hora: '09:00 PM',
                lugar: e.lugar || store.zona || 'Local Principal',
                flyer: e.img || store.heroImage || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
                genero: e.cat,
                lineup: e.organiza || store.name,
                descripcion: e.descripcion || 'Entradas oficiales disponibles por WhatsApp.',
                precioDesde: precioNum,
                precioTexto: e.precio || `Desde S/ ${precioNum.toFixed(2)}`,
                statusBadge: e.destacado ? 'DESTACADO' : 'CONFIRMADO',
                isDestacado: Boolean(e.destacado),
                ordenFecha: e.fecha || '2026-12-31',
                entradas: [
                  { label: 'Entrada General', price: precioNum },
                  { label: 'Entrada VIP', price: Math.round(precioNum * 1.8) },
                  { label: 'Box Exclusivo (8 personas)', price: Math.round(precioNum * 10) },
                ],
              };
            });
            setEventosLista(formateados);
          } else {
            // Verificar si el dueño subió productos con categoría 'evento' o 'eventos'
            const prodsEventos = (prods || []).filter((p) => {
              const cat = (p.category || '').toLowerCase();
              return cat.includes('evento') || cat.includes('concierto') || cat.includes('fecha') || cat.includes('entrada');
            });

            if (prodsEventos.length > 0) {
              const formateadosDesdeProds: EventoItem[] = prodsEventos.map((p, idx) => {
                const presentaciones = leerPresentaciones(p.presentaciones);
                return {
                  id: `prod-evt-${p.id}`,
                  titulo: p.name,
                  fechaTexto: 'Próxima Fecha',
                  diaNum: String(idx + 1).padStart(2, '0'),
                  mesTexto: 'FEST',
                  diaSemana: 'NOCHE',
                  hora: '10:00 PM',
                  lugar: store.direccion || store.zona || 'Local',
                  flyer: p.image || store.heroImage,
                  genero: p.category,
                  lineup: store.name,
                  descripcion: p.description || 'Reserva tus entradas con anticipación.',
                  precioDesde: Number(p.price) || 30,
                  precioTexto: `Desde S/ ${Number(p.price).toFixed(2)}`,
                  statusBadge: 'DISPONIBLE',
                  isDestacado: true,
                  ordenFecha: `2026-10-0${idx + 1}`,
                  entradas:
                    presentaciones.length > 0
                      ? presentaciones.map((pr) => ({ label: pr.label, price: pr.price }))
                      : [{ label: 'Entrada General', price: Number(p.price) || 30 }],
                };
              });
              setEventosLista(formateadosDesdeProds);
            } else {
              // Cargar demo eventos de calidad
              setEventosLista(DEMO_EVENTOS_CARTELERA);
            }
          }
        }
      } catch (err) {
        console.error('Error cargando cartelera:', err);
        setEventosLista(DEMO_EVENTOS_CARTELERA);
      } finally {
        if (isMounted) setCargandoEventos(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [store.slug, store.name, store.heroImage, store.zona, store.direccion]);

  // Lista de productos para la carta
  const allProducts = useMemo<ProductItem[]>(() => {
    if (supabaseProducts.length > 0) return supabaseProducts;
    const demoList = (store as any).demoProducts || getDemoProducts(store.template || 'discoteca');
    if (demoList && demoList.length > 0) {
      return demoList.map((p: any, idx: number) => ({
        id: `demo-${idx + 1}`,
        title: p.name,
        price: p.price,
        originalPrice: p.originalPrice || p.price,
        hasOffer: Boolean(p.originalPrice && p.originalPrice > p.price),
        category: (p.category || 'botellas').toLowerCase(),
        image: p.image,
        description: p.description || '',
        presentaciones: p.presentaciones || [
          { label: 'Botella Sola', price: p.price },
          { label: 'Combo + 2 Red Bull', price: p.price + 30 },
        ],
      }));
    }
    return [];
  }, [supabaseProducts, (store as any).demoProducts, store.template]);

  // Eventos ordenados cronológicamente por fecha
  const eventosOrdenados = useMemo(() => {
    return [...eventosLista].sort((a, b) => (a.ordenFecha || '').localeCompare(b.ordenFecha || ''));
  }, [eventosLista]);

  // Categorías de la carta con productos (SOLO las que realmente tienen items)
  const categoriasCarta = useMemo(() => {
    const categoriasConProductos = new Set(
      allProducts.map((p) => (p.category || '').toLowerCase().trim()).filter(Boolean)
    );

    if ((store.categories || []).length > 0) {
      const filtradas = store.categories.filter((c) => {
        const slug = (c.href || '').toLowerCase().trim();
        const nom = (c.name || '').toLowerCase().trim();
        return categoriasConProductos.has(slug) || categoriasConProductos.has(nom);
      });
      if (filtradas.length > 0) {
        return filtradas.map((c) => ({
          id: (c.href || '').toLowerCase().trim(),
          label: c.name,
          icon: c.icon || 'nightlife',
        }));
      }
    }

    const unicas = [...categoriasConProductos];
    return unicas.map((c) => ({
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
      icon: 'liquor',
    }));
  }, [store.categories, allProducts]);

  // Filtrado de carta
  const productosFiltrados = useMemo(() => {
    return allProducts.filter((prod) => {
      const prodCat = (prod.category || '').toLowerCase().trim();
      const matchedCategory = categoriasCarta.find((c) => c.id === activeCategory);
      const matchCategory =
        activeCategory === 'all' ||
        (!matchedCategory
          ? prodCat === activeCategory
          : prodCat === matchedCategory.id || prodCat === matchedCategory.label.toLowerCase().trim());
      const matchSearch =
        !searchQuery.trim() ||
        prod.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCategory && matchSearch;
    });
  }, [allProducts, activeCategory, searchQuery, categoriasCarta]);

  // Abrir modal de evento
  const abrirModalEvento = (evento: EventoItem) => {
    setEventoSeleccionado(evento);
    setCantEntradas(1);
    if (evento.entradas && evento.entradas.length > 0) {
      setEntradaSeleccionada(evento.entradas[0].label);
    } else {
      setEntradaSeleccionada('General');
    }
  };

  // Carrito de compras y reservas
  const agregarEntradaAlCarrito = (evento: EventoItem, tipoEntrada: string, cantidad: number) => {
    const matched = (evento.entradas || []).find((e) => e.label === tipoEntrada);
    const unitPrice = matched ? matched.price : evento.precioDesde;

    const pseudoProduct: ProductItem = {
      id: `ticket-${evento.id}-${tipoEntrada}`,
      title: `Entrada: ${evento.titulo}`,
      price: unitPrice,
      category: 'entradas',
      image: evento.flyer,
      description: `Evento: ${evento.fechaTexto} · ${tipoEntrada}`,
    };

    setCart((prev) => {
      const exist = prev.find(
        (item) => item.isTicket && item.ticketDetails?.eventTitle === evento.titulo && item.size === tipoEntrada
      );
      if (exist) {
        return prev.map((item) =>
          item.isTicket && item.ticketDetails?.eventTitle === evento.titulo && item.size === tipoEntrada
            ? { ...item, quantity: item.quantity + cantidad }
            : item
        );
      }
      return [
        ...prev,
        {
          isTicket: true,
          ticketDetails: {
            eventTitle: evento.titulo,
            eventDate: evento.fechaTexto,
            ticketType: tipoEntrada,
          },
          product: pseudoProduct,
          quantity: cantidad,
          size: tipoEntrada,
          unitPrice,
        },
      ];
    });

    setEventoSeleccionado(null);
    setIsCartOpen(true);
  };

  const agregarProductoAlCarrito = (prod: ProductItem, size?: string, unitPrice?: number, qty = 1) => {
    const finalPrice = unitPrice ?? prod.price;
    setCart((prev) => {
      const existing = prev.find((item) => !item.isTicket && item.product.id === prod.id && item.size === size);
      if (existing) {
        return prev.map((item) =>
          !item.isTicket && item.product.id === prod.id && item.size === size
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product: prod, quantity: qty, size, unitPrice: finalPrice }];
    });
    setSelectedProduct(null);
  };

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (item.unitPrice ?? item.product.price) * item.quantity, 0);

  // Enviar pedido o reserva por WhatsApp
  const handleCheckoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const datos = await pedirDatosCliente({
      titulo: 'Reserva de Entradas & Pedido',
      color: primaryColor,
      pedirEntrega: false,
    });
    if (!datos) return;

    let mensaje = `👋 ¡Hola *${store.name}*! Quiero confirmar mi reserva:\n\n`;

    const tickets = cart.filter((i) => i.isTicket);
    const tragos = cart.filter((i) => !i.isTicket);

    if (tickets.length > 0) {
      mensaje += `🎟️ *ENTRADAS & EVENTOS:*\n`;
      tickets.forEach((t) => {
        const sub = (t.unitPrice || 0) * t.quantity;
        mensaje += `• ${t.quantity}x ${t.ticketDetails?.eventTitle}\n  (${t.ticketDetails?.eventDate} - ${t.size}) → S/ ${sub.toFixed(2)}\n`;
      });
      mensaje += `\n`;
    }

    if (tragos.length > 0) {
      mensaje += `🍾 *CARTA / BOTELLAS & BOXES:*\n`;
      tragos.forEach((p) => {
        const sub = (p.unitPrice || 0) * p.quantity;
        mensaje += `• ${p.quantity}x ${p.product.title}${p.size ? ` (${p.size})` : ''} → S/ ${sub.toFixed(2)}\n`;
      });
      mensaje += `\n`;
    }

    mensaje += `💰 *TOTAL A PAGAR:* S/ ${cartTotal.toFixed(2)}\n\n`;
    mensaje += `👤 *Nombre:* ${datos.nombre}\n`;
    if (datos.telefono) mensaje += `📱 *Teléfono:* ${datos.telefono}\n`;

    const wspNum = store.whatsapp || '51987654321';
    const url = `https://wa.me/${wspNum.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const whatsappReservaDirecta = (evento: EventoItem) => {
    const wsp = (store.whatsapp || '51987654321').replace(/\D/g, '');
    const txt = `¡Hola *${store.name}*! Quiero información y reservar entradas para el evento:\n\n🔥 *${evento.titulo}*\n📅 Fecha: ${evento.fechaTexto}\n🕒 Hora: ${evento.hora}\n\n¿Tienen boxes y preventas disponibles?`;
    window.open(`https://wa.me/${wsp}?text=${encodeURIComponent(txt)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white pb-24">
      {/* ── HEADER SUPERIOR ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {store.logoImage || store.iconImage ? (
              <img
                src={store.logoImage || store.iconImage}
                alt={store.name}
                className="w-10 h-10 rounded-xl object-cover border border-purple-500/40 shadow-[0_0_10px_rgba(139,92,246,0.3)] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg">
                {store.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-wide truncate text-white uppercase">
                  {store.name}
                </h1>
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[11px] text-purple-300/80 truncate">
                Cartelera Oficial & Reservas VIP
              </p>
            </div>
          </div>

          {/* Botón Carrito / Entradas */}
          <div className="flex items-center gap-2.5">
            {store.whatsapp && (
              <a
                href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hola ${store.name}, tengo una consulta sobre sus eventos.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:bg-purple-900/60 text-xs font-bold transition-all"
              >
                <span className="material-symbols-outlined text-sm text-emerald-400">chat</span>
                <span>WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-white transition-all active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.35)] cursor-pointer hover:brightness-110"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #4f46e5 100%)`,
              }}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">confirmation_number</span>
              <span className="text-xs sm:text-sm font-black">{cartItemsCount}</span>
              {cartTotal > 0 && (
                <span className="hidden sm:inline text-xs font-bold border-l border-white/20 pl-2">
                  S/ {cartTotal.toFixed(2)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── PORTADA 100% VISUAL Y LIMPIA (SIN TEXTO ENCIMA) ─────────── */}
      <section className="w-full bg-[#050508] border-b border-white/5">
        <div className="max-w-6xl mx-auto px-0 sm:px-4 sm:py-4">
          <div className="w-full overflow-hidden sm:rounded-3xl shadow-2xl bg-black relative border border-white/5">
            <StoreFloatingActions store={store} />
            <img
              src={store.heroImage || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=85'}
              alt={store.heroAlt || store.name}
              className="w-full h-auto max-h-[520px] object-cover object-center block"
            />
          </div>
        </div>
      </section>

      {/* ── TICKER DE CARTELERA & ESTADO ───────────────────────────── */}
      <section className="bg-gradient-to-r from-purple-950 via-[#100a1c] to-purple-950 border-b border-purple-500/20 py-2.5 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-200/90 gap-6 overflow-x-auto scrollbar-none whitespace-nowrap">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-sm text-yellow-400">calendar_month</span>
            <span>Cartelera de Fechas & Conciertos</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-sm text-cyan-400">confirmation_number</span>
            <span>Preventa Digital & Boxes</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-sm text-pink-400">stars</span>
            <span>Atención VIP & Lounge</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-sm text-emerald-400">verified</span>
            <span>Ingreso Seguro +18</span>
          </span>
        </div>
      </section>

      {/* ── TABS NAVEGACIÓN: [📅 PRÓXIMOS EVENTOS] vs [🍾 CARTA & BOTELAS] ─ */}
      <section className="sticky top-[57px] z-30 bg-[#09090f]/95 backdrop-blur-md border-b border-white/10 py-2.5 px-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={() => setTabActiva('eventos')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              tabActiva === 'eventos'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-purple-400'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">event</span>
            <span>Próximos Eventos ({eventosOrdenados.length})</span>
          </button>

          <button
            onClick={() => setTabActiva('carta')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              tabActiva === 'carta'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-purple-400'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-sm">local_bar</span>
            <span>Carta & Boxes VIP</span>
          </button>
        </div>
      </section>

      {/* ── CUERPO PRINCIPAL ────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 1: EVENTOS PRIMERO (CARTELERA ORDENADA POR FECHA)
           ══════════════════════════════════════════════════════════════ */}
        {tabActiva === 'eventos' && (
          <div className="space-y-6">
            {/* Header de Cartelera */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#11111a] border border-white/10 p-4 sm:p-5 rounded-2xl">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-purple-400 font-black flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">confirmation_number</span>
                  Cartelera Oficial en Vivo
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-0.5">
                  Próximos Eventos & Fiestas
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Fechas ordenadas cronológicamente. Asegura tus entradas antes que se agoten las preventas.
                </p>
              </div>

              {/* Badges de fechas */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="px-3 py-1.5 rounded-xl bg-purple-950/70 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  {eventosOrdenados.length} Fechas Programadas
                </span>
              </div>
            </div>

            {/* Grilla de Eventos (Cartelera) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {eventosOrdenados.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-[#12121c] border border-white/10 hover:border-purple-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col group relative"
                >
                  {/* Badge de Estado en el flyer */}
                  {evt.statusBadge && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-wider shadow-lg">
                        {evt.statusBadge}
                      </span>
                    </div>
                  )}

                  {/* Flyer con Aspect Ratio 4:5 estilo Afiche */}
                  <div
                    onClick={() => abrirModalEvento(evt)}
                    className="aspect-[4/3] sm:aspect-[4/5] w-full overflow-hidden bg-black/40 relative cursor-pointer"
                  >
                    <img
                      src={evt.flyer}
                      alt={evt.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#12121c] via-transparent to-black/20" />

                    {/* Fecha Destacada Estilo Calendario Neón en la esquina inferior */}
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2.5 bg-black/85 backdrop-blur-md border border-purple-500/40 px-3 py-1.5 rounded-xl shadow-2xl">
                      <div className="text-center pr-2 border-r border-white/20">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-purple-400">
                          {evt.mesTexto}
                        </span>
                        <span className="block text-xl font-black text-white leading-none">
                          {evt.diaNum}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-white">
                          {evt.diaSemana}
                        </span>
                        <span className="block text-[9px] text-gray-400">
                          {evt.hora}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info del Evento */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {evt.genero && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                          {evt.genero}
                        </span>
                      )}

                      <h3
                        onClick={() => abrirModalEvento(evt)}
                        className="text-base sm:text-lg font-black text-white hover:text-purple-300 transition-colors cursor-pointer line-clamp-2 leading-snug"
                      >
                        {evt.titulo}
                      </h3>

                      {evt.lineup && (
                        <p className="text-xs text-cyan-300 font-bold mt-1.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-cyan-400">headphones</span>
                          <span className="truncate">{evt.lineup}</span>
                        </p>
                      )}

                      {evt.descripcion && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                          {evt.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Precios y Botón de Acción */}
                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">
                          Entradas
                        </span>
                        <span className="text-base font-black text-white">
                          {evt.precioTexto || `S/ ${evt.precioDesde.toFixed(2)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => whatsappReservaDirecta(evt)}
                          title="Consultar por WhatsApp"
                          className="w-9 h-9 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">chat</span>
                        </button>

                        <button
                          onClick={() => abrirModalEvento(evt)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <span>Entradas</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Banner Informativo para el Administrador / Dueño */}
            <div className="bg-gradient-to-r from-purple-950/40 via-[#10101d] to-indigo-950/40 border border-purple-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-300">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-purple-400 text-2xl">event_available</span>
                <div>
                  <strong className="text-white block text-sm">¿Cómo subir nuevos eventos a tu cartelera?</strong>
                  <span>
                    Puedes subir eventos como productos en tu catálogo (categoría &quot;Eventos&quot;) o programarlos en la Agenda del Superadmin.
                  </span>
                </div>
              </div>
              <a
                href="/admin"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold shrink-0 transition-all"
              >
                Panel de Administración
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 2: CARTA DE BEBIDAS, BOTELLAS & BOXES VIP
           ══════════════════════════════════════════════════════════════ */}
        {tabActiva === 'carta' && (
          <div className="space-y-6">
            {/* Buscador de Tragos / Botellas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar trago, botella, combo o pique..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#11111a] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Botón rápido para volver a ver eventos */}
              <button
                onClick={() => setTabActiva('eventos')}
                className="text-xs text-purple-300 font-bold hover:underline flex items-center gap-1 self-start sm:self-center"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Ver Próximos Eventos</span>
              </button>
            </div>

            {/* Categorías que SÍ tienen productos */}
            {categoriasCarta.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeCategory === 'all'
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                      : 'bg-[#12121c] text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  Todo ({allProducts.length})
                </button>
                {categoriasCarta.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      activeCategory === c.id
                        ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                        : 'bg-[#12121c] text-gray-400 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Grilla de Productos de la Carta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {productosFiltrados.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-[#12121c] border border-white/10 hover:border-purple-500/40 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
                >
                  <div
                    onClick={() => {
                      setSelectedProduct(prod);
                      setDetailQty(1);
                      if (prod.presentaciones && prod.presentaciones.length > 0) {
                        setSelectedSize(prod.presentaciones[0].label);
                      } else {
                        setSelectedSize('');
                      }
                    }}
                    className="aspect-square w-full overflow-hidden bg-black/40 relative cursor-pointer"
                  >
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                        {prod.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 mt-0.5">
                        {prod.title}
                      </h4>
                    </div>

                    <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <div>
                        {prod.presentaciones && prod.presentaciones.length > 0 && (
                          <span className="text-[9px] text-gray-400 block">Desde</span>
                        )}
                        <span className="text-sm font-black text-white">
                          S/ {prod.price.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedProduct(prod);
                          setDetailQty(1);
                          if (prod.presentaciones && prod.presentaciones.length > 0) {
                            setSelectedSize(prod.presentaciones[0].label);
                          } else {
                            setSelectedSize('');
                          }
                        }}
                        className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL DETALLE DE EVENTO & SELECCIÓN DE ENTRADAS ─────────── */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#10101b] border border-white/15 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-black">
              <img
                src={eventoSeleccionado.flyer}
                alt={eventoSeleccionado.titulo}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10101b] via-transparent to-black/40" />

              <button
                onClick={() => setEventoSeleccionado(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>

              {/* Fecha destacada */}
              <div className="absolute bottom-3 left-4 flex items-center gap-2.5 bg-black/80 backdrop-blur-md border border-purple-500/40 px-3 py-1.5 rounded-xl">
                <span className="text-sm font-black text-purple-400">
                  {eventoSeleccionado.diaSemana} {eventoSeleccionado.diaNum} {eventoSeleccionado.mesTexto}
                </span>
                <span className="text-xs text-gray-300">• {eventoSeleccionado.hora}</span>
              </div>
            </div>

            {/* Contenido Modal */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  {eventoSeleccionado.genero || 'Evento Exclusivo'}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {eventoSeleccionado.titulo}
                </h3>
                {eventoSeleccionado.lineup && (
                  <p className="text-xs text-cyan-300 font-bold mt-1">
                    Lineup: {eventoSeleccionado.lineup}
                  </p>
                )}
                {eventoSeleccionado.descripcion && (
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    {eventoSeleccionado.descripcion}
                  </p>
                )}
              </div>

              {/* Selector de Entradas */}
              {eventoSeleccionado.entradas && eventoSeleccionado.entradas.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-bold text-gray-300 block">
                    Selecciona tu tipo de entrada o box:
                  </span>
                  <div className="space-y-2">
                    {eventoSeleccionado.entradas.map((ent) => {
                      const isSel = entradaSeleccionada === ent.label;
                      return (
                        <div
                          key={ent.label}
                          onClick={() => setEntradaSeleccionada(ent.label)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSel
                              ? 'bg-purple-950/60 border-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.3)] text-white'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold block">{ent.label}</span>
                            {ent.aforo && <span className="text-[10px] text-gray-400">{ent.aforo}</span>}
                          </div>
                          <span className="text-sm font-black text-white">S/ {ent.price.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selector de Cantidad */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-gray-300">Cantidad de entradas:</span>
                <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <button
                    onClick={() => setCantEntradas(Math.max(1, cantEntradas - 1))}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm text-white w-4 text-center">{cantEntradas}</span>
                  <button
                    onClick={() => setCantEntradas(cantEntradas + 1)}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Modal con Botón Full Width */}
            <div className="p-4 border-t border-white/10 bg-[#0c0c14] flex gap-2">
              <button
                onClick={() => whatsappReservaDirecta(eventoSeleccionado)}
                className="w-12 h-12 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                title="Consultar por WhatsApp"
              >
                <span className="material-symbols-outlined text-xl">chat</span>
              </button>

              <button
                onClick={() =>
                  agregarEntradaAlCarrito(eventoSeleccionado, entradaSeleccionada, cantEntradas)
                }
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">confirmation_number</span>
                <span>Añadir a la Reserva</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE DE PRODUCTO DE CARTA ──────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#10101b] border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="relative aspect-square w-full bg-black">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  {selectedProduct.category}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {selectedProduct.title}
                </h3>
                <p className="text-xl font-black text-white mt-1">
                  S/{' '}
                  {(
                    (selectedProduct.presentaciones?.find((p) => p.label === selectedSize)?.price ??
                      selectedProduct.price) * detailQty
                  ).toFixed(2)}
                </p>
                {selectedProduct.description && (
                  <p className="text-xs text-gray-300 mt-2">{selectedProduct.description}</p>
                )}
              </div>

              {selectedProduct.presentaciones && selectedProduct.presentaciones.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-bold text-gray-300 block">Opción / Combo:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.presentaciones.map((p) => {
                      const isSel = selectedSize === p.label;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setSelectedSize(p.label)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                              : 'bg-white/5 text-gray-300 border-white/10'
                          }`}
                        >
                          {p.label} - S/ {p.price.toFixed(2)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-gray-300">Cantidad:</span>
                <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <button
                    onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm text-white w-4 text-center">{detailQty}</span>
                  <button
                    onClick={() => setDetailQty(detailQty + 1)}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0c0c14]">
              <button
                onClick={() => {
                  const matched = (selectedProduct.presentaciones || []).find(
                    (p) => p.label === selectedSize
                  );
                  const unitPrice = matched ? matched.price : selectedProduct.price;
                  agregarProductoAlCarrito(selectedProduct, selectedSize, unitPrice, detailQty);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                Añadir al Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER DE CARRITO / RESERVAS ────────────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#0f0f18] text-white flex flex-col border-l border-white/10 shadow-2xl">
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#131320]">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-purple-400 text-2xl">
                    confirmation_number
                  </span>
                  <h3 className="font-black text-base uppercase tracking-wider">
                    Mi Reserva & Pedido
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/30 text-purple-300 font-bold">
                    {cartItemsCount}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Items del Carrito */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <span className="material-symbols-outlined text-gray-600 text-5xl">
                      confirmation_number
                    </span>
                    <p className="text-sm text-gray-400">Tu reserva está vacía</p>
                    <p className="text-xs text-gray-600">
                      Selecciona un evento de la cartelera o botellas de la carta para añadirlas.
                    </p>
                  </div>
                ) : (
                  cart.map((item, index) => {
                    const price = item.unitPrice ?? item.product.price;
                    return (
                      <div
                        key={index}
                        className="flex gap-3 bg-[#141420] p-3.5 rounded-2xl border border-white/5"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.title}
                          className="w-16 h-16 rounded-xl object-cover bg-black/40 shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-white line-clamp-1">
                                {item.product.title}
                              </h4>
                              {item.size && (
                                <span className="text-[10px] text-purple-300 font-semibold block">
                                  {item.size}
                                </span>
                              )}
                              {item.ticketDetails && (
                                <span className="text-[10px] text-cyan-300 block">
                                  📅 {item.ticketDetails.eventDate}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setCart((prev) => prev.filter((_, i) => i !== index))}
                              className="text-gray-500 hover:text-rose-400 transition-colors p-1"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                            <span className="text-xs font-black text-white">
                              S/ {(price * item.quantity).toFixed(2)}
                            </span>
                            <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                              <button
                                onClick={() => {
                                  if (item.quantity === 1) {
                                    setCart((prev) => prev.filter((_, i) => i !== index));
                                  } else {
                                    setCart((prev) =>
                                      prev.map((it, i) =>
                                        i === index ? { ...it, quantity: it.quantity - 1 } : it
                                      )
                                    );
                                  }
                                }}
                                className="text-xs text-gray-400 hover:text-white px-1"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold text-white">{item.quantity}</span>
                              <button
                                onClick={() =>
                                  setCart((prev) =>
                                    prev.map((it, i) =>
                                      i === index ? { ...it, quantity: it.quantity + 1 } : it
                                    )
                                  )
                                }
                                className="text-xs text-gray-400 hover:text-white px-1"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Carrito */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-6 border-t border-white/10 bg-[#131320] space-y-4">
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Total de ítems</span>
                      <span className="text-white font-bold">{cartItemsCount}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10">
                      <span>Total a Pagar</span>
                      <span className="text-purple-400">S/ {cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckoutWhatsApp}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                    <span>Confirmar Reserva por WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
