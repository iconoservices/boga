// Qué tan real es cada módulo del catálogo de Paquetes, y a qué nivel pertenece.
//
// El catálogo comercial (nombre, precio, descripción) vive en superadmin/paquetes/page.tsx.
// Acá va lo que se verificó en el código: qué ya existe por debajo, qué falta y de qué depende.
// Revisado el 24 sep 2026 — si se construye algo, actualizar acá y en la memoria del proyecto.

export type EstadoModulo = 'existe' | 'parcial' | 'por_construir' | 'aparte';
export type NivelModulo = 'carta' | 'app' | 'app_google' | 'ventas' | 'inventario' | 'cadena' | 'extra';
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
  carta: 'Alcance: Carta',
  app: 'Alcance: App',
  app_google: 'Alcance: App + Google',
  ventas: 'Operación: Ventas',
  inventario: 'Operación: Inventario',
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
    estado: 'existe', nivel: 'carta', esfuerzo: 'bajo',
    bases: 'Interruptor por tienda «Aparece en el marketplace BogaHub» en el editor del superadmin: apagado, la tienda y sus productos salen de /market y /explore (siguen abiertos en su propio link).',
    falta: 'Nada para venderlo. Viene prendido para todas las tiendas; si quieres cobrarlo, hay que apagarlo por defecto.',
  },
  'analitica-favoritos': {
    estado: 'parcial', nivel: 'carta', esfuerzo: 'medio',
    bases: 'Los favoritos ya existen, guardados en el celular del cliente (localStorage).',
    falta: 'Guardarlos en Supabase para clientes con sesión y mostrarle al dueño cuántos guardaron cada producto.',
    depende: 'Que el cliente tenga cuenta (login).',
  },
  'sitio-web-propio': {
    estado: 'parcial', nivel: 'app', esfuerzo: 'medio',
    bases: 'El subdominio propio (tienda.bogahub.app) ya se activa por tienda desde el superadmin.',
    falta: 'Dominio propio del cliente (por la API de Vercel, parqueado) y una ficha SEO dedicada.',
    depende: 'Que el cliente compre su dominio.',
  },

  // ─── Se puede construir con lo que ya hay ───
  'marca-blanca-total': {
    estado: 'existe', nivel: 'app_google', esfuerzo: 'bajo',
    bases: 'Interruptor por tienda «Marca blanca» en el editor del superadmin: quita el «Powered by Boga Market» del pie de las plantillas y de la página de cada producto. Tiene su propio precio en Cobros.',
    falta: 'Nada para venderlo hoy.',
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
    bases: 'Login de clientes, y el POS y la carta ya guardan cada pedido.',
    falta: 'Tabla de sellos/puntos, canje y la pantalla del cliente. Identificar al cliente en cada pedido (hoy la carta no pide el celular).',
    depende: 'Pedir el celular del cliente en la carta y en el POS.',
  },
  'programa-referidos': {
    estado: 'por_construir', nivel: 'ventas', esfuerzo: 'medio',
    bases: 'Login de clientes, pedidos guardados y el patrón de códigos/comisión pensado para Afiliados (ver la idea parqueada).',
    falta: 'Códigos, atribución al primer pedido y recompensa.',
    depende: 'Pedir el celular del cliente en la carta.',
  },
  'resenas-reales': {
    estado: 'por_construir', nivel: 'carta', esfuerzo: 'medio',
    bases: 'El rating de cada tienda existe, pero lo carga el comercio a mano. Los pedidos de la carta ya se guardan.',
    falta: 'Tabla de reseñas, moderación y calcular el promedio solo. Para pedir la reseña a quien compró falta pedir el celular del cliente en el pedido.',
    depende: 'Pedir el celular del cliente en la carta.',
  },
  'franquicias': {
    estado: 'por_construir', nivel: 'cadena', esfuerzo: 'medio',
    bases: 'Un dueño ya puede tener varias tiendas en su panel ("Todas mis tiendas") y el POS guarda las ventas por tienda.',
    falta: 'Vista comparativa entre sedes (ranking, totales) sobre esas ventas.',
    depende: 'Nivel Ventas con datos reales.',
  },
  'inventario-inteligente': {
    estado: 'por_construir', nivel: 'inventario', esfuerzo: 'medio',
    bases: 'Ya existen el inventario real (el POS y la carta descuentan stock) y el historial de movimientos.',
    falta: 'Calcular a qué ritmo se vende cada producto con ese historial y avisar «se acaba mañana». Hoy es por producto, no por insumo.',
    depende: 'Nivel Inventario y unas semanas de historial acumulado.',
  },
  'app-nativa': {
    estado: 'por_construir', nivel: 'app_google', esfuerzo: 'medio',
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
    bases: 'Existen la tabla de choferes de Taxi Seguro, la ubicación por GPS y el registro de pedidos de la carta.',
    falta: 'Vista del motorizado, asignar pedidos y ubicación en tiempo real para el cliente.',
    depende: 'Pedidos de la carta con dirección confiable y un flujo de estados (ya hay estados).',
  },
  'marketing-automatizado': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Los avisos push propios ya existen, y el POS guarda nombre y teléfono opcional del cliente.',
    falta: 'Base de clientes con cumpleaños y última compra, reglas automáticas y un proveedor de correo/SMS (de pago) o WhatsApp Business API.',
    depende: 'Un proveedor de mensajes y clientes identificados.',
  },
  'notificaciones-inteligentes': {
    estado: 'aparte', nivel: 'app_google', esfuerzo: 'alto',
    bases: 'Los avisos push por campaña ya existen.',
    falta: 'Avisar "estás cerca" exige seguir la ubicación en segundo plano, y una web instalable (PWA) no puede hacerlo. Solo es posible con app nativa. Lo que sí se puede: avisos segmentados por tema.',
    depende: 'App Nativa.',
  },
  'racha-envio-gratis': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Los pedidos de la carta ya se guardan (con nombre y dirección).',
    falta: 'Contar pedidos por cliente semana a semana y aplicar el envío gratis.',
    depende: 'Identificar al cliente (pedir su celular) y delivery con costo.',
  },
  'pasarela-pago-propia': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Los pedidos de la carta ya se guardan con estados (Pendiente, Preparando, Enviado, Entregado). El checkout sigue siendo «mándale un WhatsApp al dueño» (lib/whatsapp.ts).',
    falta: 'Cuenta Culqi/Niubiz de cada negocio, endpoints de cobro seguros y guardar el estado de pago del pedido.',
    depende: 'Un tercero (comisión por transacción).',
  },
  'happy-hour-automatico': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Las ventas del POS y los pedidos de la carta tienen fecha y hora.',
    falta: 'Motor de descuentos con horarios, aplicado en la carta y el POS, y detectar las horas muertas con datos.',
    depende: 'Semanas de historial de ventas.',
  },
  'suscripcion-vip': {
    estado: 'aparte', nivel: 'cadena', esfuerzo: 'alto',
    bases: 'Ninguna.',
    falta: 'Cobros recurrentes al cliente final, control de quién está al día y beneficios automáticos.',
    depende: 'Pasarela de Pago Propia.',
  },
  'reserva-y-pide': {
    estado: 'aparte', nivel: 'ventas', esfuerzo: 'alto',
    bases: 'Los pedidos de la carta ya se guardan y se pueden ver en el panel del dueño (con aviso sonoro).',
    falta: 'Cobro desde la app y una pantalla de cocina en tiempo real.',
    depende: 'Pasarela de Pago Propia.',
  },
};

