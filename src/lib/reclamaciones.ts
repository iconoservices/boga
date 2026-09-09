// Tipos y helpers del Libro de Reclamaciones (D.S. 011-2011-PCM).
// Puro: sin "use client", sin acceso a base.

import { EMPRESA } from '@/lib/legal';

export type TipoReclamo = 'reclamo' | 'queja';
export type BienContratado = 'producto' | 'servicio';
export type EstadoReclamo = 'pendiente' | 'respondido' | 'cerrado';

export type HojaReclamacion = {
  con_nombre: string;
  con_documento: string;
  con_domicilio: string;
  con_telefono: string;
  con_email: string;
  con_menor: boolean;
  apoderado: string;
  bien: BienContratado;
  monto: string;
  bien_detalle: string;
  tipo: TipoReclamo;
  detalle: string;
  pedido: string;
};

export const HOJA_VACIA: HojaReclamacion = {
  con_nombre: '', con_documento: '', con_domicilio: '', con_telefono: '', con_email: '',
  con_menor: false, apoderado: '',
  bien: 'servicio', monto: '', bien_detalle: '',
  tipo: 'reclamo', detalle: '', pedido: '',
};

/** Correlativo mostrable: 123 -> "N.º 000123". */
export function codigoHoja(numero: number | string): string {
  return `N.º ${String(numero).padStart(6, '0')}`;
}

/** Plazo de respuesta que fija la norma (días hábiles). */
export const PLAZO_RESPUESTA_DIAS_HABILES = 15;

export const RECLAMO_VS_QUEJA = {
  reclamo: 'Disconformidad con el producto o servicio recibido.',
  queja: 'Malestar respecto de la atención, que no busca una solución sobre el producto o servicio.',
} as const;

/** Datos del proveedor que van pre-llenados en la hoja. */
export const PROVEEDOR = {
  razonSocial: EMPRESA.razonSocial,
  ruc: EMPRESA.ruc,
  domicilio: EMPRESA.domicilio,
  nombreComercial: EMPRESA.nombreComercial,
  email: EMPRESA.email,
} as const;
