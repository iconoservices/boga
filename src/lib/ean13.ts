// Códigos de barras EAN-13: validar, crear códigos internos y dibujarlos (sin librerías externas).
// Los productos sin código de fábrica reciben uno interno que empieza en «2»: el rango 20–29 está reservado
// para uso dentro de la tienda, así que nunca choca con un código de fabricante.

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARIDAD = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** Dígito de control (el 13.º) de los primeros 12 dígitos. */
export function digitoControl(d12: string): number {
  let suma = 0;
  for (let i = 0; i < 12; i++) suma += Number(d12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (suma % 10)) % 10;
}

export const esEan13 = (codigo: string) => /^\d{13}$/.test(codigo) && digitoControl(codigo.slice(0, 12)) === Number(codigo[12]);

/** Crea un código EAN-13 interno al azar (empieza en 2, con su dígito de control correcto). */
export function generarEan13Interno(): string {
  let base = '2';
  for (let i = 0; i < 11; i++) base += Math.floor(Math.random() * 10);
  return base + digitoControl(base);
}

/** Las 95 franjas (1 = barra, 0 = espacio) de un EAN-13 válido. */
export function patronEan13(codigo: string): string {
  if (!esEan13(codigo)) throw new Error('No es un EAN-13 válido: ' + codigo);
  const paridad = PARIDAD[Number(codigo[0])];
  let patron = '101';
  for (let i = 1; i <= 6; i++) patron += (paridad[i - 1] === 'L' ? L : G)[Number(codigo[i])];
  patron += '01010';
  for (let i = 7; i <= 12; i++) patron += R[Number(codigo[i])];
  return patron + '101';
}
