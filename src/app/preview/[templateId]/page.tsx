import { getTemplate } from '@/lib/templates.config';
import { notFound } from 'next/navigation';
import StoreRenderer from '@/app/[slug]/StoreRenderer';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ templateId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { templateId } = await params;
  const tmpl = getTemplate(templateId);
  return {
    title: tmpl ? `${tmpl.name} | Preview` : 'Plantilla no encontrada',
    manifest: `/manifest.json?slug=${templateId}`,
    icons: { icon: '/pwa-icon.png', apple: '/pwa-icon.png' },
  };
}

export default async function PreviewPage({ params }: Props) {
  const { templateId } = await params;
  const tmpl = getTemplate(templateId);

  if (!tmpl) {
    notFound();
  }

  const base = {
    ...tmpl,
    slug: templateId,
    name: `${tmpl.name} (Demo)`,
    tagline: `Vista previa interactiva de la plantilla: ${templateId.toUpperCase()}`,
    marketplaceCategory: tmpl.category,
    template: templateId,
  };

  return <StoreRenderer store={base} />;
}
