'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Cierra la sesión de la cuenta en todos los demás dispositivos y deja abierta la de este.
export default function CerrarOtrasSesiones({ className, children }: { className?: string; children: React.ReactNode }) {
  const [estado, setEstado] = useState<'idle' | 'cerrando' | 'listo' | 'error'>('idle');

  const cerrar = async () => {
    if (estado === 'cerrando') return;
    if (!window.confirm('¿Cerrar tu sesión en todos los demás dispositivos? Esta seguirá abierta.')) return;
    setEstado('cerrando');
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setEstado(error ? 'error' : 'listo');
    setTimeout(() => setEstado('idle'), 3000);
  };

  return (
    <button onClick={cerrar} disabled={estado === 'cerrando'} className={className}>
      {estado === 'listo' ? '✓ Sesiones cerradas en los demás dispositivos' : estado === 'error' ? 'No se pudo, intenta de nuevo' : children}
    </button>
  );
}
