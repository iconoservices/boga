'use client';

import React from 'react';
import type { StoreTheme } from '@/lib/templates.config';

// Cartilla digital de mascota con semáforo de vacunas. Por ahora es de EJEMPLO
// (Firulais): la carga real de mascotas y vacunas por veterinaria es la fase 2
// (tablas en Supabase + panel). El semáforo ya se calcula por fecha real.

// Forma de los datos (la misma que se guardará en la fase 2): una mascota con un
// historial de visitas. Cada visita puede traer próxima cita, y de ahí sale el semáforo.
type Visita = { fecha: string; tipo: string; doctor?: string; peso?: string; proxima?: string; notas?: string };

// Fechas relativas a hoy para que el ejemplo siempre muestre los 3 colores.
const enDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const MASCOTA = { nombre: 'Firulais', raza: 'Pitbull', detalle: '3 años', foto: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80' };
const HISTORIAL: Visita[] = [
  { fecha: enDias(-28), tipo: 'Antipulgas', doctor: 'Dr. Carlos', peso: '12 kg', proxima: enDias(2) },
  { fecha: enDias(-80), tipo: 'Vacuna séxtuple', doctor: 'Dr. Carlos', peso: '12 kg', proxima: enDias(20) },
  { fecha: enDias(-120), tipo: 'Vacuna antirrábica', doctor: 'Dr. Carlos', peso: '11.5 kg', proxima: enDias(245) },
  { fecha: enDias(-150), tipo: 'Baño medicado y corte de uñas', notas: 'Todo limpio, orejas sin infección' },
];

type Estado = 'alDia' | 'pronto' | 'vencida';
const COLOR: Record<Estado, string> = { alDia: '#16a34a', pronto: '#f59e0b', vencida: '#dc2626' };

// Verde: falta más de 30 días. Amarillo: entre 8 y 30. Rojo: 7 o menos, o ya vencida.
export function estadoVacuna(proxima: string, hoy = new Date()): { estado: Estado; dias: number } {
  const dias = Math.ceil((new Date(proxima + 'T00:00:00').getTime() - hoy.getTime()) / 86400000);
  return { estado: dias <= 7 ? 'vencida' : dias <= 30 ? 'pronto' : 'alDia', dias };
}

const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CartillaMascota({
  t, veterinaria, onCita,
}: { t: StoreTheme; veterinaria: string; onCita: (mensaje: string) => void }) {
  return (
    <div className="px-5 md:px-8 max-w-3xl md:mx-auto py-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-5">
        <img src={MASCOTA.foto} alt={MASCOTA.nombre} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: t.primary }}>Cartilla digital · ejemplo</p>
          <h2 className="font-black text-2xl leading-tight" style={{ color: t.onSurface }}>{MASCOTA.nombre}</h2>
          <p className="text-sm font-semibold" style={{ color: t.onSurfaceVariant }}>{MASCOTA.raza} · {MASCOTA.detalle} · {veterinaria}</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border" style={{ background: t.surface, borderColor: `${t.outlineVariant}80` }}>
        {HISTORIAL.filter((v): v is Visita & { proxima: string } => !!v.proxima).map((v, i) => {
          const { estado, dias } = estadoVacuna(v.proxima);
          const texto =
            dias < 0 ? 'Vencida'
            : estado === 'vencida' ? `¡Vence en ${dias} día${dias === 1 ? '' : 's'}!`
            : estado === 'pronto' ? `Próxima dosis: ${fmt(v.proxima)}`
            : `Al día · próxima ${fmt(v.proxima)}`;
          return (
            <div key={v.tipo} className="flex items-center gap-3 px-4 py-3.5" style={i ? { borderTop: `1px solid ${t.outlineVariant}50` } : undefined}>
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: COLOR[estado] }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm" style={{ color: t.onSurface }}>{v.tipo}</p>
                <p className="text-xs" style={{ color: estado === 'vencida' ? COLOR.vencida : t.onSurfaceVariant, fontWeight: estado === 'vencida' ? 700 : 500 }}>{texto}</p>
              </div>
              <span className="text-[11px] shrink-0" style={{ color: t.onSurfaceVariant }}>Puesta {fmt(v.fecha)}</span>
            </div>
          );
        })}
      </div>

      <h3 className="mt-7 mb-3 font-extrabold text-base" style={{ color: t.onSurface }}>Historial</h3>
      <ol className="relative ml-2 border-l-2 space-y-5" style={{ borderColor: `${t.outlineVariant}` }}>
        {HISTORIAL.map((v) => (
          <li key={v.fecha + v.tipo} className="pl-5 relative">
            <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full" style={{ background: t.primary }} aria-hidden />
            <p className="text-[11px] font-bold" style={{ color: t.onSurfaceVariant }}>{fmt(v.fecha)}</p>
            <p className="font-bold text-sm" style={{ color: t.onSurface }}>{v.tipo}</p>
            <p className="text-xs" style={{ color: t.onSurfaceVariant }}>
              {[v.doctor, v.peso, v.notas].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ol>

      <button
        onClick={() => onCita(`Hola ${veterinaria}, quisiera pedir una cita / baño para ${MASCOTA.nombre}.`)}
        className="mt-5 w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
        style={{ background: t.primary, color: t.onPrimary }}
      >
        <span className="material-symbols-outlined text-[20px]">chat</span>
        Pedir baño / cita por WhatsApp
      </button>
    </div>
  );
}
