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

    // Si además tiene sesión en Supabase, sincronizar
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user;
      if (u) {
        setCliente((prev) => ({
          nombre: prev?.nombre || u.user_metadata?.full_name || u.user_metadata?.name || '',
          telefono: prev?.telefono || u.user_metadata?.phone || '',
          direccion: prev?.direccion || '',
          email: u.email || prev?.email || '',
        }));
      }
    });
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
