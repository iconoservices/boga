// Tipos, contenido y helpers PUROS del módulo Legal de Boga.
// Sin "use client" y sin acceso a base: lo importan Server y Client Components.
//
// TODO EL TEXTO DE ESTE ARCHIVO ES UN BORRADOR redactado por Boga, no por un
// abogado. Cada documento lleva su `estado` y una `revisionNota` que explica
// qué falta y por qué. NO publicar como "vigente" nada que diga
// `requiere-abogado` sin que un abogado peruano lo valide primero.
//
// Patrón calcado de src/lib/revista.ts: el contenido vive acá como data
// estructurada y las páginas (/legal y /legal/[slug]) solo lo renderizan.

// --- Datos de la empresa ----------------------------------------------------
// Placeholders entre [[ ]]: son los únicos datos que Boga tiene que completar
// a mano (no los sé). Se muestran resaltados en la página para que salten a
// la vista mientras estén sin llenar.
export const EMPRESA = {
  razonSocial: '[[RAZÓN SOCIAL S.A.C.]]',
  nombreComercial: 'Boga',
  ruc: '[[N.º DE RUC]]',
  domicilio: '[[domicilio fiscal completo]], Pucallpa, Ucayali, Perú',
  email: '[[legal@bogahub.app]]',
  emailPrivacidad: '[[privacidad@bogahub.app]]',
  telefono: '[[+51 ...]]',
  ciudad: 'Pucallpa',
  sitio: 'bogahub.app',
} as const;

// Fecha que se muestra como "última actualización" mientras todo sea borrador.
export const FECHA_BORRADOR = '2026-09-09';

/** true mientras algún dato de EMPRESA siga siendo un placeholder [[...]].
 *  Las páginas públicas muestran un aviso discreto de "documento en preparación"
 *  mientras esto sea true; al completar EMPRESA en este archivo, desaparece. */
export const EMPRESA_INCOMPLETA = Object.values(EMPRESA).some((v) => /\[\[.+\]\]/.test(String(v)));

// --- Tipos ----------------------------------------------------------------

export type EstadoDoc =
  /** Texto inicial de Boga, sin ninguna revisión. */
  | 'borrador'
  /** Boga lo revisó y lo da por completo en fondo; falta pasada de abogado. */
  | 'revision-interna'
  /** NO publicar hasta que un abogado peruano lo valide: hay riesgo regulatorio. */
  | 'requiere-abogado'
  /** Aprobado por abogado y en vigor. */
  | 'vigente';

export type Bloque =
  | { tipo: 'p'; texto: string }
  | { tipo: 'sub'; texto: string }
  | { tipo: 'lista'; items: string[] };

export type Seccion = { n: string; titulo: string; bloques: Bloque[] };

export type TipoDoc = 'general' | 'politica' | 'anexo' | 'info';

export type DocLegal = {
  slug: string;
  titulo: string;
  tipo: TipoDoc;
  /** 1 línea: sirve para el índice y para la meta description. */
  resumen: string;
  estado: EstadoDoc;
  /** A quién le aplica. */
  aplicaA: string;
  actualizado: string;
  version: string;
  /** Por qué está en ese estado / qué mirar. Se muestra como banner arriba del doc. */
  revisionNota: string;
  /** Cosas que Boga tiene que decidir o completar antes de publicar. */
  pendientes?: string[];
  secciones: Seccion[];
};

// --- Helpers de estado ----------------------------------------------------

export const ESTADO_META: Record<EstadoDoc, { label: string; color: string; bg: string; publicable: boolean }> = {
  'borrador':         { label: 'Borrador',            color: '#8a5a00', bg: '#fdecc8', publicable: false },
  'revision-interna': { label: 'Revisión interna',    color: '#1d4ed8', bg: '#dbe6fe', publicable: false },
  'requiere-abogado': { label: 'Requiere abogado',    color: '#b8130e', bg: '#fadcd9', publicable: false },
  'vigente':          { label: 'Vigente',             color: '#0b6b3a', bg: '#d3f1e4', publicable: true },
};

export const TIPO_META: Record<TipoDoc, { label: string; orden: number }> = {
  general:  { label: 'Documento principal', orden: 0 },
  politica: { label: 'Políticas (toda la app)', orden: 1 },
  anexo:    { label: 'Anexos por servicio', orden: 2 },
  info:     { label: 'Información al consumidor', orden: 3 },
};

export function docHref(slug: string): string {
  return `/legal/${slug}`;
}

export function getDoc(slug: string): DocLegal | undefined {
  return DOCS.find((d) => d.slug === slug);
}

/** Agrupa los docs por tipo, en el orden de TIPO_META. Para el índice. */
export function docsPorTipo(): { tipo: TipoDoc; label: string; docs: DocLegal[] }[] {
  return (Object.keys(TIPO_META) as TipoDoc[])
    .sort((a, b) => TIPO_META[a].orden - TIPO_META[b].orden)
    .map((tipo) => ({ tipo, label: TIPO_META[tipo].label, docs: DOCS.filter((d) => d.tipo === tipo) }));
}

// ========================================================================
//  CONTENIDO
// ========================================================================

const E = EMPRESA;

