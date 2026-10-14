'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cambio automático de fotos de una tarjeta de producto (ESTÁNDAR de todas las plantillas con tarjeta).
 *
 *  · Computadora: al pasar el mouse empieza a rotar; al salir vuelve a la primera foto.
 *  · Celular (sin mouse): rota solo mientras la tarjeta está a la vista en la pantalla.
 *  · Sin movimiento si el aparato pide "reducir animaciones", y nada si el producto tiene una sola foto.
 *
 * Uso: `const { ref, activa, handlers } = useCicloFotos(fotos.length);`
 *   - `ref` y `{...handlers}` van en el contenedor de la foto.
 *   - `activa` es el índice de la foto que se ve (siempre un número: 0 si no está rotando).
 *   - `rotando` dice si está en marcha (para mostrar la barrita de progreso solo entonces, si se quiere).
 */
export function useCicloFotos(cantidad: number, cadaMs = 2200) {
  const ref = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const [rotando, setRotando] = useState(false);
  const conMouse = useRef(false);
  const enPantalla = useRef(false);

  // Celular: rota mientras la tarjeta se ve (al menos la mitad).
  useEffect(() => {
    const el = ref.current;
    if (!el || cantidad < 2 || typeof IntersectionObserver === 'undefined') return;
    const tactil = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (!tactil || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        enPantalla.current = e.isIntersecting;
        setRotando(e.isIntersecting);
        if (!e.isIntersecting) setIndice(0);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cantidad]);

  useEffect(() => {
    if (!rotando || cantidad < 2) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setIndice((i) => (i + 1) % cantidad);
    }, cadaMs);
    return () => clearInterval(id);
  }, [rotando, cantidad, cadaMs]);

  const handlers = {
    onMouseEnter: () => {
      if (cantidad < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      conMouse.current = true;
      setIndice(1);
      setRotando(true);
    },
    onMouseLeave: () => {
      if (!conMouse.current) return;
      conMouse.current = false;
      // Con mouse se detiene al salir; en celular la rotación la manda IntersectionObserver.
      if (!enPantalla.current) setRotando(false);
      setIndice(0);
    },
  };

  return { ref, activa: cantidad > 1 ? indice : 0, rotando, handlers };
}
