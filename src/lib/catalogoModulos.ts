// Qué tan real es cada módulo del catálogo de Paquetes, y a qué nivel pertenece.
//
// El catálogo comercial (nombre, precio, descripción) vive en superadmin/paquetes/page.tsx.
// Acá va lo que se verificó en el código: qué ya existe por debajo, qué falta y de qué depende.
// Revisado el 24 sep 2026 — si se construye algo, actualizar acá y en la memoria del proyecto.

export type EstadoModulo = 'existe' | 'parcial' | 'por_construir' | 'aparte';
export type NivelModulo = 'carta' | 'ventas' | 'inventario' | 'cadena' | 'extra';
export type Esfuerzo = 'bajo' | 'medio' | 'alto';

export interface InfoModulo {
  estado: EstadoModulo;
  nivel: NivelModulo;
  esfuerzo: Esfuerzo;
  /** Lo que ya existe en el código y sirve de base. */
  bases: string;
  /** Lo que falta construir. */
  falta: string;
  /** Qué tiene que existir antes o qué tercero se necesita. */
  depende?: string;
}

export const NIVEL_NOMBRE: Record<NivelModulo, string> = {
  carta: 'Nivel Carta',
  ventas: 'Nivel Ventas',
  inventario: 'Nivel Inventario',
  cadena: 'Nivel superior (varias sedes)',
  extra: 'Extra aparte',
};

