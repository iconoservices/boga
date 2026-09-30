'use client';

import React from 'react';
import { useCustomerSession } from '@/context/CustomerSessionContext';
import { useAuth } from '@/context/AuthContext';

export default function CustomerAccountButton() {
  const { cliente, setModalAbierto } = useCustomerSession();
  const { user } = useAuth();

  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const nombreMostrar =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    cliente?.nombre ||
    (user?.email ? user.email.split('@')[0] : '');

  return (
    <button
      type="button"
      onClick={() => setModalAbierto(true)}
      className="fixed bottom-4 left-4 z-40 bg-white/95 text-gray-800 hover:text-primary backdrop-blur-md pl-2 pr-3.5 py-1.5 rounded-full shadow-lg border border-gray-200/80 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
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
      <span className="max-w-[120px] truncate">
        {nombreMostrar ? `Hola, ${nombreMostrar.split(' ')[0]}` : 'Mi Cuenta'}
      </span>
    </button>
  );
}
