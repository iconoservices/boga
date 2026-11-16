import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, serviceKey);
}

// GET: Obtener configuración completa de la tienda de red / revendedor
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug')?.toLowerCase().trim();

  if (!slug) {
    return NextResponse.json({ error: 'Falta el parámetro slug' }, { status: 400 });
  }

  const admin = getAdminClient();

  // 1. Buscar en stores
  const { data: store, error: errStore } = await admin
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  // 2. Buscar en store_requests
  const { data: requestRow } = await admin
    .from('store_requests')
    .select('*')
    .ilike('business_name', slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const modulos = (store?.modulos && typeof store.modulos === 'object') ? store.modulos : {};
  const nombreContacto = modulos.nombreContacto || requestRow?.contact_name || '';
  const ciudad = store?.zona || requestRow?.city || 'pucallpa';
  const margenPorcentaje = typeof modulos.margenPorcentaje === 'number' ? modulos.margenPorcentaje : 15;
  const tiendaProveedora = store?.tienda_proveedora || modulos.tiendaSeleccionada || 'delva';
  const productosSeleccionados = Array.isArray(modulos.productosSeleccionados) ? modulos.productosSeleccionados : [];

  return NextResponse.json({
    ok: true,
    tienda: {
      slug,
      name: store?.name || requestRow?.business_name || slug,
      nombreContacto,
      whatsapp: store?.whatsapp || requestRow?.whatsapp || '',
      ciudad,
      tiendaProveedora,
      margenPorcentaje,
      productosSeleccionados,
      status: store?.status || (requestRow?.status === 'approved' ? 'active' : 'inactive'),
      tagline: store?.tagline || (nombreContacto ? `Catálogo de ${nombreContacto} · Envíos en ${ciudad}` : `Catálogo Oficial · Envíos en ${ciudad}`),
      template: store?.template || 'network',
      esRevendedor: true,
    },
  });
}

// POST: Guardar cambios de configuración (márgenes, productos elegidos, proveedor)
export async function POST(request: Request) {
  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const {
    slug,
    nombreTienda,
    nombre,
    whatsapp,
    ciudad,
    margenPorcentaje,
    tiendaSeleccionada,
    productosSeleccionados,
  } = body;

  const cleanSlug = (slug || nombreTienda || 'tienda')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const admin = getAdminClient();

  const modulosPayload = {
    margenPorcentaje: typeof margenPorcentaje === 'number' ? margenPorcentaje : 15,
    productosSeleccionados: Array.isArray(productosSeleccionados) ? productosSeleccionados : [],
    tiendaSeleccionada: tiendaSeleccionada || 'delva',
    nombreContacto: nombre || '',
    ciudad: ciudad || 'pucallpa',
  };

  const tagline = nombre
    ? `Catálogo de ${nombre} · Envíos en ${ciudad || 'pucallpa'}`
    : `Catálogo Oficial en Boga Network · Envíos en ${ciudad || 'pucallpa'}`;

  const slugSinBm = cleanSlug.replace(/-bm$/, '');
  const slugConBm = cleanSlug.endsWith('-bm') ? cleanSlug : `${cleanSlug}-bm`;

  // Actualizar o insertar en stores (reconociendo con o sin -bm)
  const { data: existing } = await admin
    .from('stores')
    .select('id, slug')
    .or(`slug.eq.${cleanSlug},slug.eq.${slugSinBm},slug.eq.${slugConBm}`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await admin
      .from('stores')
      .update({
        name: nombreTienda || existing.slug,
        whatsapp: whatsapp || undefined,
        zona: ciudad || 'pucallpa',
        tagline,
        template: 'network',
        plan: 'revendedor',
        es_revendedor: true,
        tienda_proveedora: tiendaSeleccionada || 'delva',
        modulos: modulosPayload,
      })
      .eq('id', existing.id);
  } else {
    await admin.from('stores').insert({
      slug: cleanSlug,
      name: nombreTienda || cleanSlug,
      whatsapp: whatsapp || null,
      zona: ciudad || 'pucallpa',
      tagline,
      template: 'network',
      plan: 'revendedor',
      es_revendedor: true,
      tienda_proveedora: tiendaSeleccionada || 'delva',
      status: 'active',
      marketplace_category: 'Tienda de Reventa',
      modulos: modulosPayload,
    });
  }

  // Sincronizar en store_requests si existe
  try {
    await admin
      .from('store_requests')
      .update({
        contact_name: nombre || undefined,
        whatsapp: whatsapp || undefined,
        city: ciudad || undefined,
        description: tagline,
      })
      .ilike('business_name', cleanSlug);
  } catch {}

  return NextResponse.json({
    ok: true,
    mensaje: 'Tienda de Boga Network actualizada con éxito',
    slug: cleanSlug,
  });
}

