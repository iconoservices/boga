import { getStore } from '@/lib/stores.config';
import { notFound } from 'next/navigation';
import StoreRenderer from './StoreRenderer';
import { supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getDynamicStore(slug: string) {
  const store = getStore(slug);
  if (!store) return null;
  
  try {
    const { data: dbStore } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
      
    if (dbStore) {
      return {
        ...store,
        name: dbStore.name || store.name,
        tagline: dbStore.tagline || store.tagline,
        heroImage: dbStore.hero_image || store.heroImage,
        logoImage: dbStore.logo_image || undefined,
        marketplaceCategory: dbStore.marketplace_category || store.marketplaceCategory,
      };
    }
  } catch (err) {
    console.error('Error fetching dynamic store:', err);
  }
  
  return store;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const store = await getDynamicStore(slug);
  if (!store) return { title: 'Tienda no encontrada' };
  return {
    title: `${store.name} | Boga Market`,
    description: store.tagline,
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const store = await getDynamicStore(slug);
  if (!store) notFound();
  return <StoreRenderer store={store} />;
}
