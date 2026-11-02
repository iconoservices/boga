"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchChoferes, type Chofer } from '@/lib/drivers';
import { disponibleAhora, proximaApertura, resumenHorario } from '@/lib/horario';
import { ubicacionActual, enlaceMapa, direccionDePunto, type ErrorUbicacion } from '@/lib/ubicacion';
import { zonaMasCercana } from '@/lib/zonasTransporte';

// Taxi Seguro: por ahora es SOLO UN DIRECTORIO de choferes verificados
// (mototaxi / auto / moto). No hay reserva ni pago dentro de la app todavía —
// el pasajero llama o escribe por WhatsApp directo. Data curada a mano.
// Tarjeta inspirada en el mockup de Stitch: perfil + placa + sellos de
// confianza + tarifa comunitaria de referencia + reseña de un vecino.

type Filtro = 'Todos' | 'Mototaxi' | 'Auto' | 'Moto';

// Paleta propia de Taxi Seguro (verde/cian, distinta del rojo BogaHub). El
// `themeVars` se aplica en el <div> raíz y redefine los tokens `--color-*`
// para todo el subárbol, así `bg-primary`, `text-primary`, `text-tertiary`,
// etc. salen en verde solo en esta página.
const VERDE = '#00875A';       // primary
const VERDE_SOFT = '#d3f1e4';  // tint claro del primary

const themeVars = {
  '--color-primary': '#00875A',
  '--color-primary-container': '#00A56C',
  '--color-tertiary': '#00E599',
  '--color-tertiary-container': '#00C983',
} as React.CSSProperties;

const ICONO: Record<string, string> = { Mototaxi: 'electric_rickshaw', Auto: 'directions_car', Moto: 'two_wheeler' };

// Planes fijos — placeholder. El directorio de choferes sigue gratis; estos
// planes por suscripción son cómo BogaHub va a sostener el servicio sin cobrarle
// comisión al chofer. Todavía sin motor de reservas ni cobro.
const PLANES_TRANSPORTE = [
  {
    id: 'hogar',
    nombre: 'Plan Hogar',
    icon: 'escalator_warning',
    tagline: 'Para las familias con viajes de siempre',
    desc: 'Recojo del colegio, ida y vuelta al trabajo, la feria del sábado — con el mismo chofer de confianza, agendado por mes.',
    modo: 'Membresía mensual · precio cerrado',
  },
  {
    id: 'premium',
    nombre: 'Transporte Premium',
    icon: 'car_rental',
    tagline: 'Auto privado, chofer dedicado',
    desc: 'Vehículo cerrado con aire, chofer asignado y viajes programados o a pedido. Para el aeropuerto, una reunión, o cuando quieres llegar impecable.',
    modo: 'Por viaje o por hora',
  },
];

