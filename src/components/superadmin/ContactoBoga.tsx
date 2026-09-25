'use client';

// Contacto de Boga que se usa donde haga falta un asesor: hoy el botón flotante de WhatsApp de /negocios.
// Se guarda en site_settings (clave 'whatsapp_asesor'). Si se deja vacío, el botón no aparece.

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
    setMensaje(n ? '✅ Guardado. El botón aparece en /negocios en unos minutos.' : '✅ Quitado. El botón ya no se muestra.');
  };

  return (
    <div className="p-4 bg-white border border-[#c2c6d6] rounded-md flex flex-col gap-2">
      <h3 className="text-sm font-bold text-[#191b23]">Contacto de Boga</h3>
      <p className="text-xs text-[#424754]">
        WhatsApp del asesor. Con él aparece el botón flotante «¿Dudas? Habla con un asesor» en /negocios. Vacío = no se muestra.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="tel"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="987 654 321"
          className="flex-1 min-w-[180px] h-10 px-3 rounded-md border border-[#c2c6d6] text-sm outline-none focus:border-[#0058be]"
        />
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="h-10 px-4 bg-[#0058be] text-white font-bold text-xs rounded-md disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {mensaje && <p className="text-xs font-semibold text-[#424754]">{mensaje}</p>}
    </div>
  );
}
