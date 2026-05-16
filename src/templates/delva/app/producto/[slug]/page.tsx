import React from 'react';
import type { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

interface Props {
  params: { slug: string };
}

// 🤖 SERVER-SIDE SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  
  try {
    // We use the Firestore REST API to fetch data on the server without full Firebase SDK overhead
    const projectId = "delvaflow"; // Corrected Project ID
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`;
    const res = await fetch(url);
    const data = await res.json();
    
    // Find product by slug or ID
    const productDoc = data.documents?.find((d: any) => {
        const fields = d.fields;
        const pSlug = fields?.slug?.stringValue;
        const pId = d.name.split('/').pop();
        return pSlug === slug || pId === slug;
    });

    if (productDoc) {
        const fields = productDoc.fields;
        const title = fields.title?.stringValue || 'Producto';
        const image = fields.image?.stringValue || '';
        const description = fields.description?.stringValue || 'Tu marketplace amazónico.';

        return {
            title: `${title} | DELVA`,
            description,
            openGraph: {
                title: `${title} | DELVA`,
                description,
                images: [image],
            },
        };
    }
  } catch (error) {
    console.error("Error fetching metadata:", error);
  }

  return {
    title: 'Producto | DELVA',
    description: 'De la selva, su marketplace.',
  };
}

export default function Page({ params }: Props) {
  return <ProductDetailClient slug={params.slug} />;
}