export const PLAN_INFO: Record<string, InfoModulo> = {
  // ─── Ya construidos ───
  'auto-branding-ia': {
    estado: 'existe', nivel: 'carta', esfuerzo: 'bajo',
    bases: 'El dueño ya puede elegir "color desde tu logo" en el editor de su tienda (Mis Tiendas → Editar).',
    falta: 'Nada para venderlo hoy. (La nota vieja decía que solo lo usaba el superadmin: ya no es así.)',
  },

  // ─── A medias: falta poco ───
  'presencia-marketplace': {
    estado: 'parcial', nivel: 'carta', esfuerzo: 'bajo',
    bases: '/market ya lista todas las tiendas activas.',
    falta: 'Una columna is_public por tienda y filtrarla en /api/catalog y /market para que apagarlo oculte la tienda de verdad.',
  },
  'analitica-favoritos': {
    estado: 'parcial', nivel: 'carta', esfuerzo: 'medio',
    bases: 'Los favoritos ya existen, guardados en el celular del cliente (localStorage).',
    falta: 'Guardarlos en Supabase para clientes con sesión y mostrarle al dueño cuántos guardaron cada producto.',
    depende: 'Que el cliente tenga cuenta (login).',
  },
  'sitio-web-propio': {
    estado: 'parcial', nivel: 'extra', esfuerzo: 'medio',
    bases: 'El subdominio propio (tienda.bogahub.app) ya se activa por tienda desde el superadmin.',
    falta: 'Dominio propio del cliente (por la API de Vercel, parqueado) y una ficha SEO dedicada.',
    depende: 'Que el cliente compre su dominio.',
  },

  // ─── Se puede construir con lo que ya hay ───
  'marca-blanca-total': {
    estado: 'por_construir', nivel: 'extra', esfuerzo: 'bajo',
    bases: 'El "Powered by Boga Market" está solo en el pie de 3 plantillas (Estilos Mirka, Flores, Sweet Kitty Nails).',
    falta: 'Un interruptor por tienda y ocultar esa línea cuando esté prendido.',
  },
  'delivery-zonas-dinamico': {
    estado: 'por_construir', nivel: 'ventas', esfuerzo: 'medio',
    bases: 'Cada tienda ya tiene un campo "zona" (hoy solo texto) y el pedido ya arma un mensaje de WhatsApp.',
    falta: 'Zonas con costo y tiempo de entrega, y sumar el envío al mensaje del pedido. Sin pasarela, el cobro sigue por WhatsApp.',
  },
  'reservas-citas': {
    estado: 'por_construir', nivel: 'extra', esfuerzo: 'medio',
    bases: '/eventos ya tiene reservas con QR y confirmación (tabla de tickets).',
    falta: 'Calendario de turnos por negocio (horas libres) y aviso por WhatsApp.',
  },
  'lealtad-digital': {
    estado: 'por_construir', nivel: 'ventas', esfuerzo: 'medio',
    bases: 'Login de clientes y el POS ya guarda nombre y teléfono opcional de cada venta.',
    falta: 'Tabla de sellos/puntos, canje y la pantalla del cliente. Identificar al cliente en cada venta.',
    depende: 'Nivel Ventas (POS) y cliente identificado.',
  },
  'programa-referidos': {
    estado: 'por_construir', nivel: 'ventas', esfuerzo: 'medio',
    bases: 'Login de clientes y el patrón de códigos/comisión pensado para Afiliados (ver la idea parqueada).',
    falta: 'Códigos, atribución al primer pedido y recompensa.',
    depende: 'Ventas registradas con cliente identificado.',
  },
  'resenas-reales': {
    estado: 'por_construir', nivel: 'carta', esfuerzo: 'medio',
    bases: 'El rating de cada tienda existe, pero lo carga el comercio a mano.',
    falta: 'Tabla de reseñas, moderación y calcular el promedio solo. Pedir la reseña después del pedido exige saber que hubo compra.',
    depende: 'Guardar los pedidos de la carta (si no, la reseña es abierta y hay que moderarla).',
  },
  'franquicias': {
    estado: 'por_construir', nivel: 'cadena', esfuerzo: 'medio',
    bases: 'Un dueño ya puede tener varias tiendas en su panel ("Todas mis tiendas") y el POS guarda las ventas por tienda.',
    falta: 'Vista comparativa entre sedes (ranking, totales) sobre esas ventas.',
    depende: 'Nivel Ventas con datos reales.',
  },
  'inventario-inteligente': {
    estado: 'por_construir', nivel: 'inventario', esfuerzo: 'medio',
    bases: 'El inventario real ya existe: el POS descuenta stock y avisa de poco stock.',
    falta: 'Historial de movimientos de stock y calcular a qué ritmo se vende cada producto para avisar "se acaba mañana". Hoy es por producto, no por insumo.',
    depende: 'Nivel Inventario y unos meses de historial.',
  },
  'app-nativa': {
    estado: 'por_construir', nivel: 'extra', esfuerzo: 'medio',
    bases: 'La app instalable (PWA) ya existe y funciona.',
    falta: 'Empaquetarla (Capacitor/TWA), cuenta de Google Play (pago único) y de App Store (pago anual), ícono y ficha por negocio, y mantenerla al día.',
    depende: 'Cuentas de las tiendas de apps y mantenimiento continuo.',
  },

  // ─── Aparte: necesitan antes otra pieza o un tercero ───
  'facturacion-electronica': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'El POS ya emite un ticket en PDF (no es un comprobante válido para SUNAT).',
    falta: 'Integrar un proveedor autorizado (OSE/PSE), con RUC, certificado y series de cada negocio.',
    depende: 'Un proveedor de pago y los datos tributarios de cada cliente; conviene asesoría contable.',
  },
  'business-intelligence': {
    estado: 'aparte', nivel: 'cadena', esfuerzo: 'alto',
    bases: 'Las ventas del POS ya se guardan con fecha y productos; Métricas ya muestra hoy, mes y más vendidos.',
    falta: 'Acumular historial (hoy es poco) y un motor de predicción de demanda.',
    depende: 'Meses de ventas registradas.',
  },
  'repartidores-propios': {
    estado: 'aparte', nivel: 'cadena', esfuerzo: 'alto',
    bases: 'Existen la tabla de choferes de Taxi Seguro y la ubicación por GPS.',
    falta: 'Vista del motorizado, asignar pedidos y ubicación en tiempo real para el cliente.',
    depende: 'Guardar los pedidos de la carta (hoy no quedan registrados).',
  },
  'marketing-automatizado': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Los avisos push propios ya existen, y el POS guarda nombre y teléfono opcional del cliente.',
    falta: 'Base de clientes con cumpleaños y última compra, reglas automáticas y un proveedor de correo/SMS (de pago) o WhatsApp Business API.',
    depende: 'Un proveedor de mensajes y clientes identificados.',
  },
  'notificaciones-inteligentes': {
    estado: 'aparte', nivel: 'extra', esfuerzo: 'alto',
    bases: 'Los avisos push por campaña ya existen.',
    falta: 'Avisar "estás cerca" exige seguir la ubicación en segundo plano, y una web instalable (PWA) no puede hacerlo. Solo es posible con app nativa. Lo que sí se puede: avisos segmentados por tema.',
    depende: 'App Nativa.',
  },
  'racha-envio-gratis': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Ninguna directa.',
    falta: 'Contar pedidos por cliente semana a semana y aplicar el envío gratis.',
    depende: 'Guardar los pedidos de la carta, cliente identificado y delivery con costo.',
  },
  'pasarela-pago-propia': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Ninguna: hoy el 100% del checkout es "mándale un WhatsApp al dueño" (lib/whatsapp.ts).',
    falta: 'Cuenta Culqi/Niubiz de cada negocio, endpoints de cobro seguros y guardar el pedido y su estado de pago.',
    depende: 'Un tercero (comisión por transacción) y guardar los pedidos de la carta.',
  },
  'happy-hour-automatico': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Las ventas del POS tienen fecha y hora.',
    falta: 'Motor de descuentos con horarios, aplicado en la carta y el POS, y detectar las horas muertas con datos.',
    depende: 'Historial de ventas y pedidos de la carta registrados.',
  },
  'suscripcion-vip': {
    estado: 'aparte', nivel: 'cadena', esfuerzo: 'alto',
    bases: 'Ninguna.',
    falta: 'Cobros recurrentes al cliente final, control de quién está al día y beneficios automáticos.',
    depende: 'Pasarela de Pago Propia.',
  },
  'reserva-y-pide': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Ninguna directa.',
    falta: 'Cobro desde la app y una pantalla de cocina que reciba la orden en el momento.',
    depende: 'Pasarela de Pago Propia y pedidos de la carta registrados.',
  },
};

