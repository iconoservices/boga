'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type DatosCliente = {
  nombre: string;
  telefono: string;
  direccion: string;
  email?: string;
};

type CustomerSessionContextType = {
  cliente: DatosCliente | null;
  guardarCliente: (datos: DatosCliente) => void;
  cerrarSesion: () => void;
  modalAbierto: boolean;
  setModalAbierto: (abierto: boolean) => void;
};

const CustomerSessionContext = createContext<CustomerSessionContextType | undefined>(undefined);

const CLAVE_CLIENTE_LOCAL = 'boga_cliente_datos';
const CLAVE_REABRIR_MODAL = 'boga_reopen_customer_modal';

export function CustomerSessionProvider({ children }: { children: React.ReactNode }) {
  const [cliente, setCliente] = useState<DatosCliente | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Cargar datos guardados del cliente
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_CLIENTE_LOCAL);
      if (guardado) {
        setCliente(JSON.parse(guardado));
      }
    } catch {}

    const syncUsuario = (u: any) => {
      if (!u) return;
      const nombreGoogle = u.user_metadata?.full_name || u.user_metadata?.name || '';
      const emailGoogle = u.email || '';
      const phoneGoogle = u.user_metadata?.phone || u.phone || '';

      setCliente((prev) => {
        const nombreFinal = (prev?.nombre && prev.nombre !== 'Invitado') ? prev.nombre : (nombreGoogle || prev?.nombre || '');
        const nuevo: DatosCliente = {
          nombre: nombreFinal,
          telefono: prev?.telefono || phoneGoogle,
          direccion: prev?.direccion || '',
          email: emailGoogle || prev?.email || '',
        };
        try {
          localStorage.setItem(CLAVE_CLIENTE_LOCAL, JSON.stringify(nuevo));
        } catch {}
        return nuevo;
      });
    };

    // Sincronizar al montar
    supabase.auth.getSession().then(({ data }) => {
      syncUsuario(data?.session?.user);
    });

    // Sincronizar en tiempo real cuando cambia el estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      syncUsuario(newSession?.user);
    });

    // Auto reabrir modal si venía de iniciar sesión con Google en esta tienda
    try {
      if (localStorage.getItem(CLAVE_REABRIR_MODAL) === 'true') {
        localStorage.removeItem(CLAVE_REABRIR_MODAL);
        setModalAbierto(true);
      }
    } catch {}

    return () => subscription.unsubscribe();
  }, []);

  const guardarCliente = (datos: DatosCliente) => {
    setCliente(datos);
    try {
      localStorage.setItem(CLAVE_CLIENTE_LOCAL, JSON.stringify(datos));
    } catch {}
  };

  const cerrarSesion = () => {
    setCliente(null);
    try {
      localStorage.removeItem(CLAVE_CLIENTE_LOCAL);
      localStorage.removeItem(CLAVE_REABRIR_MODAL);
    } catch {}
    supabase.auth.signOut().catch(() => {});
  };

  return (
    <CustomerSessionContext.Provider
      value={{
        cliente,
        guardarCliente,
        cerrarSesion,
        modalAbierto,
        setModalAbierto,
      }}
    >
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  const ctx = useContext(CustomerSessionContext);
  if (!ctx) {
    throw new Error('useCustomerSession debe usarse dentro de CustomerSessionProvider');
  }
  return ctx;
}
