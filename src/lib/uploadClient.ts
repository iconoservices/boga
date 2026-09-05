import { supabase } from '@/lib/supabase';

// Helper de cliente: sube un archivo a R2 vía /api/upload (la llave secreta de
// R2 vive solo en el servidor, nunca en el bundle del navegador). Manda el
// token de la sesión porque la ruta solo acepta usuarios logueados.
export async function uploadFile(file: File, folder: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Tenés que iniciar sesión para subir imágenes');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al subir el archivo');
  return data.url as string;
}
