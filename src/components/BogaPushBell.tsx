'use client';

import { useEffect, useState } from 'react';
import { hayClave, pushDisponible, sigueTienda, seguirTienda, resincronizar, motivoError, esIOS, enModoApp } from '@/lib/push';
import { CANAL_BOGA } from '@/lib/pushLimites';

/**
 * Campana de la cabecera de BogaHub: recibir (o no) los avisos de la PLATAFORMA (eventos, trabajos,
 * sorteos, novedades). Los avisos de cada tienda son de su propia app; acá solo avisa BogaHub.
 * Si el navegador no soporta notificaciones (o falta la clave), queda como ícono sin acción.
 * En iPhone exigen la app instalada, y ahí explica cómo.
 */
export default function BogaPushBell({ className, iconClass }: { className: string; iconClass: string }) {
  const [estado, setEstado] = useState<'sin-soporte' | 'apagado' | 'activo' | 'ios' | 'trabajando'>('sin-soporte');
  // Aviso breve tras activar o desactivar (sin esto no queda claro qué pasó al tocar la campana)
  const [aviso, setAviso] = useState('');
  const [conEnlace, setConEnlace] = useState(false);
  const avisar = (t: string, enlace = false) => {
    setAviso(t); setConEnlace(enlace);
    setTimeout(() => { setAviso(''); setConEnlace(false); }, enlace ? 6000 : 2600);
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!hayClave()) return;
      if (esIOS() && !enModoApp()) { if (vivo) setEstado('ios'); return; }
      if (!pushDisponible()) return;
      const sigue = await sigueTienda(CANAL_BOGA);
      if (sigue) resincronizar(CANAL_BOGA);
      if (vivo) setEstado(sigue ? 'activo' : 'apagado');
    })();
    return () => { vivo = false; };
  }, []);

  const alTocar = async () => {
    if (estado === 'sin-soporte' || estado === 'trabajando') return;
    if (estado === 'ios') {
      alert('Para recibir los avisos de BogaHub en iPhone, primero instala la app en tu pantalla de inicio (Compartir → Agregar a Inicio) y actívalos desde ahí.');
      return;
    }
    if (estado === 'activo') {
      // Activar es a la vista; desactivar es solo en Ajustes: tocar la campana activada no la apaga
      avisar('✓ Avisos de BogaHub activados', true);
      return;
    }
    setEstado('trabajando');
    // Activar tarda unos segundos (el navegador prepara el service worker): se avisa para que no parezca que no pasó nada
    setAviso('Activando avisos…');
    const r = await seguirTienda(CANAL_BOGA);
    if (r === 'ok') { setEstado('activo'); avisar('✓ Avisos de BogaHub activados'); }
    else {
      setAviso('');
      setEstado('apagado');
      if (r === 'denegado') alert('Los avisos están bloqueados en este navegador. Puedes permitirlos en los ajustes del sitio.');
      else alert('No se pudieron activar los avisos. Motivo: ' + motivoError());
    }
  };

  const activo = estado === 'activo';
  return (
    <>
    <button
      onClick={alTocar}
      className={className}
      style={{ opacity: estado === 'trabajando' ? 0.5 : 1 }}
      aria-label={activo ? 'Desactivar avisos de BogaHub' : 'Activar avisos de BogaHub'}
      title={
        estado === 'sin-soporte' ? 'Notificaciones'
        : activo ? 'Avisos de BogaHub activados (se desactivan en Perfil → Ajustes)'
        : 'Recibir avisos de BogaHub: eventos, trabajos, sorteos y novedades'
      }
    >
      <span
        className={`material-symbols-outlined ${iconClass} ${activo ? 'text-primary' : ''}`}
        style={{ fontVariationSettings: `'FILL' ${activo ? 1 : 0}` }}
      >
        notifications
      </span>
    </button>
    {aviso && (
      <div role="status" className="fixed z-[70] top-16 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs font-bold rounded-full px-4 py-2 shadow-lg">
        {aviso}
        {conEnlace && (
          <a href="/profile?seccion=ajustes" className="ml-3 underline text-amber-300">Desactivar en Ajustes</a>
        )}
      </div>
    )}
    </>
  );
}
