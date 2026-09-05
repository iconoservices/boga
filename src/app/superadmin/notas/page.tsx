'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEsSuperadmin } from '@/lib/superadmin';

// Mismo candado que /superadmin. No es contenido de producto, son notas
// internas de estrategia — por eso vive fuera de cualquier ruta que un
// usuario común pueda llegar a ver.

const PERFILES = [
  {
    perfil: 'El Pucallpino Despistado',
    perfilNota: 'Sabe moverse pero no tiene planes',
    ruta: 'Ruta "Salir de la rutina"',
    rutaNota: 'Planes de fin de semana, nuevos huariques, datos caletas',
    lugares: 'Agroturismo en Campo Verde, nuevas cebicherías en Manantay, tardecitas de chill en Yarinacocha lejos de lo de siempre.',
  },
  {
    perfil: 'El Turista Extranjero',
    perfilNota: 'Busca full seguridad y logística resuelta',
    ruta: 'Ruta "Amazonía Segura"',
    rutaNota: 'Agencias formales, transporte directo desde la app, hoteles recomendados',
    lugares: 'Paseo en bote en la Laguna de Yarinacocha (con motorista certificado), visita a la comunidad nativa de San Francisco, cena en restaurantes top del centro.',
  },
];

// Historias que se escribieron para probar el formato de Revista, con
// nombres y personas inventados. Se sacaron de la Revista pública (donde
// se mezclaban con las notas reales) y quedan acá para adaptarlas con gente
// real, o usarlas de inspiración para notas nuevas con esa misma temática.
const IDEAS_HISTORIAS = [
  {
    titulo: 'El último maestro del bote de madera en Yarinacocha',
    tema: 'Un artesano que sigue construyendo peque-peques de madera a mano, oficio que se está perdiendo frente a los de fibra de vidrio.',
    personajeInventado: 'Aurelio Sangama',
  },
  {
    titulo: 'Un fotógrafo detrás del foco: aficiones, sueños y recuerdos',
    tema: 'Perfil de estilo de vida de un fotógrafo local: sus viajes, rutinas y lo que hay detrás de sus fotos.',
    personajeInventado: 'Stefano Klima',
  },
  {
    titulo: 'La señora que alimenta a media cuadra desde su ventana',
    tema: 'Una vecina que cocina de más y comparte comida con quien pase con hambre — solidaridad de barrio, sin que sea "caridad" para ella.',
    personajeInventado: 'doña Rosa',
  },
];

const GANCHOS = [
  {
    trigger: 'Si el extranjero ve en el itinerario: "Paso 1: Ir a Yarinacocha"',
    boton: '🚕 Pedir Taxi Seguro hacia Yarina aquí',
  },
  {
    trigger: 'Si el pucallpino ve "Los 3 huariques secretos del tacacho"',
    boton: '🍗 Pedir delivery de este huarique ahora',
  },
];

export default function NotasInternas() {
  const { user } = useAuth();
  const { esSuperadmin: isSuperadmin, cargando: loading } = useEsSuperadmin();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (!isSuperadmin) { router.replace('/admin'); }
  }, [loading, user, isSuperadmin, router]);

  if (loading || !user || !isSuperadmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-2 border-[#c2c6d6] border-t-[#0058be] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-white px-6 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        <div>
          <h1 className="text-2xl font-bold">Notas internas · Guía de Pucallpa</h1>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Perfiles de usuario e itinerarios</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-white/60">
                  <th className="px-4 py-3 font-semibold">Perfil del Usuario</th>
                  <th className="px-4 py-3 font-semibold">Enfoque del Itinerario</th>
                  <th className="px-4 py-3 font-semibold">Lugares / Experiencias Clave</th>
                </tr>
              </thead>
              <tbody>
                {PERFILES.map((p) => (
                  <tr key={p.perfil} className="border-b border-white/10 last:border-0 align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold">{p.perfil}</div>
                      <div className="text-white/50 italic text-xs mt-0.5">{p.perfilNota}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{p.ruta}</div>
                      <div className="text-white/50 text-xs mt-0.5">({p.rutaNota})</div>
                    </td>
                    <td className="px-4 py-4 text-white/80">{p.lugares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">💡 El "Gancho de Negocio" para el Marketplace</h2>
          <p className="text-white/70 text-sm">
            El secreto para que el itinerario genere dinero o descargas es <strong>conectar la guía con los servicios</strong>:
          </p>
          <ol className="flex flex-col gap-3 list-decimal list-inside text-sm">
            {GANCHOS.map((g, i) => (
              <li key={i} className="text-white/80">
                {g.trigger}, abajo debe haber un botón gigante que diga:
                <div className="mt-1.5 inline-block bg-primary text-white font-semibold px-3 py-1.5 rounded-lg text-xs">
                  [ {g.boton} ]
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">📝 Ideas de historias (con personajes inventados — sacadas de la Revista pública)</h2>
          <p className="text-white/70 text-sm">
            Se escribieron para probar el formato "artículo" de Revista, pero el personaje central es inventado — no es honesto dejarlas mezcladas con notas reales. Quedan acá como inspiración: se pueden adaptar con una persona real, o reescribir el tema con datos reales sin un protagonista específico.
          </p>
          <div className="flex flex-col gap-3">
            {IDEAS_HISTORIAS.map((h) => (
              <div key={h.titulo} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="font-semibold">{h.titulo}</div>
                <div className="text-white/60 text-sm mt-1">{h.tema}</div>
                <div className="text-white/40 text-xs mt-2 italic">Personaje inventado en el borrador original: {h.personajeInventado}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
