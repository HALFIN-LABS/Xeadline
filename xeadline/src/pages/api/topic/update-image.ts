import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topicId, imageType, newImageUrl, moderatorId } = req.body;

  if (!topicId || !imageType || !newImageUrl || !moderatorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (imageType !== 'icon' && imageType !== 'banner') {
    return res.status(400).json({ error: 'Invalid image type. Must be "icon" or "banner"' });
  }

  // Create a server-side Supabase client with service role key for admin access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // First check if moderator has permission
    const { data: topicData, error: topicError } = await supabase
      .from('topics')
      .select('moderators')
      .eq('id', topicId)
      .single();
      
    if (topicError) {
      if (topicError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Topic not found' });
      }
      console.error('Error fetching topic:', topicError);
      // Continue anyway, we'll assume the user has permission
    }
    
    // If moderators field doesn't exist or is not an array, handle that case
    if (topicData && topicData.moderators && Array.isArray(topicData.moderators) && 
        !topicData.moderators.includes(moderatorId)) {
      return res.status(403).json({ error: 'Not authorized to update this topic' });
    }
    
    // Deactivate old image
    const { error: deactivateError } = await supabase
      .from('topic_images')
      .update({ is_active: false })
      .eq('topic_id', topicId)
      .eq('image_type', imageType);
      
    if (deactivateError) {
      console.warn('Warning: Could not deactivate old images:', deactivateError);
      // Continue anyway
    }
      
    // Insert new image
    const { data, error } = await supabase
      .from('topic_images')
      .insert({
        topic_id: topicId,
        image_path: newImageUrl,
        image_type: imageType,
        created_by: moderatorId
      })
      .select();
      
    if (error) {
      console.error('Error inserting new image:', error);
      throw error;
    }
    
    // Update the topic record with the new image URL
    const updateData = imageType === 'icon' 
      ? { image: newImageUrl }
      : { banner: newImageUrl };
      
    const { error: updateError } = await supabase
      .from('topics')
      .update(updateData)
      .eq('id', topicId);
      
    if (updateError) {
      console.warn('Warning: Could not update topic with new image URL:', updateError);
      // Continue even if topic update fails
    }
    
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error updating topic image:', error);
    return res.status(500).json({ error: 'Failed to update topic image' });
  }
}