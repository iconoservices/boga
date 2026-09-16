// El overlay de texto sobre un banner de portada (/market y el Inicio "/").
// Un solo componente para los dos estilos que existen hoy, elegible por
// seccion completa desde superadmin (tabla banner_page_settings) — no vive
// hardcodeado por página como antes, para no tener el mismo JSX duplicado
// en dos archivos y desincronizado.
//
// 'center': texto centrado verticalmente, degradado desde la izquierda
//           (el look de siempre de /market).
// 'bottom': texto pegado abajo a la izquierda, degradado desde abajo
//           (el look de siempre del Inicio).
//
// Sin tag/title1/title2/sub (banner de puro imagen, ej. un flyer ya armado
// en Canva), no dibuja nada encima: antes esto pintaba un degradado + un
// <h2> vacío sobre la imagen igual, pisando el texto que ya traía la foto.
export type BannerStyle = 'center' | 'bottom';

export function BannerOverlay({
  style, tag, title1, title2, sub,
}: {
  style: BannerStyle;
  tag?: string | null;
  title1?: string | null;
  title2?: string | null;
  sub?: string | null;
}) {
  if (!tag && !title1 && !title2 && !sub) return null;

  if (style === 'bottom') {
    return (
      <>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-12 pb-10 pt-5 sm:px-14 sm:pb-11 lg:px-8 lg:pb-8">
          {tag && (
            <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-white/70">{tag}</span>
          )}
          {(title1 || title2) && (
            <h2 className="font-headline-lg font-extrabold tracking-tight text-white leading-[1.06] text-lg sm:text-2xl lg:text-4xl mt-1.5 max-w-[24ch] line-clamp-2">
              {title1}{title1 && title2 ? ' ' : ''}{title2}
            </h2>
          )}
          {sub && <p className="text-white/80 font-body-md text-xs sm:text-sm mt-1.5 max-w-md line-clamp-1">{sub}</p>}
        </div>
      </>
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center p-6 sm:pl-12 lg:pl-10 lg:pr-12 z-10">
      {tag && (
        <span className="inline-block px-3 py-1 bg-primary text-white font-label-md text-[10px] rounded-lg mb-1.5 uppercase tracking-wider w-fit">
          {tag}
        </span>
      )}
      {(title1 || title2) && (
        <h2 className="font-headline-lg lg:text-[30px] lg:leading-none lg:font-extrabold text-white leading-tight">
          {title1}<br />{title2}
        </h2>
      )}
      {sub && <p className="text-white/80 font-body-md lg:text-sm mt-1 lg:mt-3 lg:mb-3 max-w-md">{sub}</p>}
    </div>
  );
}
