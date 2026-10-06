// Academias: alumnos con carnet QR y asistencia. Ver supabase_setup.sql (bloque ACADEMIAS) y
// el módulo `modulos.academia`. Funciones sin dependencias del servidor: las usan el panel del dueño,
// la pantalla del profesor y el carnet del padre.

import { normalizarCelular } from '@/lib/cliente';

export interface Alumno {
  id: string;
  store: string;
  nombre: string;
  grupo: string | null;
  telefono: string | null;
  /** Correo del padre (minúscula): con él, los hijos le aparecen solos al iniciar sesión. */
  email_padre?: string | null;
  /** Código corto (6) para que un padre vincule a su hijo desde la app. */
  codigo?: string;
  token: string;
  activo: boolean;
}

/** El token es 32 caracteres hex (uuid sin guiones); se valida antes de tocar la base. */
export const TOKEN_ALUMNO = /^[a-f0-9]{32}$/;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');

/** Enlace privado del alumno (su carnet y su asistencia). */
export const enlaceAlumno = (token: string, origen?: string) => `${(origen || SITE_URL).replace(/\/$/, '')}/academia/alumno/${token}`;

/**
 * Convierte texto pegado en alumnos. Una línea por alumno: `Nombre, Grupo, Celular`
 * (separado por coma, punto y coma, tabulación —lo que sale de Excel— o barra vertical). Las columnas después del nombre
 * pueden ir en cualquier orden: lo que parece correo es el correo del padre, lo que parece celular es el celular y lo demás es el grupo.
 * Solo el nombre es obligatorio.
 */
export function parsearAlumnos(texto: string, grupoPorDefecto = ''): { nombre: string; grupo: string; telefono: string; email: string }[] {
  const salida: { nombre: string; grupo: string; telefono: string; email: string }[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const partes = linea.split(/[\t;,|]/).map((p) => p.trim()).filter((p, i) => p !== '' || i === 0);
    const nombre = (partes[0] || '').slice(0, 80);
    if (!nombre) continue;
    let grupo = '';
    let telefono = '';
    let email = '';
    for (const extra of partes.slice(1)) {
      const cel = normalizarCelular(extra);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extra) && !email) email = extra.toLowerCase().slice(0, 120);
      else if (cel && !telefono) telefono = cel;
      else if (extra && !grupo) grupo = extra.slice(0, 60);
    }
    salida.push({ nombre, grupo: grupo || grupoPorDefecto, telefono, email });
  }
  return salida.slice(0, 300);
}

/** Primer día del mes (AAAA-MM-DD) de una fecha AAAA-MM-DD. */
export const inicioDeMes = (fecha: string) => `${fecha.slice(0, 7)}-01`;

/** "6:05 pm" en hora de Perú. */
export const horaLegibleLima = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Lima' })
    .format(new Date(iso)).replace(/\s/g, ' ').toLowerCase().replace('a. m.', 'am').replace('p. m.', 'pm');

/** "lunes 6 de octubre" a partir de AAAA-MM-DD. */
export const fechaCorta = (f: string) => {
  const [y, m, d] = f.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};
