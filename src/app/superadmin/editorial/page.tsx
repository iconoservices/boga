'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';
import SuperadminSubheader from '@/components/SuperadminSubheader';

interface PilarEditorial {
  id: string;
  nombre: string;
  icono: string;
  badgeColor: string;
  angulo: string;
  modulos: { label: string; href: string }[];
  ejemplosHooks: string[];
  ctaCopy: string;
  formatoRecomendado: string;
}

const PILARES: PilarEditorial[] = [
  {
    id: 'descubre',
    nombre: 'DESCUBRE',
    icono: 'explore',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    angulo: 'Rincones poco conocidos, huecos gastronómicos, cafeterías nuevas, atardeceres y experiencias secretas.',
    modulos: [
      { label: '/market (Restaurantes)', href: '/market' },
      { label: '/guia (Lugares)', href: '/guia' },
    ],
    ejemplosHooks: [
      '“5 huecos caletas en Pucallpa donde se come mejor que en un restaurante ficho.”',
      '“El rincón secreto de Yarinacocha para ver el mejor atardecer sin pagar de más.”',
      '“Probamos el café selvático escondido en el centro que casi nadie conoce.”',
    ],
    ctaCopy: 'Descubre la ubicación exacta, fotos y cómo llegar directo en BogaHub.',
    formatoRecomendado: 'Reel / TikTok dinámico (30-45s) con paneos rápidos de comida + mapa.',
  },
  {
    id: 'encuentra',
    nombre: 'ENCUENTRA',
    icono: 'shopping_bag',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    angulo: '“Dónde comprar X en Pucallpa”, vitrina de comercios locales, productos, moda, y departamentos o cuartos en alquiler.',
    modulos: [
      { label: '/market (Comercios)', href: '/market' },
      { label: '/mostrador (Productos)', href: '/mostrador' },
      { label: '/inmuebles (Alquileres)', href: '/inmuebles' },
    ],
    ejemplosHooks: [
      '“¿Buscando depa o cuarto en alquiler en Pucallpa? Estos 4 acaban de salir hoy.”',
      '“Dónde conseguir repuestos originales de mototaxi sin que te vendan gato por liebre.”',
      '“3 marcas locales de ropa y accesorios amazónicos que deberías apoyar ya.”',
    ],
    ctaCopy: 'Revisa precios, fotos reales y contacta directo al dueño sin intermediarios en BogaHub.',
    formatoRecomendado: 'Carrusel de fotos / Video listado con capturas de precio y WhatsApp directo.',
  },
  {
    id: 'muevete',
    nombre: 'MUÉVETE',
    icono: 'local_taxi',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    angulo: 'Logística de transporte real: rutas a Contamana o Iquitos en rápido, tarifas justas de mototaxis seguros y horarios fluviales.',
    modulos: [
      { label: '/taxi-seguro (Conductores)', href: '/taxi-seguro' },
      { label: '/viajes (Fluvial y Terrestre)', href: '/viajes' },
    ],
    ejemplosHooks: [
      '“¿Cuánto cuesta de verdad viajar en rápido a Contamana y a qué hora salen las lanchas?”',
      '“La guía definitiva para no pagar de más en mototaxi si recién llegas al aeropuerto de Pucallpa.”',
      '“Cómo reservar tu rápido fluvial seguro desde tu celular en 2 minutos.”',
    ],
    ctaCopy: 'Pide tu mototaxi seguro verificado o mira todos los horarios fluviales en BogaHub.',
    formatoRecomendado: 'Video explicativo con tarifas en pantalla y tomas del puerto del Reloj Público o Malecón de Yarina.',
  },
  {
    id: 'haz-algo',
    nombre: 'HAZ ALGO',
    icono: 'celebration',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    angulo: 'Agenda viva de la ciudad: conciertos del fin de semana, ferias gastronómicas, eventos culturales y sorteos activos.',
    modulos: [
      { label: '/eventos (Agenda)', href: '/eventos' },
      { label: '/sorteos (Rifas & Premios)', href: '/sorteos' },
    ],
    ejemplosHooks: [
      '“¿Sin planes para este sábado? 4 eventos en Pucallpa con entrada libre o barata.”',
      '“Estamos sorteando un almuerzo completo para 2 y entradas para el concierto de este viernes.”',
      '“La cartelera secreta de este fin de semana: ferias, música en vivo y fiesta en la selva.”',
    ],
    ctaCopy: 'Revisa la agenda completa con fechas y participa en los sorteos activos en BogaHub.',
    formatoRecomendado: 'Video tipo "Qué hacer este finde" los jueves/viernes por la tarde.',
  },
  {
    id: 'trabaja',
    nombre: 'TRABAJA',
    icono: 'construction',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    angulo: 'Convocatorias laborales de la semana, bolsa de oficios (gasfiteros, electricistas, técnicos) y herramientas para negocios.',
    modulos: [
      { label: '/trabajos (Bolsa de Empleo)', href: '/trabajos' },
      { label: '/negocios (Digitalización)', href: '/negocios' },
    ],
    ejemplosHooks: [
      '“Empresas contratando esta semana en Pucallpa: puestos para ventas, cocina y choferes.”',
      '“¿Se te malogró el caño o la luz? Los 3 técnicos de confianza mejor calificados en la ciudad.”',
      '“Si tienes un negocio en Pucallpa y aún atiendes solo por libreta, esto te interesa.”',
    ],
    ctaCopy: 'Postula directo por WhatsApp o contrata a un técnico recomendado en BogaHub.',
    formatoRecomendado: 'Pantallazo de ofertas de trabajo con números de contacto rápidos.',
  },
  {
    id: 'vive-pucallpa',
    nombre: 'VIVE PUCALLPA',
    icono: 'menu_book',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    angulo: 'Historias de personajes locales, crónicas barriales, mitos amazónicos, orgullo selvático y cultura viva.',
    modulos: [
      { label: '/revista (Yo Soy de la Selva)', href: '/revista' },
    ],
    ejemplosHooks: [
      '“El último maestro del bote de madera en Yarinacocha que resiste a la fibra de vidrio.”',
      '“La historia de la doña que alimenta a medio barrio desde su ventana sin cobrar un sol.”',
      '“Mitos del río Ucayali: la leyenda del Chullachaqui contada por un abuelo shipibo.”',
    ],
    ctaCopy: 'Lee la crónica completa y conoce más historias de nuestra gente en la Revista BogaHub.',
    formatoRecomendado: 'Minidocumental vertical (60s) con música nativa o relato en primera persona.',
  },
];

