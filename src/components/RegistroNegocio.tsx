'use client';

// Formulario de alta de negocio. Vive en su propia página (/negocios/registro).
// Escribe a `store_requests` y, si la ciudad no está activa y quieren
// marketplace, también a `city_interest`.
//
// `interest` se controla desde afuera (la página lo pre-selecciona con ?i=).

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CIUDADES, esCiudadActiva, ciudadPorSlug } from '@/lib/ciudades';
import { detectarCiudad } from '@/lib/geo';

const CATEGORIES = ['Restaurantes', 'Mercado', 'Salud y Bienestar', 'Moda y Belleza', 'Moda', 'Servicios', 'Tecnología'];

const INTERESES = [
  { value: 'tienda',      label: 'Solo mi tienda propia (catálogo + link para compartir)' },
  { value: 'marketplace', label: 'Aparecer en Boga Market (que me descubran clientes nuevos)' },
  { value: 'ambos',       label: 'Ambos' },
];

const ACCENT = '#b8130e'; // rojo Boga (= --color-primary)

export default function RegistroNegocio({
  interest,
  setInterest,
}: {
  interest: string;
  setInterest: (v: string) => void;
}) {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [detectando, setDetectando] = useState(false);
  const [geoAviso, setGeoAviso] = useState('');
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
    color: '#111', transition: 'all 0.2s',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.backgroundColor = '#fff'; e.target.style.borderColor = '#ddd';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.backgroundColor = '#f5f5f5'; e.target.style.borderColor = 'transparent';
  };

  const detectarMiCiudad = async () => {
    setDetectando(true);
    setGeoAviso('');
    const r = await detectarCiudad();
    setDetectando(false);
    if (r.ok && r.slug) {
      setCity(r.slug);
    } else if (r.ok) {
      setGeoAviso('No ubicamos tu ciudad en la lista, elígela manualmente.');
    } else {
      setGeoAviso('Activa el permiso de ubicación o elige tu ciudad de la lista.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const { error } = await supabase.from('store_requests').insert({
      business_name: businessName,
      category,
      city: city || null,
      interest: interest || null,
      contact_name: contactName,
      whatsapp,
      email: email || null,
      description: description || null,
    });

    // Sin Boga Market en su ciudad + quiere marketplace → también cuenta como
    // demanda de esa plaza (para saber a dónde expandir).
    if (!error && city && !esCiudadActiva(city) && interest !== 'tienda') {
      const c = ciudadPorSlug(city);
      await supabase.from('city_interest').insert({
        city,
        region: c?.region || null,
        role: 'negocio',
        email: email || null,
        whatsapp: whatsapp || null,
        business_name: businessName || null,
        source: 'negocios',
      });
    }

    setIsLoading(false);
    if (error) {
      setErrorMsg('No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos.');
      return;
    }
    setIsSent(true);
  };

  const label: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '6px' };

  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '24px', padding: '32px',
      boxShadow: '0 4px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.05)',
    }}>
      {isSent ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: '56px', height: '56px', margin: '0 auto 16px', backgroundColor: '#fdecea', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: ACCENT, fontSize: '28px' }}>check_circle</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111', marginBottom: '8px' }}>¡Solicitud enviada!</h2>
          <p style={{ fontSize: '13px', color: '#999', fontWeight: 500, lineHeight: 1.6, marginBottom: '24px' }}>
            Recibimos los datos de <b>{businessName}</b>. Te contactaremos por WhatsApp para coordinar los siguientes pasos.
          </p>
          <Link href="/market" style={{
            display: 'inline-block', padding: '12px 24px', backgroundColor: '#111', color: '#fff',
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
            Cuéntanos de tu negocio y te contactamos para montarlo en Boga.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Nombre del negocio</label>
              <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej. Pollería Bravoz" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Categoría</label>
              <select required value={category} onChange={(e) => setCategory(e.target.value)}
                style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}>
                <option value="" disabled>Selecciona una categoría</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Ciudad</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select required value={city} onChange={(e) => { setCity(e.target.value); setGeoAviso(''); }}
                  style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}>
                  <option value="" disabled>Selecciona tu ciudad</option>
                  {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre} · {c.region}</option>)}
                </select>
                <button type="button" onClick={detectarMiCiudad} disabled={detectando}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '0 12px', borderRadius: '12px', border: '1.5px solid #ddd',
                    backgroundColor: '#fff', color: '#555', fontSize: '12px', fontWeight: 600,
                    cursor: detectando ? 'wait' : 'pointer',
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>my_location</span>
                  {detectando ? '...' : 'Ubicar'}
                </button>
              </div>
              {geoAviso && <p style={{ fontSize: '11px', color: '#b45309', fontWeight: 600, marginTop: '5px' }}>{geoAviso}</p>}
              {city && !esCiudadActiva(city) && (
                <p style={{ fontSize: '11px', color: '#666', fontWeight: 500, marginTop: '5px', lineHeight: 1.5 }}>
                  Boga Market todavía no opera en esta ciudad, pero puedes crear tu tienda propia igual.
                  Anotamos tu interés y te avisamos cuando lleguemos.
                </p>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>¿Qué te interesa?</label>
              <select required value={interest} onChange={(e) => setInterest(e.target.value)}
                style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}>
                <option value="" disabled>Selecciona una opción</option>
                {INTERESES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Tu nombre</label>
              <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)}
                placeholder="Juan Pérez" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>WhatsApp</label>
              <input type="tel" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+51 987 654 321" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Correo (opcional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@gmail.com" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={label}>Cuéntanos de tu negocio (opcional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Qué vendes, dónde estás ubicado..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={handleFocus} onBlur={handleBlur} />
            </div>

            {errorMsg && (
              <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, marginBottom: '14px' }}>{errorMsg}</p>
            )}

            <button type="submit" disabled={isLoading} style={{
              width: '100%', padding: '13px',
              backgroundColor: ACCENT, color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 6px 20px rgba(184,19,14,0.35)', transition: 'all 0.2s',
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
