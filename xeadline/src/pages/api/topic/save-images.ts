import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topicId, iconUrl, bannerUrl, createdBy } = req.body;

  if (!topicId || (!iconUrl && !bannerUrl) || !createdBy) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Create a server-side Supabase client with service role key for admin access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const imagesToInsert = [];
    
    if (iconUrl) {
      imagesToInsert.push({
        topic_id: topicId,
        image_path: iconUrl,
        image_type: 'icon',
        created_by: createdBy
      });
    }
    
    if (bannerUrl) {
      imagesToInsert.push({
        topic_id: topicId,
        image_path: bannerUrl,
        image_type: 'banner',
        created_by: createdBy
      });
    }
    
    // Check if topic_images table exists, if not create it
    const { error: tableCheckError } = await supabase
      .from('topic_images')
      .select('id')
      .limit(1);
      
    if (tableCheckError && tableCheckError.code === '42P01') {
      // Table doesn't exist, create it
      const createTableQuery = `
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
        
        CREATE INDEX IF NOT EXISTS idx_topic_images_topic_id ON public.topic_images(topic_id);
        CREATE INDEX IF NOT EXISTS idx_topic_images_image_type ON public.topic_images(image_type);
        
        ALTER TABLE public.topic_images ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Anyone can view active topic images" 
          ON public.topic_images 
          FOR SELECT 
          USING (is_active = TRUE);
          
        CREATE POLICY "Authenticated users can insert topic images" 
          ON public.topic_images 
          FOR INSERT 
          TO authenticated 
          WITH CHECK (auth.uid() IS NOT NULL);
          
        CREATE POLICY "Authenticated users can update their own images" 
          ON public.topic_images 
          FOR UPDATE 
          TO authenticated 
          USING (created_by = auth.uid()::text);
          
        CREATE POLICY "Service role has full access" 
          ON public.topic_images 
          USING (auth.role() = 'service_role');
      `;
      
      const { error: createTableError } = await supabase.rpc('pgclient_execute', { query: createTableQuery });
      
      if (createTableError) {
        console.error('Error creating topic_images table:', createTableError);
        // Continue anyway, the table might have been created by the migration
      }
    } else if (tableCheckError) {
      console.warn('Warning: Error checking topic_images table:', tableCheckError);
      // Continue anyway, the table might exist
    }
    
    // Deactivate any existing images first
    if (iconUrl) {
      const { error: deactivateIconError } = await supabase
        .from('topic_images')
        .update({ is_active: false })
        .eq('topic_id', topicId)
        .eq('image_type', 'icon');
        
      if (deactivateIconError) {
        console.warn('Warning: Could not deactivate old icon images:', deactivateIconError);
        // Continue anyway
      }
    }
    
    if (bannerUrl) {
      const { error: deactivateBannerError } = await supabase
        .from('topic_images')
        .update({ is_active: false })
        .eq('topic_id', topicId)
        .eq('image_type', 'banner');
        
      if (deactivateBannerError) {
        console.warn('Warning: Could not deactivate old banner images:', deactivateBannerError);
        // Continue anyway
      }
    }
    
    // Insert the image records
    const { data, error } = await supabase
      .from('topic_images')
      .insert(imagesToInsert)
      .select();
      
    if (error) {
      console.error('Error inserting topic images:', error);
      throw error;
    }
    
    console.log('Successfully inserted topic images:', data);
    
    // Update the topic record with the image URLs
    if (iconUrl || bannerUrl) {
      const updateData: any = {};
      if (iconUrl) updateData.image = iconUrl;
      if (bannerUrl) updateData.banner = bannerUrl;
      
      const { error: updateError } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', topicId);
        
      if (updateError) {
        console.warn('Warning: Could not update topic with image URLs:', updateError);
        // Continue even if topic update fails
      }
    }
    
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error saving topic images:', error);
    return res.status(500).json({ error: 'Failed to save topic images' });
  }
}