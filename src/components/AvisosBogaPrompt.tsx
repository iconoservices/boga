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
 * Reglas para no cansar: aparece a los 25 s de uso; si dice «Ahora no» vuelve a los 7, 14 y 30 días,
 * y después de la tercera vez no aparece más (la campana y el perfil siguen disponibles).
 * No sale en tiendas, admin ni pantallas de sesión, ni si ya activó o bloqueó los avisos.
 */

const LLAVE = 'boga_push_aviso';
const ESPERAS_DIAS = [7, 14, 30];
const MAX_RECHAZOS = 3;
const ESPERA_INICIAL_MS = 25_000;

// Solo pantallas de BogaHub donde tiene sentido (nunca dentro de una tienda ni del panel)
const RUTAS = new Set(['', 'market', 'explore', 'eventos', 'sorteos', 'trabajos', 'inmuebles', 'viajes', 'revista', 'guia', 'taxi-seguro', 'pension', 'pandero', 'promotions']);

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
      if (m.rechazos >= MAX_RECHAZOS || Date.now() < m.hasta) return;
      timer = setTimeout(() => { if (vivo) setVisible(true); }, ESPERA_INICIAL_MS);
    })();
    return () => { vivo = false; if (timer) clearTimeout(timer); };
  }, [permitida]);

  if (!visible || !permitida) return null;

  const ahoraNo = () => {
    const m = leer();
    const espera = ESPERAS_DIAS[Math.min(m.rechazos, ESPERAS_DIAS.length - 1)];
    guardar({ rechazos: m.rechazos + 1, hasta: Date.now() + espera * 86_400_000 });
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
      className="fixed z-[60] left-3 right-3 bottom-[92px] md:left-auto md:right-6 md:bottom-24 md:w-[340px] bg-white rounded-2xl border border-surface-container-highest shadow-[0_12px_32px_rgba(0,0,0,0.18)] p-4"
    >
      <div className="flex gap-3">
        <span className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
        </span>
        <div className="min-w-0">
          <p className="font-bold text-sm text-on-surface">¿Te avisamos?</p>
          <p className="text-xs text-secondary leading-normal mt-0.5">
            Recibe avisos de eventos, sorteos y trabajos en Pucallpa. Solo lo importante.
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={ahoraNo}
          className="flex-1 rounded-xl border border-surface-container-highest py-2 text-xs font-bold text-secondary active:scale-95 transition-transform"
        >
          Ahora no
        </button>
        <button
          onClick={activar}
          disabled={trabajando}
          className="flex-1 rounded-xl bg-primary text-white py-2 text-xs font-extrabold active:scale-95 transition-transform disabled:opacity-60"
        >
          {trabajando ? 'Activando…' : 'Activar'}
        </button>
      </div>
    </div>
  );
}
