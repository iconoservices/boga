// Perfil de una empresa de servicios (plantilla "empresa"): lo que no es catálogo.
// Se guarda en UNA columna JSONB (`stores.perfil_empresa`) para no abrir una columna por cada texto:
// presentación, misión/visión, políticas, clientes (con logo), sectores, equipo, obras, brochure y correo de contacto.

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
  /** Logo de cada cliente, por el nombre exacto con el que está en `clientes`. Sin logo, el cliente sale como texto. */
  clienteLogos?: Record<string, string>;
  /** Sectores a los que atiende (petroleras, minería…). */
  sectores?: string[];
  /** Foto del equipo y un texto corto debajo. */
  equipoFoto?: string;
  equipoTexto?: string;
  /** Galería de obras: fotos de trabajos terminados (direcciones de imagen), aparte de las fotos de cada servicio. */
  obras?: string[];
  /** Brochure de la empresa (PDF): dirección del archivo. Prende el botón "Descargar brochure". */
  brochure?: string;
  /** Correo para cotizaciones: prende el botón "Cotizar por correo". */
  email?: string;
}

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esDireccion = (u: string) => /^https?:\/\//i.test(u) || u.startsWith('/');

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
  // Solo se conservan los logos de clientes que siguen en la lista (si se borra el cliente, su logo se va).
  const logosBrutos = r.clienteLogos && typeof r.clienteLogos === 'object' ? (r.clienteLogos as Record<string, unknown>) : {};
  const clienteLogos: Record<string, string> = {};
  for (const nombre of clientes) {
    const url = texto(logosBrutos[nombre], 500);
    if (url && esDireccion(url)) clienteLogos[nombre] = url;
  }
  const sectores = (Array.isArray(r.sectores) ? r.sectores : [])
    .map((x) => texto(x, 60))
    .filter(Boolean)
    .slice(0, 12);
  const obras = (Array.isArray(r.obras) ? r.obras : [])
    .map((o) => texto(o, 500))
    .filter(esDireccion)
    .slice(0, 24);
  const equipoFoto = texto(r.equipoFoto, 500);
  const brochure = texto(r.brochure, 500);
  const email = texto(r.email, 120);
  const perfil: PerfilEmpresa = {
    nosotros: texto(r.nosotros, 1500) || undefined,
    mision: texto(r.mision, 800) || undefined,
    vision: texto(r.vision, 800) || undefined,
    politicas: politicas.length ? politicas : undefined,
    clientes: clientes.length ? clientes : undefined,
    clienteLogos: Object.keys(clienteLogos).length ? clienteLogos : undefined,
    sectores: sectores.length ? sectores : undefined,
    equipoFoto: equipoFoto && esDireccion(equipoFoto) ? equipoFoto : undefined,
    equipoTexto: texto(r.equipoTexto, 400) || undefined,
    obras: obras.length ? obras : undefined,
    brochure: brochure && esDireccion(brochure) ? brochure : undefined,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
  };
  return Object.values(perfil).some(Boolean) ? perfil : null;
}
