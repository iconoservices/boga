'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useFavoritos } from '@/lib/useFavoritos';
import { useCustomerSession } from '@/context/CustomerSessionContext';

type Datos = { id: string | number; name?: string; price?: number; image?: string };

type FavoritosTienda = {
  esFavorito: (id: string | number) => boolean;
  /** Guarda o quita el favorito; sin sesión abre el modal de cuenta de la tienda. */
  alternar: (d: Datos) => void;
};

const Contexto = createContext<FavoritosTienda | null>(null);

/**
 * Favoritos de la tienda que se está viendo, para el corazón de las tarjetas y de la ficha de las plantillas del motor
 * compartido (templates/shared/CatalogoUI). Se consulta UNA sola vez por página (no una por tarjeta) y solo si el cliente
 * tiene sesión. Es la misma función (lib/useFavoritos.ts) que ya usan Lookbook, Atelier y Terrenos.
 * En la vista previa de una plantilla (`demo`) el corazón se marca pero no guarda nada.
 */
export function FavoritosTiendaProvider({ slug, demo = false, children }: { slug: string; demo?: boolean; children: React.ReactNode }) {
  const { esFavorito, alternar } = useFavoritos();
  const { setModalAbierto } = useCustomerSession();
  const [deMuestra, setDeMuestra] = useState<Set<string>>(new Set());

  const esFav = useCallback(
    (id: string | number) => (demo ? deMuestra.has(String(id)) : esFavorito(slug, id)),
    [demo, deMuestra, esFavorito, slug],
  );

  const alt = useCallback(
    (d: Datos) => {
      if (demo) {
        setDeMuestra((prev) => {
          const n = new Set(prev);
          const k = String(d.id);
          if (n.has(k)) n.delete(k); else n.add(k);
          return n;
        });
        return;
      }
      const ok = alternar({ store: slug, id: d.id, name: d.name, price: d.price, image: d.image });
      if (!ok) setModalAbierto(true);
    },
    [demo, alternar, slug, setModalAbierto],
  );

  const valor = useMemo(() => ({ esFavorito: esFav, alternar: alt }), [esFav, alt]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** null fuera de una tienda: el corazón simplemente no se dibuja. */
export const useFavoritosTienda = () => useContext(Contexto);
