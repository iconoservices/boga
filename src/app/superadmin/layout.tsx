import SuperadminMobileNav from '@/components/superadmin/SuperadminMobileNav';

// Envuelve TODAS las páginas de /superadmin: en el celular agrega la barra de
// navegación inferior (en md+ sigue el sidebar de cada página).
export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="h-[84px] md:hidden bg-background" aria-hidden="true" />
      <SuperadminMobileNav />
    </>
  );
}
