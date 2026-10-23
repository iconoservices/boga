import { supabase } from '@/lib/supabase';

// Después de guardar / ocultar / borrar en el superadmin: refresca la copia
// guardada de los endpoints públicos para que el cambio se vea en la vista del
// usuario sin esperar la caché. Nunca rompe el guardado si falla.
export async function refrescarPublico(paths: string[]): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ paths }),
    });
  } catch {
    /* si falla, el cambio igual se ve cuando venza la caché */
  }
}

// Igual, pero para el panel del negocio: refresca el catálogo de UNA tienda
// (el dueño solo puede refrescar la suya).
export async function refrescarTienda(slug: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !slug) return;
    await fetch('/api/revalidate-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ slug }),
    });
  } catch {
    /* si falla, el cambio igual se ve cuando venza la caché */
  }
}

// Refresca SOLO la página de un producto concreto (/slug/producto/id).
// Mucho más barato que refrescarTienda cuando solo cambió un producto:
// evita llamar a revalidatePath para todos los productos de la tienda.
export async function refrescarProducto(slug: string, productId: string | number): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !slug || !productId) return;
    await fetch('/api/revalidate-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ slug, productId: String(productId) }),
    });
  } catch {
    /* si falla, el cambio igual se ve cuando venza la caché */
  }
}
