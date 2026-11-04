import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Redirección inteligente /ir/[slug]
// Útil para códigos QR en mesas, volantes, redes sociales o publicidad impresa:
// https://bogahub.app/ir/polleria-pardos
// Cuenta el clic en la base de datos y en 50ms abre el WhatsApp de la tienda.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const slugLimpio = (slug || '').trim().toLowerCase();
  const userAgent = req.headers.get('user-agent') || '';

  if (!slugLimpio) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // 1. Buscar el WhatsApp de la tienda
  const { data: store } = await supabase
    .from('stores')
    .select('name,whatsapp,slug')
    .eq('slug', slugLimpio)
    .maybeSingle();

  // 2. Registrar el clic en la base de datos
  await supabase.from('whatsapp_clicks').insert({
    tienda_slug: slugLimpio,
    tipo: 'link_directo',
    origen: `/ir/${slugLimpio}`,
    metadata: {
      tienda_nombre: store?.name || slugLimpio,
      canal: 'enlace_directo_o_qr',
    },
    user_agent: userAgent.slice(0, 200),
  });

  const num = String(store?.whatsapp || '').replace(/\D/g, '');

  if (num.length >= 9) {
    const telefono = num.length === 9 ? `51${num}` : num;
    const mensaje = encodeURIComponent(
      `Hola ${store?.name || ''}, vi su negocio en BogaHub y me gustaría hacer una consulta.`,
    );
    return NextResponse.redirect(`https://wa.me/${telefono}?text=${mensaje}`, 302);
  }

  // Si no tiene WhatsApp configurado todavía, derivar al catálogo de la tienda
  return NextResponse.redirect(new URL(`/${slugLimpio}`, req.url), 302);
}

