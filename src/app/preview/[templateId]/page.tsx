import { getStore } from '@/lib/stores.config';
import { notFound } from 'next/navigation';
import StoreRenderer from '@/app/[slug]/StoreRenderer';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ templateId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { templateId } = await params;
  const store = getStore(templateId);
  if (!store) return { title: 'Plantilla no encontrada' };
  return {
    manifest: `/manifest.json?slug=${templateId}`,
  };
}

export default async function PreviewPage({ params }: Props) {
  const { templateId } = await params;
  const baseStore = getStore(templateId);

  if (!baseStore) {
    notFound();
  }

  // Adaptar dinámicamente los textos para que se sienta como una plantilla pura (Demo)
  const store = {
    ...baseStore,
    name: `${baseStore.name} (Demo)`,
    tagline: `Vista previa interactiva de la plantilla: ${templateId.toUpperCase()}`
  };

  // Render using our flexible renderer with static demo config
  return <StoreRenderer store={store} />;
}
