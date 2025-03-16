import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bucket, path } = req.query;

  if (!bucket || !path || typeof bucket !== 'string' || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  // Create a server-side Supabase client with service role key for admin access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get a signed URL for the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year expiry
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    if (!data || !data.signedUrl) {
      throw new Error('Failed to create signed URL');
    }
    
    // Return the signed URL
    return res.status(200).json({ url: data.signedUrl });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return res.status(500).json({ error: 'Failed to get signed URL' });
  }
}