import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Utilidades del servidor para las notificaciones push (rutas /api/push/*).

/** Cliente con la clave de servicio: las tablas push_* no tienen acceso público. */
export function clienteServicio(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

// CORS: además de bogahub.app, las tiendas con subdominio propio (<tienda>.bogahub.app) y otros
// proyectos de la casa que usen este mismo sistema (p. ej. Delva) le piden cosas a esta API.
const ORIGEN_PERMITIDO = /^https:\/\/([a-z0-9-]+\.)?bogahub\.app$/;

export function cabecerasCors(request: Request): Record<string, string> {
  const origen = request.headers.get('origin') || '';
  const permitido = ORIGEN_PERMITIDO.test(origen) || /^http:\/\/localhost:\d+$/.test(origen);
  return permitido
    ? {
        'Access-Control-Allow-Origin': origen,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        Vary: 'Origin',
      }
    : {};
}

export type Quien = { userId: string; esSuperadmin: boolean };

/** Comprueba en el servidor el token de sesión (Supabase Auth) y si es superadmin. */
export async function quienEs(request: Request): Promise<Quien | null> {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const comoUsuario = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await comoUsuario.auth.getUser(token);
  if (error || !user) return null;
  const { data: esSuperadmin } = await comoUsuario.rpc('is_superadmin');
  return { userId: user.id, esSuperadmin: esSuperadmin === true };
}

/** ¿Puede esta persona enviar/ver campañas de esa tienda? Superadmin: todas. Dueño: la suya. */
export async function puedeGestionar(supabase: SupabaseClient, quien: Quien, storeSlug: string, canalBoga: string): Promise<boolean> {
  if (quien.esSuperadmin) return true;
  if (storeSlug === canalBoga) return false; // el canal de la plataforma es solo del superadmin
  const { data } = await supabase.from('stores').select('user_id,push_activo').eq('slug', storeSlug).maybeSingle();
  // El dueño solo puede usar los avisos si el superadmin se los activó a su tienda
  return !!data && data.user_id === quien.userId && data.push_activo === true;
}
