import { NextResponse } from 'next/server';

// Cotización del día en soles, para SUGERIR precios en otras monedas en el panel del dueño (lib/monedas.ts).
// Fuente gratuita y sin clave: ExchangeRate-API (https://www.exchangerate-api.com), se actualiza una vez al día.
// Se guarda en caché 12 horas (la fuente cambia una vez al día) y el panel solo la pide cuando el dueño la necesita. Si falla, el panel sigue funcionando con el cambio que
// escribió el dueño: esto nunca cambia un precio por sí solo.
//
// GET /api/cambio?monedas=USD,MXN  ->  { fuente, fecha, tasas: { USD: 3.44, MXN: 0.19 } }  (soles que vale 1 de cada moneda)

export async function GET(req: Request) {
  const codigos = (new URL(req.url).searchParams.get('monedas') ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2,5}$/.test(c) && c !== 'PEN')
    .slice(0, 8);

  try {
    const r = await fetch('https://open.er-api.com/v6/latest/PEN', { next: { revalidate: 43200 } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    if (d?.result !== 'success' || !d.rates) throw new Error('respuesta inválida');

    // La fuente da cuántas unidades de cada moneda vale 1 sol; el panel necesita lo contrario (soles por 1 unidad).
    const tasas: Record<string, number> = {};
    for (const c of codigos) {
      const porSol = Number(d.rates[c]);
      if (porSol > 0) tasas[c] = Number((1 / porSol).toPrecision(4));
    }
    return NextResponse.json(
      { fuente: 'ExchangeRate-API', fecha: d.time_last_update_utc ?? null, tasas },
      { headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json({ error: 'cambio no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
