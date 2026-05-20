-- Create the stores table
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    marketplace_category TEXT,
    template TEXT DEFAULT 'default',
    hero_image TEXT,
    hero_alt TEXT,
    theme JSONB DEFAULT '{}'::jsonb,
    categories JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active'
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all stores
CREATE POLICY "Public profiles are viewable by everyone."
ON public.stores FOR SELECT
USING ( true );

-- Allow authenticated users to insert their own stores
CREATE POLICY "Users can insert their own stores."
ON public.stores FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- Allow users to update their own stores
CREATE POLICY "Users can update own stores."
ON public.stores FOR UPDATE
USING ( auth.uid() = user_id );

-- Allow users to delete their own stores
CREATE POLICY "Users can delete own stores."
ON public.stores FOR DELETE
USING ( auth.uid() = user_id );

-- Create an index on the slug for faster lookups
CREATE INDEX stores_slug_idx ON public.stores (slug);
