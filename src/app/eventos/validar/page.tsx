'use client';

// Lector y Validador de Entradas de Puerta
// Soporta BarcodeDetector nativo (0.05s) + ZXing fallback, linterna y sonidos de confirmación.

import { useState } from 'react';
import Link from 'next/link';
import LectorQrPuerta from '@/components/eventos/LectorQrPuerta';

export default function ValidarEntradasPage() {
  const [pinIngresado, setPinIngresado] = useState('');
  const [staffAutorizado, setStaffAutorizado] = useState(true);

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
        <LectorQrPuerta pinStaff={pinIngresado || undefined} />

        <div className="mt-6 text-center text-white/40 text-xs flex flex-col gap-1">
          <p>Apunta la cámara al código QR del cliente.</p>
          <p className="text-[11px]">Lee códigos en pantalla de celular o impresos en papel.</p>
        </div>
      </main>
    </div>
  );
}