const terminos: DocLegal = {
  slug: 'terminos',
  titulo: 'Términos y Condiciones Generales',
  tipo: 'general',
  resumen: 'El contrato base entre vos y Boga: cuenta, reglas de uso, responsabilidad, pagos y cambios. Aplica a toda la app.',
  estado: 'revision-interna',
  aplicaA: 'Todas las personas que usan la app o el sitio de Boga.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'Fondo completo. Un abogado peruano tiene que revisar: (a) los límites de responsabilidad ' +
    'frente al Código de Protección y Defensa del Consumidor (Ley 29571), que no permite exonerarse ' +
    'de todo; (b) la cláusula de arbitraje/jurisdicción; (c) que la definición de "Boga como ' +
    'intermediario" sea coherente con lo que realmente hace cada vertical.',
  pendientes: [
    'Completar razón social, RUC y domicilio fiscal.',
    'Definir si las disputas van a arbitraje o solo a los juzgados de Pucallpa.',
    'Confirmar el correo legal de contacto.',
    'Decidir la antelación exacta para avisar cambios de términos (se propone 15 días; 30 para planes pagados).',
  ],
  secciones: [
    {
      n: '1', titulo: 'Quiénes somos',
      bloques: [
        { tipo: 'p', texto: `Boga es una plataforma digital operada por ${E.razonSocial}, con RUC ${E.ruc} y domicilio en ${E.domicilio} ("Boga", "nosotros"). Podés escribirnos a ${E.email}.` },
        { tipo: 'p', texto: `Boga reúne en una sola app varios servicios de ${E.ciudad}: el Market (compras y delivery), Pensión, Servicios & Chamba, Taxi Seguro, Alquileres, Eventos, Sorteos, Pandero y la Revista. En la mayoría de estos servicios Boga actúa como intermediario: conecta a quien ofrece un producto o servicio con quien lo busca, pero no es el vendedor, el transportista ni el prestador del servicio final, salvo que se diga expresamente.` },
        { tipo: 'p', texto: 'Cada servicio tiene además un Anexo con reglas propias. Si un Anexo dice algo distinto a estos Términos Generales, para ese servicio manda el Anexo.' },
      ],
    },
    {
      n: '2', titulo: 'Aceptación de estos términos',
      bloques: [
        { tipo: 'p', texto: 'Al crear una cuenta, o al usar Boga sin cuenta, aceptás estos Términos, la Política de Privacidad y la Política de Cookies. Si no estás de acuerdo, no uses la app.' },
        { tipo: 'p', texto: 'Estos Términos son un contrato entre vos y Boga. Guardá una copia; siempre vas a poder consultarlos en esta sección.' },
      ],
    },
    {
      n: '3', titulo: 'Quién puede usar Boga',
      bloques: [
        { tipo: 'p', texto: 'Para tener cuenta y contratar dentro de Boga tenés que ser mayor de 18 años y tener capacidad legal para contratar según la ley peruana.' },
        { tipo: 'p', texto: 'Si sos menor de 18, solo podés usar Boga bajo la cuenta y la supervisión de tu padre, madre o tutor, que asume la responsabilidad por ese uso, incluidos los pagos. Algunos servicios (por ejemplo viajar solo en Taxi Seguro, comprar productos de venta restringida o participar en Sorteos) exigen ser mayor de edad sin excepción y así se indica en su Anexo.' },
        { tipo: 'p', texto: 'No podés usar Boga si tu cuenta fue suspendida antes, o si la ley te prohíbe recibir estos servicios.' },
      ],
    },
    {
      n: '4', titulo: 'Tu cuenta',
      bloques: [
        { tipo: 'p', texto: 'Sos responsable de lo que pasa en tu cuenta y de mantener tu contraseña en secreto. Avisanos apenas notes un uso que no reconocés.' },
        { tipo: 'p', texto: 'Los datos que cargás (nombre, teléfono, dirección) tienen que ser verdaderos y estar al día. Boga puede pedir verificar tu identidad o tu teléfono antes de habilitar ciertas funciones.' },
        { tipo: 'p', texto: 'Podés cerrar tu cuenta cuando quieras desde tu perfil o escribiéndonos. Algunas obligaciones (pagos pendientes, reclamos abiertos) siguen vigentes después del cierre.' },
      ],
    },
    {
      n: '5', titulo: 'Reglas de uso',
      bloques: [
        { tipo: 'p', texto: 'Al usar Boga te comprometés a no:' },
        { tipo: 'lista', items: [
          'usar la plataforma para algo ilegal, ni para vender productos o servicios prohibidos o de venta regulada sin autorización;',
          'suplantar a otra persona o negocio, ni publicar información falsa;',
          'dañar, sobrecargar o intentar vulnerar la seguridad de la app;',
          'copiar, revender o explotar el contenido o el catálogo de Boga sin permiso;',
          'acosar, amenazar o discriminar a otros usuarios, comercios, choferes o repartidores.',
        ]},
        { tipo: 'p', texto: 'Boga puede quitar contenido, limitar funciones o suspender cuentas que incumplan estas reglas, e informar a las autoridades cuando corresponda.' },
      ],
    },
    {
      n: '6', titulo: 'Precios, pagos y comprobantes',
      bloques: [
        { tipo: 'p', texto: 'Los precios se muestran en soles (S/) e incluyen los impuestos que correspondan, salvo que se indique lo contrario. El costo de envío, comisiones de servicio y propinas se muestran antes de confirmar.' },
        { tipo: 'p', texto: 'El pago se procesa a través de los medios habilitados en la app (efectivo contra entrega, tarjeta, billeteras y otros que se agreguen). Boga puede usar proveedores de pago externos; al pagar aceptás también las condiciones de ese proveedor.' },
        { tipo: 'p', texto: 'El comprobante de pago (boleta o factura) lo emite quien vende el producto o presta el servicio. Cuando Boga cobra una comisión propia, Boga emite el comprobante por esa comisión.' },
      ],
    },
    {
      n: '7', titulo: 'Cancelaciones, devoluciones y reclamos',
      bloques: [
        { tipo: 'p', texto: 'Las condiciones de cancelación y devolución dependen del servicio y están en cada Anexo. Como regla general, tenés derecho a los remedios que te da el Código de Protección y Defensa del Consumidor cuando el producto o servicio no es idóneo.' },
        { tipo: 'p', texto: `Para cualquier reclamo, escribí primero a ${E.email} o usá el Centro de Ayuda. Si no llegamos a una solución, podés dejar tu queja en el Libro de Reclamaciones de Boga, que encontrás en la app y en el sitio web, y acudir a INDECOPI.` },
      ],
    },
    {
      n: '8', titulo: 'Contenido y propiedad intelectual',
      bloques: [
        { tipo: 'p', texto: 'La app, la marca "Boga", el logo, los textos, el diseño, el software y el contenido editorial (incluida la Revista) son de Boga o de sus licenciantes y están protegidos por la ley. No podés usarlos sin autorización escrita.' },
        { tipo: 'p', texto: 'Lo que vos subís (fotos de productos, reseñas, descripciones de tu negocio) sigue siendo tuyo, pero le das a Boga una licencia gratuita, no exclusiva y mundial para mostrarlo, adaptarlo al formato de la app y promocionarlo mientras uses el servicio. Garantizás que tenés los derechos sobre ese contenido.' },
      ],
    },
    {
      n: '9', titulo: 'Responsabilidad de Boga',
      bloques: [
        { tipo: 'p', texto: 'Boga se compromete a poner un esfuerzo razonable para que la plataforma funcione y para verificar a los comercios y choferes que aparecen en ella. Boga no garantiza que el servicio esté siempre disponible ni libre de errores.' },
        { tipo: 'p', texto: 'Como intermediario, Boga no responde por la calidad, la seguridad ni el cumplimiento de los productos, servicios o viajes que ofrecen terceros a través de la app; esa responsabilidad es de quien vende o presta el servicio. Esto no limita los derechos que la ley peruana te reconoce como consumidor frente a Boga cuando Boga sí es el proveedor directo o cuando la ley lo hace responsable solidario.' },
        { tipo: 'p', texto: 'En la medida en que la ley lo permita, Boga no responde por daños indirectos o lucro cesante, y su responsabilidad total frente a vos por un hecho se limita al monto que pagaste por la operación que originó el reclamo.' },
      ],
    },
    {
      n: '10', titulo: 'Cambios en el servicio y en estos términos',
      bloques: [
        { tipo: 'p', texto: 'Boga mejora la app de forma constante y puede agregar, cambiar o retirar funciones, servicios o comercios. Cuando un cambio te afecte de forma relevante, te avisaremos por la app o por correo.' },
        { tipo: 'p', texto: 'Boga puede modificar estos Términos y los Anexos. Los cambios se publican en esta sección con su fecha. Si el cambio es importante, te avisamos con al menos 15 días de anticipación (30 días si tenés un plan o suscripción pagada). Si seguís usando Boga después de esa fecha, se entiende que aceptás la nueva versión; si no estás de acuerdo, podés cerrar tu cuenta y, en el caso de planes pagados, cancelar sin penalidad antes de que el cambio entre en vigor.' },
        { tipo: 'p', texto: 'Ningún cambio de términos afecta pedidos, viajes o compras que ya confirmaste y pagaste.' },
      ],
    },
    {
      n: '11', titulo: 'Ley aplicable y solución de controversias',
      bloques: [
        { tipo: 'p', texto: 'Estos Términos se rigen por las leyes del Perú.' },
        { tipo: 'p', texto: `Ante cualquier controversia, primero intentaremos resolverla de buena fe por el Centro de Ayuda. Si no hay acuerdo, las partes se someten a los jueces y tribunales de ${E.ciudad}, sin perjuicio del derecho del consumidor a acudir a INDECOPI o a la vía que la ley le franquee.` },
      ],
    },
    {
      n: '12', titulo: 'Contacto',
      bloques: [
        { tipo: 'p', texto: `Consultas legales y notificaciones: ${E.email}. Domicilio: ${E.domicilio}. Para temas de datos personales, ver la Política de Privacidad.` },
      ],
    },
  ],
};

