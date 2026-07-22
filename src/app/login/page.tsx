'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmMessage(null);
    setIsLoading(true);

    if (useMagicLink) {
      const redirectTo = `${window.location.origin}/admin`;
      const { error: magicLinkError } = await signInWithMagicLink(email, redirectTo);
      setIsLoading(false);
      if (magicLinkError) { setError(magicLinkError); return; }
      setConfirmMessage('Listo. Revisa tu correo y tocá el link para entrar — no hace falta contraseña.');
      return;
    }

    if (isSignUp) {
      const { error: signUpError, needsEmailConfirm } = await signUp(email, password, name);
      setIsLoading(false);
      if (signUpError) { setError(signUpError); return; }
      if (needsEmailConfirm) {
        setConfirmMessage('Cuenta creada. Revisa tu correo y confirma tu cuenta antes de entrar.');
        return;
      }
      router.push('/admin');
      return;
    }

    const { error: signInError } = await signIn(email, password);
    setIsLoading(false);
    if (signInError) { setError('Correo o contraseña incorrectos.'); return; }
    router.push('/admin');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex bg-white">

        {/* ── Left: Branding Panel ── */}
        <div className="hidden lg:flex lg:w-1/2 bg-neutral-950 relative overflow-hidden flex-col justify-between p-16">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] height-[60%] rounded-full bg-radial from-white/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] height-[50%] rounded-full bg-radial from-white/5 to-transparent pointer-events-none" />

          {/* Logo */}
          <div className="flex items-center gap-2.5 z-10">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="color-white font-black text-xl text-white">B</span>
            </div>
            <span className="text-white font-headline-md tracking-wider text-base font-extrabold">BOGA MARKET</span>
          </div>

          <div className="relative z-10 max-w-md my-auto">
            <h1 className="font-headline-lg text-4xl lg:text-5xl text-white leading-tight mb-5 font-extrabold">
              Tu lugar favorito,{' '}
              <span className="text-primary">a un toque</span>{' '}
              de distancia.
            </h1>
            <p className="font-body-md text-sm text-white/60 leading-relaxed">
              Descubre menús irresistibles, productos de tus tiendas locales favoritas y gestiona todo de forma rápida y sencilla. Boga te conecta al instante con el sabor y estilo que más disfrutas.
            </p>
            <div className="mt-10 flex gap-8 items-center">
              <div>
                <p className="font-headline-md text-2xl text-white font-bold">Local</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Apoyo directo</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="font-headline-md text-2xl text-white font-bold">Al instante</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Tus antojos</p>
              </div>
            </div>
          </div>

          <p className="text-white/30 text-xs z-10">
            © 2026 Boga Market Inc. Todos los derechos reservados.
          </p>
        </div>

        {/* ── Right: Form Panel ── */}
        <div className="flex-1 flex items-center justify-center p-6 bg-surface-container-low overflow-y-auto">
          <div className="w-full max-w-[400px] flex flex-col gap-6">

            {/* Mobile Logo */}
            <div className="flex lg:hidden items-center gap-2.5 self-center">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="color-white font-black text-lg text-white">B</span>
              </div>
              <span className="text-on-surface font-headline-md tracking-wider text-sm font-extrabold">BOGA MARKET</span>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl p-8 shadow-[0_15px_15px_rgba(0,0,0,0.03)] border border-surface-container-highest">
              <h2 className="font-headline-md text-xl text-on-surface font-black">
                {useMagicLink ? 'Entrar sin contraseña' : isSignUp ? 'Crea tu espacio' : '¡Hola de nuevo! 👋'}
              </h2>
              <p className="text-xs text-secondary mt-1 mb-6 leading-normal font-body-md">
                {useMagicLink
                  ? 'Escribí tu correo y te mandamos un link para entrar, sin contraseña.'
                  : isSignUp
                  ? 'Únete a Boga y crea tu carta, catálogo o tienda local favorita en un clic.'
                  : 'Ingresa para disfrutar, pedir o gestionar tus tiendas locales.'}
              </p>

              {error && (
                <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-error-container text-on-error-container text-xs font-bold">
                  {error}
                </div>
              )}
              {confirmMessage && (
                <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-primary-container/20 text-on-surface text-xs font-bold border border-primary/20">
                  {confirmMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Full Name for Signup */}
                {isSignUp && !useMagicLink && (
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-secondary mb-1.5 uppercase tracking-wider">Nombre Completo</label>
                    <div className="relative">
                      <span className="material-symbols-outlined text-secondary/40 text-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">person</span>
                      <input 
                        type="text" 
                        required 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Juan Pérez" 
                        className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface transition-all focus:bg-white focus:border-surface-container-highest placeholder:text-secondary/40 font-body-md"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-secondary mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-secondary/40 text-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">mail</span>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@gmail.com" 
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface transition-all focus:bg-white focus:border-surface-container-highest placeholder:text-secondary/40 font-body-md"
                    />
                  </div>
                </div>

                {/* Password */}
                {!useMagicLink && (
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">Contraseña</label>
                      {!isSignUp && (
                        <Link href="#" className="text-[10px] font-bold text-primary hover:underline">¿La olvidaste?</Link>
                      )}
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined text-secondary/40 text-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">lock</span>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface transition-all focus:bg-white focus:border-surface-container-highest placeholder:text-secondary/40 font-body-md"
                      />
                    </div>
                  </div>
                )}

                {/* Remember */}
                {!isSignUp && !useMagicLink && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <label htmlFor="remember" className="text-xs font-semibold text-secondary cursor-pointer select-none">Recordarme en este dispositivo</label>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {useMagicLink ? 'Enviando link...' : isSignUp ? 'Creando cuenta...' : 'Iniciando sesión...'}
                    </>
                  ) : useMagicLink ? 'Enviarme el link →' : isSignUp ? 'Crear cuenta →' : 'Entrar →'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <span
                  onClick={() => { setUseMagicLink(!useMagicLink); setError(null); setConfirmMessage(null); }}
                  className="text-[11px] font-bold text-secondary hover:text-primary cursor-pointer hover:underline"
                >
                  {useMagicLink ? '← Entrar con contraseña' : 'Prefiero entrar sin contraseña (link por correo)'}
                </span>
              </div>

              {!useMagicLink && (
                <div className="mt-4 pt-5 border-t border-surface-container-low text-center">
                  <p className="text-xs text-secondary font-medium">
                    {isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}{' '}
                    <span
                      onClick={() => { setIsSignUp(!isSignUp); setError(null); setConfirmMessage(null); }}
                      className="text-primary font-bold cursor-pointer hover:underline"
                    >
                      {isSignUp ? 'Inicia sesión' : 'Regístrate gratis'}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <p className="text-center text-[10px] text-secondary/35 lg:hidden">
              © 2026 Boga Market Inc. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
