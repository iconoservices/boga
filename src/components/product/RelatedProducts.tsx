import React from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  store: string;
}

interface RelatedProductsProps {
  title: string;
  products: Product[];
}

export default function RelatedProducts({ title, products }: RelatedProductsProps) {
  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[20px] font-bold text-[#3E2723]">{title}</h2>
        <button className="text-[13px] font-bold text-primary hover:underline">Ver todo</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-gutter px-gutter hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {products.map((product) => (
          <Link 
            key={product.id} 
            href={`/product`}
            className="shrink-0 w-40 bg-surface-container-lowest rounded-2xl shadow-sm border border-[#3E2723]/5 overflow-hidden group active:scale-95 transition-transform"
          >
            <div className="relative aspect-square overflow-hidden bg-surface-container-high">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="p-3">
              <h4 className="text-[13px] font-bold text-[#3E2723] line-clamp-1 mb-1">{product.name}</h4>
              <p className="text-[11px] text-on-surface-variant/60 mb-2">{product.store}</p>
              <p className="text-[14px] font-bold text-primary">{product.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
