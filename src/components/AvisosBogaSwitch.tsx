'use client';

import { useEffect, useState } from 'react';
import { hayClave, pushDisponible, sigueTienda, seguirTienda, dejarDeSeguir, motivoError, esIOS, enModoApp } from '@/lib/push';
import { CANAL_BOGA } from '@/lib/pushLimites';

/**
 * Interruptor del perfil: recibir (o no) los avisos de BogaHub en este dispositivo.
 * Es la misma suscripción que la campana de la cabecera. En iPhone exigen la app instalada.
 */
export default function AvisosBogaSwitch() {
  const [estado, setEstado] = useState<'cargando' | 'sin-soporte' | 'apagado' | 'activo' | 'ios' | 'trabajando'>('cargando');
  const [nota, setNota] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!hayClave()) { if (vivo) setEstado('sin-soporte'); return; }
      if (esIOS() && !enModoApp()) { if (vivo) setEstado('ios'); return; }
      if (!pushDisponible()) { if (vivo) setEstado('sin-soporte'); return; }
      const sigue = await sigueTienda(CANAL_BOGA);
      if (vivo) setEstado(sigue ? 'activo' : 'apagado');
    })();
    return () => { vivo = false; };
  }, []);

  const alTocar = async () => {
    setNota('');
    if (estado === 'cargando' || estado === 'trabajando' || estado === 'sin-soporte') return;
    if (estado === 'ios') {
      setNota('En iPhone, primero instala BogaHub en tu pantalla de inicio (Compartir → Agregar a Inicio) y actívalos desde la app.');
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
      setNota(r === 'denegado'
        ? 'Los avisos están bloqueados en este navegador. Permítelos en los ajustes del sitio y vuelve a intentar.'
        : `No se pudieron activar los avisos. Motivo: ${motivoError()}`);
    }
  };

  const activo = estado === 'activo';
  const deshabilitado = estado === 'cargando' || estado === 'sin-soporte';
  return (
    <div className="py-3">
      <div className="flex justify-between items-center">
        <div className="pr-4">
          <p className="font-bold text-xs text-on-surface">Avisos de BogaHub</p>
          <p className="text-[10px] text-secondary/60 mt-0.5 leading-normal">
            Eventos, trabajos, sorteos y novedades de Pucallpa
          </p>
        </div>
        <button
          onClick={alTocar}
          disabled={deshabilitado}
          role="switch"
          aria-checked={activo}
          aria-label="Avisos de BogaHub"
          className={`w-11 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-40 ${activo ? 'bg-primary' : 'bg-surface-container-high'}`}
          style={{ opacity: estado === 'trabajando' ? 0.5 : undefined }}
        >
          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${activo ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      {estado === 'sin-soporte' && (
        <p className="text-[10px] text-secondary/70 mt-2">Este navegador no admite avisos.</p>
      )}
      {nota && <p className="text-[10px] text-amber-700 mt-2 leading-normal">{nota}</p>}
    </div>
  );
}
