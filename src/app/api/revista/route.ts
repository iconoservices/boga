import { NextResponse } from 'next/server';
import { getNotasPublicadas } from '@/lib/revista.data';

// GET /api/revista — notas publicadas de la Revista, en UN endpoint cacheado,
// para que la portada (/) y otros bloques del lado cliente no le peguen a
// Supabase desde el navegador de cada visitante (misma regla de egress que
// /api/catalog y /api/drivers). Devuelve solo los campos que necesitan las
// tarjetas. getNotasPublicadas() ya cae a NOTAS_SEED si la tabla está vacía.

export const revalidate = 300;

export async function GET() {
  const notas = await getNotasPublicadas();
  const slim = notas.map((n) => ({
    slug: n.slug,
    kicker: n.kicker,
    titulo: n.titulo,
    dek: n.dek,
    img: n.img,
    fecha: n.fecha,
    lectura: n.lectura,
    autor: n.autor,
  }));

  return NextResponse.json(
    { notas: slim },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
