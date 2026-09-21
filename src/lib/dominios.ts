// Alta / baja automática de <tienda>.bogahub.app cuando se prende o apaga el
// interruptor "Subdominio propio" de una tienda.
//
// Cada subdominio se da de alta como dominio individual (no comodín):
//  1. En Vercel, como dominio del proyecto (Vercel emite su certificado).
//  2. En Cloudflare, un CNAME con proxy hacia Vercel (el certificado de
//     Cloudflare ya cubre *.bogahub.app en el borde).
//
// Variables de entorno (en Vercel, nunca en el código):
//   VERCEL_API_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID (solo si el proyecto es de un equipo)
//   CLOUDFLARE_ZONE_ID y un token de Cloudflare con permiso "DNS: Edit" en
//   CLOUDFLARE_DNS_TOKEN (o, si no existe, CLOUDFLARE_API_TOKEN con ese permiso agregado)
//   VERCEL_CNAME_TARGET (opcional, por defecto cname.vercel-dns.com)

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');
const DOMINIO_BASE = new URL(SITIO).host;

const RESERVADOS = new Set(['www', 'tiendas', 'fotos', 'api', 'admin', 'app', 'mail', 'cdn', 'static', 'assets']);

export const slugValidoParaSubdominio = (slug: string) =>
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) && !RESERVADOS.has(slug);

const vercel = () => {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  const team = process.env.VERCEL_TEAM_ID;
  if (!token || !project) return null;
  const qs = team ? `?teamId=${encodeURIComponent(team)}` : '';
  return { token, project, qs };
};

const cloudflare = () => {
  const token = process.env.CLOUDFLARE_DNS_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zone) return null;
  return { token, zone };
};

type Resultado = { ok: boolean; detalle: string[] };

export async function activarSubdominio(slug: string): Promise<Resultado> {
  const detalle: string[] = [];
  const v = vercel();
  const cf = cloudflare();
  if (!v || !cf) return { ok: false, detalle: ['Faltan variables de entorno (Vercel o Cloudflare) para dar de alta el dominio.'] };
  const dominio = `${slug}.${DOMINIO_BASE}`;
  let ok = true;

  // 1) Vercel
  const rv = await fetch(`https://api.vercel.com/v10/projects/${v.project}/domains${v.qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${v.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: dominio }),
  });
  const jv = await rv.json().catch(() => ({}));
  if (rv.ok || jv?.error?.code === 'domain_already_in_use' || /already/i.test(jv?.error?.message || '')) {
    detalle.push(`Vercel: ${dominio} agregado.`);
  } else {
    ok = false;
    detalle.push(`Vercel: ${jv?.error?.message || rv.status}`);
  }

  // 2) Cloudflare (CNAME con proxy)
  const rc = await fetch(`https://api.cloudflare.com/client/v4/zones/${cf.zone}/dns_records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cf.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'CNAME',
      name: slug,
      content: process.env.VERCEL_CNAME_TARGET || 'cname.vercel-dns.com',
      proxied: true,
      ttl: 1,
      comment: 'Subdominio de tienda (plan de pago) — creado desde el superadmin',
    }),
  });
  const jc = await rc.json().catch(() => ({}));
  const yaExiste = (jc?.errors || []).some((e: { code: number }) => e.code === 81053 || e.code === 81057 || e.code === 81058);
  if (jc?.success || yaExiste) {
    detalle.push(`Cloudflare: DNS de ${dominio} listo.`);
  } else {
    ok = false;
    detalle.push(`Cloudflare: ${jc?.errors?.[0]?.message || rc.status}`);
  }
  return { ok, detalle };
}

export async function desactivarSubdominio(slug: string): Promise<Resultado> {
  const detalle: string[] = [];
  const v = vercel();
  const cf = cloudflare();
  if (!v || !cf) return { ok: false, detalle: ['Faltan variables de entorno (Vercel o Cloudflare) para dar de baja el dominio.'] };
  const dominio = `${slug}.${DOMINIO_BASE}`;
  let ok = true;

  const rv = await fetch(`https://api.vercel.com/v9/projects/${v.project}/domains/${encodeURIComponent(dominio)}${v.qs}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${v.token}` },
  });
  if (rv.ok || rv.status === 404) detalle.push(`Vercel: ${dominio} quitado.`);
  else { ok = false; detalle.push(`Vercel: ${rv.status}`); }

  const lista = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${cf.zone}/dns_records?type=CNAME&name=${encodeURIComponent(dominio)}`,
    { headers: { Authorization: `Bearer ${cf.token}` } },
  );
  const jl = await lista.json().catch(() => ({}));
  for (const rec of jl?.result || []) {
    const rd = await fetch(`https://api.cloudflare.com/client/v4/zones/${cf.zone}/dns_records/${rec.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${cf.token}` },
    });
    if (!rd.ok) { ok = false; detalle.push(`Cloudflare: no se pudo borrar el DNS (${rd.status}).`); }
  }
  if (ok) detalle.push(`Cloudflare: DNS de ${dominio} quitado.`);
  return { ok, detalle };
}
