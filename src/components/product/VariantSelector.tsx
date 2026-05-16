import React from 'react';

interface VariantSelectorProps {
  title: string;
  options: string[];
  selectedOption: string;
  onSelect: (option: string) => void;
}

export default function VariantSelector({ title, options, selectedOption, onSelect }: VariantSelectorProps) {
  return (
    <section className="mb-8">
      <h2 className="text-[18px] font-bold text-[#3E2723] mb-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-gutter px-gutter hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {options.map((option) => {
          const isSelected = option === selectedOption;
          return (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={`shrink-0 px-6 py-[10px] rounded-full font-bold text-[14px] flex items-center gap-2 shadow-sm transition-all border-2 ${
                isSelected
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-white text-[#745853] border-[#3E2723]/10 hover:bg-surface-container-low focus:border-primary/30'
              }`}
            >
              {isSelected && (
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              )}
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
