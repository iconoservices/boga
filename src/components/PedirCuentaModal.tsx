'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Lo que la persona quería hacer, ej: "guardar tus favoritos" */
  motivo?: string;
  /** Ruta a la que volver después de entrar con correo (por defecto, la actual) */
  volverA?: string;
}

/**
 * Aviso liviano para pedir cuenta sin sacar a la persona de lo que está viendo:
 * Google en un toque, o ir a entrar/crear cuenta, o "Ahora no" y seguir.
 */
export default function PedirCuentaModal({ abierto, onCerrar, motivo = 'guardar tus favoritos', volverA }: Props) {
  const { signInWithGoogle } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!abierto) return null;

  const destino = volverA || (typeof window !== 'undefined' ? window.location.pathname : '/');

  const conGoogle = async () => {
    setError('');
    setCargando(true);
    const { error: e } = await signInWithGoogle(window.location.href);
    setCargando(false);
    if (e) setError('No se pudo abrir Google. Prueba con tu correo.');
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onCerrar}
    >
      <div
        className="w-full sm:max-w-[380px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-gray-900">Crea tu cuenta para {motivo}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Es gratis y toma un momento. Así lo ves igual en todas las tiendas.</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <button
          type="button"
          onClick={conGoogle}
          disabled={cargando}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs py-3 rounded-xl shadow-sm active:scale-95 transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continuar con Google
        </button>

        <Link
          href={`/login?modo=registro&redirect=${encodeURIComponent(destino)}`}
          className="w-full text-center bg-primary text-white font-bold text-xs py-3 rounded-xl active:scale-95 transition-all"
        >
          Entrar o crear cuenta con correo
        </Link>

        {error && <p className="text-[11px] text-red-600 font-semibold text-center">{error}</p>}

        <button type="button" onClick={onCerrar} className="text-xs font-semibold text-gray-500 hover:text-gray-800 py-1">
          Ahora no, seguir viendo
        </button>
      </div>
    </div>
  );
}
