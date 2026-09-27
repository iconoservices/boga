// Categorías POR DEFECTO de cada plantilla, editables desde /superadmin/plantillas/<id>.
//
// Las de fábrica viven en el código (templates.config.ts). Cuando el superadmin las cambia se guardan en la tabla
// `plantilla_categorias` (una fila por plantilla) y mandan sobre las del código. Sin fila (o si la tabla aún no
// existe) se usan las del código, así nada se rompe.
//
// Son solo el punto de partida: una tienda nueva las hereda al crearse; después el dueño agrega las suyas o deja de
// usar las que no quiere. Cambiarlas aquí NO toca a las tiendas que ya tienen sus categorías.

import { supabase } from './supabase';
import { getTemplate } from './templates.config';
import { iconForCategory } from '@/templates/shared/tokens';

export type CategoriaPlantilla = { name: string; icon: string; href: string };

/** "Especias enteras" → "especias-enteras" (el enlace interno de la categoría). */
export const slugCategoria = (nombre: string) =>
  nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Deja solo categorías con nombre, sin repetir, con enlace e ícono (si falta, uno según el nombre). */
export function limpiarCategorias(lista: { name: string; icon?: string }[]): CategoriaPlantilla[] {
  const vistas = new Set<string>();
  const out: CategoriaPlantilla[] = [];
  for (const c of lista) {
    const name = (c.name || '').trim().slice(0, 40);
    const href = slugCategoria(name);
    if (!name || !href || vistas.has(href)) continue;
    vistas.add(href);
    out.push({ name, href, icon: (c.icon || '').trim() || iconForCategory(name) });
  }
  return out.slice(0, 20);
}

/** Todas las categorías personalizadas guardadas, por plantilla. Vacío si no hay o si la tabla aún no existe. */
export async function cargarCategoriasPersonalizadas(): Promise<Record<string, CategoriaPlantilla[]>> {
  try {
    const { data, error } = await supabase.from('plantilla_categorias').select('template_id,categories');
    if (error || !data) return {};
    const out: Record<string, CategoriaPlantilla[]> = {};
    for (const f of data as { template_id: string; categories: unknown }[]) {
      const lista = limpiarCategorias(Array.isArray(f.categories) ? (f.categories as { name: string; icon?: string }[]) : []);
      if (lista.length) out[f.template_id] = lista;
    }
    return out;
  } catch {
    return {};
  }
}

/** Las que valen hoy para una plantilla: las guardadas por el superadmin o, si no hay, las del código. */
export function categoriasDePlantilla(id: string | undefined, personalizadas: Record<string, CategoriaPlantilla[]>): CategoriaPlantilla[] {
  if (!id) return [];
  return personalizadas[id]?.length ? personalizadas[id] : (getTemplate(id)?.categories ?? []);
}
