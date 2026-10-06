import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { clienteServicio } from '@/lib/pushServidor';
import { TOKEN_ALUMNO, inicioDeMes } from '@/lib/academia';
import { hoyLima } from '@/lib/fechaLima';
import { moduloAcademia } from '@/lib/modulos';
import CarnetAlumno from '@/components/academia/CarnetAlumno';

// Carnet y asistencia de UN alumno: /academia/alumno/<token>. El token es secreto (es el QR y el enlace del padre),
// por eso la página no se indexa y se lee con la llave de servicio. Siempre fresca: el padre ve si ya llegó.

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Carnet del alumno',
  robots: { index: false, follow: false },
};

export default async function PaginaAlumno({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_ALUMNO.test(token)) notFound();
  const db = clienteServicio();
  if (!db) notFound();

  const { data: alumno } = await db.from('alumnos').select('id,nombre,grupo,store,activo').eq('token', token).maybeSingle();
  if (!alumno) notFound();

  const [{ data: tienda }, { data: marcas }] = await Promise.all([
    db.from('stores').select('slug,name,logo_image,modulos').eq('slug', alumno.store).maybeSingle(),
    db.from('asistencias').select('fecha,llegada_at').eq('alumno_id', alumno.id).order('fecha', { ascending: false }).limit(90),
  ]);
  if (!tienda || !moduloAcademia(tienda.modulos)) notFound();

  const hoy = hoyLima();
  const lista = (marcas ?? []) as { fecha: string; llegada_at: string }[];
  const deHoy = lista.find((m) => m.fecha === hoy) ?? null;
  const delMes = lista.filter((m) => m.fecha >= inicioDeMes(hoy)).length;

  return (
    <CarnetAlumno
      token={token}
      alumno={{ nombre: alumno.nombre, grupo: alumno.grupo, activo: alumno.activo }}
      academia={{ slug: tienda.slug, nombre: tienda.name, logo: tienda.logo_image || null }}
      hoy={hoy}
      llegadaHoy={deHoy?.llegada_at ?? null}
      delMes={delMes}
      historial={lista.slice(0, 40)}
    />
  );
}
