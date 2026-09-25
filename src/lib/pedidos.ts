// Registro de los pedidos de la carta (ver src/app/api/pedidos/route.ts).
//
// Es un registro extra: el pedido por WhatsApp sale igual aunque esto falle. Se manda solo
// qué productos y cuántos; el servidor pone los precios leyéndolos de la base.

export interface DatosPedido {
  /** Productos del carrito. Los que no existen en la base (ejemplos de plantilla) el servidor los descarta. */
  items: { id: string; quantity: number }[];
  cliente?: { nombre?: string; telefono?: string; direccion?: string; entrega?: 'delivery' | 'recojo' };
}

// products.id es texto (UUID o número). Los ejemplos de plantilla (demo-…) no existen en la base.
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

// Código corto de cada pedido (sin letras que se confunden). Va en el enlace /pedido/<código> y en el PDF.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
export function generarCodigoPedido(largo = 8): string {
  const b = new Uint8Array(largo);
  crypto.getRandomValues(b);
  return Array.from(b, (n) => ALFABETO[n % ALFABETO.length]).join('');
}

/** Guarda el pedido sin esperar respuesta y sin molestar al cliente si falla. */
export function registrarPedido(slug: string, pedido: DatosPedido, codigo?: string): void {
  try {
    const items = pedido.items.filter((i) => ID_VALIDO.test(String(i.id)) && !String(i.id).startsWith('demo-') && i.quantity > 0);
    if (!slug || items.length === 0) return;
    void fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store: slug, items, cliente: pedido.cliente, codigo }),
      keepalive: true,   // sigue viajando aunque la pestaña se vaya a WhatsApp
    }).catch(() => {});
  } catch { /* nunca debe romper el pedido */ }
}

// Historial de pedidos del cliente en ESTE dispositivo (sin cuenta): guarda el código de cada pedido para
// listarlos en "Mis pedidos" del perfil. El estado se lee en vivo de /api/pedido/<código>.
export type PedidoLocal = { codigo: string; tienda: string; slug: string; fecha: string };
const CLAVE_MIS_PEDIDOS = 'boga_mis_pedidos';

export function leerMisPedidos(): PedidoLocal[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_MIS_PEDIDOS) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function guardarMiPedido(p: Omit<PedidoLocal, 'fecha'>): void {
  try {
    const lista = [{ ...p, fecha: new Date().toISOString() }, ...leerMisPedidos()].slice(0, 30);
    localStorage.setItem(CLAVE_MIS_PEDIDOS, JSON.stringify(lista));
  } catch { /* sin storage: el pedido igual salió */ }
}
