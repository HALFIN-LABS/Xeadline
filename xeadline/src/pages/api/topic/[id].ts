import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the topic ID from the query parameters
  // Next.js combines path parameters and query parameters into req.query
  let { id } = req.query;

  // Handle array case (Next.js can sometimes return an array for path parameters)
  if (Array.isArray(id)) {
    id = id[0];
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Topic ID is required' });
  }

  // The ID might be URL-encoded, so decode it
  const decodedId = decodeURIComponent(id);

  try {
    // Try to fetch the topic from the database
    const { data: topicData, error: topicError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', decodedId)
      .single();

    if (topicError) {
      console.error('Error fetching topic:', topicError);
      // Continue to fallback logic instead of returning 404 immediately
    }

    // If we have topic data, return it
    if (topicData) {
      return res.status(200).json({ topic: topicData });
    }

    // If no topic was found, check if we have a slug mapping
    const [pubkey, dIdentifier] = decodedId.split(':');
    
    if (!pubkey || !dIdentifier) {
      return res.status(400).json({ error: 'Invalid topic ID format' });
    }
    
    // Try to fetch the topic name from the slug mapping
    // Extract the base slug without the unique suffix (e.g., "test-two" from "test-two-m8bkab74")
    const baseSlug = dIdentifier.replace(/-[a-z0-9]{7,}$/, '');
    
    const { data: slugData, error: slugError } = await supabase
      .from('topic_slugs')
      .select('name')
      .eq('slug', baseSlug)
      .single();
      
    let topicName = slugData?.name || `Topic ${dIdentifier}`;
    
    console.log('Topic name lookup:', {
      dIdentifier,
      baseSlug,
      foundName: slugData?.name,
      finalName: topicName
    });
    
    // Try to fetch the topic images from the database
    const { data: iconImageData, error: iconImageError } = await supabase
      .from('topic_images')
      .select('image_path')
      .eq('topic_id', decodedId)
      .eq('image_type', 'icon')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    const { data: bannerImageData, error: bannerImageError } = await supabase
      .from('topic_images')
      .select('image_path')
      .eq('topic_id', decodedId)
      .eq('image_type', 'banner')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (iconImageData || bannerImageData) {
      console.log('Found image data for topic:', {
        icon: iconImageData?.image_path,
        banner: bannerImageData?.image_path
      });
    } else {
      console.log('No image data found for topic:', decodedId);
    }

    // Create a mock topic with the real images if available
    const topic = {
      id: decodedId,
      name: topicName,
      slug: dIdentifier,
      description: 'Topic content is loading or unavailable. Please refresh the page.',
      rules: ['Be respectful', 'Stay on topic'],
      image: iconImageData?.image_path || `https://ui-avatars.com/api/?name=${encodeURIComponent(dIdentifier)}&background=random&size=128`,
      banner: bannerImageData?.image_path || `https://ui-avatars.com/api/?name=${encodeURIComponent(dIdentifier)}&background=718096&color=FFFFFF&size=300&width=1200&height=300`,
      moderators: [pubkey],
      createdAt: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
      pubkey,
      moderationSettings: {
        moderationType: 'post-publication'
      },
      memberCount: 10
    };

    return res.status(200).json({ topic });
  } catch (error) {
    console.error('Error in topic API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}