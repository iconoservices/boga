'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { StoreTheme } from '@/lib/templates.config';
import { TXT, ICON } from './tokens';

/**
 * Feedback visual al agregar un plato al pedido.
 *
 * Antes tocar "+" no mostraba nada: el numerito del carrito cambiaba en una
 * esquina y, en movil, el carrito ni siquiera esta en la pantalla del menu, asi
 * que el cliente no sabia si se habia agregado. Ahora hay tres señales: el
 * boton se convierte en un check, el badge del carrito rebota y aparece un
 * aviso con acceso directo al pedido.
 */

const EVENTO = 'boga:agregado';

/** Lo dispara useCatalogo.addToCart; lo escucha AddedToast. */
export function avisarAgregado(nombre: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { nombre } }));
}

/* ── Boton "+" de la tarjeta ── */

export function AddButton({
  t, nombre, onAdd,
}: {
  t: StoreTheme;
  nombre: string;
  onAdd: () => void;
}) {
  const [ok, setOk] = useState(false);
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAdd();
        setOk(true);
        setTick((n) => n + 1);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setOk(false), 1000);
      }}
      className={`relative w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-90 transition-[background-color,transform] duration-200 ${ok ? 'add-btn-pop' : ''}`}
      style={{ background: ok ? '#16a34a' : t.primary, color: ok ? '#fff' : t.onPrimary }}
      aria-label={`Agregar ${nombre} al pedido`}
    >
      <span className={`material-symbols-outlined ${ICON.sm}`}>{ok ? 'check' : 'add'}</span>
      {ok && (
        <span
          key={tick}
          className="add-plus-float absolute -top-2 left-1/2 text-[11px] font-black pointer-events-none"
          style={{ color: '#16a34a' }}
        >
          +1
        </span>
      )}
    </button>
  );
}

/* ── Numerito del carrito ── */

export function CartBadge({
  t, count, className,
}: {
  t: StoreTheme;
  count: number;
  className: string;
}) {
  if (count <= 0) return null;
  // key={count}: al cambiar el numero se vuelve a montar y la animacion repite.
  return (
    <span
      key={count}
      className={`cart-badge-bump rounded-full font-black flex items-center justify-center ${className}`}
      style={{ background: t.primary, color: t.onPrimary }}
    >
      {count}
    </span>
  );
}

/* ── Aviso "Agregado" ── */

export function AddedToast({
  t, onVerPedido,
}: {
  t: StoreTheme;
  onVerPedido: () => void;
}) {
  const [aviso, setAviso] = useState<{ nombre: string; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onAgregado = (e: Event) => {
      const nombre = (e as CustomEvent<{ nombre: string }>).detail?.nombre ?? '';
      setAviso({ nombre, id: Date.now() });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setAviso(null), 2200);
    };
    window.addEventListener(EVENTO, onAgregado);
    return () => {
      window.removeEventListener(EVENTO, onAgregado);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!aviso) return null;

  return (
    <div
      key={aviso.id}
      role="status"
      aria-live="polite"
      // Movil: sobre la barra inferior (h-16). Escritorio: arriba a la derecha, bajo el header.
      // z-[110] para quedar por encima del modal de producto (z-[100]).
      className="add-toast fixed z-[110] left-4 right-4 bottom-20 md:left-auto md:right-6 md:bottom-auto md:top-20 md:w-80 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
      style={{ background: t.onSurface, color: t.surface }}
    >
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: '#16a34a', color: '#fff' }}
      >
        <span className={`material-symbols-outlined ${ICON.sm}`}>check</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className={`${TXT.micro} font-semibold opacity-70 leading-none mb-0.5`}>Agregado al pedido</p>
        <p className={`${TXT.small} font-bold truncate`}>{aviso.nombre}</p>
      </div>
      <button
        onClick={() => { setAviso(null); onVerPedido(); }}
        className={`${TXT.small} font-black uppercase shrink-0 px-3 py-1.5 rounded-full active:scale-95 transition-transform`}
        style={{ background: t.primary, color: t.onPrimary }}
      >
        Ver
      </button>
    </div>
  );
}
