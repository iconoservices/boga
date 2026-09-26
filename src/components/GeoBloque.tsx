// Bloques que se escriben en el HTML del servidor para buscadores y rastreadores de IA (que casi nunca ejecutan JavaScript).
// Las páginas de BogaHub cargan sus listas con JavaScript; sin esto, un rastreador ve solo la introducción.

/** Datos estructurados (JSON-LD). Escapa `<` para que ningún nombre de tienda o producto pueda cerrar el <script>. */
export function LdJson({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export type ItemGeo = { texto: string; href?: string };

/**
 * Lista en texto plano de lo que la página muestra con JavaScript. Va dentro de <noscript>: es el contenido para quien no
 * ejecuta JavaScript (rastreadores, lectores de texto), el mismo que el navegador pinta después. No se ve en pantalla.
 */
export function ContenidoParaRastreadores({ titulo, intro, items }: { titulo: string; intro?: string; items: ItemGeo[] }) {
  if (items.length === 0) return null;
  return (
    <noscript>
      <section aria-label={titulo}>
        <h2>{titulo}</h2>
        {intro && <p>{intro}</p>}
        <ul>
          {items.map((it, i) => (
            <li key={i}>{it.href ? <a href={it.href}>{it.texto}</a> : it.texto}</li>
          ))}
        </ul>
      </section>
    </noscript>
  );
}
