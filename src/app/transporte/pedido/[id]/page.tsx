'use client';

// Seguimiento de un pedido de taxi. Se consulta cada 4 segundos: "buscando" (con las rondas de avisos),
// "chofer en camino" con sus datos, y los finales (completado / cancelado / sin respuesta).
// El enlace se puede compartir con un familiar para que sepa en qué viaje vas y con quién.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const VERDE = '#00875A';
const EXPIRA_MS = 10 * 60_000;

interface Chofer { nombre: string; tipo: string; placa: string | null; modelo: string | null; tel: string | null; img: string | null; vehImg: string | null; comite: string | null }
interface Estado {
  id: string; estado: 'buscando' | 'asignado' | 'completado' | 'cancelado' | 'expirado';
  origen: string | null; destino: string | null; oferta: number | null; busquedaDesde: string;
  ola: number; olasTotales: number; avisados: number; masCercanoKm: number | null; chofer: Chofer | null;
}

const distTxt = (km: number) => (km < 1 ? `${Math.max(50, Math.round(km * 100) * 10)} m` : `${km.toFixed(1)} km`);
const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function PedidoTaxiPage() {
  const { id } = useParams<{ id: string }>();
  const [e, setE] = useState<Estado | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const estadoAnterior = useRef<string | null>(null);

  const consultar = useCallback(async () => {
    try {
      const res = await fetch(`/api/transporte/pedido/${id}`, { cache: 'no-store' });
      if (res.status === 404) { setNoExiste(true); return; }
      if (!res.ok) return;
      const nuevo = (await res.json()) as Estado;
      // Cuando un chofer acepta: vibra para avisar aunque la pantalla esté en segundo plano cerca.
      if (estadoAnterior.current === 'buscando' && nuevo.estado === 'asignado') { try { navigator.vibrate?.([200, 100, 200]); } catch { /* sin vibración */ } }
      estadoAnterior.current = nuevo.estado;
      setE(nuevo);
    } catch { /* sin red: se reintenta en 4 s */ }
  }, [id]);

  // Cada consulta cuesta una ida a la base: cada 4 s solo mientras se busca chofer; con chofer asignado, cada 10 s;
  // cuando el viaje terminó (o se canceló, o caducó) ya no se consulta.
  const fase = e?.estado ?? 'inicio';
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    consultar();
    if (fase === 'completado' || fase === 'cancelado' || fase === 'expirado') return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') consultar(); }, fase === 'asignado' ? 10_000 : 4000);
    return () => clearInterval(t);
  }, [consultar, fase]);

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);

  const cancelar = async () => {
    if (!window.confirm('¿Cancelar tu pedido?')) return;
    await fetch(`/api/transporte/pedido/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'cancelar' }) });
    consultar();
  };

  const compartir = async () => {
    const url = window.location.href;
    const texto = `Voy en taxi (BogaHub Taxi Seguro)${e?.chofer ? ` con ${e.chofer.nombre}, placa ${e.chofer.placa ?? ''}` : ''}. Sigue mi viaje: ${url}`;
    if (navigator.share) { try { await navigator.share({ text: texto }); return; } catch { /* canceló */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const cab = (
    <header className="bg-white border-b border-black/5">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/transporte" aria-label="Volver" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold">←</Link>
        <h1 className="text-lg font-extrabold">Tu pedido de taxi</h1>
      </div>
    </header>
  );

  if (noExiste) {
    return (
      <div className="min-h-screen bg-[#f7f9f8]">{cab}
        <div className="max-w-xl mx-auto p-6 text-center">
          <p className="text-gray-600 font-semibold mb-4">No encontramos este pedido.</p>
          <Link href="/transporte/pedir" className="inline-block px-5 py-3 rounded-xl text-white font-bold" style={{ background: VERDE }}>Pedir un taxi</Link>
        </div>
      </div>
    );
  }
  if (!e) return <div className="min-h-screen bg-[#f7f9f8]">{cab}<p className="p-8 text-center text-gray-500 font-semibold">Cargando…</p></div>;

  const restante = new Date(e.busquedaDesde).getTime() + EXPIRA_MS - ahora;
  const c = e.chofer;
  const tel = c?.tel ? c.tel.replace(/\D/g, '') : '';

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-gray-900">
      {cab}
      <div className="max-w-xl mx-auto px-4 py-5 flex flex-col gap-4">
        {/* Resumen del viaje */}
        <div className="bg-white rounded-2xl border border-black/5 p-4 text-sm flex flex-col gap-1.5">
          <p><span className="font-bold text-gray-500">Desde:</span> <span className="font-semibold">{e.origen || 'Tu ubicación en el mapa'}</span></p>
          <p><span className="font-bold text-gray-500">Hasta:</span> <span className="font-semibold">{e.destino}</span></p>
          {e.oferta != null && <p><span className="font-bold text-gray-500">Ofreces:</span> <span className="font-extrabold" style={{ color: VERDE }}>S/ {e.oferta}</span></p>}
        </div>

        {e.estado === 'buscando' && (
          <div className="bg-white rounded-2xl border border-black/5 p-6 flex flex-col items-center gap-3 text-center">
            <div className="relative w-16 h-16">
              <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: VERDE }} />
              <span className="relative flex w-16 h-16 rounded-full items-center justify-center text-3xl" style={{ background: '#d3f1e4' }}>🛺</span>
            </div>
            <h2 className="text-xl font-extrabold">Buscando tu chofer…</h2>
            {e.avisados > 0 ? (
              <p className="text-sm font-semibold text-gray-600">
                Ya avisamos a {e.avisados} {e.avisados === 1 ? 'chofer' : 'choferes'}
                {e.masCercanoKm != null ? <> · el más cercano está a <b>{distTxt(e.masCercanoKm)}</b></> : null}.
                {e.ola < e.olasTotales && ' Si nadie responde, avisamos a más.'}
              </p>
            ) : (
              <p className="text-sm font-semibold text-amber-700">Por ahora no hay choferes conectados. Seguimos intentando; también puedes elegir uno del directorio.</p>
            )}
            <p className="text-xs font-bold text-gray-400">Tiempo de espera: {mmss(restante)}</p>
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-1">
              <Link href="/transporte" className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-sm">Ver choferes del directorio</Link>
              <button onClick={cancelar} className="flex-1 py-3 rounded-xl font-bold text-sm text-red-600 border border-red-200">Cancelar pedido</button>
            </div>
          </div>
        )}

        {(e.estado === 'asignado' || e.estado === 'completado') && c && (
          <div className="bg-white rounded-2xl border p-5 flex flex-col gap-4" style={{ borderColor: `${VERDE}55` }}>
            <p className="text-sm font-extrabold" style={{ color: VERDE }}>
              {e.estado === 'asignado' ? '✓ Un chofer aceptó tu pedido' : '✓ Viaje terminado. ¡Gracias por usar Taxi Seguro!'}
            </p>
            <div className="flex items-center gap-4">
              {c.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.img} alt={c.nombre} className="w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: VERDE }} />
              ) : <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl">🧑</div>}
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold leading-tight">{c.nombre}</h2>
                {c.comite && <p className="text-xs font-bold" style={{ color: VERDE }}>{c.comite}</p>}
                <p className="text-xs text-gray-500 font-medium">{[c.tipo, c.modelo].filter(Boolean).join(' · ')}</p>
                {c.placa && <span className="inline-block mt-1.5 bg-[#FDE047] text-[#0F172A] font-mono font-bold px-2.5 py-0.5 rounded tracking-[0.12em]">{c.placa}</span>}
              </div>
            </div>
            {c.vehImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.vehImg} alt="Vehículo" className="w-full h-40 object-cover rounded-xl" />
            )}
            {e.estado === 'asignado' && tel && (
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:+${tel}`} className="py-3.5 rounded-xl bg-gray-100 text-center font-extrabold">📞 Llamar</a>
                <a href={`https://wa.me/${tel}?text=${encodeURIComponent(`Hola ${c.nombre.split(' ')[0]}, soy el pasajero de tu pedido en BogaHub. Estoy en: ${e.origen || 'la ubicación que envié'}.`)}`}
                  target="_blank" rel="noreferrer" className="py-3.5 rounded-xl text-white text-center font-extrabold" style={{ background: VERDE }}>💬 WhatsApp</a>
              </div>
            )}
            {e.estado === 'asignado' && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={compartir} className="py-3 rounded-xl border border-gray-300 font-bold text-sm">🔗 Compartir mi viaje</button>
                <button onClick={cancelar} className="py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm">Cancelar</button>
              </div>
            )}
          </div>
        )}

        {(e.estado === 'cancelado' || e.estado === 'expirado') && (
          <div className="bg-white rounded-2xl border border-black/5 p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-3xl">{e.estado === 'expirado' ? '⏱️' : '✖️'}</p>
            <h2 className="text-lg font-extrabold">{e.estado === 'expirado' ? 'Nadie respondió esta vez' : 'Pedido cancelado'}</h2>
            {e.estado === 'expirado' && <p className="text-sm text-gray-600 font-medium">Puede que no haya choferes conectados ahora. Prueba de nuevo o contacta a uno del directorio directamente.</p>}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Link href="/transporte/pedir" className="flex-1 py-3 rounded-xl text-white font-bold text-sm" style={{ background: VERDE }}>Pedir de nuevo</Link>
              <Link href="/transporte" className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-sm">Ver el directorio</Link>
            </div>
          </div>
        )}

        {e.estado === 'completado' && (
          <Link href="/transporte/pedir" className="text-center py-3.5 rounded-xl text-white font-extrabold" style={{ background: VERDE }}>Pedir otro taxi</Link>
        )}
      </div>
    </div>
  );
}