const privacidad: DocLegal = {
  slug: 'privacidad',
  titulo: 'Política de Privacidad',
  tipo: 'politica',
  resumen: 'Qué datos personales recoge Boga, para qué los usa, con quién los comparte y cómo ejercés tus derechos (Ley 29733).',
  estado: 'requiere-abogado',
  aplicaA: 'Todas las personas cuyos datos trata Boga: usuarios, choferes, contactos de negocios y visitantes del sitio.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'Requiere abogado especializado en protección de datos. Perú actualizó el reglamento de la ' +
    'Ley 29733 (vigente desde 2025) y hay obligaciones nuevas: registro de bancos de datos ante la ' +
    'Autoridad Nacional de Protección de Datos Personales, encargados de tratamiento, evaluaciones ' +
    'de impacto, plazos de respuesta y reglas para transferencias internacionales (Supabase, Cloudflare R2, ' +
    'proveedores de pago). El texto de abajo describe el tratamiento real de la app pero NO reemplaza esa revisión.',
  pendientes: [
    'Inscribir los bancos de datos personales ante la Autoridad Nacional de Protección de Datos Personales.',
    'Listar con nombre a los encargados de tratamiento (Supabase, Cloudflare, proveedor de pagos, WhatsApp, proveedor de correo) y firmar los contratos de encargo.',
    'Definir plazos de conservación por tipo de dato.',
    'Confirmar el correo del área de datos y quién es el responsable interno.',
    'Revisar el tratamiento de geolocalización en Market y Taxi Seguro (dato sensible por lo que revela).',
  ],
  secciones: [
    {
      n: '1', titulo: 'Responsable del tratamiento',
      bloques: [
        { tipo: 'p', texto: `El responsable de tus datos es ${E.razonSocial}, RUC ${E.ruc}, domicilio ${E.domicilio}. Para cualquier tema de datos personales escribí a ${E.emailPrivacidad}.` },
      ],
    },
    {
      n: '2', titulo: 'Qué datos recogemos',
      bloques: [
        { tipo: 'sub', texto: 'Que vos nos das' },
        { tipo: 'lista', items: [
          'Cuenta: nombre, teléfono, correo, contraseña.',
          'Entrega: direcciones, referencias, indicaciones para el repartidor.',
          'Compras: qué pedís, a qué comercio, historial de pedidos y de pagos.',
          'Taxi Seguro y "Vende con Boga": datos adicionales para verificar identidad (DNI, licencia, SOAT, datos del negocio).',
          'Soporte: lo que nos contás cuando escribís al Centro de Ayuda o dejás una reseña.',
        ]},
        { tipo: 'sub', texto: 'Que se generan al usar Boga' },
        { tipo: 'lista', items: [
          'Ubicación aproximada o precisa (solo si la activás) para mostrarte comercios cercanos y para el servicio de Taxi Seguro.',
          'Datos del dispositivo y de uso: modelo, sistema, versión de la app, páginas vistas, errores.',
          'Cookies y tecnologías similares (ver la Política de Cookies).',
        ]},
      ],
    },
    {
      n: '3', titulo: 'Para qué usamos tus datos',
      bloques: [
        { tipo: 'lista', items: [
          'Prestarte el servicio: procesar pedidos, coordinar la entrega, conectar con choferes, gestionar pagos y comprobantes.',
          'Seguridad: verificar identidad, prevenir fraude y usos abusivos.',
          'Soporte y reclamos.',
          'Mejorar la app y medir su uso de forma agregada.',
          'Comunicaciones sobre tu cuenta y tus pedidos (obligatorias).',
          'Marketing de Boga (ofertas, novedades) solo si diste tu consentimiento; podés retirarlo cuando quieras.',
        ]},
      ],
    },
    {
      n: '4', titulo: 'Con quién los compartimos',
      bloques: [
        { tipo: 'lista', items: [
          'Con el comercio, el chofer o el repartidor que atiende tu pedido, solo lo necesario para cumplirlo.',
          'Con proveedores que trabajan por encargo de Boga: hosting y base de datos, almacenamiento de imágenes, procesador de pagos, envío de mensajes y correo, analítica.',
          'Con autoridades, cuando la ley lo exige o para defender derechos de Boga o de terceros.',
        ]},
        { tipo: 'p', texto: 'Boga no vende tus datos personales.' },
      ],
    },
    {
      n: '5', titulo: 'Transferencias internacionales',
      bloques: [
        { tipo: 'p', texto: `Algunos de nuestros proveedores procesan datos fuera del Perú. En esos casos aplicamos las garantías que exige la Ley 29733 y su reglamento. Podés pedirnos la lista actualizada de estos proveedores escribiendo a ${E.emailPrivacidad}.` },
      ],
    },
    {
      n: '6', titulo: 'Cuánto tiempo los guardamos',
      bloques: [
        { tipo: 'p', texto: 'Conservamos cada dato mientras tengas cuenta y luego por los plazos que exijan las normas tributarias, contables y de protección al consumidor. Después lo eliminamos o lo anonimizamos.' },
      ],
    },
    {
      n: '7', titulo: 'Tus derechos',
      bloques: [
        { tipo: 'p', texto: `Podés pedir acceder a tus datos, rectificarlos, actualizarlos, cancelarlos u oponerte a ciertos tratamientos, escribiendo a ${E.emailPrivacidad}. Respondemos en los plazos de ley. Si no estás conforme, podés reclamar ante la Autoridad Nacional de Protección de Datos Personales.` },
      ],
    },
    {
      n: '8', titulo: 'Seguridad',
      bloques: [
        { tipo: 'p', texto: 'Aplicamos medidas técnicas y organizativas razonables para proteger tus datos. Ningún sistema es 100% seguro; si ocurre un incidente que te afecte, te avisaremos según lo que exige la norma.' },
      ],
    },
    {
      n: '9', titulo: 'Menores de edad',
      bloques: [
        { tipo: 'p', texto: 'Boga está dirigida a mayores de 18 años. No recogemos datos de menores a sabiendas; si detectamos una cuenta de un menor sin autorización de su tutor, la damos de baja.' },
      ],
    },
    {
      n: '10', titulo: 'Cambios',
      bloques: [
        { tipo: 'p', texto: 'Si cambiamos esta política, publicamos la nueva versión acá con su fecha y, si el cambio es relevante, te avisamos por la app o por correo.' },
      ],
    },
  ],
};

