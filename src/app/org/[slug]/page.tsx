'use client';

// Espacio de una discoteca/organizadora: datos reales de /api/organizers/<slug>
// (organizador + sus proximas noches). "Reservar" usa el flujo real de tickets
// (ReservaEntrada -> reservar_ticket). "Recuperar entrada" y "Acceso staff"
// siguen siendo MAQUETA: todavia no hay recuperacion por nombre/WhatsApp ni
// PINs de staff/promotores.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import ReservaEntrada from '@/components/ReservaEntrada';

type Org = { slug: string; nombre: string; tagline: string | null; color: string; logo: string | null };
type Noche = { id: string; titulo: string; dia: string | null; mes: string | null; precio: string | null; reservable: boolean; aforo: number | null };

export default function OrgEspacio() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [noches, setNoches] = useState<Noche[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no_existe'>('cargando');
  const [reservando, setReservando] = useState<Noche | null>(null);

  const [panel, setPanel] = useState<'recuperar' | 'staff' | null>(null);
  const [dato, setDato] = useState('');
  const [recuperada, setRecuperada] = useState(false);
  const [pin, setPin] = useState('');
  const [staffOk, setStaffOk] = useState(false);

  useEffect(() => {
    fetch(`/api/organizers/${slug}`)
      .then(async (r) => {
        const j = await r.json();
        if (!j.organizer) { setEstado('no_existe'); return; }
        setOrg(j.organizer);
        setNoches(j.noches ?? []);
        setEstado('ok');
      })
      .catch(() => setEstado('no_existe'));
  }, [slug]);

  const cerrarPanel = () => { setPanel(null); setDato(''); setRecuperada(false); setPin(''); setStaffOk(false); };

  if (estado !== 'ok' || !org) {
    return (
      <div className="fixed inset-0 z-[55] bg-[#0f0f10] text-white flex flex-col items-center justify-center gap-3">
        {estado === 'cargando' ? <p className="text-white/50 text-sm">Cargando…</p> : (
          <>
            <p>Esta organización no existe.</p>
            <Link href="/org" className="text-amber-400 underline text-sm">Volver al directorio</Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[55] overflow-y-auto bg-[#0f0f10] text-white">
      <div className="max-w-[720px] mx-auto px-4 py-6 flex flex-col gap-6">
        <Link href="/org" className="text-white/50 text-xs flex items-center gap-1 hover:text-white w-fit">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Directorio
        </Link>

        <header className="flex items-center gap-4">
          <span
            className="w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl shrink-0 border-2 overflow-hidden"
            style={{ borderColor: org.color, color: org.color, background: `${org.color}1a` }}
          >
            {org.logo ? <img src={org.logo} alt={org.nombre} className="w-full h-full object-cover" /> : org.nombre.slice(0, 1)}
          </span>
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">{org.nombre}</h1>
            {org.tagline && <p className="text-sm text-white/60">{org.tagline}</p>}
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Próximas noches</h2>
          {noches.length === 0 && <p className="text-sm text-white/40">Todavía no hay noches publicadas.</p>}
          {noches.map((n) => (
            <div key={n.id} className="bg-[#1a1a1c] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="bg-white text-black rounded-xl px-3 py-2 text-center shrink-0">
                <span className="block font-extrabold text-xl leading-none">{n.dia}</span>
                <span className="block text-[10px] font-bold uppercase text-black/50">{n.mes}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold leading-tight">{n.titulo}</p>
                <p className="text-xs text-white/50 mt-0.5">
                  <span style={{ color: org.color }}>{n.precio}</span>
                  {n.aforo ? ` · aforo ${n.aforo}` : ''}
                </p>
              </div>
              {n.reservable && (
                <button
                  onClick={() => setReservando(n)}
                  className="text-sm font-bold px-4 py-2 rounded-full text-black active:scale-95 transition-transform"
                  style={{ background: org.color }}
                >
                  Reservar
                </button>
              )}
            </div>
          ))}
        </section>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setPanel('recuperar')}
            className="text-sm text-white/70 border border-white/15 rounded-full px-4 py-2 flex items-center justify-center gap-1.5 hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
            ¿Ya tienes tu entrada? Recupérala
          </button>
          <button
            onClick={() => setPanel('staff')}
            className="text-sm text-white/70 border border-white/15 rounded-full px-4 py-2 flex items-center justify-center gap-1.5 hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            Acceso staff
          </button>
        </div>
      </div>

      {reservando && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={() => setReservando(null)}>
          <div className="bg-white text-[#191b23] w-full sm:max-w-[400px] rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold">{reservando.titulo}</p>
            <ReservaEntrada eventoId={reservando.id} />
            <button onClick={() => setReservando(null)} className="text-xs text-[#424754] underline self-center">Cerrar</button>
          </div>
        </div>
      )}

      {panel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={cerrarPanel}>
          <div className="bg-[#1a1a1c] w-full sm:max-w-[400px] rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <span className="self-start text-[9px] font-bold uppercase tracking-widest bg-amber-400 text-black px-2 py-0.5 rounded-full">Maqueta</span>
            {panel === 'recuperar' && (
              <>
                <p className="font-bold">Recupera tu entrada</p>
                {!recuperada ? (
                  <>
                    <p className="text-xs text-white/50">Escribe el nombre con el que reservaste (o tu WhatsApp).</p>
                    <input
                      value={dato}
                      onChange={(e) => setDato(e.target.value)}
                      placeholder="Nombre o WhatsApp"
                      className="bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                    />
                    <button
                      disabled={!dato.trim()}
                      onClick={() => setRecuperada(true)}
                      className="text-black font-bold text-sm py-2.5 rounded-full disabled:opacity-40"
                      style={{ background: org.color }}
                    >
                      Buscar mi entrada
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-xs text-white/60">Encontramos 1 entrada a nombre de «{dato}»</p>
                    <div className="bg-white p-3 rounded-xl">
                      <QRCodeSVG value={`MAQUETA-${org.slug}-recuperada`} size={170} level="H" />
                    </div>
                    <p className="text-[11px] text-white/50">QR de ejemplo — la búsqueda real todavía no existe.</p>
                  </div>
                )}
              </>
            )}

            {panel === 'staff' && (
              <>
                <p className="font-bold">Acceso staff · {org.nombre}</p>
                {!staffOk ? (
                  <>
                    <p className="text-xs text-white/50">Ingresa tu PIN de puerta o de promotor. (Maqueta: cualquier PIN de 4+ dígitos sirve.)</p>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="PIN"
                      className="bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400 tracking-widest"
                    />
                    <button
                      disabled={pin.length < 4}
                      onClick={() => setStaffOk(true)}
                      className="text-black font-bold text-sm py-2.5 rounded-full disabled:opacity-40"
                      style={{ background: org.color }}
                    >
                      Entrar
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/eventos/validar"
                      className="text-black font-bold text-sm py-3 rounded-full flex items-center justify-center gap-1.5"
                      style={{ background: org.color }}
                    >
                      <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                      Escanear entrada
                    </Link>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-black/40 rounded-xl p-3">
                        <p className="text-2xl font-extrabold">87</p>
                        <p className="text-[10px] text-white/50 uppercase">Ingresaron hoy</p>
                      </div>
                      <div className="bg-black/40 rounded-xl p-3">
                        <p className="text-2xl font-extrabold">125</p>
                        <p className="text-[10px] text-white/50 uppercase">Faltan por llegar</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Ventas por promotor (ejemplo)</p>
                    {[['Carlos M.', 64], ['Andrea V.', 51], ['Luis P.', 38]].map(([n, v]) => (
                      <div key={n as string} className="flex items-center justify-between text-sm bg-black/30 rounded-lg px-3 py-2">
                        <span>{n}</span>
                        <span className="font-bold" style={{ color: org.color }}>{v} entradas</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <button onClick={cerrarPanel} className="text-xs text-white/40 underline self-center">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
