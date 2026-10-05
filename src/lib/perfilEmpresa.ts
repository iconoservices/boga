// Perfil de una empresa de servicios (plantilla "empresa"): lo que no es catálogo.
// Se guarda en UNA columna JSONB (`stores.perfil_empresa`) para no abrir una columna por cada texto:
// presentación, misión/visión, políticas, clientes y correo de contacto.

export interface PoliticaEmpresa {
  titulo: string;
  texto: string;
}

export interface PerfilEmpresa {
  /** Presentación corta: quiénes somos y qué hacemos. */
  nosotros?: string;
  mision?: string;
  vision?: string;
  politicas?: PoliticaEmpresa[];
  clientes?: string[];
  /** Correo para cotizaciones: prende el botón "Cotizar por correo". */
  email?: string;
}

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Lo que llega de la base o del formulario, limpio y acotado. Devuelve null si no hay nada cargado. */
export function normalizarPerfilEmpresa(raw: unknown): PerfilEmpresa | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const politicas = (Array.isArray(r.politicas) ? r.politicas : [])
    .map((p) => ({ titulo: texto((p as any)?.titulo, 80), texto: texto((p as any)?.texto, 1500) }))
    .filter((p) => p.titulo && p.texto)
    .slice(0, 8);
  const clientes = (Array.isArray(r.clientes) ? r.clientes : [])
    .map((c) => texto(c, 100))
    .filter(Boolean)
    .slice(0, 30);
  const email = texto(r.email, 120);
  const perfil: PerfilEmpresa = {
    nosotros: texto(r.nosotros, 1500) || undefined,
    mision: texto(r.mision, 800) || undefined,
    vision: texto(r.vision, 800) || undefined,
    politicas: politicas.length ? politicas : undefined,
    clientes: clientes.length ? clientes : undefined,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
  };
  return Object.values(perfil).some(Boolean) ? perfil : null;
}