const cookies: DocLegal = {
  slug: 'cookies',
  titulo: 'Política de Cookies',
  tipo: 'politica',
  resumen: 'Qué cookies y almacenamiento local usa Boga y cómo controlarlos.',
  estado: 'revision-interna',
  aplicaA: 'Visitantes del sitio y usuarios de la app web de Boga.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'Fondo simple. Antes de publicar hay que: (a) hacer el inventario real de cookies y de datos que ' +
    'la app guarda en el navegador (hoy usa localStorage para el carrito, la sesión y la preferencia ' +
    'del menú lateral); (b) decidir si se muestra un banner de consentimiento y con qué opciones; ' +
    '(c) que el abogado confirme el estándar exigible en Perú.',
  pendientes: [
    'Inventariar cookies propias y de terceros (analítica, pagos, mapas).',
    'Definir si va banner de consentimiento y su diseño (aceptar / rechazar / configurar).',
    'Listar el almacenamiento local que usa la app y para qué.',
  ],
  secciones: [
    {
      n: '1', titulo: 'Qué es una cookie',
      bloques: [
        { tipo: 'p', texto: 'Una cookie es un archivo pequeño que un sitio guarda en tu navegador. Sirve, por ejemplo, para recordar tu sesión o tus preferencias. Boga también usa "almacenamiento local" (localStorage), que cumple una función parecida.' },
      ],
    },
    {
      n: '2', titulo: 'Qué usamos en Boga',
      bloques: [
        { tipo: 'sub', texto: 'Necesarias (no se pueden desactivar)' },
        { tipo: 'lista', items: [
          'Sesión: para mantenerte con sesión iniciada.',
          'Carrito: para no perder lo que agregaste.',
          'Preferencias de interfaz: por ejemplo si dejaste abierto o cerrado el menú lateral.',
        ]},
        { tipo: 'sub', texto: 'Analíticas y de rendimiento' },
        { tipo: 'p', texto: 'Nos ayudan a entender cómo se usa la app para mejorarla. Si usamos un proveedor de analítica externo, lo identificamos en esta política.' },
        { tipo: 'sub', texto: 'De terceros' },
        { tipo: 'p', texto: 'El procesador de pagos y los mapas pueden dejar sus propias cookies cuando usás esas funciones.' },
      ],
    },
    {
      n: '3', titulo: 'Cómo controlarlas',
      bloques: [
        { tipo: 'p', texto: 'Podés borrar o bloquear cookies desde la configuración de tu navegador. Si bloqueás las necesarias, algunas partes de Boga pueden dejar de funcionar.' },
      ],
    },
  ],
};

const libro: DocLegal = {
  slug: 'libro-de-reclamaciones',
  titulo: 'Libro de Reclamaciones',
  tipo: 'info',
  resumen: 'Cómo dejar una queja o un reclamo formal en Boga, según lo exige la ley peruana.',
  estado: 'requiere-abogado',
  aplicaA: 'Cualquier consumidor de Boga.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'El formulario virtual YA está construido en /libro-de-reclamaciones: formato del D.S. 011-2011-PCM ' +
    '(datos del consumidor y del bien, tipo "reclamo" vs "queja", número correlativo, hoja imprimible) y ' +
    'panel interno en /superadmin/reclamaciones para responder. Falta: (a) que un abogado confirme que la ' +
    'hoja y los plazos cumplen la norma vigente; (b) el envío AUTOMÁTICO de la copia al correo del ' +
    'consumidor (hoy la guarda/imprime desde la pantalla de confirmación); (c) resolver quién responde ' +
    'cuando el reclamo es contra un comercio o un chofer y no contra Boga.',
  pendientes: [
    'Validar con abogado el formato de la hoja y el plazo de respuesta (15 días hábiles).',
    'Enviar copia automática de la hoja al correo del consumidor (falta proveedor de correo).',
    'Definir el flujo interno y el responsable de responder dentro del plazo legal.',
    'Mostrar el aviso oficial del Libro de Reclamaciones de forma visible en la app y el sitio.',
    'Definir la relación con el libro de reclamaciones propio de cada comercio.',
  ],
  secciones: [
    {
      n: '1', titulo: 'Para qué sirve',
      bloques: [
        { tipo: 'p', texto: 'El Libro de Reclamaciones es donde dejás por escrito una disconformidad. Hay dos tipos: reclamo (cuando el producto o servicio no cumplió lo ofrecido) y queja (cuando querés expresar un malestar que no busca una solución sobre el producto). Presentar un reclamo no reemplaza denunciar ante INDECOPI, pero Boga tiene la obligación de responderte.' },
      ],
    },
    {
      n: '2', titulo: 'Cómo dejar tu reclamo',
      bloques: [
        { tipo: 'p', texto: 'Entrá a /libro-de-reclamaciones (link en el pie de página), completá tus datos, los del pedido o servicio y contanos qué pasó. Al enviar recibís un número de hoja; guardala o imprimila desde esa pantalla.' },
        { tipo: 'p', texto: `Si preferís, escribinos a ${E.email}.` },
      ],
    },
    {
      n: '3', titulo: 'Qué pasa después',
      bloques: [
        { tipo: 'p', texto: 'Boga te responde dentro del plazo que fija la ley. Si el reclamo es sobre un producto o servicio de un tercero (un comercio, un chofer), Boga traslada el reclamo y hace seguimiento, sin perjuicio de tu derecho a dirigirte también a ese proveedor y a INDECOPI.' },
      ],
    },
  ],
};

