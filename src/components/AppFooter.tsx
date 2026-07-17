"use client";

import { usePathname } from 'next/navigation';

export default function AppFooter() {
  const pathname = usePathname();

  const isMarketplaceRoute = 
    pathname === '/' ||
    pathname.startsWith('/explore') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/promotions');

  if (!isMarketplaceRoute) return null;

  return (
    <footer className="hidden lg:flex w-full px-container-margin py-10 flex-col items-center bg-surface-container-lowest border-t border-surface-container-high mt-16">
      <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-8 text-secondary">
        <div className="flex flex-col gap-4">
          <span className="font-headline-sm text-headline-sm text-primary font-bold">Boga Market</span>
          <p className="font-body-md text-body-md text-secondary max-w-xs leading-normal">
            La plataforma líder para conectar merchants y clientes con velocidad y seguridad garantizada.
          </p>
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-secondary cursor-pointer hover:text-primary transition-colors">facebook</span>
            <span className="material-symbols-outlined text-secondary cursor-pointer hover:text-primary transition-colors">brand_awareness</span>
            <span className="material-symbols-outlined text-secondary cursor-pointer hover:text-primary transition-colors">camera</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-label-md text-on-surface uppercase font-bold tracking-wider text-xs">Empresa</span>
          <nav className="flex flex-col gap-2">
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Nosotros</a>
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Portal de Tiendas</a>
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Carreras</a>
          </nav>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-label-md text-on-surface uppercase font-bold tracking-wider text-xs">Legal</span>
          <nav className="flex flex-col gap-2">
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Términos del Servicio</a>
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Política de Privacidad</a>
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Cookies</a>
          </nav>
        </div>
        <div className="flex flex-col gap-4">
          <span className="font-label-md text-on-surface uppercase font-bold tracking-wider text-xs">Soporte</span>
          <nav className="flex flex-col gap-2">
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Centro de Ayuda</a>
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Contáctanos</a>
            <a className="font-body-md text-secondary hover:text-primary transition-colors duration-200" href="#">Preguntas Frecuentes</a>
          </nav>
        </div>
      </div>
      <div className="w-full max-w-[1440px] mx-auto pt-8 border-t border-surface-container-high flex flex-col md:flex-row justify-between items-center gap-4 text-secondary text-xs">
        <span>© 2026 Boga Market Inc. Todos los derechos reservados.</span>
        <div className="flex items-center gap-6">
          <span className="material-symbols-outlined text-secondary/40">payments</span>
          <span className="material-symbols-outlined text-secondary/40">credit_card</span>
          <span className="material-symbols-outlined text-secondary/40">account_balance_wallet</span>
        </div>
      </div>
    </footer>
  );
}
