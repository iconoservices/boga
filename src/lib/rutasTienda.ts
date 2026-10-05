// Cada pestaña de una tienda tiene su propia dirección: /<tienda>/servicios, /<tienda>/obras, /<tienda>/contacto…
// El segmento de la dirección es el id de la pestaña de la plantilla. La pestaña inicial vive en /<tienda> (sin segmento).
//
// Una plantilla participa si está en RUTAS_PLANTILLA Y usa el hook `useTabRuta` (templates/shared/useTabRuta.ts) para su pestaña
// activa. Las que todavía no están aquí siguen como antes: una sola dirección con pestañas internas.

export interface SeccionRuta {
  /** Texto del título de la página para Google ("<título> · <tienda>"). */
  titulo: string;
  /** false = no se indexa (p. ej. el carrito): sigue funcionando el enlace, pero Google no lo lista. */
  indexar?: boolean;
}

export interface RutasPlantilla {
  /** Id de la pestaña que se ve en /<tienda>. */
  inicial: string;
  /** Pestañas con dirección propia (todas menos la inicial), por id. */
  secciones: Record<string, SeccionRuta>;
}

const contacto: SeccionRuta = { titulo: 'Contacto' };
const pedidos: SeccionRuta = { titulo: 'Tu pedido', indexar: false };

export const RUTAS_PLANTILLA: Record<string, RutasPlantilla> = {
  empresa: {
    inicial: 'home',
    secciones: { servicios: { titulo: 'Servicios' }, obras: { titulo: 'Obras realizadas' }, nosotros: { titulo: 'Nosotros' }, contacto },
  },
  gas: { inicial: 'home', secciones: { productos: { titulo: 'Productos' }, contacto } },
  belleza: { inicial: 'home', secciones: { servicios: { titulo: 'Servicios' }, productos: { titulo: 'Productos' }, pedidos, contacto } },
  polleria: { inicial: 'home', secciones: { menu: { titulo: 'Carta y precios' }, pedidos, contacto } },
  fichadigital: { inicial: 'home', secciones: { menu: { titulo: 'Carta y precios' }, pedidos, contacto } },
  fichaplana: { inicial: 'home', secciones: { menu: { titulo: 'Carta y precios' }, pedidos, contacto } },
  iniciocatalogo: { inicial: 'home', secciones: { menu: { titulo: 'Carta y precios' }, pedidos, contacto } },
  menudirecto: { inicial: 'menu', secciones: { pedidos, contacto } },
  detalles: { inicial: 'menu', secciones: { pedidos, contacto } },
  flores: { inicial: 'menu', secciones: { pedidos, contacto } },
  veterinaria: {
    inicial: 'home',
    secciones: { menu: { titulo: 'Tienda' }, cartilla: { titulo: 'Cartilla de mascota' }, pedidos, contacto },
  },
};

/** Sección válida de una plantilla, o null (no participa, o ese segmento no existe). La pestaña inicial no tiene sección propia. */
export function seccionDe(plantilla: string, seccion: string): SeccionRuta | null {
  return RUTAS_PLANTILLA[plantilla]?.secciones[seccion] ?? null;
}