// Lo que ya funciona hoy y no está en el catálogo comercial de Paquetes: se activa por tienda
// desde el editor del superadmin.
export const MODULOS_EXISTENTES_EXTRA: {
  id: string; name: string; icon: string; price: string; description: string; info: InfoModulo;
}[] = [
  {
    id: 'google-merchant',
    name: 'Productos en Google (Merchant Center)',
    icon: 'shopping_bag',
    price: 'Por definir',
    description: 'Los productos de la tienda salen en Google (Shopping y resultados) a través del feed. Solo aparecen las tiendas que lo pagan.',
    info: {
      estado: 'existe', nivel: 'app_google', esfuerzo: 'bajo',
      bases: 'Interruptor por tienda en el editor del superadmin; el feed /api/google-feed solo incluye las tiendas con el módulo prendido, y cada producto apunta a su página propia (/<tienda>/producto/<id>, también en el sitemap).',
      falta: 'Conectar el feed en la cuenta de Google Merchant Center de Boga y empezar a cobrarlo.',
      depende: 'Cuenta de Google Merchant Center de Boga con el feed cargado.',
    },
  },
  {
    id: 'subdominio-propio',
    name: 'Subdominio propio',
    icon: 'dns',
    price: 'Por definir (idea: S/ 30-50 /mes)',
    description: 'La tienda responde en su propia dirección (tienda.bogahub.app) en vez de bogahub.app/tienda.',
    info: {
      estado: 'existe', nivel: 'app', esfuerzo: 'bajo',
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
      estado: 'existe', nivel: 'app', esfuerzo: 'bajo',
      bases: 'Interruptor por tienda; límite de 1 campaña por semana y 1 por día, de 8 a 22 h (hora de Lima).',
      falta: 'Cupos por plan, cobro, y una lista de avisos dentro de la app.',
    },
  },
];
