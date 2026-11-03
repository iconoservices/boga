import { redirect } from 'next/navigation';

export default function VuelosPage() {
  redirect('/viajes?medio=aereo');
}
