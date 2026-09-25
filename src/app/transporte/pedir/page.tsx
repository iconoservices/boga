'use client';

// Pedir un taxi: el pasajero dice dónde está (GPS, zona o referencia), a dónde va y, si quiere, cuánto ofrece.
// El pedido sale como aviso a los choferes disponibles MÁS CERCANOS primero (ver lib/despacho.ts).

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ZONAS_TRANSPORTE, TIPOS_PEDIDO, CLAVE_PEDIDO_TAXI } from '@/lib/zonasTransporte';
import { ubicacionActual, mensajeUbicacion, type ErrorUbicacion, type Punto } from '@/lib/ubicacion';
import { guardarCliente, leerCliente, normalizarCelular } from '@/lib/cliente';

const VERDE = '#00875A';
const OFERTAS = [3, 4, 5, 6, 8, 10];

export default function PedirTaxiPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  // Si ya pidió antes, se rellenan sus datos (se leen recién en el navegador, no en el servidor).
  useEffect(() => {
    const previo = leerCliente();
    if (previo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre((n) => n || previo.nombre);
      setCelular((c) => c || previo.telefono);
    }
  }, []);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [errUbic, setErrUbic] = useState('');
  const [zona, setZona] = useState<string | null>(null);
  const [referencia, setReferencia] = useState('');
  const [destino, setDestino] = useState('');
  const [tipo, setTipo] = useState('');
  const [oferta, setOferta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const usarUbicacion = async () => {
    setUbicando(true); setErrUbic('');
    try { setPunto(await ubicacionActual()); }
    catch (e) { setErrUbic(mensajeUbicacion(e as ErrorUbicacion)); }
    finally { setUbicando(false); }
  };

  const pedir = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const tel = normalizarCelular(celular);
    if (nombre.trim().length < 2) return setError('Escribe tu nombre.');
    if (!tel) return setError('Escribe un celular de 9 dígitos que empiece con 9.');
    if (!punto && !zona && !referencia.trim()) return setError('Dinos dónde estás: usa tu ubicación, elige tu zona o escribe una referencia.');
    if (!destino.trim()) return setError('¿A dónde vas?');

    setEnviando(true);
    try {
      const res = await fetch('/api/transporte/pedir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(), telefono: tel, tipo: tipo || null,
          lat: punto?.lat, lng: punto?.lng, zona, origen_texto: referencia.trim(),
          destino: destino.trim(), oferta: oferta || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.id) throw new Error(j.error || 'No se pudo enviar tu pedido.');
      guardarCliente({ nombre: nombre.trim(), telefono: tel });
      try { localStorage.setItem(CLAVE_PEDIDO_TAXI, j.id); } catch { /* sin almacenamiento */ }
      router.push(`/transporte/pedido/${j.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu pedido.');
      setEnviando(false);
    }
  };

  const campo = 'w-full border border-gray-300 rounded-xl px-3.5 py-3 text-base font-semibold text-gray-900 bg-white focus:outline-none focus:border-[#00875A]';
  const chip = (activo: boolean) =>
    `px-3.5 py-2 rounded-full text-sm font-bold border transition-colors ${activo ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300'}`;

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-gray-900">
      <header className="bg-white border-b border-black/5">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/transporte" aria-label="Volver" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold">←</Link>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">Pedir un taxi</h1>
            <p className="text-xs text-gray-500 font-medium">Avisamos primero a los choferes más cercanos</p>
          </div>
        </div>
      </header>

      <form onSubmit={pedir} className="max-w-xl mx-auto px-4 py-5 flex flex-col gap-5">
        {/* Dónde estás */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">¿Dónde estás?</h2>
          {punto ? (
            <div className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3" style={{ background: '#d3f1e4' }}>
              <span className="text-sm font-bold" style={{ color: VERDE }}>✓ Ubicación lista <span className="font-medium">(±{punto.precisionM} m)</span></span>
              <button type="button" onClick={() => setPunto(null)} className="text-xs font-bold text-gray-600 underline">Quitar</button>
            </div>
          ) : (
            <button type="button" onClick={usarUbicacion} disabled={ubicando}
              className="w-full py-3.5 rounded-xl text-white font-extrabold text-base disabled:opacity-60" style={{ background: VERDE }}>
              {ubicando ? 'Buscando tu ubicación…' : '📍 Usar mi ubicación'}
            </button>
          )}
          {errUbic && <p className="text-xs font-semibold text-amber-700">{errUbic}</p>}

          {!punto && (
            <>
              <p className="text-xs font-semibold text-gray-500">O elige tu zona:</p>
              <div className="flex flex-wrap gap-2">
                {ZONAS_TRANSPORTE.map((z) => (
                  <button key={z.id} type="button" onClick={() => setZona(zona === z.id ? null : z.id)}
                    className={chip(zona === z.id)} style={zona === z.id ? { background: VERDE } : undefined}>{z.nombre}</button>
                ))}
              </div>
            </>
          )}
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Referencia (ej. frente al mercado, esquina de la farmacia)" className={campo} maxLength={120} />
        </section>

        {/* A dónde vas */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">¿A dónde vas?</h2>
          <input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej. Hospital Regional, Terminal, Yarinacocha…" className={campo} maxLength={120} />
        </section>

        {/* Vehículo y precio */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">¿Qué vehículo?</h2>
          <div className="flex flex-wrap gap-2">
            {['', ...TIPOS_PEDIDO].map((t) => (
              <button key={t || 'cualquiera'} type="button" onClick={() => setTipo(t)} className={chip(tipo === t)} style={tipo === t ? { background: VERDE } : undefined}>
                {t || 'Cualquiera'}
              </button>
            ))}
          </div>

          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500 mt-2">¿Cuánto ofreces? <span className="normal-case font-medium">(opcional)</span></h2>
          <div className="flex flex-wrap gap-2">
            {OFERTAS.map((o) => (
              <button key={o} type="button" onClick={() => setOferta(oferta === String(o) ? '' : String(o))}
                className={chip(oferta === String(o))} style={oferta === String(o) ? { background: VERDE } : undefined}>S/ {o}</button>
            ))}
            <input value={oferta} onChange={(e) => setOferta(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} inputMode="decimal" placeholder="Otro" className="w-20 border border-gray-300 rounded-full px-3 py-2 text-sm font-bold text-center" />
          </div>
          <p className="text-xs text-gray-500 font-medium">Es el precio que propones. El chofer que acepte lo hace a ese precio; si no pones nada, se acuerda con él.</p>
        </section>

        {/* Tus datos */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">Tus datos</h2>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className={campo} maxLength={60} autoComplete="name" />
          <input value={celular} onChange={(e) => setCelular(e.target.value)} type="tel" inputMode="numeric" placeholder="Tu celular (9XX XXX XXX)" className={campo} autoComplete="tel" />
          <p className="text-xs text-gray-500 font-medium">El chofer que acepte verá tu celular para contactarte. Los demás no.</p>
        </section>

        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <button type="submit" disabled={enviando}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-lg shadow-lg disabled:opacity-60" style={{ background: VERDE }}>
          {enviando ? 'Enviando tu pedido…' : 'Pedir taxi ahora'}
        </button>
        <p className="text-center text-[11px] text-gray-400 font-medium">
          BogaHub conecta pasajeros con choferes verificados. La tarifa se acuerda entre las partes y se paga directo al chofer.
        </p>
      </form>
    </div>
  );
}
