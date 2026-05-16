import React, { useState } from 'react';

interface ExtraOption {
  id: string;
  name: string;
  price: string;
}

interface ExtrasSelectorProps {
  title: string;
  options: ExtraOption[];
}

export default function ExtrasSelector({ title, options }: ExtrasSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleOption = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[18px] font-bold text-[#3E2723]">{title}</h2>
        <span className="text-[11px] font-bold text-[#745853] bg-[#745853]/5 px-2 py-[2px] rounded-md uppercase tracking-wider opacity-60">
          Opcional
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              onClick={() => toggleOption(option.id)}
              className={`flex items-center justify-between p-4 bg-white rounded-2xl border transition-all active:scale-[0.98] ${
                isSelected 
                  ? 'border-primary shadow-sm bg-primary/[0.02]' 
                  : 'border-[#3E2723]/5 shadow-[0_2px_10px_rgba(62,39,35,0.02)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors border-2 ${
                  isSelected ? 'bg-primary border-primary text-white' : 'border-[#3E2723]/10 text-transparent'
                }`}>
                  <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                </div>
                <span className={`text-[15px] font-bold ${isSelected ? 'text-primary' : 'text-[#3E2723]'}`}>
                  {option.name}
                </span>
              </div>
              <span className={`text-[14px] font-bold ${isSelected ? 'text-primary' : 'text-[#745853]/60'}`}>
                +{option.price}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
