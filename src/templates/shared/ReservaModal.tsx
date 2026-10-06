'use client';

import React, { useEffect, useState } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import { HORAS_RESERVA, horaLegible } from '@/lib/reservas';
import { hoyLima } from '@/lib/fechaLima';
import { TXT, ICON, soles, type Producto } from './tokens';
import OtrosPrecios from './OtrosPrecios';

/**
 * Reservar un servicio: elige servicio, fecha y hora, deja su nombre y teléfono.
 * Guarda la reserva en /api/reservas (el dueño la ve en /admin/reservas) y la clienta
 * la manda por WhatsApp para que se la confirmen. Si el registro falla, la solicitud
 * igual sale por WhatsApp. Los servicios de ejemplo (id "demo-…") no se guardan.
 */
export default function ReservaModal({
  store, servicios, inicial, onClose,
}: {
  store: StoreConfig;
  servicios: Producto[];
  /** Servicio preseleccionado; si es null el modal está cerrado. */
  inicial: Producto | null;
  onClose: () => void;
}) {
  const t = store.theme;
  const [servicioId, setServicioId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [ocupadas, setOcupadas] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const abierto = inicial !== null;
  useEffect(() => {
    if (!inicial) return;
    setServicioId(inicial.id);
    setHora('');
    setListo(false);
    setCodigo(null);
  }, [inicial]);

  const servicio = servicios.find((s) => s.id === servicioId) ?? inicial;

  // Horas ya tomadas ese día (el servidor devuelve solo las horas, nunca datos de otras clientas).
  useEffect(() => {
    if (!abierto || !fecha) { setOcupadas([]); return; }
    let vivo = true;
    fetch(`/api/reservas?store=${encodeURIComponent(store.slug)}&fecha=${fecha}`)
      .then((r) => r.json())
      .then((d) => { if (vivo) setOcupadas(Array.isArray(d?.ocupadas) ? d.ocupadas : []); })
      .catch(() => { if (vivo) setOcupadas([]); });
    return () => { vivo = false; };
  }, [abierto, fecha, store.slug]);

  if (!abierto || !servicio) return null;

  const duracion = (s: Producto) => s.extra?.area || '';
  const precio = (s: Producto) => (s.price > 0 ? soles(s.price) : 'A consultar');

  const reservar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim() || !fecha || !hora) return;
    setEnviando(true);
    let cod = '';
    if (!servicio.id.startsWith('demo-')) {
      try {
        const r = await fetch('/api/reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store: store.slug, servicioId: servicio.id, fecha, hora, nombre, telefono, nota }),
        });
        const d = await r.json().catch(() => ({} as { ok?: boolean; codigo?: string; motivo?: string }));
        if (d.ok && d.codigo) cod = d.codigo;
        else if (d.motivo === 'ocupada') {
          setOcupadas((o) => [...o, hora]);
          setHora('');
          setEnviando(false);
          alert('Esa hora acaba de ser reservada por otra persona. Elige otra, por favor.');
          return;
        } else if (d.motivo === 'limite') {
          setEnviando(false);
          alert('Demasiados intentos seguidos. Espera unos minutos.');
          return;
        }
        // Otro fallo (ej. el SQL de reservas sin correr): la solicitud igual sale por WhatsApp.
      } catch { /* sin conexión al registro: la solicitud igual sale por WhatsApp */ }
    }
    setCodigo(cod || null);
    setListo(true);
    setEnviando(false);
  };

  const porWhatsApp = () => {
    enviarPedidoPorWhatsApp(
      store,
      `*Solicitud de reserva en ${store.name}*\n` +
      `-------------------------\n` +
      (codigo ? `*Código:* ${codigo}\n` : '') +
      `*Servicio:* ${servicio.name}\n` +
      (servicio.price > 0 ? `*Precio:* ${soles(servicio.price)}\n` : '') +
      `*Fecha:* ${fecha}\n` +
      `*Hora:* ${horaLegible(hora)}\n` +
      `*Cliente:* ${nombre}\n` +
      `*Teléfono:* ${telefono}\n` +
      `*Nota:* ${nota || 'Ninguna'}`
    );
  };

  const campo = `w-full rounded-xl border px-3 py-2.5 ${TXT.small} font-semibold outline-none`;
  const estiloCampo = { background: t.surface, borderColor: `${t.outlineVariant}`, color: t.onSurface };
  const etiqueta = `${TXT.micro} font-bold uppercase tracking-wider block mb-1.5`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl shadow-2xl" style={{ background: t.background, color: t.onBackground }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ background: t.background, borderColor: `${t.outlineVariant}80` }}>
          <h3 className={`${TXT.title} font-black`}>{listo ? '¡Solicitud lista!' : 'Reservar mi cita'}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: t.surfaceContainer }}>
            <span className={`material-symbols-outlined ${ICON.sm}`}>close</span>
          </button>
        </div>

        {listo ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: t.primary, color: t.onPrimary }}>
              <span className={`material-symbols-outlined ${ICON.lg}`}>event_available</span>
            </div>
            {codigo && <p className={`${TXT.small} font-black tracking-widest`} style={{ color: t.primary }}>CÓDIGO {codigo}</p>}
            <div className="rounded-2xl p-4 text-left space-y-1.5" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}` }}>
              <p className={`${TXT.body} font-extrabold`}>{servicio.name}</p>
              <p className={TXT.small} style={{ color: t.onSurfaceVariant }}>{fecha} · {horaLegible(hora)}</p>
              <p className={`${TXT.small} font-bold`} style={{ color: t.primary }}>{precio(servicio)}</p>
              {servicio.price > 0 && <OtrosPrecios precios={servicio.preciosMoneda} className={TXT.micro} style={{ color: t.onSurfaceVariant }} />}
            </div>
            <p className={TXT.small} style={{ color: t.onSurfaceVariant }}>Para terminar, avísanos por WhatsApp: ahí te confirmamos tu hora.</p>
            <button onClick={porWhatsApp} className={`w-full py-3 rounded-full font-extrabold ${TXT.body} flex items-center justify-center gap-2 active:scale-95`} style={{ background: '#25D366', color: '#fff' }}>
              <span className={`material-symbols-outlined ${ICON.sm}`}>chat</span> Enviar por WhatsApp
            </button>
            <button onClick={onClose} className={`w-full py-3 rounded-full font-bold ${TXT.body}`} style={{ background: t.surfaceContainer, color: t.onSurface }}>Volver</button>
          </div>
        ) : (
          <form onSubmit={reservar} className="p-5 space-y-4">
            <div>
              <label className={etiqueta} style={{ color: t.onSurfaceVariant }}>1. Servicio</label>
              <select value={servicio.id} onChange={(e) => setServicioId(e.target.value)} className={campo} style={estiloCampo}>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.price > 0 ? ` - ${soles(s.price)}` : ''}{duracion(s) ? ` (${duracion(s)})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} style={{ color: t.onSurfaceVariant }}>2. Fecha</label>
                <input type="date" required min={hoyLima()} value={fecha} onChange={(e) => { setFecha(e.target.value); setHora(''); }} className={campo} style={estiloCampo} />
              </div>
              <div>
                <label className={etiqueta} style={{ color: t.onSurfaceVariant }}>3. Hora</label>
                <select required value={hora} onChange={(e) => setHora(e.target.value)} disabled={!fecha} className={`${campo} disabled:opacity-50`} style={estiloCampo}>
                  <option value="">{fecha ? 'Elige hora…' : 'Primero la fecha'}</option>
                  {HORAS_RESERVA.map((h) => (
                    <option key={h} value={h} disabled={ocupadas.includes(h)}>{horaLegible(h)}{ocupadas.includes(h) ? ' · ocupada' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className={etiqueta} style={{ color: t.onSurfaceVariant }}>4. Tus datos</label>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Nombre *" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} style={estiloCampo} />
                <input required type="tel" placeholder="WhatsApp *" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={campo} style={estiloCampo} />
              </div>
              <textarea rows={2} placeholder="¿Alguna idea o detalle? (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} className={campo} style={estiloCampo} />
            </div>

            <button type="submit" disabled={enviando} className={`w-full py-3.5 rounded-full font-extrabold ${TXT.body} shadow-lg active:scale-95 disabled:opacity-60`} style={{ background: t.primary, color: t.onPrimary }}>
              {enviando ? 'Reservando…' : 'Reservar mi hora'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