const MODULOS_SISTEMA = [
  { icon: 'storefront', label: 'Market', path: '/market', desc: 'Restaurantes, tiendas y delivery local' },
  { icon: 'calendar_month', label: 'Agenda & Eventos', path: '/eventos', desc: 'Conciertos, ferias y qué hacer hoy' },
  { icon: 'home', label: 'Inmuebles', path: '/inmuebles', desc: 'Alquiler de cuartos, casas y terrenos' },
  { icon: 'casino', label: 'Sorteos', path: '/sorteos', desc: 'Rifas patrocinadas por comercios locales' },
  { icon: 'inventory_2', label: 'Productos', path: '/mostrador', desc: 'Catálogo de productos destacados' },
  { icon: 'engineering', label: 'Trabajos & Oficios', path: '/trabajos', desc: 'Bolsa de empleo y técnicos recomendados' },
  { icon: 'directions_boat', label: 'Viajes & Rutas', path: '/viajes', desc: 'Rápidos fluviales, lanchas y buses' },
  { icon: 'local_taxi', label: 'Taxi Seguro', path: '/taxi-seguro', desc: 'Mototaxis verificados y tarifas justas' },
  { icon: 'savings', label: 'Pandero', path: '/pandero', desc: 'Ahorro grupal rotativo' },
  { icon: 'menu_book', label: 'Revista Cultural', path: '/revista', desc: 'Historias "Yo Soy de la Selva"' },
  { icon: 'work', label: 'Para Negocios', path: '/negocios', desc: 'Vende y digitaliza tu local en Boga' },
];

