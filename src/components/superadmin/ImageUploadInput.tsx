'use client';

import React, { useRef, useState } from 'react';
import { uploadFile } from '@/lib/uploadClient';

// Campo de imagen del superadmin: URL escrita a mano o archivo subido (product-images/banners).
export default function ImageUploadInput({ value, onChange, placeholder }: { value: string; onChange: (url: string) => void; placeholder?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, 'product-images/banners');
      onChange(url);
    } catch (err: any) {
      alert('Error al subir: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder={placeholder || 'URL del banner...'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-white border border-[#c2c6d6] rounded-lg px-2.5 py-1.5 text-xs text-[#191b23] outline-none focus:border-[#0058be] transition-colors"
      />
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-8 h-8 rounded-lg bg-[#ecedf7] hover:bg-[#e6e7f2] flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
        title="Subir imagen"
      >
        {uploading
          ? <span className="material-symbols-outlined text-sm animate-spin text-[#424754]">refresh</span>
          : <span className="material-symbols-outlined text-sm text-[#424754]">photo_camera</span>
        }
      </button>
      {value && (
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#c2c6d6] shrink-0">
          <img src={value} className="w-full h-full object-cover" alt="" />
        </div>
      )}
    </div>
  );
}
