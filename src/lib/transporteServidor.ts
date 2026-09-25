// Ayudas comunes de las rutas /api/transporte/* (solo servidor).

import type { SupabaseClient } from '@supabase/supabase-js';
import { clienteServicio } from '@/lib/pushServidor';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN = /^[0-9a-f]{64}$/;

export const servicio = (): SupabaseClient | null => clienteServicio();

export const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Coordenadas válidas (o null). Acepta números o texto numérico. */
export function coordenada(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = Number(lat), b = Number(lng);
  if (lat == null || lng == null || lat === '' || lng === '' || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lng: b };
}

// Freno simple por IP, en memoria (defensa básica contra el spam; no es infalible).
const visitas = new Map<string, { n: number; desde: number }>();
export function excedeLimite(clave: string, max: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const v = visitas.get(clave);
  if (!v || ahora - v.desde > ventanaMs) { visitas.set(clave, { n: 1, desde: ahora }); return false; }
  v.n += 1;
  return v.n > max;
}
export const ipDe = (request: Request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocida';

export interface ChoferAutenticado {
  driverId: string;
  chofer: { id: string; nombre: string; tipo: string; placa: string | null; modelo: string | null; tel: string | null; img: string | null; veh_img: string | null; comite: string | null; ciudad: string };
  acceso: { pausado: boolean; base_lat: number | null; base_lng: number | null; lat: number | null; lng: number | null; ubicado_at: string | null; zona: string | null; zona_hasta: string | null };
}

/** El chofer dueño de este enlace secreto, o null. */
export async function choferPorToken(db: SupabaseClient, token: unknown): Promise<ChoferAutenticado | null> {
  if (typeof token !== 'string' || !TOKEN.test(token)) return null;
  const { data: a } = await db
    .from('driver_acceso')
    .select('driver_id,pausado,base_lat,base_lng,lat,lng,ubicado_at,zona,zona_hasta')
    .eq('token', token)
    .maybeSingle();
  if (!a) return null;
  const { data: c } = await db
    .from('drivers')
    .select('id,nombre,tipo,placa,modelo,tel,img,veh_img,comite,ciudad,status')
    .eq('id', a.driver_id)
    .maybeSingle();
  if (!c || c.status !== 'activo') return null;
  return { driverId: a.driver_id as string, chofer: c as ChoferAutenticado['chofer'], acceso: a as ChoferAutenticado['acceso'] };
}

/** Lo que el pasajero puede ver del chofer que aceptó su pedido. */
export const choferPublico = (c: ChoferAutenticado['chofer']) => ({
  nombre: c.nombre, tipo: c.tipo, placa: c.placa, modelo: c.modelo, tel: c.tel, img: c.img, vehImg: c.veh_img, comite: c.comite,
});
