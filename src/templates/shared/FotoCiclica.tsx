'use client';

import React from 'react';
import { useCicloFotos } from './useCicloFotos';

/**
 * Foto de una tarjeta de producto con cambio automático entre varias fotos (estándar de plantillas, ver docs/plantillas-estandar.md).
 * Reemplaza al <img> de la tarjeta: `className` es el mismo que ya tenía la imagen (tamaño, object-cover, zoom al pasar el mouse…).
 * Con una sola foto es un <img> normal. Con varias, la primera da el tamaño y las demás se apilan encima.
 */
export default function FotoCiclica({
  fotos, alt, className = '', loading = 'lazy',
}: {
  fotos: (string | undefined | null)[];
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const lista = fotos.filter((f): f is string => typeof f === 'string' && f.length > 0);
  const { ref, activa, handlers } = useCicloFotos(lista.length);

  if (lista.length < 2) {
    return <img src={lista[0] ?? ''} alt={alt} className={className} loading={loading} />;
  }
  return (
    <div ref={ref} {...handlers} className="relative w-full h-full">
      {lista.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={i === 0 ? alt : ''}
          loading={loading}
          className={`${className} ${i > 0 ? '!absolute inset-0 !w-full !h-full' : ''} transition-opacity duration-500`}
          style={{ opacity: activa === i ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
