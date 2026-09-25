import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Contactos de Boga que el superadmin edita (tabla site_settings, ver ContactoBoga en Paquetes).
// Público y cacheado unos minutos: lo lee el botón flotante de WhatsApp de /negocios, y sirve para
// cualquier otro lugar que necesite el número de un asesor. Si no hay número, devuelve null.

export const revalidate = 300;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let whatsapp: string | null = null;
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await db.from('site_settings').select('valor').eq('clave', 'whatsapp_asesor').maybeSingle();
    const n = String(data?.valor ?? '').replace(/\D/g, '');
    if (n.length >= 9) whatsapp = n;
  }
  return NextResponse.json({ whatsapp }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
