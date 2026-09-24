'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { hayClave, pushDisponible, sigueTienda, seguirTienda, motivoError, esIOS, enModoApp } from '@/lib/push';
import { CANAL_BOGA } from '@/lib/pushLimites';

/**
 * Invitación amable a activar los avisos de BogaHub (eventos, sorteos, trabajos). Es una tarjeta
 * propia: el permiso del navegador solo se pide si la persona toca «Activar» (pedirlo al abrir la
 * página hace que lo rechacen, y un permiso rechazado ya no se puede volver a pedir).
 *
 * Reglas: es chica (una sola línea) y se cierra con la X. Sale como mucho una vez al día: a los 12 s de
 * uso, y desde el momento en que se muestra no vuelve a salir hasta pasadas 24 horas (la cierren o no).
 * Solo se deja de mostrar del todo si bloquean el permiso en el navegador. La campana de la cabecera y
 * el interruptor del perfil siguen disponibles siempre.
 * No sale en tiendas, admin ni pantallas de sesión, ni si ya activó o bloqueó los avisos.
 */

const LLAVE = 'boga_push_aviso';
const ESPERA_DIAS = 1;   // como mucho una vez al día
// Solo lo usa el rechazo del permiso del navegador ('denegado'): ahí ya no se puede volver a pedir.
const MAX_RECHAZOS = 5;
const ESPERA_INICIAL_MS = 12_000;

// Solo pantallas de BogaHub donde tiene sentido (nunca dentro de una tienda ni del panel)
const RUTAS = new Set(['', 'market', 'explore', 'eventos', 'sorteos', 'trabajos', 'inmuebles', 'viajes', 'revista', 'guia', 'transporte', 'pension', 'pandero', 'promotions']);

type Memoria = { rechazos: number; hasta: number };
const leer = (): Memoria => {
  try { const v = JSON.parse(localStorage.getItem(LLAVE) || '{}'); return { rechazos: Number(v.rechazos) || 0, hasta: Number(v.hasta) || 0 }; }
  catch { return { rechazos: 0, hasta: 0 }; }
};
const guardar = (m: Memoria) => { try { localStorage.setItem(LLAVE, JSON.stringify(m)); } catch { /* sin almacenamiento */ } };

export default function AvisosBogaPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');

  const permitida = RUTAS.has(pathname.split('/')[1] || '');

  useEffect(() => {
    if (!permitida) { setVisible(false); return; }
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      if (!hayClave() || !pushDisponible()) return;
      if (esIOS() && !enModoApp()) return;                   // en iPhone solo con la app instalada
      if (Notification.permission !== 'default') return;      // ya activó o ya lo bloqueó
      if (await sigueTienda(CANAL_BOGA)) return;
      const m = leer();
      if (m.rechazos >= MAX_RECHAZOS && m.hasta === 0) return;   // bloqueó el permiso: no insistir
      // Las versiones anteriores guardaban esperas de 7 a 60 días: quien ya la había cerrado quedaba
      // sin verla por semanas. Se ignora cualquier espera mayor a la de ahora (un día).
      const tope = Date.now() + ESPERA_DIAS * 86_400_000;
      if (m.hasta <= tope && Date.now() < m.hasta) return;         // ya salió hoy
      timer = setTimeout(() => {
        if (!vivo) return;
        // Se anota al mostrarla (no al cerrarla): así sale una sola vez al día aunque la ignoren.
        guardar({ rechazos: m.rechazos, hasta: Date.now() + ESPERA_DIAS * 86_400_000 });
        setVisible(true);
      }, ESPERA_INICIAL_MS);
    })();
    return () => { vivo = false; if (timer) clearTimeout(timer); };
  }, [permitida]);

  if (!visible || !permitida) return null;

  const ahoraNo = () => {
    setVisible(false);
  };

  const activar = async () => {
    setError('');
    setTrabajando(true);
    const r = await seguirTienda(CANAL_BOGA);
    setTrabajando(false);
    if (r === 'ok') { setVisible(false); return; }
    if (r === 'denegado') { guardar({ rechazos: MAX_RECHAZOS, hasta: 0 }); setVisible(false); return; }
    setError(`No se pudo activar (${motivoError()}).`);
  };

  return (
    <div
      role="dialog"
      aria-label="Activar avisos de BogaHub"
      className="fixed z-[60] left-3 right-3 bottom-[92px] md:left-auto md:right-6 md:bottom-24 md:w-[400px] bg-white rounded-2xl border border-surface-container-highest shadow-[0_8px_24px_rgba(0,0,0,0.16)] px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
        <p className="flex-1 min-w-0 text-xs text-on-surface leading-snug">
          <b>Activa los avisos</b> y entérate de eventos, sorteos y trabajos
        </p>
        <button
          onClick={activar}
          disabled={trabajando}
          className="shrink-0 rounded-full bg-primary text-white text-xs font-extrabold px-3.5 py-1.5 active:scale-95 transition-transform disabled:opacity-60"
        >
          {trabajando ? '…' : 'Activar'}
        </button>
        <button
          onClick={ahoraNo}
          aria-label="Ahora no"
          title="Ahora no (puedes activarlos cuando quieras en tu perfil → Ajustes)"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-secondary hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600 mt-1.5 leading-normal">{error}</p>}
    </div>
  );
}
