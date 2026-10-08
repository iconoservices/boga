import { notFound } from 'next/navigation';
import DashboardPage from '../page';
import { SEGMENTOS_TAB } from '@/lib/adminRutas';

// /admin/pedidos, /admin/vender… muestran el mismo panel abierto en esa pestaña
// (la pestaña la lee el panel desde la dirección). Las subrutas propias (alumnos, reservas…) tienen su carpeta y ganan.
export default async function AdminTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!SEGMENTOS_TAB.includes(tab)) notFound();
  return <DashboardPage />;
}
