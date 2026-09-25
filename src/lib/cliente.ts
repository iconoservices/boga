// Datos del cliente que pide en una carta (nombre y celular), recordados en su propio celular
// para no volver a escribirlos. El celular es lo que permite reconocer a un cliente que vuelve:
// de ahí salen lealtad, referidos, reseñas de quien sí compró, etc.

const CLAVE = 'boga_cliente';

export interface DatosCliente { nombre: string; telefono: string }

/**
 * Deja solo los 9 dígitos de un celular peruano (acepta +51, espacios y guiones).
 * Devuelve null si no parece un celular (debe empezar con 9 y tener 9 dígitos).
 */
export function normalizarCelular(texto: string): string | null {
  let d = (texto || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('51')) d = d.slice(2);
  return /^9\d{8}$/.test(d) ? d : null;
}

/** Lo último que escribió este cliente en cualquier carta de Boga (si el navegador lo permite). */
export function leerCliente(): DatosCliente | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v?.nombre === 'string' && typeof v?.telefono === 'string' ? { nombre: v.nombre, telefono: v.telefono } : null;
  } catch {
    return null;
  }
}

export function guardarCliente(datos: DatosCliente): void {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* navegador sin almacenamiento: no pasa nada */ }
}
