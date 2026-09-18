'use client';

// Botón "Reservar entrada" dentro de la ficha de un evento reservable.
// MVP sin pago online: solo reserva el lugar y genera el QR — se paga en
// puerta. Ver memoria eventos-ticketing para el resto del plan (promotores,
// pasarela de pago, etc. — nivel 2, no está acá).

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';

export default function ReservaEntrada({ eventoId }: { eventoId: string }) {
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

    const { data, error: rpcError } = await supabase.rpc('reservar_ticket', {
      p: { event_id: eventoId, nombre: nombre.trim(), telefono: telefono.trim() || null },
    });

    setEnviando(false);
    if (rpcError) { setError(rpcError.message); return; }
    const fila = Array.isArray(data) ? data[0] : data;
    setToken(fila?.token ?? null);
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
          Se paga en el local, Boga solo confirma tu lugar.
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
