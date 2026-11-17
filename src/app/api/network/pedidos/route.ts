import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, serviceKey);
}

// GET: Obtener pedidos y resumen de recaudación de las tiendas del revendedor
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugsParam = searchParams.get('slug')?.toLowerCase().trim();

  if (!slugsParam) {
    return NextResponse.json({ error: 'Falta el parámetro slug' }, { status: 400 });
  }

  const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean);
  const admin = getAdminClient();

  try {
    // 1. Obtener información de las tiendas para conocer los márgenes configurados
    const { data: storesData } = await admin
      .from('stores')
      .select('slug, modulos')
      .in('slug', slugs);

    const margenesPorTienda: Record<string, number> = {};
    (storesData || []).forEach((st) => {
      const mod = st.modulos && typeof st.modulos === 'object' ? st.modulos : {};
      margenesPorTienda[st.slug] = typeof mod.margenPorcentaje === 'number' ? mod.margenPorcentaje : 15;
    });

    // 2. Obtener pedidos de estas tiendas
    const { data: orders, error: errOrders } = await admin
      .from('orders')
      .select('*')
      .in('store', slugs)
      .order('created_at', { ascending: false });

    if (errOrders) {
      console.error('[API network/pedidos GET error]:', errOrders.message);
      return NextResponse.json({ error: errOrders.message }, { status: 500 });
    }

    const pedidosProcesados = (orders || []).map((o) => {
      const total = Number(o.total_amount) || 0;
      const margen = margenesPorTienda[o.store] || 15;
      // Ganancia neta calculada sobre el margen: Ganancia = Total * (Margen / (100 + Margen))
      const ganancia = Math.round(total * (margen / (100 + margen)) * 100) / 100;

      return {
        id: o.id,
        codigo: o.codigo || o.id.slice(0, 8),
        store: o.store,
        customer_name: o.customer_name || 'Cliente de WhatsApp',
        customer_phone: o.customer_phone || '',
        customer_address: o.customer_address || '',
        items: Array.isArray(o.items) ? o.items : [],
        total_amount: total,
        ganancia_estimada: ganancia,
        status: o.status || 'Pendiente',
        order_source: o.order_source || 'Catálogo Virtual',
        payment_method: o.payment_method || 'WhatsApp / Contraentrega',
        created_at: o.created_at,
      };
    });

    // 3. Métricas de recaudación
    let totalRecaudado = 0;
    let gananciasCobradas = 0;
    let gananciasPendientes = 0;
    let pedidosEntregados = 0;
    let pedidosPendientes = 0;

    pedidosProcesados.forEach((p) => {
      if (p.status === 'Entregado') {
        totalRecaudado += p.total_amount;
        gananciasCobradas += p.ganancia_estimada;
        pedidosEntregados += 1;
      } else if (p.status !== 'Cancelado') {
        gananciasPendientes += p.ganancia_estimada;
        pedidosPendientes += 1;
      }
    });

    return NextResponse.json({
      ok: true,
      resumen: {
        totalRecaudado: Number(totalRecaudado.toFixed(2)),
        gananciasCobradas: Number(gananciasCobradas.toFixed(2)),
        gananciasPendientes: Number(gananciasPendientes.toFixed(2)),
        totalPedidos: pedidosProcesados.length,
        pedidosEntregados,
        pedidosPendientes,
      },
      pedidos: pedidosProcesados,
    });
  } catch (err: any) {
    console.error('[API network/pedidos unexpected error]:', err);
    return NextResponse.json({ error: err?.message || 'Error del servidor' }, { status: 500 });
  }
}

// PATCH: Actualizar estado de un pedido (ej: pasar a 'Entregado' o 'Cancelado')
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Faltan campos id o status' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id, status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error del servidor' }, { status: 500 });
  }
}

// POST: Registrar un pedido manual o de prueba para el revendedor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      store,
      customer_name,
      customer_phone,
      customer_address,
      items,
      total_amount,
      status = 'Pendiente',
    } = body;

    if (!store || !customer_name || !total_amount) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (store, customer_name, total_amount)' }, { status: 400 });
    }

    const admin = getAdminClient();
    const codigo = Math.random().toString(36).substring(2, 9);

    const { data, error } = await admin
      .from('orders')
      .insert({
        store,
        codigo,
        customer_name,
        customer_phone: customer_phone || null,
        customer_address: customer_address || 'Entrega en Pucallpa',
        items: items || [{ name: 'Venta por catálogo', quantity: 1, price: total_amount }],
        total_amount: Number(total_amount),
        status,
        order_source: 'Boga Network Revendedor',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pedido: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error del servidor' }, { status: 500 });
  }
}

