'use client';

// Contacto de Boga que se usa donde haga falta un asesor: botones de avisos,
// trabajos, inmuebles, viajes, taxi y el botón flotante de /negocios.
// Se guarda en site_settings (clave 'whatsapp_asesor').

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const CLAVE = 'whatsapp_asesor';

export default function ContactoBoga() {
  const [numero, setNumero] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('valor').eq('clave', CLAVE).maybeSingle().then(({ data }) => {
      if (data?.valor) setNumero(String(data.valor));
    });
  }, []);

  const guardar = async () => {
    setGuardando(true); setMensaje('');
    let n = numero.replace(/\D/g, '');
    if (n.length === 9) n = '51' + n;        // celular peruano sin código de país
    if (n && n.length < 11) { setMensaje('Escribe el número completo (9 dígitos, o con el código de país).'); setGuardando(false); return; }
    const { error } = n
      ? await supabase.from('site_settings').upsert({ clave: CLAVE, valor: n, updated_at: new Date().toISOString() })
      : await supabase.from('site_settings').delete().eq('clave', CLAVE);
    setGuardando(false);
    if (error) { setMensaje('No se pudo guardar. ¿Corriste el SQL de site_settings en supabase_setup.sql?'); return; }
    setNumero(n);
    setMensaje(n ? '✅ Guardado correctamente. Actualizado en toda la plataforma.' : '✅ Quitado.');
  };

  return (
    <div className="p-4 bg-white border border-[#c2c6d6] rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-[#191b23] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0058be] text-[20px]">phone_in_talk</span>
          Número general / WhatsApp de BogaHub
        </h3>
        <p className="text-xs text-[#424754]">
          WhatsApp de contacto oficial (usado para publicar avisos, soporte y hablar con un asesor).
        </p>
        {mensaje && <p className="text-xs font-semibold text-emerald-700 mt-0.5">{mensaje}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="tel"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Ej. 987 654 321"
          className="w-48 h-10 px-3 rounded-lg border border-[#c2c6d6] text-sm font-bold outline-none focus:border-[#0058be]"
        />
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="h-10 px-5 bg-[#0058be] hover:bg-[#0047a0] text-white font-bold text-xs rounded-lg disabled:opacity-60 transition-colors shadow-sm"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
