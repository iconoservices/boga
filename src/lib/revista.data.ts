// Acceso a datos de la Revista. Lee de la tabla `revista_notas` (Supabase) con
// FALLBACK a NOTAS_SEED si la tabla está vacía o la consulta falla — así
// /revista nunca queda en blanco (ni antes de correr el SQL / importar la semilla).
//
// Usa el cliente anon (`src/lib/supabase.ts`): la RLS ya deja leer en público
// las notas con estado 'publicada'. Los borradores no salen por acá.

import { supabase } from '@/lib/supabase';
import {
  NOTAS_SEED, seedBySlug, seedById, fechaDisplay, fechaISO, type Nota,
} from '@/lib/revista';

/** Forma de una fila de `revista_notas` tal como vuelve de Supabase. */
export type NotaFila = {
  id: string;
  slug: string;
  kicker: string;
  titulo: string;
  dek: string;
  autor_id: string | null;
  autor_nombre: string;
  fecha: string;            // DATE -> "2026-09-05"
  lectura: string;
  img: string;
  img_credito: string;
  cuerpo: string[] | null;
  cita: { texto: string; autor: string } | null;
  ubicacion_maps: string | null;
  fuente: { nombre: string; url?: string } | null;
  destacado: boolean;
  portada: boolean;
  estado: 'borrador' | 'en_revision' | 'publicada';
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
};

/** Fila de la base -> objeto Nota que usan los componentes. */
export function filaANota(f: NotaFila): Nota {
  return {
    id: f.id,
    slug: f.slug,
    kicker: f.kicker,
    titulo: f.titulo,
    dek: f.dek,
    autor: f.autor_nombre || 'Redacción Boga',
    fecha: fechaDisplay(f.fecha),
    lectura: f.lectura || '3 min',
    img: f.img,
    imgCredito: f.img_credito || undefined,
    cuerpo: Array.isArray(f.cuerpo) ? f.cuerpo : [],
    cita: f.cita || undefined,
    ubicacionMaps: f.ubicacion_maps || undefined,
    fuente: f.fuente || undefined,
    destacado: f.destacado || undefined,
    portada: f.portada || undefined,
  };
}

/** Nota (semilla) -> fila lista para insertar en `revista_notas`. */
export function notaAFila(n: Nota, autorId: string | null) {
  return {
    slug: n.slug,
    kicker: n.kicker,
    titulo: n.titulo,
    dek: n.dek,
    autor_id: autorId,
    autor_nombre: n.autor || 'Redacción Boga',
    fecha: fechaISO(n.fecha),
    lectura: n.lectura || '3 min',
    img: n.img,
    img_credito: n.imgCredito ?? 'Foto: archivo Boga',
    cuerpo: n.cuerpo ?? [],
    cita: n.cita ?? null,
    ubicacion_maps: n.ubicacionMaps ?? null,
    fuente: n.fuente ?? null,
    destacado: !!n.destacado,
    portada: !!n.portada,
    estado: 'publicada' as const,
    published_at: new Date().toISOString(),
  };
}

/** Todas las notas publicadas, más nuevas primero. Fallback: NOTAS_SEED
 *  (tabla vacía, sin migrar todavía, o Supabase caído). */
export async function getNotasPublicadas(): Promise<Nota[]> {
  try {
    const { data, error } = await supabase
      .from('revista_notas')
      .select('*')
      .eq('estado', 'publicada')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return NOTAS_SEED;
    return (data as NotaFila[]).map(filaANota);
  } catch {
    return NOTAS_SEED;
  }
}

export async function getNotaPublicadaBySlug(slug: string): Promise<Nota | undefined> {
  const { data, error } = await supabase
    .from('revista_notas')
    .select('*')
    .eq('slug', slug)
    .eq('estado', 'publicada')
    .maybeSingle();

  if (!error && data) return filaANota(data as NotaFila);
  // Sin fila: solo caemos a la semilla si la tabla todavía no tiene nada.
  const publicadas = await getNotasPublicadas();
  if (publicadas === NOTAS_SEED) return seedBySlug(slug);
  return undefined;
}

export async function getNotaPublicadaById(id: string): Promise<Nota | undefined> {
  const publicadas = await getNotasPublicadas();
  return publicadas.find((n) => n.id === id) ?? seedById(id);
}
