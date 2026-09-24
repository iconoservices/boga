// Las pantallas de BogaHub (lado consumidor) que llevan el "marco": barra lateral, botón de compartir,
// pie, etc. UNA sola lista: antes estaba copiada en el layout, en MarketTabs y en HomeFloatingActions,
// y cada vez que se renombraba una sección (Taxi Seguro -> /transporte, Mostrador -> /productos) había
// que acordarse de tocar todas. Si agregas un hub, súmalo acá (y en lib/hubs.ts y lib/rutasBoga.ts).

export const RUTAS_HUB = [
  '/market', '/pension', '/trabajos', '/transporte', '/inmuebles', '/viajes',
  '/eventos', '/sorteos', '/productos', '/pandero', '/revista', '/guia',
] as const;

/** ¿Esta ruta es el Inicio o un hub de BogaHub? */
export const esRutaHub = (pathname: string | null | undefined): boolean =>
  !!pathname && (pathname === '/' || RUTAS_HUB.some((r) => pathname.startsWith(r)));
