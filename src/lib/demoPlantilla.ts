// Productos de DEMO de una plantilla, editables desde /superadmin/plantillas/<id>.
//
// Se guardan en la tabla `products` de siempre (sin cambios en la base de datos) bajo una "tienda"
// reservada: `__demo_<id de la plantilla>`. La vista previa (/preview/<id>) lee esos productos; si no
// hay ninguno, cae a los de ejemplo que trae el código (templates.config.ts). Así se puede cambiar
// fotos, precios y textos de cada demo sin tocar código ni crear una tienda.

export const PREFIJO_DEMO = '__demo_';

export const demoSlug = (templateId: string) => `${PREFIJO_DEMO}${templateId}`;

export const esSlugDemo = (slug: string) => slug.startsWith(PREFIJO_DEMO);
