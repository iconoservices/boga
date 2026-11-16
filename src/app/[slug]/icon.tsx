import { ImageResponse } from 'next/og';
import { getDynamicStore } from './cargarTienda';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default async function Icon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getDynamicStore(slug);

  // Si la tienda tiene logo subido, usar esa imagen
  if (store?.logoImage) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={store.logoImage}
            alt={store.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ),
      { ...size }
    );
  }

  // Si no tiene imagen subida, usar la letra inicial con estilo visual oficial
  const nombreLimpio = store?.name ? store.name.replace(/\s*bm$/i, '').trim() : 'Tienda';
  const letra = (nombreLimpio.charAt(0) || 'T').toUpperCase();
  const colorFondo = (store?.theme as any)?.primaryColor || '#059669';

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: colorFondo,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontFamily: 'sans-serif',
          borderRadius: 8,
        }}
      >
        {letra}
      </div>
    ),
    { ...size }
  );
}
