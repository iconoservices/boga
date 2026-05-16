import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/Antigravity/Boga Market/webapp/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error connecting to Supabase (Database):', error.message);
    if (error.message.includes('relation "products" does not exist')) {
        console.log('Suggestion: The "products" table is missing.');
    }
  } else {
    console.log('Successfully connected to Supabase Database!');
    console.log('Products count:', data);
  }

  const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
  if (storageError) {
    console.error('Error connecting to Supabase (Storage):', storageError.message);
  } else {
    console.log('Successfully connected to Supabase Storage!');
    const bucketExists = buckets.find(b => b.name === 'product-images');
    if (bucketExists) {
        console.log('Bucket "product-images" exists.');
    } else {
        console.log('Bucket "product-images" is missing.');
    }
  }
}

testConnection();
