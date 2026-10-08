'use client';

// Historial de promociones anteriores (paquetes de lanzamiento). Son datos de referencia fijos por ahora:
// vivían en Paquetes; ahora van al final de Cobros → Precios, junto a las ofertas vigentes.

const PROMOCIONES_ANTERIORES = [
  { id: 'archive-1', nombre: 'Promo Piloto Huánuco', precio: 29, tiendas: '18 tiendas', activa: false },
  { id: 'archive-2', nombre: 'Early Adopter Bodegas', precio: 15, tiendas: '6 tiendas', activa: true },
];

export default function HistorialPromociones() {
  return (
    <section className="bg-white border border-[#c2c6d6] rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-[#c2c6d6] bg-[#f2f3fd]">
        <span className="text-xs font-bold text-[#191b23]">Historial de promociones</span>
        <p className="text-[10px] text-[#727785] font-semibold mt-0.5">Paquetes de lanzamiento anteriores. Es una referencia; las ofertas vigentes se ponen en cada precio con «+ Poner en oferta».</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[460px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-[#424754] border-b border-[#c2c6d6]">
              <th className="px-4 py-2 font-semibold">Promoción</th>
              <th className="px-4 py-2 font-semibold">Precio base</th>
              <th className="px-4 py-2 font-semibold">Tiendas</th>
              <th className="px-4 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ecedf7]">
            {PROMOCIONES_ANTERIORES.map((p) => (
              <tr key={p.id} className="text-xs">
                <td className="px-4 py-3 font-semibold text-[#191b23]">{p.nombre}</td>
                <td className="px-4 py-3 text-[#424754]">S/ {p.precio}.00</td>
                <td className="px-4 py-3 text-[#424754]">{p.tiendas}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${p.activa ? 'bg-[#d8e2ff] text-[#004395]' : 'bg-[#e6e7f2] text-[#424754]'}`}>{p.activa ? 'Activa' : 'Terminada'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
