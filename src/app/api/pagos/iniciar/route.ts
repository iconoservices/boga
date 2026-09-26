import { clienteServicio } from '@/lib/pushServidor';
import { cargarConfigPagos, crearFormToken, URL_LIBRERIA_JS, URL_TEMA_CSS, URL_TEMA_JS } from '@/lib/izipay';

// Recibe el formulario de /pagar/<código> (código + correo del cliente), pide el formToken a Izipay con las claves de la
// tienda y responde una página con el formulario de pago oficial de Izipay incrustado (tarjeta / Yape).
//
// Es una página HTML propia (no React) a propósito: la librería de Izipay lee sus atributos (kr-public-key,
// kr-post-url-success) del <script> de la propia página, tal como en sus ejemplos oficiales.
// Al pagar, Izipay manda al cliente a /api/pagos/retorno con el resultado firmado.

export const dynamic = 'force-dynamic';

const CODIGO = /^[a-z0-9]{6,12}$/;
const CORREO = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const HEADERS = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin' };

const marco = (titulo: string, cuerpo: string, extraHead = '') => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(titulo)} · BogaHub</title>${extraHead}
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8f9fa;color:#191c1d}
  main{max-width:460px;margin:0 auto;padding:20px 16px 40px}
  .caja{background:#fff;border:1px solid #e1e3e4;border-radius:16px;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
  h1{font-size:18px;margin:0 0 4px} .sub{color:#5b403d;font-size:13px;margin:0 0 14px}
  .total{display:flex;justify-content:space-between;align-items:baseline;border-top:1px dashed #e1e3e4;margin-top:12px;padding-top:12px;font-weight:800}
  a{color:#b8130e;font-weight:700} .nota{font-size:11px;color:#777;text-align:center;margin-top:14px}
  .err{background:#fff1f0;border:1px solid #f3c1bd;color:#8c0009;border-radius:12px;padding:12px;font-size:14px}
</style></head><body><main>${cuerpo}<p class="nota">Pago seguro procesado por Izipay. BogaHub no guarda los datos de tu tarjeta.</p></main></body></html>`;

const pagina = (titulo: string, cuerpo: string, status = 200, extraHead = '') => new Response(marco(titulo, cuerpo, extraHead), { status, headers: HEADERS });
const error = (msg: string, codigo?: string) =>
  pagina('No se pudo iniciar el pago', `<div class="caja"><h1>No pudimos abrir el pago</h1><div class="err">${esc(msg)}</div><p style="margin-top:14px">${codigo ? `<a href="/pagar/${esc(codigo)}">← Volver e intentar de nuevo</a>` : '<a href="/">← Ir al inicio</a>'}</p></div>`, 400);

export async function POST(request: Request) {
  const db = clienteServicio();
  if (!db) return error('El servicio no está disponible por ahora.');

  const f = await request.formData().catch(() => null);
  const codigo = String(f?.get('codigo') ?? '').trim();
  const email = String(f?.get('email') ?? '').trim();
  if (!CODIGO.test(codigo)) return error('El pedido no es válido.');
  if (!CORREO.test(email)) return error('Escribe un correo válido: Izipay te envía ahí el comprobante del pago.', codigo);

  const { data: o } = await db.from('orders').select('store,total_amount,customer_name,customer_phone,pago_estado,items').eq('codigo', codigo).maybeSingle();
  if (!o || !o.pago_estado) return error('No encontramos ese pedido.');
  if (o.pago_estado === 'pagado') return Response.redirect(`${SITIO}/pedido/${codigo}`, 303);

  const cfg = await cargarConfigPagos(db, o.store as string);
  if (!cfg || !cfg.activo) return error('Esta tienda no tiene el cobro online disponible ahora. Escríbele por WhatsApp.');

  const r = await crearFormToken(cfg.cred, { monto: Number(o.total_amount), orderId: codigo, email, nombre: (o.customer_name as string) || undefined, telefono: (o.customer_phone as string) || undefined });
  if (!r.ok) {
    console.error('[pagos/iniciar] Izipay rechazó el formToken', o.store, r.codigo, r.mensaje);
    return error('El pago no se pudo abrir. Intenta de nuevo en un momento.', codigo);
  }

  const { data: t } = await db.from('stores').select('name').eq('slug', o.store).maybeSingle();
  const items = (Array.isArray(o.items) ? o.items : []) as { name: string; price: number; quantity: number }[];
  const lineas = items.map((i) => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0"><span>${esc(String(i.quantity))}× ${esc(i.name)}</span><span>S/ ${(i.price * i.quantity).toFixed(2)}</span></div>`).join('');

  // Tal cual el ejemplo oficial de Izipay: la librería con la clave pública y la URL de retorno como atributos del <script>.
  const head = `
<script type="text/javascript" src="${URL_LIBRERIA_JS}" kr-public-key="${esc(cfg.cred.publicKey)}" kr-post-url-success="${SITIO}/api/pagos/retorno" kr-language="es-ES"></script>
<link rel="stylesheet" href="${URL_TEMA_CSS}">
<script type="text/javascript" src="${URL_TEMA_JS}"></script>`;

  return pagina('Pagar', `
<div class="caja">
  <h1>${esc((t?.name as string) || 'Tu pedido')}</h1>
  <p class="sub">Pedido ${esc(codigo)} · paga con tarjeta o Yape</p>
  ${lineas}
  <div class="total"><span>Total</span><span>S/ ${Number(o.total_amount).toFixed(2)}</span></div>
</div>
<div class="caja" style="margin-top:14px">
  <div class="kr-embedded" kr-form-token="${esc(r.formToken)}"></div>
</div>
<p style="text-align:center;margin-top:14px"><a href="/pedido/${esc(codigo)}">← Volver al pedido</a></p>`, 200, head);
}
