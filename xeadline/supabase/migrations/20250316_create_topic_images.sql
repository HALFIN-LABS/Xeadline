-- Create topic_images table
CREATE TABLE IF NOT EXISTS public.topic_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('icon', 'banner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_topic_images_topic_id ON public.topic_images(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_images_image_type ON public.topic_images(image_type);

-- Add RLS policies
ALTER TABLE public.topic_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view active images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topic_images' 
    AND policyname = 'Anyone can view active topic images'
  ) THEN
    CREATE POLICY "Anyone can view active topic images" 
      ON public.topic_images 
      FOR SELECT 
      USING (is_active = TRUE);
  END IF;
END
$$;

-- Only authenticated users can insert images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topic_images' 
    AND policyname = 'Authenticated users can insert topic images'
  ) THEN
    CREATE POLICY "Authenticated users can insert topic images" 
      ON public.topic_images 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END
$$;

-- Authenticated users can update their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topic_images' 
    AND policyname = 'Authenticated users can update their own images'
  ) THEN
    CREATE POLICY "Authenticated users can update their own images" 
      ON public.topic_images 
      FOR UPDATE 
      TO authenticated 
      USING (created_by = auth.uid()::text);
  END IF;
END
$$;

-- Service role has full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topic_images' 
    AND policyname = 'Service role has full access'
  ) THEN
    CREATE POLICY "Service role has full access" 
      ON public.topic_images 
      USING (auth.role() = 'service_role');
  END IF;
END
$$;

-- Note: We're not adding a policy that references the topics table since it doesn't exist yet.
-- Later, when you create the topics table, you can add a policy like:
/*
CREATE POLICY "Topic moderators can update topic images" 
  ON public.topic_images 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM topics 
      WHERE topics.id = topic_images.topic_id 
      AND topics.moderators @> ARRAY[auth.uid()::text]
    )
  );
*/