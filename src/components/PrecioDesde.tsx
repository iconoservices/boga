'use client';

// «Planes desde S/ 50 al mes»: el precio más bajo de los planes activos, leído de la base (Cobros → Precios).
// Mientras llega, o si no hay tabla, se ve el precio del plan Carta de respaldo.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PLANES_BASE, cargarPlanes, precioVigente } from '@/lib/planesComerciales';

export default function PrecioDesde() {
  const [precio, setPrecio] = useState(PLANES_BASE[0].precio_mes);
  useEffect(() => {
    cargarPlanes(supabase).then(({ planes }) => {
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const precios = planes.filter((p) => p.activo && !p.pronto).map((p) => precioVigente(p, hoy)).filter((n) => n > 0);
      if (precios.length) setPrecio(Math.min(...precios));
    });
  }, []);
  return <span className="font-extrabold">Planes desde S/ {precio.toLocaleString('es-PE', { maximumFractionDigits: 0 })} al mes</span>;
}
