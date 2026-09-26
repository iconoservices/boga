// Lee en el SERVIDOR todo lo que muestra el Inicio "/" para dejarlo ya dentro del HTML.
//
// Antes el Inicio era todo de cliente: bajaba el JS, hidrataba y RECIÉN ahí pedía 10 endpoints, así que
// el contenido aparecía ~2 s después del primer byte. Ahora la página se genera en el servidor
// (revalidate en app/page.tsx) y el visitante recibe las secciones hechas.
//
// Reusa los mismos endpoints (importando su GET) y los mismos parseadores que usa el cliente, así hay
// una sola fuente de verdad. Si una sección falla se devuelve vacía y se anota en `fallidas`: el
// cliente la vuelve a pedir por su cuenta, igual que antes.

import { GET as catalogoGET } from '@/app/api/catalog/route';
import { GET as revistaGET } from '@/app/api/revista/route';
import { GET as eventosGET } from '@/app/api/eventos/route';
import { GET as lugaresGET } from '@/app/api/lugares/route';
import { GET as chambaGET } from '@/app/api/chamba/route';
import { GET as sorteosGET } from '@/app/api/sorteos/route';
import { GET as viajesGET } from '@/app/api/viajes/route';
import { GET as inmueblesGET } from '@/app/api/inmuebles/route';
import { GET as ventasGET } from '@/app/api/ventas/route';
import { parseNotasRevista } from '@/lib/revista';
import { parseEventos } from '@/lib/eventos';
import { parseLugares } from '@/lib/lugares';
import { parseChamba } from '@/lib/chamba';
import { parseSorteos } from '@/lib/sorteos';
import { parseViajes } from '@/lib/viajes';
import { parseAlquileres } from '@/lib/alquileres';
import { parseVentas } from '@/lib/ventas';
import {
  HOME_VACIO, armarCatalogoHome, armarChamba, armarInmuebles, armarNotas, armarPromos, armarQueHacer, armarViajes,
  type HomeData, type SeccionHome,
} from '@/lib/homeShape';

// Devuelve el JSON del endpoint, o null si falló (Supabase caído, 503…).
async function leer(llamar: () => Promise<Response> | Response): Promise<any> {
  try {
    const res = await llamar();
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const urlCatalogo = (query = '') => new Request(`http://boga.local/api/catalog${query}`);

export async function cargarHome(): Promise<HomeData> {
  const [revista, promos, catalogo, eventos, lugares, chamba, sorteos, viajes, inmuebles, ventas] = await Promise.all([
    leer(() => revistaGET()),
    leer(() => catalogoGET(urlCatalogo('?page=home'))),
    leer(() => catalogoGET(urlCatalogo())),
    leer(() => eventosGET()),
    leer(() => lugaresGET()),
    leer(() => chambaGET()),
    leer(() => sorteosGET()),
    leer(() => viajesGET()),
    leer(() => inmueblesGET()),
    leer(() => ventasGET()),
  ]);

  const fallidas: SeccionHome[] = [];
  const data: HomeData = { ...HOME_VACIO };

  if (revista) data.notas = armarNotas(parseNotasRevista(revista));
  else fallidas.push('revista');

  if (promos) {
    data.promos = armarPromos(promos.banners ?? []);
    data.bannerStyle = promos.bannerStyle || 'bottom';
  } else fallidas.push('promos');

  if (catalogo) Object.assign(data, armarCatalogoHome(catalogo.stores ?? [], catalogo.products ?? []));
  else fallidas.push('catalogo');

  if (eventos && lugares) data.queHacer = armarQueHacer(parseEventos(eventos), parseLugares(lugares));
  else fallidas.push('agenda');

  if (chamba) {
    const { empleos, oficios } = parseChamba(chamba);
    Object.assign(data, armarChamba(empleos, oficios));
  } else fallidas.push('chamba');

  if (sorteos) data.sorteos = parseSorteos(sorteos).filter((s) => s.status === 'abierto');
  else fallidas.push('sorteos');

  if (viajes) data.viajes = armarViajes(parseViajes(viajes));
  else fallidas.push('viajes');

  if (inmuebles && ventas) data.inmuebles = armarInmuebles(parseAlquileres(inmuebles), parseVentas(ventas));
  else fallidas.push('inmuebles');

  data.fallidas = fallidas;
  return data;
}
