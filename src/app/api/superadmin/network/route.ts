import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, serviceKey);
}

async function verificarSuperadmin(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return false;

  const comoUsuario = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: esSuperadmin, error } = await comoUsuario.rpc('is_superadmin');
  if (error || esSuperadmin !== true) return false;
  return true;
}

// GET: Cargar solicitudes y tiendas con permisos de admin
export async function GET(request: Request) {
  const esAdmin = await verificarSuperadmin(request);
  if (!esAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const admin = getAdminClient();

  const [{ data: solicitudes, error: errSol }, { data: stores, error: errStores }] = await Promise.all([
    admin.from('store_requests').select('*').order('created_at', { ascending: false }),
    admin.from('stores').select('id, name, slug, status, whatsapp, owner_email, plan, created_at, tienda_proveedora, modulos, es_revendedor, template').order('created_at', { ascending: false }),
  ]);

  if (errSol) {
    return NextResponse.json({ error: errSol.message }, { status: 500 });
  }

  return NextResponse.json({
    solicitudes: solicitudes || [],
    stores: stores || [],
  });
}

// POST: Realizar acciones (activar, desactivar, eliminar)
export async function POST(request: Request) {
  const esAdmin = await verificarSuperadmin(request);
  if (!esAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: Record<string, any> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const { accion, id, business_name, whatsapp, email, city, tipo, es_perfil } = body;
  const admin = getAdminClient();

  const esPerfil =
    es_perfil === true ||
    tipo === 'perfil' ||
    (typeof business_name === 'string' && business_name.startsWith('[Perfil]'));

  if (accion === 'activar') {
    // 1. Marcar solicitud como approved
    if (id) {
      await admin.from('store_requests').update({ status: 'approved' }).eq('id', id);
    }

    // Si es solo activación de perfil de afiliado, no crear tienda virtual
    if (esPerfil) {
      return NextResponse.json({ ok: true, mensaje: `Perfil de afiliado activado con éxito` });
    }

    // 2. Slug seguro para tienda de reventa
    const baseSlug = (business_name || 'tienda')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // 3. Revisar si existe en stores
    const { data: existing } = await admin
      .from('stores')
      .select('id, slug, status')
      .or(`name.ilike.${business_name},slug.eq.${baseSlug}`)
      .limit(1);

    if (existing && existing.length > 0) {
      await admin
        .from('stores')
        .update({
          status: 'active',
          template: 'network',
          plan: 'revendedor',
          es_revendedor: true,
          tienda_proveedora: 'delva',
          owner_email: email || undefined,
          whatsapp: whatsapp || undefined,
        })
        .eq('id', existing[0].id);
    } else {
      const payload: Record<string, any> = {
        name: business_name,
        slug: baseSlug,
        status: 'active',
        plan: 'revendedor',
        es_revendedor: true,
        tienda_proveedora: 'delva',
        whatsapp: whatsapp || null,
        owner_email: email || null,
        marketplace_category: 'Tienda de Reventa',
        tagline: 'Tienda de Reventa Oficial en Boga Network',
        template: 'network',
        zona: city || 'pucallpa',
      };
      const { error: insErr } = await admin.from('stores').insert(payload);
      if (insErr) {
        console.error('Error insertando en stores:', insErr);
        // Reintentar sin columnas opcionales si alguna no existiera
        await admin.from('stores').insert({
          name: business_name,
          slug: baseSlug,
          status: 'active',
          template: 'network',
          whatsapp: whatsapp || null,
        });
      }
    }

    return NextResponse.json({ ok: true, mensaje: `Tienda "${business_name}" activada (Verde)` });
  }

  if (accion === 'desactivar') {
    if (id) {
      await admin.from('store_requests').update({ status: 'pending' }).eq('id', id);
    }

    if (esPerfil) {
      return NextResponse.json({ ok: true, mensaje: `Perfil de afiliado puesto en revisión (Gris)` });
    }

    if (business_name) {
      await admin.from('stores').update({ status: 'inactive' }).ilike('name', business_name);
    }

    return NextResponse.json({ ok: true, mensaje: `Tienda "${business_name}" puesta en gris` });
  }

  if (accion === 'eliminar') {
    if (!id) {
      return NextResponse.json({ error: 'Falta el ID a eliminar' }, { status: 400 });
    }

    const { error: delErr } = await admin.from('store_requests').delete().eq('id', id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    if (!esPerfil && business_name) {
      await admin.from('stores').delete().ilike('name', business_name);
    }

    return NextResponse.json({ ok: true, mensaje: `Registro eliminado con éxito` });
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}

