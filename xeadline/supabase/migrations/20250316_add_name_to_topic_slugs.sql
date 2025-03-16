-- Add name column to topic_slugs table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'topic_slugs' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.topic_slugs ADD COLUMN name TEXT;
  END IF;
END
$$;

-- Update existing records to have a name based on the slug
-- First, remove any unique suffix (like -m8bkab74) from the slug
WITH cleaned_slugs AS (
  SELECT
    id,
    REGEXP_REPLACE(slug, '-[a-z0-9]{7,}$', '') AS base_slug
  FROM public.topic_slugs
)
UPDATE public.topic_slugs
SET name = INITCAP(REPLACE(cleaned_slugs.base_slug, '-', ' '))
FROM cleaned_slugs
WHERE topic_slugs.id = cleaned_slugs.id
AND topic_slugs.name IS NULL;

-- Add a trigger to automatically set the name when creating a new slug if not provided
CREATE OR REPLACE FUNCTION set_default_topic_name()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
BEGIN
  IF NEW.name IS NULL THEN
    -- Remove any unique suffix (like -m8bkab74) from the slug
    base_slug := REGEXP_REPLACE(NEW.slug, '-[a-z0-9]{7,}$', '');
    NEW.name := INITCAP(REPLACE(base_slug, '-', ' '));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_topic_name_trigger ON public.topic_slugs;

-- Create the trigger
CREATE TRIGGER set_topic_name_trigger
BEFORE INSERT ON public.topic_slugs
FOR EACH ROW
EXECUTE FUNCTION set_default_topic_name();