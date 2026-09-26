import { NextResponse } from 'next/server';
import { clienteServicio } from '@/lib/pushServidor';
import { tiendaCobraOnline } from '@/lib/izipay';

// ¿Esta tienda cobra con tarjeta / Yape online? Público (lo usa el carrito para mostrar el botón «Pagar online»).
// Solo devuelve un sí/no: nunca claves. Se guarda un minuto en caché.

const SLUG = /^[a-z0-9-]{1,80}$/;

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('store') || '';
  const db = clienteServicio();
  if (!SLUG.test(slug) || !db) return NextResponse.json({ activo: false }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  const activo = await tiendaCobraOnline(db, slug);
  return NextResponse.json({ activo }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });
}
