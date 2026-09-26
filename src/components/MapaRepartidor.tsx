'use client';

// Mapa en vivo de la moto del repartidor en /pedido/<código>. Leaflet + mapas de OpenStreetMap (gratis, sin llave).
// Se carga solo cuando hay una moto que mostrar (import dinámico desde la página), así Leaflet no pesa en el resto.

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ICONO = () => L.divIcon({
  className: '',
  html: '<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">🛵</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function MapaRepartidor({ lat, lng }: { lat: number; lng: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const moto = useRef<L.Marker | null>(null);
  const inicial = useRef({ lat, lng });

  useEffect(() => {
    if (!caja.current) return;
    const m = L.map(caja.current, { zoomControl: true }).setView([inicial.current.lat, inicial.current.lng], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    moto.current = L.marker([inicial.current.lat, inicial.current.lng], { icon: ICONO(), interactive: false }).addTo(m);
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; moto.current = null; };
  }, []);

  // Cada punto nuevo mueve la moto; el mapa la sigue solo si se salió de la vista (así no pelea con quien lo está moviendo).
  useEffect(() => {
    const m = mapa.current;
    if (!m || !moto.current) return;
    moto.current.setLatLng([lat, lng]);
    if (!m.getBounds().pad(-0.2).contains([lat, lng])) m.panTo([lat, lng], { animate: true });
  }, [lat, lng]);

  return <div ref={caja} className="w-full h-64 rounded-2xl overflow-hidden border border-surface-container-highest" />;
}
