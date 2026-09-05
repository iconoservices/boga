'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

/**
 * ¿El usuario logueado es superadmin? Lo contesta public.is_superadmin() en la
 * base — la misma función que usan las políticas RLS — en vez de comparar
 * contra una lista de correos acá.
 *
 * Es a propósito que no haya una lista en el código: todo lo que vive en un
 * componente "use client" termina en el JavaScript que se descarga el
 * navegador, así que el correo del dueño quedaba a la vista de cualquiera que
 * abriera las herramientas de desarrollador. Acá el navegador solo recibe un
 * sí/no sobre sí mismo.
 *
 * `cargando` arranca en true: hay que esperar la respuesta antes de decidir si
 * se muestra el panel o se redirige, si no la pantalla parpadearía.
 */
export function useEsSuperadmin() {
  const { user, loading: cargandoSesion } = useAuth();
  const [esSuperadmin, setEsSuperadmin] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (cargandoSesion) return;
    if (!user) {
      setEsSuperadmin(false);
      setCargando(false);
      return;
    }
    let vigente = true;
    supabase.rpc('is_superadmin').then(({ data, error }) => {
      if (!vigente) return;
      if (error) console.error('No se pudo verificar el rol:', error.message);
      setEsSuperadmin(data === true);
      setCargando(false);
    });
    return () => { vigente = false; };
  }, [user, cargandoSesion]);

  return { esSuperadmin, cargando: cargandoSesion || cargando };
}
