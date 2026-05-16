import { getStore } from '@/lib/stores.config';
import { notFound } from 'next/navigation';
import StoreRenderer from './StoreRenderer';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const store = getStore(slug);
  if (!store) return { title: 'Tienda no encontrada' };
  return {
    title: `${store.name} | Boga Market`,
    description: store.tagline,
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const store = getStore(slug);
  if (!store) notFound();
  return <StoreRenderer store={store} />;
}
