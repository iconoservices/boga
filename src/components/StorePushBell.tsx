'use client';

import { useEffect, useState } from 'react';
import { hayClave, pushDisponible, sigueTienda, seguirTienda, dejarDeSeguir, resincronizar, motivoError, esIOS, enModoApp } from '@/lib/push';

/**
 * Campana de una tienda: recibir (o dejar de recibir) sus avisos de ofertas y novedades.
 * Va junto a compartir e instalar, arriba a la derecha de la portada. Solo aparece si el navegador
 * soporta notificaciones; en iPhone exigen la app instalada, y ahí explica cómo.
 */
export default function StorePushBell({ slug, nombre, color }: { slug: string; nombre: string; color?: string }) {
  const [estado, setEstado] = useState<'oculto' | 'apagado' | 'activo' | 'ios' | 'trabajando'>('oculto');

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!hayClave()) return;
      // Los avisos de una tienda son de SU app: solo en su dirección propia (<tienda>.bogahub.app).
      // Dentro de BogaHub (bogahub.app) avisa únicamente Boga.
      const base = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').host;
      const h = window.location.hostname;
      if (!(h.endsWith('.' + base) && h.split('.')[0] !== 'www')) return;
      if (esIOS() && !enModoApp()) { if (vivo) setEstado('ios'); return; }
      if (!pushDisponible()) return;
      const sigue = await sigueTienda(slug);
      if (sigue) resincronizar(slug);
      if (vivo) setEstado(sigue ? 'activo' : 'apagado');
    })();
    return () => { vivo = false; };
  }, [slug]);

  if (estado === 'oculto') return null;

  const alTocar = async () => {
    if (estado === 'trabajando') return;
    if (estado === 'ios') {
      alert(`Para recibir los avisos de ${nombre} en iPhone, primero instala la app en tu pantalla de inicio (botón de descarga) y actívalos desde ahí.`);
      return;
    }
    setEstado('trabajando');
    if (estado === 'activo') {
      await dejarDeSeguir(slug);
      setEstado('apagado');
      return;
    }
    const r = await seguirTienda(slug);
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
      className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 shadow-lg active:scale-90 hover:bg-white/60 transition-all"
      style={{ color, opacity: estado === 'trabajando' ? 0.5 : 1 }}
      aria-label={activo ? `Dejar de recibir avisos de ${nombre}` : `Recibir avisos de ${nombre}`}
      title={activo ? 'Avisos activados (toca para desactivar)' : 'Recibir avisos de ofertas y novedades'}
    >
      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: `'FILL' ${activo ? 1 : 0}` }}>
        notifications
      </span>
    </button>
  );
}
