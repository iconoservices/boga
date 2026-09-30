'use client';

// Botón "Reservar entrada" dentro de la ficha de un evento reservable.
// MVP sin pago online: solo reserva el lugar y genera el QR — se paga en
// puerta. Ver memoria eventos-ticketing para el resto del plan (promotores,
// pasarela de pago, etc. — nivel 2, no está acá).

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';

function ReservaEntradaContenido({ eventoId }: { eventoId: string }) {
  const searchParams = useSearchParams();
  const promotorRef = searchParams.get('ref') || searchParams.get('promo') || searchParams.get('promotor') || '';

  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const reservar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setEnviando(true);
    setError('');

    try {
      const res = await fetch('/api/eventos/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventoId,
          nombre: nombre.trim(),
          telefono: telefono.trim() || undefined,
          promotor: promotorRef || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        // Fallback directo a supabase RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('reservar_ticket', {
          p: { event_id: eventoId, nombre: nombre.trim(), telefono: telefono.trim() || null },
        });
        if (rpcError) throw new Error(rpcError.message);
        const fila = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        setToken(fila?.token ?? null);
      } else {
        setToken(data.token);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al reservar entrada');
    } finally {
      setEnviando(false);
    }
  };

  if (token) {
    return (
      <div className="flex flex-col items-center gap-3 border-t border-surface-container pt-4 mt-1 text-center">
        <p className="font-headline-sm text-sm text-on-surface">¡Reserva confirmada!</p>
        <div className="bg-white p-3 rounded-xl border border-surface-container-highest">
          <QRCodeSVG value={token} size={180} level="H" />
        </div>
        <p className="text-secondary font-body-md text-xs leading-relaxed">
          Muestra este QR en la puerta — captura la pantalla por si acaso.
          Se paga en el local, BogaHub solo confirma tu lugar.
        </p>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full bg-primary text-white font-label-md text-sm px-5 py-2.5 rounded-full active:scale-95 transition-transform flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
        Reservar entrada
      </button>
    );
  }

  return (
    <form onSubmit={reservar} className="flex flex-col gap-2 border-t border-surface-container pt-4 mt-1">
      <p className="text-[11px] text-secondary font-semibold">Se paga en puerta — esto solo reserva tu lugar.</p>
      <input
        required
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Tu nombre"
        className="bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <input
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="WhatsApp (opcional)"
        className="bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="bg-primary text-white font-label-md text-sm px-5 py-2.5 rounded-full disabled:opacity-60 active:scale-95 transition-transform"
      >
        {enviando ? 'Reservando…' : 'Confirmar reserva'}
      </button>
    </form>
  );
}

export default function ReservaEntrada({ eventoId }: { eventoId: string }) {
  return (
    <Suspense fallback={<div className="text-xs text-center py-2 opacity-50">Cargando reserva…</div>}>
      <ReservaEntradaContenido eventoId={eventoId} />
    </Suspense>
  );
}

