'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => { window.location.href = '/profile'; }, 1500);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    paddingLeft: '40px', paddingRight: '14px', paddingTop: '11px', paddingBottom: '11px',
    backgroundColor: '#f5f5f5', border: '1.5px solid transparent',
    borderRadius: '12px', outline: 'none', fontSize: '13px', fontWeight: 500,
    fontFamily: "'Outfit', sans-serif", color: '#111', transition: 'all 0.2s',
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', fontFamily: "'Outfit', sans-serif", backgroundColor: '#ffffff',
      }}>

        {/* ── Left: Branding Panel ── */}
        <div className="login-left-panel" style={{
          display: 'none', width: '50%', backgroundColor: '#000',
          position: 'relative', overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center', padding: '56px',
        }}>
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%)' }} />

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '420px' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px', boxShadow: '0 25px 60px rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '26px', fontWeight: 900, color: '#000' }}>B</span>
            </div>
            <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '20px' }}>
              Tu lugar favorito,{' '}
              <span style={{ color: '#8b5cf6' }}>a un toque</span>{' '}
              de distancia.
            </h1>
            <p style={{ fontSize: '16px', color: '#777', fontWeight: 500, lineHeight: 1.7 }}>
              Descubre menús irresistibles, productos de tus tiendas locales favoritas y gestiona todo de forma rápida y sencilla. Boga te conecta al instante con el sabor y estilo que más disfrutas.
            </p>
            <div style={{ marginTop: '40px', display: 'flex', gap: '28px', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Local</p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Apoyo directo</p>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Al instante</p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tus antojos</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Form Panel ── */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', backgroundColor: '#fafafa', overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#000', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
                <span style={{ color: '#fff', fontSize: '18px', fontWeight: 900 }}>B</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#111' }}>BOGA MARKET</span>
            </div>

            {/* Card */}
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111', marginBottom: '4px' }}>
                {isSignUp ? 'Crea tu espacio' : '¡Hola de nuevo! 👋'}
              </h2>
              <p style={{ fontSize: '13px', color: '#999', fontWeight: 500, marginBottom: '24px', lineHeight: 1.5 }}>
                {isSignUp 
                  ? 'Únete a Boga y crea tu carta, catálogo o tienda local favorita en un clic.' 
                  : 'Ingresa para disfrutar, pedir o gestionar tus tiendas locales.'}
              </p>

              <form onSubmit={handleSubmit}>
                {/* Full Name for Signup */}
                {isSignUp && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Nombre Completo</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '14px', pointerEvents: 'none' }}>👤</span>
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Juan Pérez" style={inputStyle}
                        onFocus={(e) => { e.target.style.backgroundColor = '#fff'; e.target.style.borderColor = '#ddd'; }}
                        onBlur={(e) => { e.target.style.backgroundColor = '#f5f5f5'; e.target.style.borderColor = 'transparent'; }}
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Correo Electrónico</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '15px', pointerEvents: 'none' }}>✉</span>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@gmail.com" style={inputStyle}
                      onFocus={(e) => { e.target.style.backgroundColor = '#fff'; e.target.style.borderColor = '#ddd'; }}
                      onBlur={(e) => { e.target.style.backgroundColor = '#f5f5f5'; e.target.style.borderColor = 'transparent'; }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#444' }}>Contraseña</label>
                    {!isSignUp && (
                      <Link href="#" style={{ fontSize: '11px', fontWeight: 700, color: '#000', textDecoration: 'none' }}>¿La olvidaste?</Link>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '13px', pointerEvents: 'none' }}>🔒</span>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••" style={inputStyle}
                      onFocus={(e) => { e.target.style.backgroundColor = '#fff'; e.target.style.borderColor = '#ddd'; }}
                      onBlur={(e) => { e.target.style.backgroundColor = '#f5f5f5'; e.target.style.borderColor = 'transparent'; }}
                    />
                  </div>
                </div>

                {/* Remember */}
                {!isSignUp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <input type="checkbox" id="remember" style={{ width: '14px', height: '14px', accentColor: '#000', cursor: 'pointer' }} />
                    <label htmlFor="remember" style={{ fontSize: '12px', fontWeight: 600, color: '#777', cursor: 'pointer' }}>Recordarme en este dispositivo</label>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={isLoading} style={{
                  width: '100%', padding: '13px',
                  backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                  cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)', transition: 'all 0.2s',
                  marginTop: isSignUp ? '20px' : '0px',
                }}>
                  {isLoading ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      {isSignUp ? 'Creando cuenta...' : 'Iniciando sesión...'}
                    </>
                  ) : isSignUp ? 'Crear cuenta →' : 'Entrar →'}
                </button>
              </form>

              <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#aaa', fontWeight: 500 }}>
                  {isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}{' '}
                  <span 
                    onClick={() => setIsSignUp(!isSignUp)}
                    style={{ color: '#000', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {isSignUp ? 'Inicia sesión' : 'Regístrate gratis'}
                  </span>
                </p>
              </div>
            </div>

            <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: '#ccc', fontWeight: 500 }}>
              © 2026 Boga Market Inc. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) { .login-left-panel { display: flex !important; } }
      `}</style>
    </>
  );
}
