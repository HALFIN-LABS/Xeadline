-- Create the topic_slugs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.topic_slugs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  topic_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_topic_slugs_slug ON public.topic_slugs(slug);

-- Add RLS policies
ALTER TABLE public.topic_slugs ENABLE ROW LEVEL SECURITY;

-- Create policy for anon users to read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topic_slugs' 
    AND policyname = 'Allow anonymous read access'
  ) THEN
    CREATE POLICY "Allow anonymous read access" 
      ON public.topic_slugs 
      FOR SELECT 
      TO anon 
      USING (true);
  END IF;
END
$$;

-- Create policy for authenticated users to insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topic_slugs' 
    AND policyname = 'Allow authenticated users to insert'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert" 
      ON public.topic_slugs 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (true);
  END IF;
END
$$;

-- Create policy for service role to do everything
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topic_slugs' 
    AND policyname = 'Allow service role full access'
  ) THEN
    CREATE POLICY "Allow service role full access" 
      ON public.topic_slugs 
      USING (auth.role() = 'service_role');
  END IF;
END
$$;