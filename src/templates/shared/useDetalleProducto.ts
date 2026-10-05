'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Sincroniza el modal de "detalle de producto" con la URL /<tienda>/producto/<id>:
 * así el link es compartible (y el que indexa Google) y el botón atrás cierra el
 * modal en vez de sacar de la tienda. Antes cada plantilla abría el detalle con un
 * simple useState sin tocar la URL, y /<tienda>/producto/<id> vivía aparte como una
 * página genérica que nadie veía navegando la tienda real: dos vistas del mismo
 * producto, una sin ruta y otra sin el diseño de la tienda.
 */
export function useDetalleProducto<P extends { id: string | number }>(
  slug: string,
  productos: P[],
  productoInicialId?: string,
) {
  const [seleccionado, setSeleccionado] = useState<P | null>(null);
  const [inicialAplicado, setInicialAplicado] = useState(false);
  // Dirección desde la que se abrió el detalle (/<tienda>, /<tienda>/servicios…): al cerrar se vuelve ahí.
  const rutaPrevia = useRef<string | null>(null);

  // Entrada directa a /<tienda>/producto/<id> (el link de Google): abrir ese
  // producto ni bien está en la lista cargada, sin tocar el historial (ya estamos
  // ahí). Ajuste de estado durante el render, no en un efecto (patrón oficial de
  // React para inicializar desde un dato que llega async, corre una sola vez).
  if (!inicialAplicado && productoInicialId && productos.length > 0) {
    setInicialAplicado(true);
    const match = productos.find((p) => String(p.id) === String(productoInicialId));
    if (match) setSeleccionado(match);
  }

  // Atrás del navegador cierra el modal en vez de salir de la tienda.
  useEffect(() => {
    const onPop = () => setSeleccionado(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const abrir = (producto: P) => {
    setSeleccionado(producto);
    if (!window.location.pathname.includes('/producto/')) rutaPrevia.current = window.location.pathname;
    window.history.pushState(null, '', `/${slug}/producto/${producto.id}`);
  };

  const cerrar = () => {
    setSeleccionado(null);
    const destino = rutaPrevia.current && !rutaPrevia.current.includes('/producto/') ? rutaPrevia.current : `/${slug}`;
    if (window.location.pathname !== destino) {
      window.history.pushState(null, '', destino);
    }
  };

  return { seleccionado, abrir, cerrar };
}
