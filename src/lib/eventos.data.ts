// Acceso a datos de Eventos por el LADO DEL SERVIDOR — para el layout de /eventos
// y generación de metadata y Schema.org (JSON-LD) para Google.
// La interacción y estado de cliente siguen en /eventos/page.tsx.

import { supabase } from '@/lib/supabase';
import { hoyLima } from '@/lib/fechaLima';
import { extraerLinkPostOriginal, type Evento, type CategoriaEvento } from '@/lib/eventos';

const MESES_MAP: Record<string, string> = {
  ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
  JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12',
};

/**
 * Resuelve una fecha ISO (YYYY-MM-DD) para Schema.org Event.
 * Si tiene fecha directa de BD la usa; de lo contrario calcula con día y mes.
 */
export function resolverFechaISO(e: Evento): string | null {
  if (e.fecha && /^\d{4}-\d{2}-\d{2}$/.test(e.fecha)) {
    return e.fecha;
  }
  const diaNum = parseInt(e.dia, 10);
  const mesKey = (e.mes || '').toUpperCase().slice(0, 3);
  const mesNum = MESES_MAP[mesKey];
  if (!diaNum || !mesNum) return null;

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const diaStr = String(diaNum).padStart(2, '0');
  const fechaEsteAnio = `${anioActual}-${mesNum}-${diaStr}`;
  const hoyStr = `${anioActual}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  return fechaEsteAnio >= hoyStr ? fechaEsteAnio : `${anioActual + 1}-${mesNum}-${diaStr}`;
}

/**
 * Obtiene todos los eventos activos y no vencidos desde Supabase en el servidor.
 */
export async function getEventosActivos(): Promise<Evento[]> {
  const hoy = hoyLima();
  const cols = 'id,titulo,categoria,descripcion,lugar,dia,mes,fecha,precio,organiza,img,destacado,orden,reservable,aforo';

  let { data, error } = await supabase
    .from('events')
    .select(cols + ',link_entradas,link_post_original')
    .eq('status', 'activo')
    .or(`fecha.is.null,fecha.gte.${hoy}`)
    .order('fecha', { ascending: true, nullsFirst: false })
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    const resFallback = await supabase
      .from('events')
      .select(cols + ',link_entradas')
      .eq('status', 'activo')
      .or(`fecha.is.null,fecha.gte.${hoy}`)
      .order('fecha', { ascending: true, nullsFirst: false })
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });
    data = resFallback.data;
  }

  const filas = (data as any[] | null) ?? [];
  return filas.map((r: any) => {
    const directLink = (r.link_post_original as string) ?? '';
    const { desc, link } = extraerLinkPostOriginal(r.descripcion as string, directLink);
    return {
      id: String(r.id),
      titulo: (r.titulo as string) ?? '',
      cat: ((r.categoria as string) ?? 'Fiestas') as CategoriaEvento,
      descripcion: desc,
      lugar: (r.lugar as string) ?? '',
      dia: (r.dia as string) ?? '',
      mes: (r.mes as string) ?? '',
      fecha: (r.fecha as string) ?? '',
      precio: (r.precio as string) ?? '',
      organiza: (r.organiza as string) ?? '',
      img: (r.img as string) ?? '',
      destacado: Boolean(r.destacado),
      reservable: Boolean(r.reservable),
      aforo: r.aforo == null ? null : Number(r.aforo),
      linkEntradas: (r.link_entradas as string) ?? '',
      linkPostOriginal: link,
    };
  });
}