const anexoMarket: DocLegal = {
  slug: 'market',
  titulo: 'Anexo · Market, Pensión y Delivery',
  tipo: 'anexo',
  resumen: 'Reglas de las compras y entregas: quién vende, tiempos, cancelaciones, devoluciones y suscripciones de comida.',
  estado: 'revision-interna',
  aplicaA: 'Quien compra en el Market o Pensión y los comercios que venden ahí.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'Fondo completo. El abogado tiene que revisar el reparto de responsabilidad entre Boga y el comercio ' +
    'frente al consumidor (en varios supuestos la ley los hace solidarios), y las reglas de suscripciones ' +
    'de comida frente a la norma de consumo (renovación automática, aviso de cambios de precio, derecho a cancelar).',
  pendientes: [
    'Definir la política de reembolsos estándar (a medio de pago original vs saldo Boga Points, plazos).',
    'Definir ventana de cancelación sin costo por tipo de pedido.',
    'Redactar las condiciones concretas de los planes de suscripción de comida cuando existan.',
    'Definir la fórmula de la penalidad por salir antes de un plan con permanencia (que sea proporcional y no confiscatoria; el abogado la valida frente al Código 29571).',
  ],
  secciones: [
    {
      n: '1', titulo: 'Quién te vende',
      bloques: [
        { tipo: 'p', texto: 'En el Market y en Pensión, el vendedor es el comercio que figura en cada producto. Boga muestra el catálogo, procesa el pedido y coordina la entrega, pero el contrato de compraventa es entre vos y ese comercio. El comercio es responsable de que el producto exista, esté en buen estado y cumpla lo ofrecido, y de emitir la boleta o factura.' },
      ],
    },
    {
      n: '2', titulo: 'Precios y disponibilidad',
      bloques: [
        { tipo: 'p', texto: 'Los precios y el stock los define el comercio y pueden cambiar de un día para otro. Eso es normal y no necesita aviso previo: siempre ves el precio final antes de pagar cada pedido, y ese precio es el que se respeta para ese pedido. La regla de aviso previo y cancelación sin penalidad solo aplica a los planes y suscripciones (sección 7), donde sí hay un compromiso que se repite.' },
        { tipo: 'p', texto: 'Si un producto no está disponible después de que pagaste, se te ofrece un reemplazo o el reembolso de ese ítem.' },
        { tipo: 'p', texto: 'El costo de envío y la comisión de servicio de Boga se muestran antes de confirmar el pedido.' },
      ],
    },
    {
      n: '3', titulo: 'Entrega',
      bloques: [
        { tipo: 'p', texto: 'Los tiempos de entrega son estimados y dependen de la distancia, el clima y la demanda. Tenés que dar una dirección correcta y estar disponible para recibir el pedido. Si no se puede entregar por causas tuyas (dirección errada, no contestás), puede cobrarse el envío igual.' },
      ],
    },
    {
      n: '4', titulo: 'Cancelaciones',
      bloques: [
        { tipo: 'p', texto: 'Podés cancelar sin costo mientras el comercio no haya empezado a preparar el pedido. Después de eso, según el estado, puede no haber reembolso del total. Boga puede cancelar un pedido y devolverte lo pagado si el comercio no puede cumplir o si se detecta un fraude.' },
      ],
    },
    {
      n: '5', titulo: 'Problemas con tu pedido',
      bloques: [
        { tipo: 'p', texto: 'Si el pedido llega incompleto, en mal estado o distinto a lo pedido, avisá por el Centro de Ayuda dentro de las 24 horas, con fotos si podés. Según el caso se resuelve con reenvío, reembolso parcial o total. Esto no afecta tus derechos como consumidor frente al comercio y frente a Boga.' },
      ],
    },
    {
      n: '6', titulo: 'Productos de venta restringida',
      bloques: [
        { tipo: 'p', texto: 'La venta de bebidas alcohólicas, tabaco y otros productos regulados solo se hace a mayores de edad y puede requerir mostrar documento al recibir. El repartidor puede negar la entrega si hay dudas sobre la edad o si la persona está visiblemente ebria.' },
      ],
    },
    {
      n: '7', titulo: 'Planes y suscripciones de comida',
      bloques: [
        { tipo: 'p', texto: 'Cuando Boga o un comercio ofrezcan planes de comida (por ejemplo un pack semanal de almuerzos de Pensión), antes de contratar vas a ver, de forma clara: qué incluye, el precio, cada cuánto se cobra, cómo se renueva y si tiene un plazo mínimo de permanencia.' },
        { tipo: 'sub', texto: 'Planes sin plazo mínimo (mes a mes)' },
        { tipo: 'lista', items: [
          'Si el plan se renueva solo, se te avisa antes de cada cobro y podés cancelar la renovación en cualquier momento desde tu perfil; la cancelación aplica al siguiente período, no al que ya pagaste.',
        ]},
        { tipo: 'sub', texto: 'Planes con plazo mínimo de permanencia' },
        { tipo: 'lista', items: [
          'Algunos planes se ofrecen a un precio menor a cambio de un compromiso de permanencia (por ejemplo 6 o 12 meses). Ese plazo y el costo de salir antes se te muestran de forma destacada antes de contratar, y solo se aplican si los aceptás expresamente.',
          'Si cancelás antes de que termine el plazo por decisión tuya, se cobra la penalidad informada al contratar. Esa penalidad es proporcional (por ejemplo, el descuento del que ya te beneficiaste o una parte de las cuotas que faltan) y nunca es el total de lo que quedaba por pagar.',
          'No se cobra ninguna penalidad si cancelás porque Boga o el comercio subieron el precio, redujeron lo que incluye el plan o incumplieron de forma reiterada. En ese caso podés salir sin costo aunque estés dentro del plazo.',
        ]},
        { tipo: 'sub', texto: 'Para todos los planes' },
        { tipo: 'lista', items: [
          'Cambios de precio o de contenido: se te avisa con al menos 30 días de anticipación y podés cancelar sin penalidad antes de que el cambio entre en vigor.',
          'Pausas y faltas: cada plan indica si podés pausarlo, por cuántos días, y qué pasa si un día el comercio no entrega (se repone o se descuenta).',
        ]},
        { tipo: 'p', texto: 'Boga puede modificar o descontinuar un plan avisando con al menos 30 días; si queda saldo a favor tuyo, se te reembolsa o se te acredita en Boga Points, a tu elección, sin penalidad.' },
      ],
    },
  ],
};

