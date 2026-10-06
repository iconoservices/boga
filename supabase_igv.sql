-- IGV INCLUIDO en los precios (aviso junto al precio, en el carrito y en el pedido por WhatsApp).
--  · stores.igv_incluido: la tienda marca «Mis precios incluyen IGV» y vale para todo su catálogo.
--  · products.igv: cada producto puede salirse de eso: 'con' (lleva IGV) o 'sin' (no lo lleva); vacío = lo que diga la tienda.
-- No cambia ningún monto: es solo el aviso. Sin correr esto la tienda funciona igual (el panel avisa qué campo no se guardó).
ALTER TABLE public.stores   ADD COLUMN IF NOT EXISTS igv_incluido BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS igv TEXT CHECK (igv IN ('con', 'sin'));
