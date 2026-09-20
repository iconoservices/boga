'use client';

import React, { useState } from 'react';
import { uploadFile, mirrorImage, esImagenExterna } from '@/lib/uploadClient';

// Campo de foto: pegar una dirección, subir un archivo o pegar una imagen del
// portapapeles (Ctrl+V). Sube a R2 vía /api/upload (comprime antes de subir).
export default function CampoFoto({ value, onChange, carpeta, inputClass }: {
  value: string; onChange: (url: string) => void; carpeta: string; inputClass: string;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  // Enlace de otra web (Facebook, etc.): se guarda una copia en nuestro almacén
  // para que no caduque ni lo bloqueen. Si falla, se deja el enlace original.
  const copiar = async (url: string) => {
    setSubiendo(true); setError('');
    try {
      onChange(await mirrorImage(url, carpeta));
    } catch (e) {
      onChange(url);
      setError((e instanceof Error ? e.message : 'No se pudo guardar la copia') + ' Se usará el enlace original, que puede caducar.');
    } finally {
      setSubiendo(false);
    }
  };

  const subir = async (file: File) => {
    setSubiendo(true); setError('');
    try {
      onChange(await uploadFile(file, carpeta));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 text-xs font-bold text-secondary sm:col-span-2">
      Foto
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" referrerPolicy="no-referrer" className="w-full max-h-48 object-cover rounded-lg border border-surface-container-highest" />
      )}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={(e) => {
            const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith('image/'));
            if (f) { e.preventDefault(); subir(f); return; }
            const texto = e.clipboardData.getData('text').trim();
            if (esImagenExterna(texto)) { e.preventDefault(); onChange(texto); copiar(texto); }
          }}
          className={inputClass + ' flex-1 min-w-[200px]'}
          placeholder="Pega la dirección de la foto, o una imagen (Ctrl+V), o sube un archivo →"
        />
        <label className="relative px-3 py-2 rounded-lg bg-surface-container text-xs font-bold cursor-pointer hover:bg-surface-container-high whitespace-nowrap focus-within:ring-2 focus-within:ring-primary">
          {subiendo ? 'Subiendo…' : 'Subir foto'}
          <input type="file" accept="image/*" className="sr-only" aria-label="Subir foto desde tu equipo" disabled={subiendo}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ''; }} />
        </label>
      </div>
      {esImagenExterna(value) && !subiendo && (
        <span className="text-amber-700 font-bold">
          Esta imagen es de otra web y puede caducar.{' '}
          <button type="button" onClick={() => copiar(value)} className="underline">Guardar copia en BogaHub</button>
        </span>
      )}
      {error && <span className="text-red-600 font-bold">{error}</span>}
    </div>
  );
}