const anexoTaxi: DocLegal = {
  slug: 'taxi-seguro',
  titulo: 'Anexo · Taxi Seguro',
  tipo: 'anexo',
  resumen: 'Reglas del servicio de movilidad: Boga como directorio/intermediario, verificación de choferes, seguridad y responsabilidad en los viajes.',
  estado: 'requiere-abogado',
  aplicaA: 'Pasajeros y choferes de Taxi Seguro.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'Requiere abogado. El transporte de personas está regulado (a nivel nacional y municipal, incluida ' +
    'la norma de transporte en vehículos menores para mototaxis) y la responsabilidad por accidentes, ' +
    'seguros (SOAT / AFOCAT) y la relación de Boga con los choferes (que NO son empleados) son puntos ' +
    'sensibles. Hoy Taxi Seguro es solo un directorio verificado sin reserva ni pago dentro de la app; ' +
    'si más adelante Boga intermedia el viaje o el cobro, este anexo cambia sustancialmente y hay que ' +
    'volver a revisarlo.',
  pendientes: [
    'Confirmar con abogado qué exige la municipalidad de Pucallpa para operar un directorio/intermediario de transporte.',
    'Definir el alcance real de la "verificación" de choferes que Boga promete (y no prometer de más).',
    'Definir qué pasa cuando Boga habilite reserva y/o pago dentro de la app (seguro, responsabilidad, tarifa).',
    'Coordinar con el anexo de Boga Points el pago pasajero ↔ chofer.',
  ],
  secciones: [
    {
      n: '1', titulo: 'Qué es Taxi Seguro hoy',
      bloques: [
        { tipo: 'p', texto: 'Taxi Seguro es, por ahora, un directorio de choferes de Pucallpa (mototaxi, auto y moto) que pasaron una verificación de Boga. El pasajero contacta al chofer directamente (por teléfono o WhatsApp), acuerda el viaje y paga fuera de la app. Boga no organiza el viaje, no fija la tarifa y no cobra el pasaje.' },
      ],
    },
    {
      n: '2', titulo: 'Verificación de choferes',
      bloques: [
        { tipo: 'p', texto: 'Antes de publicar a un chofer, Boga revisa su DNI, la licencia de conducir vigente de la categoría que corresponde al vehículo, el SOAT o AFOCAT vigente, la tarjeta de propiedad o la autorización de uso del vehículo, el permiso municipal de operación cuando aplica, y referencias.' },
        { tipo: 'p', texto: 'La verificación es un control inicial y periódico, no una garantía absoluta sobre la conducta del chofer en cada viaje. El chofer se compromete a mantener sus documentos vigentes y a avisar a Boga si algo cambia. Boga puede quitar del directorio a cualquier chofer.' },
      ],
    },
    {
      n: '3', titulo: 'Relación de Boga con los choferes',
      bloques: [
        { tipo: 'p', texto: 'Los choferes son trabajadores independientes. No existe vínculo laboral con Boga: cada chofer maneja su horario, su vehículo, su tarifa y sus gastos. Boga solo presta un servicio de difusión y verificación.' },
      ],
    },
    {
      n: '4', titulo: 'Responsabilidad en el viaje',
      bloques: [
        { tipo: 'p', texto: 'El viaje y todo lo que ocurra durante él son responsabilidad del chofer y del pasajero. En caso de accidente aplican el SOAT/AFOCAT del vehículo y los seguros que correspondan. Boga no responde por daños, pérdidas, demoras ni conductas ocurridas en el viaje, salvo lo que la ley le imponga por la información que publica.' },
        { tipo: 'p', texto: 'Si Boga publicó información falsa o desactualizada sobre un chofer y eso te causó un daño, escribinos: revisamos cada caso.' },
      ],
    },
    {
      n: '5', titulo: 'Reglas para el pasajero',
      bloques: [
        { tipo: 'lista', items: [
          'Ser mayor de 18 para viajar solo; los menores viajan acompañados de un adulto responsable.',
          'Acordar la tarifa con el chofer antes de subir.',
          'Tratar con respeto al chofer y cuidar el vehículo.',
          'Reportar a Boga cualquier incidente de seguridad.',
        ]},
      ],
    },
    {
      n: '6', titulo: 'Reglas para el chofer',
      bloques: [
        { tipo: 'lista', items: [
          'Mantener licencia, SOAT/AFOCAT, permisos y vehículo en regla.',
          'Manejar respetando las normas de tránsito y sin pasajeros de más.',
          'No conducir bajo efectos de alcohol o drogas.',
          'Tratar con respeto al pasajero; no discriminar.',
          'Usar los datos del pasajero solo para el viaje.',
        ]},
        { tipo: 'p', texto: 'Incumplir estas reglas es causal de salida inmediata del directorio, además de las responsabilidades legales del chofer.' },
      ],
    },
    {
      n: '7', titulo: 'Si en el futuro Boga intermedia el viaje o el pago',
      bloques: [
        { tipo: 'p', texto: 'Cuando Boga habilite reservar el viaje o pagar dentro de la app (por ejemplo con Boga Points), se publicará una versión ampliada de este anexo con las reglas de tarifa, cancelación, calificación y seguro. Ese cambio se avisa con anticipación.' },
      ],
    },
  ],
};

const anexoPoints: DocLegal = {
  slug: 'boga-points',
  titulo: 'Anexo · Boga Points (billetera de créditos)',
  tipo: 'anexo',
  resumen: 'Qué son los Boga Points, cómo se cargan y se usan, su caducidad y por qué no son dinero electrónico.',
  estado: 'requiere-abogado',
  aplicaA: 'Usuarios que carguen o usen saldo dentro de Boga.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'El más delicado de todos. Si los "puntos" se pueden convertir de vuelta a dinero, transferir libremente ' +
    'entre personas o usar para pagar fuera de Boga, el producto puede caer bajo la Ley 29985 (dinero ' +
    'electrónico) y necesitar autorización de la SBS. Para quedar fuera de esa regulación, el diseño ' +
    'propuesto es: crédito de lazo cerrado, comprado con dinero pero NO reconvertible a efectivo, usable ' +
    'solo dentro de Boga, sin transferencia libre entre usuarios. Un abogado financiero tiene que confirmar ' +
    'este diseño ANTES de lanzar la billetera. También hay implicancias tributarias (cuándo se reconoce el ingreso).',
  pendientes: [
    'Validar con abogado financiero que el diseño de lazo cerrado no requiere licencia SBS.',
    'Decidir el nombre definitivo (Boga Points / yacu points / otro) — el nombre es lo de menos, el diseño legal es lo que importa.',
    'Confirmar la equivalencia (el borrador asume 1 Boga Point = S/ 1).',
    'Definir caducidad del saldo y qué pasa con saldos inactivos (no puede ser confiscatorio).',
    'Si se habilita "regalar saldo" a un contacto, fijar límites para no volverlo un medio de transferencia de valor entre personas (riesgo Ley 29985).',
    'Definir si hay reembolso a pedido del usuario y en qué condiciones (plazo, comisión).',
    'Definir el flujo de pago pasajero ↔ taxista: modelo A (crédito directo) vs modelo B (pasarela) — ver la nota de proyecto de Wallet.',
    'Tratamiento tributario del saldo precargado.',
  ],
  secciones: [
    {
      n: '1', titulo: 'Qué son los Boga Points',
      bloques: [
        { tipo: 'p', texto: 'Los Boga Points son un saldo de créditos dentro de tu cuenta que sirve para pagar productos y servicios ofrecidos en Boga. 1 Boga Point equivale a S/ 1.' },
        { tipo: 'p', texto: 'Los Boga Points no son dinero, no son un depósito, no generan intereses y no son dinero electrónico en el sentido de la Ley 29985. Son un mecanismo de pago de uso exclusivo dentro de Boga.' },
      ],
    },
    {
      n: '2', titulo: 'Cómo se obtienen',
      bloques: [
        { tipo: 'lista', items: [
          'Comprándolos con un medio de pago habilitado (recarga).',
          'Como devolución de un pedido cancelado, si elegís recibirlo en saldo.',
          'Como premio, promoción o beneficio que Boga otorgue (estos pueden tener reglas y caducidad propias).',
        ]},
      ],
    },
    {
      n: '3', titulo: 'Cómo se usan',
      bloques: [
        { tipo: 'p', texto: 'Podés usar tu saldo, total o parcialmente, para pagar dentro de Boga:' },
        { tipo: 'lista', items: [
          'pedidos del Market y almuerzos de Pensión;',
          'entradas de Eventos;',
          'cuotas de Pandero y de Sorteos;',
          'el viaje de Taxi Seguro, cuando esa opción esté habilitada (ver sección 6);',
          'comisiones de servicio de Boga.',
        ]},
        { tipo: 'p', texto: 'No se pueden usar para pagar fuera de Boga.' },
        { tipo: 'p', texto: 'Los Boga Points no se pueden transferir libremente a otras personas ni convertir de vuelta a efectivo, salvo los casos de reembolso descritos abajo.' },
      ],
    },
    {
      n: '4', titulo: 'Caducidad',
      bloques: [
        { tipo: 'p', texto: 'El saldo que compraste con tu dinero no caduca mientras tu cuenta esté activa. El saldo otorgado como promoción caduca en la fecha que indique cada promoción. Antes de que un saldo caduque, te avisamos.' },
      ],
    },
    {
      n: '5', titulo: 'Reembolso',
      bloques: [
        { tipo: 'p', texto: 'Podés pedir que Boga te devuelva el saldo que compraste con tu dinero (no el saldo de promociones) al medio de pago original. Al cerrar tu cuenta, ese saldo se te reembolsa por el mismo mecanismo. Las condiciones (plazo y comisiones, si las hubiera) se indican en la app al momento de solicitar el reembolso.' },
      ],
    },
    {
      n: '6', titulo: 'Pagos entre pasajeros y choferes (Taxi Seguro)',
      bloques: [
        { tipo: 'p', texto: 'Si Boga habilita pagar el viaje de Taxi Seguro con Boga Points, el pasajero paga a Boga y Boga acredita al chofer el monto correspondiente, menos la comisión de servicio informada. Los tiempos y el mecanismo de liquidación al chofer se detallan al activar la función.' },
      ],
    },
    {
      n: '7', titulo: 'Errores y mal uso',
      bloques: [
        { tipo: 'p', texto: 'Boga puede ajustar, retener o anular saldo cargado por error, obtenido con fraude o en incumplimiento de estos términos, avisándote el motivo.' },
      ],
    },
  ],
};

const anexoEventos: DocLegal = {
  slug: 'eventos',
  titulo: 'Anexo · Eventos y Entradas',
  tipo: 'anexo',
  resumen: 'Compra de entradas, validez del QR, reembolsos y qué pasa si un evento se cancela o se reprograma.',
  estado: 'revision-interna',
  aplicaA: 'Quien compra entradas y los organizadores que publican eventos en Boga.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'Fondo completo. El abogado tiene que revisar la política de reembolso frente a la norma de consumo ' +
    '(sobre todo cancelación y reprogramación por el organizador) y la responsabilidad de Boga como ' +
    'plataforma de venta frente al organizador. Falta construir la parte de QR/validación en puerta.',
  pendientes: [
    'Definir la política de reembolso estándar (cancelación total, reprogramación, "no me puedo ir").',
    'Definir comisión de servicio y si es reembolsable.',
    'Construir la validación del QR en puerta y las reglas de reventa/transferencia de entrada.',
  ],
  secciones: [
    {
      n: '1', titulo: 'Quién organiza el evento',
      bloques: [
        { tipo: 'p', texto: 'El organizador que figura en cada evento es el responsable del evento: su realización, el aforo, la seguridad, los permisos y la información publicada. Boga es la plataforma que vende las entradas y emite el ticket digital.' },
      ],
    },
    {
      n: '2', titulo: 'Tu entrada y el QR',
      bloques: [
        { tipo: 'p', texto: 'Al comprar recibís una entrada digital con un código QR. Ese QR es de un solo uso: se valida al ingresar y deja de servir. No compartas la imagen: si alguien la usa antes, no vas a poder entrar. Guardá tu entrada en la app.' },
        { tipo: 'p', texto: 'Si la entrada admite transferirse a otra persona, vas a poder reasignarla desde la app; cada evento indica hasta cuándo se puede hacer.' },
      ],
    },
    {
      n: '3', titulo: 'Precio y comisión',
      bloques: [
        { tipo: 'p', texto: 'El precio de la entrada lo fija el organizador. Boga puede cobrar una comisión de servicio que se muestra antes de pagar.' },
      ],
    },
    {
      n: '4', titulo: 'Cambios, cancelación y reembolso',
      bloques: [
        { tipo: 'lista', items: [
          'Si el organizador cancela el evento: tenés derecho a la devolución del valor de la entrada.',
          'Si el organizador reprograma: tu entrada vale para la nueva fecha; si no podés asistir, podés pedir el reembolso dentro del plazo que se indique al anunciar la nueva fecha.',
          'Si simplemente no querés ir: el reembolso depende de la política del evento, que se muestra antes de comprar.',
        ]},
      ],
    },
    {
      n: '5', titulo: 'En el evento',
      bloques: [
        { tipo: 'p', texto: 'El ingreso puede estar sujeto a edad mínima, control de identidad y reglas del local. El organizador puede negar o retirar el ingreso por conducta que ponga en riesgo a otros. Boga no participa en el control de puerta salvo la validación del QR.' },
      ],
    },
  ],
};

const anexoNegocios: DocLegal = {
  slug: 'negocios',
  titulo: 'Anexo · Negocios / Vende con Boga',
  tipo: 'anexo',
  resumen: 'Condiciones para los comercios que venden en Boga: comisiones, obligaciones, comprobantes y baja.',
  estado: 'revision-interna',
  aplicaA: 'Comercios, emprendedores y prestadores de servicios que se registran para vender en Boga.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'Fondo completo, pero es un contrato comercial B2B: el abogado tiene que revisar comisiones, ' +
    'plazos de liquidación, causales de suspensión, responsabilidad del comercio frente al consumidor ' +
    'y protección de datos de los clientes que el comercio recibe a través de Boga.',
  pendientes: [
    'Fijar el % de comisión por vertical y cómo se comunica un cambio de comisión.',
    'Definir el ciclo de liquidación de pagos al comercio (cada cuánto, con qué retenciones).',
    'Definir el acuerdo de tratamiento de datos: el comercio es responsable de los datos del cliente que recibe.',
    'Definir SLA mínimos (tiempo de preparación, tasa de cancelación) y sus consecuencias.',
  ],
  secciones: [
    {
      n: '1', titulo: 'Registro y verificación',
      bloques: [
        { tipo: 'p', texto: 'Para vender en Boga tenés que registrar tu negocio con datos reales (RUC o documento, rubro, contacto) y aceptar este anexo. Boga puede verificar la información y pedir documentación adicional antes de activar la tienda.' },
      ],
    },
    {
      n: '2', titulo: 'Qué hace Boga y qué hacés vos',
      bloques: [
        { tipo: 'p', texto: 'Boga te da la vitrina, el sistema de pedidos, la coordinación de entrega y el procesamiento de pagos. Vos sos responsable de: tener stock real, precios y fotos correctas, preparar los pedidos a tiempo, cumplir las normas sanitarias y de tu rubro, y emitir el comprobante de pago al cliente por cada venta.' },
      ],
    },
    {
      n: '3', titulo: 'Comisiones y pagos',
      bloques: [
        { tipo: 'p', texto: 'Boga cobra una comisión por cada venta, que se te informa al registrarte y figura en tu panel. Boga liquida el saldo a tu favor de forma periódica, al medio que indiques, descontando la comisión y lo que corresponda por reembolsos a clientes. Boga te entrega el detalle de cada liquidación y su comprobante por la comisión.' },
        { tipo: 'p', texto: 'Boga puede cambiar la comisión avisándote con al menos 30 días de anticipación. Si no estás de acuerdo, podés dar de baja tu tienda antes de que el cambio aplique.' },
      ],
    },
    {
      n: '4', titulo: 'Responsabilidad frente al cliente',
      bloques: [
        { tipo: 'p', texto: 'Frente al consumidor, el comercio responde por el producto o servicio que vende. El comercio mantiene indemne a Boga por reclamos, multas o daños que resulten de incumplimientos suyos (producto en mal estado, publicidad engañosa, falta de comprobante, incumplimiento sanitario).' },
      ],
    },
    {
      n: '5', titulo: 'Datos de los clientes',
      bloques: [
        { tipo: 'p', texto: 'Los datos del cliente que recibís a través de Boga (nombre, teléfono, dirección) son solo para cumplir ese pedido y atender reclamos. No podés usarlos para marketing propio ni cederlos a terceros sin consentimiento del cliente. Sos responsable de esos datos mientras los tengas.' },
      ],
    },
    {
      n: '6', titulo: 'Suspensión y baja',
      bloques: [
        { tipo: 'p', texto: 'Podés dar de baja tu tienda cuando quieras, cumpliendo primero los pedidos en curso. Boga puede suspender o cerrar tu tienda por incumplimientos graves o reiterados, fraude, o riesgo para los consumidores, informándote el motivo. Las liquidaciones pendientes se pagan igual, salvo montos retenidos por reclamos en curso.' },
      ],
    },
  ],
};

const anexoAfiliados: DocLegal = {
  slug: 'afiliados',
  titulo: 'Anexo · Programa de Afiliados',
  tipo: 'anexo',
  resumen: 'Cómo funciona referir negocios, choferes o clientes a Boga a cambio de una comisión.',
  estado: 'borrador',
  aplicaA: 'Personas o negocios inscritos en el programa de afiliados de Boga.',
  actualizado: FECHA_BORRADOR,
  version: '0.1 · borrador',
  revisionNota:
    'Borrador temprano: el programa todavía no está construido ni definido en su modelo económico. ' +
    'Antes de abogado, Boga tiene que decidir qué se comisiona, cuánto, por cuánto tiempo y cómo se ' +
    'paga. El abogado después revisa el tratamiento tributario de la comisión (el afiliado factura o ' +
    'se le retiene), la prohibición de spam y el uso de la marca Boga por parte del afiliado.',
  pendientes: [
    'Definir el modelo: qué acción paga comisión (negocio que se activa, chofer verificado, primera compra de un referido), monto y duración.',
    'Definir el mínimo de pago y la periodicidad.',
    'Definir cómo factura el afiliado o cómo se le retiene.',
    'Reglas de uso de la marca Boga y prohibición de publicidad engañosa / spam.',
  ],
  secciones: [
    {
      n: '1', titulo: 'Qué es',
      bloques: [
        { tipo: 'p', texto: 'El programa de afiliados te permite recomendar Boga a negocios, choferes o nuevos usuarios con un enlace o código propio. Si tu referido cumple la condición definida para cada campaña, ganás una comisión.' },
      ],
    },
    {
      n: '2', titulo: 'Cómo se gana la comisión',
      bloques: [
        { tipo: 'p', texto: 'Cada campaña indica: qué acción del referido genera comisión, cuánto paga, si es un pago único o recurrente y por cuánto tiempo. La comisión se confirma solo cuando la acción del referido es válida (no cancelada, no fraudulenta).' },
      ],
    },
    {
      n: '3', titulo: 'Pago',
      bloques: [
        { tipo: 'p', texto: 'Boga paga la comisión acumulada de forma periódica cuando superás el monto mínimo indicado en el programa. Según tu situación, se te pedirá comprobante o se aplicará la retención que corresponda.' },
      ],
    },
    {
      n: '4', titulo: 'Lo que no está permitido',
      bloques: [
        { tipo: 'lista', items: [
          'Spam, mensajes masivos no solicitados o publicidad engañosa sobre Boga.',
          'Auto-referirse o crear cuentas falsas.',
          'Usar la marca Boga de forma que confunda sobre tu relación con la empresa (no sos empleado ni representante).',
          'Prometer beneficios que Boga no ofrece.',
        ]},
        { tipo: 'p', texto: 'El incumplimiento anula las comisiones pendientes y da de baja del programa.' },
      ],
    },
    {
      n: '5', titulo: 'Cambios y cierre del programa',
      bloques: [
        { tipo: 'p', texto: 'Boga puede cambiar las condiciones o cerrar el programa avisando con anticipación razonable. Las comisiones ya confirmadas se pagan.' },
      ],
    },
  ],
};

// Orden en que se listan y se numeran los anexos.
export const DOCS: DocLegal[] = [
  terminos,
  privacidad,
  cookies,
  libro,
  anexoMarket,
  anexoTaxi,
  anexoPoints,
  anexoEventos,
  anexoNegocios,
  anexoAfiliados,
];
