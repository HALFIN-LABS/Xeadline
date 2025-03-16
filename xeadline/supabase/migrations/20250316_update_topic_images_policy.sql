-- Now that we have the topics table, add the policy for moderators to update topic images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'topic_images' 
    AND policyname = 'Topic moderators can update topic images'
  ) THEN
    CREATE POLICY "Topic moderators can update topic images" 
      ON public.topic_images 
      FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM public.topics 
          WHERE topics.id = topic_images.topic_id 
          AND topics.moderators @> ARRAY[auth.uid()::text]
        )
      );
  END IF;
END
$$;