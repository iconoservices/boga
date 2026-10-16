import HomeClient from '@/components/HomeClient';
import { cargarHome } from '@/lib/homeData';

// "/" se genera en el servidor y se guarda: el visitante recibe el Inicio con sus secciones ya
// dentro del HTML, en vez de esperar a que baje el JS, hidrate y pida 10 endpoints. Se regenera cada
// 12 horas como respaldo (cada regeneración gasta CPU de Vercel aunque nada haya cambiado) y al instante
// cuando alguien guarda desde el panel (los endpoints /api/revalidate* también refrescan "/").
export const revalidate = 43200;

// La dirección oficial del Inicio (antes no declaraba canonical y las variantes con ?utm_… podían contarse como páginas distintas).
export const metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const inicial = await cargarHome();
  return <HomeClient inicial={inicial} />;
}
