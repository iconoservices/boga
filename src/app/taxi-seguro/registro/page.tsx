'use client';

// Postulación de chofer para Taxi Seguro. Escribe a `driver_requests`; el
// superadmin revisa en /superadmin y, si aprueba, crea la ficha en `drivers`.
// Paleta verde propia de Taxi Seguro.

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CIUDADES } from '@/lib/ciudades';

const VERDE = '#00875A';
const TIPOS = ['Mototaxi', 'Auto', 'Moto'];

export default function RegistroChoferPage() {
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [tipo, setTipo] = useState('');
  const [placa, setPlaca] = useState('');
  const [zona, setZona] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '11px 14px',
    backgroundColor: '#f4f6f5', border: '1.5px solid transparent', borderRadius: '12px',
    outline: 'none', fontSize: '13px', fontWeight: 500, color: '#111', transition: 'all .2s',
  };
  const label: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#3a4a44', marginBottom: '6px' };
  const onFocus = (e: React.FocusEvent<HTMLElement>) => { (e.target as HTMLElement).style.backgroundColor = '#fff'; (e.target as HTMLElement).style.borderColor = VERDE; };
  const onBlur = (e: React.FocusEvent<HTMLElement>) => { (e.target as HTMLElement).style.backgroundColor = '#f4f6f5'; (e.target as HTMLElement).style.borderColor = 'transparent'; };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.from('driver_requests').insert({
      nombre, whatsapp, tipo: tipo || null, placa: placa || null,
      zona: zona || null, ciudad: ciudad || null,
      experiencia: experiencia || null, mensaje: mensaje || null,
    });
    setLoading(false);
    if (err) { setError('No pudimos enviar tu postulación. Intenta de nuevo en unos minutos.'); return; }
    setSent(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#fff', fontFamily: 'inherit' }}>
      {/* Panel de marca (escritorio) */}
      <div className="tsr-brand" style={{
        display: 'none', width: '44%', backgroundColor: '#04140d', position: 'sticky', top: 0,
        height: '100vh', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: '56px',
      }}>
        <img src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1200&q=80" alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.5), rgba(4,20,13,.92))' }} />
        <div style={{ position: 'absolute', top: '-12%', right: '-12%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,153,.22), transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '400px' }}>
          <Link href="/" aria-label="Boga">
            <img src="/logo-mark.svg" alt="Boga" style={{ width: '46px', height: '46px', marginBottom: '24px' }} />
          </Link>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Maneja con el <span style={{ color: '#00E599' }}>respaldo de tu barrio</span>.
          </h1>
          <p style={{ fontSize: '15px', color: '#9fb3ab', fontWeight: 500, lineHeight: 1.7 }}>
            Entra al padrón de choferes verificados de Boga. Los vecinos te contactan directo —
            sin comisiones, sin intermediarios.
          </p>
          <div style={{ marginTop: '34px', display: 'flex', gap: '24px' }}>
            <div>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Sin comisión</p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#6f8078', textTransform: 'uppercase', letterSpacing: '.1em' }}>El pasajero te paga directo</p>
            </div>
            <div style={{ width: '1px', height: '36px', backgroundColor: 'rgba(255,255,255,.15)' }} />
            <div>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Verificado</p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#6f8078', textTransform: 'uppercase', letterSpacing: '.1em' }}>DNI · SOAT · Placa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f7f9f8', padding: '32px 24px 56px' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <Link href="/taxi-seguro" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/logo-mark.svg" alt="" style={{ width: '30px', height: '30px' }} />
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>Boga</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: VERDE, backgroundColor: '#d3f1e4', padding: '2px 6px', borderRadius: '5px' }}>Taxi Seguro</span>
            </Link>
            <Link href="/taxi-seguro" style={{ fontSize: '12px', fontWeight: 600, color: '#7a8a83', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>Volver
            </Link>
          </div>

          <h2 className="tsr-mobile-title" style={{ fontSize: '24px', fontWeight: 800, color: '#111', lineHeight: 1.2, marginBottom: '6px' }}>
            Postúlate como chofer <span style={{ color: VERDE }}>verificado</span>
          </h2>
          <p className="tsr-mobile-title" style={{ fontSize: '13px', color: '#6f7c76', fontWeight: 500, lineHeight: 1.55, marginBottom: '20px' }}>
            Te contactamos por WhatsApp para revisar tus documentos (DNI, SOAT, licencia) y sumarte al padrón.
          </p>

          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 40px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.05)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '56px', height: '56px', margin: '0 auto 16px', backgroundColor: '#d3f1e4', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: VERDE, fontSize: '28px' }}>check_circle</span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111', marginBottom: '8px' }}>¡Postulación enviada!</h3>
                <p style={{ fontSize: '13px', color: '#999', fontWeight: 500, lineHeight: 1.6, marginBottom: '24px' }}>
                  Recibimos tus datos, <b>{nombre}</b>. Te escribimos por WhatsApp para pedirte tus documentos.
                </p>
                <Link href="/taxi-seguro" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: VERDE, color: '#fff', borderRadius: '12px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  Volver a Taxi Seguro
                </Link>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={label}>Tu nombre completo</label>
                  <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Luz Marina Rengifo" style={input} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={label}>WhatsApp</label>
                  <input type="tel" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+51 987 654 321" style={input} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Vehículo</label>
                    <select required value={tipo} onChange={(e) => setTipo(e.target.value)} style={input} onFocus={onFocus} onBlur={onBlur}>
                      <option value="" disabled>Elige</option>
                      {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Placa</label>
                    <input type="text" value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="4312-8U" style={input} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={label}>Ciudad</label>
                  <select required value={ciudad} onChange={(e) => setCiudad(e.target.value)} style={input} onFocus={onFocus} onBlur={onBlur}>
                    <option value="" disabled>Selecciona tu ciudad</option>
                    {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre} · {c.region}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={label}>Comité / zona / paradero</label>
                  <input type="text" value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Comité 14 · Yarinacocha" style={input} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={label}>Años de experiencia</label>
                  <input type="text" value={experiencia} onChange={(e) => setExperiencia(e.target.value)} placeholder="5 años transportando familias" style={input} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={label}>Algo más que quieras contarnos (opcional)</label>
                  <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3} placeholder="Rutas que cubres, horario, referencias…" style={{ ...input, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
                </div>
                {error && <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, marginBottom: '14px' }}>{error}</p>}
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', backgroundColor: VERDE, color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  boxShadow: '0 6px 20px rgba(0,135,90,.3)',
                }}>
                  {loading ? 'Enviando…' : 'Enviar postulación →'}
                </button>
              </form>
            )}
          </div>
          <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: '#aebdb7', fontWeight: 500 }}>
            © {new Date().getFullYear()} Boga. El directorio de choferes es y seguirá siendo gratis.
          </p>
        </div>
      </div>

      <style>{`@media (min-width: 1024px){ .tsr-brand{ display:flex !important } .tsr-mobile-title{ display:none } }`}</style>
    </div>
  );
}
