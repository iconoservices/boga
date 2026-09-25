"use client";

import React, { useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchChoferes, type Chofer } from '@/lib/drivers';
import { disponibleAhora, proximaApertura, resumenHorario } from '@/lib/horario';
import { ubicacionActual, enlaceMapa } from '@/lib/ubicacion';

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

        {/* Encabezado + métricas */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex flex-col gap-1.5 max-w-xl">
            <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-white shadow-sm font-label-md text-[10px] uppercase tracking-wider" style={{ color: VERDE }}>
              <span className="material-symbols-outlined text-[13px]">local_taxi</span>
              Seguridad vial ciudadana
            </span>
            <h1 className="font-headline-lg text-on-surface tracking-tight text-2xl lg:text-3xl">Muévete tranquilo por Pucallpa</h1>
            <p className="text-secondary font-body-md text-sm">
              Choferes verificados por la comunidad BogaHub. Los contactas directo por llamada o WhatsApp — sin tarifas ocultas ni comisiones a intermediarios.
            </p>
            <a
              href="/transporte/pedir"
              className="inline-flex items-center gap-2 w-fit mt-2 px-5 py-3 rounded-2xl text-white font-label-md text-[14px] font-extrabold shadow-md active:scale-95 transition-transform"
              style={{ backgroundColor: VERDE }}
            >
              <span className="material-symbols-outlined text-[20px]">local_taxi</span>
              Pedir un taxi ahora
              <span className="text-[11px] font-bold opacity-80">· avisamos a los choferes más cercanos</span>
            </a>
            <a
              href="/transporte/registro"
              className="inline-flex items-center gap-1.5 w-fit mt-1 font-label-md text-[12px] font-bold hover:underline"
              style={{ color: VERDE }}
            >
              <span className="material-symbols-outlined text-[16px]">badge</span>
              ¿Manejas mototaxi, auto o moto? Postúlate al padrón
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </a>
            <a
              href="/transporte/chofer"
              className="inline-flex items-center gap-1.5 w-fit font-label-md text-[12px] font-bold hover:underline text-secondary"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              ¿Ya eres chofer del padrón? Abre tu app
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-white rounded-2xl border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)] p-4 lg:w-[360px] shrink-0">
            {[
              { k: 'Sin comisiones', v: '100%', s: 'Pago directo', c: VERDE },
              { k: 'Filtrados', v: '5 puntos', s: 'DNI · SOAT · Placa', c: 'var(--color-primary)' },
              { k: 'Satisfacción', v: '4.9★', s: '+3,400 viajes', c: 'var(--color-tertiary)' },
            ].map((m, i) => (
              <div key={m.k} className={`flex flex-col ${i > 0 ? 'border-l border-surface-container pl-3' : ''}`}>
                <span className="font-label-md text-[9px] text-secondary uppercase tracking-wide leading-tight">{m.k}</span>
                <span className="font-headline-md text-[17px] font-extrabold leading-tight mt-0.5" style={{ color: m.c }}>{m.v}</span>
                <span className="font-body-md text-[10px] text-secondary leading-tight">{m.s}</span>
              </div>
            ))}
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
          <div className="bg-white rounded-2xl border border-surface-container-highest p-10 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px]">local_taxi</span>
            </div>
            <h3 className="font-headline-md text-base text-on-surface">No hay choferes activos todavía</h3>
            <p className="text-secondary text-xs max-w-md leading-relaxed">
              Estamos integrando conductores con DNI y documentos validados. Si manejas en la ciudad, sé de los primeros en aparecer en el padrón.
            </p>
            <a
              href="/transporte/registro"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">badge</span>
              Postularme al padrón gratis
            </a>
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
