// Servicio de carga manual: cuando el dueño no quiere subir sus productos y le pide al equipo de Boga que lo haga.
// Los precios se editan en /superadmin/cobros → Precios (se guardan en plan_precios, igual que los demás) y se
// cobran a una tienda desde Gestionar → Cargos. Estos son los valores de partida mientras no haya nada guardado.

export interface PaqueteCarga {
  clave: string;
  nombre: string;
  precio: number;
  detalle: string;
}

export const PAQUETES_CARGA: PaqueteCarga[] = [
  { clave: 'carga_20', nombre: 'Pack 20 productos', precio: 30, detalle: 'Carga manual de hasta 20 productos con foto, precio y categoría.' },
  { clave: 'carga_50', nombre: 'Pack 50 productos', precio: 60, detalle: 'Carga manual de hasta 50 productos con foto, precio y categoría.' },
  { clave: 'carga_masiva_estandar', nombre: 'Carga masiva (500 productos) — Estándar', precio: 150, detalle: 'Pago único. Subes los 500 productos organizados con buscador y categorías con íconos limpios (fotos que ya te pasa el comercio).' },
  { clave: 'carga_masiva_premium', nombre: 'Carga masiva (500 productos) — Premium con fotos HD', precio: 300, detalle: 'Pago único. Si además quieren que el equipo busque, recorte y edite las 500 fotos en alta calidad.' },
];

export const CLAVES_CARGA = PAQUETES_CARGA.map((p) => p.clave);
