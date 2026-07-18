import { getTemplate } from '@/lib/templates.config';
import { BOGA_DEFAULT_ICON } from '@/lib/stores.config';
import { notFound } from 'next/navigation';
import StoreRenderer from '@/app/[slug]/StoreRenderer';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ templateId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { templateId } = await params;
  const tmpl = getTemplate(templateId);

  if (!tmpl) {
    return {
      title: 'Plantilla no encontrada',
      icons: { icon: BOGA_DEFAULT_ICON, apple: BOGA_DEFAULT_ICON },
    };
  }

  const iconUrl = tmpl.iconImage || tmpl.heroImage || BOGA_DEFAULT_ICON;

  return {
    title: `${tmpl.name} | Preview`,
    manifest: `/manifest.json?slug=${templateId}`,
    icons: {
      icon: [
        { url: iconUrl, sizes: 'any' },
        { url: iconUrl, sizes: '192x192', type: 'image/png' },
        { url: iconUrl, sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: iconUrl, sizes: '180x180', type: 'image/png' },
      ],
    },
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
    tagline: `Plantilla "${tmpl.name}" — /preview/${templateId}`,
    marketplaceCategory: tmpl.category,
    template: templateId,
  };

  return <StoreRenderer store={base} />;
}
