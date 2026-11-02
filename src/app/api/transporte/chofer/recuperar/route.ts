import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { excedeLimite, ipDe, servicio } from '@/lib/transporteServidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const db = servicio();
  if (!db) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });

  if (excedeLimite(`chofer-recuperar:${ipDe(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { identificador?: string } | null;
  const raw = String(body?.identificador ?? '').trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits || digits.length < 8) {
    return NextResponse.json({ error: 'Ingresa un número de celular (9 dígitos) o DNI (8 dígitos) válido.' }, { status: 400 });
  }

  // Buscar chofer activo que coincida por DNI o por teléfono
  const { data: drivers, error } = await db
    .from('drivers')
    .select('id,nombre,tipo,tel,dni,status')
    .eq('status', 'activo');

  if (error || !drivers || drivers.length === 0) {
    return NextResponse.json({ error: 'No encontramos ningún chofer activo en el padrón.' }, { status: 404 });
  }

  const driver = drivers.find((d) => {
    const dDni = String(d.dni || '').replace(/\D/g, '');
    const dTel = String(d.tel || '').replace(/\D/g, '');
    if (digits.length === 8 && dDni === digits) return true;
    if (dTel && (dTel === digits || dTel.endsWith(digits.slice(-9)))) return true;
    return false;
  });

  if (!driver) {
    return NextResponse.json({
      error: 'No encontramos un chofer activo con ese número o DNI en el padrón. Si te acabas de postular, espera a que aprueben tu ficha o comunícate con BogaHub.',
    }, { status: 404 });
  }

  // Obtener o crear token de acceso
  let { data: acceso } = await db
    .from('driver_acceso')
    .select('token')
    .eq('driver_id', driver.id)
    .maybeSingle();

  if (!acceso?.token) {
    const token = crypto.randomBytes(32).toString('hex');
    const { error: insErr } = await db
      .from('driver_acceso')
      .insert({ driver_id: driver.id, token });
    if (insErr) {
      return NextResponse.json({ error: 'Error al generar el acceso del chofer.' }, { status: 500 });
    }
    acceso = { token };
  }

  return NextResponse.json({
    ok: true,
    token: acceso.token,
    driverId: driver.id,
    nombre: driver.nombre,
    tipo: driver.tipo,
  });
}
