import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Endpoint para registrar clics a WhatsApp en segundo plano.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const tipo = typeof body.tipo === 'string' ? body.tipo.trim() : 'contacto';
    const origen = typeof body.origen === 'string' ? body.origen.trim() : '';
    const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {};
    const userAgent = req.headers.get('user-agent') || '';

    if (!slug) {
      return NextResponse.json({ ok: false, error: 'slug requerido' }, { status: 400 });
    }

    // Insertar en Supabase (si la tabla aún no se ha creado, no bloquea al cliente)
    const { error } = await supabase.from('whatsapp_clicks').insert({
      tienda_slug: slug,
      tipo,
      origen,
      metadata,
      user_agent: userAgent.slice(0, 200),
    });

    if (error) {
      // Log interno discreto para depuración
      console.warn('whatsapp_clicks insert notice:', error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ ok: false, error: msg }, { status: 200 }); // Siempre 200 para que beacon no tire alertas
  }
}