export default function EditorialPage() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const [pilarFiltro, setPilarFiltro] = useState<string>('todos');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/editorial');
  }, [cargando, esSuperadmin, router]);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-2 border-[#c2c6d6] border-t-[#0058be] rounded-full animate-spin" />
      </div>
    );
  }
  if (!esSuperadmin) return null;

  const pilaresFiltrados = pilarFiltro === 'todos' ? PILARES : PILARES.filter((p) => p.id === pilarFiltro);

  const copiarMatrizCompleta = () => {
    const texto = `BOGAHUB: EL SISTEMA OPERATIVO DIGITAL DE PUCALLPA
Definición: "Lo que hay, lo que pasa y lo que puedes hacer en la ciudad → BogaHub"

MATRIZ EDITORIAL (DEL POST AL CLIC):
${PILARES.map(
  (p) => `
[${p.nombre}]
- Ángulo: ${p.angulo}
- Convierte a: ${p.modulos.map((m) => m.label).join(', ')}
- CTA: ${p.ctaCopy}
- Hooks sugeridos:
  * ${p.ejemplosHooks.join('\n  * ')}
- Formato: ${p.formatoRecomendado}`
).join('\n---')}

LOS 3 PILARES DEL ÉXITO:
1. Cero publicidad forzada: La gente comparte recomendaciones y contenido de valor, no anuncios fríos.
2. "Fíjate en Boga": Posicionamiento como el estándar natural de la ciudad.
3. Balance Foráneo vs Local: Turismo solo representa el fin de semana; el pucallpino habita Boga a diario.`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="min-h-screen flex bg-[#f9f9ff] text-[#191b23]">
      {/* Sidebar en pantallas medianas y grandes */}
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0 sticky top-0">
        <SuperadminSidebarNav />
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0 pb-20">
        <SuperadminSubheader title="Estrategia Editorial y Matriz de Contenido" icon="campaign" />

        <main className="max-w-[1000px] mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header & Manifiesto */}
          <section className="bg-gradient-to-br from-[#0058be] to-[#1a73e8] text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold w-fit">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Visión Definitiva de BogaHub
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                BOGA = La Capa Digital de Pucallpa
              </h1>
              <p className="text-sm sm:text-base text-blue-100 font-medium max-w-2xl leading-relaxed">
                “Lo que hay, lo que pasa y lo que puedes hacer en la ciudad → BogaHub.”
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20 text-xs text-blue-50">
                <div className="bg-white/10 p-3.5 rounded-xl backdrop-blur-sm">
                  <p className="font-bold text-white mb-1">❌ El error de limitar Boga a "turismo":</p>
                  <p className="leading-relaxed opacity-90">
                    Pucallpa tiene casi 500,000 habitantes que comen, compran, se mueven, buscan trabajo, alquilan cuartos y salen todos los días. Para ellos, el turismo es solo un fin de semana; BogaHub es su herramienta cotidiana.
                  </p>
                </div>
                <div className="bg-white/10 p-3.5 rounded-xl backdrop-blur-sm">
                  <p className="font-bold text-white mb-1">✅ La fórmula ganadora:</p>
                  <p className="leading-relaxed opacity-90">
                    El contenido en redes (TikTok, IG, Shorts) no debe vender directamente: debe <strong>descubrir la ciudad</strong> y convertir orgánicamente al módulo correspondiente de BogaHub.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={copiarMatrizCompleta}
                  className="px-4 py-2 bg-white text-[#0058be] font-bold text-xs rounded-xl shadow hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">{copiado ? 'check' : 'content_copy'}</span>
                  {copiado ? '¡Matriz copiada al portapapeles!' : 'Copiar Matriz Completa'}
                </button>
                <Link
                  href="/superadmin/modulos"
                  className="px-4 py-2 bg-white/15 text-white hover:bg-white/25 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">extension</span>
                  Ver Modelo de Negocio SaaS
                </Link>
              </div>
            </div>
          </section>

          {/* Las 11 Áreas del Sistema Operativo */}
          <section className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-[#191b23] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0058be]">hub</span>
                El Sistema Operativo Digital (11 Módulos Activos)
              </h2>
              <p className="text-xs text-[#424754] mt-1">
                BogaHub reúne en un solo ecosistema el comercio, movilidad, empleo, inmuebles, eventos y estilo de vida de Pucallpa.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {MODULOS_SISTEMA.map((m) => (
                <Link
                  key={m.path}
                  href={m.path}
                  className="p-3 rounded-xl border border-[#e6e7f2] hover:border-[#0058be] hover:bg-[#f2f3fd]/50 transition-all flex flex-col gap-1 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#0058be] group-hover:scale-110 transition-transform">
                      {m.icon}
                    </span>
                    <span className="text-xs font-bold text-[#191b23] truncate">{m.label}</span>
                  </div>
                  <span className="text-[11px] text-[#424754] leading-tight line-clamp-2">{m.desc}</span>
                  <span className="text-[10px] text-[#0058be] font-medium mt-1 group-hover:underline">{m.path}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Matriz Editorial: Los 6 Pilares */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#c2c6d6] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#191b23] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0058be]">auto_stories</span>
                  Matriz Editorial: Del Post al Clic
                </h2>
                <p className="text-xs text-[#424754] mt-0.5">
                  Cada pilar alimenta un módulo real de la app. Los videos y posts no son publicidad: son soluciones útiles.
                </p>
              </div>

              {/* Filtros de Pilares */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <button
                  type="button"
                  onClick={() => setPilarFiltro('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                    pilarFiltro === 'todos' ? 'bg-[#0058be] text-white' : 'bg-white border border-[#c2c6d6] text-[#424754]'
                  }`}
                >
                  Todos ({PILARES.length})
                </button>
                {PILARES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPilarFiltro(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                      pilarFiltro === p.id ? 'bg-[#0058be] text-white' : 'bg-white border border-[#c2c6d6] text-[#424754]'
                    }`}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de Pilares */}
            <div className="grid grid-cols-1 gap-5">
              {pilaresFiltrados.map((pilar) => (
                <article
                  key={pilar.id}
                  className="bg-white border border-[#c2c6d6] rounded-2xl p-5 shadow-sm flex flex-col gap-4 transition-all hover:border-[#0058be]/60"
                >
                  {/* Top Bar del Pilar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2f3fd] pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold border ${pilar.badgeColor} flex items-center gap-1.5`}>
                        <span className="material-symbols-outlined text-[16px]">{pilar.icono}</span>
                        {pilar.nombre}
                      </span>
                      <span className="text-xs text-[#424754] font-medium hidden sm:inline">
                        Formato: <b className="text-[#191b23]">{pilar.formatoRecomendado}</b>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#424754]">Convierte a:</span>
                      {pilar.modulos.map((m) => (
                        <Link
                          key={m.href}
                          href={m.href}
                          className="text-[11px] font-bold text-[#0058be] bg-[#f2f3fd] px-2 py-0.5 rounded hover:bg-[#0058be] hover:text-white transition-colors"
                        >
                          {m.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Ángulo Editorial */}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0058be]">Ángulo de Contenido</span>
                    <p className="text-sm font-semibold text-[#191b23] mt-0.5 leading-snug">{pilar.angulo}</p>
                  </div>

                  {/* Ejemplos de Hooks Virales */}
                  <div className="bg-[#f9f9ff] border border-[#e6e7f2] rounded-xl p-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#424754] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#0058be]">electric_bolt</span>
                        Ideas de Hooks & Titulares Virales
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(pilar.ejemplosHooks.join('\n'));
                        }}
                        className="text-[10px] text-[#0058be] font-bold hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">content_copy</span>
                        Copiar hooks
                      </button>
                    </div>

                    <ul className="flex flex-col gap-1.5 text-xs text-[#191b23]">
                      {pilar.ejemplosHooks.map((hook, i) => (
                        <li key={i} className="flex items-start gap-2 italic">
                          <span className="text-[#0058be] font-bold">“</span>
                          <span className="flex-1">{hook.replace(/^[“"']|[”"']$/g, '')}</span>
                          <span className="text-[#0058be] font-bold">”</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Call To Action del Post */}
                  <div className="flex items-start sm:items-center gap-2.5 bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-[#0058be]">
                    <span className="material-symbols-outlined text-[18px] shrink-0">ads_click</span>
                    <div className="flex-1">
                      <span className="font-bold">CTA recomendado en locución o copy: </span>
                      <span className="text-[#191b23]">{pilar.ctaCopy}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Por qué esta estrategia gana: Los 3 Fundamentos */}
          <section className="bg-white border border-[#c2c6d6] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-bold text-[#191b23] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0058be]">military_tech</span>
              ¿Por qué esta estrategia es ganadora? (Los 3 Fundamentos)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#f9f9ff] border border-[#e6e7f2] p-4 rounded-xl flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">favorite</span>
                </div>
                <h3 className="font-bold text-sm text-[#191b23]">1. Cero Publicidad Forzada</h3>
                <p className="text-[#424754] leading-relaxed">
                  La gente no comparte publicidad en WhatsApp ni ve anuncios fríos en TikTok. Pero sí comparte en masa recomendaciones tipo <i>“5 cosas que no sabías que puedes hacer este fin de semana en Pucallpa”</i>. El valor informativo precede a la descarga.
                </p>
              </div>

              <div className="bg-[#f9f9ff] border border-[#e6e7f2] p-4 rounded-xl flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <h3 className="font-bold text-sm text-[#191b23]">2. Top of Mind: "Fíjate en Boga"</h3>
                <p className="text-[#424754] leading-relaxed">
                  Convertir a BogaHub en el verbo cotidiano de la ciudad. Si alguien pregunta: <i>“¿Dónde consigo un gasfitero confiable?”</i>, <i>“¿Dónde alquilo un cuarto?”</i> o <i>“¿A qué hora sale el rápido a Contamana?”</i>, la respuesta automática colectiva debe ser: <b>“Fíjate en Boga”</b>.
                </p>
              </div>

              <div className="bg-[#f9f9ff] border border-[#e6e7f2] p-4 rounded-xl flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">balance</span>
                </div>
                <h3 className="font-bold text-sm text-[#191b23]">3. Balance Foráneo vs Local</h3>
                <p className="text-[#424754] leading-relaxed">
                  El turista o viajero entra por <b>Descubre</b> y <b>Muévete</b>. El habitante local usa <b>Encuentra, Trabaja, Haz algo y Vive Pucallpa</b> los 365 días del año. Una misma plataforma atiende a ambos sin fricción de diseño.
                </p>
              </div>
            </div>
          </section>

          {/* Quick links & notas */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#424754] bg-[#f2f3fd] border border-[#c2c6d6] rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#0058be]">info</span>
              <span>Esta guía es de consulta interna permanente para administradores y creadores de contenido de BogaHub.</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/superadmin/revista" className="font-bold text-[#0058be] hover:underline">
                Ir al Gestor de Revista →
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
