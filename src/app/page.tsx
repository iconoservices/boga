import { redirect } from 'next/navigation';

// La raíz es el lado consumidor. El landing para negocios vive en /negocios.
export default function Root() {
  redirect('/inicio');
}
