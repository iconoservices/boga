import React from 'react';

interface ProductNoticeProps {
  icon: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
}

export default function ProductNotice({ icon, message, type = 'info' }: ProductNoticeProps) {
  const bgColors = {
    info: 'bg-[#745853]/5 border-[#745853]/10',
    warning: 'bg-orange-50 border-orange-100',
    success: 'bg-green-50 border-green-100'
  };

  const iconColors = {
    info: 'text-[#745853]',
    warning: 'text-orange-500',
    success: 'text-green-500'
  };

  return (
    <div className={`p-4 rounded-2xl border flex items-center gap-3 mb-6 transition-all ${bgColors[type]}`}>
      <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${iconColors[type]} bg-white shadow-sm`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <p className="text-[13px] font-medium text-on-surface-variant leading-snug">
        {message}
      </p>
    </div>
  );
}
