'use client';

import React, { useEffect } from 'react';
import { useCustomerSession } from '@/context/CustomerSessionContext';
import { useAuth } from '@/context/AuthContext';

interface Props {
  /** 'encabezado': va dentro del encabezado de la plantilla (a la derecha del carrito). Sin esto, flota. */
  variant?: 'flotante' | 'encabezado';
  /** Colores del botón en el encabezado (para que combine con la plantilla) */
  color?: string;
  background?: string;
}

export default function CustomerAccountButton({ variant = 'flotante', color, background }: Props) {
  const { cliente, setModalAbierto, cuentaEnEncabezado, setCuentaEnEncabezado } = useCustomerSession();
  const { user } = useAuth();

  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const nombreMostrar =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    cliente?.nombre ||
    (user?.email ? user.email.split('@')[0] : '');

  const enEncabezado = variant === 'encabezado';
  useEffect(() => {
    if (!enEncabezado) return;
    setCuentaEnEncabezado(true);
    return () => setCuentaEnEncabezado(false);
  }, [enEncabezado, setCuentaEnEncabezado]);

  if (!enEncabezado && cuentaEnEncabezado) return null;

  if (enEncabezado) {
    return (
      <button
        type="button"
        onClick={() => setModalAbierto(true)}
        aria-label="Mi cuenta"
        title="Mi Cuenta de Cliente y Pedidos"
        className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center overflow-hidden border border-black/10 transition-transform active:scale-95 cursor-pointer"
        style={{ background: background || '#ffffff', color: color || '#111827' }}
      >
        {userAvatar ? (
          <img src={userAvatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-[22px]">{user || cliente ? 'account_circle' : 'person'}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setModalAbierto(true)}
      className="fixed top-3 right-28 z-[55] bg-white/95 text-gray-800 hover:text-primary backdrop-blur-md p-1.5 sm:pl-2 sm:pr-3.5 rounded-full shadow-lg border border-gray-200/80 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
      title="Mi Cuenta de Cliente y Pedidos"
    >
      {userAvatar ? (
        <img
          src={userAvatar}
          alt=""
          className="w-6 h-6 rounded-full object-cover border border-gray-300 shrink-0"
        />
      ) : (
        <span className="material-symbols-outlined text-[20px] text-primary group-hover:scale-110 transition-transform">
          {user || cliente ? 'account_circle' : 'person'}
        </span>
      )}
      <span className="hidden sm:inline max-w-[120px] truncate">
        {nombreMostrar ? `Hola, ${nombreMostrar.split(' ')[0]}` : 'Mi Cuenta'}
      </span>
    </button>
  );
}
