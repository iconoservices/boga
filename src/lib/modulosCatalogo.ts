// Catálogo comercial de módulos de Boga: lo que se les puede vender a las tiendas, con su precio de partida.
// Los precios se editan en /superadmin/cobros → Precios (se guardan en plan_precios como `mod:<id>`) y se cobran a una
// tienda desde Gestionar → Cargos. `construido: false` = todavía no tiene código: se muestra al final con bandera,
// para tener el precio pensado pero no confundirlo con lo que ya se puede vender.
// (Dominio propio, Loyverse, Marca blanca, Pasarela, Academia y Promociones ya tienen su propia fila en «Módulos que se suman encima del plan».)

import type { PeriodoCobro, PorUnidad } from './modulos';

export interface ModuloCatalogo {
  clave: string;
  nombre: string;
  precio: number;
  periodo: PeriodoCobro;
  por: PorUnidad;
  detalle: string;
  construido: boolean;
}

export const MODULOS_CATALOGO: ModuloCatalogo[] = [
  // ── Ya existen (total o parcialmente) ──
  { clave: 'mod:marketplace', nombre: 'Presencia en el Marketplace BogaHub', precio: 99, periodo: 'mes', por: null, detalle: 'La tienda aparece en el Market de su ciudad, junto a otros comercios locales.', construido: true },
  { clave: 'mod:analitica_favoritos', nombre: 'Analítica de favoritos', precio: 119, periodo: 'mes', por: null, detalle: 'Qué productos guardan como favoritos los clientes.', construido: true },
  { clave: 'mod:auto_branding', nombre: 'Auto-Branding con IA', precio: 59, periodo: 'mes', por: null, detalle: 'Colores y estilo de la tienda generados a partir de su logo.', construido: true },
  { clave: 'mod:pagina_web', nombre: 'Página web / sitio propio (pago único)', precio: 199, periodo: 'unico', por: null, detalle: 'Desde S/ 199 según el trabajo. Landing o catálogo con dominio propio, fuera del ecosistema BogaHub.', construido: true },
  { clave: 'mod:pagina_web_mensual', nombre: 'Página web / sitio propio (mantenimiento)', precio: 39, periodo: 'mes', por: null, detalle: 'Se suma al pago único de la página web.', construido: true },
  // ── Todavía sin código ──
  { clave: 'mod:franquicias', nombre: 'Módulo de Franquicias', precio: 299, periodo: 'mes', por: null, detalle: 'Varias sucursales con métricas consolidadas.', construido: false },
  { clave: 'mod:sunat', nombre: 'Facturación electrónica SUNAT', precio: 0.15, periodo: 'unico', por: 'boleta', detalle: 'Boletas y facturas electrónicas directo a SUNAT. Se cobra por boleta enviada, no por mes.', construido: false },
  { clave: 'mod:bi', nombre: 'Business Intelligence', precio: 199, periodo: 'mes', por: null, detalle: 'Análisis avanzado del negocio.', construido: false },
  { clave: 'mod:inventario_inteligente', nombre: 'Inventario inteligente', precio: 149, periodo: 'mes', por: null, detalle: 'Sugerencias de reposición según las ventas.', construido: false },
  { clave: 'mod:repartidores', nombre: 'Repartidores propios', precio: 249, periodo: 'mes', por: null, detalle: 'Flota de repartidores de la tienda con seguimiento.', construido: false },
  { clave: 'mod:marketing', nombre: 'Marketing automatizado', precio: 129, periodo: 'mes', por: null, detalle: 'Campañas automáticas a los clientes.', construido: false },
  { clave: 'mod:vecino_cercano', nombre: 'Notificaciones inteligentes («Vecino Cercano»)', precio: 179, periodo: 'mes', por: null, detalle: 'Avisos a clientes que están cerca de la tienda.', construido: false },
  { clave: 'mod:socio_fiel', nombre: 'Sistema de lealtad digital («Socio Fiel»)', precio: 99, periodo: 'mes', por: null, detalle: 'Puntos y premios para clientes frecuentes.', construido: false },
  { clave: 'mod:racha_envio', nombre: 'Racha de envío gratis', precio: 89, periodo: 'mes', por: null, detalle: 'Envío gratis al completar una racha de compras.', construido: false },
  { clave: 'mod:app_nativa', nombre: 'App nativa — Play Store / App Store (pago único)', precio: 1500, periodo: 'unico', por: null, detalle: 'Publicación de la app propia de la tienda.', construido: false },
  { clave: 'mod:app_nativa_mensual', nombre: 'App nativa — mantenimiento', precio: 79, periodo: 'mes', por: null, detalle: 'Se suma al pago único de la app nativa.', construido: false },
  { clave: 'mod:reservas', nombre: 'Reservas y citas', precio: 129, periodo: 'mes', por: null, detalle: 'Agenda de reservas para el negocio.', construido: false },
  { clave: 'mod:referidos', nombre: 'Programa de referidos', precio: 89, periodo: 'mes', por: null, detalle: 'Clientes que traen clientes, con premio.', construido: false },
  { clave: 'mod:resenas', nombre: 'Reseñas reales de clientes', precio: 79, periodo: 'mes', por: null, detalle: 'Opiniones verificadas de quienes compraron.', construido: false },
  { clave: 'mod:delivery_zonas', nombre: 'Delivery por zonas con tarifa dinámica', precio: 99, periodo: 'mes', por: null, detalle: 'Costo de envío según la zona de entrega.', construido: false },
  { clave: 'mod:happy_hour', nombre: 'Happy Hour automático', precio: 139, periodo: 'mes', por: null, detalle: 'Ofertas que se prenden solas a ciertas horas.', construido: false },
  { clave: 'mod:suscripcion_vip', nombre: 'Suscripción VIP (estilo Amazon Prime)', precio: 199, periodo: 'mes', por: null, detalle: 'S/ 199 al mes + 5% de lo cobrado en suscripciones (el 5% se anota aparte en el cargo).', construido: false },
  { clave: 'mod:reserva_y_pide', nombre: 'Reserva y Pide (pre-order)', precio: 129, periodo: 'mes', por: null, detalle: 'Pedidos anticipados para recoger o consumir en el local.', construido: false },
];

export const CLAVES_MODULOS_CATALOGO = MODULOS_CATALOGO.map((m) => m.clave);
