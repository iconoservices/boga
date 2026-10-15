-- «Mostrar en BogaHub» por producto. Pegar y correr en Supabase → SQL Editor (se puede correr varias veces).
-- false = el producto no sale en Inicio, Explorar ni Market; sigue en la carta de su tienda. Por defecto, todos salen (true).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS en_market BOOLEAN NOT NULL DEFAULT true;
