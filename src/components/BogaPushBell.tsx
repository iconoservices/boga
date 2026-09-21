'use client';

import { useEffect, useState } from 'react';
import { hayClave, pushDisponible, sigueTienda, seguirTienda, dejarDeSeguir, resincronizar, motivoError, esIOS, enModoApp } from '@/lib/push';
import { CANAL_BOGA } from '@/lib/pushLimites';

/**
 * Campana de la cabecera de BogaHub: recibir (o no) los avisos de la PLATAFORMA (eventos, trabajos,
 * sorteos, novedades). Los avisos de cada tienda son de su propia app; acá solo avisa BogaHub.
 * Si el navegador no soporta notificaciones (o falta la clave), queda como ícono sin acción.
 * En iPhone exigen la app instalada, y ahí explica cómo.
 */
export default function BogaPushBell({ className, iconClass }: { className: string; iconClass: string }) {
  const [estado, setEstado] = useState<'sin-soporte' | 'apagado' | 'activo' | 'ios' | 'trabajando'>('sin-soporte');

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
    setEstado('trabajando');
    if (estado === 'activo') {
      await dejarDeSeguir(CANAL_BOGA);
      setEstado('apagado');
      return;
    }
    const r = await seguirTienda(CANAL_BOGA);
    if (r === 'ok') setEstado('activo');
    else {
      setEstado('apagado');
      if (r === 'denegado') alert('Los avisos están bloqueados en este navegador. Puedes permitirlos en los ajustes del sitio.');
      else alert('No se pudieron activar los avisos. Motivo: ' + motivoError());
    }
  };

  const activo = estado === 'activo';
  return (
    <button
      onClick={alTocar}
      className={className}
      style={{ opacity: estado === 'trabajando' ? 0.5 : 1 }}
      aria-label={activo ? 'Desactivar avisos de BogaHub' : 'Activar avisos de BogaHub'}
      title={
        estado === 'sin-soporte' ? 'Notificaciones'
        : activo ? 'Avisos de BogaHub activados (toca para desactivar)'
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
  );
}
