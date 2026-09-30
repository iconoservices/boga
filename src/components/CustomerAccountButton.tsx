'use client';

import React from 'react';
import { useCustomerSession } from '@/context/CustomerSessionContext';

export default function CustomerAccountButton() {
  const { cliente, setModalAbierto } = useCustomerSession();

  return (
    <button
      type="button"
      onClick={() => setModalAbierto(true)}
      className="fixed bottom-4 left-4 z-40 bg-white/95 text-gray-800 hover:text-primary backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-gray-200/80 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 group"
      title="Mi Cuenta de Cliente y Pedidos"
    >
      <span className="material-symbols-outlined text-[18px] text-primary group-hover:scale-110 transition-transform">
        {cliente ? 'account_circle' : 'person'}
      </span>
      <span className="max-w-[120px] truncate">
        {cliente?.nombre ? `Hola, ${cliente.nombre.split(' ')[0]}` : 'Mi Cuenta'}
      </span>
    </button>
  );
}
