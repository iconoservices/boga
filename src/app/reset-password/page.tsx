'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * A donde Supabase manda el link de "recuperar contraseña". El link ya trae
 * una sesion de recuperacion armada en la URL (detectSessionInUrl la agarra
 * sola); acá solo falta pedir la contraseña nueva y llamar updateUser.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(
        updateError.message.includes('session')
          ? 'El link ya venció o ya se usó. Volvé a pedir "¿La olvidaste?" desde el login.'
          : updateError.message
      );
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/admin'), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-low p-6">
      <div className="w-full max-w-[400px] bg-white rounded-3xl p-8 shadow-[0_15px_15px_rgba(0,0,0,0.03)] border border-surface-container-highest">
        <h2 className="font-headline-md text-xl text-on-surface font-black">Nueva contraseña</h2>
        <p className="text-xs text-secondary mt-1 mb-6 leading-normal font-body-md">
          Elegí una contraseña para tu cuenta.
        </p>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-error-container text-on-error-container text-xs font-bold">
            {error}
          </div>
        )}

        {done ? (
          <div className="px-3.5 py-2.5 rounded-xl bg-primary-container/20 text-on-surface text-xs font-bold border border-primary/20">
            ¡Listo! Contraseña actualizada. Entrando...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-secondary mb-1.5 uppercase tracking-wider">Contraseña nueva</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface transition-all focus:bg-white focus:border-surface-container-highest placeholder:text-secondary/40 font-body-md"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-secondary mb-1.5 uppercase tracking-wider">Repetila</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface transition-all focus:bg-white focus:border-surface-container-highest placeholder:text-secondary/40 font-body-md"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : 'Guardar contraseña →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
