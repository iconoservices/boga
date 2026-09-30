'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

import {
  CLAVE_AUTH_RETURN,
  CLAVE_REABRIR_MODAL,
  CLAVE_COOKIE_ACCESS,
  CLAVE_COOKIE_REFRESH,
  setAuthCookie,
  getAuthCookie,
  deleteAuthCookie,
  esDestinoInternoValido,
  construirUrlRetornoConSesion,
} from '@/lib/authCookies';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsEmailConfirm: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithMagicLink: (email: string, redirectTo: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string, redirectTo: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirectTo: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function restaurarReturnUrl(sess: Session | null) {
  if (!sess || typeof window === 'undefined') return;
  try {
    const returnUrl = getAuthCookie(CLAVE_AUTH_RETURN) || localStorage.getItem(CLAVE_AUTH_RETURN);
    if (!returnUrl) return;

    // Validar que sea un destino interno permitido (mismo host o subdominio de bogahub.app)
    if (!esDestinoInternoValido(returnUrl)) {
      deleteAuthCookie(CLAVE_AUTH_RETURN);
      localStorage.removeItem(CLAVE_AUTH_RETURN);
      return;
    }

    let targetHref = returnUrl;
    if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
      targetHref = `${window.location.origin}${returnUrl}`;
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetHref, window.location.origin);
    } catch {
      deleteAuthCookie(CLAVE_AUTH_RETURN);
      localStorage.removeItem(CLAVE_AUTH_RETURN);
      return;
    }

    const hostActual = window.location.hostname.toLowerCase();
    const hostDestino = parsedTarget.hostname.toLowerCase();

    // Si ya estamos exactamente en el mismo host y misma ruta (pathname + query), no redirigir
    const currentFull = window.location.pathname + window.location.search;
    const targetFull = parsedTarget.pathname + parsedTarget.search;
    if (hostActual === hostDestino && currentFull === targetFull) {
      deleteAuthCookie(CLAVE_AUTH_RETURN);
      localStorage.removeItem(CLAVE_AUTH_RETURN);
      return;
    }

    // Consumir el returnUrl para no crear bucles
    deleteAuthCookie(CLAVE_AUTH_RETURN);
    localStorage.removeItem(CLAVE_AUTH_RETURN);

    // Si va hacia otro subdominio, compartir tokens en cookie de dominio (.bogahub.app)
    // para que supabase.auth.setSession lo active de inmediato al cargar el subdominio
    if (hostActual !== hostDestino && sess?.access_token && sess?.refresh_token) {
      setAuthCookie(CLAVE_COOKIE_ACCESS, sess.access_token, 300);
      setAuthCookie(CLAVE_COOKIE_REFRESH, sess.refresh_token, 300);
    }

    // Preparar URL final (inyecta tokens en hash también para máxima compatibilidad)
    const urlFinal = construirUrlRetornoConSesion(targetHref, sess);

    // Redirigir de inmediato al subdominio o página previa
    window.location.replace(urlFinal);
  } catch (err) {
    console.error('Error restaurando URL previa tras auth:', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Revisar si hay tokens heredados por cookie desde otro subdominio tras OAuth
      const cookieAccess = getAuthCookie(CLAVE_COOKIE_ACCESS);
      const cookieRefresh = getAuthCookie(CLAVE_COOKIE_REFRESH);

      if (cookieAccess && cookieRefresh) {
        deleteAuthCookie(CLAVE_COOKIE_ACCESS);
        deleteAuthCookie(CLAVE_COOKIE_REFRESH);
        try {
          const { data: setRes } = await supabase.auth.setSession({
            access_token: cookieAccess,
            refresh_token: cookieRefresh,
          });
          if (setRes?.session) {
            setSession(setRes.session);
            setLoading(false);
            restaurarReturnUrl(setRes.session);
            return;
          }
        } catch (e) {
          console.error('Error restaurando tokens entre subdominios', e);
        }
      }

      // 2. Si no, recuperar sesión normal local de Supabase
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
        if (data.session) {
          restaurarReturnUrl(data.session);
        }
      });
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        restaurarReturnUrl(newSession);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp: AuthContextValue['signUp'] = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message, needsEmailConfirm: false };
    return { error: null, needsEmailConfirm: !data.session };
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signInWithMagicLink: AuthContextValue['signInWithMagicLink'] = async (email, redirectTo) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    return { error: error ? error.message : null };
  };

  const resetPassword: AuthContextValue['resetPassword'] = async (email, redirectTo) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error ? error.message : null };
  };

  // Entrar con la cuenta de Google: guarda el destino tanto en cookies (.bogahub.app)
  // como en localStorage para garantizar el retorno incluso entre subdominios
  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async (redirectTo) => {
    const target = redirectTo || (typeof window !== 'undefined' ? window.location.href : '/');
    if (typeof window !== 'undefined') {
      try {
        setAuthCookie(CLAVE_AUTH_RETURN, target);
        localStorage.setItem(CLAVE_AUTH_RETURN, target);
      } catch {}
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: target,
      },
    });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      try {
        deleteAuthCookie(CLAVE_AUTH_RETURN);
        deleteAuthCookie(CLAVE_COOKIE_ACCESS);
        deleteAuthCookie(CLAVE_COOKIE_REFRESH);
        localStorage.removeItem(CLAVE_AUTH_RETURN);
      } catch {}
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signUp, signIn, signInWithMagicLink, resetPassword, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
