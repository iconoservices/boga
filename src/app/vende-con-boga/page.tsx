'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const CATEGORIES = ['Restaurantes', 'Mercado', 'Salud y Bienestar', 'Moda y Belleza', 'Moda', 'Servicios', 'Tecnología'];

export default function VendeConBogaPage() {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [contactName, setContactName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px',
    backgroundColor: '#f5f5f5', border: '1.5px solid transparent',
    borderRadius: '12px', outline: 'none', fontSize: '13px', fontWeight: 500,
    fontFamily: "'Outfit', sans-serif", color: '#111', transition: 'all 0.2s',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.backgroundColor = '#fff'; e.target.style.borderColor = '#ddd';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.backgroundColor = '#f5f5f5'; e.target.style.borderColor = 'transparent';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const { error } = await supabase.from('store_requests').insert({
      business_name: businessName,
      category,
      contact_name: contactName,
      whatsapp,
      email: email || null,
      description: description || null,
    });

    setIsLoading(false);
    if (error) {
      setErrorMsg('No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos.');
      return;
    }
    setIsSent(true);
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', fontFamily: "'Outfit', sans-serif", backgroundColor: '#ffffff',
      }}>

        {/* ── Left: Branding Panel ── */}
        <div className="vcb-left-panel" style={{
          display: 'none', width: '50%', backgroundColor: '#000',
          position: 'relative', overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center', padding: '56px',
        }}>
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(82,68,225,0.18), transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%)' }} />

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '420px' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px', boxShadow: '0 25px 60px rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '26px', fontWeight: 900, color: '#000' }}>B</span>
            </div>
            <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '20px' }}>
              Lleva tu negocio{' '}
              <span style={{ color: '#8b5cf6' }}>a todo tu barrio</span>.
            </h1>
            <p style={{ fontSize: '16px', color: '#777', fontWeight: 500, lineHeight: 1.7 }}>
              Crea tu carta digital o catálogo en Boga Market. Nosotros lo montamos por ti y llegas a nuevos clientes desde el primer día.
            </p>
            <div style={{ marginTop: '40px', display: 'flex', gap: '28px', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Sin código</p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nosotros lo armamos</p>
              </div>
              <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div>
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Directo</p>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pedidos por WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Form Panel ── */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', backgroundColor: '#fafafa', overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>

            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', textDecoration: 'none' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#000', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
                <span style={{ color: '#fff', fontSize: '18px', fontWeight: 900 }}>B</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#111' }}>BOGA MARKET</span>
            </Link>

            {/* Card */}
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)' }}>
              {isSent ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: '56px', height: '56px', margin: '0 auto 16px', backgroundColor: '#f5f3ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#8b5cf6', fontSize: '28px' }}>check_circle</span>
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111', marginBottom: '8px' }}>¡Solicitud enviada!</h2>
                  <p style={{ fontSize: '13px', color: '#999', fontWeight: 500, lineHeight: 1.6, marginBottom: '24px' }}>
                    Recibimos los datos de <b>{businessName}</b>. Te contactaremos por WhatsApp para coordinar los siguientes pasos.
                  </p>
                  <Link href="/" style={{
                    display: 'inline-block', padding: '12px 24px', backgroundColor: '#000', color: '#fff',
                    borderRadius: '12px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                  }}>
                    Volver al inicio
                  </Link>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111', marginBottom: '4px' }}>
                    Registra tu negocio
                  </h2>
                  <p style={{ fontSize: '13px', color: '#999', fontWeight: 500, marginBottom: '24px', lineHeight: 1.5 }}>
                    Cuéntanos de tu negocio y te contactamos para montar tu tienda en Boga.
                  </p>

                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Nombre del negocio</label>
                      <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Ej. Pollería Bravoz" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Categoría</label>
                      <select required value={category} onChange={(e) => setCategory(e.target.value)}
                        style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}>
                        <option value="" disabled>Selecciona una categoría</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Tu nombre</label>
                      <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)}
                        placeholder="Juan Pérez" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' }}>WhatsApp</label>
                      <input type="tel" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="+51 987 654 321" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Correo (opcional)</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@gmail.com" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' }}>Cuéntanos de tu negocio (opcional)</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="Qué vendes, dónde estás ubicado..." rows={3}
                        style={{ ...inputStyle, resize: 'vertical', fontFamily: "'Outfit', sans-serif" }}
                        onFocus={handleFocus} onBlur={handleBlur} />
                    </div>

                    {errorMsg && (
                      <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, marginBottom: '14px' }}>{errorMsg}</p>
                    )}

                    <button type="submit" disabled={isLoading} style={{
                      width: '100%', padding: '13px',
                      backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '12px',
                      fontSize: '14px', fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                      cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.15)', transition: 'all 0.2s',
                    }}>
                      {isLoading ? (
                        <>
                          <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                          Enviando...
                        </>
                      ) : 'Enviar solicitud →'}
                    </button>
                  </form>
                </>
              )}
            </div>

            <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: '#ccc', fontWeight: 500 }}>
              © 2026 Boga Market Inc. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) { .vcb-left-panel { display: flex !important; } }
      `}</style>
    </>
  );
}
