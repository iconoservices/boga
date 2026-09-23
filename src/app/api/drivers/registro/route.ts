import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Endpoint para registrar postulaciones de Taxi Seguro y disparar
// alertas automáticas al WhatsApp del superadmin (CallMeBot u otros).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nombre, dni, whatsapp, tipo, placa, zona,
      ciudad, experiencia, horario, mensaje,
      foto_perfil, foto_vehiculo,
    } = body;

    if (!nombre || !whatsapp) {
      return NextResponse.json({ error: 'Nombre y WhatsApp son obligatorios' }, { status: 400 });
    }

    // Usar service role si está disponible para saltar RLS, o anon key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.from('driver_requests').insert({
      nombre,
      dni: dni || null,
      whatsapp,
      tipo: tipo || 'Mototaxi',
      placa: placa || null,
      zona: zona || null,
      ciudad: ciudad || 'pucallpa',
      experiencia: experiencia || null,
      horario: horario || null,
      mensaje: mensaje || null,
      foto_perfil: foto_perfil || null,
      foto_vehiculo: foto_vehiculo || null,
      status: 'pending',
    }).select().single();

    if (error) {
      console.error('[driver_requests/insert] error:', error);
      return NextResponse.json({ error: 'No se pudo guardar la postulación' }, { status: 500 });
    }

    // Disparar notificación automática a WhatsApp si CallMeBot está configurado
    const phone = process.env.CALLMEBOT_PHONE;
    const apikey = process.env.CALLMEBOT_API_KEY;

    if (phone && apikey) {
      const textoAlerta = [
        '🛺 *Nueva postulación Taxi Seguro*',
        '',
        `👤 *Nombre:* ${nombre}`,
        dni ? `🪪 *DNI:* ${dni}` : null,
        `📱 *WhatsApp:* ${whatsapp}`,
        `🚘 *Vehículo:* ${tipo || 'Mototaxi'} ${placa ? `(Placa: ${placa})` : ''}`,
        `📍 *Ciudad:* ${ciudad || 'Pucallpa'}`,
        horario ? `🕒 *Horario:* ${horario}` : null,
        zona ? `🏢 *Unidad:* ${zona}` : null,
        foto_perfil || foto_vehiculo ? '📸 *Fotos adjuntas:* Sí' : null,
        '',
        '👉 *Revisar en el panel:*',
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app'}/superadmin/choferes`,
      ].filter(Boolean).join('\n');

      const urlCallMeBot = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(textoAlerta)}&apikey=${encodeURIComponent(apikey)}`;

      // Lanzar sin bloquear la respuesta al usuario
      fetch(urlCallMeBot).catch((err) => {
        console.error('[CallMeBot] Error enviando mensaje WhatsApp:', err);
      });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err: any) {
    console.error('[drivers/registro] error:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}
