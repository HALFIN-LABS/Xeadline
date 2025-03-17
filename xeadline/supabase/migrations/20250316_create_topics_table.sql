-- Create topics table
CREATE TABLE IF NOT EXISTS public.topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  rules TEXT[] DEFAULT '{}',
  image TEXT,
  banner TEXT,
  moderators TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pubkey TEXT NOT NULL,
  moderation_settings JSONB DEFAULT '{}'::jsonb,
  member_count INTEGER DEFAULT 0
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_topics_slug ON public.topics(slug);
CREATE INDEX IF NOT EXISTS idx_topics_pubkey ON public.topics(pubkey);

-- Add RLS policies
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Anyone can view topics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topics' 
    AND policyname = 'Anyone can view topics'
  ) THEN
    CREATE POLICY "Anyone can view topics" 
      ON public.topics 
      FOR SELECT 
      USING (true);
  END IF;
END
$$;

-- Only authenticated users can insert topics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topics' 
    AND policyname = 'Authenticated users can insert topics'
  ) THEN
    CREATE POLICY "Authenticated users can insert topics" 
      ON public.topics 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END
$$;

-- Only moderators can update topics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topics' 
    AND policyname = 'Moderators can update topics'
  ) THEN
    CREATE POLICY "Moderators can update topics" 
      ON public.topics 
      FOR UPDATE 
      TO authenticated 
      USING (moderators @> ARRAY[auth.uid()::text]);
  END IF;
END
$$;

-- Service role has full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topics' 
    AND policyname = 'Service role has full access'
  ) THEN
    CREATE POLICY "Service role has full access" 
      ON public.topics 
      USING (auth.role() = 'service_role');
  END IF;
END
$$;