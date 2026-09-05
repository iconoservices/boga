import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { getNotaById, notaHref } from '@/lib/revista';
import RevistaIndex from './RevistaIndex';

// Portada de la Revista. Server Component: expone su propia metadata y
// canónica, y redirige los links viejos /revista?nota=<id> a la URL nueva
// del artículo (/revista/<slug>). La UI con estado vive en RevistaIndex.

export const metadata: Metadata = {
  title: 'Yo Soy de la Selva · Revista de Pucallpa',
  description:
    'La revista digital de Boga: historias, cultura, gastronomía y rutas de Pucallpa y la ' +
    'Amazonía peruana. Notas de Actualidad, Cultura, Vida Social, Naturaleza y más.',
  alternates: { canonical: '/revista' },
  openGraph: {
    type: 'website',
    title: 'Yo Soy de la Selva · Revista de Pucallpa',
    description:
      'Historias, cultura, gastronomía y rutas de Pucallpa y la Amazonía peruana, por Boga.',
    url: '/revista',
  },
};

type Props = { searchParams: Promise<{ nota?: string }> };

export default async function RevistaPage({ searchParams }: Props) {
  const { nota } = await searchParams;
  if (nota) {
    const n = getNotaById(nota);
    if (n) permanentRedirect(notaHref(n));
  }
  return <RevistaIndex />;
}
