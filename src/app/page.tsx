import HomeClient from '@/components/HomeClient';
import { cargarHome } from '@/lib/homeData';

// "/" se genera en el servidor y se guarda: el visitante recibe el Inicio con sus secciones ya
// dentro del HTML, en vez de esperar a que baje el JS, hidrate y pida 10 endpoints. Se regenera cada
// 5 min (igual que los endpoints que lo alimentan) y al instante cuando el superadmin edita algo
// (los endpoints /api/revalidate* también refrescan "/").
export const revalidate = 300;

export default async function HomePage() {
  const inicial = await cargarHome();
  return <HomeClient inicial={inicial} />;
}
