'use client';

// Paso de registro de negocio — página propia (no embebida en la landing).
// Split-screen: panel de marca a la izquierda (escritorio) + formulario a la
// derecha. Se llega desde los CTA de /negocios. Acepta ?i=tienda|marketplace|
// ambos para pre-seleccionar "¿Qué te interesa?".

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RegistroNegocio from '@/components/RegistroNegocio';

const VALID = ['tienda', 'marketplace', 'ambos'];

export default function RegistroNegocioPage() {
  const [interest, setInterest] = useState('');

  useEffect(() => {
    try {
      const i = new URLSearchParams(window.location.search).get('i');
      if (i && VALID.includes(i)) setInterest(i);
    } catch { /* noop */ }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#fff' }}>
      {/* ── Panel de marca (izquierda, solo escritorio) ── */}
      <div
        className="rn-brand"
        style={{
          display: 'none', width: '46%', backgroundColor: '#0a0a0a',
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center', padding: '56px',
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.9))' }} />
        <div style={{ position: 'absolute', top: '-12%', right: '-12%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,19,14,0.28), transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '400px' }}>
          <Link href="/" aria-label="Boga">
            <img src="/logo-mark.svg" alt="Boga" style={{ width: '48px', height: '48px', marginBottom: '26px' }} />
          </Link>
          <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '18px', letterSpacing: '-0.02em' }}>
            Digitaliza tu negocio con <span style={{ color: '#ff5c52' }}>Boga</span>.
          </h1>
          <p style={{ fontSize: '15px', color: '#b3b3b3', fontWeight: 500, lineHeight: 1.7 }}>
            Creamos tu catálogo y tu carta digital para que tus clientes vean todo tu negocio
            y te pidan directo por WhatsApp — sin que tengas que mandar fotos y precios uno
            por uno.
          </p>
          <div style={{ marginTop: '36px', display: 'flex', gap: '26px', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Sin código</p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nosotros lo armamos</p>
            </div>
            <div style={{ width: '1px', height: '36px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <div>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Directo</p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pedidos por WhatsApp</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Formulario (derecha) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fafafa', padding: '32px 24px 56px' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {/* Header compacto — el logo también en móvil, donde no hay panel */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <Link href="/negocios" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/logo-mark.svg" alt="" style={{ width: '30px', height: '30px' }} />
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>Boga</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#b8130e', backgroundColor: 'rgba(184,19,14,0.1)', padding: '2px 6px', borderRadius: '5px' }}>Negocios</span>
            </Link>
            <Link href="/negocios" style={{ fontSize: '12px', fontWeight: 600, color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
              Volver
            </Link>
          </div>

          {/* Titular — en móvil reemplaza al panel */}
          <h2 className="rn-mobile-title" style={{ fontSize: '24px', fontWeight: 800, color: '#111', lineHeight: 1.2, marginBottom: '6px', letterSpacing: '-0.01em' }}>
            Digitaliza tu negocio con <span style={{ color: '#b8130e' }}>Boga</span>
          </h2>
          <p className="rn-mobile-title" style={{ fontSize: '13px', color: '#777', fontWeight: 500, lineHeight: 1.55, marginBottom: '20px' }}>
            Creamos tu catálogo y carta digital para que tus clientes vean todo y te pidan por WhatsApp.
          </p>

          <RegistroNegocio interest={interest} setInterest={setInterest} />

          <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: '#bbb', fontWeight: 500 }}>
            © {new Date().getFullYear()} Boga. ·{' '}
            <Link href="/negocios" style={{ color: '#999' }}>Ver todo lo que incluye</Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .rn-brand { display: flex !important; }
          .rn-mobile-title { display: none; }
        }
      `}</style>
    </div>
  );
}
