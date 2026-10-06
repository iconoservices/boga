'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

// Aviso entre copias del hook: el corazón de una tarjeta, el modal de "Favoritos" y las demás pantallas de la página tienen cada una
// su lista; cuando una cambia, avisa a las otras para que no queden desactualizadas hasta recargar.
const EVENTO_CAMBIO = 'boga:favorito';
type Cambio = { f: Favorito; quitar: boolean };
const mismo = (a: Favorito, b: Favorito) => a.store === b.store && a.product_id === b.product_id;
const avisar = (c: Cambio) => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<Cambio>(EVENTO_CAMBIO, { detail: c })); };

// La lista se recuerda 5 minutos en la sesión del navegador: cambiar de página o de tienda no vuelve a pedirla a Supabase.
const VIGENCIA_CACHE_MS = 5 * 60 * 1000;

/**
 * Favoritos ligados a la cuenta (tabla `favoritos`). Sin sesión no se puede guardar:
 * `alternar` devuelve false y quien lo llama abre el login / registro.
 * `soloTienda`: en una tienda solo se piden (y se recuerdan) los favoritos de ESA tienda, no todos los de la cuenta.
 * Sin sesión no hace ninguna consulta.
 */
export function useFavoritos(soloTienda?: string) {
  const { user } = useAuth();
  const [lista, setLista] = useState<Favorito[]>([]);
  const [cargando, setCargando] = useState(false);
  // Solo se guarda en caché lo que ya llegó de la base (o lo que el cliente tocó), nunca la lista vacía de arranque.
  const lista_lista = useRef(false);
  const clave = user ? `boga_favs_${user.id}_${soloTienda ?? '*'}` : null;

  useEffect(() => {
    lista_lista.current = false;
    if (!user || !clave) { setLista([]); return; }
    try {
      const guardado = sessionStorage.getItem(clave);
      if (guardado) {
        const { t, d } = JSON.parse(guardado) as { t: number; d: Favorito[] };
        if (Date.now() - t < VIGENCIA_CACHE_MS && Array.isArray(d)) { setLista(d); lista_lista.current = true; return; }
      }
    } catch { /* sin almacenamiento: se pide a la base */ }
    let vivo = true;
    setCargando(true);
    let consulta = supabase.from('favoritos').select('store,product_id,name,price,image');
    if (soloTienda) consulta = consulta.eq('store', soloTienda);
    consulta
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!vivo) return;
        setLista((data as Favorito[]) || []);
        lista_lista.current = true;
        setCargando(false);
      });
    return () => { vivo = false; };
  }, [user, clave, soloTienda]);

  // Cambios hechos desde otra copia del hook (idempotente: no repite lo que esta copia ya tiene).
  useEffect(() => {
    const alCambiar = (e: Event) => {
      const { f, quitar } = (e as CustomEvent<Cambio>).detail;
      if (soloTienda && f.store !== soloTienda) return;
      setLista((prev) => (quitar ? prev.filter((x) => !mismo(x, f)) : prev.some((x) => mismo(x, f)) ? prev : [f, ...prev]));
    };
    window.addEventListener(EVENTO_CAMBIO, alCambiar);
    return () => window.removeEventListener(EVENTO_CAMBIO, alCambiar);
  }, [soloTienda]);

  // Cada cambio (cargó o el cliente marcó/quitó uno) actualiza el recuerdo de la sesión.
  useEffect(() => {
    if (!clave || !lista_lista.current) return;
    try { sessionStorage.setItem(clave, JSON.stringify({ t: Date.now(), d: lista })); } catch { /* ignorar */ }
  }, [lista, clave]);

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
      // Optimista: se pinta ya (en esta copia y en las demás de la página); si la base falla, se devuelve
      avisar({ f: nuevo, quitar: ya });
      const peticion = ya
        ? supabase.from('favoritos').delete().eq('user_id', user.id).eq('store', d.store).eq('product_id', pid)
        : supabase.from('favoritos').upsert({ user_id: user.id, ...nuevo });
      peticion.then(({ error }) => {
        if (error) avisar({ f: nuevo, quitar: !ya });
      });
      return true;
    },
    [user, lista],
  );

  return { user, lista, cargando, esFavorito, alternar };
}
