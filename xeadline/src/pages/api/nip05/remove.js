import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { username, pubkey } = req.body;
  
  // Validate input
  if (!username || !pubkey) {
    return res.status(400).json({ error: 'Username and pubkey are required' });
  }
  
  try {
    // Delete the username from the nip05_usernames table
    // Only if it belongs to the user making the request
    const { data, error } = await supabase
      .from('nip05_usernames')
      .delete()
      .match({ username, pubkey });
    
    if (error) throw error;
    
    return res.status(200).json({
      success: true,
      message: `Username ${username} removed successfully`
    });
  } catch (error) {
    console.error('Error removing username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}