// Lo que ya funciona hoy y no está en el catálogo comercial de Paquetes: se activa por tienda
// desde el editor del superadmin.
export const MODULOS_EXISTENTES_EXTRA: {
  id: string; name: string; icon: string; price: string; description: string; info: InfoModulo;
}[] = [
  {
    id: 'subdominio-propio',
    name: 'Subdominio propio',
    icon: 'dns',
    price: 'Por definir (idea: S/ 30-50 /mes)',
    description: 'La tienda responde en su propia dirección (tienda.bogahub.app) en vez de bogahub.app/tienda.',
    info: {
      estado: 'existe', nivel: 'extra', esfuerzo: 'bajo',
      bases: 'Interruptor por tienda en el editor del superadmin: crea el dominio en Vercel y el CNAME en Cloudflare.',
      falta: 'Cobro y suscripción (hoy se prende a mano).',
    },
  },
  {
    id: 'avisos-push',
    name: 'Avisos push propios',
    icon: 'notifications_active',
    price: 'Por definir',
    description: 'La tienda envía notificaciones a quienes instalaron su app (solo en su subdominio propio).',
    info: {
      estado: 'existe', nivel: 'extra', esfuerzo: 'bajo',
      bases: 'Interruptor por tienda; límite de 1 campaña por semana y 1 por día, de 8 a 22 h (hora de Lima).',
      falta: 'Cupos por plan, cobro, y una lista de avisos dentro de la app.',
    },
  },
];
