'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export type Favorito = {
  store: string;
  product_id: string;
  name: string | null;
  price: number | null;
  image: string | null;
};

type Datos = { store: string; id: string | number; name?: string; price?: number; image?: string };

const llave = (store: string, id: string | number) => `${store}::${id}`;

/**
 * Favoritos ligados a la cuenta (tabla `favoritos`). Sin sesión no se puede guardar:
 * `alternar` devuelve false y quien lo llama abre el login / registro.
 */
export function useFavoritos() {
  const { user } = useAuth();
  const [lista, setLista] = useState<Favorito[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!user) { setLista([]); return; }
    let vivo = true;
    setCargando(true);
    supabase
      .from('favoritos')
      .select('store,product_id,name,price,image')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!vivo) return;
        setLista((data as Favorito[]) || []);
        setCargando(false);
      });
    return () => { vivo = false; };
  }, [user]);

  const esFavorito = useCallback(
    (store: string, id: string | number) => lista.some((f) => llave(f.store, f.product_id) === llave(store, id)),
    [lista],
  );

  /** true = se guardó/quitó; false = no hay sesión (hay que pedir que entre) */
  const alternar = useCallback(
    (d: Datos): boolean => {
      if (!user) return false;
      const pid = String(d.id);
      const ya = lista.some((f) => f.store === d.store && f.product_id === pid);
      const nuevo: Favorito = { store: d.store, product_id: pid, name: d.name ?? null, price: d.price ?? null, image: d.image ?? null };
      // Optimista: se pinta ya; si la base falla, se devuelve
      setLista((prev) => (ya ? prev.filter((f) => !(f.store === d.store && f.product_id === pid)) : [nuevo, ...prev]));
      const peticion = ya
        ? supabase.from('favoritos').delete().eq('user_id', user.id).eq('store', d.store).eq('product_id', pid)
        : supabase.from('favoritos').upsert({ user_id: user.id, ...nuevo });
      peticion.then(({ error }) => {
        if (error) setLista((prev) => (ya ? [nuevo, ...prev] : prev.filter((f) => !(f.store === d.store && f.product_id === pid))));
      });
      return true;
    },
    [user, lista],
  );

  return { user, lista, cargando, esFavorito, alternar };
}
