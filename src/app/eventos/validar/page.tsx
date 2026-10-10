'use client';

// Lector y Validador de Entradas de Puerta
// Soporta BarcodeDetector nativo (0.05s) + ZXing fallback, linterna y sonidos de confirmación.
// Para validar hace falta el PIN de puerta (EVENTOS_PIN_PUERTA en el servidor) o la sesión del superadmin.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LectorQrPuerta from '@/components/eventos/LectorQrPuerta';
import { supabase } from '@/lib/supabase';

const CLAVE_PIN = 'boga_pin_puerta';

export default function ValidarEntradasPage() {
  const [pinIngresado, setPinIngresado] = useState('');
  const [tokenSesion, setTokenSesion] = useState<string | null>(null);

  useEffect(() => {
    try { setPinIngresado(sessionStorage.getItem(CLAVE_PIN) || ''); } catch { /* sin almacenamiento */ }
    supabase.auth.getSession().then(({ data }) => setTokenSesion(data.session?.access_token ?? null));
  }, []);

  const cambiarPin = (v: string) => {
    setPinIngresado(v);
    try { sessionStorage.setItem(CLAVE_PIN, v); } catch { /* sin almacenamiento */ }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col font-sans">
      {/* Header portero */}
      <header className="border-b border-white/10 px-4 py-3 bg-[#111215] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/eventos"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight">Control de Puerta</h1>
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              Lector QR en Vivo
            </p>
          </div>
        </div>

        <Link
          href="/eventos/promotores"
          className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full hover:bg-amber-400/20 transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px]">badge</span>
          Promotores
        </Link>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center max-w-[500px] mx-auto w-full">
        {/* Con la sesión del superadmin no hace falta; se muestra igual por si la cuenta abierta es otra. */}
        <label className="w-full mb-4 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <span className="material-symbols-outlined text-[18px] text-white/50">lock</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="PIN de puerta"
            value={pinIngresado}
            onChange={(e) => cambiarPin(e.target.value.trim())}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/30"
          />
        </label>
        <LectorQrPuerta
          pinStaff={pinIngresado || undefined}
          cabeceras={tokenSesion ? { Authorization: `Bearer ${tokenSesion}` } : undefined}
        />

        <div className="mt-6 text-center text-white/40 text-xs flex flex-col gap-1">
          <p>Apunta la cámara al código QR del cliente.</p>
          <p className="text-[11px]">Lee códigos en pantalla de celular o impresos en papel.</p>
        </div>
      </main>
    </div>
  );
}
