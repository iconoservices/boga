"use client";

import React, { useState } from 'react';

// Campo de contraseña con el ojito para mostrar / ocultar lo que se escribe.
// Recibe las mismas props que un <input>; solo controla el `type`. Reserva el
// espacio del botón a la derecha (cambia el padding derecho de la clase dada).
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function PasswordInput({ className = '', ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  const clase = className
    .replace(/\bpx-(\d+(?:\.\d+)?)\b/, 'pl-$1')
    .replace(/\bpr-\d+(?:\.\d+)?\b/, '')
    .concat(' pr-11');

  return (
    <div className="relative">
      <input {...rest} type={visible ? 'text' : 'password'} className={clase} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-secondary/60 hover:text-secondary hover:bg-black/5 active:scale-90 transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">{visible ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
}
