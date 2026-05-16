import React from 'react';

interface ProductHeaderProps {
  title: string;
  price: string;
  description: string;
  rating: string;
  reviews: string;
  tag?: string;
}

export default function ProductHeader({ title, price, description, rating, reviews, tag }: ProductHeaderProps) {
  return (
    <div className="bg-surface-container-lowest p-5 rounded-[24px] shadow-[0_8px_30px_rgba(62,39,35,0.06)] mb-6 border border-[#3E2723]/5 flex flex-col gap-2.5 relative overflow-hidden">
      
      {/* Decorative gradient blur in background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none translate-x-8 -translate-y-8"></div>

      {/* Top Row: Tag & Price */}
      <div className="flex justify-between items-center">
        {tag && (
          <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary font-black text-[10px] rounded-md uppercase tracking-[0.1em]">
            {tag}
          </span>
        )}
        <p className="font-black text-[22px] text-primary tracking-tight">{price}</p>
      </div>

      {/* Middle Row: Title & Rating */}
      <div className="flex justify-between items-start gap-4 mt-1">
         <h1 className="font-h1 text-[26px] font-bold text-[#3E2723] leading-[1.1] tracking-tight">{title}</h1>
         
         <div className="flex items-center text-[#9C3F2B] bg-[#9C3F2B]/5 px-2 py-1 rounded border border-[#9C3F2B]/10 shrink-0 mt-1">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="text-[12px] font-black ml-1 tracking-tight">{rating} <span className="opacity-60 font-semibold">({reviews})</span></span>
         </div>
      </div>

      {/* Bottom Row: Description spanning full width */}
      <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed opacity-80 mt-1.5 font-medium">
        {description}
      </p>
    </div>
  );
}
