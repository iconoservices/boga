'use client';

// Alumnos de una academia (módulo `modulos.academia`): lista, alta a mano o por lista pegada, carnet con QR,
// asistencia de hoy y del mes, y el PIN para que el profesor tome asistencia sin entrar a este panel.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { hoyLima } from '@/lib/fechaLima';
import { moduloAcademia, type Modulos } from '@/lib/modulos';
import { normalizarCelular } from '@/lib/cliente';
import { enlaceAlumno, fechaCorta, horaLegibleLima, inicioDeMes, parsearAlumnos, type Alumno } from '@/lib/academia';

interface Marca { alumno_id: string; fecha: string; llegada_at: string }
interface Tienda { slug: string; name: string; modulos: Modulos | null }

const COLS_ALUMNO = 'id,store,nombre,grupo,telefono,email_padre,codigo,token,activo';
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const caja = 'bg-white border border-gray-100 rounded-xl shadow-sm';
const input = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10';

export default function AlumnosDueno() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tiendas, setTiendas] = useState<Tienda[] | null>(null);
  const [slug, setSlug] = useState('');
  const [alumnos, setAlumnos] = useState<Alumno[] | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);

  // Alta a mano
  const [nombre, setNombre] = useState('');
  const [grupo, setGrupo] = useState('');
  const [celular, setCelular] = useState('');
  const [correoPadre, setCorreoPadre] = useState('');
  // Correo del padre que se está editando en la ficha abierta (id del alumno → texto)
  const [correoEditando, setCorreoEditando] = useState<Record<string, string>>({});
  // Alta por lista
  const [lista, setLista] = useState('');
  const [grupoLista, setGrupoLista] = useState('');
  const [guardando, setGuardando] = useState(false);
  // PIN
  const [pin, setPin] = useState('');
  const [pinGuardado, setPinGuardado] = useState('');

  const hoy = hoyLima();
  const tienda = tiendas?.find((t) => t.slug === slug);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=/admin/alumnos');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase.from('stores').select('slug,name,modulos').eq('user_id', user.id).order('name').then(({ data }) => {
      const conModulo = ((data ?? []) as Tienda[]).filter((t) => moduloAcademia(t.modulos));
      setTiendas(conModulo);
      setSlug((s) => s || conModulo[0]?.slug || '');
    });
  }, [user]);

  const cargar = useCallback(async () => {
    if (!slug) return;
    setError('');
    const [a, m] = await Promise.all([
      supabase.from('alumnos').select(COLS_ALUMNO).eq('store', slug).order('nombre'),
      supabase.from('asistencias').select('alumno_id,fecha,llegada_at').eq('store', slug).gte('fecha', inicioDeMes(hoy)).order('fecha', { ascending: false }),
    ]);
    if (a.error) { setError('No se pudo leer la lista de alumnos. ¿Ya corriste el SQL de Academias en Supabase?'); setAlumnos([]); return; }
    setAlumnos((a.data ?? []) as Alumno[]);
    setMarcas((m.data ?? []) as Marca[]);
  }, [slug, hoy]);
  useEffect(() => { setAlumnos(null); cargar(); }, [cargar]);

  // El PIN se lee solo al elegir la academia: el refresco automático no debe pisar lo que se está escribiendo.
  useEffect(() => {
    if (!slug) return;
    supabase.from('academia_config').select('pin').eq('store', slug).maybeSingle().then(({ data }) => {
      const actual = (data as { pin?: string } | null)?.pin ?? '';
      setPinGuardado(actual);
      setPin(actual);
    });
  }, [slug]);

  // Refresco suave: mientras el profesor escanea, el dueño ve quién va llegando.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, 30_000);
    return () => clearInterval(id);
  }, [cargar]);

  const marcasPorAlumno = useMemo(() => {
    const mapa = new Map<string, Marca[]>();
    for (const m of marcas) mapa.set(m.alumno_id, [...(mapa.get(m.alumno_id) ?? []), m]);
    return mapa;
  }, [marcas]);

  const grupos = useMemo(() => Array.from(new Set((alumnos ?? []).map((a) => a.grupo).filter(Boolean) as string[])).sort(), [alumnos]);
  const visibles = (alumnos ?? []).filter((a) => a.activo && (!grupoFiltro || a.grupo === grupoFiltro));
  const llegaronHoy = visibles.filter((a) => marcasPorAlumno.get(a.id)?.some((m) => m.fecha === hoy)).length;

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(''), 3500); };

  const agregar = async (filas: { nombre: string; grupo: string; telefono: string; email: string }[]) => {
    if (!filas.length) return;
    setGuardando(true);
    setError('');
    const { error: e } = await supabase.from('alumnos').insert(filas.map((f) => ({ store: slug, nombre: f.nombre, grupo: f.grupo || null, telefono: f.telefono || null, email_padre: f.email || null })));
    setGuardando(false);
    if (e) { setError(`No se pudo guardar: ${e.message}`); return; }
    avisar(filas.length === 1 ? 'Alumno agregado' : `${filas.length} alumnos agregados`);
    await cargar();
  };

  const agregarUno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const tel = celular.trim() ? normalizarCelular(celular) : '';
    if (celular.trim() && !tel) { setError('El celular debe tener 9 dígitos y empezar con 9.'); return; }
    const correo = correoPadre.trim().toLowerCase();
    if (correo && !RE_EMAIL.test(correo)) { setError('El correo del padre no es válido.'); return; }
    await agregar([{ nombre: nombre.trim().slice(0, 80), grupo: grupo.trim().slice(0, 60), telefono: tel || '', email: correo }]);
    setNombre(''); setCelular(''); setCorreoPadre('');
  };

  const guardarCorreo = async (a: Alumno) => {
    const correo = (correoEditando[a.id] ?? a.email_padre ?? '').trim().toLowerCase();
    if (correo && !RE_EMAIL.test(correo)) { setError('El correo del padre no es válido.'); return; }
    const { error: e } = await supabase.from('alumnos').update({ email_padre: correo || null }).eq('id', a.id);
    if (e) { setError(`No se pudo guardar el correo: ${e.message}`); return; }
    avisar(correo ? 'Correo guardado' : 'Correo quitado');
    setCorreoEditando((prev) => { const { [a.id]: _quitado, ...resto } = prev; return resto; });
    cargar();
  };

  const importar = async () => {
    const filas = parsearAlumnos(lista, grupoLista.trim());
    if (!filas.length) { setError('No encontré nombres en la lista.'); return; }
    await agregar(filas);
    setLista('');
  };

  const darDeBaja = async (a: Alumno) => {
    if (!confirm(`¿Dar de baja a ${a.nombre}? Su carnet deja de funcionar (se conserva su historial).`)) return;
    await supabase.from('alumnos').update({ activo: false }).eq('id', a.id);
    cargar();
  };

  const alternarHoy = async (a: Alumno) => {
    const marca = marcasPorAlumno.get(a.id)?.find((m) => m.fecha === hoy);
    if (marca) await supabase.from('asistencias').delete().eq('alumno_id', a.id).eq('fecha', hoy);
    else await supabase.from('asistencias').insert({ alumno_id: a.id, store: slug, fecha: hoy });
    cargar();
  };

  const copiarEnlace = async (a: Alumno) => {
    try { await navigator.clipboard.writeText(enlaceAlumno(a.token, window.location.origin)); avisar('Enlace copiado'); } catch { avisar('No se pudo copiar'); }
  };

  const mensajeWhatsApp = (a: Alumno) => {
    const texto = `Hola 👋 Este es el carnet de ${a.nombre} en ${tienda?.name ?? 'la academia'}.\n\nGuárdalo en tu celular: al llegar a clase se muestra el código QR al profesor, y aquí mismo puedes ver su asistencia.\n\n${enlaceAlumno(a.token, window.location.origin)}`;
    const tel = a.telefono ? `51${a.telefono}` : '';
    return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
  };

  const guardarPin = async () => {
    const limpio = pin.trim();
    if (limpio && !/^\d{4,8}$/.test(limpio)) { setError('El PIN debe tener de 4 a 8 números.'); return; }
    const { error: e } = await supabase.from('academia_config').upsert({ store: slug, pin: limpio || null }, { onConflict: 'store' });
    if (e) { setError(`No se pudo guardar el PIN: ${e.message}`); return; }
    setPinGuardado(limpio);
    avisar(limpio ? 'PIN guardado' : 'PIN quitado');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-[860px] mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/admin" className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Mi panel
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold truncate">Alumnos</span>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-4 py-6 flex flex-col gap-5">
        {tiendas === null ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : tiendas.length === 0 ? (
          <div className={`${caja} p-5 text-sm text-gray-600`}>
            Ninguna de tus tiendas tiene activado el módulo de Academia. Pídele a Boga que lo prenda para tu academia.
          </div>
        ) : (
          <>
            {tiendas.length > 1 && (
              <select value={slug} onChange={(e) => setSlug(e.target.value)} className={input}>
                {tiendas.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </select>
            )}

            {aviso && <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-3 py-2">{aviso}</div>}
            {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-3 py-2">{error}</div>}

            {/* Resumen y acción principal */}
            <div className={`${caja} p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between`}>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Hoy</p>
                <p className="text-2xl font-extrabold leading-tight">
                  {llegaronHoy} <span className="text-base font-bold text-gray-500">de {visibles.length} {grupoFiltro ? `en ${grupoFiltro}` : 'alumnos'} llegaron</span>
                </p>
              </div>
              <Link
                href={`/academia/asistencia/${slug}`}
                className="bg-black text-white rounded-lg px-4 py-3 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span> Tomar asistencia
              </Link>
            </div>

            {/* PIN del profesor */}
            <div className={`${caja} p-4 flex flex-col gap-2`}>
              <p className="font-bold text-sm">PIN del profesor</p>
              <p className="text-xs text-gray-500">
                Con este PIN el profesor abre <span className="font-mono">/academia/asistencia/{slug}</span> en su celular y toma asistencia, sin ver el resto de tu panel.
              </p>
              <div className="flex gap-2">
                <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" placeholder="4 a 8 números" className={input} />
                <button onClick={guardarPin} disabled={pin.trim() === pinGuardado} className="bg-gray-900 text-white rounded-lg px-4 text-sm font-bold disabled:opacity-40 shrink-0">Guardar</button>
              </div>
            </div>

            {/* Agregar alumnos */}
            <div className={`${caja} p-4 flex flex-col gap-3`}>
              <p className="font-bold text-sm">Agregar alumno</p>
              <form onSubmit={agregarUno} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del alumno" className={input} required />
                <input value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Grupo (ej. Infantil)" list="grupos-academia" className={input} />
                <input value={correoPadre} onChange={(e) => setCorreoPadre(e.target.value)} type="email" placeholder="Correo del padre (para que vea a su hijo en la app)" className={input} />
                <input value={celular} onChange={(e) => setCelular(e.target.value)} inputMode="tel" placeholder="Celular del padre (para enviarle el carnet)" className={input} />
                <button disabled={guardando} className="sm:col-span-2 bg-black text-white rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50">Agregar alumno</button>
                <datalist id="grupos-academia">{grupos.map((g) => <option key={g} value={g} />)}</datalist>
              </form>

              <details className="group">
                <summary className="text-sm font-bold text-blue-700 cursor-pointer select-none">Importar una lista (pegar desde Excel o WhatsApp)</summary>
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs text-gray-500">Una línea por alumno: <span className="font-mono">Nombre, Grupo, Celular, Correo del padre</span>. Solo el nombre es obligatorio y el resto puede ir en cualquier orden.</p>
                  <textarea
                    value={lista}
                    onChange={(e) => setLista(e.target.value)}
                    rows={6}
                    placeholder={'Mateo Quispe, Infantil, 987654321\nLucía Ramos, Juvenil\nDiego Torres'}
                    className={`${input} font-mono`}
                  />
                  <div className="flex gap-2">
                    <input value={grupoLista} onChange={(e) => setGrupoLista(e.target.value)} placeholder="Grupo para los que no lo traen (opcional)" className={input} />
                    <button onClick={importar} disabled={guardando || !lista.trim()} className="bg-black text-white rounded-lg px-4 text-sm font-bold disabled:opacity-40 shrink-0">
                      Importar {lista.trim() ? `(${parsearAlumnos(lista).length})` : ''}
                    </button>
                  </div>
                </div>
              </details>
            </div>

            {/* Lista */}
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">Alumnos {alumnos ? `(${visibles.length})` : ''}</p>
              {grupos.length > 0 && (
                <select value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                  <option value="">Todos los grupos</option>
                  {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
            </div>

            {alumnos === null ? (
              <p className="text-sm text-gray-500">Cargando…</p>
            ) : visibles.length === 0 ? (
              <div className={`${caja} p-5 text-sm text-gray-500 text-center`}>Aún no hay alumnos. Agrega el primero arriba o importa tu lista.</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibles.map((a) => {
                  const suyas = marcasPorAlumno.get(a.id) ?? [];
                  const deHoy = suyas.find((m) => m.fecha === hoy);
                  const desplegado = abierto === a.id;
                  return (
                    <li key={a.id} className={`${caja} overflow-hidden`}>
                      <div className="p-3 flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[22px] p-1 rounded-full shrink-0 ${deHoy ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {deHoy ? 'check' : 'remove'}
                        </span>
                        <button onClick={() => setAbierto(desplegado ? null : a.id)} className="min-w-0 flex-1 text-left">
                          <span className="block font-bold text-sm leading-tight truncate">{a.nombre}</span>
                          <span className="block text-[11px] text-gray-500">
                            {[a.grupo, deHoy ? `llegó ${horaLegibleLima(deHoy.llegada_at)}` : null, `${suyas.length} este mes`].filter(Boolean).join(' · ')}
                          </span>
                        </button>
                        <a href={mensajeWhatsApp(a)} target="_blank" rel="noreferrer" title="Enviar carnet por WhatsApp" className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">send</span>
                        </a>
                        <button onClick={() => setAbierto(desplegado ? null : a.id)} className="text-gray-400 shrink-0">
                          <span className="material-symbols-outlined text-[22px]">{desplegado ? 'expand_less' : 'expand_more'}</span>
                        </button>
                      </div>
                      {desplegado && (
                        <div className="border-t border-gray-100 bg-gray-50 p-3 flex flex-col gap-3">
                          <div className="flex flex-wrap gap-2">
                            <a href={enlaceAlumno(a.token)} target="_blank" rel="noreferrer" className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">badge</span> Ver carnet
                            </a>
                            <button onClick={() => copiarEnlace(a)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">content_copy</span> Copiar enlace
                            </button>
                            <button onClick={() => alternarHoy(a)} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">{deHoy ? 'undo' : 'how_to_reg'}</span> {deHoy ? 'Quitar asistencia de hoy' : 'Marcar presente hoy'}
                            </button>
                            <button onClick={() => darDeBaja(a)} className="bg-white border border-red-200 text-red-600 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">person_remove</span> Dar de baja
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {a.telefono ? `Celular del padre: ${a.telefono}` : 'Sin celular del padre: el botón de WhatsApp abre sin destinatario para que elijas el contacto.'}
                          </p>
                          <div className="flex flex-col gap-1.5">
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Correo del padre</p>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={correoEditando[a.id] ?? a.email_padre ?? ''}
                                onChange={(e) => setCorreoEditando((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                placeholder="padre@correo.com"
                                className={input}
                              />
                              <button
                                onClick={() => guardarCorreo(a)}
                                disabled={(correoEditando[a.id] ?? a.email_padre ?? '') === (a.email_padre ?? '')}
                                className="bg-gray-900 text-white rounded-lg px-3 text-xs font-bold disabled:opacity-40 shrink-0"
                              >Guardar</button>
                            </div>
                            <p className="text-[11px] text-gray-500">
                              Si el padre inicia sesión en la app con este correo, su hijo le aparece solo.
                              {a.codigo && <> Si usa otro correo, que ponga el código <span className="font-mono font-bold text-gray-800 tracking-widest">{a.codigo}</span> en la app para vincularlo.</>}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Asistencia de este mes</p>
                            {suyas.length === 0 ? (
                              <p className="text-xs text-gray-500">Sin asistencias este mes.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {suyas.map((m) => (
                                  <span key={m.fecha} className="bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] font-semibold capitalize">{fechaCorta(m.fecha)}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
