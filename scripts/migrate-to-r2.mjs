// Copia todo lo que hay en los buckets de Supabase Storage (store-assets,
// product-images) hacia Cloudflare R2, y reescribe las URLs guardadas en
// stores.hero_image / stores.logo_image / products.image.
//
// No borra nada de Supabase Storage: si algo falla a mitad de camino, la app
// sigue funcionando con las URLs viejas. Correr de nuevo es seguro (upsert).
//
// Uso: node --env-file=.env.local scripts/migrate-to-r2.mjs
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// service_role: hace falta para reescribir hero_image/logo_image/image en la
// base de datos sin chocar con las políticas RLS de dueño/superadmin.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const BUCKETS = ['store-assets', 'product-images'];

// Lista recursivamente todos los archivos de un bucket de Supabase Storage
// (list() de Supabase solo devuelve un nivel, hay que bajar por carpetas).
async function listAllFiles(bucket, prefix = '') {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  let files = [];
  for (const entry of data) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Las carpetas vienen sin metadata (id === null); los archivos sí la tienen.
    if (entry.id === null) {
      files = files.concat(await listAllFiles(bucket, fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function migrateBucket(bucket) {
  console.log(`\n== ${bucket} ==`);
  const files = await listAllFiles(bucket);
  console.log(`${files.length} archivo(s) encontrados`);

  const urlMap = new Map(); // url vieja (Supabase) -> url nueva (R2)

  for (const filePath of files) {
    const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const oldUrl = pubData.publicUrl;

    const { data: fileBlob, error: dlErr } = await supabase.storage.from(bucket).download(filePath);
    if (dlErr) {
      console.error(`  ✗ no se pudo descargar ${filePath}:`, dlErr.message);
      continue;
    }
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const key = `${bucket}/${filePath}`;

    try {
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: fileBlob.type || 'application/octet-stream',
      }));
      const newUrl = `${R2_PUBLIC_URL}/${key}`;
      urlMap.set(oldUrl, newUrl);
      console.log(`  ✓ ${filePath}`);
    } catch (upErr) {
      console.error(`  ✗ no se pudo subir ${filePath} a R2:`, upErr.message);
    }
  }

  return urlMap;
}

async function rewriteStoreUrls(urlMap) {
  const { data: stores, error } = await supabase.from('stores').select('id, slug, hero_image, logo_image');
  if (error) throw error;

  let updated = 0;
  for (const store of stores) {
    const patch = {};
    if (store.hero_image && urlMap.has(store.hero_image)) patch.hero_image = urlMap.get(store.hero_image);
    if (store.logo_image && urlMap.has(store.logo_image)) patch.logo_image = urlMap.get(store.logo_image);
    if (Object.keys(patch).length) {
      const { error: updErr } = await supabase.from('stores').update(patch).eq('id', store.id);
      if (updErr) console.error(`  ✗ stores.${store.slug}:`, updErr.message);
      else updated++;
    }
  }
  console.log(`stores actualizadas: ${updated}`);
}

async function rewriteProductUrls(urlMap) {
  const { data: products, error } = await supabase.from('products').select('id, image');
  if (error) throw error;

  let updated = 0;
  for (const product of products) {
    if (product.image && urlMap.has(product.image)) {
      const { error: updErr } = await supabase.from('products').update({ image: urlMap.get(product.image) }).eq('id', product.id);
      if (updErr) console.error(`  ✗ products.${product.id}:`, updErr.message);
      else updated++;
    }
  }
  console.log(`products actualizados: ${updated}`);
}

async function main() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error('Faltan variables de entorno:', missing.join(', '));
    console.error('Correr con: node --env-file=.env.local scripts/migrate-to-r2.mjs');
    process.exit(1);
  }

  let fullMap = new Map();
  for (const bucket of BUCKETS) {
    const map = await migrateBucket(bucket);
    fullMap = new Map([...fullMap, ...map]);
  }

  console.log('\n== Actualizando base de datos ==');
  await rewriteStoreUrls(fullMap);
  await rewriteProductUrls(fullMap);

  console.log(`\nListo. ${fullMap.size} archivo(s) migrados a R2.`);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