function DriverCard({ c, ahora }: { c: Chofer; ahora: Date }) {
  // true = dentro de su horario ahora; false = fuera de horario; null = todavía no cargó horario (se ve normal).
  const estado = disponibleAhora(c.horario, ahora);
  const cerrado = estado === false;
  const vuelve = cerrado ? proximaApertura(c.horario, ahora) : null;
  const horarioTxt = resumenHorario(c.horario);
  // Abre WhatsApp con el pin de Google Maps de donde está el pasajero. Si no da permiso de ubicación o tarda,
  // el mensaje sale igual, sin pin (nunca se queda trabado).
  const pedirConUbicacion = async () => {
    let pin = '';
    try {
      const p = await ubicacionActual({ esperaMs: 6000 });
      pin = `\nMi ubicación: ${enlaceMapa(p)}`;
    } catch { /* sin ubicación: se pide igual */ }
    const texto = `Hola ${c.nombre.split(' ')[0]}, te vi en BogaHub · Taxi Seguro. ¿Estás libre para una carrera?${pin}\nDestino: `;
    window.open(`https://wa.me/${c.tel}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <article className={`bg-white rounded-2xl border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)] p-4 lg:p-5 flex flex-col gap-3.5 hover:shadow-lg transition-shadow ${cerrado ? 'opacity-70 grayscale' : ''}`}>
      {/* Disponibilidad (sale sola según el horario que puso el chofer, en hora de Pucallpa) */}
      {estado !== null && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 -mb-1">
          {estado ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping" style={{ backgroundColor: VERDE }} />
                <span className="relative inline-flex w-2 h-2 rounded-full" style={{ backgroundColor: VERDE }} />
              </span>
              Disponible ahora
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-surface-container-high text-secondary">
              <span className="material-symbols-outlined text-[13px]">bedtime</span>
              Fuera de horario{vuelve ? ` · vuelve ${vuelve}` : ''}
            </span>
          )}
          {horarioTxt && <span className="text-[11px] text-secondary font-medium">🕒 {horarioTxt}</span>}
        </div>
      )}

      {/* Perfil + placa */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container-low">
              <img src={c.img} alt={c.nombre} className="w-full h-full object-cover" />
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
              style={{ backgroundColor: VERDE }}
              title="Verificado por BogaHub"
            >
              <span className="material-symbols-outlined text-white text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-[15px] text-on-surface leading-tight line-clamp-1">{c.nombre}</h3>
            <span className="block font-label-md text-[11px] font-bold leading-tight mt-0.5" style={{ color: VERDE }}>{c.comite}</span>
            <span className="flex items-center gap-1 text-secondary font-body-md text-[11px] mt-0.5">
              <span className="material-symbols-outlined text-tertiary text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
              {c.experiencia}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="bg-[#FDE047] text-[#0F172A] font-price-lg text-[15px] px-2 py-0.5 rounded tracking-[0.12em] font-mono shadow-sm whitespace-nowrap">
            {c.placa}
          </span>
          <span className="font-label-md text-[10px] text-secondary mt-1 text-right leading-tight">{c.modelo}</span>
        </div>
      </div>

      {/* Sellos de confianza */}
      <div className="flex flex-wrap gap-1.5">
        {c.sellos.map((s) => (
          <span
            key={s.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-md text-[10px] leading-tight ${
              s.fuerte ? '' : 'bg-surface-container-high text-on-surface-variant'
            }`}
            style={s.fuerte ? { backgroundColor: VERDE_SOFT, color: VERDE } : undefined}
          >
            <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
            {s.label}
          </span>
        ))}
      </div>

      {/* Tarifa comunitaria de referencia */}
      <div className="flex gap-3 bg-surface-container-low rounded-xl p-2.5">
        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-container">
          <img src={c.vehImg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex flex-col justify-center">
          <span className="font-label-md text-[9px] uppercase tracking-[0.14em] text-secondary">Tarifa comunitaria habitual</span>
          <span className="font-headline-sm text-[13px] text-on-surface leading-snug mt-0.5">
            {c.ruta}: <span className="text-primary">{c.precio}</span>
          </span>
          <span className="font-body-md text-[11px] text-secondary mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">location_on</span>
            Paradero: {c.paradero}
          </span>
        </div>
      </div>

      {/* Reseña de un vecino */}
      <div className="flex gap-2 rounded-xl border border-surface-container-high p-2.5">
        <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">format_quote</span>
        <div>
          <p className="font-body-md text-[12px] text-on-surface italic leading-snug">“{c.resena}”</p>
          <span className="block font-label-md text-[10px] text-secondary font-bold mt-1">— {c.resenaAutor}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-2 border-t border-surface-container pt-3">
        <a
          href={`tel:+${c.tel}`}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md text-[12px] hover:bg-surface-container-highest active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[17px]">call</span>
          Llamar directo
        </a>
        <button
          type="button"
          onClick={pedirConUbicacion}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-label-md text-[12px] shadow-sm active:scale-95 transition-all ${
            cerrado ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest' : 'bg-primary text-on-primary hover:bg-primary-container'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>{cerrado ? 'chat' : 'my_location'}</span>
          {cerrado ? 'Dejarle mensaje' : 'Pedir con mi ubicación'}
        </button>
      </div>
    </article>
  );
}

const TARIFAS_REFERENCIALES = [
  {
    origen: 'Centro / Plaza de Armas',
    destino: 'Yarinacocha (Embarcadero)',
    tipo: 'Mototaxi' as const,
    precio: 'S/ 5.00 – S/ 7.00',
    tiempo: '15-20 min',
    icono: 'electric_rickshaw',
    badge: 'Popular',
  },
  {
    origen: 'Centro / Plaza de Armas',
    destino: 'Open Plaza / Real Plaza',
    tipo: 'Mototaxi' as const,
    precio: 'S/ 3.50 – S/ 5.00',
    tiempo: '8-10 min',
    icono: 'electric_rickshaw',
    badge: 'Céntrico',
  },
  {
    origen: 'Centro / Plaza de Armas',
    destino: 'Aeropuerto David Abenzur',
    tipo: 'Auto' as const,
    precio: 'S/ 10.00 – S/ 14.00',
    tiempo: '12-15 min',
    icono: 'directions_car',
    badge: 'Confort / Aire',
  },
  {
    origen: 'Manantay (Óvalo)',
    destino: 'Hospital Regional de Pucallpa',
    tipo: 'Mototaxi' as const,
    precio: 'S/ 5.00 – S/ 7.00',
    tiempo: '10-12 min',
    icono: 'electric_rickshaw',
    badge: 'Salud',
  },
];

function QuickOrderCard() {
  const router = useRouter();
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [tipo, setTipo] = useState<'Mototaxi' | 'Auto' | 'Moto'>('Mototaxi');
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);
  const [zona, setZona] = useState<string | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [notifActiva, setNotifActiva] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setNotifActiva(true);
    }
  }, []);

  const usarMiUbicacion = async () => {
    setUbicando(true);
    try {
      const p = await ubicacionActual({ precisa: true, esperaMs: 8000 });
      setPunto({ lat: p.lat, lng: p.lng });
      const z = zonaMasCercana(p.lat, p.lng);
      if (z) setZona(z.id);

      // Geocodificación inversa real para dar la calle o zona exacta
      const dir = await direccionDePunto(p);
      if (dir) {
        setOrigen(dir);
      } else if (z) {
        setOrigen(z.nombre);
      } else {
        setOrigen(`Pucallpa (${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`);
      }
    } catch (err) {
      if (err === 'permiso-denegado') {
        setOrigen('Permiso GPS bloqueado en navegador');
      } else {
        setOrigen('Plaza de Armas / Centro');
      }
    } finally {
      setUbicando(false);
    }
  };

  const pedirPermisoNotif = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        setNotifActiva(true);
        new Notification('🛺 BogaHub · Taxi Seguro Pucallpa', {
          body: '¡Avisos activados! Te notificaremos en tiempo real con la placa y datos del chofer que acepte tu viaje.',
          icon: '/favicon.ico',
        });
      }
    } catch {}
  };

  const handlePedir = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si aún no se pidió permiso de notificación, pedirlo al enviar
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          setNotifActiva(true);
          new Notification('🛺 BogaHub · Taxi Seguro', {
            body: `Buscando chofer para tu viaje hacia ${destino || 'tu destino'}... Te avisaremos con los datos del chofer al instante.`,
            icon: '/favicon.ico',
          });
        }
      } catch {}
    }

    const params = new URLSearchParams();
    if (origen.trim()) params.set('origen', origen.trim());
    if (destino.trim()) params.set('destino', destino.trim());
    if (tipo) params.set('tipo', tipo);
    if (punto) {
      params.set('lat', String(punto.lat));
      params.set('lng', String(punto.lng));
    }
    if (zona) params.set('zona', zona);
    router.push(`/transporte/pedir?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-surface-container-highest shadow-[0_15px_30px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: VERDE }}>
            <span className="material-symbols-outlined text-[19px]">local_taxi</span>
          </span>
          <div>
            <h2 className="font-headline-sm text-sm lg:text-base font-extrabold text-on-surface leading-tight">
              Pide tu taxi en segundos
            </h2>
            <p className="font-body-md text-[11px] text-secondary">
              Avisamos a los choferes más cercanos
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full font-label-md text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
          100% Directo
        </span>
      </div>

      <form onSubmit={handlePedir} className="flex flex-col gap-2.5">
        {/* Origen */}
        <div className="relative">
          <label className="block text-[11px] font-bold text-secondary mb-1">
            Punto de recojo
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-secondary material-symbols-outlined text-[18px]">
              my_location
            </span>
            <input
              type="text"
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              placeholder="¿Dónde estás? Ej: Plaza de Armas..."
              className="w-full pl-9 pr-24 py-2.5 rounded-xl border border-surface-container-highest text-xs font-semibold text-on-surface placeholder:text-secondary/60 focus:outline-none focus:border-primary bg-surface-container-lowest"
            />
            <button
              type="button"
              onClick={usarMiUbicacion}
              disabled={ubicando}
              className="absolute right-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-60 flex items-center gap-1 active:scale-95"
              style={{ backgroundColor: VERDE_SOFT, color: VERDE }}
            >
              {ubicando ? (
                'Buscando…'
              ) : (
                <>
                  <span className="material-symbols-outlined text-[12px]">gps_fixed</span>
                  GPS
                </>
              )}
            </button>
          </div>
        </div>

        {/* Destino */}
        <div>
          <label className="block text-[11px] font-bold text-secondary mb-1">
            ¿A dónde vas?
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-secondary material-symbols-outlined text-[18px]">
              location_on
            </span>
            <input
              type="text"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Ej: Yarinacocha, Open Plaza, Hospital..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-container-highest text-xs font-semibold text-on-surface placeholder:text-secondary/60 focus:outline-none focus:border-primary bg-surface-container-lowest"
            />
          </div>
        </div>

        {/* Tipo de vehículo */}
        <div>
          <label className="block text-[11px] font-bold text-secondary mb-1">
            Tipo de vehículo preferido
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Mototaxi' as const, label: 'Mototaxi', icon: 'electric_rickshaw' },
              { id: 'Auto' as const, label: 'Auto', icon: 'directions_car' },
              { id: 'Moto' as const, label: 'Moto', icon: 'two_wheeler' },
            ].map((v) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setTipo(v.id)}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                  tipo === v.id
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-secondary border-surface-container-highest hover:bg-surface-container-low'
                }`}
                style={tipo === v.id ? { backgroundColor: VERDE } : undefined}
              >
                <span className="material-symbols-outlined text-[16px]">{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aviso de notificaciones */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-surface-container-low text-[11px] text-secondary">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-[15px]" style={{ color: notifActiva ? VERDE : undefined }}>
              {notifActiva ? 'notifications_active' : 'notifications'}
            </span>
            {notifActiva ? 'Avisos en pantalla activados' : 'Avisar cuando el chofer acepte'}
          </span>
          {!notifActiva && (
            <button
              type="button"
              onClick={pedirPermisoNotif}
              className="text-[10px] font-bold underline hover:text-primary"
              style={{ color: VERDE }}
            >
              Activar avisos
            </button>
          )}
        </div>

        {/* Botón principal */}
        <button
          type="submit"
          className="w-full mt-1 py-3 px-4 rounded-xl text-white font-label-md text-[13px] font-extrabold shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 hover:opacity-95"
          style={{ backgroundColor: VERDE }}
        >
          <span className="material-symbols-outlined text-[18px]">local_taxi</span>
          Pedir un taxi ahora
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </form>
    </div>
  );
}

export default function TaxiSeguro() {
  const { cartCount, setIsCartOpen } = useCart();
  const [filtro, setFiltro] = useState<Filtro>('Todos');
  const [interesado, setInteresado] = useState(false);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [cargando, setCargando] = useState(true);
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  // La disponibilidad depende de la hora: se recalcula cada minuto sin recargar la página.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchChoferes()
      .then((rows) => setChoferes(rows))
      .finally(() => setCargando(false));
  }, []);

  // Primero los que están disponibles ahora, luego los que no tienen horario cargado y al final los fuera de horario.
  const rango = (c: Chofer) => { const e = disponibleAhora(c.horario, ahora); return e === true ? 0 : e === null ? 1 : 2; };
  const disponibles = choferes.filter((c) => disponibleAhora(c.horario, ahora) === true).length;
  const lista = (filtro === 'Todos' ? choferes : choferes.filter((c) => c.tipo === filtro))
    .filter((c) => !soloDisponibles || disponibleAhora(c.horario, ahora) !== false)
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rango(a.c) - rango(b.c) || a.i - b.i)
    .map((x) => x.c);
  const cuenta = (f: Filtro) => (f === 'Todos' ? choferes.length : choferes.filter((c) => c.tipo === f).length);

  return (
    <div style={themeVars}>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      {/* Banda cívica */}
      <div className="bg-on-surface text-background">
        <div className="max-w-[1440px] mx-auto px-container-margin lg:px-6 py-2 flex items-center gap-2 text-[11px] font-label-md">
          <span className="material-symbols-outlined text-[14px]" style={{ color: VERDE_SOFT }}>local_police</span>
          Padrón cívico vecinal · choferes con antecedentes y documentos revisados
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-12">

        {/* Sección Hero: Tarjeta de Pedido arriba y respaldo cívico abajo */}
        <div className="flex flex-col gap-3.5 max-w-xl mx-auto w-full">
          {/* Tarjeta de Pedido Rápido (Arriba) */}
          <QuickOrderCard />

          {/* Respaldo Cívico y Confianza (Abajo de la tarjeta) */}
          <div className="flex flex-col gap-2.5">
            <h1 className="sr-only">Taxi Seguro · Padrón Cívico Vecinal Pucallpa</h1>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-xs font-label-md text-[11px] font-bold uppercase tracking-wider" style={{ color: VERDE }}>
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                Padrón Cívico Vecinal · Pucallpa
              </span>
              <details className="group">
                <summary className="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary hover:text-primary cursor-pointer select-none transition-colors list-none">
                  <span>¿Cómo funciona?</span>
                  <span className="material-symbols-outlined text-[15px] group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="text-secondary font-body-md text-xs sm:text-sm mt-1 leading-relaxed animate-in fade-in duration-200">
                  Choferes verificados por la comunidad BogaHub. Contacto directo por llamada o WhatsApp — sin tarifas ocultas ni comisiones abusivas a intermediarios.
                </p>
              </details>
            </div>

            {/* 3 pilares de confianza en la misma fila */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-0.5">
              <div className="bg-white rounded-xl border border-surface-container-highest p-2 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 shadow-xs min-w-0">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">verified</span>
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-[10px] sm:text-[12px] font-bold text-on-surface leading-tight truncate">Filtrados</span>
                  <span className="font-body-md text-[8.5px] sm:text-[10px] text-secondary leading-tight truncate">DNI y SOAT</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-surface-container-highest p-2 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 shadow-xs min-w-0">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">payments</span>
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-[10px] sm:text-[12px] font-bold text-on-surface leading-tight truncate">0% Comisión</span>
                  <span className="font-body-md text-[8.5px] sm:text-[10px] text-secondary leading-tight truncate">Pago directo</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-surface-container-highest p-2 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 shadow-xs min-w-0">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">bolt</span>
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-[10px] sm:text-[12px] font-bold text-on-surface leading-tight truncate">Al instante</span>
                  <span className="font-body-md text-[8.5px] sm:text-[10px] text-secondary leading-tight truncate">Aviso cercano</span>
                </div>
              </div>
            </div>

            {/* Enlaces y accesos secundarios */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
              <Link
                href="/transporte/registro"
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold hover:underline"
                style={{ color: VERDE }}
              >
                <span className="material-symbols-outlined text-[14px]">badge</span>
                ¿Manejas mototaxi, auto o moto? Postúlate al padrón gratis →
              </Link>
              <Link
                href="/transporte/chofer"
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-secondary hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">key</span>
                Soy chofer · Abre tu app
              </Link>
            </div>
          </div>
        </div>

        {/* Filtros por tipo de vehículo */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['Todos', 'Mototaxi', 'Auto', 'Moto'] as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                filtro === f
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              {f !== 'Todos' && <span className="material-symbols-outlined text-[16px]">{ICONO[f]}</span>}
              {f}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] ${filtro === f ? 'bg-white/20' : 'bg-surface-container-high text-secondary'}`}>
                {cuenta(f)}
              </span>
            </button>
          ))}
        </div>

        {/* Cuántos están disponibles ahora */}
        {!cargando && choferes.some((c) => c.horario) && (
          <div className="flex flex-wrap items-center gap-3 -mt-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-label-md font-bold" style={{ color: VERDE }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: VERDE }} />
              {disponibles} {disponibles === 1 ? 'chofer disponible' : 'choferes disponibles'} ahora
            </span>
            <button
              onClick={() => setSoloDisponibles((v) => !v)}
              className={`px-3 py-1 rounded-full text-[11px] font-label-md border transition-all ${soloDisponibles ? 'text-white border-transparent' : 'bg-white text-secondary border-surface-container-highest'}`}
              style={soloDisponibles ? { backgroundColor: VERDE } : undefined}
            >
              {soloDisponibles ? 'Mostrando solo disponibles' : 'Ver solo disponibles'}
            </button>
            <span className="text-[11px] text-secondary">Se actualiza sola según el horario de cada chofer (hora de Pucallpa).</span>
          </div>
        )}

        {/* Directorio */}
        {cargando ? (
          <div className="p-12 text-center text-secondary text-sm">
            Cargando choferes verificados…
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col gap-6">
            {/* Aviso de red de despacho activa */}
            <div className="bg-white rounded-2xl border border-surface-container-highest p-4 lg:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
                  <span className="material-symbols-outlined text-[24px]">cell_tower</span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-sm text-sm lg:text-base font-bold text-on-surface">Red de choferes activa en Pucallpa</h3>
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping" style={{ backgroundColor: VERDE }} />
                      <span className="relative inline-flex w-2 h-2 rounded-full" style={{ backgroundColor: VERDE }} />
                    </span>
                  </div>
                  <p className="text-secondary text-xs mt-0.5 max-w-xl">
                    Aunque no veas choferes en lista abierta ahora, al enviar tu pedido notificamos al instante a los conductores empadronados más cercanos a tu ubicación.
                  </p>
                </div>
              </div>
              <Link
                href="/transporte/pedir"
                className="shrink-0 px-4 py-2.5 rounded-xl text-white font-label-md text-xs font-bold shadow-md active:scale-95 transition-transform"
                style={{ backgroundColor: VERDE }}
              >
                Pedir taxi ahora
              </Link>
            </div>

            {/* Tarifas comunitarias de referencia en Pucallpa */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div>
                  <h2 className="font-headline-md text-base lg:text-lg text-on-surface font-extrabold">
                    Tarifas comunitarias de referencia
                  </h2>
                  <p className="text-secondary text-xs mt-0.5">
                    Precios justos de referencia acordados habitualmente en Pucallpa (100% sin comisiones)
                  </p>
                </div>
                <Link href="/transporte/pedir" className="text-[12px] font-bold hover:underline shrink-0" style={{ color: VERDE }}>
                  Pedir viaje personalizado →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TARIFAS_REFERENCIALES.map((t) => (
                  <Link
                    key={`${t.origen}-${t.destino}`}
                    href={`/transporte/pedir?origen=${encodeURIComponent(t.origen)}&destino=${encodeURIComponent(t.destino)}&tipo=${encodeURIComponent(t.tipo)}`}
                    className="group bg-white rounded-2xl border border-surface-container-highest p-4 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md hover:border-primary transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
                        <span className="material-symbols-outlined text-[20px]">{t.icono}</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-secondary">
                        {t.badge}
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] text-secondary font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary/50" />
                        {t.origen}
                      </div>
                      <div className="font-headline-sm text-sm font-bold text-on-surface mt-1 group-hover:text-primary transition-colors">
                        {t.destino}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-surface-container flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-secondary uppercase font-semibold block leading-tight">Tarifa habitual</span>
                        <span className="font-headline-md text-sm font-extrabold text-primary leading-tight mt-0.5 block">{t.precio}</span>
                      </div>
                      <span className="text-[11px] font-bold text-secondary group-hover:text-primary flex items-center gap-0.5">
                        Pedir
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ¿Cómo funciona Taxi Seguro? */}
            <div className="bg-white rounded-2xl border border-surface-container-highest p-5 lg:p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="font-headline-md text-base font-extrabold text-on-surface">¿Cómo funciona Taxi Seguro en BogaHub?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0" style={{ backgroundColor: VERDE }}>
                    1
                  </span>
                  <div>
                    <h4 className="font-headline-sm text-xs font-bold text-on-surface">Pides tu viaje</h4>
                    <p className="text-secondary text-[11px] leading-relaxed mt-0.5">
                      Indica tu punto de recojo y a dónde vas. Avisamos a las unidades más cercanas.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0" style={{ backgroundColor: VERDE }}>
                    2
                  </span>
                  <div>
                    <h4 className="font-headline-sm text-xs font-bold text-on-surface">Chofer verificado te contacta</h4>
                    <p className="text-secondary text-[11px] leading-relaxed mt-0.5">
                      El conductor acepta y te llama o escribe por WhatsApp con sus datos y placa confirmados.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0" style={{ backgroundColor: VERDE }}>
                    3
                  </span>
                  <div>
                    <h4 className="font-headline-sm text-xs font-bold text-on-surface">Pagas lo justo</h4>
                    <p className="text-secondary text-[11px] leading-relaxed mt-0.5">
                      Pagas en efectivo o Yape acordado directamente con el chofer. Cero cobros a intermediarios.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner para Choferes */}
            <div className="rounded-2xl border border-surface-container-highest bg-surface-container-low p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[28px] text-primary">badge</span>
                <div>
                  <h4 className="font-headline-sm text-sm font-bold text-on-surface">¿Tienes mototaxi, auto o moto en Pucallpa?</h4>
                  <p className="text-secondary text-xs mt-0.5">
                    Sé parte del padrón de confianza. No cobramos comisiones por carrera y te conectas con vecinos de toda la ciudad.
                  </p>
                </div>
              </div>
              <Link
                href="/transporte/registro"
                className="shrink-0 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                Postularme al padrón gratis
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lista.map((c) => (
              <DriverCard key={c.id} c={c} ahora={ahora} />
            ))}
          </div>
        )}

        {/* Planes fijos — próximamente */}
        <section className="rounded-2xl border border-surface-container-highest bg-white shadow-[0_15px_15px_rgba(0,0,0,0.04)] p-5 lg:p-6 flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-headline-md text-on-surface text-lg lg:text-xl">Planes para moverte todos los días</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-md text-[10px] uppercase tracking-wider" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              Próximamente
            </span>
          </div>
          <p className="text-secondary font-body-md text-sm max-w-[62ch]">
            El directorio de choferes es y va a seguir siendo gratis. Aparte, pronto vas a poder
            contratar planes fijos — así BogaHub sostiene el servicio sin cobrarle comisión al chofer.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {PLANES_TRANSPORTE.map((p) => (
              <div key={p.id} className="rounded-xl border border-surface-container-highest p-4 flex flex-col gap-2">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: VERDE_SOFT, color: VERDE }}>
                  <span className="material-symbols-outlined text-[22px]">{p.icon}</span>
                </span>
                <span className="font-headline-sm text-on-surface text-[15px]">{p.nombre}</span>
                <span className="font-label-md text-[11px] text-secondary">{p.tagline}</span>
                <p className="font-body-md text-secondary text-[13px] leading-snug">{p.desc}</p>
                <span className="font-label-md text-[11px] mt-auto pt-1" style={{ color: VERDE }}>{p.modo}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setInteresado(true)}
              disabled={interesado}
              className="px-4 py-2 rounded-full text-white font-label-md text-[12px] active:scale-95 transition-transform disabled:opacity-70"
              style={{ backgroundColor: VERDE }}
            >
              {interesado ? '¡Anotado! Te avisamos 👌' : 'Me interesa un plan'}
            </button>
          </div>
        </section>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          BogaHub solo conecta pasajeros y choferes verificados. La tarifa se acuerda directamente entre las partes.
        </p>
      </main>
    </div>
  );
}
